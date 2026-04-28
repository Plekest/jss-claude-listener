import type { SessionOptions } from "iron-session";

export type SessionData = {
  authenticated?: boolean;
};

export const sessionOptions: SessionOptions = {
  cookieName: "jss_session",
  password: process.env.SESSION_SECRET ?? "",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  },
};

export function isSessionAuthenticated(data: SessionData | null | undefined): boolean {
  return !!data && data.authenticated === true;
}
