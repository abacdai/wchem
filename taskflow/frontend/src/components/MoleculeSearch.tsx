import { useRef, useState, type FormEvent } from 'react';
import { pubchemAutocomplete, pubchemSearchByName } from '../lib/api';
import type { PubChemSearchResult } from '../lib/types';
import { Spinner } from './ui/Feedback';
import { Input } from './ui/Form';

interface MoleculeSearchProps {
  busy?: boolean;
  onSelect: (result: PubChemSearchResult) => void;
}

export function MoleculeSearch({ busy = false, onSelect }: MoleculeSearchProps) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(0);

  async function handleChange(value: string) {
    setQuery(value);
    setError('');
    if (value.trim().length < 2) {
      setOptions([]);
      return;
    }
    const ticket = ++pending.current;
    setSearching(true);
    try {
      const names = await pubchemAutocomplete(value);
      if (ticket !== pending.current) return;
      setOptions(names);
    } catch {
      if (ticket === pending.current) setError('Search failed — try again.');
    } finally {
      if (ticket === pending.current) setSearching(false);
    }
  }

  async function handlePick(name: string) {
    setResolving(true);
    setError('');
    try {
      const result = await pubchemSearchByName(name);
      if (result) {
        onSelect(result);
        setQuery('');
        setOptions([]);
      } else {
        setError('Could not resolve that compound.');
      }
    } finally {
      setResolving(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (options.length > 0) void handlePick(options[0]);
    else setError('No matching compounds found.');
  }

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={query}
            onChange={(e) => void handleChange(e.target.value)}
            placeholder="Search PubChem — e.g. aspirin, caffeine, H2O…"
            aria-label="Search PubChem for a compound"
            aria-busy={searching || resolving}
            data-testid="molecule-search-input"
          />
          {searching ? (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <Spinner size="sm" />
            </span>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={busy || searching || resolving}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {resolving ? 'Resolving…' : 'View'}
        </button>
      </form>
      {options.length > 0 ? (
        <ul
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg dark:border-border-dark dark:bg-card-dark"
          role="listbox"
          data-testid="search-suggestions"
        >
          {options.map((name) => (
            <li key={name}>
              <button
                type="button"
                role="option"
                onClick={() => void handlePick(name)}
                className="block w-full truncate px-3 py-2 text-left text-sm transition-colors hover:bg-secondary/10"
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="mt-1 text-xs text-destructive dark:text-destructive-dark">{error}</p> : null}
    </div>
  );
}
