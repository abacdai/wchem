import type { ReactNode } from 'react';

export function Badge({ children, tone }: { children: ReactNode; tone: 'neutral' | 'primary' | 'accent' }) {
  const cls =
    tone === 'accent'
      ? 'bg-accent/15 text-accent dark:bg-accent/20 dark:text-accent'
      : tone === 'primary'
        ? 'bg-secondary/15 text-primary dark:bg-secondary/20 dark:text-secondary'
        : 'bg-muted text-muted-foreground dark:bg-muted-dark dark:text-muted-foreground-dark';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>
  );
}

export function FormulaBadge({ formula }: { formula: string }) {
  if (!formula) return null;
  return <Badge tone="primary">{formula}</Badge>;
}

export function CidBadge({ cid }: { cid: number | null }) {
  if (cid == null) return null;
  return <Badge tone="accent">CID {cid}</Badge>;
}
