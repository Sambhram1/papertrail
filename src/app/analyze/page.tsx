import { Suspense } from "react";
import { AnalyzeShell } from "@/components/papertrail/analyze-shell";

export default function AnalyzePage() {
  return (
    <Suspense fallback={null}>
      <AnalyzeShell />
    </Suspense>
  );
}
