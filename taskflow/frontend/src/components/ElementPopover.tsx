import { useEffect, useRef, useState } from 'react';
import type { Element } from '../lib/elements';
import { blockClass, phaseLabel } from '../lib/elements';

interface ElementPopoverProps {
  element: Element;
  anchor: DOMRect | null;
  onClose: () => void;
  onView3d?: (element: Element) => void;
}

export function ElementPopover({ element, anchor, onClose, onView3d }: ElementPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [viewing, setViewing] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!anchor) return null;

  const left = Math.min(anchor.left + anchor.width / 2 - 160, window.innerWidth - 340);
  const top = Math.max(anchor.bottom + 8, 8);

  async function handleView3d() {
    if (!onView3d) return;
    setViewing(true);
    try {
      await onView3d(element);
    } finally {
      setViewing(false);
    }
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`${element.name} details`}
      className="fixed z-50 w-80 rounded-xl border border-border bg-background p-4 shadow-xl dark:border-border-dark dark:bg-card-dark"
      style={{ left: `${left}px`, top: `${top}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{element.name}</h3>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground-dark">
            {element.sym} — atomic number {element.n}
          </p>
        </div>
        <button type="button" aria-label="Close" className="text-muted-foreground hover:text-foreground dark:text-muted-foreground-dark" onClick={onClose}>
          ✕
        </button>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-muted px-2 py-1.5 dark:bg-muted-dark">
          <dt className="text-[11px] text-muted-foreground dark:text-muted-foreground-dark">Mass</dt>
          <dd className="font-medium">{element.mass}</dd>
        </div>
        <div className="rounded-lg bg-muted px-2 py-1.5 dark:bg-muted-dark">
          <dt className="text-[11px] text-muted-foreground dark:text-muted-foreground-dark">Category</dt>
          <dd className="font-medium capitalize">{element.cat}</dd>
        </div>
        <div className="rounded-lg bg-muted px-2 py-1.5 dark:bg-muted-dark">
          <dt className="text-[11px] text-muted-foreground dark:text-muted-foreground-dark">Group</dt>
          <dd className="font-medium">{element.group}</dd>
        </div>
        <div className="rounded-lg bg-muted px-2 py-1.5 dark:bg-muted-dark">
          <dt className="text-[11px] text-muted-foreground dark:text-muted-foreground-dark">Period</dt>
          <dd className="font-medium">{element.period}</dd>
        </div>
        <div className="rounded-lg bg-muted px-2 py-1.5 dark:bg-muted-dark">
          <dt className="text-[11px] text-muted-foreground dark:text-muted-foreground-dark">Block</dt>
          <dd className={`font-medium ${blockClass(element.block)}`}>{element.block}-block</dd>
        </div>
        <div className="rounded-lg bg-muted px-2 py-1.5 dark:bg-muted-dark">
          <dt className="text-[11px] text-muted-foreground dark:text-muted-foreground-dark">Phase</dt>
          <dd className="font-medium">{phaseLabel(element.phase)}</dd>
        </div>
        <div className="col-span-2 rounded-lg bg-muted px-2 py-1.5 dark:bg-muted-dark">
          <dt className="text-[11px] text-muted-foreground dark:text-muted-foreground-dark">Electron config</dt>
          <dd className="font-mono text-xs">{element.electron}</dd>
        </div>
      </dl>
      {onView3d ? (
        <button
          type="button"
          onClick={() => void handleView3d()}
          disabled={viewing}
          className="mt-3 w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {viewing ? 'Loading structure…' : 'View 3D structure'}
        </button>
      ) : null}
    </div>
  );
}