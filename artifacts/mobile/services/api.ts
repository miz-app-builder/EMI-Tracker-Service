import AsyncStorage from "@react-native-async-storage/async-storage";

export const TOKEN_KEY = "emi_auth_token";

function getBaseUrl(): string {
  return `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
}

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(`${getBaseUrl()}${path}`, { ...options, headers });
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || "Request failed");
  return data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  return handleResponse<T>(res);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: "POST",
    body: body != null ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: "PUT",
    body: body != null ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}

export async function apiDelete(path: string): Promise<void> {
  const res = await apiFetch(path, { method: "DELETE" });
  if (res.status !== 204 && !res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as any).error || "Delete failed");
  }
}

// ─── Auth types & calls ───────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  address: string | null;
}

export interface SignupData {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  address?: string;
}

export async function authLogin(
  email: string,
  password: string
): Promise<{ user: AuthUser; token: string }> {
  const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  const { token, ...user } = data;
  return { user: user as AuthUser, token: token as string };
}

export async function authSignup(
  signupData: SignupData
): Promise<{ user: AuthUser; token: string }> {
  const res = await fetch(`${getBaseUrl()}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signupData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Signup failed");
  const { token, ...user } = data;
  return { user: user as AuthUser, token: token as string };
}

export async function authMe(): Promise<AuthUser> {
  return apiGet<AuthUser>("/api/auth/me");
}

export async function authLogout(): Promise<void> {
  await apiFetch("/api/auth/logout", { method: "POST" });
  await clearToken();
}

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface Shop {
  id: number;
  name: string;
  phone?: string | null;
  address?: string | null;
  createdAt?: string;
}

export interface EmiOrder {
  id: number;
  shopId: number;
  shopName?: string | null;
  productId?: number | null;
  productName: string;
  totalPrice: number;
  discount: number;
  downPayment: number;
  emiMonths: number;
  monthlyAmount: number;
  nextMonthlyAmount: number;
  dueDayOfMonth?: number | null;
  totalPaid: number;
  remainingAmount: number;
  installmentsPaid: number;
  nextDueDate?: string | null;
  status: string;
  purchaseDate: string;
}

export interface EmiPayment {
  id: number;
  emiOrderId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  bankName?: string | null;
  accountNumber?: string | null;
  transactionId?: string | null;
  notes?: string | null;
}

export interface EmiOrderDetail extends EmiOrder {
  payments: EmiPayment[];
}

export interface DashboardSummary {
  totalActiveOrders: number;
  totalCompletedOrders: number;
  totalOrders: number;
  totalDueAmount: number;
  totalPaidAmount: number;
  overdueOrders: number;
  thisMonthCollected: number;
  nextPaymentDate?: string | null;
}
