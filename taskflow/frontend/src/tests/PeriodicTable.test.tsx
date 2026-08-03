import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PeriodicTable } from '../components/PeriodicTable';
import { ELEMENTS } from '../lib/elements';

describe('PeriodicTable', () => {
  it('renders all 118 elements', () => {
    render(<PeriodicTable selected={null} onSelect={vi.fn()} />);
    const cells = screen.getAllByRole('button', { name: /atomic number/ });
    expect(cells).toHaveLength(118);
    expect(ELEMENTS).toHaveLength(118);
  });

  it('reports the selected element on click', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<PeriodicTable selected={null} onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: 'Carbon, atomic number 6' }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ sym: 'C', n: 6 }));
  });

  it('marks the selected element as pressed', () => {
    const carbon = ELEMENTS.find((e) => e.sym === 'C');
    render(<PeriodicTable selected={carbon ?? null} onSelect={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Carbon, atomic number 6' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens a detail popover on click and resolves 3D view', async () => {
    const user = userEvent.setup();
    const onView3d = vi.fn();
    render(<PeriodicTable selected={null} onSelect={vi.fn()} onView3d={onView3d} />);

    await user.click(screen.getByRole('button', { name: 'Iron, atomic number 26' }));
    expect(screen.getByRole('dialog', { name: 'Iron details' })).toBeInTheDocument();
    expect(screen.getByText('Electron config')).toBeInTheDocument();
    expect(screen.getByText('[Ar] 3d⁶ 4s²')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'View 3D structure' }));
    expect(onView3d).toHaveBeenCalledWith(expect.objectContaining({ sym: 'Fe', n: 26 }));
    expect(screen.queryByRole('dialog', { name: 'Iron details' })).not.toBeInTheDocument();
  });

  it('closes the popover on Escape', async () => {
    const user = userEvent.setup();
    render(<PeriodicTable selected={null} onSelect={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Hydrogen, atomic number 1' }));
    expect(screen.getByRole('dialog', { name: 'Hydrogen details' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Hydrogen details' })).not.toBeInTheDocument();
  });
});
