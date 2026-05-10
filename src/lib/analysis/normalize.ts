import { extractPdfText } from "../extraction/pdf";
import type { NormalizedSubmission } from "../types";
import { createShortPreview } from "../utils";

export async function normalizeSubmission(formData: FormData): Promise<NormalizedSubmission> {
  const maybeFile = formData.get("file");

  if (maybeFile instanceof File) {
    const arrayBuffer = await maybeFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (maybeFile.type === "application/pdf") {
      const extracted = await extractPdfText(buffer);

      return {
        sourceKind: "pdf",
        fileName: maybeFile.name,
        fileType: maybeFile.type,
        normalizedText: extracted,
        sourcePreview: createShortPreview(extracted || maybeFile.name)
      };
    }

    if (
      maybeFile.type.startsWith("text/") ||
      /\.(txt|md|csv)$/i.test(maybeFile.name)
    ) {
      const extracted = buffer.toString("utf8");

      return {
        sourceKind: "text",
        fileName: maybeFile.name,
        fileType: maybeFile.type,
        normalizedText: extracted,
        sourcePreview: createShortPreview(extracted || maybeFile.name)
      };
    }

    const imageDataUrl = `data:${maybeFile.type};base64,${buffer.toString("base64")}`;

    return {
      sourceKind: "image",
      fileName: maybeFile.name,
      fileType: maybeFile.type,
      imageDataUrl,
      normalizedText: "",
      sourcePreview: createShortPreview(maybeFile.name)
    };
  }

  const text = formData.get("text")?.toString().trim() ?? "";

  if (text) {
    return {
      sourceKind: "text",
      normalizedText: text,
      sourcePreview: createShortPreview(text)
    };
  }

  return {
    sourceKind: "text",
    normalizedText: "",
    sourcePreview: ""
  };
}

export async function normalizeSubmissionForTest(input: {
  text?: string;
  fileName?: string;
  fileType?: string;
  fileBuffer?: Buffer;
}) {
  if (input.fileType === "application/pdf" && input.fileBuffer) {
    return {
      sourceKind: "pdf" as const,
      fileName: input.fileName,
      fileType: input.fileType,
      normalizedText: await extractPdfText(input.fileBuffer),
      sourcePreview: createShortPreview(input.fileName ?? "document.pdf")
    };
  }

  if (input.text?.trim()) {
    return {
      sourceKind: "text" as const,
      normalizedText: input.text.trim(),
      sourcePreview: createShortPreview(input.text.trim())
    };
  }

  return {
    sourceKind: "image" as const,
    fileName: input.fileName,
    fileType: input.fileType,
    normalizedText: "",
    sourcePreview: createShortPreview(input.fileName ?? "upload")
  };
}
