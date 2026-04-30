import type { ReactElement } from "react";

export function Navbar(): ReactElement {
  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6">
      <div className="font-semibold text-slate-900 tracking-tight">CRM</div>
      <span className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200">Acme</span>
    </header>
  );
}
