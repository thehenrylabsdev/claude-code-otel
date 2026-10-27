import { Suspense } from "react";
import { Sidebar } from "./Sidebar";
import { DateRangePicker } from "./DateRangePicker";
import { formatDateTime } from "@/lib/format";

export function AppShell({
  children,
  title,
  subtitle,
  lastReceivedAt,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  lastReceivedAt?: string | null;
}) {
  return (
    <div className="flex min-h-screen">
      <Suspense fallback={<div className="w-56 bg-slate-950" />}>
        <Sidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
            ) : null}
            <p className="mt-1 text-xs text-slate-400">
              Data freshness: {formatDateTime(lastReceivedAt ?? null)}
            </p>
          </div>
          <Suspense fallback={null}>
            <DateRangePicker />
          </Suspense>
        </header>
        <main className="flex-1 space-y-6 p-6">{children}</main>
      </div>
    </div>
  );
}
