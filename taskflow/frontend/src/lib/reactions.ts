export interface Reactant {
  formula: string;
  name: string;
  phase: 'aq' | 's' | 'l' | 'g';
}

export interface Reaction {
  id: string;
  reactants: [Reactant, Reactant];
  products: Reactant[];
  balanced: string;
  type: string;
  note: string;
}

export const REACTIONS: Reaction[] = [
  {
    id: 'acid-base',
    reactants: [
      { formula: 'HCl', name: 'Hydrochloric acid', phase: 'aq' },
      { formula: 'NaOH', name: 'Sodium hydroxide', phase: 'aq' },
    ],
    products: [
      { formula: 'NaCl', name: 'Sodium chloride', phase: 'aq' },
      { formula: 'H2O', name: 'Water', phase: 'l' },
    ],
    balanced: 'HCl(aq) + NaOH(aq) → NaCl(aq) + H2O(l)',
    type: 'Neutralization',
    note: 'Acid + base → salt + water. Strong fizzing, temperature rises.',
  },
  {
    id: 'vinegar-baking-soda',
    reactants: [
      { formula: 'CH3COOH', name: 'Acetic acid (vinegar)', phase: 'aq' },
      { formula: 'NaHCO3', name: 'Sodium bicarbonate', phase: 's' },
    ],
    products: [
      { formula: 'CH3COONa', name: 'Sodium acetate', phase: 'aq' },
      { formula: 'H2O', name: 'Water', phase: 'l' },
      { formula: 'CO2', name: 'Carbon dioxide', phase: 'g' },
    ],
    balanced: 'CH3COOH(aq) + NaHCO3(s) → CH3COONa(aq) + H2O(l) + CO2(g)',
    type: 'Acid–carbonate',
    note: 'Classic volcano: rapid bubbling from CO2 gas release.',
  },
  {
    id: 'combustion-methane',
    reactants: [
      { formula: 'CH4', name: 'Methane', phase: 'g' },
      { formula: 'O2', name: 'Oxygen', phase: 'g' },
    ],
    products: [
      { formula: 'CO2', name: 'Carbon dioxide', phase: 'g' },
      { formula: 'H2O', name: 'Water', phase: 'g' },
    ],
    balanced: 'CH4(g) + 2 O2(g) → CO2(g) + 2 H2O(g)',
    type: 'Combustion',
    note: 'Exothermic flame; produces heat, CO2 and water vapor.',
  },
  {
    id: 'iron-rust',
    reactants: [
      { formula: 'Fe', name: 'Iron', phase: 's' },
      { formula: 'O2', name: 'Oxygen', phase: 'g' },
    ],
    products: [{ formula: 'Fe2O3', name: 'Iron(III) oxide (rust)', phase: 's' }],
    balanced: '4 Fe(s) + 3 O2(g) → 2 Fe2O3(s)',
    type: 'Oxidation',
    note: 'Slow rusting in the presence of water and air.',
  },
  {
    id: 'electrolysis-water',
    reactants: [
      { formula: 'H2O', name: 'Water', phase: 'l' },
      { formula: 'H2O', name: 'Water', phase: 'l' },
    ],
    products: [
      { formula: 'H2', name: 'Hydrogen', phase: 'g' },
      { formula: 'O2', name: 'Oxygen', phase: 'g' },
    ],
    balanced: '2 H2O(l) → 2 H2(g) + O2(g)',
    type: 'Electrolysis',
    note: 'Electric current splits water into hydrogen and oxygen gas.',
  },
];

export function findReaction(a: string, b: string): Reaction | null {
  if (!a || !b) return null;
  const na = a.toUpperCase();
  const nb = b.toUpperCase();
  for (const r of REACTIONS) {
    const [r1, r2] = r.reactants;
    const set = new Set([r1.formula.toUpperCase(), r2.formula.toUpperCase()]);
    if (set.has(na) && set.has(nb)) return r;
  }
  return null;
}

export function phaseGlyph(phase: Reactant['phase']): string {
  const map: Record<Reactant['phase'], string> = { aq: '(aq)', s: '(s)', l: '(l)', g: '(g)' };
  return map[phase];
}