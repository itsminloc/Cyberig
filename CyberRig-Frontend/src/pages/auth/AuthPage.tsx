/**
 * CyberRig Dedicated Authentication Page
 * Embeds the Cyberpunk Auth interface within the Main Application Layout.
 * Aligned with Task FE-08 specification.
 */

import React, { useState } from 'react';
import { MainLayout } from '../../layouts/MainLayout';
import { AuthModal } from '../../components/auth/AuthModal';
import { useAuth } from '../../context/AuthContext';

export const AuthPage: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [modalOpen, setModalOpen] = useState(!isAuthenticated);

  return (
    <MainLayout>
      <div
        style={{
          minHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 16px',
        }}
      >
        {isAuthenticated && user ? (
          <div
            style={{
              background: 'rgba(11, 14, 20, 0.9)',
              border: '1px solid rgba(0, 240, 255, 0.4)',
              padding: '32px',
              maxWidth: '480px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 0 30px rgba(0, 240, 255, 0.2)',
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--cr-font-display)',
                color: '#00f0ff',
                marginBottom: '8px',
              }}
            >
              TÀI KHOẢN ĐÃ ĐĂNG NHẬP
            </h2>
            <p style={{ color: 'var(--cr-text-secondary)', marginBottom: '16px' }}>
              Xin chào, <strong>{user.fullName}</strong> ({user.email})
            </p>
            <div
              style={{
                display: 'inline-block',
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid #00f0ff',
                color: '#00f0ff',
                padding: '4px 12px',
                fontFamily: 'var(--cr-font-mono)',
                fontSize: '12px',
                marginBottom: '24px',
              }}
            >
              VAI TRÒ: {user.role}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <a
                href={user.role === 'TECHNICIAN' || user.role === 'ADMIN' ? '/technician' : '/builder'}
                style={{
                  background: '#00f0ff',
                  color: '#000000',
                  padding: '10px 20px',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                {user.role === 'TECHNICIAN' || user.role === 'ADMIN' ? 'Vào Cổng Kỹ Thuật' : 'Đi Tới Ráp PC'}
              </a>
              <button
                type="button"
                onClick={logout}
                style={{
                  background: 'transparent',
                  border: '1px solid #ff007f',
                  color: '#ff007f',
                  padding: '10px 20px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Đăng Xuất
              </button>
            </div>
          </div>
        ) : (
          <AuthModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            onSuccess={() => setModalOpen(false)}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default AuthPage;
