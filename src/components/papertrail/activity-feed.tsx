import Link from "next/link";
import type { AnalysisResult } from "@/lib/types";

type ActivityGroup = {
  dateLabel: string;
  items: AnalysisResult[];
};

export function groupBySavedDay(items: AnalysisResult[]) {
  const map = new Map<string, AnalysisResult[]>();

  for (const item of items) {
    const key = new Date(item.createdAt).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric"
    });

    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }

  return Array.from(map.entries()).map(([dateLabel, groupedItems]) => ({
    dateLabel,
    items: groupedItems
  })) as ActivityGroup[];
}

export function ActivityFeed({
  items,
  title,
  compact = false
}: {
  items: AnalysisResult[];
  title: string;
  compact?: boolean;
}) {
  const groups = groupBySavedDay(items);

  return (
    <section className={compact ? "grid gap-3" : "grid gap-4"}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-[var(--muted)]">Activity timeline</p>
          <h2 className="display-title mt-2 text-4xl leading-none text-[var(--paper)]">
            {title}
          </h2>
        </div>
        <p className="text-xs uppercase text-[var(--muted)]">{groups.length} days</p>
      </div>

      <div className="grid gap-4">
        {groups.length ? (
          groups.map((group) => (
            <section key={group.dateLabel} className="relative border-l border-[var(--line)] pl-4">
              <div className="sticky top-0 z-10 mb-3 inline-flex border border-[var(--line)] bg-black px-3 py-2 text-xs uppercase text-[var(--paper)]">
                {group.dateLabel}
              </div>
              <div className="grid gap-3">
                {group.items.map((item) => (
                  <Link
                    key={item.id}
                    href={`/analyze?id=${item.id}`}
                    className="block border border-[var(--line)] bg-[#080808] p-3 transition hover:border-white"
                  >
                    <div className="grid gap-3">
                      <ActivityPreview item={item} />
                      <div className="min-w-0">
                        <h3 className="mt-2 text-base leading-6 text-[var(--paper)]">
                          {item.title}
                        </h3>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))
        ) : (
          <div className="border border-[var(--line)] px-4 py-8 text-sm text-[var(--muted)]">
            No saved activity yet.
          </div>
        )}
      </div>
    </section>
  );
}

function ActivityPreview({ item }: { item: AnalysisResult }) {
  if (item.sourceThumbnailUrl) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden border border-white bg-white">
        <img
          src={item.sourceThumbnailUrl}
          alt={item.sourceTitle ?? item.title}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  if (item.sourceFile?.url && item.sourceFile.type.startsWith("image/")) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden border border-white bg-white">
        <img
          src={item.sourceFile.url}
          alt={item.sourceFile.name}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="grid aspect-[4/3] place-items-center border border-[var(--line)] bg-black text-center">
      <div>
        <p className="text-[10px] uppercase text-[var(--muted)]">Saved</p>
      </div>
    </div>
  );
}
