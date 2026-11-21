/**
 * Protected Route Component (Task FE-09 / Sprint 5)
 * Guards routes requiring user authentication and role-based permissions.
 * Displays Cyberpunk Skeleton Loader while synchronizing neural link,
 * and redirects unauthenticated users to /auth with return location state.
 */

import React, { useEffect } from 'react';
import { useAuth, UserRole } from '../../context/AuthContext';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectTo = '/auth',
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Redirect handling in browser environments
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname + window.location.search;
        const target = `${redirectTo}?from=${encodeURIComponent(currentPath)}`;
        // If router is present in parent scope, history.push or window.location
        if (window.location.pathname !== redirectTo) {
          window.location.href = target;
        }
      }
    }
  }, [isLoading, isAuthenticated, redirectTo]);

  // 1. Loading State: Cyberpunk Neural Link Skeleton
  if (isLoading) {
    return (
      <div className="cyber-protected-loading-container" role="status" aria-live="polite">
        <div className="cyber-protected-scanner-box">
          <div className="cyber-laser-sweep-line" />
          <div className="cyber-loading-badge">SECURITY PROTOCOL 0x77 // NEURAL LINK</div>
          <h2 className="cyber-loading-title">SYNCHRONIZING NEURAL LINK...</h2>
          <p className="cyber-loading-subtitle">
            Authenticating user credentials & access permissions with CyberRig Quantum Vault.
          </p>
          <div className="cyber-loading-progress-bar">
            <div className="cyber-loading-progress-fill" />
          </div>
          <div className="cyber-loading-nodes">
            <span className="node is-active">AUTH_NODE_01</span>
            <span className="node is-active">RBAC_MATRIX</span>
            <span className="node is-pending">DATA_STREAM</span>
          </div>
        </div>
        <style>{`
          .cyber-protected-loading-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 70vh;
            padding: 2rem;
            color: #f8fafc;
            background: radial-gradient(circle at 50% 50%, rgba(0, 240, 255, 0.05) 0%, transparent 60%);
          }
          .cyber-protected-scanner-box {
            position: relative;
            max-width: 520px;
            width: 100%;
            background: #0d111a;
            border: 1px solid rgba(0, 240, 255, 0.35);
            padding: 2.5rem;
            text-align: center;
            box-shadow: 0 0 30px rgba(0, 240, 255, 0.15), inset 0 0 20px rgba(0, 240, 255, 0.05);
            clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);
            overflow: hidden;
          }
          .cyber-laser-sweep-line {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, transparent, #00f0ff, transparent);
            box-shadow: 0 0 8px #00f0ff;
            animation: laserSweep 2s ease-in-out infinite alternate;
          }
          @keyframes laserSweep {
            0% { top: 0%; opacity: 0.2; }
            50% { opacity: 1; }
            100% { top: 100%; opacity: 0.2; }
          }
          .cyber-loading-badge {
            display: inline-block;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.72rem;
            letter-spacing: 2px;
            color: #00f0ff;
            background: rgba(0, 240, 255, 0.1);
            border: 1px solid rgba(0, 240, 255, 0.3);
            padding: 3px 10px;
            margin-bottom: 1.25rem;
          }
          .cyber-loading-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 1.35rem;
            color: #ffffff;
            letter-spacing: 1px;
            margin-bottom: 0.75rem;
            text-shadow: 0 0 10px rgba(0, 240, 255, 0.6);
          }
          .cyber-loading-subtitle {
            font-size: 0.85rem;
            color: #94a3b8;
            line-height: 1.5;
            margin-bottom: 1.75rem;
          }
          .cyber-loading-progress-bar {
            width: 100%;
            height: 4px;
            background: rgba(255, 255, 255, 0.08);
            margin-bottom: 1.5rem;
            overflow: hidden;
            position: relative;
          }
          .cyber-loading-progress-fill {
            position: absolute;
            top: 0;
            left: 0;
            bottom: 0;
            width: 40%;
            background: linear-gradient(90deg, #00f0ff, #ff007f);
            box-shadow: 0 0 8px #00f0ff;
            animation: progressFill 1.8s ease-in-out infinite;
          }
          @keyframes progressFill {
            0% { left: -40%; width: 40%; }
            50% { width: 60%; }
            100% { left: 100%; width: 30%; }
          }
          .cyber-loading-nodes {
            display: flex;
            justify-content: space-around;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.68rem;
          }
          .cyber-loading-nodes .node {
            color: #64748b;
          }
          .cyber-loading-nodes .node.is-active {
            color: #00f0ff;
            text-shadow: 0 0 6px rgba(0, 240, 255, 0.5);
          }
        `}</style>
      </div>
    );
  }

  // 2. Unauthenticated State: Redirecting Banner / Fallback
  if (!isAuthenticated) {
    return (
      <div className="cyber-unauthorized-guard" role="alert">
        <div className="cyber-guard-card">
          <div className="cyber-guard-icon">🛡️</div>
          <div className="cyber-guard-badge">ACCESS DENIED // 0x401</div>
          <h2 className="cyber-guard-title">YÊU CẦU XÁC THỰC ĐĂNG NHẬP</h2>
          <p className="cyber-guard-desc">
            Vui lòng đăng nhập vào tài khoản CyberRig để truy cập Cổng thông tin khách hàng cá nhân.
          </p>
          <a href={`${redirectTo}?from=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '')}`} className="cyber-guard-action-btn">
            ĐẾN TRANG ĐĂNG NHẬP →
          </a>
        </div>
        <style>{`
          .cyber-unauthorized-guard {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 70vh;
            padding: 2rem;
            color: #f8fafc;
          }
          .cyber-guard-card {
            max-width: 480px;
            width: 100%;
            background: #0d111a;
            border: 1px solid rgba(255, 0, 127, 0.4);
            padding: 2.5rem;
            text-align: center;
            box-shadow: 0 0 30px rgba(255, 0, 127, 0.15);
            clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);
          }
          .cyber-guard-icon {
            font-size: 2.5rem;
            margin-bottom: 0.75rem;
          }
          .cyber-guard-badge {
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
            color: #ff007f;
            letter-spacing: 2px;
            margin-bottom: 0.75rem;
          }
          .cyber-guard-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 1.3rem;
            color: #ffffff;
            margin-bottom: 0.75rem;
          }
          .cyber-guard-desc {
            font-size: 0.88rem;
            color: #94a3b8;
            margin-bottom: 1.75rem;
            line-height: 1.5;
          }
          .cyber-guard-action-btn {
            display: inline-block;
            font-family: 'Rajdhani', sans-serif;
            font-size: 1rem;
            font-weight: 700;
            letter-spacing: 1px;
            color: #050811;
            background: linear-gradient(135deg, #00f0ff, #0088ff);
            padding: 0.75rem 1.75rem;
            text-decoration: none;
            clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
            transition: all 0.2s ease;
          }
          .cyber-guard-action-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 0 16px rgba(0, 240, 255, 0.6);
          }
        `}</style>
      </div>
    );
  }

  // 3. Role-Based Check (if specified)
  if (allowedRoles && allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="cyber-unauthorized-guard" role="alert">
        <div className="cyber-guard-card">
          <div className="cyber-guard-icon">🚫</div>
          <div className="cyber-guard-badge">INSUFFICIENT CLEARANCE // 0x403</div>
          <h2 className="cyber-guard-title">QUYỀN TRUY CẬP BỊ TỪ CHỐI</h2>
          <p className="cyber-guard-desc">
            Vai trò của bạn ({user.role}) không có đặc quyền truy cập khu vực này.
          </p>
          <a href="/" className="cyber-guard-action-btn">
            QUAY LẠI TRANG CHỦ
          </a>
        </div>
      </div>
    );
  }

  // 4. Authorized: Render Protected Children
  return <>{children}</>;
};

export default ProtectedRoute;
