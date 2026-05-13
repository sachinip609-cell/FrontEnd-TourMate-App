import { AppConfig } from '../constants/AppConfig';
import { getToken } from './authService';

export interface Note {
  _id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

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

export const fetchNotes = async (): Promise<Note[]> => {
  const headers = await authHeaders();
  const { notes } = await request<{ notes: Note[] }>('/notes', {
    method: 'GET',
    headers,
  });
  return notes;
};

export const createNote = async (
  title: string,
  content: string,
): Promise<Note> => {
  const headers = await authHeaders();
  const { note } = await request<{ note: Note }>('/notes', {
    method: 'POST',
    headers,
    body: JSON.stringify({ title, content }),
  });
  return note;
};

export const updateNote = async (
  id: string,
  title: string,
  content: string,
): Promise<Note> => {
  const headers = await authHeaders();
  const { note } = await request<{ note: Note }>(`/notes/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ title, content }),
  });
  return note;
};

export const deleteNote = async (id: string): Promise<void> => {
  const headers = await authHeaders();
  await request(`/notes/${id}`, { method: 'DELETE', headers });
};
