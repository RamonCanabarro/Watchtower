"use server";
import { revalidatePath } from "next/cache";
import { apiRequest, type Monitor } from "@/lib/monitors";

export type FormState = { message: string; success: boolean };

export async function createMonitor(
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  const name = data.get("name");
  const url = data.get("url");
  const interval = Number(data.get("interval"));
  const timeout = Number(data.get("timeout"));
  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof url !== "string" ||
    !url.trim() ||
    !Number.isFinite(interval) ||
    interval < 60 ||
    interval > 86400 ||
    !Number.isFinite(timeout) ||
    timeout < 1 ||
    timeout > 30
  ) {
    return {
      message: "Confira o nome, a URL, o intervalo e o timeout.",
      success: false,
    };
  }
  try {
    await apiRequest<Monitor>("/monitors", {
      method: "POST",
      body: JSON.stringify({
        name: name.trim(),
        url: url.trim(),
        interval,
        timeout,
      }),
    });
  } catch {
    return {
      message:
        "Não foi possível cadastrar. Confira os campos e se a API está disponível.",
      success: false,
    };
  }
  revalidatePath("/");
  return {
    message:
      "Monitor cadastrado. A primeira verificação será executada pelo worker.",
    success: true,
  };
}

export async function toggleMonitor(
  id: string,
  enabled: boolean,
  _previous: FormState,
): Promise<FormState> {
  void _previous;
  if (!/^[0-9a-f-]{36}$/i.test(id) || typeof enabled !== "boolean")
    return { message: "Monitor inválido.", success: false };
  try {
    await apiRequest<Monitor>(`/monitors/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    });
  } catch {
    return { message: "Não foi possível alterar o monitor.", success: false };
  }
  revalidatePath("/");
  revalidatePath(`/monitors/${id}`);
  return {
    message: enabled ? "Monitor habilitado." : "Monitor pausado.",
    success: true,
  };
}
