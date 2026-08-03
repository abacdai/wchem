require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Compound = require('./models/Compound');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/taskflow';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  await mongoose.connection.dropDatabase();
  const user = await User.create({
    name: 'Demo User',
    email: 'demo@taskflow.dev',
    password: 'demo1234',
  });
  const samples = [
    { name: 'Water', formula: 'H2O', smiles: 'O', cid: 962, notes: 'The universal solvent. Viewable as a 3D structure from PubChem.' },
    { name: 'Caffeine', formula: 'C8H10N4O2', smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C', cid: 2519, notes: 'Stimulant found in coffee and tea.' },
    { name: 'Aspirin', formula: 'C9H8O4', smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O', cid: 2244, notes: 'Acetylsalicylic acid, common analgesic.' },
    { name: 'Sodium chloride', formula: 'NaCl', smiles: '[Na+].[Cl-]', cid: 5234, notes: 'Table salt — ionic crystal lattice.' },
  ];
  await Compound.insertMany(samples.map((s) => ({ ...s, owner: user._id })));
  console.log(`[ChemLab] Seeded: ${samples.length} compounds for ${user.email} (password: demo1234)`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[ChemLab] Seed failed:', err);
  process.exit(1);
});
