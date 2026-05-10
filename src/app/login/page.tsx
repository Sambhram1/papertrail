import { Suspense } from "react";
import { LoginShell } from "@/components/papertrail/login-shell";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginShell />
    </Suspense>
  );
}
