import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { KpiCard } from "@/components/KpiCard";
import { Panel } from "@/components/Panel";
import {
  DonutChart,
  HorizontalBars,
  TimeSeriesArea,
} from "@/components/Charts";
import { formatNumber, formatUsd } from "@/lib/format";
import { getFreshness } from "@/lib/queries/overview";
import { getCosts } from "@/lib/queries/costs";
import { resolveRange, type PageSearchParams } from "@/lib/searchParams";

export default async function CostsPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  await connection();
  const { range } = await resolveRange(searchParams);
  const [data, freshness] = await Promise.all([
    getCosts(range),
    getFreshness(),
  ]);
  const empty = data.totalCostUsd === 0 && data.tokensByType.length === 0;

  return (
    <AppShell
      title="Costs & Tokens"
      subtitle="Spend, model mix, and token composition"
      lastReceivedAt={freshness.lastReceivedAt}
    >
      {empty ? (
        <EmptyState title="No cost metrics yet">
          <p>
            Cost and token counters come from Prometheus after Claude Code
            exports OTLP metrics. Run a few sessions, then refresh.
          </p>
        </EmptyState>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total spend"
          value={formatUsd(data.totalCostUsd)}
          accent="teal"
        />
        <KpiCard
          label="Cost / session"
          value={
            data.costPerSession != null ? formatUsd(data.costPerSession) : "—"
          }
        />
        <KpiCard
          label="Cost / active user"
          value={data.costPerUser != null ? formatUsd(data.costPerUser) : "—"}
        />
        <KpiCard
          label="Sessions"
          value={formatNumber(data.sessions)}
          hint={`${formatNumber(data.activeUsers)} active users`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Cost over time">
          <TimeSeriesArea data={data.costOverTime} format="usd4" />
        </Panel>
        <Panel title="Cost by model">
          <HorizontalBars
            data={data.costByModel.map((d) => ({
              model: d.model,
              value: d.value,
            }))}
            nameKey="model"
            valueKey="value"
            format="usd"
          />
        </Panel>
        <Panel title="Tokens by type">
          <DonutChart
            data={data.tokensByType.map((d) => ({
              type: d.type,
              value: d.value,
            }))}
            nameKey="type"
            valueKey="value"
            format="number"
          />
        </Panel>
        <Panel
          title="Subscription vs API heuristic"
          description="Extrapolates selected-range spend to ~30 days vs seat list prices"
        >
          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex justify-between border-b border-slate-100 py-2">
              <span>Est. monthly API spend</span>
              <strong>{formatUsd(data.subscriptionCompare.monthlySpend)}</strong>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-2">
              <span>
                Claude Pro × {data.subscriptionCompare.activeUsers} seats
              </span>
              <span>{formatUsd(data.subscriptionCompare.proSeats, 0)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 py-2">
              <span>
                Max 5× × {data.subscriptionCompare.activeUsers} seats
              </span>
              <span>{formatUsd(data.subscriptionCompare.max5xSeats, 0)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span>
                Max 20× × {data.subscriptionCompare.activeUsers} seats
              </span>
              <span>{formatUsd(data.subscriptionCompare.max20xSeats, 0)}</span>
            </div>
            <p className="text-xs text-slate-500">
              Seat prices are illustrative ($20 / $100 / $200). Compare against
              your org&apos;s actual contracts.
            </p>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
