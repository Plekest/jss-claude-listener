import type { VariantResult } from "@/lib/types";

export function VariantPanel({
  title,
  variant,
  highlight,
}: {
  title: string;
  variant: VariantResult;
  highlight: string;
}) {
  const hl = highlight.toLowerCase();
  return (
    <section className="border border-neutral-800 rounded p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        <span className="text-xs opacity-60 font-mono">{variant.model}</span>
      </div>
      <div className="text-xs opacity-60 mt-1">
        {Math.round(variant.durationMs / 100) / 10}s · in={variant.usage.inputTokens} · out=
        {variant.usage.outputTokens}
      </div>

      {variant.parseError ? (
        <p className="text-red-400 mt-4 text-sm break-words">
          parseError: {variant.parseError}
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {variant.parsed?.products.map((p) => {
            const isHighlight = p.name.toLowerCase().includes(hl);
            return (
              <li
                key={`${p.rank}-${p.name}`}
                className={`flex gap-3 ${isHighlight ? "bg-orange-500/10 -mx-2 px-2 py-1 rounded" : ""}`}
              >
                <span className="font-mono opacity-50 shrink-0 w-6 text-right">
                  {p.rank}
                </span>
                <div className="min-w-0">
                  <div className="text-sm">
                    {p.url ? (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline decoration-neutral-700 hover:decoration-neutral-400"
                      >
                        <strong className={isHighlight ? "text-orange-400" : ""}>{p.name}</strong>
                      </a>
                    ) : (
                      <strong className={isHighlight ? "text-orange-400" : ""}>{p.name}</strong>
                    )}
                    {p.company && <span className="opacity-60"> — {p.company}</span>}
                  </div>
                  <div className="text-xs opacity-70 mt-1">{p.justification}</div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-xs opacity-60 hover:opacity-100">
          Raw response
        </summary>
        <pre className="mt-2 text-xs overflow-x-auto bg-neutral-950 border border-neutral-900 p-3 rounded max-h-96">
          {JSON.stringify(variant.rawResponse, null, 2)}
        </pre>
      </details>
    </section>
  );
}
