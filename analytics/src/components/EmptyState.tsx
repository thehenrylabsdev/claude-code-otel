export function EmptyState({
  title = "No telemetry yet",
  children,
}: {
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
      <p className="text-base font-medium text-slate-800">{title}</p>
      <div className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
        {children ?? (
          <p>
            Start Claude Code with OTel enabled, or run{" "}
            <code className="rounded bg-slate-200 px-1 py-0.5 text-xs">
              ./scripts/smoke-test.sh
            </code>{" "}
            to seed a sample prompt. Raw metrics also appear in Grafana at{" "}
            <a
              className="text-teal-700 underline"
              href="http://localhost:3000"
              target="_blank"
              rel="noreferrer"
            >
              localhost:3000
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
}
