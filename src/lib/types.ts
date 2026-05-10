export type RiskLevel = "high" | "medium" | "low";
export type Confidence = "high" | "medium" | "low";

export type AnalysisDeadline = {
  label: string;
  date: string;
  confidence: Confidence;
};

export type AnalysisAction = {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  priority: RiskLevel;
};

export type AnalysisEntity = {
  type: string;
  value: string;
};

export type AnalysisResult = {
  id: string;
  createdAt: string;
  title: string;
  documentType: string;
  oneLineSummary: string;
  plainEnglishExplanation: string;
  deadlines: AnalysisDeadline[];
  actions: AnalysisAction[];
  riskLevel: RiskLevel;
  risks: string[];
  suggestedReply: string;
  entities: AnalysisEntity[];
  sourcePreview: string;
  sourceFile?: StoredSourceFile | null;
  sourceKind?: string | null;
  sourceNote?: string | null;
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  sourceThumbnailUrl?: string | null;
  sourceThumbnailFile?: StoredSourceFile | null;
};

export type StoredSourceFile = {
  path: string;
  url?: string | null;
  name: string;
  type: string;
  size: number;
};

export type NormalizedSubmission = {
  sourceKind: "text" | "image" | "pdf";
  fileName?: string;
  fileType?: string;
  imageDataUrl?: string;
  normalizedText: string;
  sourcePreview: string;
};
