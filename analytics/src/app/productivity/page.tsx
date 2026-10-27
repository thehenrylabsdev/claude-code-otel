import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { KpiCard } from "@/components/KpiCard";
import { Panel } from "@/components/Panel";
import { DonutChart, HorizontalBars } from "@/components/Charts";
import { formatNumber } from "@/lib/format";
import { getFreshness } from "@/lib/queries/overview";
import { getProductivity } from "@/lib/queries/productivity";
import { resolveRange, type PageSearchParams } from "@/lib/searchParams";

export default async function ProductivityPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  await connection();
  const { range } = await resolveRange(searchParams);
  const [data, freshness] = await Promise.all([
    getProductivity(range),
    getFreshness(),
  ]);
  const empty =
    data.prompts === 0 &&
    data.toolMix.length === 0 &&
    data.commits === 0 &&
    data.pullRequests === 0;

  return (
    <AppShell
      title="Productivity signals"
      subtitle="Tool usage, edit decisions, and Git-linked counters when available"
      lastReceivedAt={freshness.lastReceivedAt}
    >
      {empty ? <EmptyState /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Prompts / session"
          value={
            data.promptsPerSession != null
              ? formatNumber(data.promptsPerSession, 1)
              : "—"
          }
          hint={`${formatNumber(data.prompts)} prompts · ${formatNumber(data.sessions)} sessions`}
          accent="teal"
        />
        <KpiCard label="Commits" value={formatNumber(data.commits)} />
        <KpiCard label="Pull requests" value={formatNumber(data.pullRequests)} />
        <KpiCard
          label="LOC Δ"
          value={`+${formatNumber(data.linesAdded)} / −${formatNumber(data.linesRemoved)}`}
          hint="From lines_of_code metric when present"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Tool mix" description="From Postgres tool events">
          <HorizontalBars
            data={data.toolMix.map((t) => ({
              tool: t.tool_name,
              count: t.count,
            }))}
            nameKey="tool"
            valueKey="count"
          />
        </Panel>
        <Panel title="Tool decisions (logs)">
          <DonutChart
            data={data.toolDecisions.map((d) => ({
              decision: d.decision,
              count: d.count,
            }))}
            nameKey="decision"
            valueKey="count"
          />
        </Panel>
        <Panel
          title="Code edit tool decisions (metrics)"
          description="Prometheus code_edit_tool.decision when exported"
        >
          {data.codeEditDecisions.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No code_edit_tool metrics in this range
            </p>
          ) : (
            <DonutChart
              data={data.codeEditDecisions.map((d) => ({
                decision: d.decision,
                value: d.value,
              }))}
              nameKey="decision"
              valueKey="value"
            />
          )}
        </Panel>
        <Panel title="Notes">
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>
              Commit / PR / LOC counters appear only when Claude Code emits those
              metrics for the session.
            </li>
            <li>
              Tool accept/reject rates are a proxy for developer confidence — not
              a quality score.
            </li>
            <li>
              For ops-level traces and logs, use Grafana on port 3000.
            </li>
          </ul>
        </Panel>
      </div>
    </AppShell>
  );
}
