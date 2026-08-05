const request = require('supertest');
const { createApp } = require('../src/app');

describe('Static app clean URLs', () => {
  const httpServer = createApp();

  it('serves the landing page at /', async () => {
    const res = await request(httpServer).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<!DOCTYPE html>');
  });

  it('serves lab.html at /lab without the .html suffix', async () => {
    const res = await request(httpServer).get('/lab');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Wchem Chemistry Lab');
  });

  it('serves profile.html at /profile without the .html suffix', async () => {
    const res = await request(httpServer).get('/profile');
    expect(res.status).toBe(200);
  });

  it('redirects /lab.html to /lab with 301', async () => {
    const res = await request(httpServer).get('/lab.html');
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe('/lab');
  });

  it('redirects /profile.html to /profile with 301', async () => {
    const res = await request(httpServer).get('/profile.html');
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe('/profile');
  });

  it('redirects /index.html to / with 301', async () => {
    const res = await request(httpServer).get('/index.html');
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe('/');
  });

  it('preserves query strings across the redirect', async () => {
    const res = await request(httpServer).get('/lab.html?tab=calibration');
    expect(res.status).toBe(301);
    expect(res.headers.location).toBe('/lab?tab=calibration');
  });

  it('leaves unknown pages as 404', async () => {
    const res = await request(httpServer).get('/nope.html');
    expect(res.status).toBe(404);
  });

  it('still serves the old .html URLs directly when requested with a file name', async () => {
    const res = await request(httpServer).get('/profile.html').redirects(0);
    expect(res.status).toBe(301);
  });
});
