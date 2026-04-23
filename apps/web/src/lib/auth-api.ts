import { api } from "@/lib/api";
import { useAuthStore, type User } from "@/stores/auth";

type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export async function login(username: string, password: string): Promise<User> {
  const tokens = await api
    .post("v1/auth/login", { json: { username, password } })
    .json<TokenResponse>();

  useAuthStore.getState().setToken(tokens.access_token);

  const user = await api.get("v1/auth/me").json<User>();
  useAuthStore.getState().setAuth(user, tokens.access_token);
  return user;
}

export async function logout(): Promise<void> {
  try {
    await api.post("v1/auth/logout");
  } finally {
    useAuthStore.getState().clear();
  }
}

/**
 * App yuklanganda — HttpOnly refresh cookie orqali sessiyani tiklash.
 * Agar ishlasa, user ma'lumoti va access token store'ga yoziladi.
 * Aks holda — store tozalanadi (guest).
 */
export async function bootstrap(): Promise<void> {
  try {
    const tokens = await api.post("v1/auth/refresh").json<TokenResponse>();
    useAuthStore.getState().setToken(tokens.access_token);
    const user = await api.get("v1/auth/me").json<User>();
    useAuthStore.getState().setAuth(user, tokens.access_token);
  } catch {
    useAuthStore.getState().clear();
  }
}
