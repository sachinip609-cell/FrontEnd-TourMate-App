import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppConfig } from '../constants/AppConfig';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  createdAt: string;
  avatarUrl?: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

interface ApiError {
  success: false;
  message: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE_URL = AppConfig.api.baseUrl;

const post = async <T>(
  path: string,
  body: Record<string, string>,
): Promise<T> => {
  const controller = new AbortController();
  const timeoutMs = AppConfig.api.timeoutMs ?? 15000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    // Try to parse JSON safely — backend may return non-JSON on low-level errors
    let json: ApiSuccess<T> | ApiError | null = null;
    try {
      json = (await response.json()) as ApiSuccess<T> | ApiError;
    } catch (parseErr) {
      // If parsing fails, throw a helpful error
      throw new Error(
        `Unexpected server response (status ${response.status}).`,
      );
    }

    if (!response.ok || !json.success) {
      throw new Error(
        (json as ApiError).message ||
          `Request failed (status ${response.status}).`,
      );
    }

    return (json as ApiSuccess<T>).data;
  } catch (err: any) {
    // Map AbortError / timeout to a clear message
    if (err?.name === 'AbortError') {
      throw new Error(
        'Request timed out. Please check your network or backend service.',
      );
    }

    // Network failures like ECONNREFUSED appear as TypeError in fetch
    if (err instanceof TypeError) {
      throw new Error(
        'Network request failed. Is the backend running and reachable from this device?',
      );
    }

    // Re-throw with message if available
    throw new Error(err?.message ?? 'Something went wrong.');
  } finally {
    clearTimeout(timeoutId);
  }
};

// ── Token helpers ─────────────────────────────────────────────────────────────

export const saveToken = (token: string): Promise<void> =>
  AsyncStorage.setItem(AppConfig.auth.sessionTokenKey, token);

export const getToken = (): Promise<string | null> =>
  AsyncStorage.getItem(AppConfig.auth.sessionTokenKey);

export const clearToken = (): Promise<void> =>
  AsyncStorage.removeItem(AppConfig.auth.sessionTokenKey);

// Persist the logged-in user object so we can restore session across app restarts
export const saveUser = (user: AuthUser): Promise<void> =>
  AsyncStorage.setItem(AppConfig.auth.userStorageKey, JSON.stringify(user));

export const getUser = async (): Promise<AuthUser | null> => {
  const raw = await AsyncStorage.getItem(AppConfig.auth.userStorageKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
};

export const clearUser = (): Promise<void> =>
  AsyncStorage.removeItem(AppConfig.auth.userStorageKey);

// ── Auth API calls ────────────────────────────────────────────────────────────

/**
 * Register a new account.
 */
export const registerUser = async (
  fullName: string,
  email: string,
  password: string,
): Promise<AuthResponse> => {
  const data = await post<AuthResponse>('/auth/register', {
    fullName,
    email,
    password,
  });
  await saveToken(data.token);
  await saveUser(data.user);
  return data;
};

/**
 * Login with email and password.
 */
export const loginUser = async (
  email: string,
  password: string,
): Promise<AuthResponse> => {
  const data = await post<AuthResponse>('/auth/login', { email, password });
  await saveToken(data.token);
  await saveUser(data.user);
  return data;
};

/**
 * Logout — clears persisted token.
 */
export const logoutUser = async (): Promise<void> => {
  await Promise.all([clearToken(), clearUser()]);
};
