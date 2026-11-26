import { redirect } from "next/navigation";
import { apiRequest, ApiError } from "./api";
export type CurrentUser = { id: string; email: string };
export async function requireUser(): Promise<CurrentUser> {
  try {
    return await apiRequest<CurrentUser>("/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/login");
    throw error;
  }
}
