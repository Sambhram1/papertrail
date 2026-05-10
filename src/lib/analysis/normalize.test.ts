import assert from "node:assert/strict";
import { normalizeSubmissionForTest } from "./normalize";

export async function runNormalizeTests() {
  const result = await normalizeSubmissionForTest({ text: "Pay this by Friday" });
  assert.equal(result.sourceKind, "text");
  assert.equal(result.normalizedText.includes("Friday"), true);
}
