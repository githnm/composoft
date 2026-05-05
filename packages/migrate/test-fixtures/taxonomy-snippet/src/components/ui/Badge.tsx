// UI primitive — used in 3+ components, no data, no state. Analyzer
// should detect via behavioral signal and exclude from candidates.
export function Badge({ children, variant }: { children: React.ReactNode; variant?: "default" | "outline" }) {
  return <span className={`badge badge-${variant ?? "default"}`}>{children}</span>;
}
