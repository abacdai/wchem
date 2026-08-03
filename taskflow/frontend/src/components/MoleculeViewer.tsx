import { useEffect, useRef, useState } from 'react';
import { pubchemSdfUrl } from '../lib/api';
import { LabGlassware } from './LabGlassware';
import { PhaseView } from './PhaseView';

declare global {
  interface Window {
    $3Dmol?: {
      createViewer: (el: HTMLElement, opts: Record<string, unknown>) => ViewerApi;
    };
  }
}

interface ViewerApi {
  addModel: (data: string, format: string) => void;
  setStyle: (sel: unknown, style: unknown) => void;
  zoomTo: () => void;
  render: () => void;
  removeAllModels: () => void;
  clear: () => void;
}

interface MoleculeViewerProps {
  cid: number;
  name: string;
  formula?: string;
  height?: number;
}

type ViewMode = 'structure' | 'state';

export function MoleculeViewer({ cid, name, formula, height = 340 }: MoleculeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ViewerApi | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'unavailable'>('loading');
  const [mode, setMode] = useState<ViewMode>('structure');

  useEffect(() => {
    if (mode !== 'structure') return;
    const $3Dmol = window.$3Dmol;
    const el = containerRef.current;
    if (!$3Dmol || !el) {
      setStatus('unavailable');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    const viewer = $3Dmol.createViewer(el, { backgroundColor: 'white' });
    viewerRef.current = viewer;
    fetch(pubchemSdfUrl(cid))
      .then((r) => {
        if (!r.ok) throw new Error('PubChem request failed');
        return r.text();
      })
      .then((sdf) => {
        if (cancelled) return;
        viewer.addModel(sdf, 'sdf');
        viewer.setStyle({}, { stick: { radius: 0.15 }, sphere: { scale: 0.25 } });
        viewer.zoomTo();
        viewer.render();
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
      if (viewerRef.current) {
        viewerRef.current.clear();
        viewerRef.current = null;
      }
    };
  }, [cid, mode]);

  return (
    <div>
      <div className="mb-2 flex gap-1" role="tablist" aria-label="View mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'structure'}
          aria-controls="structure-panel"
          onClick={() => setMode('structure')}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            mode === 'structure'
              ? 'bg-primary text-white'
              : 'bg-muted text-muted-foreground hover:bg-secondary/10 dark:bg-muted-dark dark:text-muted-foreground-dark'
          }`}
        >
          Structure
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'state'}
          aria-controls="state-panel"
          onClick={() => setMode('state')}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
            mode === 'state'
              ? 'bg-primary text-white'
              : 'bg-muted text-muted-foreground hover:bg-secondary/10 dark:bg-muted-dark dark:text-muted-foreground-dark'
          }`}
        >
          State of matter
        </button>
      </div>

      {mode === 'state' ? (
        <PhaseView name={name} formula={formula} height={height} />
      ) : (
        <div id="structure-panel" role="tabpanel">
          <div ref={containerRef} style={{ height }} className="w-full rounded-lg" aria-label={`3D structure of ${name}`} data-testid="molecule-viewer" />
          {status === 'loading' ? (
            <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground-dark">Loading 3D structure from PubChem…</p>
          ) : null}
          {status === 'error' ? (
            <p className="mt-1 text-xs text-destructive dark:text-destructive-dark">Could not load the 3D structure from PubChem.</p>
          ) : null}
          {status === 'unavailable' ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground dark:border-border-dark dark:text-muted-foreground-dark">
              3D viewer unavailable (3Dmol.js not loaded)
            </div>
          ) : null}
        </div>
      )}

      <div className="mt-3">
        <LabGlassware name={name} formula={formula} />
      </div>
    </div>
  );
}