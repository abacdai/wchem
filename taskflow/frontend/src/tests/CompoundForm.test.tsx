import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CompoundForm } from '../components/CompoundForm';

describe('CompoundForm', () => {
  it('submits trimmed compound data', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CompoundForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Name'), '  Aspirin  ');
    await user.type(screen.getByLabelText('Formula'), 'C9H8O4');
    await user.type(screen.getByLabelText('SMILES'), 'CC(=O)OC1=CC=CC=C1C(=O)O');
    await user.type(screen.getByTestId('cid-input'), '2244');
    await user.type(screen.getByLabelText('Notes'), 'Take with food');
    await user.click(screen.getByRole('button', { name: 'Save compound' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Aspirin',
      formula: 'C9H8O4',
      smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O',
      notes: 'Take with food',
      cid: 2244,
    });
  });

  it('requires a name', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CompoundForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: 'Save compound' }));
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('allows saving without a CID', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CompoundForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Name'), 'Tap water');
    await user.click(screen.getByRole('button', { name: 'Save compound' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ cid: null }));
  });

  it('prefills from an existing compound and shows edit labels', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <CompoundForm
        initial={{ name: 'Caffeine', formula: 'C8H10N4O2', cid: 2519, notes: 'Stimulant' }}
        submitLabel="Save changes"
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByLabelText('Name')).toHaveValue('Caffeine');
    expect(screen.getByTestId('cid-input')).toHaveValue(2519);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: 'Caffeine', cid: 2519 }));
  });

  it('calls onCancel when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<CompoundForm onSubmit={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
