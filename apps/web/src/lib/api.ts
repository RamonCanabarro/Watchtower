import { cookies } from "next/headers";
export const SESSION_COOKIE = "watchtower_session";
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (authenticated) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token) throw new ApiError(401, "Entre na sua conta.");
    headers.set("Authorization", `Bearer ${token}`);
  }
  const apiUrl = process.env.WATCHTOWER_API_URL ?? "http://localhost:3001";
  const response = await fetch(new URL(path, apiUrl), {
    ...options,
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
    headers,
  });
  if (!response.ok) {
    if (response.status === 400) {
      const body: { message?: string | string[] } = await response.json();
      throw new ApiError(
        response.status,
        Array.isArray(body.message)
          ? body.message.join(" · ")
          : (body.message ?? "Dados inválidos."),
      );
    }
    throw new ApiError(
      response.status,
      `Não foi possível concluir a operação (HTTP ${response.status}).`,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
