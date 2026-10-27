import { parseRange, type DateRange } from "./range";

export type PageSearchParams = Promise<{
  range?: string;
  from?: string;
  to?: string;
  q?: string;
  user?: string;
  service?: string;
}>;

export async function resolveRange(
  searchParams: PageSearchParams,
): Promise<{ range: DateRange; raw: Awaited<PageSearchParams> }> {
  const raw = await searchParams;
  return {
    range: parseRange(raw.range, raw.from, raw.to),
    raw,
  };
}
