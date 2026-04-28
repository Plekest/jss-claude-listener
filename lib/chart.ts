import type { RunRecord, VariantId } from "./types";

export type BumpPointData = {
  x: string;
  y: number | null;
  justification: string | null;
  company: string | null;
  url: string | null;
};

export type BumpSerie = {
  id: string;
  data: BumpPointData[];
};

export function buildBumpData(runs: RunRecord[], variant: VariantId): BumpSerie[] {
  const weekToRun = new Map<string, RunRecord>();
  for (const r of runs) {
    const existing = weekToRun.get(r.weekIso);
    if (!existing || r.runAt > existing.runAt) {
      weekToRun.set(r.weekIso, r);
    }
  }

  const weeks = [...weekToRun.keys()].sort();

  type WeekEntry = {
    week: string;
    products: Map<string, { rank: number; justification: string; company?: string; url?: string }>;
  };
  const weekEntries: WeekEntry[] = weeks.map((week) => {
    const run = weekToRun.get(week)!;
    const variantData = run.variants[variant];
    const products = new Map<string, { rank: number; justification: string; company?: string; url?: string }>();
    if (variantData.parsed) {
      for (const p of variantData.parsed.products) {
        const key = normalize(p.name);
        if (!products.has(key)) {
          products.set(key, {
            rank: p.rank,
            justification: p.justification,
            company: p.company,
            url: p.url,
          });
        }
      }
    }
    return { week, products };
  });

  const canonicalNames = new Map<string, string>();
  for (const r of runs) {
    const variantData = r.variants[variant];
    if (!variantData.parsed) continue;
    for (const p of variantData.parsed.products) {
      const key = normalize(p.name);
      if (!canonicalNames.has(key)) canonicalNames.set(key, p.name);
    }
  }

  const allKeys = new Set<string>();
  for (const wp of weekEntries) {
    for (const k of wp.products.keys()) allKeys.add(k);
  }

  return [...allKeys].map((key) => ({
    id: canonicalNames.get(key) ?? key,
    data: weekEntries.map((wp) => {
      const entry = wp.products.get(key);
      return {
        x: wp.week,
        y: entry?.rank ?? null,
        justification: entry?.justification ?? null,
        company: entry?.company ?? null,
        url: entry?.url ?? null,
      };
    }),
  }));
}

function normalize(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}
