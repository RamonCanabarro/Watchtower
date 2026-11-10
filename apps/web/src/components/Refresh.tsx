"use client";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function Refresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible")
        startTransition(() => router.refresh());
    }, 15000);
    return () => clearInterval(timer);
  }, [router]);
  return (
    <button
      onClick={() => startTransition(() => router.refresh())}
      disabled={pending}
      className="rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-50"
    >
      {pending ? "Atualizando…" : "Atualizar agora"}
    </button>
  );
}
