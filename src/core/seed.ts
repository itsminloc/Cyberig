/**
 * CyberRig Database Seeding Script
 * Creates tables if not present and seeds standard benchmark hardware and repair ticket sample.
 */

import { db } from './db';
import { HardwareCategory } from '../modules/hardware/hardware.model';
import { TicketStatus, TicketPriority } from '../modules/repair-tickets/ticket.model';
import { AUTH_SCHEMA_SQL, UserRole } from '../modules/auth/user.model';
import { hashPassword } from '../modules/auth/password.util';
import { AUDIT_SCHEMA_SQL } from './security/audit-log.service';

interface SeedHardwareData {
  categoryId: HardwareCategory;
  name: string;
  brand: string;
  model: string;
  price: number;
  stockQuantity: number;
  specs: Record<string, unknown>;
}

const SAMPLE_HARDWARE_ITEMS: SeedHardwareData[] = [
  // 1. CPU: i5 13600K - LGA1700, TDP 125W
  {
    categoryId: HardwareCategory.CPU,
    name: 'Intel Core i5-13600K Processor',
    brand: 'Intel',
    model: 'BX8071513600K',
    price: 7690000,
    stockQuantity: 25,
    specs: {
      socket: 'LGA1700',
      tdpWatts: 125,
      cores: 14,
      threads: 20,
      baseClockGhz: 3.5,
      boostClockGhz: 5.1,
      integratedGpu: true,
      pcieGen: 5,
    },
  },

  // 2. Motherboard: B760 - LGA1700, DDR5, 4 slots
  {
    categoryId: HardwareCategory.MOTHERBOARD,
    name: 'ASUS TUF GAMING B760-PLUS WIFI DDR5',
    brand: 'ASUS',
    model: 'TUF-B760-PLUS-WIFI',
    price: 4590000,
    stockQuantity: 18,
    specs: {
      socket: 'LGA1700',
      chipset: 'B760',
      formFactor: 'ATX',
      ramType: 'DDR5',
      ramSlots: 4,
      maxRamCapacityGb: 192,
      pcieSlots: 3,
      m2Slots: 3,
      sataPorts: 4,
    },
  },

  // 3. RAM: Corsair 32GB DDR5
  {
    categoryId: HardwareCategory.RAM,
    name: 'Corsair Vengeance RGB 32GB (2x16GB) DDR5 6000MHz Black',
    brand: 'Corsair',
    model: 'CMH32GX5M2B6000C30',
    price: 3290000,
    stockQuantity: 40,
    specs: {
      generation: 'DDR5',
      capacityGb: 32,
      modulesCount: 2,
      speedMhz: 6000,
      casLatency: 'CL30',
    },
  },

  // 4. GPU: RTX 4070 - TDP 200W, dài 300mm
  {
    categoryId: HardwareCategory.GPU,
    name: 'GIGABYTE GeForce RTX 4070 WINDFORCE OC 12G',
    brand: 'GIGABYTE',
    model: 'GV-N4070WF3OC-12GD',
    price: 16890000,
    stockQuantity: 12,
    specs: {
      lengthMm: 300,
      tdpWatts: 200,
      recommendedPsuWatts: 650,
      pcieGeneration: 'PCIe 4.0 x16',
      powerConnectors: ['8-pin'],
      vramGb: 12,
    },
  },

  // 5. PSU: 750W Gold
  {
    categoryId: HardwareCategory.PSU,
    name: 'Corsair RM750e 750W 80 Plus Gold Fully Modular ATX 3.0',
    brand: 'Corsair',
    model: 'CP-9020262-NA',
    price: 2690000,
    stockQuantity: 30,
    specs: {
      wattage: 750,
      efficiencyRating: '80_PLUS_GOLD',
      modularType: 'FULL_MODULAR',
      pcie16PinPresent: true,
    },
  },

  // 6. Case: Hỗ trợ GPU max 350mm
  {
    categoryId: HardwareCategory.CASE,
    name: 'NZXT H6 Flow RGB Mid-Tower Dual-Chamber Black',
    brand: 'NZXT',
    model: 'CC-H61FB-R1',
    price: 3490000,
    stockQuantity: 15,
    specs: {
      formFactorSupport: ['ATX', 'Micro-ATX', 'Mini-ITX'],
      maxGpuLengthMm: 350,
      maxCpuCoolerHeightMm: 165,
      supportedRadiators: ['360mm', '280mm', '240mm'],
    },
  },
];

async function initializeSchema(): Promise<void> {
  console.log('[Seed] Ensuring database extensions and schemas exist...');

  await db.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

  // 1. hardware_items table
  await db.query(`
    CREATE TABLE IF NOT EXISTS hardware_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      category_id VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      brand VARCHAR(100) NOT NULL,
      model VARCHAR(100) NOT NULL UNIQUE,
      price DECIMAL(12, 2) NOT NULL,
      stock_quantity INT NOT NULL DEFAULT 0,
      specs JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    ALTER TABLE hardware_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    CREATE INDEX IF NOT EXISTS idx_hardware_category ON hardware_items(category_id);
    CREATE INDEX IF NOT EXISTS idx_hardware_model ON hardware_items(model);
    CREATE INDEX IF NOT EXISTS idx_hardware_is_active ON hardware_items(is_active);
  `);

  // 1. Identity & RBAC users schema (must be created before foreign keys)
  await db.query(AUTH_SCHEMA_SQL);

  // 1b. Immutable Security Audit Logs schema
  await db.query(AUDIT_SCHEMA_SQL);

  // 2. repair_tickets table
  await db.query(`
    CREATE TABLE IF NOT EXISTS repair_tickets (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      customer_id UUID REFERENCES users(id),
      ticket_code VARCHAR(50) UNIQUE NOT NULL,
      customer_name VARCHAR(150) NOT NULL,
      customer_phone VARCHAR(20) NOT NULL,
      customer_email VARCHAR(150),
      device_type VARCHAR(100) NOT NULL,
      serial_number VARCHAR(100) NOT NULL,
      initial_condition TEXT NOT NULL,
      fault_description TEXT NOT NULL,
      diagnosis_notes TEXT,
      priority VARCHAR(20) DEFAULT 'STANDARD',
      technician_id UUID,
      status VARCHAR(30) NOT NULL DEFAULT 'RECEIVED',
      quote_amount DECIMAL(12, 2),
      is_quote_approved BOOLEAN DEFAULT FALSE,
      warranty_months INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    ALTER TABLE repair_tickets ADD COLUMN IF NOT EXISTS customer_id UUID;
    CREATE INDEX IF NOT EXISTS idx_ticket_code ON repair_tickets(ticket_code);
    CREATE INDEX IF NOT EXISTS idx_ticket_phone ON repair_tickets(customer_phone);
    CREATE INDEX IF NOT EXISTS idx_repair_tickets_customer_id ON repair_tickets(customer_id);
  `);

  // 3. ticket_logs table
  await db.query(`
    CREATE TABLE IF NOT EXISTS ticket_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      ticket_id UUID NOT NULL REFERENCES repair_tickets(id) ON DELETE CASCADE,
      from_status VARCHAR(30),
      to_status VARCHAR(30) NOT NULL,
      note TEXT NOT NULL,
      technician_id UUID,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ticket_logs_ticket ON ticket_logs(ticket_id);
  `);

  // 4. orders table
  await db.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      customer_id UUID REFERENCES users(id),
      customer_name VARCHAR(150) NOT NULL,
      customer_email VARCHAR(150) NOT NULL,
      customer_phone VARCHAR(20) NOT NULL,
      shipping_address TEXT NOT NULL,
      total_amount DECIMAL(12, 2) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id UUID;
    CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON orders(customer_phone);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
  `);

  // 5. order_items table
  await db.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      hardware_id UUID NOT NULL REFERENCES hardware_items(id),
      quantity INT NOT NULL,
      price_at_purchase DECIMAL(12, 2) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
  `);

  console.log('[Seed] Schema verified successfully.');
}

async function seedUsers(): Promise<void> {
  console.log('[Seed] Seeding default RBAC benchmark users (ADMIN, TECHNICIAN, CUSTOMER)...');

  const defaultUsers = [
    {
      email: 'admin@cyberig.vn',
      fullName: 'CyberRig System Admin',
      phone: '0900000001',
      role: 'ADMIN' as UserRole,
      password: 'Admin@Password123',
    },
    {
      email: 'tech@cyberig.vn',
      fullName: 'Kỹ Thuật Viên Tuấn',
      phone: '0900000002',
      role: 'TECHNICIAN' as UserRole,
      password: 'Tech@Password123',
    },
    {
      email: 'customer@cyberig.vn',
      fullName: 'Nguyễn Văn Khách',
      phone: '0900000003',
      role: 'CUSTOMER' as UserRole,
      password: 'Customer@Password123',
    },
  ];

  for (const u of defaultUsers) {
    const existing = await db.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [u.email]
    );
    const hash = await hashPassword(u.password);

    if (existing.length === 0) {
      await db.query(
        `INSERT INTO users (email, password_hash, role, full_name, phone, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE)`,
        [u.email, hash, u.role, u.fullName, u.phone]
      );
      console.log(`  + Seeded User [${u.role}]: ${u.email}`);
    } else {
      await db.query(
        `UPDATE users SET password_hash = $1, is_active = TRUE WHERE email = $2`,
        [hash, u.email]
      );
      console.log(`  = Refreshed User [${u.role}]: ${u.email}`);
    }
  }
}

async function seedHardware(): Promise<void> {
  console.log('[Seed] Seeding sample hardware items...');

  for (const item of SAMPLE_HARDWARE_ITEMS) {
    const existing = await db.query<{ id: string }>(
      'SELECT id FROM hardware_items WHERE model = $1',
      [item.model]
    );

    if (existing.length === 0) {
      await db.query(
        `INSERT INTO hardware_items (category_id, name, brand, model, price, stock_quantity, specs)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          item.categoryId,
          item.name,
          item.brand,
          item.model,
          item.price,
          item.stockQuantity,
          JSON.stringify(item.specs),
        ]
      );
      console.log(`  + Seeded [${item.categoryId}] ${item.name} (${item.model})`);
    } else {
      console.log(`  = Already exists [${item.categoryId}] ${item.model}`);
    }
  }
}

async function seedRepairTicket(): Promise<void> {
  console.log('[Seed] Seeding sample repair ticket in RECEIVED state...');

  const ticketCode = 'TK-20260905-001';
  const existing = await db.query<{ id: string }>(
    'SELECT id FROM repair_tickets WHERE ticket_code = $1',
    [ticketCode]
  );

  if (existing.length === 0) {
    const customerUser = await db.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      ['customer@cyberig.vn']
    );
    const customerId = customerUser[0]?.id || null;

    const insertRes = await db.query<{ id: string }>(
      `INSERT INTO repair_tickets (
        customer_id, ticket_code, customer_name, customer_phone, customer_email,
        device_type, serial_number, initial_condition, fault_description,
        priority, status, warranty_months
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id;`,
      [
        customerId,
        ticketCode,
        'Nguyễn Văn An',
        '0901234567',
        'an.nguyen@example.com',
        'PC Gaming Custom (Core i7 / RTX 3080)',
        'SN-CR-99281-VN',
        'Máy còn nguyên tem, case kính trầy xước nhẹ góc dưới, quạt tản nhiệt bám bụi.',
        'Bật nguồn quạt quay nhưng không xuất hình, mainboard báo đèn đỏ VGA led, có mùi khét nhẹ khi chạy ứng dụng nặng.',
        TicketPriority.STANDARD,
        TicketStatus.RECEIVED,
        3,
      ]
    );

    const ticketId = insertRes[0]?.id;

    if (ticketId) {
      await db.query(
        `INSERT INTO ticket_logs (ticket_id, from_status, to_status, note)
         VALUES ($1, $2, $3, $4)`,
        [
          ticketId,
          null,
          TicketStatus.RECEIVED,
          'Tiếp nhận thiết bị tại quầy kỹ thuật CyberRig, bàn giao biên bản kiểm tra ngoại quan cùng khách hàng.',
        ]
      );
    }
    console.log(`  + Seeded Repair Ticket: ${ticketCode} (Status: RECEIVED)`);
  } else {
    await db.query(
      `UPDATE repair_tickets 
       SET status = $1, quote_amount = null, is_quote_approved = false, updated_at = NOW() 
       WHERE ticket_code = $2;`,
      [TicketStatus.RECEIVED, ticketCode]
    );
    console.log(`  = Reset Repair Ticket: ${ticketCode} (Status: RECEIVED)`);
  }

  // Seed or Reset TK-1001 in DIAGNOSING state for tests & workbench
  const tk1001Code = 'TK-1001';
  const existing1001 = await db.query<{ id: string }>(
    'SELECT id FROM repair_tickets WHERE ticket_code = $1',
    [tk1001Code]
  );

  if (existing1001.length === 0) {
    const customerUser = await db.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      ['customer@cyberig.vn']
    );
    const techUser = await db.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1 LIMIT 1',
      ['tech@cyberig.vn']
    );
    const customerId = customerUser[0]?.id || null;
    const techId = techUser[0]?.id || null;

    const insert1001 = await db.query<{ id: string }>(
      `INSERT INTO repair_tickets (
        customer_id, ticket_code, customer_name, customer_phone, customer_email,
        device_type, serial_number, initial_condition, fault_description,
        priority, status, warranty_months, technician_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id;`,
      [
        customerId,
        tk1001Code,
        'Trần Minh Hoàng',
        '0987654321',
        'hoang.tran@example.com',
        'PC Gaming Cyber Rig Intel Gen 13',
        'SN-CR-1001-VN',
        'Máy bật lên quạt quay, màn hình đen, buzzer kêu 3 tiếng bip',
        'Nghi ngờ lỗi RAM hoặc khe cắm RAM',
        TicketPriority.STANDARD,
        TicketStatus.DIAGNOSING,
        12,
        techId,
      ]
    );

    const ticketId = insert1001[0]?.id;
    if (ticketId) {
      await db.query(
        `INSERT INTO ticket_logs (ticket_id, from_status, to_status, note)
         VALUES ($1, $2, $3, $4)`,
        [
          ticketId,
          TicketStatus.RECEIVED,
          TicketStatus.DIAGNOSING,
          'KTV đã nhận chẩn đoán phần cứng: kiểm tra khe RAM và nguồn.',
        ]
      );
    }
    console.log(`  + Seeded Repair Ticket: ${tk1001Code} (Status: DIAGNOSING)`);
  } else {
    const ticketId = existing1001[0]?.id;
    await db.query(
      `UPDATE repair_tickets 
       SET status = $1, quote_amount = null, is_quote_approved = false, updated_at = NOW() 
       WHERE ticket_code = $2;`,
      [TicketStatus.DIAGNOSING, tk1001Code]
    );
    if (ticketId) {
      try {
        await db.query('DELETE FROM ticket_quotations WHERE ticket_id = $1', [ticketId]);
      } catch (e) {}
    }
    console.log(`  = Reset Repair Ticket: ${tk1001Code} (Status: DIAGNOSING)`);
  }
}

export async function runSeed(): Promise<void> {
  try {
    console.log('====================================================');
    console.log('   CYBERRIG DATABASE INITIALIZATION & SEEDING');
    console.log('====================================================');

    await initializeSchema();
    await seedUsers();
    await seedHardware();
    await seedRepairTicket();

    console.log('====================================================');
    console.log('🎉 SEED COMPLETED SUCCESSFULLY!');
    console.log('====================================================');
  } catch (error) {
    const err = error as Error & { code?: string };
    const msg = err.message || err.code || String(error);
    console.error('❌ SEED FAILED:', msg);
    if (msg.includes('ECONNREFUSED')) {
      console.error('\n💡 Gợi ý: Database PostgreSQL chưa khởi động tại localhost:5433.');
      console.error('👉 Hãy khởi động container trước: docker compose -f docker-compose.dev.yml up -d\n');
    }
    throw error;
  } finally {
    await db.disconnect();
  }
}

// Auto-run when executed directly via CLI
if (process.argv[1]?.includes('seed.ts') || process.argv[1]?.includes('seed.js')) {
  runSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
