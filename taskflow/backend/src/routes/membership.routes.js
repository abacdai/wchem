const express = require('express');
const MembershipLead = require('../models/MembershipLead');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const waitlistLimit = rateLimit({ windowMs: 60 * 1000, max: 5, name: 'waitlist' });

/* Đăng ký gói thành viên (AR đang phát triển): lưu email vào danh sách chờ.
   Trả 201 khi mới, 200 khi email đã đăng ký trước đó (idempotent). */
router.post('/waitlist', waitlistLimit, async (req, res, next) => {
  try {
    const email = String((req.body || {}).email || '').toLowerCase().trim();
    const plan = String((req.body || {}).plan || 'ar').trim();
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Validation failed', details: { email: 'A valid email is required' } });
    }
    if (plan !== 'ar') {
      return res.status(400).json({ error: 'Validation failed', details: { plan: 'Unsupported plan' } });
    }
    const existing = await MembershipLead.findOne({ email });
    if (existing) {
      return res.json({ registered: true, lead: { email: existing.email, plan: existing.plan } });
    }
    const lead = await MembershipLead.create({ email, plan });
    return res.status(201).json({ registered: true, lead: { email: lead.email, plan: lead.plan } });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
