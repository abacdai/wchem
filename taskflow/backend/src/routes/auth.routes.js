const express = require('express');
const User = require('../models/User');
const { signToken, requireAuth } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validate');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();

/* Chống brute-force và spam đăng ký theo IP. */
const registerLimit = rateLimit({ windowMs: 60 * 1000, max: 30, name: 'register' });
const loginLimit = rateLimit({ windowMs: 60 * 1000, max: 10, name: 'login' });
const passwordLimit = rateLimit({ windowMs: 60 * 1000, max: 10, name: 'password' });

/* Chỉ chấp nhận avatar là data URL ảnh (png/jpg/gif/webp) hoặc http(s),
   dưới 200KB — chặn stored XSS qua thuộc tính src và phình DB (T-066). */
const AVATAR_RE = /^(data:image\/(png|jpe?g|gif|webp);base64,|https?:\/\/)/i;
const AVATAR_MAX = 200000;

router.post('/register', registerLimit, validateRegister, async (req, res, next) => {
  try {
    const existing = await User.findOne({ email: req.body.email }).collation({ locale: 'en', strength: 2 });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    const user = await User.create(req.body);
    return res.status(201).json({ user: user.toPublic(), token: signToken(user) });
  } catch (err) {
    return next(err);
  }
});

router.post('/login', loginLimit, validateLogin, async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email }).select('+password');
    if (!user || !(await user.comparePassword(req.body.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    return res.json({ user: user.toPublic(), token: signToken(user) });
  } catch (err) {
    return next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: user.toPublic() });
  } catch (err) {
    return next(err);
  }
});

// Update own profile: name, email, avatar
router.put('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { name, email, avatar } = req.body || {};
    const errors = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) {
        errors.name = 'Name must be 2-80 characters';
      } else {
        user.name = name.trim();
      }
    }
    if (email !== undefined) {
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = 'A valid email is required';
      } else {
        const clean = email.toLowerCase().trim();
        if (clean !== user.email) {
          const existing = await User.findOne({ email: clean }).collation({ locale: 'en', strength: 2 });
          if (existing) return res.status(409).json({ error: 'An account with this email already exists' });
          user.email = clean;
        }
      }
    }
    if (avatar !== undefined) {
      if (typeof avatar !== 'string' || avatar.length > AVATAR_MAX || !AVATAR_RE.test(avatar)) {
        errors.avatar = 'Avatar must be an image data URL (png/jpg/gif/webp) or http(s) URL under 200KB';
      } else {
        user.avatar = avatar;
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    await user.save();
    return res.json({ user: user.toPublic() });
  } catch (err) {
    return next(err);
  }
});

// Change own password (verify current password first)
router.put('/me/password', passwordLimit, requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({
        error: 'Validation failed',
        details: { newPassword: 'Password must be at least 8 characters' },
      });
    }
    const user = await User.findById(req.userId).select('+password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
