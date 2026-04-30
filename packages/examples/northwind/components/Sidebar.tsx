"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";

const NAV_ITEMS = [
  {
    "label": "Pipeline",
    "path": "/",
    "icon": "Layers"
  },
  {
    "label": "Leads",
    "path": "/leads",
    "icon": "UserPlus"
  }
] as const;

type IconName = keyof typeof Icons;

function Icon({ name }: { name: string }): ReactElement {
  const Component = (Icons as Record<string, unknown>)[name] ?? Icons.Circle;
  const Resolved = Component as typeof Icons.Circle;
  return <Resolved size={16} strokeWidth={2} />;
}

export function Sidebar(): ReactElement {
  const pathname = usePathname();
  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-white">
      <div className="h-14 flex items-center px-5 text-sm font-semibold text-slate-900 border-b border-slate-200">
        CRM
      </div>
      <nav className="px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors " +
                (active
                  ? "bg-[var(--accent-soft)] text-[var(--accent)] font-medium"
                  : "text-slate-700 hover:bg-slate-100")
              }
            >
              <Icon name={item.icon as IconName} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
