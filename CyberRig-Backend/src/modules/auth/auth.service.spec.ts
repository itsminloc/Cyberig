/**
 * CyberRig Authentication & 3-Role RBAC Unit Test Suite
 * Tests registration, login, token refresh, logout, and RBAC guards.
 * Aligned with Task AUTH-01 specification.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from './auth.service';
import { InMemoryUserRepository } from './user.repository';
import { RedisClient } from '../../core/redis';
import {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from '../../core/errors/domain.error';
import { requireRoles, authenticateToken } from '../../core/middlewares/auth.middleware';
import { Request, Response, NextFunction } from 'express';
import { signAccessToken, verifyAccessToken } from './jwt.util';

describe('Identity, JWT Engine & 3-Role RBAC System (Task AUTH-01)', () => {
  let userRepo: InMemoryUserRepository;
  let redisClient: RedisClient;
  let authService: AuthService;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    redisClient = new RedisClient();
    authService = new AuthService(userRepo, redisClient);
  });

  test('Test 1: Đăng ký thành công trả về access/refresh token và profile không có passwordHash', async () => {
    const tokens = await authService.register({
      email: 'gamer@cyberig.vn',
      password: 'SecurePassword123',
      fullName: 'Võ Văn Game',
      phone: '0912345678',
    });

    assert.ok(tokens.accessToken, 'Phải có accessToken');
    assert.ok(tokens.refreshToken, 'Phải có refreshToken');
    assert.ok(tokens.user, 'Phải trả về user profile');
    assert.equal(tokens.user.email, 'gamer@cyberig.vn');
    assert.equal(tokens.user.fullName, 'Võ Văn Game');
    assert.equal(tokens.user.role, 'CUSTOMER');
    assert.equal(tokens.user.isActive, true);
    assert.equal((tokens.user as any).passwordHash, undefined, 'Tuyệt đối không để lộ passwordHash');

    // Kiểm tra token đã được lưu vào Redis whitelist
    const storedToken = await redisClient.get(`auth:refresh:${tokens.user.id}`);
    assert.equal(storedToken, tokens.refreshToken, 'Refresh token phải khớp trong Redis');
  });

  test('Test 2: Đăng ký email trùng lặp ném ConflictError (HTTP 409)', async () => {
    await authService.register({
      email: 'dup@cyberig.vn',
      password: 'Password123',
      fullName: 'User Một',
      phone: '0901111111',
    });

    await assert.rejects(
      async () => {
        await authService.register({
          email: 'dup@cyberig.vn',
          password: 'AnotherPassword456',
          fullName: 'User Hai',
          phone: '0902222222',
        });
      },
      (err: any) => {
        assert.ok(err instanceof ConflictError, 'Phải là ConflictError');
        assert.equal(err.statusCode, 409);
        assert.equal(err.code, 'CONFLICT');
        assert.match(err.message, /Email đã được sử dụng/);
        return true;
      }
    );
  });

  test('Test 3: Đăng ký với mật khẩu yếu (< 6 ký tự) hoặc email sai ném ValidationError', async () => {
    await assert.rejects(
      async () => {
        await authService.register({
          email: 'invalid-email',
          password: '12345',
          fullName: 'Test User',
          phone: '0900000000',
        });
      },
      (err: any) => {
        assert.ok(err instanceof ValidationError);
        assert.equal(err.statusCode, 400);
        return true;
      }
    );
  });

  test('Test 4: Đăng nhập thành công với mật khẩu đúng', async () => {
    await authService.register({
      email: 'login@cyberig.vn',
      password: 'CorrectPassword123',
      fullName: 'Nguyễn Đăng Nhập',
      phone: '0903333333',
    });

    const loginResult = await authService.login({
      email: 'login@cyberig.vn',
      password: 'CorrectPassword123',
    });

    assert.ok(loginResult.accessToken);
    assert.ok(loginResult.refreshToken);
    assert.equal(loginResult.user.email, 'login@cyberig.vn');
  });

  test('Test 5: Đăng nhập sai mật khẩu ném UnauthorizedError (HTTP 401)', async () => {
    await authService.register({
      email: 'wrongpass@cyberig.vn',
      password: 'MySecretPassword123',
      fullName: 'Lê Văn Sai',
      phone: '0904444444',
    });

    await assert.rejects(
      async () => {
        await authService.login({
          email: 'wrongpass@cyberig.vn',
          password: 'WrongPassword999',
        });
      },
      (err: any) => {
        assert.ok(err instanceof UnauthorizedError, 'Phải là UnauthorizedError');
        assert.equal(err.statusCode, 401);
        assert.equal(err.code, 'UNAUTHORIZED');
        assert.match(err.message, /Email hoặc mật khẩu không chính xác/);
        return true;
      }
    );
  });

  test('Test 6: Đăng nhập tài khoản bị khóa (isActive = false) ném ForbiddenError (HTTP 403)', async () => {
    const registered = await authService.register({
      email: 'locked@cyberig.vn',
      password: 'LockedPassword123',
      fullName: 'Tài Khoản Khóa',
      phone: '0905555555',
    });

    // Giả lập khóa tài khoản
    await userRepo.updateUser!(registered.user.id, { isActive: false });

    await assert.rejects(
      async () => {
        await authService.login({
          email: 'locked@cyberig.vn',
          password: 'LockedPassword123',
        });
      },
      (err: any) => {
        assert.ok(err instanceof ForbiddenError, 'Phải là ForbiddenError');
        assert.equal(err.statusCode, 403);
        assert.equal(err.code, 'FORBIDDEN');
        assert.match(err.message, /Tài khoản đã bị khóa/);
        return true;
      }
    );
  });

  test('Test 7: Cấp lại accessToken thành công khi refreshToken hợp lệ và có trong Redis', async () => {
    const reg = await authService.register({
      email: 'refresh@cyberig.vn',
      password: 'RefreshPassword123',
      fullName: 'Trần Làm Mới',
      phone: '0906666666',
    });

    const refreshResult = await authService.refreshToken(reg.refreshToken);
    assert.ok(refreshResult.accessToken, 'Phải cấp accessToken mới');

    // Xác nhận access token mới giải mã hợp lệ
    const decoded = verifyAccessToken(refreshResult.accessToken);
    assert.equal(decoded.userId, reg.user.id);
    assert.equal(decoded.email, 'refresh@cyberig.vn');
    assert.equal(decoded.role, 'CUSTOMER');
  });

  test('Test 8: RefreshToken không khớp trong Redis ném UnauthorizedError', async () => {
    const reg = await authService.register({
      email: 'tampered@cyberig.vn',
      password: 'TamperedPass123',
      fullName: 'Token Giả Mạo',
      phone: '0907777777',
    });

    // Giả lập token bị thu hồi hoặc xóa khỏi Redis
    await redisClient.del(`auth:refresh:${reg.user.id}`);

    await assert.rejects(
      async () => {
        await authService.refreshToken(reg.refreshToken);
      },
      (err: any) => {
        assert.ok(err instanceof UnauthorizedError);
        assert.equal(err.statusCode, 401);
        return true;
      }
    );
  });

  test('Test 9: Đăng xuất xóa bỏ refresh token trong Redis thành công', async () => {
    const reg = await authService.register({
      email: 'logout@cyberig.vn',
      password: 'LogoutPassword123',
      fullName: 'Vũ Đăng Xuất',
      phone: '0908888888',
    });

    assert.ok(await redisClient.get(`auth:refresh:${reg.user.id}`));

    await authService.logout(reg.user.id);

    const afterLogout = await redisClient.get(`auth:refresh:${reg.user.id}`);
    assert.equal(afterLogout, null, 'Key trong Redis phải bị xóa sạch');
  });

  test('Test 10 (RBAC Guard): User role CUSTOMER bị chặn HTTP 403 khi truy cập tài nguyên TECHNICIAN hoặc ADMIN', async () => {
    const guard = requireRoles('TECHNICIAN', 'ADMIN');

    const customerReq = {
      user: {
        userId: 'user-001',
        email: 'customer@cyberig.vn',
        role: 'CUSTOMER',
        fullName: 'Khách Hàng',
      },
    } as unknown as Request;

    let caughtError: any = null;
    const next: NextFunction = (err?: any) => {
      caughtError = err;
    };

    guard(customerReq, {} as Response, next);

    assert.ok(caughtError instanceof ForbiddenError, 'Phải trả về ForbiddenError');
    assert.equal(caughtError.statusCode, 403);
    assert.equal(caughtError.code, 'FORBIDDEN');
    assert.match(caughtError.message, /Bạn không có quyền thực hiện hành động này/);
  });

  test('Test 11 (RBAC Guard): User role TECHNICIAN hoặc ADMIN được phép đi tiếp next()', async () => {
    const guard = requireRoles('TECHNICIAN', 'ADMIN');

    const techReq = {
      user: {
        userId: 'tech-001',
        email: 'tech@cyberig.vn',
        role: 'TECHNICIAN',
        fullName: 'Kỹ Thuật Viên',
      },
    } as unknown as Request;

    let passed = false;
    const next: NextFunction = (err?: any) => {
      if (!err) passed = true;
    };

    guard(techReq, {} as Response, next);
    assert.equal(passed, true, 'TECHNICIAN phải được đi tiếp');

    // Kiểm tra ADMIN
    const adminReq = {
      user: {
        userId: 'admin-001',
        email: 'admin@cyberig.vn',
        role: 'ADMIN',
        fullName: 'Admin',
      },
    } as unknown as Request;

    let adminPassed = false;
    guard(adminReq, {} as Response, (err?: any) => {
      if (!err) adminPassed = true;
    });
    assert.equal(adminPassed, true, 'ADMIN phải được đi tiếp');
  });

  test('Test 12 (Auth Middleware): Header không có token ném UnauthorizedError', async () => {
    const req = {
      headers: {},
    } as unknown as Request;

    let authError: any = null;
    authenticateToken(req, {} as Response, (err?: any) => {
      authError = err;
    });

    assert.ok(authError instanceof UnauthorizedError);
    assert.equal(authError.statusCode, 401);
  });

  test('Test 13 (Auth Middleware): Header Bearer Token hợp lệ giải mã đúng vào req.user', async () => {
    const validToken = signAccessToken({
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'tester@cyberig.vn',
      role: 'ADMIN',
      fullName: 'System Tester',
    });

    const req = {
      headers: {
        authorization: `Bearer ${validToken}`,
      },
    } as unknown as Request;

    let nextCalled = false;
    authenticateToken(req, {} as Response, (err?: any) => {
      assert.equal(err, undefined);
      nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.ok(req.user);
    assert.equal(req.user.userId, '123e4567-e89b-12d3-a456-426614174000');
    assert.equal(req.user.role, 'ADMIN');
  });
});
