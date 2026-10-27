import { connection } from "next/server";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/Panel";
import { getGrafanaUrl, getRoiAssumptions } from "@/lib/config";
import { formatUsd } from "@/lib/format";
import { getFreshness } from "@/lib/queries/overview";
import { resolveRange, type PageSearchParams } from "@/lib/searchParams";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  await connection();
  await resolveRange(searchParams);
  const assumptions = getRoiAssumptions();
  const freshness = await getFreshness();

  return (
    <AppShell
      title="Settings & assumptions"
      subtitle="ROI model inputs and data source notes"
      lastReceivedAt={freshness.lastReceivedAt}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="ROI assumptions (from environment)">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-100 py-2">
              <dt className="text-slate-500">AVG_HOURS_SAVED_PER_SESSION</dt>
              <dd className="font-semibold text-slate-900">
                {assumptions.avgHoursSavedPerSession}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-500">HOURLY_ENGINEER_COST_USD</dt>
              <dd className="font-semibold text-slate-900">
                {formatUsd(assumptions.hourlyEngineerCostUsd, 0)}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            Set these in the root <code>.env</code> (or compose environment) and
            recreate the <code>analytics</code> container to apply.
          </p>
        </Panel>

        <Panel title="Formulas">
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>
              <strong>Estimated hours saved</strong> = sessions × hours/session
            </li>
            <li>
              <strong>Estimated value</strong> = hours × hourly engineer cost
            </li>
            <li>
              <strong>ROI multiple</strong> = estimated value ÷ API spend
            </li>
            <li>
              Sessions prefer Postgres distinct <code>session_id</code>, falling
              back to Prometheus session counters.
            </li>
            <li>
              Spend and tokens always come from Prometheus cost/token counters.
            </li>
          </ul>
        </Panel>

        <Panel title="Data sources">
          <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
            <li>
              <strong>PostgreSQL</strong> — prompts, users, tools, daily usage
            </li>
            <li>
              <strong>Prometheus</strong> — cost USD, tokens, session/commit/PR
              metrics
            </li>
            <li>
              <strong>Grafana</strong> — ops dashboards, Loki logs, Tempo traces:{" "}
              <a
                className="text-teal-700 underline"
                href={getGrafanaUrl()}
                target="_blank"
                rel="noreferrer"
              >
                {getGrafanaUrl()}
              </a>
            </li>
          </ul>
        </Panel>

        <Panel title="Privacy">
          <p className="text-sm text-slate-600">
            This app can display prompt text when{" "}
            <code>OTEL_LOG_USER_PROMPTS=1</code> is enabled. Keep the stack on
            localhost; treat Docker volumes and this UI as sensitive. See{" "}
            <code>SECURITY.md</code> in the repository root.
          </p>
        </Panel>
      </div>
    </AppShell>
  );
}
