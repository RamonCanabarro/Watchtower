"use client";
import { useActionState } from "react";
import Link from "next/link";
import { login, register } from "@/app/auth-actions";
export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const registering = mode === "register";
  const [state, action, pending] = useActionState(
    registering ? register : login,
    { message: "", success: false },
  );
  const input =
    "mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-slate-100";
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">
      <div className="w-full max-w-md">
        <p className="text-sm font-semibold tracking-widest text-emerald-300">
          WATCHTOWER
        </p>
        <h1 className="mt-4 text-3xl font-bold">
          {registering ? "Criar sua conta" : "Entrar na sua conta"}
        </h1>
        <p className="mt-3 text-slate-400">
          Acompanhe suas aplicações e consulte o histórico dos seus monitores.
        </p>
        <form
          action={action}
          className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6"
        >
          <fieldset disabled={pending} className="grid gap-5">
            <legend className="sr-only">Dados de acesso</legend>
            <label>
              E-mail
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
                maxLength={254}
                className={input}
              />
            </label>
            <label>
              Senha
              <input
                name="password"
                type="password"
                autoComplete={registering ? "new-password" : "current-password"}
                required
                minLength={registering ? 6 : 1}
                maxLength={128}
                className={input}
              />
            </label>
            {registering && (
              <>
                <p className="text-sm text-slate-400">
                  Use pelo menos 6 caracteres.
                </p>
                <label>
                  Confirmar senha
                  <input
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    maxLength={128}
                    className={input}
                  />
                </label>
              </>
            )}
            <button
              className="rounded-lg bg-emerald-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50"
              disabled={pending}
            >
              {pending ? "Aguarde…" : registering ? "Criar conta" : "Entrar"}
            </button>
          </fieldset>
          <p aria-live="polite" className="mt-4 text-sm text-red-300">
            {state.message}
          </p>
        </form>
        <p className="mt-6 text-sm text-slate-400">
          {registering ? "Já tem uma conta? " : "Ainda não tem uma conta? "}
          <Link
            className="text-emerald-300 underline"
            href={registering ? "/login" : "/register"}
          >
            {registering ? "Entrar" : "Criar conta"}
          </Link>
        </p>
      </div>
    </main>
  );
}
