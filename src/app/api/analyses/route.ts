import { NextResponse } from "next/server";
import { fromAnalysisRow, type AnalysisRow } from "@/lib/supabase/analyses";
import { SUPABASE_ANALYSES_TABLE, SUPABASE_UPLOADS_BUCKET } from "@/lib/supabase/config";
import { requireSupabaseUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { supabase, user } = await requireSupabaseUser(request);

  if (!supabase || !user) {
    return NextResponse.json({ error: "Sign in to view history." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from(SUPABASE_ANALYSES_TABLE)
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const analyses = await Promise.all(
    ((data ?? []) as AnalysisRow[]).map((row) => withSignedSourceUrl(row, supabase))
  );

  return NextResponse.json({ analyses });
}

async function withSignedSourceUrl(
  row: AnalysisRow,
  supabase: NonNullable<Awaited<ReturnType<typeof requireSupabaseUser>>["supabase"]>
) {
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
  analysis: Awaited<ReturnType<typeof fromAnalysisRow>>,
  supabase: NonNullable<Awaited<ReturnType<typeof requireSupabaseUser>>["supabase"]>
) {
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
