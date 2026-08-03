function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation failed', details: err.errors });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid identifier' });
  }
  if (err.code === 11000) {
    return res.status(409).json({ error: 'Duplicate key violation' });
  }
  console.error('[TaskFlow] Unhandled error:', err);
  return res.status(500).json({ error: 'Internal server error' });
}

module.exports = { notFound, errorHandler };
