import type { AnalysisResult, NormalizedSubmission, RiskLevel } from "../types";
import {
  createAnalysisId,
  createShortPreview,
  dedupeValues,
  inferDocumentType,
  pickRiskLevel
} from "../utils";

export function buildFallbackAnalysis(input: NormalizedSubmission): AnalysisResult {
  const text = input.normalizedText.trim();
  const documentType = inferDocumentType(text, input.fileName);
  const entities = extractEntities(text);
  const deadlines = extractDeadlines(text);
  const riskLevel = pickRiskLevel(text);
  const replyPrompt = documentType.toLowerCase().includes("invoice")
    ? "I received this and am reviewing the payment details now."
    : "I received this and am reviewing the next steps now.";

  return {
    id: createAnalysisId(),
    createdAt: new Date().toISOString(),
    title: `${documentType} action plan`,
    documentType,
    oneLineSummary: buildOneLineSummary(text, documentType, deadlines, riskLevel),
    plainEnglishExplanation: buildPlainEnglishExplanation(text, documentType),
    deadlines,
    actions: buildActions(text, documentType, deadlines),
    riskLevel,
    risks: buildRisks(text, riskLevel),
    suggestedReply: buildSuggestedReply(text, replyPrompt),
    entities,
    sourcePreview: createShortPreview(text || input.fileName || "Uploaded item")
  };
}

function buildOneLineSummary(
  text: string,
  documentType: string,
  deadlines: AnalysisResult["deadlines"],
  riskLevel: RiskLevel
) {
  const deadlinePart = deadlines[0]?.date ? ` with a deadline ${deadlines[0].date}` : "";
  const urgencyPart = riskLevel === "high" ? " and it looks time-sensitive" : "";
  return `${documentType} detected${deadlinePart}${urgencyPart}. ${createShortPreview(text, 96)}`;
}

function buildPlainEnglishExplanation(text: string, documentType: string) {
  if (!text) {
    return `This looks like a ${documentType.toLowerCase()}. PaperTrail could not extract much text, so review the original file before acting.`;
  }

  if (documentType === "Invoice") {
    return "This appears to be a billing or payment request. Focus on the amount due, the due date, and whether you need to confirm payment or request documentation.";
  }

  if (documentType === "School notice") {
    return "This looks like a school-related reminder or requirement. The main job is to complete the requested forms or response before the cutoff.";
  }

  if (documentType === "Housing notice") {
    return "This looks like a landlord or housing-related message. Pay attention to any claimed charges, response deadlines, or documentation requests.";
  }

  if (documentType === "Saved link or post") {
    return "This looks like something saved for later. Turn it into a reading item, reminder, or follow-up task instead of letting it sit in a feed.";
  }

  return "This appears to be an administrative request or notice. Focus on what is being asked, when it is due, and what proof or reply you may need to send back.";
}

function buildActions(
  text: string,
  documentType: string,
  deadlines: AnalysisResult["deadlines"]
) {
  const actions = [
    {
      id: `${createAnalysisId()}-review`,
      label: "Review the original message",
      detail: "Check the names, amounts, and date references against the source.",
      done: false,
      priority: "medium" as RiskLevel
    }
  ];

  if (deadlines[0]) {
    actions.unshift({
      id: `${createAnalysisId()}-deadline`,
      label: `Handle by ${deadlines[0].date}`,
      detail: `Prioritize the response or document request linked to ${deadlines[0].label.toLowerCase()}.`,
      done: false,
      priority: "high" as RiskLevel
    });
  }

  if (/reply|respond|email|confirm|let us know/i.test(text)) {
    actions.push({
      id: `${createAnalysisId()}-reply`,
      label: "Send a written reply",
      detail: "Acknowledge receipt and ask for any missing details before committing.",
      done: false,
      priority: "high"
    });
  }

  if (/pay|payment|invoice|fee|balance/i.test(text) || documentType === "Invoice") {
    actions.push({
      id: `${createAnalysisId()}-payment`,
      label: "Confirm payment details",
      detail: "Verify the amount, method, and any late-fee conditions.",
      done: false,
      priority: "high"
    });
  }

  if (documentType === "Saved link or post") {
    actions.push({
      id: `${createAnalysisId()}-saved`,
      label: "Decide why this was saved",
      detail: "Convert it into a calendar reminder, reading task, or reply draft.",
      done: false,
      priority: "medium"
    });
  }

  return actions.slice(0, 4);
}

function buildRisks(text: string, riskLevel: RiskLevel) {
  const risks = [];

  if (/late fee|penalty|suspend|termination|cannot attend|overdue|final notice/i.test(text)) {
    risks.push("Ignoring this could lead to fees, restrictions, or a missed opportunity.");
  }

  if (/deduction|charge|collections|fine/i.test(text)) {
    risks.push("There may be money at stake if the issue is not disputed or handled quickly.");
  }

  if (!risks.length && riskLevel !== "low") {
    risks.push("This message uses urgency or consequence language and should not be left unanswered.");
  }

  return risks;
}

function buildSuggestedReply(text: string, base: string) {
  if (/invoice|payment|wire/i.test(text)) {
    return "Hi, thanks for the reminder. I received this and am reviewing the payment details now. Please resend the latest payment instructions if needed.";
  }

  if (/landlord|lease|deposit|repair/i.test(text)) {
    return "Hi, I received your message. Please send the itemized details and any supporting documentation so I can review the issue promptly.";
  }

  if (/school|form|permission/i.test(text)) {
    return "Thanks for the reminder. I received this and will complete the requested forms by the stated deadline.";
  }

  return `Hi, thanks for sending this. ${base} If there is anything else you need from me, please let me know.`;
}

function extractDeadlines(text: string): AnalysisResult["deadlines"] {
  const matches = text.match(
    /\b(?:by|before|on)\s+((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|tomorrow(?:\s+at\s+\d{1,2}(?::\d{2})?\s?(?:am|pm))?|thursday|friday|monday|tuesday|wednesday|saturday|sunday)\b/gi
  );

  return (matches ?? []).slice(0, 3).map((match) => ({
    label: "Respond or complete request",
    date: match.replace(/^(by|before|on)\s+/i, ""),
    confidence: "medium"
  }));
}

function extractEntities(text: string) {
  const amountMatches = text.match(/(?:\$|₹|€)\s?\d[\d,]*(?:\.\d{2})?/g) ?? [];
  const invoiceMatches = text.match(/\b(?:invoice|case|ticket|form)\s*#?\s*[\w-]+\b/gi) ?? [];
  const dateMatches = text.match(
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}\b/gi
  ) ?? [];

  return dedupeValues([
    ...amountMatches.map((value) => ({ type: "amount", value })),
    ...invoiceMatches.map((value) => ({ type: "reference", value })),
    ...dateMatches.map((value) => ({ type: "date", value }))
  ]);
}
