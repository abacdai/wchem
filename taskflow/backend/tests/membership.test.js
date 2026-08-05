const request = require('supertest');
const { createApp } = require('../src/app');

describe('Membership waitlist (AR gói thành viên)', () => {
  const app = createApp();

  it('registers a new email on the AR waitlist (201)', async () => {
    const res = await request(app)
      .post('/api/membership/waitlist')
      .send({ email: 'member@example.com', plan: 'ar' });
    expect(res.status).toBe(201);
    expect(res.body.registered).toBe(true);
    expect(res.body.lead.email).toBe('member@example.com');
    expect(res.body.lead.plan).toBe('ar');
  });

  it('is idempotent for an already-registered email (200)', async () => {
    await request(app).post('/api/membership/waitlist').send({ email: 'dup@example.com', plan: 'ar' });
    const res = await request(app).post('/api/membership/waitlist').send({ email: 'DUP@example.com', plan: 'ar' });
    expect(res.status).toBe(200);
    expect(res.body.registered).toBe(true);
  });

  it('rejects invalid email with 400', async () => {
    const res = await request(app).post('/api/membership/waitlist').send({ email: 'not-an-email', plan: 'ar' });
    expect(res.status).toBe(400);
    expect(res.body.details.email).toBeTruthy();
  });

  it('rejects unsupported plan with 400', async () => {
    const res = await request(app)
      .post('/api/membership/waitlist')
      .send({ email: 'plan@example.com', plan: 'pro' });
    expect(res.status).toBe(400);
    expect(res.body.details.plan).toBeTruthy();
  });
});
