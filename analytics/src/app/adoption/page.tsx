import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Panel } from "@/components/Panel";
import { DonutChart, MultiLineChart } from "@/components/Charts";
import { formatNumber } from "@/lib/format";
import { getAdoption } from "@/lib/queries/adoption";
import { getFreshness } from "@/lib/queries/overview";
import { resolveRange, type PageSearchParams } from "@/lib/searchParams";

export default async function AdoptionPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  await connection();
  const { range } = await resolveRange(searchParams);
  const [data, freshness] = await Promise.all([
    getAdoption(range),
    getFreshness(),
  ]);
  const empty = data.daily.length === 0;

  return (
    <AppShell
      title="Adoption & People"
      subtitle="Who is using Claude Code and how often"
      lastReceivedAt={freshness.lastReceivedAt}
    >
      {empty ? <EmptyState /> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Daily usage"
          description="Prompts, sessions, and active users from Postgres events"
        >
          <MultiLineChart
            data={data.daily.map((d) => ({
              day: d.day.slice(5),
              prompts: d.prompts,
              sessions: d.sessions,
              users: d.users,
            }))}
            lines={[
              { key: "prompts", color: "#0d9488", label: "Prompts" },
              { key: "sessions", color: "#0369a1", label: "Sessions" },
              { key: "users", color: "#b45309", label: "Users" },
            ]}
          />
        </Panel>
        <Panel title="By service">
          <DonutChart
            data={data.byService.map((s) => ({
              service: s.service_name,
              value: s.prompts || s.sessions || 1,
            }))}
            nameKey="service"
            valueKey="value"
            format="number"
          />
        </Panel>
      </div>

      <Panel title="User leaderboard" description="Top users by event volume">
        {data.leaderboard.length === 0 ? (
          <p className="text-sm text-slate-400">No users in range</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3 font-medium">User</th>
                  <th className="py-2 pr-3 font-medium">Prompts</th>
                  <th className="py-2 pr-3 font-medium">Sessions</th>
                  <th className="py-2 font-medium">Events</th>
                </tr>
              </thead>
              <tbody>
                {data.leaderboard.map((row) => (
                  <tr
                    key={row.user_email}
                    className="border-b border-slate-100 text-slate-800"
                  >
                    <td className="py-2.5 pr-3 font-medium">{row.user_email}</td>
                    <td className="py-2.5 pr-3">{formatNumber(row.prompts)}</td>
                    <td className="py-2.5 pr-3">{formatNumber(row.sessions)}</td>
                    <td className="py-2.5">{formatNumber(row.events)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </AppShell>
  );
}
