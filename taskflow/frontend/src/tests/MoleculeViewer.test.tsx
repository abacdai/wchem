import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MoleculeViewer } from '../components/MoleculeViewer';
import { compoundPhase, LabGlassware, PHASE_LABEL } from '../components/LabGlassware';
import { PhaseView } from '../components/PhaseView';

function stubViewer() {
  const viewer = {
    addModel: vi.fn(),
    setStyle: vi.fn(),
    zoomTo: vi.fn(),
    render: vi.fn(),
    removeAllModels: vi.fn(),
    clear: vi.fn(),
  };
  window.$3Dmol = { createViewer: vi.fn(() => viewer) };
  return viewer;
}

describe('MoleculeViewer', () => {
  afterEach(() => {
    delete window.$3Dmol;
    vi.unstubAllGlobals();
  });

  it('loads the SDF from PubChem and renders it', async () => {
    const viewer = stubViewer();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('M  END', { status: 200 })));
    render(<MoleculeViewer cid={2244} name="Aspirin" />);

    await waitFor(() => expect(viewer.addModel).toHaveBeenCalledWith('M  END', 'sdf'));
    expect(viewer.setStyle).toHaveBeenCalled();
    expect(viewer.zoomTo).toHaveBeenCalled();
    expect(viewer.render).toHaveBeenCalled();
    expect(screen.getByTestId('molecule-viewer')).toBeInTheDocument();
  });

  it('shows an error message when PubChem fails', async () => {
    const viewer = stubViewer();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));
    render(<MoleculeViewer cid={2244} name="Aspirin" />);
    expect(await screen.findByText(/Could not load the 3D structure/)).toBeInTheDocument();
    expect(viewer.addModel).not.toHaveBeenCalled();
  });

  it('degrades gracefully when 3Dmol.js is not loaded', () => {
    render(<MoleculeViewer cid={2244} name="Aspirin" />);
    expect(screen.getByText(/3D viewer unavailable/)).toBeInTheDocument();
  });

  it('switches between structure and state-of-matter views', async () => {
    const user = (await import('@testing-library/user-event')).default;
    vi.stubGlobal('fetch', vi.fn(async () => new Response('M  END', { status: 200 })));
    render(<MoleculeViewer cid={962} name="Water" formula="H2O" />);

    expect(screen.getByTestId('molecule-viewer')).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'State of matter' }));
    expect(screen.getByTestId('phase-view')).toBeInTheDocument();
    expect(screen.queryByTestId('molecule-viewer')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Structure' }));
    expect(screen.getByTestId('molecule-viewer')).toBeInTheDocument();
  });
});

describe('PhaseView', () => {
  it('shows a liquid state for water', () => {
    render(<PhaseView name="Water" formula="H2O" />);
    expect(screen.getByTestId('phase-view')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAccessibleName('Water shown as liquid');
    expect(screen.getByText('Liquid')).toBeInTheDocument();
  });

  it('shows a solid state for iron', () => {
    render(<PhaseView name="Iron" formula="Fe" />);
    expect(screen.getByRole('img')).toHaveAccessibleName('Iron shown as solid');
    expect(screen.getByText('Solid')).toBeInTheDocument();
  });

  it('shows a gas state for carbon dioxide', () => {
    render(<PhaseView name="Carbon dioxide" formula="CO2" />);
    expect(screen.getByRole('img')).toHaveAccessibleName('Carbon dioxide shown as gas');
    expect(screen.getByText('Gas')).toBeInTheDocument();
  });
});

describe('compoundPhase', () => {
  it('maps common compounds to their room-temperature phase', () => {
    expect(compoundPhase('H2O')).toBe('liquid');
    expect(compoundPhase('CO2')).toBe('gas');
    expect(compoundPhase('Fe')).toBe('solid');
    expect(compoundPhase('NaCl')).toBe('solid');
    expect(compoundPhase('C2H5OH')).toBe('liquid');
  });

  it('defaults to solid for unknown or missing formulas', () => {
    expect(compoundPhase('C100H200N300')).toBe('solid');
    expect(compoundPhase('')).toBe('solid');
    expect(compoundPhase(undefined)).toBe('solid');
  });

  it('normalizes formula formatting before lookup', () => {
    expect(compoundPhase('h2o')).toBe('liquid');
    expect(compoundPhase('Fe ')).toBe('solid');
  });
});

describe('LabGlassware', () => {
  it('renders the three glassware pieces with the phase label', () => {
    render(<LabGlassware name="Water" formula="H2O" />);
    expect(screen.getByText('Lab bench — Water')).toBeInTheDocument();
    expect(screen.getByText(`${PHASE_LABEL.liquid} at room temperature`)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Beaker with compound' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Test tube with compound' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Graduated cylinder with compound' })).toBeInTheDocument();
  });

  it('switches active glassware on click', async () => {
    const user = (await import('@testing-library/user-event')).default;
    render(<LabGlassware name="Iron" formula="Fe" />);
    const tube = screen.getByRole('button', { name: 'Show Test tube glassware' });
    expect(tube).toHaveAttribute('aria-pressed', 'false');
    await user.click(tube);
    expect(tube).toHaveAttribute('aria-pressed', 'true');
  });
});
