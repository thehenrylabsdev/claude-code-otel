export function KpiCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "teal" | "amber" | "slate" | "rose";
}) {
  const ring =
    accent === "teal"
      ? "border-teal-200 bg-teal-50/60"
      : accent === "amber"
        ? "border-amber-200 bg-amber-50/60"
        : accent === "rose"
          ? "border-rose-200 bg-rose-50/50"
          : "border-slate-200 bg-white";

  return (
    <div className={`rounded-xl border px-4 py-4 shadow-sm ${ring}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
