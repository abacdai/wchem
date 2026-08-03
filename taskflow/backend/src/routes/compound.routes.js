const express = require('express');
const Compound = require('../models/Compound');
const { requireAuth } = require('../middleware/auth');
const { validateCompoundInput } = require('../middleware/validate');
const { emitLabEvent } = require('../socket');

const router = express.Router();

router.use(requireAuth);

const PAGE_SIZE = 50;

router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 24 } = req.query;
    const filter = { owner: req.userId };
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.min(PAGE_SIZE, Math.max(1, parseInt(limit, 10) || 24));
    const [compounds, total] = await Promise.all([
      Compound.find(filter).sort({ updatedAt: -1 }).skip((pageNum - 1) * pageSize).limit(pageSize),
      Compound.countDocuments(filter),
    ]);
    return res.json({
      compounds: compounds.map((c) => c.toPublic()),
      pagination: { page: pageNum, limit: pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const compound = await Compound.findOne({ _id: req.params.id, owner: req.userId });
    if (!compound) return res.status(404).json({ error: 'Compound not found' });
    return res.json({ compound: compound.toPublic() });
  } catch (err) {
    return next(err);
  }
});

router.post('/', validateCompoundInput, async (req, res, next) => {
  try {
    const compound = await Compound.create({ ...req.body, owner: req.userId });
    emitLabEvent('compound:created', compound.toPublic());
    return res.status(201).json({ compound: compound.toPublic() });
  } catch (err) {
    return next(err);
  }
});

router.put('/:id', validateCompoundInput, async (req, res, next) => {
  try {
    const compound = await Compound.findOneAndUpdate(
      { _id: req.params.id, owner: req.userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!compound) return res.status(404).json({ error: 'Compound not found' });
    emitLabEvent('compound:updated', compound.toPublic());
    return res.json({ compound: compound.toPublic() });
  } catch (err) {
    return next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const compound = await Compound.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!compound) return res.status(404).json({ error: 'Compound not found' });
    emitLabEvent('compound:deleted', { id: req.params.id });
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
