export type Check = {
  id: string;
  checkedAt: string;
  checkedUrl: string | null;
  status: "ONLINE" | "OFFLINE" | "TIMEOUT" | "ERROR";
  httpStatus: number | null;
  responseTime: number;
  error: string | null;
};
export type Monitor = {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  interval: number;
  timeout: number;
  createdAt: string;
  checks: Check[];
};
export type Summary = {
  monitor: Monitor;
  total: number;
  successful: number;
  uptime: number | null;
  averageResponseTime: number | null;
  windowHours: number;
};

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
): Promise<T> {
  const apiUrl = process.env.WATCHTOWER_API_URL ?? "http://localhost:3001";
  const response = await fetch(new URL(path, apiUrl), {
    ...options,
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
    headers: { "Content-Type": "application/json", ...options.headers },
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
export function latestCheckForCurrentUrl(monitor: Monitor): Check | undefined {
  const latest = monitor.checks[0];
  // Legacy results have no recorded URL and cannot establish this target's status.
  return latest?.checkedUrl === monitor.url ? latest : undefined;
}
export function getMonitors() {
  return apiRequest<Monitor[]>("/monitors");
}
export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
export const statusLabels = {
  ONLINE: "Online",
  OFFLINE: "Offline",
  TIMEOUT: "Tempo limite",
  ERROR: "Falha de conexão",
};
