import { useState } from 'react';
import { findReaction, phaseGlyph, REACTIONS, type Reaction, type Reactant } from '../lib/reactions';
import { Badge } from './ui/Badge';
import { Select } from './ui/Form';

const REACTANT_OPTIONS: { formula: string; name: string }[] = [];
for (const r of REACTIONS) {
  for (const rt of r.reactants) {
    if (!REACTANT_OPTIONS.some((o) => o.formula === rt.formula)) {
      REACTANT_OPTIONS.push({ formula: rt.formula, name: rt.name });
    }
  }
}
REACTANT_OPTIONS.sort((a, b) => a.formula.localeCompare(b.formula));

function PhasedName({ item }: { item: Reactant }) {
  return (
    <span>
      <span className="font-semibold">{item.formula}</span>
      <span className="text-muted-foreground dark:text-muted-foreground-dark"> {item.name}</span>
      <span className="text-xs text-muted-foreground/70 dark:text-muted-foreground-dark/70">{phaseGlyph(item.phase)}</span>
    </span>
  );
}

export function ReactionLab() {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const reaction: Reaction | null = findReaction(a, b);

  const pickLabel = (o: { formula: string; name: string }) => `${o.formula} — ${o.name}`;

  return (
    <section className="space-y-3" data-testid="reaction-lab">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Reactant A</span>
          <Select aria-label="Reactant A" value={a} onChange={(e) => setA(e.target.value)}>
            <option value="">Select compound…</option>
            {REACTANT_OPTIONS.map((o) => (
              <option key={o.formula} value={o.formula}>
                {pickLabel(o)}
              </option>
            ))}
          </Select>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Reactant B</span>
          <Select aria-label="Reactant B" value={b} onChange={(e) => setB(e.target.value)}>
            <option value="">Select compound…</option>
            {REACTANT_OPTIONS.map((o) => (
              <option key={o.formula} value={o.formula}>
                {pickLabel(o)}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {reaction ? (
        <div className="rounded-lg border border-border bg-muted/40 p-4 dark:border-border-dark dark:bg-muted-dark/30">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone="accent">{reaction.type}</Badge>
            <code className="font-mono text-sm" data-testid="reaction-equation">
              {reaction.balanced}
            </code>
          </div>
          <p className="mb-3 text-xs text-muted-foreground dark:text-muted-foreground-dark">{reaction.note}</p>
          <div className="space-y-1.5 text-sm">
            <p>
              <span className="text-muted-foreground dark:text-muted-foreground-dark">Reactants: </span>
              <PhasedName item={reaction.reactants[0]} />
              <span className="mx-1">+</span>
              <PhasedName item={reaction.reactants[1]} />
            </p>
            <p>
              <span className="text-muted-foreground dark:text-muted-foreground-dark">Products: </span>
              {reaction.products.map((p, i) => (
                <span key={`${p.formula}-${i}`}>
                  {i > 0 && <span className="mx-1">+</span>}
                  <PhasedName item={p} />
                </span>
              ))}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground dark:border-border-dark dark:text-muted-foreground-dark">
          Pick two compounds to see them react — try HCl + NaOH or CH3COOH + NaHCO3
        </div>
      )}
    </section>
  );
}