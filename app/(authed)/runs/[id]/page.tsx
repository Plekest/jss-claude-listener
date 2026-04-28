import { notFound } from "next/navigation";
import Link from "next/link";
import { getRun } from "@/lib/storage";
import { VariantPanel } from "@/components/VariantPanel";

export const dynamic = "force-dynamic";

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const run = await getRun(id);
  if (!run) notFound();

  const highlight = process.env.HIGHLIGHTED_BRAND ?? "Jspreadsheet";
  const totalIn =
    run.variants.with_web_search.usage.inputTokens +
    run.variants.without_web_search.usage.inputTokens;
  const totalOut =
    run.variants.with_web_search.usage.outputTokens +
    run.variants.without_web_search.usage.outputTokens;

  return (
    <div>
      <Link href="/" className="text-xs opacity-60 hover:opacity-100">
        ← voltar
      </Link>

      <header className="mt-2 mb-6">
        <h1 className="text-xl font-semibold">{run.weekIso}</h1>
        <div className="text-xs opacity-70 mt-1 font-mono">{run.runAt}</div>
        <div className="text-xs opacity-70 mt-1">
          trigger: <span className="font-mono">{run.trigger}</span> · prompt:{" "}
          <code className="opacity-90">&quot;{run.prompt}&quot;</code> · total tokens: in={totalIn} out=
          {totalOut}
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <VariantPanel
          title="Com web search"
          variant={run.variants.with_web_search}
          highlight={highlight}
        />
        <VariantPanel
          title="Sem web search"
          variant={run.variants.without_web_search}
          highlight={highlight}
        />
      </div>
    </div>
  );
}
