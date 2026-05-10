import type { ReactNode } from "react";

export function StateBadge({
  children,
  kind
}: {
  children: ReactNode;
  kind: "high" | "medium" | "low" | "document";
}) {
  const styles =
    kind === "high"
      ? "border-white bg-white text-black"
      : kind === "medium"
        ? "border-[var(--line-strong)] bg-transparent text-[var(--paper)]"
        : kind === "low"
          ? "border-[var(--line)] bg-transparent text-[var(--muted)]"
          : "border-[var(--line)] bg-transparent text-[var(--paper-2)]";

  return (
    <span className={`body-copy border px-3 py-1 text-xs uppercase ${styles}`}>
      {children}
    </span>
  );
}
