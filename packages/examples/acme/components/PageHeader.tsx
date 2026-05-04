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
    <div className="mb-8">
      {title ? (
        <h1
          className="text-2xl font-semibold text-foreground"
          style={{ fontFamily: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif" }}
        >
          {title}
        </h1>
      ) : null}
      {subtitle ? (
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}
