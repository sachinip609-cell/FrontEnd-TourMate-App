import { AppConfig } from '../constants/AppConfig';
import { getToken } from './authService';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Budget {
  _id: string;
  userId: string;
  title: string;
  currency: string;
  targetAmount: number;
  createdAt: number;
  updatedAt: number;
}

export interface BudgetItem {
  _id: string;
  budgetId: string;
  userId: string;
  title: string;
  amount: number;
  category?: string;
  spentAt: number;
  createdAt: number;
}

// ── Internals ─────────────────────────────────────────────────────────────────

const BASE = AppConfig.api.baseUrl;
const TIMEOUT = AppConfig.api.timeoutMs ?? 15000;

function buildCandidateBases(baseUrl: string): string[] {
  const candidates = [baseUrl];
  if (baseUrl.includes(':5000'))
    candidates.push(baseUrl.replace(':5000', ':5001'));
  if (baseUrl.includes(':5001'))
    candidates.push(baseUrl.replace(':5001', ':5000'));
  return Array.from(new Set(candidates));
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated.');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const bases = buildCandidateBases(BASE);
  let lastError: any = null;

  for (const candidateBase of bases) {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), TIMEOUT);
    try {
      const res = await fetch(`${candidateBase}${path}`, {
        ...options,
        signal: controller.signal,
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message ?? 'Request failed.');
      }
      return json.data as T;
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message ?? '').toLowerCase();
      const isAbort =
        err?.name === 'AbortError' ||
        msg.includes('aborted') ||
        msg.includes('abort');
      const isNetwork = err instanceof TypeError;
      if (!(isAbort || isNetwork)) {
        throw err;
      }
    } finally {
      clearTimeout(tid);
    }
  }

  if (lastError?.name === 'AbortError') {
    throw new Error(
      'Request timed out. Please verify backend is running and reachable.',
    );
  }
  if (lastError instanceof TypeError) {
    throw new Error(
      'Network request failed. Please check your API host/port in AppConfig.',
    );
  }
  throw new Error(lastError?.message ?? 'Request failed.');
}

// ── Budget CRUD ───────────────────────────────────────────────────────────────

export const fetchBudgets = async (): Promise<Budget[]> => {
  const headers = await authHeaders();
  const { budgets } = await request<{ budgets: Budget[] }>('/budgets', {
    method: 'GET',
    headers,
  });
  return budgets;
};

export const createBudget = async (
  title: string,
  currency: string,
  targetAmount: number,
): Promise<Budget> => {
  const headers = await authHeaders();
  const { budget } = await request<{ budget: Budget }>('/budgets', {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, currency, targetAmount }),
  });
  return budget;
};

export const updateBudget = async (
  id: string,
  title: string,
  currency: string,
  targetAmount: number,
): Promise<Budget> => {
  const headers = await authHeaders();
  const { budget } = await request<{ budget: Budget }>(`/budgets/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ title, currency, targetAmount }),
  });
  return budget;
};

export const deleteBudget = async (id: string): Promise<void> => {
  const headers = await authHeaders();
  await request(`/budgets/${id}`, { method: 'DELETE', headers });
};

// ── Budget Items CRUD ─────────────────────────────────────────────────────────

export const fetchBudgetItems = async (
  budgetId: string,
): Promise<BudgetItem[]> => {
  const headers = await authHeaders();
  const { items } = await request<{ items: BudgetItem[] }>(
    `/budgets/${budgetId}/items`,
    { method: 'GET', headers },
  );
  return items;
};

export const createBudgetItem = async (
  budgetId: string,
  title: string,
  amount: number,
  category?: string,
  spentAt?: number,
): Promise<BudgetItem> => {
  const headers = await authHeaders();
  const { item } = await request<{ item: BudgetItem }>(
    `/budgets/${budgetId}/items`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ title, amount, category, spentAt }),
    },
  );
  return item;
};

export const updateBudgetItem = async (
  budgetId: string,
  itemId: string,
  title: string,
  amount: number,
  category?: string,
  spentAt?: number,
): Promise<BudgetItem> => {
  const headers = await authHeaders();
  const { item } = await request<{ item: BudgetItem }>(
    `/budgets/${budgetId}/items/${itemId}`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({ title, amount, category, spentAt }),
    },
  );
  return item;
};

export const deleteBudgetItem = async (
  budgetId: string,
  itemId: string,
): Promise<void> => {
  const headers = await authHeaders();
  await request(`/budgets/${budgetId}/items/${itemId}`, {
    method: 'DELETE',
    headers,
  });
};
