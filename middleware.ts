import { NextRequest, NextResponse } from "next/server";
import { unsealData } from "iron-session";
import { sessionOptions, type SessionData } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const cookie = request.cookies.get(sessionOptions.cookieName)?.value;

  let authenticated = false;
  if (cookie && sessionOptions.password) {
    try {
      const data = await unsealData<SessionData>(cookie, {
        password: sessionOptions.password,
      });
      authenticated = data.authenticated === true;
    } catch {
      authenticated = false;
    }
  }

  if (authenticated) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  const target = request.nextUrl.pathname + request.nextUrl.search;
  if (target && target !== "/") loginUrl.searchParams.set("next", target);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!login|api/cron/run|_next/static|_next/image|favicon).*)"],
};
