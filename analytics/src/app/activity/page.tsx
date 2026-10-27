import { Suspense } from "react";
import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { ActivityFilters } from "@/components/ActivityFilters";
import { EmptyState } from "@/components/EmptyState";
import { Panel } from "@/components/Panel";
import { formatDateTime, formatNumber } from "@/lib/format";
import { getActivity } from "@/lib/queries/activity";
import { getFreshness } from "@/lib/queries/overview";
import { getGrafanaUrl } from "@/lib/config";
import { resolveRange, type PageSearchParams } from "@/lib/searchParams";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  await connection();
  const { range, raw } = await resolveRange(searchParams);
  const [data, freshness] = await Promise.all([
    getActivity(range, {
      q: raw.q,
      user: raw.user,
      service: raw.service,
    }),
    getFreshness(),
  ]);

  return (
    <AppShell
      title="Activity explorer"
      subtitle="Recent user prompts stored in PostgreSQL"
      lastReceivedAt={freshness.lastReceivedAt}
    >
      <Panel title="Filters">
        <Suspense fallback={null}>
          <ActivityFilters users={data.users} services={data.services} />
        </Suspense>
      </Panel>

      {data.total === 0 ? (
        <EmptyState title="No prompts in this range" />
      ) : (
        <Panel
          title={`${formatNumber(data.total)} prompts`}
          description={`Showing ${data.prompts.length}. Full ops search: Grafana / Loki at ${getGrafanaUrl()}`}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3 font-medium">Time</th>
                  <th className="py-2 pr-3 font-medium">User</th>
                  <th className="py-2 pr-3 font-medium">Service</th>
                  <th className="py-2 pr-3 font-medium">Len</th>
                  <th className="py-2 font-medium">Prompt preview</th>
                </tr>
              </thead>
              <tbody>
                {data.prompts.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 align-top text-slate-800"
                  >
                    <td className="whitespace-nowrap py-2.5 pr-3 text-xs text-slate-500">
                      {formatDateTime(row.event_time)}
                    </td>
                    <td className="py-2.5 pr-3 text-xs">
                      {row.user_email ?? "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-xs">
                      {row.service_name ?? "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-xs">
                      {row.prompt_length ?? "—"}
                    </td>
                    <td className="max-w-xl py-2.5 font-mono text-xs leading-relaxed text-slate-700">
                      {row.prompt_preview ?? "(empty)"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </AppShell>
  );
}
