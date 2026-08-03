export interface Compound {
  id: string;
  name: string;
  notes: string;
  formula: string;
  smiles: string;
  cid: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface CompoundListResponse {
  compounds: Compound[];
  pagination: Pagination;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface PubChemSearchResult {
  cid: number;
  name: string;
  formula: string;
}

export class ApiError extends Error {
  status: number;
  details?: Record<string, string>;

  constructor(status: number, message: string, details?: Record<string, string>) {
    super(message);
    this.status = status;
    this.details = details;
  }
}
