'use strict';

/* Rate limiter trong bộ nhớ (không phụ thuộc thư viện ngoài).
   Giới hạn tần suất yêu cầu theo IP cho các route nhạy cảm (auth).
   Khóa giảm tải định kỳ để tránh rò rỉ bộ nhớ. */
const buckets = new Map();
let lastSweep = Date.now();

function sweep() {
  const now = Date.now();
  if (now - lastSweep < 60000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (b.reset <= now) buckets.delete(key);
  }
}

function rateLimit({ windowMs, max, name }) {
  const label = name || 'limit';
  return function rateLimitMiddleware(req, res, next) {
    sweep();
    const now = Date.now();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    /* Khóa riêng theo từng bộ đếm: các limiter khác nhau (register/login/
       password) không được chia sẻ bucket với nhau. */
    const key = label + ':' + ip;
    let bucket = buckets.get(key);
    if (!bucket || bucket.reset <= now) {
      bucket = { count: 0, reset: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.reset / 1000)));
    if (bucket.count > max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.reset - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    if (label) res.setHeader('X-RateLimit-Scope', label);
    return next();
  };
}

module.exports = { rateLimit };
