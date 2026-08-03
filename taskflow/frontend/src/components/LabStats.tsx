import type { Compound } from '../lib/types';
import { Card } from './ui/Card';

interface LabStatsProps {
  compounds: Compound[];
}

export function LabStats({ compounds }: LabStatsProps) {
  const total = compounds.length;
  const with3d = compounds.filter((c) => c.cid != null).length;
  const withFormula = compounds.filter((c) => c.formula).length;

  const stats = [
    { label: 'Saved compounds', value: total },
    { label: 'With 3D structure', value: with3d },
    { label: 'With formula', value: withFormula },
  ];

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
        {stats.map((s) => (
          <div key={s.label} className="min-w-20">
            <p className="font-mono text-2xl font-semibold tabular-nums">{s.value}</p>
            <p className="text-xs text-muted-foreground dark:text-muted-foreground-dark">{s.label}</p>
          </div>
        ))}
        <div className="ml-auto text-xs text-muted-foreground dark:text-muted-foreground-dark">
          3D structures and data via <span className="font-medium text-primary">PubChem</span> (open data)
        </div>
      </div>
    </Card>
  );
}
