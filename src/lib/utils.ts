import type { AnalysisEntity, RiskLevel } from "./types";

export function createAnalysisId() {
  return `pt-${Math.random().toString(36).slice(2, 10)}`;
}

export function createShortPreview(value: string, length = 144) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length <= length ? compact : `${compact.slice(0, length).trim()}...`;
}

export function inferDocumentType(text: string, fileName?: string) {
  const source = `${text} ${fileName ?? ""}`;

  if (/invoice|balance due|payment|wire|late fee/i.test(source)) {
    return "Invoice";
  }

  if (/landlord|lease|deposit|move-out|tenant/i.test(source)) {
    return "Housing notice";
  }

  if (/school|permission slip|teacher|field trip|student/i.test(source)) {
    return "School notice";
  }

  if (/ticket|citation|parking/i.test(source)) {
    return "Parking or fine notice";
  }

  if (/clinic|medical|insurance|appointment/i.test(source)) {
    return "Medical or insurance notice";
  }

  if (/https?:\/\/|twitter|x\.com|reel|instagram|blog|saved for later|read later/i.test(source)) {
    return "Saved link or post";
  }

  return "Administrative message";
}

export function pickRiskLevel(text: string): RiskLevel {
  if (/urgent|final notice|termination|suspend|cannot attend|late fee|overdue|deduction|fine/i.test(text)) {
    return "high";
  }

  if (/reply|respond|by|before|reminder|required/i.test(text)) {
    return "medium";
  }

  return "low";
}

export function dedupeValues(values: AnalysisEntity[]) {
  const seen = new Set<string>();
  return values.filter((item) => {
    const key = `${item.type}:${item.value}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Saved recently";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}
