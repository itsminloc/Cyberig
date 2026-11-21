/**
 * CyberRig User Repository
 * Data access layer for user queries and creation in PostgreSQL with In-Memory fallback.
 * Aligned with Task AUTH-01 specification.
 */

import db, { DatabaseClient } from '../../core/db';
import {
  RegisterDto,
  User,
  UserRole,
  UserRow,
  toDomainUser,
} from './user.model';

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  createUser(dto: RegisterDto, passwordHash: string): Promise<User>;
  updateUser?(id: string, partial: Partial<User>): Promise<User | null>;
  clearTestData?(): Promise<void>;
}

export const DEMO_SEED_USERS: User[] = [
  {
    id: '11111111-2222-3333-4444-555555555555',
    email: 'customer@cyberig.vn',
    passwordHash: '$2b$10$YVq09L7wSFsOqX/uzOlZ8u/YCnXWVOrZV3kKdhjmFn5XozbvrAX/q', // Customer@Password123
    role: 'CUSTOMER',
    fullName: 'Nguyễn Văn Khách',
    phone: '0900000003',
    isActive: true,
    createdAt: new Date('2026-09-01T00:00:00Z'),
    updatedAt: new Date('2026-09-01T00:00:00Z'),
  },
  {
    id: '22222222-3333-4444-5555-666666666666',
    email: 'tech@cyberig.vn',
    passwordHash: '$2b$10$ZnWfHMQo45KJCH5mdZpeAe/D8yNNsDwKStmHxnwQvY8yBWD8cFXYe', // Tech@Password123
    role: 'TECHNICIAN',
    fullName: 'Kỹ Thuật Viên Tuấn',
    phone: '0900000002',
    isActive: true,
    createdAt: new Date('2026-09-01T00:00:00Z'),
    updatedAt: new Date('2026-09-01T00:00:00Z'),
  },
  {
    id: '33333333-4444-5555-6666-777777777777',
    email: 'admin@cyberig.vn',
    passwordHash: '$2b$10$XBzwt1Nfpp/9BOfe4EaeSeLePQwNbF90p/bIf2ZTRS5Q/2LV73txa', // Admin@Password123
    role: 'ADMIN',
    fullName: 'Quản Trị Viên CyberRig',
    phone: '0900000001',
    isActive: true,
    createdAt: new Date('2026-09-01T00:00:00Z'),
    updatedAt: new Date('2026-09-01T00:00:00Z'),
  },
];

/**
 * In-Memory User Repository implementation for unit testing and offline environments.
 */
export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, User> = new Map();

  constructor() {
    this.seedDefaultUsers();
  }

  private seedDefaultUsers(): void {
    for (const u of DEMO_SEED_USERS) {
      this.users.set(u.id, { ...u });
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const target = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === target) {
        return { ...user };
      }
    }
    return null;
  }

  async findById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  async createUser(dto: RegisterDto, passwordHash: string): Promise<User> {
    const { randomUUID } = await import('node:crypto');
    const now = new Date();
    const newUser: User = {
      id: randomUUID(),
      email: dto.email.trim().toLowerCase(),
      passwordHash,
      role: dto.role || 'CUSTOMER',
      fullName: dto.fullName.trim(),
      phone: (dto.phone || '0900000000').trim(),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(newUser.id, newUser);
    return { ...newUser };
  }

  async updateUser(id: string, partial: Partial<User>): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;
    const updated = { ...user, ...partial, updatedAt: new Date() };
    this.users.set(id, updated);
    return { ...updated };
  }

  async clearTestData(): Promise<void> {
    this.users.clear();
    this.seedDefaultUsers();
  }
}

export class PostgresUserRepository implements IUserRepository {
  private readonly fallbackRepo: InMemoryUserRepository;

  constructor(
    private readonly dbClient: DatabaseClient = db,
    fallbackRepo?: InMemoryUserRepository
  ) {
    this.fallbackRepo = fallbackRepo || new InMemoryUserRepository();
  }

  /**
   * Finds a user by email (case-insensitive) with fallback to in-memory store.
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const rows = await this.dbClient.query<UserRow>(
        'SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1;',
        [email.trim()]
      );

      if (!rows || rows.length === 0) {
        return this.fallbackRepo.findByEmail(email);
      }

      return toDomainUser(rows[0]);
    } catch (err) {
      console.warn('[UserRepository] DB query failed, falling back to in-memory repository:', (err as any)?.message || err);
      return this.fallbackRepo.findByEmail(email);
    }
  }

  /**
   * Finds a user by primary key ID with fallback to in-memory store.
   */
  async findById(id: string): Promise<User | null> {
    try {
      const rows = await this.dbClient.query<UserRow>(
        'SELECT * FROM users WHERE id::text = $1 LIMIT 1;',
        [id.trim()]
      );

      if (!rows || rows.length === 0) {
        return this.fallbackRepo.findById(id);
      }

      return toDomainUser(rows[0]);
    } catch (err) {
      console.warn('[UserRepository] DB query failed, falling back to in-memory repository:', (err as any)?.message || err);
      return this.fallbackRepo.findById(id);
    }
  }

  /**
   * Inserts a new user record with automatic fallback if DB is disconnected.
   */
  async createUser(dto: RegisterDto, passwordHash: string): Promise<User> {
    const role: UserRole = dto.role || 'CUSTOMER';

    // Pre-create in fallback repo so user can immediately login regardless of DB state
    const inMemUser = await this.fallbackRepo.createUser(dto, passwordHash);

    try {
      const rows = await this.dbClient.query<UserRow>(
        `INSERT INTO users (id, email, password_hash, role, full_name, phone, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)
         RETURNING *;`,
        [inMemUser.id, dto.email.trim().toLowerCase(), passwordHash, role, dto.fullName.trim(), (dto.phone || '0900000000').trim()]
      );

      if (!rows || rows.length === 0) {
        return inMemUser;
      }

      return toDomainUser(rows[0]);
    } catch (err) {
      console.warn('[UserRepository] DB insert failed, preserved in in-memory repository:', (err as any)?.message || err);
      return inMemUser;
    }
  }

  /**
   * Updates partial user fields (e.g. status or role).
   */
  async updateUser(id: string, partial: Partial<User>): Promise<User | null> {
    const inMemResult = await this.fallbackRepo.updateUser(id, partial);
    try {
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (partial.isActive !== undefined) {
        fields.push(`is_active = $${idx++}`);
        values.push(partial.isActive);
      }
      if (partial.role !== undefined) {
        fields.push(`role = $${idx++}`);
        values.push(partial.role);
      }
      if (fields.length === 0) return this.findById(id);

      fields.push(`updated_at = NOW()`);
      values.push(id);
      const sql = `UPDATE users SET ${fields.join(', ')} WHERE id::text = $${idx} RETURNING *;`;
      const rows = await this.dbClient.query<UserRow>(sql, values);
      return rows.length > 0 ? toDomainUser(rows[0]) : inMemResult;
    } catch (err) {
      console.warn('[UserRepository] DB update failed, falling back to in-memory repository:', (err as any)?.message || err);
      return inMemResult;
    }
  }

  async clearTestData(): Promise<void> {
    await this.fallbackRepo.clearTestData();
  }
}

export const userRepository: IUserRepository = new PostgresUserRepository();
export default userRepository;
