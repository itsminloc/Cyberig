/**
 * Password Security Utility
 * Bcryptjs password hashing and comparison routines.
 * Aligned with Task AUTH-01 specification.
 */

import bcrypt from 'bcryptjs';
import { config } from '../../core/config';

/**
 * Hashes a plain text password with environment-hardened bcrypt cost factor (12 in prod, 10 in dev/test).
 */
export async function hashPassword(plainText: string): Promise<string> {
  return await bcrypt.hash(plainText, config.security.bcryptRounds);
}

/**
 * Compares a plain text password with a hashed password.
 */
export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(plainText, hash);
}
