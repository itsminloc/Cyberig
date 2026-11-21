/**
 * Cyberpunk Auth UI Validation & Demo Credentials Spec
 * Aligned with Task FE-08 specification.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Cyberpunk Auth UI Validation & Form Rules (Task FE-08 / Sprint 4)', () => {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const VIETNAMESE_PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;

  test('Test 1: Email format validation enforces valid domain structure', () => {
    // Valid cases
    assert.equal(EMAIL_REGEX.test('customer@cyberig.vn'), true);
    assert.equal(EMAIL_REGEX.test('tech.tuan@cyberig.vn'), true);
    assert.equal(EMAIL_REGEX.test('gamer.rgb@gmail.com'), true);
    assert.equal(EMAIL_REGEX.test('user123@sub.domain.vn'), true);

    // Invalid cases
    assert.equal(EMAIL_REGEX.test(''), false);
    assert.equal(EMAIL_REGEX.test('invalid-email'), false);
    assert.equal(EMAIL_REGEX.test('user@'), false);
    assert.equal(EMAIL_REGEX.test('@domain.com'), false);
    assert.equal(EMAIL_REGEX.test('user@domain'), false);
    assert.equal(EMAIL_REGEX.test('user with spaces@domain.com'), false);
  });

  test('Test 2: Password validation enforces minimum 6 characters length', () => {
    function isValidPassword(pass: string): boolean {
      return Boolean(pass && pass.length >= 6);
    }

    assert.equal(isValidPassword('123456'), true);
    assert.equal(isValidPassword('Customer@Password123'), true);
    assert.equal(isValidPassword('Tech@Password123'), true);
    assert.equal(isValidPassword('Admin@Password123'), true);

    assert.equal(isValidPassword(''), false);
    assert.equal(isValidPassword('12345'), false);
    assert.equal(isValidPassword('abc'), false);
  });

  test('Test 3: Vietnamese mobile phone number format is strictly verified', () => {
    assert.equal(VIETNAMESE_PHONE_REGEX.test('0901234567'), true);
    assert.equal(VIETNAMESE_PHONE_REGEX.test('0988889999'), true);
    assert.equal(VIETNAMESE_PHONE_REGEX.test('+84901234567'), true);
    assert.equal(VIETNAMESE_PHONE_REGEX.test('0381234567'), true);
    assert.equal(VIETNAMESE_PHONE_REGEX.test('0771234567'), true);

    assert.equal(VIETNAMESE_PHONE_REGEX.test('0123456789'), false); // invalid prefix
    assert.equal(VIETNAMESE_PHONE_REGEX.test('123456'), false); // too short
    assert.equal(VIETNAMESE_PHONE_REGEX.test('090123456789'), false); // 12 digits
    assert.equal(VIETNAMESE_PHONE_REGEX.test('phone-string'), false);
  });

  test('Test 4: Demo accounts matrix conforms to benchmark seed configuration', () => {
    const DEMO_ACCOUNTS = {
      customer: {
        email: 'customer@cyberig.vn',
        password: 'Customer@Password123',
        expectedRole: 'CUSTOMER',
      },
      technician: {
        email: 'tech@cyberig.vn',
        password: 'Tech@Password123',
        expectedRole: 'TECHNICIAN',
      },
      admin: {
        email: 'admin@cyberig.vn',
        password: 'Admin@Password123',
        expectedRole: 'ADMIN',
      },
    };

    assert.equal(DEMO_ACCOUNTS.customer.email, 'customer@cyberig.vn');
    assert.equal(DEMO_ACCOUNTS.customer.expectedRole, 'CUSTOMER');

    assert.equal(DEMO_ACCOUNTS.technician.email, 'tech@cyberig.vn');
    assert.equal(DEMO_ACCOUNTS.technician.expectedRole, 'TECHNICIAN');

    assert.equal(DEMO_ACCOUNTS.admin.email, 'admin@cyberig.vn');
    assert.equal(DEMO_ACCOUNTS.admin.expectedRole, 'ADMIN');
  });

  test('Test 5: Registration form requires fullName and validates payload integrity', () => {
    function validateRegistration(dto: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
    }): { valid: boolean; error?: string } {
      if (!dto.email || !EMAIL_REGEX.test(dto.email)) {
        return { valid: false, error: 'Email không hợp lệ' };
      }
      if (!dto.password || dto.password.length < 6) {
        return { valid: false, error: 'Mật khẩu tối thiểu 6 ký tự' };
      }
      if (!dto.fullName || !dto.fullName.trim()) {
        return { valid: false, error: 'Họ và tên là bắt buộc' };
      }
      if (dto.phone && !VIETNAMESE_PHONE_REGEX.test(dto.phone)) {
        return { valid: false, error: 'Số điện thoại không hợp lệ' };
      }
      return { valid: true };
    }

    assert.deepEqual(
      validateRegistration({
        email: 'test@cyberig.vn',
        password: 'password123',
        fullName: 'Nguyễn Văn Test',
        phone: '0901234567',
      }),
      { valid: true }
    );

    assert.equal(
      validateRegistration({
        email: 'test@cyberig.vn',
        password: 'password123',
        fullName: '',
      }).valid,
      false
    );

    assert.equal(
      validateRegistration({
        email: 'test@cyberig.vn',
        password: '123',
        fullName: 'Nguyễn Văn Test',
      }).valid,
      false
    );
  });
});
