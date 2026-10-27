import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { KpiCard } from "@/components/KpiCard";
import { Panel } from "@/components/Panel";
import { TimeSeriesArea } from "@/components/Charts";
import {
  formatHours,
  formatMultiple,
  formatNumber,
  formatUsd,
} from "@/lib/format";
import { getOverview } from "@/lib/queries/overview";
import { resolveRange, type PageSearchParams } from "@/lib/searchParams";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  await connection();
  const { range } = await resolveRange(searchParams);
  const data = await getOverview(range);
  const empty = data.eventCount === 0 && data.costUsd === 0;

  return (
    <AppShell
      title="Executive Overview"
      subtitle={`Estimated ROI and usage for the last ${range.label === "custom" ? "custom range" : range.label}`}
      lastReceivedAt={data.lastReceivedAt}
    >
      {empty ? <EmptyState /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Spend"
          value={formatUsd(data.costUsd)}
          hint="Claude Code API cost (Prometheus)"
          accent="teal"
        />
        <KpiCard
          label="Est. value"
          value={formatUsd(data.roi.estimatedValueUsd)}
          hint={`${formatHours(data.roi.estimatedHoursSaved)} saved`}
          accent="amber"
        />
        <KpiCard
          label="ROI multiple"
          value={formatMultiple(data.roi.roiMultiple)}
          hint="Est. value ÷ spend"
          accent="teal"
        />
        <KpiCard
          label="Active users"
          value={formatNumber(data.activeUsers)}
          hint={`${formatNumber(data.sessionsPg)} sessions · ${formatNumber(data.prompts)} prompts`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Cost over time"
          description="Hourly cost increase from Prometheus counters"
        >
          <TimeSeriesArea data={data.costTrend} format="usd4" />
        </Panel>
        <Panel
          title="Sessions over time"
          description="Session count increase from Prometheus"
        >
          <TimeSeriesArea data={data.sessionTrend} color="#0369a1" format="number" />
        </Panel>
      </div>

      <Panel
        title="How ROI is estimated"
        description="Configurable assumptions — change via environment variables (see Settings)"
      >
        <p className="text-sm text-slate-600">
          Estimated hours saved = sessions ×{" "}
          <strong>{data.roi.assumptions.avgHoursSavedPerSession}</strong> h/session.
          Estimated value = hours ×{" "}
          <strong>
            {formatUsd(data.roi.assumptions.hourlyEngineerCostUsd, 0)}
          </strong>
          /h. This is a leadership heuristic, not a measured productivity study.
        </p>
      </Panel>
    </AppShell>
  );
}
