import { NextResponse } from "next/server";
import { analyzeWithModel } from "@/lib/analysis/client";
import { buildFallbackAnalysis } from "@/lib/analysis/fallback";
import { normalizeSubmission } from "@/lib/analysis/normalize";
import { buildAnalysisPrompt } from "@/lib/analysis/prompt";
import { repairAnalysisResult } from "@/lib/analysis/repair";
import { SUPABASE_ANALYSES_TABLE, SUPABASE_UPLOADS_BUCKET } from "@/lib/supabase/config";
import { toAnalysisRow } from "@/lib/supabase/analyses";
import { requireSupabaseUser } from "@/lib/supabase/server";
import type { AnalysisResult, StoredSourceFile } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireSupabaseUser(request);

    if (!supabase || !user) {
      return NextResponse.json({ error: "Sign in to save your PaperTrail data." }, { status: 401 });
    }

    const formData = await request.formData();
    const sourceNote = formData.get("sourceNote")?.toString().trim() || null;
    const sourceUrl = formData.get("sourceUrl")?.toString().trim() || null;
    const sourceTitle = formData.get("sourceTitle")?.toString().trim() || null;
    const sourceThumbnailUrl = formData.get("sourceThumbnailUrl")?.toString().trim() || null;
    const normalized = await normalizeSubmission(formData);

    if (!normalized.normalizedText && !normalized.imageDataUrl) {
      return NextResponse.json(
        { error: "PaperTrail could not extract enough information from that file." },
        { status: 400 }
      );
    }

    const prompt = buildAnalysisPrompt(normalized);
    const rawResult = await analyzeWithModel({
      imageDataUrl: normalized.imageDataUrl,
      prompt
    });

    const analysis = rawResult
      ? repairAnalysisResult(rawResult, normalized)
      : buildFallbackAnalysis(normalized);

    const sourceFile = await uploadSourceFile({
      analysisId: analysis.id,
      formData,
      supabase,
      userId: user.id
    });
    const sourceThumbnailFile = await uploadRemoteThumbnail({
      analysisId: analysis.id,
      sourceThumbnailUrl,
      supabase,
      userId: user.id
    });
    const savedAnalysis: AnalysisResult = {
      ...analysis,
      sourceFile,
      sourceKind: normalized.sourceKind,
      sourceNote,
      sourceUrl,
      sourceTitle,
      sourceThumbnailUrl: sourceThumbnailFile?.url ?? sourceThumbnailUrl,
      sourceThumbnailFile
    };

    const saveResult = await insertAnalysisRow({
      analysis: savedAnalysis,
      normalizedSourceKind: normalized.sourceKind,
      sourceFile,
      supabase,
      userId: user.id
    });

    if (saveResult.error) {
      return NextResponse.json(
        {
          error: `PaperTrail analyzed this item but could not save it: ${saveResult.error}`,
          saveDebug: {
            hasSourceFile: Boolean(sourceFile),
            hasThumbnailFile: Boolean(sourceThumbnailFile),
            sourceFilePath: sourceFile?.path ?? null,
            sourceThumbnailPath: sourceThumbnailFile?.path ?? null,
            retriedWithoutNewThumbnailColumns: saveResult.retriedWithoutNewThumbnailColumns
          }
        },
        { status: 500 }
      );
    }

    return NextResponse.json(savedAnalysis);
  } catch (caughtError) {
    return NextResponse.json(
      {
        error:
          caughtError instanceof Error
            ? caughtError.message
            : "PaperTrail could not process that item."
      },
      { status: 500 }
    );
  }
}

async function insertAnalysisRow({
  analysis,
  normalizedSourceKind,
  sourceFile,
  supabase,
  userId
}: {
  analysis: AnalysisResult;
  normalizedSourceKind: string;
  sourceFile: StoredSourceFile | null;
  supabase: NonNullable<Awaited<ReturnType<typeof requireSupabaseUser>>["supabase"]>;
  userId: string;
}) {
  const row = toAnalysisRow(analysis, userId, normalizedSourceKind, sourceFile);
  const { error } = await supabase.from(SUPABASE_ANALYSES_TABLE).insert(row);

  if (!error) {
    return { error: null as string | null, retriedWithoutNewThumbnailColumns: false };
  }

  if (!/source_thumbnail_file_/i.test(error.message)) {
    return { error: error.message, retriedWithoutNewThumbnailColumns: false };
  }

  const compatibleRow: Record<string, unknown> = { ...row };
  delete compatibleRow.source_thumbnail_file_path;
  delete compatibleRow.source_thumbnail_file_url;
  delete compatibleRow.source_thumbnail_file_name;
  delete compatibleRow.source_thumbnail_file_type;
  delete compatibleRow.source_thumbnail_file_size;

  const retry = await supabase.from(SUPABASE_ANALYSES_TABLE).insert(compatibleRow);

  return {
    error: retry.error?.message ?? null,
    retriedWithoutNewThumbnailColumns: true
  };
}

async function uploadSourceFile({
  analysisId,
  formData,
  supabase,
  userId
}: {
  analysisId: string;
  formData: FormData;
  supabase: NonNullable<Awaited<ReturnType<typeof requireSupabaseUser>>["supabase"]>;
  userId: string;
}): Promise<StoredSourceFile | null> {
  const maybeFile = formData.get("file");

  if (!(maybeFile instanceof File)) {
    return null;
  }

  const safeName = maybeFile.name.replace(/[^\w.-]+/g, "_");
  const path = `${userId}/${analysisId}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage
    .from(SUPABASE_UPLOADS_BUCKET)
    .upload(path, maybeFile, {
      contentType: maybeFile.type || "application/octet-stream",
      upsert: false
    });

  if (error) {
    throw new Error(`Could not save uploaded file: ${error.message}`);
  }

  return {
    path,
    url: await createSignedFileUrl(supabase, path),
    name: maybeFile.name,
    type: maybeFile.type || "application/octet-stream",
    size: maybeFile.size
  };
}

async function uploadRemoteThumbnail({
  analysisId,
  sourceThumbnailUrl,
  supabase,
  userId
}: {
  analysisId: string;
  sourceThumbnailUrl: string | null;
  supabase: NonNullable<Awaited<ReturnType<typeof requireSupabaseUser>>["supabase"]>;
  userId: string;
}): Promise<StoredSourceFile | null> {
  if (!sourceThumbnailUrl || !/^https?:\/\//i.test(sourceThumbnailUrl)) {
    return null;
  }

  try {
    const response = await fetch(sourceThumbnailUrl, {
      headers: {
        "user-agent": "PaperTrail thumbnail saver"
      }
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";

    if (!contentType.startsWith("image/")) {
      return null;
    }

    const bytes = await response.arrayBuffer();
    const extension = contentType.split("/")[1]?.split(";")[0] || "jpg";
    const path = `${userId}/${analysisId}/thumbnail-${Date.now()}.${extension}`;
    const { error } = await supabase.storage
      .from(SUPABASE_UPLOADS_BUCKET)
      .upload(path, Buffer.from(bytes), {
        contentType,
        upsert: false
      });

    if (error) {
      return null;
    }

    return {
      path,
      url: await createSignedFileUrl(supabase, path),
      name: `thumbnail.${extension}`,
      type: contentType,
      size: bytes.byteLength
    };
  } catch {
    return null;
  }
}

async function createSignedFileUrl(
  supabase: NonNullable<Awaited<ReturnType<typeof requireSupabaseUser>>["supabase"]>,
  path: string
) {
  const { data } = await supabase.storage
    .from(SUPABASE_UPLOADS_BUCKET)
    .createSignedUrl(path, 60 * 60);

  return data?.signedUrl ?? null;
}
