import assert from "node:assert/strict";
import { repairAnalysisResult } from "./repair";

export function runRepairTests() {
  const repaired = repairAnalysisResult(
    JSON.stringify({
      documentType: "Housing notice",
      oneLineSummary: "Reply needed"
    }),
    {
      sourceKind: "text",
      normalizedText: "Reply by Thursday about your deposit deduction",
      sourcePreview: "Reply by Thursday about your deposit deduction"
    }
  );

  assert.equal(repaired.documentType, "Housing notice");
  assert.equal(repaired.actions.length, 0);
  assert.equal(repaired.id.startsWith("pt-"), true);
}
