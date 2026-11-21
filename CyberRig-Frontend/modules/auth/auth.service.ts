/**
 * CyberRig Authentication & Identity Service
 * Handles user registration, credentials authentication, JWT token rotation, and Redis session tracking.
 * Aligned with Task AUTH-01 specification.
 */

import { redis, RedisClient } from '../../core/redis';
import {
  ConflictError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
  EntityNotFoundError,
} from '../../core/errors/domain.error';
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

const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 604,800 seconds (7 days)

export class AuthService {
  constructor(
    private readonly userRepo: IUserRepository = userRepository,
    private readonly redisClient: RedisClient = redis
  ) {}

  private getRefreshKey(userId: string): string {
    return `auth:refresh:${userId}`;
  }

  /**
   * Registers a new user account.
   */
  async register(dto: RegisterDto): Promise<AuthTokens> {
    // 1. Basic validation
    if (!dto.email || !dto.email.includes('@')) {
      throw new ValidationError('Email không hợp lệ.');
    }
    if (!dto.password || dto.password.length < 6) {
      throw new ValidationError('Mật khẩu phải có tối thiểu 6 ký tự.');
    }
    if (!dto.fullName || dto.fullName.trim().length === 0) {
      throw new ValidationError('Họ và tên không được để trống.');
    }

    // 2. Check for duplicate email
    const existing = await this.userRepo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError('Email đã được sử dụng.');
    }

    // 3. Hash password and persist user
    const passwordHash = await hashPassword(dto.password);
    const user = await this.userRepo.createUser(dto, passwordHash);

    // 4. Generate JWT tokens
    const payload: JwtAuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // 5. Store refresh token in Redis whitelist
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
   * Authenticates credentials and issues access & refresh tokens.
   */
  async login(dto: LoginDto): Promise<AuthTokens> {
    if (!dto.email || !dto.password) {
      throw new UnauthorizedError('Email hoặc mật khẩu không chính xác.');
    }

    // 1. Find user by email
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedError('Email hoặc mật khẩu không chính xác.');
    }

    // 2. Check account status
    if (!user.isActive) {
      throw new ForbiddenError('Tài khoản đã bị khóa.');
    }

    // 3. Compare password
    const isMatch = await comparePassword(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Email hoặc mật khẩu không chính xác.');
    }

    // 4. Generate tokens
    const payload: JwtAuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // 5. Save refresh token to Redis
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
   * Refreshes an expired access token using a valid refresh token.
   */
  async refreshToken(token: string): Promise<{ accessToken: string }> {
    if (!token) {
      throw new UnauthorizedError('Vui lòng cung cấp refresh token.');
    }

    // 1. Verify cryptographic validity & expiry
    const payload = verifyRefreshToken(token);

    // 2. Check token in Redis whitelist
    const storedToken = await this.redisClient.get(this.getRefreshKey(payload.userId));
    if (!storedToken || storedToken !== token) {
      throw new UnauthorizedError('Refresh token không hợp lệ hoặc đã bị thu hồi.');
    }

    // 3. Issue new short-lived access token
    const newAccessToken = signAccessToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      fullName: payload.fullName,
    });

    return { accessToken: newAccessToken };
  }

  /**
   * Logs out a user by invalidating their refresh token in Redis.
   */
  async logout(userId: string): Promise<void> {
    if (userId) {
      await this.redisClient.del(this.getRefreshKey(userId));
    }
  }

  /**
   * Retrieves profile for an authenticated user.
   */
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
