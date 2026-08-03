const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegister(req, res, next) {
  const { name, email, password } = req.body || {};
  const errors = {};
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
    errors.email = 'A valid email is required';
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  req.body = { name: name.trim(), email: email.toLowerCase().trim(), password };
  return next();
}

function validateLogin(req, res, next) {
  const { email, password } = req.body || {};
  const errors = {};
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
    errors.email = 'A valid email is required';
  }
  if (!password || typeof password !== 'string' || password.length < 1) {
    errors.password = 'Password is required';
  }
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  req.body = { email: email.toLowerCase().trim(), password };
  return next();
}

function validateCompoundInput(req, res, next) {
  const body = req.body || {};
  const errors = {};
  const compound = {};

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length < 1 || body.name.trim().length > 200) {
      errors.name = 'Name must be 1-200 characters';
    } else {
      compound.name = body.name.trim();
    }
  } else if (req.method === 'POST') {
    errors.name = 'Name is required';
  }

  if (body.notes !== undefined) {
    if (typeof body.notes !== 'string' || body.notes.length > 2000) {
      errors.notes = 'Notes must be at most 2000 characters';
    } else {
      compound.notes = body.notes.trim();
    }
  }

  if (body.formula !== undefined) {
    if (typeof body.formula !== 'string' || body.formula.length > 100) {
      errors.formula = 'Formula must be at most 100 characters';
    } else {
      compound.formula = body.formula.trim();
    }
  }

  if (body.smiles !== undefined) {
    if (typeof body.smiles !== 'string' || body.smiles.length > 500) {
      errors.smiles = 'SMILES must be at most 500 characters';
    } else {
      compound.smiles = body.smiles.trim();
    }
  }

  if (body.cid !== undefined) {
    if (body.cid === null) {
      compound.cid = null;
    } else if (Number.isInteger(body.cid) && body.cid > 0) {
      compound.cid = body.cid;
    } else {
      errors.cid = 'cid must be a positive integer or null';
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  req.body = compound;
  return next();
}

module.exports = { validateRegister, validateLogin, validateCompoundInput };
