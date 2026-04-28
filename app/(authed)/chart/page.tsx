import { listRuns } from "@/lib/storage";
import { buildBumpData } from "@/lib/chart";
import { BumpChart } from "@/components/BumpChart";

export const dynamic = "force-dynamic";

export default async function ChartPage() {
  const runs = await listRuns();
  const highlight = process.env.HIGHLIGHTED_BRAND ?? "Jspreadsheet";
  const withWeb = buildBumpData(runs, "with_web_search");
  const withoutWeb = buildBumpData(runs, "without_web_search");

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Bump chart</h1>
        <p className="text-sm opacity-70 mt-1">
          Posição de cada produto ao longo das semanas. <strong>{highlight}</strong> em destaque.
        </p>
      </header>

      {runs.length === 0 ? (
        <div className="border border-dashed border-neutral-800 rounded p-8 text-center text-sm opacity-70">
          Nenhuma run ainda. Volte para a lista e aperte <strong>Rodar agora</strong>.
        </div>
      ) : (
        <div className="space-y-12">
          <section>
            <h2 className="text-xs uppercase tracking-wide opacity-60 mb-3">
              Com web search
            </h2>
            <BumpChart data={withWeb} highlight={highlight} />
          </section>
          <section>
            <h2 className="text-xs uppercase tracking-wide opacity-60 mb-3">
              Sem web search
            </h2>
            <BumpChart data={withoutWeb} highlight={highlight} />
          </section>
        </div>
      )}
    </div>
  );
}
