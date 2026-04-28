import { runRanking } from "./claude";
import { saveRun } from "./storage";
import { toIsoWeek } from "./week";
import type { RunRecord } from "./types";

const DEFAULT_PROMPT = "best javascript spreadsheet 2026";

export async function executeRun(trigger: RunRecord["trigger"]): Promise<RunRecord> {
  const prompt = process.env.RANKING_PROMPT ?? DEFAULT_PROMPT;
  const now = new Date();
  const variants = await runRanking(prompt);

  const record: RunRecord = {
    id: now.toISOString(),
    runAt: now.toISOString(),
    weekIso: toIsoWeek(now),
    prompt,
    trigger,
    variants,
  };

  await saveRun(record);
  return record;
}
