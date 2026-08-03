import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, pubchemAutocomplete, pubchemSearch, pubchemSearchByName, pubchemSdfUrl } from '../lib/api';
import { ApiError } from '../lib/types';

describe('api client', () => {
  beforeEach(() => {
    localStorage.setItem('chemlab:token', 'tok123');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('attaches the bearer token and parses validation details', async () => {
    let capturedHeaders: Record<string, string> = {};
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      capturedHeaders = (init?.headers ?? {}) as Record<string, string>;
      return new Response(JSON.stringify({ error: 'Validation failed', details: { name: 'Name is required' } }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }));

    await expect(api.createCompound({ name: '' })).rejects.toMatchObject({
      status: 400,
      message: 'Validation failed',
      details: { name: 'Name is required' },
    });
    expect(capturedHeaders.Authorization).toBe('Bearer tok123');
  });

  it('maps network failures to ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('fetch failed');
    }));
    await expect(api.login('a@b.io', 'password123')).rejects.toBeInstanceOf(ApiError);
  });

  it('returns undefined for 204 responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })));
    await expect(api.deleteCompound('c1')).resolves.toBeUndefined();
  });

  it('sends query params for list filters', async () => {
    let calledUrl = '';
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      calledUrl = url;
      return new Response(JSON.stringify({ compounds: [], pagination: { page: 1, limit: 24, total: 0, pages: 1 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }));
    await api.listCompounds({ page: 2, limit: 10 });
    expect(calledUrl).toContain('page=2');
    expect(calledUrl).toContain('limit=10');
  });
});

describe('pubchem helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds a 3D SDF URL for a CID', () => {
    expect(pubchemSdfUrl(2244)).toContain('/cid/2244/SDF');
    expect(pubchemSdfUrl(2244)).toContain('record_type=3d');
  });

  it('returns names for a query via CID + synonyms', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/cids/JSON')) {
        return new Response(JSON.stringify({ IdentifierList: { CID: [2244, 2519] } }), { status: 200 });
      }
      return new Response(JSON.stringify({ InformationList: { Information: [{ Synonym: ['Aspirin'] }, { Synonym: ['Caffeine'] }] } }), { status: 200 });
    }));
    await expect(pubchemAutocomplete('asp')).resolves.toEqual(['Aspirin', 'Caffeine']);
  });

  it('returns an empty list when PubChem has no matches', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    await expect(pubchemAutocomplete('zzz')).resolves.toEqual([]);
    await expect(pubchemAutocomplete('')).resolves.toEqual([]);
  });

  it('resolves a compound by name to cid, formula and common name', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/cids/JSON')) {
        return new Response(JSON.stringify({ IdentifierList: { CID: [2244] } }), { status: 200 });
      }
      if (url.includes('/property/')) {
        return new Response(JSON.stringify({ PropertyTable: { Properties: [{ CID: 2244, MolecularFormula: 'C9H8O4', IUPACName: '2-acetyloxybenzoic acid' }] } }), { status: 200 });
      }
      return new Response(JSON.stringify({ InformationList: { Information: [{ Synonym: ['Aspirin'] }] } }), { status: 200 });
    }));
    await expect(pubchemSearchByName('aspirin')).resolves.toMatchObject({ cid: 2244, formula: 'C9H8O4', name: 'Aspirin' });
  });

  it('resolves a CID to formula and name', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (url.includes('/property/')) {
        return new Response(JSON.stringify({ PropertyTable: { Properties: [{ CID: 962, MolecularFormula: 'H2O', IUPACName: 'oxidane' }] } }), { status: 200 });
      }
      return new Response(JSON.stringify({ InformationList: { Information: [{ Synonym: ['Water'] }] } }), { status: 200 });
    }));
    await expect(pubchemSearch(962)).resolves.toMatchObject({ cid: 962, formula: 'H2O', name: 'Water' });
  });

  it('returns null when PubChem lookups fail', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));
    await expect(pubchemSearch(999)).resolves.toBeNull();
    await expect(pubchemSearchByName('nope')).resolves.toBeNull();
  });
});
