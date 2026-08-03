import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LabPage } from '../pages/LabPage';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', name: 'Chemist', email: 'chem@lab.io' },
    initializing: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('../lib/api', () => ({
  api: {
    listCompounds: vi.fn(),
    createCompound: vi.fn(),
    updateCompound: vi.fn(),
    deleteCompound: vi.fn(),
  },
  pubchemAutocomplete: vi.fn(),
  pubchemSearchByName: vi.fn(),
}));

vi.mock('../lib/socket', () => ({
  getSocket: vi.fn(() => ({ on: vi.fn(), off: vi.fn(), connected: true })),
}));

const { api } = await import('../lib/api');

const saved = [
  { id: 'c1', name: 'Water', formula: 'H2O', smiles: 'O', notes: 'Universal solvent', cid: 962, createdAt: '', updatedAt: '' },
];

function renderLab() {
  return render(
    <MemoryRouter>
      <LabPage />
    </MemoryRouter>
  );
}

describe('LabPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.listCompounds as ReturnType<typeof vi.fn>).mockResolvedValue({
      compounds: saved,
      pagination: { page: 1, limit: 24, total: 1, pages: 1 },
    });
  });

  it('loads and shows saved compounds and stats', async () => {
    renderLab();
    expect(await screen.findByText('Water')).toBeInTheDocument();
    expect(screen.getByText('Virtual Chemistry Lab')).toBeInTheDocument();
    expect(api.listCompounds).toHaveBeenCalledTimes(1);
  });

  it('creates a compound from the form', async () => {
    const user = userEvent.setup();
    (api.createCompound as ReturnType<typeof vi.fn>).mockResolvedValue({
      compound: { id: 'c2', name: 'Caffeine', formula: 'C8H10N4O2', smiles: '', notes: '', cid: 2519, createdAt: '', updatedAt: '' },
    });
    renderLab();
    await screen.findByText('Water');

    await user.click(screen.getByRole('button', { name: '+ Save compound' }));
    await user.type(screen.getByLabelText('Name'), 'Caffeine');
    await user.type(screen.getByLabelText('Formula'), 'C8H10N4O2');
    await user.type(screen.getByTestId('cid-input'), '2519');
    await user.click(screen.getByRole('button', { name: 'Save compound' }));

    await waitFor(() => expect(api.createCompound).toHaveBeenCalledWith(expect.objectContaining({ name: 'Caffeine', cid: 2519 })));
    expect(await screen.findByText('Caffeine')).toBeInTheDocument();
  });

  it('deletes a compound', async () => {
    const user = userEvent.setup();
    (api.deleteCompound as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    renderLab();
    await screen.findByText('Water');

    await user.click(screen.getByRole('button', { name: 'Delete "Water"' }));
    await waitFor(() => expect(api.deleteCompound).toHaveBeenCalledWith('c1'));
    expect(screen.queryByText('Water')).not.toBeInTheDocument();
  });

  it('shows the empty state when there are no compounds', async () => {
    (api.listCompounds as ReturnType<typeof vi.fn>).mockResolvedValue({
      compounds: [],
      pagination: { page: 1, limit: 24, total: 0, pages: 1 },
    });
    renderLab();
    expect(await screen.findByText('No compounds saved yet')).toBeInTheDocument();
  });

  it('selects an element from the periodic table', async () => {
    const user = userEvent.setup();
    renderLab();
    await screen.findByText('Water');
    await user.click(screen.getByRole('button', { name: 'Carbon, atomic number 6' }));
    expect(await screen.findByText('Carbon (12.011)')).toBeInTheDocument();
  });

  it('shows the 3D viewer placeholder before a search', async () => {
    renderLab();
    expect(await screen.findByText(/Search for a compound to show its 3D structure/)).toBeInTheDocument();
  });
});
