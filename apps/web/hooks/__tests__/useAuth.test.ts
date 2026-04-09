import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';

// Mock next-auth/react
const mockUseSession = vi.fn();
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();

vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading state initially', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'loading' });

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.session).toBeNull();
  });

  it('returns authenticated state when session exists', () => {
    const mockSession = {
      user: { id: '1', name: 'Test User', email: 'test@example.com' },
      accessToken: 'mock-token-123',
      expires: '2099-01-01',
    };
    mockUseSession.mockReturnValue({ data: mockSession, status: 'authenticated' });

    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.session).toEqual(mockSession);
    expect(result.current.accessToken).toBe('mock-token-123');
  });

  it('returns unauthenticated state when no session', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });

    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.session).toBeNull();
    expect(result.current.accessToken).toBeNull();
  });

  it('logout calls signOut and redirects to login', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: '1' }, accessToken: 'token', expires: '2099-01-01' },
      status: 'authenticated',
    });
    mockSignOut.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
    expect(mockPush).toHaveBeenCalledWith('/login');
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('login calls signIn with credentials and redirects on success', async () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
    mockSignIn.mockResolvedValue({ ok: true, error: null });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('user@example.com', 'password123');
    });

    expect(mockSignIn).toHaveBeenCalledWith('credentials', {
      email: 'user@example.com',
      password: 'password123',
      mode: 'login',
      redirect: false,
    });
    expect(mockPush).toHaveBeenCalledWith('/');
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('login returns result without redirecting on failure', async () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
    mockSignIn.mockResolvedValue({ ok: false, error: 'CredentialsSignin' });

    const { result } = renderHook(() => useAuth());

    let loginResult: Awaited<ReturnType<typeof result.current.login>>;
    await act(async () => {
      loginResult = await result.current.login('user@example.com', 'wrongpassword');
    });

    expect(mockPush).not.toHaveBeenCalled();
    expect(loginResult!.ok).toBe(false);
  });

  it('register calls signIn with register mode and redirects on success', async () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
    mockSignIn.mockResolvedValue({ ok: true, error: null });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.register('new@example.com', 'pass123', 'newuser');
    });

    expect(mockSignIn).toHaveBeenCalledWith('credentials', {
      email: 'new@example.com',
      password: 'pass123',
      username: 'newuser',
      mode: 'register',
      redirect: false,
    });
    expect(mockPush).toHaveBeenCalledWith('/');
  });
});
