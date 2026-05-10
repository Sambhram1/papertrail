import { parseAnalysisResult } from "./schema";
import type { AnalysisResult, NormalizedSubmission } from "../types";
import { createAnalysisId, createShortPreview, inferDocumentType, pickRiskLevel } from "../utils";

export function repairAnalysisResult(
  rawResult: string | object,
  normalized: NormalizedSubmission
): AnalysisResult {
  const parsedCandidate =
    typeof rawResult === "string" ? safeParseJson(extractJson(rawResult)) : rawResult;

  const parsed = parseAnalysisResult(parsedCandidate ?? {});

  return {
    ...parsed,
    id: parsed.id || createAnalysisId(),
    createdAt: parsed.createdAt || new Date().toISOString(),
    title: parsed.title || `${inferDocumentType(normalized.normalizedText, normalized.fileName)} action plan`,
    documentType:
      parsed.documentType || inferDocumentType(normalized.normalizedText, normalized.fileName),
    oneLineSummary:
      parsed.oneLineSummary ||
      `${inferDocumentType(normalized.normalizedText, normalized.fileName)} detected. Review this item promptly.`,
    plainEnglishExplanation:
      parsed.plainEnglishExplanation ||
      "PaperTrail found the main structure of this item, but you should still confirm details against the source.",
    actions: parsed.actions.map((action, index) => ({
      ...action,
      id: action.id || `${createAnalysisId()}-${index}`
    })),
    riskLevel: parsed.riskLevel || pickRiskLevel(normalized.normalizedText),
    suggestedReply:
      parsed.suggestedReply ||
      "Hi, I received this and am reviewing the details now. Please let me know if anything else is needed from me.",
    sourcePreview: parsed.sourcePreview || createShortPreview(normalized.sourcePreview)
  };
}

function extractJson(value: string) {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return value;
  }

  return value.slice(start, end + 1);
}

function safeParseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
