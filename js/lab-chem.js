/* js/lab-chem.js — Chemistry reaction engine (Layer 3, T-054).
    Maps reactant substances to products using the curated reaction
    database. Supports condition checks (heating, catalyst) so the
    simulation only triggers reactions when the vessel meets the
    required conditions. Pure JS, no external dependencies. */
(function () {
  'use strict';

  var REACTIONS = [
    {
      id: 'acid-base',
      reactants: ['HCl', 'NaOH'],
      products: ['NaCl', 'H2O'],
      balanced: 'HCl(aq) + NaOH(aq) → NaCl(aq) + H2O(l)',
      type: 'Neutralization',
      note: 'Acid + base → salt + water. Strong fizzing, temperature rises.',
      conditions: [],
    },
    {
      id: 'vinegar-baking-soda',
      reactants: ['CH3COOH', 'NaHCO3'],
      products: ['CH3COONa', 'H2O', 'CO2'],
      balanced: 'CH3COOH(aq) + NaHCO3(s) → CH3COONa(aq) + H2O(l) + CO2(g)',
      type: 'Acid–carbonate',
      note: 'Classic volcano: rapid bubbling from CO2 gas release.',
      conditions: [],
    },
    {
      id: 'combustion-methane',
      reactants: ['CH4', 'O2'],
      products: ['CO2', 'H2O'],
      balanced: 'CH4(g) + 2 O2(g) → CO2(g) + 2 H2O(g)',
      type: 'Combustion',
      note: 'Exothermic flame; produces heat, CO2 and water vapor.',
      conditions: ['heat'],
    },
    {
      id: 'iron-rust',
      reactants: ['Fe', 'O2'],
      products: ['Fe2O3'],
      balanced: '4 Fe(s) + 3 O2(g) → 2 Fe2O3(s)',
      type: 'Oxidation',
      note: 'Slow rusting in the presence of water and air.',
      conditions: [],
    },
    {
      id: 'electrolysis-water',
      reactants: ['H2O', 'H2O'],
      products: ['H2', 'O2'],
      balanced: '2 H2O(l) → 2 H2(g) + O2(g)',
      type: 'Electrolysis',
      note: 'Electric current splits water into hydrogen and oxygen gas.',
      conditions: ['catalyst'],
    },
    {
      id: 'copper-sulfate-naoh',
      reactants: ['CuSO4', 'NaOH'],
      products: ['Cu(OH)2', 'Na2SO4'],
      balanced: 'CuSO4(aq) + 2 NaOH(aq) → Cu(OH)2(s) + Na2SO4(aq)',
      type: 'Precipitation',
      note: 'Blue copper(II) hydroxide precipitate forms; solution turns from blue to pale green.',
      conditions: [],
    },
    {
      id: 'hydrochloric-acid-naoh',
      reactants: ['HCl', 'NaOH'],
      products: ['NaCl', 'H2O'],
      balanced: 'HCl(aq) + NaOH(aq) → NaCl(aq) + H2O(l)',
      type: 'Neutralization',
      note: 'Acid + base → salt + water. Exothermic, pH moves toward 7.',
      conditions: [],
    },
    {
      id: 'calcium-carbonate-acid',
      reactants: ['CaCO3', 'HCl'],
      products: ['CaCl2', 'H2O', 'CO2'],
      balanced: 'CaCO3(s) + 2 HCl(aq) → CaCl2(aq) + H2O(l) + CO2(g)',
      type: 'Acid–carbonate',
      note: 'Fizzing as CO2 is released; solid dissolves.',
      conditions: [],
    },
    {
      id: 'iron-chloride-naoh',
      reactants: ['FeCl3', 'NaOH'],
      products: ['Fe(OH)3', 'NaCl'],
      balanced: 'FeCl3(aq) + 3 NaOH(aq) → Fe(OH)3(s) + 3 NaCl(aq)',
      type: 'Precipitation',
      note: 'Reddish-brown iron(III) hydroxide precipitate forms.',
      conditions: [],
    },
    {
      id: 'sodium-carbonate-acid',
      reactants: ['Na2CO3', 'HCl'],
      products: ['NaCl', 'H2O', 'CO2'],
      balanced: 'Na2CO3(s) + 2 HCl(aq) → 2 NaCl(aq) + H2O(l) + CO2(g)',
      type: 'Acid–carbonate',
      note: 'Effervescence as CO2 is released.',
      conditions: [],
    },
  ];

  var REACTION_MAP = {};
  var i;
  for (i = 0; i < REACTIONS.length; i++) {
    var r = REACTIONS[i];
    var key = r.reactants.slice().sort().join('+');
    REACTION_MAP[key] = r;
  }

  function findReaction(reactantFormulas) {
    if (!reactantFormulas || reactantFormulas.length === 0) return null;
    var sorted = reactantFormulas.slice().sort();
    var key = sorted.join('+');
    return REACTION_MAP[key] || null;
  }

  function checkConditions(reaction, vesselState) {
    if (!reaction || !reaction.conditions || reaction.conditions.length === 0) return true;
    if (!vesselState) return false;
    for (var i = 0; i < reaction.conditions.length; i++) {
      var cond = reaction.conditions[i];
      if (cond === 'heat' && !vesselState.heating) return false;
      if (cond === 'catalyst' && !vesselState.catalyst) return false;
    }
    return true;
  }

  function react(vesselA, vesselB) {
    var formulas = [vesselA.state.substance, vesselB.state.substance];
    var reaction = findReaction(formulas);
    if (!reaction) return null;
    if (!checkConditions(reaction, vesselA.state) && !checkConditions(reaction, vesselB.state)) return null;
    return reaction;
  }

  var api = {
    REACTIONS: REACTIONS,
    findReaction: findReaction,
    checkConditions: checkConditions,
    react: react,
  };
  window.LabChem = api;

  function init() {
    if (typeof document !== 'undefined' && document.getElementById('lab-bench')) {
      window.labChem = api;
    }
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }
})();