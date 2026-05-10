export function getReadableFileType(fileType?: string) {
  if (!fileType) {
    return "file";
  }

  if (fileType === "application/pdf") {
    return "pdf";
  }

  if (fileType.startsWith("image/")) {
    return "image";
  }

  return "file";
}
