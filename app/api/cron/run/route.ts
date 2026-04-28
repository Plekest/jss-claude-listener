import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";
import { executeRun } from "@/lib/run";

export const maxDuration = 60;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handler(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expectedBearer = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
  const isCron = expectedBearer !== null && auth === expectedBearer;

  let isManual = false;
  if (!isCron) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    isManual = session.authenticated === true;
  }

  if (!isCron && !isManual) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const record = await executeRun(isCron ? "cron" : "manual");
  return NextResponse.json({ id: record.id, weekIso: record.weekIso });
}

export const GET = handler;
export const POST = handler;
