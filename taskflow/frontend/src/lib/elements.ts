export interface Element {
  n: number;
  sym: string;
  name: string;
  mass: number;
  cat: 'alkali' | 'alkaline' | 'transition' | 'post-transition' | 'metalloid' | 'nonmetal' | 'halogen' | 'noble' | 'lanthanide' | 'actinide' | 'unknown';
  group: number;
  period: number;
  block: 's' | 'p' | 'd' | 'f';
  phase: 'gas' | 'liquid' | 'solid' | 'predicted';
  electron: string;
}

export const ELEMENTS: Element[] = [
  { n: 1, sym: 'H', name: 'Hydrogen', mass: 1.008, cat: 'nonmetal', group: 1, period: 1, block: 's', phase: 'gas', electron: '1s¹' },
  { n: 2, sym: 'He', name: 'Helium', mass: 4.003, cat: 'noble', group: 18, period: 1, block: 's', phase: 'gas', electron: '1s²' },
  { n: 3, sym: 'Li', name: 'Lithium', mass: 6.94, cat: 'alkali', group: 1, period: 2, block: 's', phase: 'solid', electron: '[He] 2s¹' },
  { n: 4, sym: 'Be', name: 'Beryllium', mass: 9.012, cat: 'alkaline', group: 2, period: 2, block: 's', phase: 'solid', electron: '[He] 2s²' },
  { n: 5, sym: 'B', name: 'Boron', mass: 10.81, cat: 'metalloid', group: 13, period: 2, block: 'p', phase: 'solid', electron: '[He] 2s² 2p¹' },
  { n: 6, sym: 'C', name: 'Carbon', mass: 12.011, cat: 'nonmetal', group: 14, period: 2, block: 'p', phase: 'solid', electron: '[He] 2s² 2p²' },
  { n: 7, sym: 'N', name: 'Nitrogen', mass: 14.007, cat: 'nonmetal', group: 15, period: 2, block: 'p', phase: 'gas', electron: '[He] 2s² 2p³' },
  { n: 8, sym: 'O', name: 'Oxygen', mass: 15.999, cat: 'nonmetal', group: 16, period: 2, block: 'p', phase: 'gas', electron: '[He] 2s² 2p⁴' },
  { n: 9, sym: 'F', name: 'Fluorine', mass: 18.998, cat: 'halogen', group: 17, period: 2, block: 'p', phase: 'gas', electron: '[He] 2s² 2p⁵' },
  { n: 10, sym: 'Ne', name: 'Neon', mass: 20.18, cat: 'noble', group: 18, period: 2, block: 'p', phase: 'gas', electron: '[He] 2s² 2p⁶' },
  { n: 11, sym: 'Na', name: 'Sodium', mass: 22.99, cat: 'alkali', group: 1, period: 3, block: 's', phase: 'solid', electron: '[Ne] 3s¹' },
  { n: 12, sym: 'Mg', name: 'Magnesium', mass: 24.305, cat: 'alkaline', group: 2, period: 3, block: 's', phase: 'solid', electron: '[Ne] 3s²' },
  { n: 13, sym: 'Al', name: 'Aluminium', mass: 26.982, cat: 'post-transition', group: 13, period: 3, block: 'p', phase: 'solid', electron: '[Ne] 3s² 3p¹' },
  { n: 14, sym: 'Si', name: 'Silicon', mass: 28.085, cat: 'metalloid', group: 14, period: 3, block: 'p', phase: 'solid', electron: '[Ne] 3s² 3p²' },
  { n: 15, sym: 'P', name: 'Phosphorus', mass: 30.974, cat: 'nonmetal', group: 15, period: 3, block: 'p', phase: 'solid', electron: '[Ne] 3s² 3p³' },
  { n: 16, sym: 'S', name: 'Sulfur', mass: 32.06, cat: 'nonmetal', group: 16, period: 3, block: 'p', phase: 'solid', electron: '[Ne] 3s² 3p⁴' },
  { n: 17, sym: 'Cl', name: 'Chlorine', mass: 35.45, cat: 'halogen', group: 17, period: 3, block: 'p', phase: 'gas', electron: '[Ne] 3s² 3p⁵' },
  { n: 18, sym: 'Ar', name: 'Argon', mass: 39.948, cat: 'noble', group: 18, period: 3, block: 'p', phase: 'gas', electron: '[Ne] 3s² 3p⁶' },
  { n: 19, sym: 'K', name: 'Potassium', mass: 39.098, cat: 'alkali', group: 1, period: 4, block: 's', phase: 'solid', electron: '[Ar] 4s¹' },
  { n: 20, sym: 'Ca', name: 'Calcium', mass: 40.078, cat: 'alkaline', group: 2, period: 4, block: 's', phase: 'solid', electron: '[Ar] 4s²' },
  { n: 21, sym: 'Sc', name: 'Scandium', mass: 44.956, cat: 'transition', group: 3, period: 4, block: 'd', phase: 'solid', electron: '[Ar] 3d¹ 4s²' },
  { n: 22, sym: 'Ti', name: 'Titanium', mass: 47.867, cat: 'transition', group: 4, period: 4, block: 'd', phase: 'solid', electron: '[Ar] 3d² 4s²' },
  { n: 23, sym: 'V', name: 'Vanadium', mass: 50.942, cat: 'transition', group: 5, period: 4, block: 'd', phase: 'solid', electron: '[Ar] 3d³ 4s²' },
  { n: 24, sym: 'Cr', name: 'Chromium', mass: 51.996, cat: 'transition', group: 6, period: 4, block: 'd', phase: 'solid', electron: '[Ar] 3d⁵ 4s¹' },
  { n: 25, sym: 'Mn', name: 'Manganese', mass: 54.938, cat: 'transition', group: 7, period: 4, block: 'd', phase: 'solid', electron: '[Ar] 3d⁵ 4s²' },
  { n: 26, sym: 'Fe', name: 'Iron', mass: 55.845, cat: 'transition', group: 8, period: 4, block: 'd', phase: 'solid', electron: '[Ar] 3d⁶ 4s²' },
  { n: 27, sym: 'Co', name: 'Cobalt', mass: 58.933, cat: 'transition', group: 9, period: 4, block: 'd', phase: 'solid', electron: '[Ar] 3d⁷ 4s²' },
  { n: 28, sym: 'Ni', name: 'Nickel', mass: 58.693, cat: 'transition', group: 10, period: 4, block: 'd', phase: 'solid', electron: '[Ar] 3d⁸ 4s²' },
  { n: 29, sym: 'Cu', name: 'Copper', mass: 63.546, cat: 'transition', group: 11, period: 4, block: 'd', phase: 'solid', electron: '[Ar] 3d¹⁰ 4s¹' },
  { n: 30, sym: 'Zn', name: 'Zinc', mass: 65.38, cat: 'transition', group: 12, period: 4, block: 'd', phase: 'solid', electron: '[Ar] 3d¹⁰ 4s²' },
  { n: 31, sym: 'Ga', name: 'Gallium', mass: 69.723, cat: 'post-transition', group: 13, period: 4, block: 'p', phase: 'solid', electron: '[Ar] 3d¹⁰ 4s² 4p¹' },
  { n: 32, sym: 'Ge', name: 'Germanium', mass: 72.63, cat: 'metalloid', group: 14, period: 4, block: 'p', phase: 'solid', electron: '[Ar] 3d¹⁰ 4s² 4p²' },
  { n: 33, sym: 'As', name: 'Arsenic', mass: 74.922, cat: 'metalloid', group: 15, period: 4, block: 'p', phase: 'solid', electron: '[Ar] 3d¹⁰ 4s² 4p³' },
  { n: 34, sym: 'Se', name: 'Selenium', mass: 78.971, cat: 'nonmetal', group: 16, period: 4, block: 'p', phase: 'solid', electron: '[Ar] 3d¹⁰ 4s² 4p⁴' },
  { n: 35, sym: 'Br', name: 'Bromine', mass: 79.904, cat: 'halogen', group: 17, period: 4, block: 'p', phase: 'liquid', electron: '[Ar] 3d¹⁰ 4s² 4p⁵' },
  { n: 36, sym: 'Kr', name: 'Krypton', mass: 83.798, cat: 'noble', group: 18, period: 4, block: 'p', phase: 'gas', electron: '[Ar] 3d¹⁰ 4s² 4p⁶' },
  { n: 37, sym: 'Rb', name: 'Rubidium', mass: 85.468, cat: 'alkali', group: 1, period: 5, block: 's', phase: 'solid', electron: '[Kr] 5s¹' },
  { n: 38, sym: 'Sr', name: 'Strontium', mass: 87.62, cat: 'alkaline', group: 2, period: 5, block: 's', phase: 'solid', electron: '[Kr] 5s²' },
  { n: 39, sym: 'Y', name: 'Yttrium', mass: 88.906, cat: 'transition', group: 3, period: 5, block: 'd', phase: 'solid', electron: '[Kr] 4d¹ 5s²' },
  { n: 40, sym: 'Zr', name: 'Zirconium', mass: 91.224, cat: 'transition', group: 4, period: 5, block: 'd', phase: 'solid', electron: '[Kr] 4d² 5s²' },
  { n: 41, sym: 'Nb', name: 'Niobium', mass: 92.906, cat: 'transition', group: 5, period: 5, block: 'd', phase: 'solid', electron: '[Kr] 4d⁴ 5s¹' },
  { n: 42, sym: 'Mo', name: 'Molybdenum', mass: 95.95, cat: 'transition', group: 6, period: 5, block: 'd', phase: 'solid', electron: '[Kr] 4d⁵ 5s¹' },
  { n: 43, sym: 'Tc', name: 'Technetium', mass: 98, cat: 'transition', group: 7, period: 5, block: 'd', phase: 'solid', electron: '[Kr] 4d⁵ 5s²' },
  { n: 44, sym: 'Ru', name: 'Ruthenium', mass: 101.07, cat: 'transition', group: 8, period: 5, block: 'd', phase: 'solid', electron: '[Kr] 4d⁷ 5s¹' },
  { n: 45, sym: 'Rh', name: 'Rhodium', mass: 102.906, cat: 'transition', group: 9, period: 5, block: 'd', phase: 'solid', electron: '[Kr] 4d⁸ 5s¹' },
  { n: 46, sym: 'Pd', name: 'Palladium', mass: 106.42, cat: 'transition', group: 10, period: 5, block: 'd', phase: 'solid', electron: '[Kr] 4d¹⁰' },
  { n: 47, sym: 'Ag', name: 'Silver', mass: 107.868, cat: 'transition', group: 11, period: 5, block: 'd', phase: 'solid', electron: '[Kr] 4d¹⁰ 5s¹' },
  { n: 48, sym: 'Cd', name: 'Cadmium', mass: 112.414, cat: 'transition', group: 12, period: 5, block: 'd', phase: 'solid', electron: '[Kr] 4d¹⁰ 5s²' },
  { n: 49, sym: 'In', name: 'Indium', mass: 114.818, cat: 'post-transition', group: 13, period: 5, block: 'p', phase: 'solid', electron: '[Kr] 4d¹⁰ 5s² 5p¹' },
  { n: 50, sym: 'Sn', name: 'Tin', mass: 118.71, cat: 'post-transition', group: 14, period: 5, block: 'p', phase: 'solid', electron: '[Kr] 4d¹⁰ 5s² 5p²' },
  { n: 51, sym: 'Sb', name: 'Antimony', mass: 121.76, cat: 'metalloid', group: 15, period: 5, block: 'p', phase: 'solid', electron: '[Kr] 4d¹⁰ 5s² 5p³' },
  { n: 52, sym: 'Te', name: 'Tellurium', mass: 127.6, cat: 'metalloid', group: 16, period: 5, block: 'p', phase: 'solid', electron: '[Kr] 4d¹⁰ 5s² 5p⁴' },
  { n: 53, sym: 'I', name: 'Iodine', mass: 126.904, cat: 'halogen', group: 17, period: 5, block: 'p', phase: 'solid', electron: '[Kr] 4d¹⁰ 5s² 5p⁵' },
  { n: 54, sym: 'Xe', name: 'Xenon', mass: 131.293, cat: 'noble', group: 18, period: 5, block: 'p', phase: 'gas', electron: '[Kr] 4d¹⁰ 5s² 5p⁶' },
  { n: 55, sym: 'Cs', name: 'Caesium', mass: 132.905, cat: 'alkali', group: 1, period: 6, block: 's', phase: 'solid', electron: '[Xe] 6s¹' },
  { n: 56, sym: 'Ba', name: 'Barium', mass: 137.327, cat: 'alkaline', group: 2, period: 6, block: 's', phase: 'solid', electron: '[Xe] 6s²' },
  { n: 57, sym: 'La', name: 'Lanthanum', mass: 138.905, cat: 'lanthanide', group: 3, period: 6, block: 'd', phase: 'solid', electron: '[Xe] 5d¹ 6s²' },
  { n: 58, sym: 'Ce', name: 'Cerium', mass: 140.116, cat: 'lanthanide', group: 3, period: 6, block: 'f', phase: 'solid', electron: '[Xe] 4f¹ 5d¹ 6s²' },
  { n: 59, sym: 'Pr', name: 'Praseodymium', mass: 140.908, cat: 'lanthanide', group: 3, period: 6, block: 'f', phase: 'solid', electron: '[Xe] 4f³ 6s²' },
  { n: 60, sym: 'Nd', name: 'Neodymium', mass: 144.242, cat: 'lanthanide', group: 3, period: 6, block: 'f', phase: 'solid', electron: '[Xe] 4f⁴ 6s²' },
  { n: 61, sym: 'Pm', name: 'Promethium', mass: 145, cat: 'lanthanide', group: 3, period: 6, block: 'f', phase: 'solid', electron: '[Xe] 4f⁵ 6s²' },
  { n: 62, sym: 'Sm', name: 'Samarium', mass: 150.36, cat: 'lanthanide', group: 3, period: 6, block: 'f', phase: 'solid', electron: '[Xe] 4f⁶ 6s²' },
  { n: 63, sym: 'Eu', name: 'Europium', mass: 151.964, cat: 'lanthanide', group: 3, period: 6, block: 'f', phase: 'solid', electron: '[Xe] 4f⁷ 6s²' },
  { n: 64, sym: 'Gd', name: 'Gadolinium', mass: 157.25, cat: 'lanthanide', group: 3, period: 6, block: 'f', phase: 'solid', electron: '[Xe] 4f⁷ 5d¹ 6s²' },
  { n: 65, sym: 'Tb', name: 'Terbium', mass: 158.925, cat: 'lanthanide', group: 3, period: 6, block: 'f', phase: 'solid', electron: '[Xe] 4f⁹ 6s²' },
  { n: 66, sym: 'Dy', name: 'Dysprosium', mass: 162.5, cat: 'lanthanide', group: 3, period: 6, block: 'f', phase: 'solid', electron: '[Xe] 4f¹⁰ 6s²' },
  { n: 67, sym: 'Ho', name: 'Holmium', mass: 164.93, cat: 'lanthanide', group: 3, period: 6, block: 'f', phase: 'solid', electron: '[Xe] 4f¹¹ 6s²' },
  { n: 68, sym: 'Er', name: 'Erbium', mass: 167.259, cat: 'lanthanide', group: 3, period: 6, block: 'f', phase: 'solid', electron: '[Xe] 4f¹² 6s²' },
  { n: 69, sym: 'Tm', name: 'Thulium', mass: 168.934, cat: 'lanthanide', group: 3, period: 6, block: 'f', phase: 'solid', electron: '[Xe] 4f¹³ 6s²' },
  { n: 70, sym: 'Yb', name: 'Ytterbium', mass: 173.045, cat: 'lanthanide', group: 3, period: 6, block: 'f', phase: 'solid', electron: '[Xe] 4f¹⁴ 6s²' },
  { n: 71, sym: 'Lu', name: 'Lutetium', mass: 174.967, cat: 'lanthanide', group: 3, period: 6, block: 'd', phase: 'solid', electron: '[Xe] 4f¹⁴ 5d¹ 6s²' },
  { n: 72, sym: 'Hf', name: 'Hafnium', mass: 178.49, cat: 'transition', group: 4, period: 6, block: 'd', phase: 'solid', electron: '[Xe] 4f¹⁴ 5d² 6s²' },
  { n: 73, sym: 'Ta', name: 'Tantalum', mass: 180.948, cat: 'transition', group: 5, period: 6, block: 'd', phase: 'solid', electron: '[Xe] 4f¹⁴ 5d³ 6s²' },
  { n: 74, sym: 'W', name: 'Tungsten', mass: 183.84, cat: 'transition', group: 6, period: 6, block: 'd', phase: 'solid', electron: '[Xe] 4f¹⁴ 5d⁴ 6s²' },
  { n: 75, sym: 'Re', name: 'Rhenium', mass: 186.207, cat: 'transition', group: 7, period: 6, block: 'd', phase: 'solid', electron: '[Xe] 4f¹⁴ 5d⁵ 6s²' },
  { n: 76, sym: 'Os', name: 'Osmium', mass: 190.23, cat: 'transition', group: 8, period: 6, block: 'd', phase: 'solid', electron: '[Xe] 4f¹⁴ 5d⁶ 6s²' },
  { n: 77, sym: 'Ir', name: 'Iridium', mass: 192.217, cat: 'transition', group: 9, period: 6, block: 'd', phase: 'solid', electron: '[Xe] 4f¹⁴ 5d⁷ 6s²' },
  { n: 78, sym: 'Pt', name: 'Platinum', mass: 195.084, cat: 'transition', group: 10, period: 6, block: 'd', phase: 'solid', electron: '[Xe] 4f¹⁴ 5d⁹ 6s¹' },
  { n: 79, sym: 'Au', name: 'Gold', mass: 196.967, cat: 'transition', group: 11, period: 6, block: 'd', phase: 'solid', electron: '[Xe] 4f¹⁴ 5d¹⁰ 6s¹' },
  { n: 80, sym: 'Hg', name: 'Mercury', mass: 200.592, cat: 'post-transition', group: 12, period: 6, block: 'd', phase: 'liquid', electron: '[Xe] 4f¹⁴ 5d¹⁰ 6s²' },
  { n: 81, sym: 'Tl', name: 'Thallium', mass: 204.38, cat: 'post-transition', group: 13, period: 6, block: 'p', phase: 'solid', electron: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p¹' },
  { n: 82, sym: 'Pb', name: 'Lead', mass: 207.2, cat: 'post-transition', group: 14, period: 6, block: 'p', phase: 'solid', electron: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²' },
  { n: 83, sym: 'Bi', name: 'Bismuth', mass: 208.98, cat: 'post-transition', group: 15, period: 6, block: 'p', phase: 'solid', electron: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p³' },
  { n: 84, sym: 'Po', name: 'Polonium', mass: 209, cat: 'post-transition', group: 16, period: 6, block: 'p', phase: 'solid', electron: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁴' },
  { n: 85, sym: 'At', name: 'Astatine', mass: 210, cat: 'halogen', group: 17, period: 6, block: 'p', phase: 'solid', electron: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁵' },
  { n: 86, sym: 'Rn', name: 'Radon', mass: 222, cat: 'noble', group: 18, period: 6, block: 'p', phase: 'gas', electron: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁶' },
  { n: 87, sym: 'Fr', name: 'Francium', mass: 223, cat: 'alkali', group: 1, period: 7, block: 's', phase: 'predicted', electron: '[Rn] 7s¹' },
  { n: 88, sym: 'Ra', name: 'Radium', mass: 226, cat: 'alkaline', group: 2, period: 7, block: 's', phase: 'solid', electron: '[Rn] 7s²' },
  { n: 89, sym: 'Ac', name: 'Actinium', mass: 227, cat: 'actinide', group: 3, period: 7, block: 'd', phase: 'solid', electron: '[Rn] 6d¹ 7s²' },
  { n: 90, sym: 'Th', name: 'Thorium', mass: 232.038, cat: 'actinide', group: 3, period: 7, block: 'f', phase: 'solid', electron: '[Rn] 6d² 7s²' },
  { n: 91, sym: 'Pa', name: 'Protactinium', mass: 231.036, cat: 'actinide', group: 3, period: 7, block: 'f', phase: 'solid', electron: '[Rn] 5f² 6d¹ 7s²' },
  { n: 92, sym: 'U', name: 'Uranium', mass: 238.029, cat: 'actinide', group: 3, period: 7, block: 'f', phase: 'solid', electron: '[Rn] 5f³ 6d¹ 7s²' },
  { n: 93, sym: 'Np', name: 'Neptunium', mass: 237, cat: 'actinide', group: 3, period: 7, block: 'f', phase: 'solid', electron: '[Rn] 5f⁴ 6d¹ 7s²' },
  { n: 94, sym: 'Pu', name: 'Plutonium', mass: 244, cat: 'actinide', group: 3, period: 7, block: 'f', phase: 'solid', electron: '[Rn] 5f⁶ 7s²' },
  { n: 95, sym: 'Am', name: 'Americium', mass: 243, cat: 'actinide', group: 3, period: 7, block: 'f', phase: 'solid', electron: '[Rn] 5f⁷ 7s²' },
  { n: 96, sym: 'Cm', name: 'Curium', mass: 247, cat: 'actinide', group: 3, period: 7, block: 'f', phase: 'solid', electron: '[Rn] 5f⁷ 6d¹ 7s²' },
  { n: 97, sym: 'Bk', name: 'Berkelium', mass: 247, cat: 'actinide', group: 3, period: 7, block: 'f', phase: 'solid', electron: '[Rn] 5f⁹ 7s²' },
  { n: 98, sym: 'Cf', name: 'Californium', mass: 251, cat: 'actinide', group: 3, period: 7, block: 'f', phase: 'solid', electron: '[Rn] 5f¹⁰ 7s²' },
  { n: 99, sym: 'Es', name: 'Einsteinium', mass: 252, cat: 'actinide', group: 3, period: 7, block: 'f', phase: 'solid', electron: '[Rn] 5f¹¹ 7s²' },
  { n: 100, sym: 'Fm', name: 'Fermium', mass: 257, cat: 'actinide', group: 3, period: 7, block: 'f', phase: 'solid', electron: '[Rn] 5f¹² 7s²' },
  { n: 101, sym: 'Md', name: 'Mendelevium', mass: 258, cat: 'actinide', group: 3, period: 7, block: 'f', phase: 'solid', electron: '[Rn] 5f¹³ 7s²' },
  { n: 102, sym: 'No', name: 'Nobelium', mass: 259, cat: 'actinide', group: 3, period: 7, block: 'f', phase: 'solid', electron: '[Rn] 5f¹⁴ 7s²' },
  { n: 103, sym: 'Lr', name: 'Lawrencium', mass: 266, cat: 'actinide', group: 3, period: 7, block: 'd', phase: 'solid', electron: '[Rn] 5f¹⁴ 7s² 7p¹' },
  { n: 104, sym: 'Rf', name: 'Rutherfordium', mass: 267, cat: 'transition', group: 4, period: 7, block: 'd', phase: 'predicted', electron: '[Rn] 5f¹⁴ 6d² 7s²' },
  { n: 105, sym: 'Db', name: 'Dubnium', mass: 268, cat: 'transition', group: 5, period: 7, block: 'd', phase: 'predicted', electron: '[Rn] 5f¹⁴ 6d³ 7s²' },
  { n: 106, sym: 'Sg', name: 'Seaborgium', mass: 269, cat: 'transition', group: 6, period: 7, block: 'd', phase: 'predicted', electron: '[Rn] 5f¹⁴ 6d⁴ 7s²' },
  { n: 107, sym: 'Bh', name: 'Bohrium', mass: 270, cat: 'transition', group: 7, period: 7, block: 'd', phase: 'predicted', electron: '[Rn] 5f¹⁴ 6d⁵ 7s²' },
  { n: 108, sym: 'Hs', name: 'Hassium', mass: 277, cat: 'transition', group: 8, period: 7, block: 'd', phase: 'predicted', electron: '[Rn] 5f¹⁴ 6d⁶ 7s²' },
  { n: 109, sym: 'Mt', name: 'Meitnerium', mass: 278, cat: 'unknown', group: 9, period: 7, block: 'd', phase: 'predicted', electron: '[Rn] 5f¹⁴ 6d⁷ 7s²' },
  { n: 110, sym: 'Ds', name: 'Darmstadtium', mass: 281, cat: 'unknown', group: 10, period: 7, block: 'd', phase: 'predicted', electron: '[Rn] 5f¹⁴ 6d⁸ 7s²' },
  { n: 111, sym: 'Rg', name: 'Roentgenium', mass: 282, cat: 'unknown', group: 11, period: 7, block: 'd', phase: 'predicted', electron: '[Rn] 5f¹⁴ 6d⁹ 7s²' },
  { n: 112, sym: 'Cn', name: 'Copernicium', mass: 285, cat: 'unknown', group: 12, period: 7, block: 'd', phase: 'predicted', electron: '[Rn] 5f¹⁴ 6d¹⁰ 7s²' },
  { n: 113, sym: 'Nh', name: 'Nihonium', mass: 286, cat: 'unknown', group: 13, period: 7, block: 'p', phase: 'predicted', electron: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p¹' },
  { n: 114, sym: 'Fl', name: 'Flerovium', mass: 289, cat: 'unknown', group: 14, period: 7, block: 'p', phase: 'predicted', electron: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p²' },
  { n: 115, sym: 'Mc', name: 'Moscovium', mass: 290, cat: 'unknown', group: 15, period: 7, block: 'p', phase: 'predicted', electron: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p³' },
  { n: 116, sym: 'Lv', name: 'Livermorium', mass: 293, cat: 'unknown', group: 16, period: 7, block: 'p', phase: 'predicted', electron: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁴' },
  { n: 117, sym: 'Ts', name: 'Tennessine', mass: 294, cat: 'unknown', group: 17, period: 7, block: 'p', phase: 'predicted', electron: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁵' },
  { n: 118, sym: 'Og', name: 'Oganesson', mass: 294, cat: 'unknown', group: 18, period: 7, block: 'p', phase: 'predicted', electron: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁶' },
];

const CAT_CLASSES: Record<Element['cat'], string> = {
  alkali: 'bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-500/20 dark:text-rose-200 dark:border-rose-500/30',
  alkaline: 'bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-500/20 dark:text-orange-200 dark:border-orange-500/30',
  transition: 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-500/30',
  'post-transition': 'bg-yellow-100 text-yellow-900 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-200 dark:border-yellow-500/30',
  metalloid: 'bg-lime-100 text-lime-900 border-lime-200 dark:bg-lime-500/20 dark:text-lime-200 dark:border-lime-500/30',
  nonmetal: 'bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-500/30',
  halogen: 'bg-teal-100 text-teal-900 border-teal-200 dark:bg-teal-500/20 dark:text-teal-200 dark:border-teal-500/30',
  noble: 'bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-500/20 dark:text-sky-200 dark:border-sky-500/30',
  lanthanide: 'bg-indigo-100 text-indigo-900 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-200 dark:border-indigo-500/30',
  actinide: 'bg-violet-100 text-violet-900 border-violet-200 dark:bg-violet-500/20 dark:text-violet-200 dark:border-violet-500/30',
  unknown: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-500/20 dark:text-zinc-300 dark:border-zinc-500/30',
};

export function categoryClasses(cat: Element['cat']): string {
  return CAT_CLASSES[cat];
}

export function blockClass(block: Element['block']): string {
  const map: Record<Element['block'], string> = {
    s: 'bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-500/30',
    p: 'bg-green-100 text-green-900 border-green-200 dark:bg-green-500/20 dark:text-green-200 dark:border-green-500/30',
    d: 'bg-red-100 text-red-900 border-red-200 dark:bg-red-500/20 dark:text-red-200 dark:border-red-500/30',
    f: 'bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-500/20 dark:text-purple-200 dark:border-purple-500/30',
  };
  return map[block];
}

export function phaseLabel(phase: Element['phase']): string {
  const map: Record<Element['phase'], string> = {
    gas: 'Gas',
    liquid: 'Liquid',
    solid: 'Solid',
    predicted: 'Predicted',
  };
  return map[phase];
}