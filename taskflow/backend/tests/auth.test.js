const request = require('supertest');
const { createApp } = require('../src/app');

function getHttpServer() {
  return createApp();
}

describe('Auth API', () => {
  const httpServer = getHttpServer();
  const app = httpServer;

  describe('POST /api/auth/register', () => {
    it('registers a user and returns a JWT', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Jane Doe', email: 'jane@example.com', password: 'password123' });
      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('jane@example.com');
      expect(res.body.token).toBeTruthy();
    });

    it('rejects invalid payloads with field errors', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'A', email: 'not-an-email', password: 'short' });
      expect(res.status).toBe(400);
      expect(res.body.details.name).toBeTruthy();
      expect(res.body.details.email).toBeTruthy();
      expect(res.body.details.password).toBeTruthy();
    });

    it('rejects duplicate emails with 409', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Jane Doe', email: 'dup@example.com', password: 'password123' });
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Jane Two', email: 'dup@example.com', password: 'password123' });
      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'John Roe', email: 'john@example.com', password: 'password123' });
    });

    it('logs in with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john@example.com', password: 'password123' });
      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('John Roe');
      expect(res.body.token).toBeTruthy();
    });

    it('rejects wrong password with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'john@example.com', password: 'wrong-password' });
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid/i);
    });

    it('rejects unknown email with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ghost@example.com', password: 'password123' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns the profile for a valid token', async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Me User', email: 'me@example.com', password: 'password123' });
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${reg.body.token}`);
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('me@example.com');
    });

    it('rejects missing token with 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/auth/me', () => {
    async function registerUser() {
      return request(app)
        .post('/api/auth/register')
        .send({ name: 'Update Me', email: 'update@example.com', password: 'password123' });
    }

    it('updates name, email, and avatar', async () => {
      const reg = await registerUser();
      const res = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${reg.body.token}`)
        .send({ name: 'New Name', email: 'new@example.com', avatar: 'data:image/png;base64,AAAA' });
      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('New Name');
      expect(res.body.user.email).toBe('new@example.com');
      expect(res.body.user.avatar).toBe('data:image/png;base64,AAAA');
    });

    it('rejects duplicate email with 409', async () => {
      const reg = await registerUser();
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Other', email: 'taken@example.com', password: 'password123' });
      const res = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${reg.body.token}`)
        .send({ email: 'taken@example.com' });
      expect(res.status).toBe(409);
    });

    it('rejects invalid name/email with 400', async () => {
      const reg = await registerUser();
      const res = await request(app)
        .put('/api/auth/me')
        .set('Authorization', `Bearer ${reg.body.token}`)
        .send({ name: 'X', email: 'not-an-email' });
      expect(res.status).toBe(400);
      expect(res.body.details.name).toBeTruthy();
      expect(res.body.details.email).toBeTruthy();
    });
  });

  describe('PUT /api/auth/me/password', () => {
    it('changes the password with the correct current password', async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Pass User', email: 'pass@example.com', password: 'password123' });
      const res = await request(app)
        .put('/api/auth/me/password')
        .set('Authorization', `Bearer ${reg.body.token}`)
        .send({ currentPassword: 'password123', newPassword: 'newpassword456' });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);

      const login = await request(app)
        .post('/api/auth/login')
        .send({ email: 'pass@example.com', password: 'newpassword456' });
      expect(login.status).toBe(200);
    });

    it('rejects wrong current password with 401', async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Pass Two', email: 'pass2@example.com', password: 'password123' });
      const res = await request(app)
        .put('/api/auth/me/password')
        .set('Authorization', `Bearer ${reg.body.token}`)
        .send({ currentPassword: 'wrong', newPassword: 'newpassword456' });
      expect(res.status).toBe(401);
    });

    it('rejects short new password with 400', async () => {
      const reg = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Pass Three', email: 'pass3@example.com', password: 'password123' });
      const res = await request(app)
        .put('/api/auth/me/password')
        .set('Authorization', `Bearer ${reg.body.token}`)
        .send({ currentPassword: 'password123', newPassword: 'short' });
      expect(res.status).toBe(400);
    });
  });
});
