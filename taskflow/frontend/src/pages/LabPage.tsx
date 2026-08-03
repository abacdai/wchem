import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, pubchemSearchByName } from '../lib/api';
import { getSocket } from '../lib/socket';
import type { Compound, PubChemSearchResult } from '../lib/types';
import type { Element } from '../lib/elements';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Modal } from '../components/ui/Feedback';
import { Logo } from '../components/Logo';
import { LabStats } from '../components/LabStats';
import { CompoundForm } from '../components/CompoundForm';
import { CompoundList } from '../components/CompoundList';
import { MoleculeSearch } from '../components/MoleculeSearch';
import { MoleculeViewer } from '../components/MoleculeViewer';
import { PeriodicTable } from '../components/PeriodicTable';
import { ReactionLab } from '../components/ReactionLab';

type EditorState = { open: boolean; compound: Partial<Compound> | null };

export function LabPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditorState>({ open: false, compound: null });
  const [saving, setSaving] = useState(false);
  const [realtime, setRealtime] = useState(false);
  const [selectedElement, setSelectedElement] = useState<Element | null>(null);
  const [viewer, setViewer] = useState<PubChemSearchResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listCompounds();
      setCompounds(res.compounds);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    setRealtime(socket.connected);
    socket.on('connect', () => setRealtime(true));
    socket.on('disconnect', () => setRealtime(false));
    socket.on('compound:created', (c: Compound) => setCompounds((prev) => [c, ...prev]));
    socket.on('compound:updated', (c: Compound) =>
      setCompounds((prev) => prev.map((item) => (item.id === c.id ? c : item)))
    );
    socket.on('compound:deleted', ({ id }: { id: string }) =>
      setCompounds((prev) => prev.filter((item) => item.id !== id))
    );
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('compound:created');
      socket.off('compound:updated');
      socket.off('compound:deleted');
    };
  }, []);

  const upsertCompound = useCallback((next: Compound) => {
    setCompounds((prev) => {
      const exists = prev.some((c) => c.id === next.id);
      return exists ? prev.map((c) => (c.id === next.id ? next : c)) : [next, ...prev];
    });
  }, []);

  async function handleCreate(input: Partial<Compound>) {
    setSaving(true);
    try {
      const res = await api.createCompound(input);
      upsertCompound(res.compound);
      setEditor({ open: false, compound: null });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(input: Partial<Compound>) {
    if (!editor.compound?.id) return;
    setSaving(true);
    try {
      const res = await api.updateCompound(editor.compound.id, input);
      upsertCompound(res.compound);
      setEditor({ open: false, compound: null });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(compound: Compound) {
    try {
      await api.deleteCompound(compound.id);
      setCompounds((prev) => prev.filter((c) => c.id !== compound.id));
    } catch {
      // Keep the compound; the next load() reconciles.
    }
  }

  function handleSearchSelect(result: PubChemSearchResult) {
    setViewer(result);
    setEditor({ open: true, compound: { name: result.name, formula: result.formula, cid: result.cid } });
  }

  function handleView3d(compound: Compound) {
    if (compound.cid != null) setViewer({ cid: compound.cid, name: compound.name, formula: compound.formula });
  }

  async function handleElementView3d(element: Element) {
    const result = await pubchemSearchByName(element.name);
    if (result) setViewer(result);
  }

  return (
    <div className="min-h-screen bg-background dark:bg-background-dark">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur dark:border-border-dark dark:bg-background-dark/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <div className="flex items-center gap-3">
            <span
              className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium sm:inline-flex ${
                realtime
                  ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-secondary'
                  : 'bg-muted text-muted-foreground dark:bg-muted-dark dark:text-muted-foreground-dark'
              }`}
              title={realtime ? 'Live updates connected' : 'Live updates disconnected'}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${realtime ? 'bg-primary dark:bg-secondary' : 'bg-current'}`} aria-hidden="true" />
              {realtime ? 'Live' : 'Offline'}
            </span>
            <span className="hidden text-sm text-muted-foreground dark:text-muted-foreground-dark md:inline">{user?.name}</span>
            <Button variant="outline" size="md" onClick={() => { logout(); navigate('/login'); }}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Virtual Chemistry Lab</h1>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground-dark">
              Explore molecules from PubChem and build your own compound library.
            </p>
          </div>
          <Button variant="accent" size="lg" onClick={() => setEditor({ open: true, compound: null })}>
            + Save compound
          </Button>
        </div>

        <LabStats compounds={compounds} />

        <div className="grid gap-5 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader title="Periodic table" subtitle={selectedElement ? `${selectedElement.name} (${selectedElement.mass})` : 'Select an element'} />
            <CardContent>
              <PeriodicTable selected={selectedElement} onSelect={setSelectedElement} onView3d={handleElementView3d} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader title="Molecule explorer" subtitle="Search PubChem, view 3D structures" />
            <CardContent className="space-y-4">
              <MoleculeSearch busy={saving} onSelect={handleSearchSelect} />
              {viewer ? (
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">{viewer.name}</h3>
                    {viewer.formula ? <code className="rounded bg-muted px-1.5 py-0.5 text-xs dark:bg-muted-dark">{viewer.formula}</code> : null}
                  </div>
                  <MoleculeViewer cid={viewer.cid} name={viewer.name} formula={viewer.formula} />
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground dark:border-border-dark dark:text-muted-foreground-dark">
                  Search for a compound to show its 3D structure
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader title="My compounds" subtitle={`${compounds.length} saved`} />
          <CardContent>
            <CompoundList
              compounds={compounds}
              loading={loading}
              onView={handleView3d}
              onEdit={(compound) => setEditor({ open: true, compound })}
              onDelete={handleDelete}
              onCreate={() => setEditor({ open: true, compound: null })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Reaction lab" subtitle="Mix two compounds and observe the reaction" />
          <CardContent>
            <ReactionLab />
          </CardContent>
        </Card>
      </main>

      <Modal
        open={editor.open}
        title={editor.compound?.id ? 'Edit compound' : 'Save compound'}
        onClose={() => setEditor({ open: false, compound: null })}
      >
        <CompoundForm
          initial={editor.compound ?? undefined}
          submitting={saving}
          submitLabel={editor.compound?.id ? 'Save changes' : 'Save compound'}
          onSubmit={editor.compound?.id ? handleUpdate : handleCreate}
          onCancel={() => setEditor({ open: false, compound: null })}
        />
      </Modal>
    </div>
  );
}
