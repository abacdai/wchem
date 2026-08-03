import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage, RegisterPage } from '../pages/AuthPages';
import { AuthProvider } from '../context/AuthContext';

vi.mock('../lib/api', () => ({
  api: {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
  },
  getToken: vi.fn(() => null),
  setToken: vi.fn(),
}));

vi.mock('../lib/socket', () => ({
  connectSocket: vi.fn(() => ({ on: vi.fn(), off: vi.fn(), connected: false })),
  disconnectSocket: vi.fn(),
  getSocket: vi.fn(() => null),
}));

const { api } = await import('../lib/api');

function renderPage(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<div>Dashboard page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs in and navigates to the dashboard', async () => {
    const user = userEvent.setup();
    (api.login as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u1', name: 'Jane', email: 'jane@example.com' }, token: 'tok' });
    renderPage('/login');

    await user.type(screen.getByLabelText('Email'), 'jane@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(api.login).toHaveBeenCalledWith('jane@example.com', 'password123');
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
  });

  it('shows the API error message on failure', async () => {
    const user = userEvent.setup();
    const { ApiError } = await import('../lib/types');
    (api.login as ReturnType<typeof vi.fn>).mockRejectedValue(new ApiError(401, 'Invalid email or password'));
    renderPage('/login');

    await user.type(screen.getByLabelText('Email'), 'jane@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });
});

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers and navigates to the dashboard', async () => {
    const user = userEvent.setup();
    (api.register as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: 'u2', name: 'Joe', email: 'joe@example.com' }, token: 'tok' });
    renderPage('/register');

    await user.type(screen.getByLabelText('Name'), 'Joe');
    await user.type(screen.getByLabelText('Email'), 'joe@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(api.register).toHaveBeenCalledWith('Joe', 'joe@example.com', 'password123');
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
  });

  it('joins field errors from the API into one banner', async () => {
    const user = userEvent.setup();
    const { ApiError } = await import('../lib/types');
    (api.register as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiError(400, 'Validation failed', { name: 'Name too short', password: 'Password too short' })
    );
    renderPage('/register');

    await user.type(screen.getByLabelText('Name'), 'J');
    await user.type(screen.getByLabelText('Email'), 'j@x.io');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Name too short');
    expect(screen.getByRole('alert')).toHaveTextContent('Password too short');
  });
});
