import assert from "node:assert/strict";
import { normalizeSubmissionForTest } from "./normalize";

export async function runNormalizeTests() {
  const result = await normalizeSubmissionForTest({ text: "Pay this by Friday" });
  assert.equal(result.sourceKind, "text");
  assert.equal(result.normalizedText.includes("Friday"), true);

  const fileWins = await normalizeSubmissionForTest({
    text: "This note should not override the PDF",
    fileName: "statement.pdf",
    fileType: "application/pdf",
    fileBuffer: Buffer.from("%PDF-1.4 fake pdf")
  });
  assert.equal(fileWins.sourceKind, "pdf");
}
