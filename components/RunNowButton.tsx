"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runNowAction } from "@/app/(authed)/actions";

export function RunNowButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const router = useRouter();

  const onClick = () => {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await runNowAction();
        if (result.ok) {
          setMessage({ kind: "ok", text: `Run ${result.weekIso} criada.` });
          router.refresh();
        } else {
          setMessage({ kind: "err", text: result.error });
        }
      } catch (err) {
        const text =
          err instanceof Error
            ? err.message.includes("timed out")
              ? "Função excedeu 60s na Vercel Hobby. Reduza o trabalho ou suba pro Pro."
              : err.message
            : "Erro desconhecido";
        setMessage({ kind: "err", text });
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={onClick}
        disabled={pending}
        className="bg-orange-500 text-black font-medium rounded px-4 py-2 disabled:opacity-50 cursor-pointer"
      >
        {pending ? "Rodando... (~30-90s)" : "Rodar agora"}
      </button>
      {message && (
        <p
          className={`text-xs ${
            message.kind === "ok" ? "text-green-400" : "text-red-400"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
