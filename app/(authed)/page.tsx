import Link from "next/link";
import { listRuns } from "@/lib/storage";
import { RunNowButton } from "@/components/RunNowButton";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function RunsListPage() {
  const runs = await listRuns();
  const highlight = (process.env.HIGHLIGHTED_BRAND ?? "Jspreadsheet").toLowerCase();

  return (
    <div>
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Runs</h1>
          <p className="text-sm opacity-70 mt-1">
            Prompt: <code className="opacity-90">{process.env.RANKING_PROMPT ?? "best javascript spreadsheet 2026"}</code>
          </p>
        </div>
        <RunNowButton />
      </div>

      {runs.length === 0 ? (
        <div className="border border-dashed border-neutral-800 rounded p-8 text-center text-sm opacity-70">
          Nenhuma run ainda. Aperte <strong>Rodar agora</strong> para criar a primeira.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-neutral-800 text-xs uppercase tracking-wide opacity-60">
              <th className="py-2 pr-4 font-normal">Data</th>
              <th className="py-2 pr-4 font-normal">Semana</th>
              <th className="py-2 pr-4 font-normal">Trigger</th>
              <th className="py-2 pr-4 font-normal">Com web</th>
              <th className="py-2 pr-4 font-normal">Sem web</th>
              <th className="py-2 pr-4 font-normal">{`Posição ${highlight}`}</th>
              <th className="py-2 pr-4 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => {
              const withWebRank = findRank(r.variants.with_web_search.parsed?.products, highlight);
              const noWebRank = findRank(r.variants.without_web_search.parsed?.products, highlight);
              return (
                <tr key={r.id} className="border-b border-neutral-900">
                  <td className="py-3 pr-4 font-mono text-xs">
                    {new Date(r.runAt).toLocaleString("pt-BR", { hour12: false })}
                  </td>
                  <td className="py-3 pr-4">{r.weekIso}</td>
                  <td className="py-3 pr-4 opacity-70">{r.trigger}</td>
                  <td className="py-3 pr-4">{r.variants.with_web_search.parsed?.products.length ?? "—"}</td>
                  <td className="py-3 pr-4">{r.variants.without_web_search.parsed?.products.length ?? "—"}</td>
                  <td className="py-3 pr-4 font-mono">
                    <span className="opacity-90">{withWebRank ?? "—"}</span>
                    <span className="opacity-40"> / </span>
                    <span className="opacity-90">{noWebRank ?? "—"}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/runs/${encodeURIComponent(r.id)}`}
                      className="underline opacity-70 hover:opacity-100"
                    >
                      detalhe →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function findRank(
  products: Array<{ rank: number; name: string }> | undefined,
  brandLower: string,
): number | null {
  if (!products) return null;
  const found = products.find((p) => p.name.toLowerCase().includes(brandLower));
  return found ? found.rank : null;
}
