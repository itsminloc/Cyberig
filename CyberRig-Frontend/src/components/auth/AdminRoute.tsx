/**
 * Admin Route Protection Guard (Task FE-10 / Sprint 5)
 * Strictly reserves routes for users with role 'ADMIN'.
 * Displays Cyberpunk Skeleton loader during neural sync,
 * redirects unauthenticated users to /auth, and blocks non-admin users
 * with a specialized Cyberpunk Holographic Access Denied notice (HTTP 403).
 */

import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export interface AdminRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({
  children,
  redirectTo = '/dashboard',
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname + window.location.search;
        const target = `/auth?from=${encodeURIComponent(currentPath || '/admin')}`;
        if (window.location.pathname !== '/auth') {
          window.location.href = target;
        }
      }
    }
  }, [isLoading, isAuthenticated]);

  // 1. Loading State: Cyberpunk Neural Link Skeleton
  if (isLoading) {
    return (
      <div className="cyber-admin-loading-container" role="status" aria-live="polite">
        <div className="cyber-admin-scanner-box">
          <div className="cyber-admin-sweep-line" />
          <div className="cyber-admin-badge">SECURITY PROTOCOL 0xADMIN // CLEARANCE SCAN</div>
          <h2 className="cyber-admin-title">SYNCHRONIZING NEURAL LINK...</h2>
          <p className="cyber-admin-subtitle">
            Authenticating administrator credentials & decrypting high-security control core.
          </p>
          <div className="cyber-admin-progress-bar">
            <div className="cyber-admin-progress-fill" />
          </div>
          <div className="cyber-admin-nodes">
            <span className="node is-active">ROOT_CORE</span>
            <span className="node is-active">RBAC_LEVEL_3</span>
            <span className="node is-pending">VAULT_ACCESS</span>
          </div>
        </div>
        <style>{`
          .cyber-admin-loading-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 70vh;
            padding: 2rem;
            color: #f8fafc;
            background: radial-gradient(circle at 50% 50%, rgba(255, 0, 60, 0.08) 0%, transparent 65%);
          }
          .cyber-admin-scanner-box {
            position: relative;
            max-width: 520px;
            width: 100%;
            background: #0d111a;
            border: 1px solid rgba(255, 0, 60, 0.4);
            padding: 2.5rem;
            text-align: center;
            clip-path: polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px);
            box-shadow: 0 0 35px rgba(255, 0, 60, 0.15), inset 0 0 20px rgba(255, 0, 60, 0.05);
            overflow: hidden;
          }
          .cyber-admin-sweep-line {
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, transparent, #ff003c, #ffaa00, transparent);
            animation: adminLaserSweep 2s infinite ease-in-out;
          }
          @keyframes adminLaserSweep {
            0% { left: -100%; }
            100% { left: 100%; }
          }
          .cyber-admin-badge {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.72rem;
            letter-spacing: 2px;
            color: #ff003c;
            margin-bottom: 0.75rem;
          }
          .cyber-admin-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 1.35rem;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: 1.5px;
            margin-bottom: 0.75rem;
            text-shadow: 0 0 12px rgba(255, 0, 60, 0.6);
          }
          .cyber-admin-subtitle {
            font-size: 0.85rem;
            color: #94a3b8;
            line-height: 1.5;
            margin-bottom: 1.5rem;
          }
          .cyber-admin-progress-bar {
            height: 4px;
            width: 100%;
            background: rgba(255, 255, 255, 0.08);
            border-radius: 2px;
            overflow: hidden;
            margin-bottom: 1.25rem;
          }
          .cyber-admin-progress-fill {
            height: 100%;
            width: 50%;
            background: linear-gradient(90deg, #ff003c, #ffaa00);
            box-shadow: 0 0 10px #ff003c;
            animation: adminLoadingShimmer 1.4s infinite ease-in-out;
          }
          @keyframes adminLoadingShimmer {
            0% { transform: translateX(-100%); width: 30%; }
            50% { width: 70%; }
            100% { transform: translateX(350%); width: 30%; }
          }
          .cyber-admin-nodes {
            display: flex;
            justify-content: center;
            gap: 0.75rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.68rem;
          }
          .cyber-admin-nodes .node.is-active {
            color: #ff003c;
            text-shadow: 0 0 8px rgba(255, 0, 60, 0.8);
          }
          .cyber-admin-nodes .node.is-pending {
            color: #475569;
          }
        `}</style>
      </div>
    );
  }

  // 2. Unauthenticated state: Empty while useEffect redirects to /auth
  if (!isAuthenticated || !user) {
    return null;
  }

  // 3. Unauthorized State: User is logged in but role !== 'ADMIN'
  if (user.role !== 'ADMIN') {
    return (
      <div className="cyber-admin-denied-container" role="alert">
        <div className="cyber-admin-denied-box">
          <div className="cyber-admin-denied-icon">🛡️⛔</div>
          <div className="cyber-admin-denied-code">SECURITY PROTOCOL 0x403 // ACCESS DENIED</div>
          <h1 className="cyber-admin-denied-title">ADMIN CLEARANCE REQUIRED</h1>
          <p className="cyber-admin-denied-msg">
            Tài khoản hiện tại của bạn (<span className="cyber-highlight-email">{user.email}</span> - Role:{' '}
            <span className="cyber-highlight-role">{user.role}</span>) không có quyền hạn Quản trị viên để truy cập Control Center.
          </p>
          <div className="cyber-admin-denied-details">
            Vui lòng đăng nhập với tài khoản thuộc nhóm Quản trị (`ADMIN`) hoặc quay lại trang cá nhân của bạn.
          </div>
          <div className="cyber-admin-denied-actions">
            <a href={redirectTo} className="cyber-btn-back">
              <span>← Quay Về Dashboard</span>
            </a>
            <a href="/auth" className="cyber-btn-reauth">
              <span>Đăng Nhập Tài Khoản Khác</span>
            </a>
          </div>
        </div>
        <style>{`
          .cyber-admin-denied-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 75vh;
            padding: 2rem;
            color: #f8fafc;
          }
          .cyber-admin-denied-box {
            max-width: 580px;
            width: 100%;
            background: #0d111a;
            border: 1px solid rgba(255, 0, 60, 0.5);
            padding: 2.75rem 2rem;
            text-align: center;
            clip-path: polygon(18px 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%, 0 18px);
            box-shadow: 0 0 45px rgba(255, 0, 60, 0.25), inset 0 0 25px rgba(255, 0, 60, 0.08);
          }
          .cyber-admin-denied-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
            filter: drop-shadow(0 0 12px rgba(255, 0, 60, 0.6));
          }
          .cyber-admin-denied-code {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.78rem;
            letter-spacing: 2px;
            color: #ff003c;
            margin-bottom: 0.5rem;
          }
          .cyber-admin-denied-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 1.6rem;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: 1.5px;
            margin-bottom: 1rem;
            text-shadow: 0 0 15px rgba(255, 0, 60, 0.7);
          }
          .cyber-admin-denied-msg {
            font-size: 0.95rem;
            color: #cbd5e1;
            line-height: 1.6;
            margin-bottom: 1rem;
          }
          .cyber-highlight-email {
            color: #00f0ff;
            font-weight: 600;
          }
          .cyber-highlight-role {
            color: #ffaa00;
            font-weight: 700;
            font-family: 'JetBrains Mono', monospace;
          }
          .cyber-admin-denied-details {
            font-size: 0.85rem;
            color: #94a3b8;
            margin-bottom: 2rem;
          }
          .cyber-admin-denied-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
          }
          .cyber-btn-back {
            background: linear-gradient(135deg, #ff003c, #b3002a);
            color: #ffffff;
            font-family: 'Rajdhani', sans-serif;
            font-size: 1rem;
            font-weight: 700;
            letter-spacing: 1px;
            padding: 0.75rem 1.5rem;
            text-decoration: none;
            clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
            transition: all 0.2s ease;
            box-shadow: 0 0 18px rgba(255, 0, 60, 0.4);
          }
          .cyber-btn-back:hover {
            box-shadow: 0 0 28px rgba(255, 0, 60, 0.7);
            transform: translateY(-2px);
          }
          .cyber-btn-reauth {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #f8fafc;
            font-family: 'Rajdhani', sans-serif;
            font-size: 1rem;
            font-weight: 700;
            letter-spacing: 1px;
            padding: 0.75rem 1.5rem;
            text-decoration: none;
            clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
            transition: all 0.2s ease;
          }
          .cyber-btn-reauth:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: #00f0ff;
            color: #00f0ff;
          }
        `}</style>
      </div>
    );
  }

  // 4. Authorized State: Role is ADMIN
  return <>{children}</>;
};

export default AdminRoute;
