import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompoundCard } from '../components/CompoundCard';

const compound = {
  id: 'c1',
  name: 'Aspirin',
  formula: 'C9H8O4',
  smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O',
  notes: 'Analgesic',
  cid: 2244,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('CompoundCard', () => {
  it('renders name, formula, CID, smiles and notes', () => {
    render(<CompoundCard compound={compound} onView={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Aspirin')).toBeInTheDocument();
    expect(screen.getByText('C9H8O4')).toBeInTheDocument();
    expect(screen.getByText('CID 2244')).toBeInTheDocument();
    expect(screen.getByText('Analgesic')).toBeInTheDocument();
    expect(screen.getByText('CC(=O)OC1=CC=CC=C1C(=O)O')).toBeInTheDocument();
  });

  it('invokes view, edit and delete handlers', async () => {
    const user = userEvent.setup();
    const onView = vi.fn();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<CompoundCard compound={compound} onView={onView} onEdit={onEdit} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: 'View 3D structure of Aspirin' }));
    await user.click(screen.getByRole('button', { name: 'Edit "Aspirin"' }));
    await user.click(screen.getByRole('button', { name: 'Delete "Aspirin"' }));

    expect(onView).toHaveBeenCalledWith(compound);
    expect(onEdit).toHaveBeenCalledWith(compound);
    expect(onDelete).toHaveBeenCalledWith(compound);
  });

  it('hides the 3D button and badges when data is missing', () => {
    render(
      <CompoundCard
        compound={{ ...compound, cid: null, formula: '', smiles: '' }}
        onView={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: /View 3D/ })).not.toBeInTheDocument();
    expect(screen.queryByText('CID 2244')).not.toBeInTheDocument();
  });
});
