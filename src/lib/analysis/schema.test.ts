import assert from "node:assert/strict";
import { parseAnalysisResult } from "./schema";

export function runSchemaTests() {
  const parsed = parseAnalysisResult({
    documentType: "Invoice",
    oneLineSummary: "Payment due in 3 days"
  });

  assert.equal(parsed.documentType, "Invoice");
  assert.deepEqual(parsed.deadlines, []);
  assert.equal(parsed.suggestedReply.length > 0, true);
}
