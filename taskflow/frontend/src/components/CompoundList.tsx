import type { Compound } from '../lib/types';
import { CompoundCard } from './CompoundCard';
import { EmptyState, Spinner } from './ui/Feedback';

interface CompoundListProps {
  compounds: Compound[];
  loading: boolean;
  onView: (compound: Compound) => void;
  onEdit: (compound: Compound) => void;
  onDelete: (compound: Compound) => void;
  onCreate: () => void;
}

export function CompoundList({ compounds, loading, onView, onEdit, onDelete, onCreate }: CompoundListProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading compounds" />
      </div>
    );
  }
  if (compounds.length === 0) {
    return (
      <EmptyState
        title="No compounds saved yet"
        body="Search PubChem above and save molecules to build your own compound library."
        action={
          <button onClick={onCreate} className="mt-2 text-sm font-medium text-primary hover:underline">
            + Save a compound
          </button>
        }
      />
    );
  }
  return (
    <div className="list-stagger grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {compounds.map((compound) => (
        <CompoundCard key={compound.id} compound={compound} onView={onView} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
