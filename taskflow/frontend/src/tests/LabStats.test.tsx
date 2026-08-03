import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LabStats } from '../components/LabStats';

describe('LabStats', () => {
  it('counts compounds, 3D structures and formulas', () => {
    render(
      <LabStats
        compounds={[
          { id: 'c1', name: 'Water', formula: 'H2O', smiles: '', notes: '', cid: 962, createdAt: '', updatedAt: '' },
          { id: 'c2', name: 'Salt', formula: 'NaCl', smiles: '', notes: '', cid: null, createdAt: '', updatedAt: '' },
          { id: 'c3', name: 'Mystery', formula: '', smiles: '', notes: '', cid: null, createdAt: '', updatedAt: '' },
        ]}
      />
    );
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Saved compounds')).toBeInTheDocument();
    expect(screen.getByText('With 3D structure')).toBeInTheDocument();
    expect(screen.getByText('With formula')).toBeInTheDocument();
  });
});
