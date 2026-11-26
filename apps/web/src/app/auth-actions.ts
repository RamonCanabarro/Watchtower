"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { apiRequest, ApiError, SESSION_COOKIE } from "@/lib/api";
import type { FormState } from "./actions";
type LoginResult = {
  user: { id: string; email: string };
  token: string;
  expiresAt: string;
};

async function authenticate(path: string, data: FormData): Promise<FormState> {
  const email = data.get("email");
  const password = data.get("password");
  if (
    typeof email !== "string" ||
    !email.trim() ||
    email.length > 254 ||
    typeof password !== "string" ||
    !password ||
    password.length > 128
  ) {
    return {
      message: "Informe um e-mail e uma senha válidos.",
      success: false,
    };
  }
  if (
    path === "/auth/register" &&
    (password.length < 6 || data.get("confirmPassword") !== password)
  ) {
    return {
      message:
        "Use uma senha com pelo menos 6 caracteres e confirme a mesma senha.",
      success: false,
    };
  }
  let result: LoginResult;
  try {
    result = await apiRequest<LoginResult>(
      path,
      {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      },
      false,
    );
  } catch (error) {
    const message =
      error instanceof ApiError && error.status === 429
        ? "Muitas tentativas. Aguarde um minuto."
        : error instanceof ApiError && error.status === 401
          ? "E-mail ou senha inválidos."
          : path === "/auth/register"
            ? "Não foi possível criar a conta. Confira os dados ou tente entrar."
            : "Não foi possível entrar. Confira se a API está disponível.";
    return { message, success: false };
  }
  (await cookies()).set(SESSION_COOKIE, result.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(result.expiresAt),
  });
  redirect("/");
}
export async function login(
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  void _previous;
  return authenticate("/auth/login", data);
}
export async function register(
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  void _previous;
  return authenticate("/auth/register", data);
}
export async function logout() {
  try {
    await apiRequest<void>("/auth/logout", { method: "POST" });
  } catch {
    /* Clear the local session even if the API is unavailable. */
  }
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
