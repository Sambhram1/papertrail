import { NextResponse } from "next/server";
import { buildFallbackAnalysis } from "@/lib/analysis/fallback";
import { normalizeSubmission } from "@/lib/analysis/normalize";
import { SUPABASE_ANALYSES_TABLE, SUPABASE_UPLOADS_BUCKET } from "@/lib/supabase/config";
import { fetchSafeExternal } from "@/lib/security/external-url";
import { toAnalysisRow } from "@/lib/supabase/analyses";
import { requireSupabaseUser } from "@/lib/supabase/server";
import type { AnalysisResult, StoredSourceFile } from "@/lib/types";

export const runtime = "nodejs";
const THUMBNAIL_FETCH_TIMEOUT_MS = 2500;
const SIGNED_URL_TIMEOUT_MS = 1500;

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

    const analysis = buildFallbackAnalysis(normalized);

    const sourceFile = await uploadSourceFile({
      analysisId: analysis.id,
      formData,
      supabase,
      userId: user.id
    });
    const savedAnalysis: AnalysisResult = {
      ...analysis,
      title: sourceNote || sourceTitle || analysis.title,
      sourceFile,
      sourceKind: normalized.sourceKind,
      sourceNote,
      sourceUrl,
      sourceTitle,
      sourceThumbnailUrl,
      sourceThumbnailFile: null
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
            hasThumbnailFile: false,
            sourceFilePath: sourceFile?.path ?? null,
            sourceThumbnailPath: null,
            retriedWithoutNewThumbnailColumns: saveResult.retriedWithoutNewThumbnailColumns
          }
        },
        { status: 500 }
      );
    }

    const sourceThumbnailFile = await uploadRemoteThumbnail({
      analysisId: analysis.id,
      sourceThumbnailUrl,
      supabase,
      userId: user.id
    });
    const analysisWithOptionalThumbnail: AnalysisResult = sourceThumbnailFile
      ? {
          ...savedAnalysis,
          sourceThumbnailUrl: sourceThumbnailFile.url,
          sourceThumbnailFile
        }
      : savedAnalysis;

    if (sourceThumbnailFile) {
      await updateThumbnailMetadata({
        analysisId: analysis.id,
        sourceThumbnailFile,
        supabase,
        userId: user.id
      });
    }

    return NextResponse.json(analysisWithOptionalThumbnail);
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

  const retry = await supabase
    .from(SUPABASE_ANALYSES_TABLE)
    .insert(buildMinimalAnalysisRow(analysis, userId));

  if (!retry.error) {
    return {
      error: null as string | null,
      retriedWithoutNewThumbnailColumns: true
    };
  }

  return {
    error: retry.error.message,
    retriedWithoutNewThumbnailColumns: true
  };
}

function buildMinimalAnalysisRow(analysis: AnalysisResult, userId: string) {
  return {
    id: analysis.id,
    user_id: userId,
    created_at: analysis.createdAt,
    title: analysis.title,
    document_type: analysis.documentType,
    one_line_summary: analysis.oneLineSummary,
    plain_english_explanation: analysis.plainEnglishExplanation,
    deadlines: analysis.deadlines,
    actions: analysis.actions,
    risk_level: analysis.riskLevel,
    risks: analysis.risks,
    suggested_reply: analysis.suggestedReply,
    entities: analysis.entities,
    source_preview: analysis.sourcePreview
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
    const response = await fetchSafeExternal(sourceThumbnailUrl, {
      headers: {
        "user-agent": "PaperTrail thumbnail saver"
      }
    }, {
      timeoutMs: THUMBNAIL_FETCH_TIMEOUT_MS
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
  try {
    const signedUrlResult = await withTimeout(
      supabase.storage.from(SUPABASE_UPLOADS_BUCKET).createSignedUrl(path, 60 * 60),
      SIGNED_URL_TIMEOUT_MS
    );

    return signedUrlResult.data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

async function updateThumbnailMetadata({
  analysisId,
  sourceThumbnailFile,
  supabase,
  userId
}: {
  analysisId: string;
  sourceThumbnailFile: StoredSourceFile;
  supabase: NonNullable<Awaited<ReturnType<typeof requireSupabaseUser>>["supabase"]>;
  userId: string;
}) {
  try {
    await supabase
      .from(SUPABASE_ANALYSES_TABLE)
      .update({
        source_thumbnail_url: sourceThumbnailFile.url,
        source_thumbnail_file_path: sourceThumbnailFile.path,
        source_thumbnail_file_url: sourceThumbnailFile.url,
        source_thumbnail_file_name: sourceThumbnailFile.name,
        source_thumbnail_file_type: sourceThumbnailFile.type,
        source_thumbnail_file_size: sourceThumbnailFile.size
      })
      .eq("id", analysisId)
      .eq("user_id", userId);
  } catch {
    // Best effort: the save already succeeded, so thumbnail metadata persistence must not fail it.
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return await Promise.race<T>([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Timed out.")), timeoutMs);
    })
  ]);
}
