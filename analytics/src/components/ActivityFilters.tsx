"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

export function ActivityFilters({
  users,
  services,
}: {
  users: string[];
  services: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function update(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        update({ q });
      }}
    >
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
        Search prompts
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Contains…"
          className="w-56 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
        User
        <select
          defaultValue={searchParams.get("user") ?? ""}
          onChange={(e) => update({ user: e.target.value || null })}
          className="w-48 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
        >
          <option value="">All users</option>
          {users.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
        Service
        <select
          defaultValue={searchParams.get("service") ?? ""}
          onChange={(e) => update({ service: e.target.value || null })}
          className="w-48 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
        >
          <option value="">All services</option>
          {services.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Loading…" : "Apply"}
      </button>
    </form>
  );
}
