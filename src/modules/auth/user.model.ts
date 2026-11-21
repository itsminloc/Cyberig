/**
 * CyberRig Identity & User Domain Model
 * Defines database schema, domain types, and data transfer objects for authentication and RBAC.
 * Aligned with Task AUTH-01 specification.
 */

export type UserRole = 'CUSTOMER' | 'TECHNICIAN' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  fullName: string;
  phone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserProfile = Omit<User, 'passwordHash'>;

export interface JwtAuthPayload {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
  jti?: string;
  familyId?: string;
  exp?: number;
}

export interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  role?: UserRole; // Mặc định CUSTOMER nếu không truyền
}

export interface LoginDto {
  email: string;
  password: string;
  totpCode?: string; // Mã 6 số 2FA nếu tài khoản đã kích hoạt MFA
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  full_name: string;
  phone: string;
  is_active: boolean;
  created_at: string | Date;
  updated_at: string | Date;
}

export function toDomainUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    fullName: row.full_name,
    phone: row.phone,
    isActive: Boolean(row.is_active),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export function toUserProfile(user: User): UserProfile {
  const { passwordHash: _hash, ...profile } = user;
  return profile;
}

export const AUTH_SCHEMA_SQL = `
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('CUSTOMER', 'TECHNICIAN', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Ràng buộc quan hệ với orders và repair_tickets
DO $$ BEGIN
    ALTER TABLE orders 
        ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE repair_tickets 
        ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS technician_id UUID REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;
`;
