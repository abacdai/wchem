import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ReactionLab } from '../components/ReactionLab';
import { findReaction, phaseGlyph, REACTIONS } from '../lib/reactions';

describe('findReaction', () => {
  it('matches a known pair regardless of order', () => {
    const r1 = findReaction('HCl', 'NaOH');
    const r2 = findReaction('NaOH', 'HCl');
    expect(r1?.id).toBe('acid-base');
    expect(r2?.id).toBe('acid-base');
  });

  it('returns null for unknown pairs or empty input', () => {
    expect(findReaction('H2O', 'NaCl')).toBeNull();
    expect(findReaction('', 'NaOH')).toBeNull();
    expect(findReaction('HCl', '')).toBeNull();
  });

  it('ignores case', () => {
    expect(findReaction('hcl', 'naoh')).not.toBeNull();
  });

  it('has unique reactant options', () => {
    const seen = new Set(REACTIONS.flatMap((r) => r.reactants.map((x) => x.formula.toUpperCase())));
    expect(seen.size).toBeGreaterThan(3);
  });
});

describe('phaseGlyph', () => {
  it('maps phases to state symbols', () => {
    expect(phaseGlyph('aq')).toBe('(aq)');
    expect(phaseGlyph('s')).toBe('(s)');
    expect(phaseGlyph('l')).toBe('(l)');
    expect(phaseGlyph('g')).toBe('(g)');
  });
});

describe('ReactionLab', () => {
  it('shows a placeholder before reactants are chosen', () => {
    render(<ReactionLab />);
    expect(screen.getByText(/Pick two compounds/)).toBeInTheDocument();
  });

  it('shows the balanced equation when a known pair is selected', async () => {
    const user = userEvent.setup();
    render(<ReactionLab />);
    await user.selectOptions(screen.getByLabelText('Reactant A'), 'HCl');
    await user.selectOptions(screen.getByLabelText('Reactant B'), 'NaOH');
    expect(screen.getByTestId('reaction-equation')).toHaveTextContent('HCl(aq) + NaOH(aq) → NaCl(aq) + H2O(l)');
    expect(screen.getByText('Neutralization')).toBeInTheDocument();
    expect(screen.getByText(/Sodium chloride/)).toBeInTheDocument();
  });

  it('clears the equation when the pair no longer matches', async () => {
    const user = userEvent.setup();
    render(<ReactionLab />);
    await user.selectOptions(screen.getByLabelText('Reactant A'), 'HCl');
    await user.selectOptions(screen.getByLabelText('Reactant B'), 'NaOH');
    expect(screen.getByTestId('reaction-equation')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Reactant B'), 'H2O');
    expect(screen.queryByTestId('reaction-equation')).not.toBeInTheDocument();
    expect(screen.getByText(/Pick two compounds/)).toBeInTheDocument();
  });
});