const jwt = require('jsonwebtoken');

/* Secret phải được đặt qua biến môi trường. Production fail-fast: nếu thiếu,
   server từ chối khởi động thay vì chạy với secret mặc định đoán được.
   Ngoài production (dev/test) giữ fallback để không phá luồng phát triển,
   kèm cảnh báo rõ ràng. */
function resolveJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production (see docs/SECURITY-AUDIT-REPORT.md)');
  }
  console.warn('[auth] WARNING: JWT_SECRET not set — using insecure dev fallback. Set JWT_SECRET in production.');
  return 'taskflow-dev-secret-change-me';
}

const JWT_SECRET = resolveJwtSecret();
const TOKEN_TTL = process.env.JWT_TTL || '7d';

function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { signToken, requireAuth };
