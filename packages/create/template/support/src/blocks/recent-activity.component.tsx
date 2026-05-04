import type { Props } from "./recent-activity-types.js";

const CHANNEL_LABEL: Record<string, string> = {
  email: "✉",
  slack: "#",
  web:   "◉",
};

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function RecentActivityView({ data }: Props) {
  const rows = [...data.recent.rows].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  return (
    <section>
      <header className="mb-3">
        <h2 className="text-base font-semibold text-slate-900">Activity</h2>
        <p className="text-xs text-slate-500">Latest ticket updates</p>
      </header>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-500">No recent activity.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((t) => (
            <li key={t.id} className="text-sm">
              <p className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{CHANNEL_LABEL[t.channel] ?? t.channel}</span>
                <span className="truncate font-medium text-slate-900">{t.subject}</span>
              </p>
              <p className="text-xs text-slate-500">
                {t.accountName} · {t.status} · {formatRelative(t.updatedAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
