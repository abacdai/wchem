import { ApiError, type AuthResponse, type Compound, type CompoundListResponse, type PubChemSearchResult, type User } from './types';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'chemlab:token';
const PUBCHEM = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, 'Network error — is the API running?');
  }

  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body.error || `Request failed (${response.status})`,
      body.details
    );
  }
  return body as T;
}

export const api = {
  register(name: string, email: string, password: string): Promise<AuthResponse> {
    return request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
  },
  login(email: string, password: string): Promise<AuthResponse> {
    return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  },
  me(): Promise<{ user: User }> {
    return request('/auth/me');
  },
  listCompounds(params?: { page?: number; limit?: number }): Promise<CompoundListResponse> {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return request(`/compounds${qs ? `?${qs}` : ''}`);
  },
  getCompound(id: string): Promise<{ compound: Compound }> {
    return request(`/compounds/${id}`);
  },
  createCompound(input: Partial<Compound>): Promise<{ compound: Compound }> {
    return request('/compounds', { method: 'POST', body: JSON.stringify(input) });
  },
  updateCompound(id: string, input: Partial<Compound>): Promise<{ compound: Compound }> {
    return request(`/compounds/${id}`, { method: 'PUT', body: JSON.stringify(input) });
  },
  deleteCompound(id: string): Promise<void> {
    return request(`/compounds/${id}`, { method: 'DELETE' });
  },
};

export async function pubchemAutocomplete(query: string): Promise<string[]> {
  if (!query.trim()) return [];
  const res = await fetch(`${PUBCHEM}/compound/name/${encodeURIComponent(query.trim())}/cids/JSON?limit=12`);
  if (!res.ok) return [];
  const body = await res.json().catch(() => null);
  const ids = body?.IdentifierList?.CID ?? [];
  if (ids.length === 0) return [];
  const labels = await pubchemNames(ids.slice(0, 12));
  return labels;
}

export async function pubchemSearch(cid: number): Promise<PubChemSearchResult | null> {
  const propsRes = await fetch(`${PUBCHEM}/compound/cid/${cid}/property/MolecularFormula,IUPACName/JSON`);
  if (!propsRes.ok) return null;
  const props = (await propsRes.json().catch(() => null))?.PropertyTable?.Properties?.[0];
  if (!props) return null;
  const names = await pubchemNames([cid]);
  return {
    cid,
    name: names[0] || props.IUPACName || `CID ${cid}`,
    formula: props.MolecularFormula || '',
  };
}

async function pubchemNames(cids: number[]): Promise<string[]> {
  const res = await fetch(`${PUBCHEM}/compound/cid/${cids.join(',')}/synonyms/JSON`);
  if (!res.ok) return [];
  const info = (await res.json().catch(() => null))?.InformationList?.Information ?? [];
  return info.map((i: { Synonym?: string[] }) => (i.Synonym && i.Synonym.length > 0 ? i.Synonym[0] : ''));
}

export async function pubchemSearchByName(name: string): Promise<PubChemSearchResult | null> {
  const res = await fetch(`${PUBCHEM}/compound/name/${encodeURIComponent(name)}/cids/JSON`);
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  const cid = body?.IdentifierList?.CID?.[0];
  if (!cid) return null;
  return pubchemSearch(cid);
}

export function pubchemSdfUrl(cid: number): string {
  return `${PUBCHEM}/compound/cid/${cid}/SDF?record_type=3d`;
}
