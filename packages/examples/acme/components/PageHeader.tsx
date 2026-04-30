import type { ReactElement } from "react";

export function PageHeader({
  title,
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}): ReactElement | null {
  if (!title && !subtitle) return null;
  return (
    <div className="mb-6">
      {title ? (
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
      ) : null}
      {subtitle ? (
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      ) : null}
    </div>
  );
}
