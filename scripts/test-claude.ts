import { runRanking } from "../lib/claude";

const PROMPT = process.env.RANKING_PROMPT ?? "best javascript spreadsheet 2026";

async function main() {
  console.log(`Running prompt: "${PROMPT}"`);
  console.log(`Model: ${process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6"}`);
  console.log("Calling Claude (with + without web search in parallel)...\n");

  const result = await runRanking(PROMPT);

  for (const variant of ["with_web_search", "without_web_search"] as const) {
    const data = result[variant];
    console.log(`=== ${variant} ===`);
    console.log(`  durationMs: ${data.durationMs}`);
    console.log(`  usage:      input=${data.usage.inputTokens} output=${data.usage.outputTokens}`);
    if (data.parseError) console.log(`  parseError: ${data.parseError}`);
    console.log(`  products:   ${data.parsed?.products.length ?? 0}`);
    data.parsed?.products.forEach((p) => {
      const co = p.company ? ` (${p.company})` : "";
      const url = p.url ? ` — ${p.url}` : "";
      console.log(`    ${String(p.rank).padStart(2)}. ${p.name}${co}${url}`);
    });
    console.log();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
