/**
 * CyberRig Multi-Factor Authentication (MFA / 2FA TOTP) Service
 * Implements RFC 6238 TOTP enrollment, verification, and revocation for privileged roles.
 */

import { redis, RedisClient } from '../../core/redis';
import { UnauthorizedError, ValidationError } from '../../core/errors/domain.error';
import {
  generateTotpSecret,
  verifyTotpCode,
  buildOtpAuthUri,
  auditLogService,
} from '../../core/security';

const MFA_PENDING_TTL_SEC = 10 * 60; // 10 minutes to finish QR setup

export interface MfaSetupResult {
  secret: string;
  otpauthUrl: string;
  issuer: string;
  algorithm: 'SHA1';
  digits: 6;
  periodSeconds: 30;
}

export class MfaService {
  constructor(private readonly redisClient: RedisClient = redis) {}

  private getPendingKey(userId: string): string {
    return `auth:mfa:pending:${userId}`;
  }

  private getActiveKey(userId: string): string {
    return `auth:mfa:secret:${userId}`;
  }

  /**
   * Starts 2FA enrollment by generating a Base32 TOTP secret and otpauth:// URI.
   */
  async setupMfa(userId: string, email: string): Promise<MfaSetupResult> {
    const secret = generateTotpSecret(20);
    await this.redisClient.set(this.getPendingKey(userId), secret, MFA_PENDING_TTL_SEC);

    return {
      secret,
      otpauthUrl: buildOtpAuthUri(email, secret, 'CyberRig'),
      issuer: 'CyberRig',
      algorithm: 'SHA1',
      digits: 6,
      periodSeconds: 30,
    };
  }

  /**
   * Verifies the first 6-digit TOTP code and permanently activates 2FA for the user.
   */
  async verifyAndEnableMfa(
    userId: string,
    email: string,
    role: string,
    totpCode: string,
    ipAddress?: string
  ): Promise<{ enabled: boolean }> {
    const pendingSecret = await this.redisClient.get(this.getPendingKey(userId));
    if (!pendingSecret) {
      throw new ValidationError('Chưa khởi tạo thiết lập 2FA hoặc mã thiết lập đã hết hạn. Vui lòng gọi /2fa/setup trước.');
    }

    if (!verifyTotpCode(pendingSecret, totpCode)) {
      throw new UnauthorizedError('Mã xác thực 2FA (6 chữ số) không chính xác.');
    }

    await this.redisClient.set(this.getActiveKey(userId), pendingSecret);
    await this.redisClient.del(this.getPendingKey(userId));

    await auditLogService.record({
      eventType: 'MFA_ENABLED',
      severity: 'INFO',
      actorId: userId,
      actorRole: role,
      actorEmail: email,
      ipAddress,
      resourceType: 'auth_mfa',
      resourceId: userId,
      message: 'Đã kích hoạt xác thực 2 lớp (TOTP 2FA) thành công.',
    });

    return { enabled: true };
  }

  /**
   * Disables 2FA after confirming the user holds a valid current TOTP code.
   */
  async disableMfa(
    userId: string,
    email: string,
    role: string,
    totpCode: string,
    ipAddress?: string
  ): Promise<{ enabled: boolean }> {
    const activeSecret = await this.redisClient.get(this.getActiveKey(userId));
    if (!activeSecret) {
      return { enabled: false };
    }

    if (!verifyTotpCode(activeSecret, totpCode)) {
      throw new UnauthorizedError('Mã xác thực 2FA không chính xác, không thể tắt bảo mật 2 lớp.');
    }

    await this.redisClient.del(this.getActiveKey(userId));

    await auditLogService.record({
      eventType: 'MFA_DISABLED',
      severity: 'WARN',
      actorId: userId,
      actorRole: role,
      actorEmail: email,
      ipAddress,
      resourceType: 'auth_mfa',
      resourceId: userId,
      message: 'Đã tắt xác thực 2 lớp (TOTP 2FA).',
    });

    return { enabled: false };
  }

  /**
   * Checks whether 2FA is active for a user and validates the login TOTP code if enabled.
   */
  async enforceMfaOnLogin(userId: string, totpCode?: string): Promise<void> {
    const activeSecret = await this.redisClient.get(this.getActiveKey(userId));
    if (!activeSecret) return;

    if (!totpCode) {
      throw new UnauthorizedError('Tài khoản đã bật bảo mật 2 lớp (2FA). Vui lòng cung cấp mã TOTP 6 chữ số (totpCode).');
    }

    if (!verifyTotpCode(activeSecret, totpCode)) {
      throw new UnauthorizedError('Mã xác thực 2 lớp (TOTP) không chính xác hoặc đã hết hạn.');
    }
  }

  async isMfaEnabled(userId: string): Promise<boolean> {
    const activeSecret = await this.redisClient.get(this.getActiveKey(userId));
    return Boolean(activeSecret);
  }
}

export const mfaService = new MfaService();
export default mfaService;
