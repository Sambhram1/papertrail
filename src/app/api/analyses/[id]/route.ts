import { NextResponse } from "next/server";
import { fromAnalysisRow, type AnalysisRow } from "@/lib/supabase/analyses";
import { SUPABASE_ANALYSES_TABLE, SUPABASE_UPLOADS_BUCKET } from "@/lib/supabase/config";
import { requireSupabaseUser } from "@/lib/supabase/server";
import type { AnalysisAction, AnalysisResult } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { supabase, user } = await requireSupabaseUser(request);

  if (!supabase || !user) {
    return NextResponse.json({ error: "Sign in to view this analysis." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from(SUPABASE_ANALYSES_TABLE)
    .select("*")
    .eq("user_id", user.id)
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
  }

  const analysis = await withSignedSourceUrl(data as AnalysisRow, supabase);
  return NextResponse.json(analysis);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { supabase, user } = await requireSupabaseUser(request);

  if (!supabase || !user) {
    return NextResponse.json({ error: "Sign in to update this analysis." }, { status: 401 });
  }

  const body = (await request.json()) as { actions?: AnalysisAction[] };

  if (!Array.isArray(body.actions)) {
    return NextResponse.json({ error: "Missing actions." }, { status: 400 });
  }

  const { error } = await supabase
    .from(SUPABASE_ANALYSES_TABLE)
    .update({ actions: body.actions })
    .eq("user_id", user.id)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function withSignedSourceUrl(
  row: AnalysisRow,
  supabase: NonNullable<Awaited<ReturnType<typeof requireSupabaseUser>>["supabase"]>
): Promise<AnalysisResult> {
  const analysis = fromAnalysisRow(row);

  if (!analysis.sourceFile?.path) {
    return withSignedThumbnailUrl(analysis, supabase);
  }

  const { data } = await supabase.storage
    .from(SUPABASE_UPLOADS_BUCKET)
    .createSignedUrl(analysis.sourceFile.path, 60 * 60);

  return withSignedThumbnailUrl({
    ...analysis,
    sourceFile: {
      ...analysis.sourceFile,
      url: data?.signedUrl ?? analysis.sourceFile.url
    }
  }, supabase);
}

async function withSignedThumbnailUrl(
  analysis: AnalysisResult,
  supabase: NonNullable<Awaited<ReturnType<typeof requireSupabaseUser>>["supabase"]>
): Promise<AnalysisResult> {
  if (!analysis.sourceThumbnailFile?.path) {
    return analysis;
  }

  const { data } = await supabase.storage
    .from(SUPABASE_UPLOADS_BUCKET)
    .createSignedUrl(analysis.sourceThumbnailFile.path, 60 * 60);

  return {
    ...analysis,
    sourceThumbnailUrl: data?.signedUrl ?? analysis.sourceThumbnailUrl,
    sourceThumbnailFile: {
      ...analysis.sourceThumbnailFile,
      url: data?.signedUrl ?? analysis.sourceThumbnailFile.url
    }
  };
}
