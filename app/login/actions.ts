"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getIronSession } from "iron-session";
import { timingSafeEqual } from "node:crypto";
import { sessionOptions, type SessionData } from "@/lib/session";

export type LoginState = { error: string | null };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  const expected = process.env.APP_PASSWORD ?? "";
  if (!expected) {
    return { error: "APP_PASSWORD não configurado no servidor." };
  }

  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  const match = a.length === b.length && timingSafeEqual(a, b);
  if (!match) {
    return { error: "Senha incorreta." };
  }

  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  session.authenticated = true;
  await session.save();

  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}
