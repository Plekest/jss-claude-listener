"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { executeRun } from "@/lib/run";

export type RunNowResult =
  | { ok: true; id: string; weekIso: string }
  | { ok: false; error: string };

export async function runNowAction(): Promise<RunNowResult> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.authenticated) {
    return { ok: false, error: "Unauthorized" };
  }

  try {
    const record = await executeRun("manual");
    revalidatePath("/");
    return { ok: true, id: record.id, weekIso: record.weekIso };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
