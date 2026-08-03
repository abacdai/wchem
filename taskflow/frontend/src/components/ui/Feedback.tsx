import { useEffect, type ReactNode } from 'react';
import { Button } from './Button';

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 dark:bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl dark:border-border-dark dark:bg-card-dark"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="sm" aria-label="Close dialog" onClick={onClose}>
            ✕
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Spinner({ label = 'Loading', size = 'md' }: { label?: string; size?: 'sm' | 'md' }) {
  const dims = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  return (
    <span role="status" aria-label={label} className="inline-flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground-dark">
      <span className={`inline-block ${dims} animate-spin rounded-full border-2 border-current border-t-transparent`} aria-hidden="true" />
      {label}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <svg className="h-10 w-10 text-border dark:text-border-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M9 8h6M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground dark:text-muted-foreground-dark">{body}</p>
      {action}
    </div>
  );
}
