const request = require('supertest');
const { createApp } = require('../src/app');

describe('Rate limiting (T-066)', () => {
  const app = createApp();

  it('rejects excessive login attempts with 429 and Retry-After', async () => {
    let last;
    for (let i = 0; i < 11; i++) {
      last = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ghost@example.com', password: 'password123' });
    }
    expect(last.status).toBe(429);
    expect(last.headers['retry-after']).toBeTruthy();
    expect(last.headers['x-ratelimit-remaining']).toBe('0');
  });

  it('rejects excessive register attempts with 429', async () => {
    let last;
    for (let i = 0; i < 31; i++) {
      last = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Spam ' + i, email: 'spam' + i + '@example.com', password: 'password123' });
    }
    expect(last.status).toBe(429);
    expect(last.headers['x-ratelimit-limit']).toBe('30');
  });

  it('rejects excessive password changes with 429', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Rate Me', email: 'rateme@example.com', password: 'password123' });
    let last;
    for (let i = 0; i < 11; i++) {
      last = await request(app)
        .put('/api/auth/me/password')
        .set('Authorization', `Bearer ${reg.body.token}`)
        .send({ currentPassword: 'wrong', newPassword: 'newpassword456' });
    }
    expect(last.status).toBe(429);
  });
});
