"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/costs", label: "Costs & Tokens" },
  { href: "/adoption", label: "Adoption" },
  { href: "/productivity", label: "Productivity" },
  { href: "/activity", label: "Activity" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const suffix = qs ? `?${qs}` : "";

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 px-5 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-400">
          Claude Code
        </p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight">ROI Analytics</h1>
        <p className="mt-1 text-xs text-slate-400">Leadership dashboard</p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={`${item.href}${suffix}`}
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-teal-500/15 font-medium text-teal-300"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 px-4 py-3 text-[11px] text-slate-500">
        Ops drill-down:{" "}
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noreferrer"
          className="text-teal-400 hover:underline"
        >
          Grafana
        </a>
      </div>
    </aside>
  );
}
