import type { AnalysisResult, StoredSourceFile } from "../types";

export type AnalysisRow = {
  id: string;
  user_id: string;
  created_at: string;
  title: string;
  document_type: string;
  one_line_summary: string;
  plain_english_explanation: string;
  deadlines: AnalysisResult["deadlines"];
  actions: AnalysisResult["actions"];
  risk_level: AnalysisResult["riskLevel"];
  risks: string[];
  suggested_reply: string;
  entities: AnalysisResult["entities"];
  source_preview: string;
  source_kind: string | null;
  source_file_path: string | null;
  source_file_url: string | null;
  source_file_name: string | null;
  source_file_type: string | null;
  source_file_size: number | null;
  source_note: string | null;
  source_url: string | null;
  source_title: string | null;
  source_thumbnail_url: string | null;
  source_thumbnail_file_path: string | null;
  source_thumbnail_file_url: string | null;
  source_thumbnail_file_name: string | null;
  source_thumbnail_file_type: string | null;
  source_thumbnail_file_size: number | null;
};

export function toAnalysisRow(
  analysis: AnalysisResult,
  userId: string,
  sourceKind: string,
  sourceFile?: StoredSourceFile | null
): AnalysisRow {
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
    source_preview: analysis.sourcePreview,
    source_kind: sourceKind,
    source_file_path: sourceFile?.path ?? null,
    source_file_url: sourceFile?.url ?? null,
    source_file_name: sourceFile?.name ?? null,
    source_file_type: sourceFile?.type ?? null,
    source_file_size: sourceFile?.size ?? null,
    source_note: analysis.sourceNote ?? null,
    source_url: analysis.sourceUrl ?? null,
    source_title: analysis.sourceTitle ?? null,
    source_thumbnail_url: analysis.sourceThumbnailUrl ?? null,
    source_thumbnail_file_path: analysis.sourceThumbnailFile?.path ?? null,
    source_thumbnail_file_url: analysis.sourceThumbnailFile?.url ?? null,
    source_thumbnail_file_name: analysis.sourceThumbnailFile?.name ?? null,
    source_thumbnail_file_type: analysis.sourceThumbnailFile?.type ?? null,
    source_thumbnail_file_size: analysis.sourceThumbnailFile?.size ?? null
  };
}

export function fromAnalysisRow(row: AnalysisRow): AnalysisResult {
  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    documentType: row.document_type,
    oneLineSummary: row.one_line_summary,
    plainEnglishExplanation: row.plain_english_explanation,
    deadlines: row.deadlines ?? [],
    actions: row.actions ?? [],
    riskLevel: row.risk_level,
    risks: row.risks ?? [],
    suggestedReply: row.suggested_reply,
    entities: row.entities ?? [],
    sourcePreview: row.source_preview,
    sourceKind: row.source_kind,
    sourceNote: row.source_note,
    sourceUrl: row.source_url,
    sourceTitle: row.source_title,
    sourceThumbnailUrl: row.source_thumbnail_url,
    sourceThumbnailFile: row.source_thumbnail_file_path
      ? {
          path: row.source_thumbnail_file_path,
          url: row.source_thumbnail_file_url,
          name: row.source_thumbnail_file_name ?? "Link thumbnail",
          type: row.source_thumbnail_file_type ?? "image/jpeg",
          size: row.source_thumbnail_file_size ?? 0
        }
      : null,
    sourceFile: row.source_file_path
      ? {
          path: row.source_file_path,
          url: row.source_file_url,
          name: row.source_file_name ?? "Uploaded file",
          type: row.source_file_type ?? "application/octet-stream",
          size: row.source_file_size ?? 0
        }
      : null
  };
}
