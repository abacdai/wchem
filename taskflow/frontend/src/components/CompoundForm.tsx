import { useState, type FormEvent } from 'react';
import type { Compound } from '../lib/types';
import { Button } from './ui/Button';
import { Field, Input, Textarea } from './ui/Form';

interface CompoundFormProps {
  initial?: Partial<Compound>;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (input: Partial<Compound>) => void;
  onCancel?: () => void;
}

export function CompoundForm({ initial, submitting = false, submitLabel = 'Save compound', onSubmit, onCancel }: CompoundFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [formula, setFormula] = useState(initial?.formula ?? '');
  const [smiles, setSmiles] = useState(initial?.smiles ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [cid, setCid] = useState(initial?.cid ? String(initial.cid) : '');
  const [error, setError] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    setError('');
    onSubmit({
      name: trimmed,
      formula: formula.trim(),
      smiles: smiles.trim(),
      notes: notes.trim(),
      cid: cid.trim() === '' ? null : Number(cid.trim()),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Field label="Name" error={error}>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Acetylsalicylic acid"
          autoFocus
          invalid={Boolean(error)}
          aria-invalid={Boolean(error)}
        />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Formula" hint="Optional — e.g. C9H8O4">
          <Input value={formula} onChange={(e) => setFormula(e.target.value)} placeholder="C9H8O4" />
        </Field>
        <Field label="PubChem CID" hint="Filled automatically when searching">
          <Input type="number" min="1" value={cid} onChange={(e) => setCid(e.target.value)} placeholder="2244" data-testid="cid-input" />
        </Field>
      </div>
      <Field label="SMILES" hint="Optional — SMILES notation">
        <Input value={smiles} onChange={(e) => setSmiles(e.target.value)} placeholder="CC(=O)OC1=CC=CC=C1C(=O)O" />
      </Field>
      <Field label="Notes" hint="Optional — up to 2000 characters">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Safety notes, observations…" />
      </Field>
      <div className="flex justify-end gap-3 pt-1">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting} size="lg">
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
