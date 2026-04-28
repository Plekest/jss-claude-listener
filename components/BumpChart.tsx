"use client";

import { ResponsiveBump } from "@nivo/bump";
import type { BumpSerie } from "@/lib/chart";

const HIGHLIGHT_COLOR = "#f97316";
const PALETTE = [
  "#737373",
  "#525252",
  "#a3a3a3",
  "#404040",
  "#8b5cf6",
  "#06b6d4",
  "#22c55e",
  "#eab308",
  "#ec4899",
  "#3b82f6",
];

function colorFor(id: string, hl: string): string {
  if (id.toLowerCase().includes(hl)) return HIGHLIGHT_COLOR;
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function BumpChart({ data, highlight }: { data: BumpSerie[]; highlight: string }) {
  const hl = highlight.toLowerCase();

  if (data.length === 0) {
    return <p className="opacity-60 text-sm">Sem dados para essa variante.</p>;
  }

  const maxRank = Math.max(
    ...data.flatMap((s) => s.data.map((d) => d.y).filter((y): y is number => y !== null)),
  );

  const height = Math.max(360, data.length * 28 + 120);

  return (
    <div style={{ height }}>
      <ResponsiveBump
        data={data}
        margin={{ top: 32, right: 160, bottom: 48, left: 56 }}
        colors={(serie) => colorFor(serie.id, hl)}
        lineWidth={3}
        activeLineWidth={5}
        inactiveLineWidth={2}
        opacity={0.9}
        activeOpacity={1}
        inactiveOpacity={0.2}
        pointSize={10}
        activePointSize={14}
        inactivePointSize={6}
        pointBorderWidth={2}
        pointBorderColor={{ from: "serie.color" }}
        pointColor={{ theme: "background" }}
        startLabel={(serie) => serie.id}
        endLabel={(serie) => serie.id}
        startLabelTextColor={{ from: "color" }}
        endLabelTextColor={{ from: "color" }}
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 4,
          tickPadding: 6,
          tickRotation: 0,
        }}
        axisLeft={{
          tickSize: 4,
          tickPadding: 6,
          tickValues: Array.from({ length: maxRank }, (_, i) => i + 1),
        }}
        pointTooltip={({ point }) => {
          const datum = point.data as BumpSerie["data"][number];
          return (
            <div className="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-xs max-w-xs shadow-xl">
              <div className="font-semibold text-sm">{point.serie.id}</div>
              <div className="opacity-70 mt-0.5">
                {datum.x} · posição <span className="font-mono">{datum.y ?? "—"}</span>
              </div>
              {datum.company && <div className="opacity-70 mt-0.5">{datum.company}</div>}
              {datum.justification && (
                <div className="mt-1.5 leading-snug">{datum.justification}</div>
              )}
            </div>
          );
        }}
        theme={{
          background: "transparent",
          text: { fill: "#ededed", fontSize: 11 },
          axis: {
            ticks: { text: { fill: "#a3a3a3", fontSize: 10 } },
            domain: { line: { stroke: "#262626" } },
          },
          grid: { line: { stroke: "#262626" } },
          tooltip: { container: { background: "transparent", padding: 0, boxShadow: "none" } },
        }}
      />
    </div>
  );
}
