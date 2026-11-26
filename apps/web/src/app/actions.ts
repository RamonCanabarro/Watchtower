"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { apiRequest, ApiError } from "@/lib/api";
import type { Monitor } from "@/lib/monitors";

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
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login");
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
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login");
    return { message: "Não foi possível alterar o monitor.", success: false };
  }
  revalidatePath("/");
  revalidatePath(`/monitors/${id}`);
  return {
    message: enabled ? "Monitor habilitado." : "Monitor pausado.",
    success: true,
  };
}

export async function editMonitor(
  id: string,
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  void _previous;
  const name = data.get("name");
  const url = data.get("url");
  const interval = Number(data.get("interval"));
  const timeout = Number(data.get("timeout"));
  if (
    !/^[0-9a-f-]{36}$/i.test(id) ||
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 120 ||
    typeof url !== "string" ||
    !url.trim() ||
    url.length > 2048 ||
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
    await apiRequest<Monitor>(`/monitors/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: name.trim(),
        url: url.trim(),
        interval,
        timeout,
      }),
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login");
    return {
      message:
        "Não foi possível salvar. Confira os campos e se a API está disponível.",
      success: false,
    };
  }
  revalidatePath("/");
  revalidatePath(`/monitors/${id}`);
  return {
    message: "Monitor atualizado. O histórico foi preservado.",
    success: true,
  };
}

export async function deleteMonitor(
  id: string,
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  void _previous;
  if (!/^[0-9a-f-]{36}$/i.test(id) || data.get("confirmation") !== id) {
    return { message: "Confirme a exclusão deste monitor.", success: false };
  }
  try {
    await apiRequest<void>(`/monitors/${id}`, { method: "DELETE" });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login");
    // A retry after a lost response, or a deletion in another tab, is already complete.
    if (!(error instanceof ApiError && error.status === 404)) {
      return {
        message: "Não foi possível excluir o monitor. Tente novamente.",
        success: false,
      };
    }
  }
  revalidatePath("/");
  revalidatePath(`/monitors/${id}`);
  redirect("/");
}
