"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/login/actions";

const INITIAL: LoginState = { error: null };

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4 w-full max-w-sm">
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="opacity-70">Senha</span>
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          className="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 outline-none focus:border-orange-500"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="bg-orange-500 text-black font-medium rounded px-4 py-2 disabled:opacity-50"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
      {state.error && <p className="text-red-400 text-sm">{state.error}</p>}
    </form>
  );
}
