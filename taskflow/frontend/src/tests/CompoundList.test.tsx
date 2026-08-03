import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompoundList } from '../components/CompoundList';

const compounds = [
  { id: 'c1', name: 'Water', formula: 'H2O', smiles: 'O', notes: '', cid: 962, createdAt: '', updatedAt: '' },
  { id: 'c2', name: 'Caffeine', formula: 'C8H10N4O2', smiles: '', notes: '', cid: 2519, createdAt: '', updatedAt: '' },
];

describe('CompoundList', () => {
  it('shows a loading spinner while loading', () => {
    render(<CompoundList compounds={[]} loading onView={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onCreate={vi.fn()} />);
    expect(screen.getByRole('status', { name: 'Loading compounds' })).toBeInTheDocument();
  });

  it('shows the empty state with a create action', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<CompoundList compounds={[]} loading={false} onView={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onCreate={onCreate} />);
    expect(screen.getByText('No compounds saved yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '+ Save a compound' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('renders a card per compound', () => {
    render(<CompoundList compounds={compounds} loading={false} onView={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} onCreate={vi.fn()} />);
    expect(screen.getByText('Water')).toBeInTheDocument();
    expect(screen.getByText('Caffeine')).toBeInTheDocument();
  });
});
