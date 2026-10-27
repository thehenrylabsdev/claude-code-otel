import { connection } from "next/server";
import { NextResponse } from "next/server";
import { checkPostgres } from "@/lib/db";
import { checkPrometheus } from "@/lib/prometheus";

export async function GET() {
  await connection();
  const [postgres, prometheus] = await Promise.all([
    checkPostgres(),
    checkPrometheus(),
  ]);

  const ok = postgres.ok && prometheus.ok;
  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      postgres,
      prometheus,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
