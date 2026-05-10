import { z } from "zod";

const confidenceSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();

    if (trimmed === "high" || trimmed === "medium" || trimmed === "low") {
      return trimmed;
    }

    const numeric = Number(trimmed);

    if (Number.isFinite(numeric)) {
      return normalizeConfidence(numeric);
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return normalizeConfidence(value);
  }

  return value;
}, z.enum(["high", "medium", "low"]).default("low"));

function normalizeConfidence(value: number) {
  let normalized = value;

  if (value > 1) {
    normalized = value <= 100 ? value / 100 : 1;
  }

  if (normalized >= 0.67) {
    return "high" as const;
  }

  if (normalized >= 0.34) {
    return "medium" as const;
  }

  return "low" as const;
}

export const analysisSchema = z.object({
  id: z.string().default(""),
  createdAt: z.string().default(""),
  title: z.string().default("Untitled item"),
  documentType: z.string().default("Administrative message"),
  oneLineSummary: z.string().default("No summary available."),
  plainEnglishExplanation: z
    .string()
    .default("PaperTrail could not fully explain this item."),
  deadlines: z
    .array(
      z.object({
        label: z.string().default("Respond or review"),
        date: z.string().default("Not found"),
        confidence: confidenceSchema
      })
    )
    .default([]),
  actions: z
    .array(
      z.object({
        id: z.string().default(""),
        label: z.string().default("Review this item"),
        detail: z.string().default(""),
        done: z.boolean().default(false),
        priority: z.enum(["high", "medium", "low"]).default("medium")
      })
    )
    .default([]),
  riskLevel: z.enum(["high", "medium", "low"]).default("low"),
  risks: z.array(z.string()).default([]),
  suggestedReply: z.string().default("No suggested reply available."),
  entities: z
    .array(
      z.object({
        type: z.string().default("unknown"),
        value: z.string().default("")
      })
    )
    .default([]),
  sourcePreview: z.string().default("")
});

export function parseAnalysisResult(value: unknown) {
  return analysisSchema.parse(value);
}
