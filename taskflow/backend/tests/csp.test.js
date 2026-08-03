const request = require('supertest');
const { createApp } = require('../src/app');

describe('Content Security Policy (served HTML app)', () => {
  const httpServer = createApp();

  it('allows the inline scripts and handlers used by index.html', async () => {
    const res = await request(httpServer).get('/api/health');
    const csp = res.headers['content-security-policy'] || '';
    expect(csp).toContain('script-src');
    expect(csp).toContain("'unsafe-inline'");
    expect(csp).toContain('script-src-attr');
    expect(csp).not.toContain("script-src-attr 'none'");
  });

  it('allows the GSAP scripts loaded from cdnjs.cloudflare.com', async () => {
    const res = await request(httpServer).get('/api/health');
    const csp = res.headers['content-security-policy'] || '';
    expect(csp).toContain('https://cdnjs.cloudflare.com');
  });

  it('allows the MediaPipe camera pipeline (jsdelivr, googleapis, opencv, wasm)', async () => {
    const res = await request(httpServer).get('/api/health');
    const csp = res.headers['content-security-policy'] || '';
    expect(csp).toContain('https://cdn.jsdelivr.net');
    expect(csp).toContain('https://docs.opencv.org');
    expect(csp).toContain("'wasm-unsafe-eval'");
    expect(csp).toContain('connect-src');
    expect(csp).toContain('https://storage.googleapis.com');
    expect(csp).toMatch(/ws:|wss:/);
  });

  it('keeps the remaining helmet protections in place', async () => {
    const res = await request(httpServer).get('/api/health');
    const csp = res.headers['content-security-policy'] || '';
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
