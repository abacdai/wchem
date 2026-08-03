import type { Compound } from '../lib/types';
import { Button } from './ui/Button';
import { CidBadge, FormulaBadge } from './ui/Badge';

interface CompoundCardProps {
  compound: Compound;
  onView: (compound: Compound) => void;
  onEdit: (compound: Compound) => void;
  onDelete: (compound: Compound) => void;
}

export function CompoundCard({ compound, onView, onEdit, onDelete }: CompoundCardProps) {
  return (
    <article
      className="rounded-xl border border-border bg-card p-4 shadow-sm transition-colors duration-200 hover:border-primary/50 dark:border-border-dark dark:bg-card-dark"
      data-testid={`compound-${compound.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{compound.name}</h3>
          {compound.notes ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground dark:text-muted-foreground-dark">{compound.notes}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <FormulaBadge formula={compound.formula} />
        <CidBadge cid={compound.cid} />
        {compound.smiles ? (
          <code className="max-w-40 truncate rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground dark:bg-muted-dark dark:text-muted-foreground-dark" title={compound.smiles}>
            {compound.smiles}
          </code>
        ) : null}
        <span className="ml-auto flex gap-1">
          {compound.cid ? (
            <Button variant="ghost" size="sm" aria-label={`View 3D structure of ${compound.name}`} onClick={() => onView(compound)}>
              View 3D
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" aria-label={`Edit "${compound.name}"`} onClick={() => onEdit(compound)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" aria-label={`Delete "${compound.name}"`} onClick={() => onDelete(compound)}>
            Delete
          </Button>
        </span>
      </div>
    </article>
  );
}
