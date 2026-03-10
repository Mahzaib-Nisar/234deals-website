export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

async function apiFetch<T>(
  path: string,
  options: { method?: HttpMethod; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.auth) {
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
  }
  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) ||
      `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string | null;
}

export async function registerUser(payload: RegisterPayload) {
  return apiFetch<{ success: boolean; message: string }>(
    "/api/auth/register",
    { method: "POST", body: payload }
  );
}

export async function loginUser(payload: {
  email: string;
  password: string;
}) {
  const data = await apiFetch<{
    success: boolean;
    token: string;
    user: { id: number; name: string; email: string; phone?: string | null };
  }>("/api/auth/login", { method: "POST", body: payload });
  if (typeof window !== "undefined") {
    window.localStorage.setItem("token", data.token);
  }
  return data;
}

export async function getProfile() {
  return apiFetch<{ success: boolean; data: unknown }>(
    "/api/users/profile",
    { method: "GET", auth: true }
  );
}

export async function updateProfile(payload: { name?: string; phone?: string | null }) {
  return apiFetch<{ success: boolean; data: unknown }>(
    "/api/users/profile",
    { method: "PUT", body: payload, auth: true }
  );
}

export async function getDeals() {
  return apiFetch<{ success: boolean; data: any[] }>(
    "/api/deals",
    { method: "GET", auth: true }
  );
}

export async function createDeal(payload: { title: string; description?: string; price: number }) {
  return apiFetch<{ success: boolean; data: any }>(
    "/api/deals",
    { method: "POST", body: payload, auth: true }
  );
}

export async function updateDeal(id: number, payload: { title?: string; description?: string | null; price?: number }) {
  return apiFetch<{ success: boolean; data: any }>(
    `/api/deals/${id}`,
    { method: "PUT", body: payload, auth: true }
  );
}

export async function deleteDeal(id: number) {
  return apiFetch<{ success: boolean; message: string }>(
    `/api/deals/${id}`,
    { method: "DELETE", auth: true }
  );
}

export async function forgotPassword(payload: { email: string }) {
  return apiFetch<{ success: boolean; message: string }>(
    "/api/auth/forgot-password",
    { method: "POST", body: payload }
  );
}

export async function verifyOtp(payload: { email: string; otp: string }) {
  return apiFetch<{ success: boolean; message: string }>(
    "/api/auth/verify-otp",
    { method: "POST", body: payload }
  );
}

export async function resetPassword(payload: { email: string; newPassword: string }) {
  return apiFetch<{ success: boolean; message: string }>(
    "/api/auth/reset-password",
    { method: "POST", body: payload }
  );
}
