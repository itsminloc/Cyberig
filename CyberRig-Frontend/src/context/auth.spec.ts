/**
 * Global Auth Context & HTTP Client Interceptor Unit Tests
 * Aligned with Task FE-08 specification.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEYS,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredUser,
  setStoredSession,
  clearStoredSession,
  UserProfile,
  request,
  authApi,
} from '../services/api';
import { hasRole } from './AuthContext';

describe('Global Auth State & HTTP Client Suite (Task FE-08 / Sprint 4)', () => {
  const sampleUser: UserProfile = {
    id: 'user-tech-1234',
    email: 'tech@cyberig.vn',
    role: 'TECHNICIAN',
    fullName: 'Kỹ Thuật Viên Tuấn',
    phone: '0901234567',
  };

  const sampleTokens = {
    accessToken: 'mock-access-token-xyz',
    refreshToken: 'mock-refresh-token-abc',
    user: sampleUser,
  };

  beforeEach(() => {
    clearStoredSession();
  });

  test('Test 1: Persistent storage getters and setters work properly in memory fallback', () => {
    // 1. Initial empty check
    assert.equal(getStoredAccessToken(), null);
    assert.equal(getStoredRefreshToken(), null);
    assert.equal(getStoredUser(), null);

    // 2. Set session
    setStoredSession(sampleTokens);

    assert.equal(getStoredAccessToken(), sampleTokens.accessToken);
    assert.equal(getStoredRefreshToken(), sampleTokens.refreshToken);
    assert.deepEqual(getStoredUser(), sampleUser);

    // 3. Clear session
    clearStoredSession();
    assert.equal(getStoredAccessToken(), null);
    assert.equal(getStoredRefreshToken(), null);
    assert.equal(getStoredUser(), null);
  });

  test('Test 2: hasRole utility correctly checks role permissions', () => {
    const techUser: UserProfile = {
      id: 'tech-1',
      email: 'tech@cyberig.vn',
      role: 'TECHNICIAN',
      fullName: 'Tech',
      phone: '090',
    };

    const customerUser: UserProfile = {
      id: 'cust-1',
      email: 'cust@cyberig.vn',
      role: 'CUSTOMER',
      fullName: 'Customer',
      phone: '091',
    };

    const adminUser: UserProfile = {
      id: 'admin-1',
      email: 'admin@cyberig.vn',
      role: 'ADMIN',
      fullName: 'Admin',
      phone: '092',
    };

    // Tech role checks
    assert.equal(hasRole(techUser, 'TECHNICIAN'), true);
    assert.equal(hasRole(techUser, 'TECHNICIAN', 'ADMIN'), true);
    assert.equal(hasRole(techUser, 'CUSTOMER'), false);
    assert.equal(hasRole(techUser, 'ADMIN'), false);

    // Customer role checks
    assert.equal(hasRole(customerUser, 'CUSTOMER'), true);
    assert.equal(hasRole(customerUser, 'TECHNICIAN'), false);

    // Admin role checks
    assert.equal(hasRole(adminUser, 'ADMIN'), true);
    assert.equal(hasRole(adminUser, 'TECHNICIAN', 'ADMIN'), true);

    // Null user check
    assert.equal(hasRole(null, 'CUSTOMER'), false);
  });

  test('Test 3: request() automatically injects Bearer token into headers when token exists', async () => {
    setStoredSession(sampleTokens);

    let capturedHeaders: Record<string, string> = {};

    // Mock global fetch for this test
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = (init?.headers as Record<string, string>) || {};
      return new Response(JSON.stringify({ success: true, data: { status: 'ok' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const result = await request<{ status: string }>('/api/test-endpoint');
      assert.equal(result.status, 'ok');
      assert.equal(capturedHeaders['Authorization'], `Bearer ${sampleTokens.accessToken}`);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('Test 4: request() skips Authorization header when skipAuth is true or token is absent', async () => {
    clearStoredSession();

    let capturedHeaders: Record<string, string> = {};

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedHeaders = (init?.headers as Record<string, string>) || {};
      return new Response(JSON.stringify({ success: true, data: { guest: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      // 1. Without token in storage
      await request('/api/guest-order');
      assert.equal(capturedHeaders['Authorization'], undefined);

      // 2. With token in storage but skipAuth: true
      setStoredSession(sampleTokens);
      await request('/api/auth/login', { skipAuth: true });
      assert.equal(capturedHeaders['Authorization'], undefined);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('Test 5: request() triggers 401 refresh token rotation and retries original request', async () => {
    setStoredSession({
      accessToken: 'expired-token-123',
      refreshToken: 'valid-refresh-token-456',
      user: sampleUser,
    });

    let callCount = 0;
    let refreshCalled = false;
    let finalAuthHeader = '';

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes('/api/auth/refresh')) {
        refreshCalled = true;
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: 'brand-new-rotated-token-789',
              user: sampleUser,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      callCount++;
      if (callCount === 1) {
        // First call fails with 401
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Token expired' },
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Retry call succeeds
      finalAuthHeader = (init?.headers as Record<string, string>)?.['Authorization'] || '';
      return new Response(
        JSON.stringify({
          success: true,
          data: { secretData: 999 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      const res = await request<{ secretData: number }>('/api/protected/data');
      assert.equal(res.secretData, 999);
      assert.equal(refreshCalled, true, 'Should have called /api/auth/refresh');
      assert.equal(callCount, 2, 'Original request should have been retried once');
      assert.equal(finalAuthHeader, 'Bearer brand-new-rotated-token-789');
      assert.equal(getStoredAccessToken(), 'brand-new-rotated-token-789');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
