import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MoleculeSearch } from '../components/MoleculeSearch';

vi.mock('../lib/api', () => ({
  pubchemAutocomplete: vi.fn(),
  pubchemSearchByName: vi.fn(),
}));

const { pubchemAutocomplete, pubchemSearchByName } = await import('../lib/api');

describe('MoleculeSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches suggestions as the user types', async () => {
    const user = userEvent.setup();
    (pubchemAutocomplete as ReturnType<typeof vi.fn>).mockResolvedValue(['Aspirin', 'Aspartame']);
    render(<MoleculeSearch onSelect={vi.fn()} />);

    await user.type(screen.getByTestId('molecule-search-input'), 'asp');
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Aspirin' })).toBeInTheDocument();
    expect(pubchemAutocomplete).toHaveBeenCalledWith('asp');
  });

  it('selecting a suggestion resolves and reports the compound', async () => {
    const user = userEvent.setup();
    (pubchemAutocomplete as ReturnType<typeof vi.fn>).mockResolvedValue(['Aspirin']);
    (pubchemSearchByName as ReturnType<typeof vi.fn>).mockResolvedValue({ cid: 2244, name: 'Aspirin', formula: 'C9H8O4' });
    const onSelect = vi.fn();
    render(<MoleculeSearch onSelect={onSelect} />);

    await user.type(screen.getByTestId('molecule-search-input'), 'asp');
    await user.click(await screen.findByRole('option', { name: 'Aspirin' }));

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith({ cid: 2244, name: 'Aspirin', formula: 'C9H8O4' }));
    expect(pubchemSearchByName).toHaveBeenCalledWith('Aspirin');
  });

  it('shows an error when the compound cannot be resolved', async () => {
    const user = userEvent.setup();
    (pubchemAutocomplete as ReturnType<typeof vi.fn>).mockResolvedValue(['Nope']);
    (pubchemSearchByName as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    render(<MoleculeSearch onSelect={vi.fn()} />);

    await user.type(screen.getByTestId('molecule-search-input'), 'nope');
    await user.click(await screen.findByRole('option', { name: 'Nope' }));

    expect(await screen.findByText('Could not resolve that compound.')).toBeInTheDocument();
  });

  it('does not search for short queries', async () => {
    const user = userEvent.setup();
    render(<MoleculeSearch onSelect={vi.fn()} />);
    await user.type(screen.getByTestId('molecule-search-input'), 'a');
    expect(pubchemAutocomplete).not.toHaveBeenCalled();
  });
});
