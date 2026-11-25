/**
 * CyberRig Studio Authentication Modal Component
 * Production Login & Registration forms (Zero exposed demo credentials).
 */
import React, { useState, useEffect } from 'react';
import { useAuth, UserProfile } from '../../context/AuthContext';
import { authApi, ApiError } from '../../services/api';
import './AuthModal.css';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onSuccess?: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess,
}) => {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, initialMode]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Basic Validation
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (mode === 'register' && !fullName.trim()) {
      setErrorMessage('Vui lòng nhập họ và tên của bạn.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const result = await authApi.login({
          email: cleanEmail,
          password,
        });

        login(result);
        setSuccessMessage(`Đăng nhập thành công! Chào mừng, ${result.user.fullName}.`);

        setTimeout(() => {
          onSuccess?.(result.user);
          onClose();
        }, 500);
      } else {
        const result = await authApi.register({
          email: cleanEmail,
          password,
          fullName: fullName.trim(),
          phone: phone.trim() || undefined,
        });

        login(result);
        setSuccessMessage(`Đăng ký thành công! Chào mừng, ${result.user.fullName}.`);

        setTimeout(() => {
          onSuccess?.(result.user);
          onClose();
        }, 500);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(err?.message || 'Có lỗi xảy ra trong quá trình xác thực.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="cyber-auth-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cyber-auth-title"
    >
      <div className="cyber-auth-modal">
        {/* Close Button */}
        <button
          type="button"
          className="cyber-auth-close-btn"
          onClick={onClose}
          aria-label="Đóng cửa sổ đăng nhập"
        >
          ✕
        </button>

        {/* Header */}
        <div className="cyber-auth-header">
          <div className="cyber-auth-badge">
            <span className="cyber-auth-beacon" />
            <span>CYBERRIG ACCOUNT</span>
          </div>
          <h2 id="cyber-auth-title" className="cyber-auth-title">
            CYBER<span>RIG</span> STUDIO
          </h2>
          <p className="cyber-auth-subtitle">
            Quản lý cấu hình PC, theo dõi đơn hàng và bảo hành điện tử chính hãng
          </p>
        </div>

        {/* Tabs */}
        <div className="cyber-auth-tabs">
          <button
            type="button"
            className={`cyber-auth-tab ${mode === 'login' ? 'is-active' : ''}`}
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
            }}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            className={`cyber-auth-tab is-register ${mode === 'register' ? 'is-active' : ''}`}
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
            }}
          >
            Tạo Tài Khoản
          </button>
        </div>

        {/* Form Alerts */}
        {errorMessage && (
          <div className="cyber-auth-alert" role="alert" style={{ marginBottom: 16 }}>
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="cyber-auth-success" role="status" style={{ marginBottom: 16 }}>
            <span>✅</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Main Form */}
        <form className="cyber-auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="cyber-form-group">
              <label className="cyber-form-label" htmlFor="auth-fullname">
                Họ Và Tên
              </label>
              <div className="cyber-form-input-wrapper">
                <input
                  id="auth-fullname"
                  type="text"
                  className="cyber-form-input"
                  placeholder="Nguyễn Văn A"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>
            </div>
          )}

          <div className="cyber-form-group">
            <label className="cyber-form-label" htmlFor="auth-email">
              Địa Chỉ Email
            </label>
            <div className="cyber-form-input-wrapper">
              <input
                id="auth-email"
                type="email"
                className="cyber-form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          {mode === 'register' && (
            <div className="cyber-form-group">
              <label className="cyber-form-label" htmlFor="auth-phone">
                Số Điện Thoại (Tùy chọn)
              </label>
              <div className="cyber-form-input-wrapper">
                <input
                  id="auth-phone"
                  type="tel"
                  className="cyber-form-input"
                  placeholder="0901234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          <div className="cyber-form-group">
            <label className="cyber-form-label" htmlFor="auth-password">
              <span>Mật Khẩu</span>
            </label>
            <div className="cyber-form-input-wrapper">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                className="cyber-form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                required
              />
              <button
                type="button"
                className="cyber-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`cyber-auth-submit-btn ${mode === 'register' ? 'is-register-mode' : ''}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span>Đang xác thực tài khoản...</span>
            ) : mode === 'login' ? (
              <span>Đăng Nhập →</span>
            ) : (
              <span>Tạo Tài Khoản →</span>
            )}
          </button>
        </form>

        {/* Footer switch */}
        <div className="cyber-auth-footer">
          {mode === 'login' ? (
            <span>
              Chưa có tài khoản CyberRig?
              <button type="button" className="cyber-auth-switch-link" onClick={() => { setMode('register'); setErrorMessage(null); }}>
                Đăng ký ngay
              </button>
            </span>
          ) : (
            <span>
              Đã sở hữu tài khoản?
              <button type="button" className="cyber-auth-switch-link" onClick={() => { setMode('login'); setErrorMessage(null); }}>
                Đăng nhập
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
