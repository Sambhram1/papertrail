import pdf from "pdf-parse";

export async function extractPdfText(buffer: Buffer) {
  try {
    const result = await pdf(buffer);
    return result.text.trim();
  } catch {
    return "";
  }
}
