/**
 * Password Security Utility
 * Bcryptjs password hashing and comparison routines.
 * Aligned with Task AUTH-01 specification.
 */

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hashes a plain text password with 10 salt rounds.
 */
export async function hashPassword(plainText: string): Promise<string> {
  return await bcrypt.hash(plainText, SALT_ROUNDS);
}

/**
 * Compares a plain text password with a hashed password.
 */
export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(plainText, hash);
}
