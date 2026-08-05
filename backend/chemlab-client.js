/**
 * ChemLab Backend Client for WChem VR Chemistry Sandbox
 * Talks to the project's own Express + MongoDB backend (same origin, /api).
 * Replaces the previous InsForge client.
 */

const API_BASE = '/api';
const TOKEN_KEY = 'chemlab:token';
const SESSION_KEY = 'chemlab:session';

function read(key) {
  try { return localStorage ? localStorage.getItem(key) : null; }
  catch (e) { return null; }
}

function write(key, value) {
  try { if (localStorage) localStorage.setItem(key, value); } catch (e) { /* private mode */ }
}

function remove(key) {
  try { if (localStorage) localStorage.removeItem(key); } catch (e) { /* private mode */ }
}

class ChemLabClient {
  constructor() {
    this.user = null;
    this.token = read(TOKEN_KEY) || null;
    if (this.token) {
      try { this.user = JSON.parse(read(SESSION_KEY) || 'null'); } catch (e) { this.user = null; }
    }
  }

  async init() {
    if (!this.token) return;
    try {
      const res = await this.request('/auth/me');
      this.user = res.user;
      this._persist();
    } catch (err) {
      // Chỉ token hết hạn/không hợp lệ (401) mới được xóa phiên. Lỗi mạng
      // hoặc backend tạm ngưng (Render cold start) KHÔNG được đăng xuất —
      // giữ phiên cache để user không bị mất tài khoản khi click avatar.
      if (err && err.status === 401) this.signOut();
    }
  }

  _persist() {
    write(TOKEN_KEY, this.token || '');
    write(SESSION_KEY, JSON.stringify(this.user || null));
  }

  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers.Authorization = 'Bearer ' + this.token;
    let response;
    try {
      response = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
    } catch (err) {
      throw new Error('Network error — is the API running?');
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const details = body.details
        ? Object.values(body.details).join(' · ')
        : '';
      const err = new Error(body.error || details || 'Request failed (' + response.status + ')');
      err.status = response.status;
      throw err;
    }
    return body;
  }

  async signIn(email, password) {
    const res = await this.request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    this.token = res.token;
    this.user = res.user;
    this._persist();
    return { user: res.user };
  }

  async signUp(email, password, metadata) {
    const meta = metadata || {};
    let name = (meta.name || '').trim();
    if (name.length < 2) name = (email.split('@')[0] || '').trim();
    if (name.length < 2) name = email;
    const res = await this.request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
    this.token = res.token;
    this.user = res.user;
    this._persist();
    return { user: res.user };
  }

  async signOut() {
    this.token = null;
    this.user = null;
    remove(TOKEN_KEY);
    remove(SESSION_KEY);
  }

  isAuthenticated() {
    return Boolean(this.token);
  }

  getCurrentUserId() {
    return this.user ? this.user.id : null;
  }

  async me() {
    return this.request('/auth/me');
  }

  async getCompounds() {
    const res = await this.request('/compounds');
    return res.compounds || [];
  }

  async getHealth() {
    return this.request('/health');
  }
}

const chemlabClient = new ChemLabClient();
chemlabClient.init().catch(() => { /* offline */ });

export default chemlabClient;
