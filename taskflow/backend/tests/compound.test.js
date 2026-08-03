const request = require('supertest');
const { createApp } = require('../src/app');

const app = createApp();

let token;

beforeAll(async () => {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Lab User', email: 'lab@example.com', password: 'password123' });
  token = reg.body.token;
});

describe('Compounds API', () => {
  describe('authentication', () => {
    it('requires a token on every route', async () => {
      const res = await request(app).get('/api/compounds');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/compounds', () => {
    it('saves a compound with PubChem data', async () => {
      const res = await request(app)
        .post('/api/compounds')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Aspirin', formula: 'C9H8O4', smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O', cid: 2244 });
      expect(res.status).toBe(201);
      expect(res.body.compound.name).toBe('Aspirin');
      expect(res.body.compound.cid).toBe(2244);
      expect(res.body.compound.owner).toBeUndefined();
    });

    it('rejects a compound without a name', async () => {
      const res = await request(app)
        .post('/api/compounds')
        .set('Authorization', `Bearer ${token}`)
        .send({ formula: 'H2O' });
      expect(res.status).toBe(400);
      expect(res.body.details.name).toBeTruthy();
    });

    it('rejects non-numeric cid and oversized notes', async () => {
      const badCid = await request(app)
        .post('/api/compounds')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bad cid', cid: 'abc' });
      expect(badCid.status).toBe(400);
      const longNotes = await request(app)
        .post('/api/compounds')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Long notes', notes: 'x'.repeat(2001) });
      expect(longNotes.status).toBe(400);
    });
  });

  describe('GET /api/compounds', () => {
    it('lists only own compounds with pagination', async () => {
      await request(app).post('/api/compounds').set('Authorization', `Bearer ${token}`).send({ name: 'Water', cid: 962 });
      await request(app).post('/api/compounds').set('Authorization', `Bearer ${token}`).send({ name: 'Caffeine', cid: 2519 });
      const other = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Other', email: 'other-lab@example.com', password: 'password123' });
      await request(app).post('/api/compounds').set('Authorization', `Bearer ${other.body.token}`).send({ name: 'Secret' });

      const res = await request(app).get('/api/compounds').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.compounds).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
      expect(res.body.compounds.some((c) => c.name === 'Secret')).toBe(false);
    });

    it('honours page and limit parameters', async () => {
      for (let i = 0; i < 3; i += 1) {
        await request(app).post('/api/compounds').set('Authorization', `Bearer ${token}`).send({ name: `Compound ${i}` });
      }
      const res = await request(app).get('/api/compounds?page=2&limit=2').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(2);
      expect(res.body.compounds).toHaveLength(1);
    });

    it('clamps limit to the maximum page size', async () => {
      const res = await request(app).get('/api/compounds?limit=9999').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(50);
    });

    it('returns an empty list with total 0 for a fresh user', async () => {
      const fresh = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Fresh', email: 'fresh-lab@example.com', password: 'password123' });
      const res = await request(app).get('/api/compounds').set('Authorization', `Bearer ${fresh.body.token}`);
      expect(res.status).toBe(200);
      expect(res.body.compounds).toHaveLength(0);
      expect(res.body.pagination.total).toBe(0);
    });
  });

  describe('GET /api/compounds/:id', () => {
    it('returns a single compound', async () => {
      const created = await request(app).post('/api/compounds').set('Authorization', `Bearer ${token}`).send({ name: 'Find me' });
      const res = await request(app).get(`/api/compounds/${created.body.compound.id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.compound.name).toBe('Find me');
    });

    it('404s for another user compound', async () => {
      const other = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Thief', email: 'thief-lab@example.com', password: 'password123' });
      const created = await request(app).post('/api/compounds').set('Authorization', `Bearer ${token}`).send({ name: 'Mine' });
      const res = await request(app).get(`/api/compounds/${created.body.compound.id}`).set('Authorization', `Bearer ${other.body.token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/compounds/:id', () => {
    it('updates notes, formula and name', async () => {
      const created = await request(app).post('/api/compounds').set('Authorization', `Bearer ${token}`).send({ name: 'Update me' });
      const res = await request(app)
        .put(`/api/compounds/${created.body.compound.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ notes: 'Use with care', formula: 'CH4', name: 'Methane' });
      expect(res.status).toBe(200);
      expect(res.body.compound.name).toBe('Methane');
      expect(res.body.compound.formula).toBe('CH4');
      expect(res.body.compound.notes).toBe('Use with care');
    });

    it('404s when updating a missing compound', async () => {
      const res = await request(app)
        .put('/api/compounds/000000000000000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Nope' });
      expect(res.status).toBe(404);
    });

    it('rejects invalid update payloads', async () => {
      const created = await request(app).post('/api/compounds').set('Authorization', `Bearer ${token}`).send({ name: 'Bad update' });
      const res = await request(app)
        .put(`/api/compounds/${created.body.compound.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ cid: -5 });
      expect(res.status).toBe(400);
      expect(res.body.details.cid).toBeTruthy();
    });
  });

  describe('DELETE /api/compounds/:id', () => {
    it('deletes a compound', async () => {
      const created = await request(app).post('/api/compounds').set('Authorization', `Bearer ${token}`).send({ name: 'Delete me' });
      const res = await request(app).delete(`/api/compounds/${created.body.compound.id}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(204);
      const gone = await request(app).get(`/api/compounds/${created.body.compound.id}`).set('Authorization', `Bearer ${token}`);
      expect(gone.status).toBe(404);
    });

    it('404s when deleting a missing compound', async () => {
      const res = await request(app)
        .delete('/api/compounds/000000000000000000000000')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it('404s when deleting another user compound', async () => {
      const other = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Other Deleter', email: 'other-deleter@example.com', password: 'password123' });
      const created = await request(app).post('/api/compounds').set('Authorization', `Bearer ${token}`).send({ name: 'Keep me' });
      const res = await request(app)
        .delete(`/api/compounds/${created.body.compound.id}`)
        .set('Authorization', `Bearer ${other.body.token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('error handling', () => {
    it('returns 400 for a malformed id (CastError)', async () => {
      const res = await request(app).get('/api/compounds/not-an-object-id').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/identifier/i);
    });

    it('returns 404 for unknown routes', async () => {
      const res = await request(app).get('/api/does-not-exist').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});
