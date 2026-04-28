import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";

export const runtime = "nodejs";

async function handler(request: NextRequest) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.destroy();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}

export const GET = handler;
export const POST = handler;
