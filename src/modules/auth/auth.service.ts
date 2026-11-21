/**
 * CyberRig Authentication & Identity Service
 * Handles registration, brute-force lockout, MFA enforcement, JWT Refresh Token Rotation
 * with Reuse Detection, and immediate Access Token revocation via Redis blacklist.
 */

import { randomUUID } from 'node:crypto';
import { redis, RedisClient } from '../../core/redis';
import {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
  EntityNotFoundError,
} from '../../core/errors/domain.error';
import {
  auditLogService,
  sanitizeTextInput,
  tokenBlacklistService,
} from '../../core/security';
import {
  AuthTokens,
  JwtAuthPayload,
  LoginDto,
  RegisterDto,
  UserProfile,
  toUserProfile,
} from './user.model';
import { IUserRepository, userRepository } from './user.repository';
import { comparePassword, hashPassword } from './password.util';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from './jwt.util';
import { MfaService, mfaService } from './mfa.service';

const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCKOUT_SECONDS = 15 * 60; // 15 minutes
const COMMON_WEAK_PASSWORDS = new Set(['123456', 'password', '12345678', 'qwerty', 'admin123']);

export interface AuthContextMeta {
  ipAddress?: string;
}

export class AuthService {
  private readonly mfa: MfaService;

  constructor(
    private readonly userRepo: IUserRepository = userRepository,
    private readonly redisClient: RedisClient = redis,
    mfaSvc?: MfaService
  ) {
    this.mfa = mfaSvc || (redisClient === redis ? mfaService : new MfaService(redisClient));
  }

  private getRefreshKey(userId: string): string {
    return `auth:refresh:${userId}`;
  }

  private getUsedRefreshKey(jti: string): string {
    return `auth:refresh:used:${jti}`;
  }

  private getFailedAttemptsKey(email: string): string {
    return `auth:lockout:fail:${email.toLowerCase().trim()}`;
  }

  private getLockoutKey(email: string): string {
    return `auth:lockout:locked:${email.toLowerCase().trim()}`;
  }

  /**
   * Registers a new user account with input sanitization and password checks.
   */
  async register(dto: RegisterDto): Promise<AuthTokens> {
    if (!dto.email || !dto.email.includes('@')) {
      throw new ValidationError('Email không hợp lệ.');
    }
    if (!dto.password || dto.password.length < 6) {
      throw new ValidationError('Mật khẩu phải có tối thiểu 6 ký tự.');
    }
    if (COMMON_WEAK_PASSWORDS.has(dto.password.toLowerCase())) {
      throw new ValidationError('Mật khẩu quá phổ biến và dễ bị dò đoán. Vui lòng chọn mật khẩu mạnh hơn.');
    }

    const cleanFullName = sanitizeTextInput(dto.fullName, 100);
    if (!cleanFullName) {
      throw new ValidationError('Họ và tên không được để trống.');
    }

    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError('Email đã được sử dụng.');
    }

    const passwordHash = await hashPassword(dto.password);
    const user = await this.userRepo.createUser(
      { ...dto, fullName: cleanFullName, email: dto.email.trim() },
      passwordHash
    );

    const familyId = randomUUID();
    const payload: JwtAuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      familyId,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await this.redisClient.set(
      this.getRefreshKey(user.id),
      refreshToken,
      REFRESH_TOKEN_TTL_SECONDS
    );

    return {
      accessToken,
      refreshToken,
      user: toUserProfile(user),
    };
  }

  /**
   * Authenticates credentials with brute-force lockout protection and optional 2FA TOTP check.
   */
  async login(dto: LoginDto, meta: AuthContextMeta = {}): Promise<AuthTokens> {
    if (!dto.email || !dto.password) {
      throw new UnauthorizedError('Email hoặc mật khẩu không chính xác.');
    }

    const normalizedEmail = dto.email.toLowerCase().trim();

    // 1. Check temporary brute-force lockout
    const locked = await this.redisClient.get(this.getLockoutKey(normalizedEmail));
    if (locked) {
      throw new ForbiddenError(
        'Tài khoản tạm thời bị khóa 15 phút do nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau.'
      );
    }

    // 2. Find user by email
    const user = await this.userRepo.findByEmail(normalizedEmail);
    if (!user) {
      await this.recordFailedLogin(normalizedEmail, null, meta.ipAddress);
      throw new UnauthorizedError('Email hoặc mật khẩu không chính xác.');
    }

    // 3. Check account active flag
    if (!user.isActive) {
      throw new ForbiddenError('Tài khoản đã bị khóa.');
    }

    // 4. Verify password hash
    const isMatch = await comparePassword(dto.password, user.passwordHash);
    if (!isMatch) {
      await this.recordFailedLogin(normalizedEmail, user.id, meta.ipAddress);
      throw new UnauthorizedError('Email hoặc mật khẩu không chính xác.');
    }

    // 5. Enforce 2FA TOTP if user has enabled MFA
    await this.mfa.enforceMfaOnLogin(user.id, dto.totpCode);

    // 6. Clear failed attempt counters on success
    await this.redisClient.del(this.getFailedAttemptsKey(normalizedEmail));

    const familyId = randomUUID();
    const payload: JwtAuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      familyId,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await this.redisClient.set(
      this.getRefreshKey(user.id),
      refreshToken,
      REFRESH_TOKEN_TTL_SECONDS
    );

    await auditLogService.record({
      eventType: 'AUTH_LOGIN_SUCCESS',
      severity: 'INFO',
      actorId: user.id,
      actorRole: user.role,
      actorEmail: user.email,
      ipAddress: meta.ipAddress,
      resourceType: 'auth_session',
      resourceId: user.id,
      message: `Đăng nhập thành công (${user.role}).`,
    });

    return {
      accessToken,
      refreshToken,
      user: toUserProfile(user),
    };
  }

  private async recordFailedLogin(
    email: string,
    userId: string | null,
    ipAddress?: string
  ): Promise<void> {
    const key = this.getFailedAttemptsKey(email);
    const currentRaw = await this.redisClient.get(key);
    const nextCount = (currentRaw ? parseInt(currentRaw, 10) : 0) + 1;
    await this.redisClient.set(key, String(nextCount), ACCOUNT_LOCKOUT_SECONDS);

    if (nextCount >= MAX_FAILED_LOGIN_ATTEMPTS) {
      await this.redisClient.set(this.getLockoutKey(email), '1', ACCOUNT_LOCKOUT_SECONDS);
      await auditLogService.record({
        eventType: 'AUTH_ACCOUNT_LOCKED',
        severity: 'CRITICAL',
        actorId: userId,
        actorRole: 'GUEST',
        actorEmail: email,
        ipAddress,
        resourceType: 'auth_account',
        resourceId: email,
        message: `Khóa tạm 15 phút tài khoản [${email}] sau ${nextCount} lần đăng nhập sai liên tiếp (Chống Brute-Force).`,
        metadata: { attempts: nextCount },
      });
    } else {
      await auditLogService.record({
        eventType: 'AUTH_LOGIN_FAILED',
        severity: 'WARN',
        actorId: userId,
        actorRole: 'GUEST',
        actorEmail: email,
        ipAddress,
        resourceType: 'auth_account',
        resourceId: email,
        message: `Đăng nhập thất bại lần ${nextCount}/${MAX_FAILED_LOGIN_ATTEMPTS} cho [${email}].`,
        metadata: { attempts: nextCount },
      });
    }
  }

  /**
   * Rotates Refresh Token and issues a fresh Access + Refresh Token pair.
   * Implements Reuse Detection: if a previously rotated refresh token is replayed,
   * revokes the entire user session immediately and emits a CRITICAL SOC alert.
   */
  async refreshToken(
    token: string,
    meta: AuthContextMeta = {}
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!token) {
      throw new UnauthorizedError('Vui lòng cung cấp refresh token.');
    }

    const payload = verifyRefreshToken(token);
    const storedToken = await this.redisClient.get(this.getRefreshKey(payload.userId));

    // Reuse Detection: previously consumed token presented again -> compromise suspected
    if (payload.jti) {
      const wasUsed = await this.redisClient.get(this.getUsedRefreshKey(payload.jti));
      if (wasUsed) {
        await this.redisClient.del(this.getRefreshKey(payload.userId));
        await auditLogService.record({
          eventType: 'TOKEN_REUSE_DETECTED',
          severity: 'CRITICAL',
          actorId: payload.userId,
          actorRole: payload.role,
          actorEmail: payload.email,
          ipAddress: meta.ipAddress,
          resourceType: 'auth_session',
          resourceId: payload.userId,
          message: `PHÁT HIỆN REUSE REFRESH TOKEN (jti=${payload.jti})! Đã thu hồi toàn bộ phiên đăng nhập.`,
        });
        throw new UnauthorizedError(
          'Phát hiện tái sử dụng refresh token bất thường. Toàn bộ phiên đăng nhập đã bị thu hồi để bảo vệ tài khoản.'
        );
      }
    }

    if (!storedToken || storedToken !== token) {
      throw new UnauthorizedError('Refresh token không hợp lệ hoặc đã bị thu hồi.');
    }

    // Mark consumed token jti for reuse detection window
    if (payload.jti) {
      await this.redisClient.set(
        this.getUsedRefreshKey(payload.jti),
        '1',
        REFRESH_TOKEN_TTL_SECONDS
      );
    }

    const nextPayload: JwtAuthPayload = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      fullName: payload.fullName,
      familyId: payload.familyId || randomUUID(),
    };

    const newAccessToken = signAccessToken(nextPayload);
    const newRefreshToken = signRefreshToken(nextPayload);

    await this.redisClient.set(
      this.getRefreshKey(payload.userId),
      newRefreshToken,
      REFRESH_TOKEN_TTL_SECONDS
    );

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  /**
   * Logs out a user by deleting their Redis Refresh Token AND blacklisting their current Access Token jti.
   */
  async logout(
    userId: string,
    accessTokenMeta?: { jti?: string; exp?: number; email?: string; role?: string; ipAddress?: string }
  ): Promise<void> {
    if (userId) {
      await this.redisClient.del(this.getRefreshKey(userId));
    }

    if (accessTokenMeta?.jti) {
      const nowSec = Math.floor(Date.now() / 1000);
      const remainingTtl = accessTokenMeta.exp ? Math.max(1, accessTokenMeta.exp - nowSec) : 900;
      await tokenBlacklistService.revoke(accessTokenMeta.jti, remainingTtl);
    }

    await auditLogService.record({
      eventType: 'AUTH_LOGOUT',
      severity: 'INFO',
      actorId: userId,
      actorRole: accessTokenMeta?.role || 'CUSTOMER',
      actorEmail: accessTokenMeta?.email,
      ipAddress: accessTokenMeta?.ipAddress,
      resourceType: 'auth_session',
      resourceId: userId,
      message: 'Đăng xuất và thu hồi Access/Refresh Token thành công.',
    });
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new EntityNotFoundError(`Không tìm thấy người dùng với ID: ${userId}`);
    }
    return toUserProfile(user);
  }
}

export const authService = new AuthService();
export default authService;
