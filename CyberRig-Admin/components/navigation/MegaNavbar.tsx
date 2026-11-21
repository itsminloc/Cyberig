import React, { useState, useRef, useEffect } from 'react';
import {
  MAIN_NAV_TABS,
  NavTabItem,
  NavLinkItem,
  BadgeTone,
} from './navigation.data';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../auth/AuthModal';
import './MegaNavbar.css';

// High-tech crisp SVG Icons
const Icons = {
  CircuitChip: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
    </svg>
  ),
  Wrench: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  Cpu: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 9h6v6H9zM9 2v2M15 2v2M9 20v2M15 20v2M20 9h2M20 14h2M2 9h2M2 14h2" />
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  ShieldCheck: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  ArrowRight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  User: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  CartBuild: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  Close: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Bolt: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
};

const renderBadge = (label?: string, tone?: BadgeTone) => {
  if (!label) return null;
  const toneClass = tone ? `cyber-badge-${tone}` : 'cyber-badge-neon';
  return <span className={`cyber-badge ${toneClass}`}>{label}</span>;
};

export const MegaNavbar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTabItem | null>(null);
  const [activeTabIndex, setActiveTabIndex] = useState<number>(-1);
  const [hoverDirection, setHoverDirection] = useState<'left' | 'right' | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickTicketCode, setQuickTicketCode] = useState('');
  
  // Mobile Touch Accordion State
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'builder': true,
    'hardware': false,
    'services': false,
    'quick': false,
  });

  // Authentication State
  let authContext: ReturnType<typeof useAuth> | null = null;
  try {
    authContext = useAuth();
  } catch {
    // Graceful fallback if rendered outside AuthProvider
  }

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userDropdownOpen]);

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Desktop Directional Hover Logic
  const handleTabMouseEnter = (tab: NavTabItem, index: number) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    if (tab.hasMegaMenu) {
      if (activeTabIndex !== -1 && activeTabIndex !== index) {
        setHoverDirection(index > activeTabIndex ? 'right' : 'left');
      } else {
        setHoverDirection(null);
      }
      setActiveTab(tab);
      setActiveTabIndex(index);
      setIsHovered(true);
    } else {
      setActiveTab(null);
      setActiveTabIndex(-1);
      setIsHovered(false);
      setHoverDirection(null);
    }
  };

  const handleMouseLeaveNav = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      setActiveTab(null);
      setActiveTabIndex(-1);
      setHoverDirection(null);
    }, 200);
  };

  const handlePanelMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    setIsHovered(true);
  };

  // Keyboard Shortcuts & Body Scroll Lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('cyber-navbar-search');
        searchInput?.focus();
      }
      if (e.key === 'Escape') {
        setIsHovered(false);
        setActiveTab(null);
        setActiveTabIndex(-1);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Mega Menu data source
  const megaMenuData = MAIN_NAV_TABS[0]?.megaMenu;

  return (
    <header className="cyber-navbar-wrapper" onMouseLeave={handleMouseLeaveNav}>
      <div className="cyber-navbar-shell">
        <div className="cyber-navbar-inner">
          {/* 1. Brand Logo */}
          <a href="/" className="cyber-brand" aria-label="CyberRig Home">
            <div className="cyber-logo-icon">
              <span className="cyber-logo-led" />
              <Icons.CircuitChip />
            </div>
            <div className="cyber-brand-text">
              <div className="cyber-brand-title">
                CYBER<span>RIG</span>
              </div>
              <div className="cyber-brand-tagline">Hardware & Repair Lab</div>
            </div>
          </a>

          {/* 2. Desktop Navigation Menu */}
          <nav className="cyber-nav-center" aria-label="Main Navigation">
            {MAIN_NAV_TABS.map((tab, idx) => {
              const isOpen = isHovered && activeTab?.id === tab.id;
              return (
                <div
                  key={tab.id}
                  className={`cyber-nav-item ${isOpen ? 'is-active' : ''}`}
                  onMouseEnter={() => handleTabMouseEnter(tab, idx)}
                >
                  <a
                    href={tab.href}
                    className={`cyber-nav-link ${isOpen ? 'has-open-menu' : ''}`}
                    onClick={(e) => {
                      if (tab.hasMegaMenu) {
                        e.preventDefault();
                        if (isOpen) {
                          setIsHovered(false);
                          setActiveTab(null);
                          setActiveTabIndex(-1);
                        } else {
                          setActiveTab(tab);
                          setActiveTabIndex(idx);
                          setIsHovered(true);
                        }
                      }
                    }}
                  >
                    <span>{tab.label}</span>
                    {renderBadge(tab.badge, tab.badgeTone)}
                    {tab.hasMegaMenu && <Icons.ChevronDown />}
                  </a>
                </div>
              );
            })}
          </nav>

          {/* 3. Search & Right Utilities */}
          <div className="cyber-nav-actions">
            {/* Quick Search Input */}
            <div className="cyber-search-box">
              <span className="cyber-search-icon">
                <Icons.Search />
              </span>
              <input
                id="cyber-navbar-search"
                type="text"
                className="cyber-search-input"
                placeholder="Tìm linh kiện, mã phiếu TK-..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="cyber-search-shortcut">Ctrl K</span>
            </div>

            {/* Quick Ticket Lookup CTA */}
            <a
              href="/repair-tracking"
              className="cyber-action-btn"
              title="Tra cứu phiếu bảo hành / sửa chữa"
            >
              <Icons.ShieldCheck />
              <span>Tra Cứu Phiếu</span>
            </a>

            {/* Custom PC Build Summary Cart */}
            <a
              href="/builder"
              className="cyber-action-btn icon-only"
              title="Cấu hình PC đang dựng"
            >
              <Icons.CartBuild />
              <span className="cyber-count-badge">0</span>
            </a>

            {/* User Account / Auth Gateway */}
            {!authContext?.isAuthenticated ? (
              <button
                type="button"
                className="cyber-auth-nav-btn"
                onClick={() => setAuthModalOpen(true)}
                title="Đăng nhập tài khoản CyberRig"
              >
                <Icons.User />
                <span className="cyber-auth-btn-text">Đăng Nhập</span>
              </button>
            ) : (
              <div className="cyber-user-menu-wrapper" ref={userMenuRef}>
                <button
                  type="button"
                  className="cyber-auth-user-badge-btn"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  aria-expanded={userDropdownOpen}
                  title="Thông tin tài khoản"
                >
                  <span className="cyber-user-avatar-indicator" />
                  <span className="cyber-user-name">
                    {authContext.user?.fullName || authContext.user?.email}
                  </span>
                  <span
                    className={`cyber-user-role-badge is-${(
                      authContext.user?.role || 'customer'
                    ).toLowerCase()}`}
                  >
                    {authContext.user?.role}
                  </span>
                  <Icons.ChevronDown />
                </button>

                {userDropdownOpen && (
                  <div className="cyber-user-dropdown" role="menu">
                    <div className="cyber-user-dropdown-header">
                      <div className="cyber-user-fullname">{authContext.user?.fullName}</div>
                      <div className="cyber-user-email">{authContext.user?.email}</div>
                      <div className="cyber-user-role-tag">ROLE: {authContext.user?.role}</div>
                    </div>

                    <div className="cyber-user-dropdown-items">
                      <a href="/dashboard" className="cyber-user-dropdown-item" id="nav-user-dashboard-link">
                        <Icons.CartBuild />
                        <span>Dàn máy & Thiết bị của tôi</span>
                      </a>
                      {authContext.user?.role === 'ADMIN' && (
                        <a
                          href="/admin"
                          className="cyber-user-dropdown-item"
                          id="nav-user-admin-link"
                          style={{ color: '#ff003c', fontWeight: 700 }}
                        >
                          <Icons.ShieldCheck />
                          <span>Quản Trị Hệ Thống (Admin Hub)</span>
                        </a>
                      )}
                      {(authContext.user?.role === 'TECHNICIAN' ||
                        authContext.user?.role === 'ADMIN') && (
                        <a href="/technician" className="cyber-user-dropdown-item">
                          <Icons.Wrench />
                          <span>Cổng Kỹ Thuật Viên (Portal)</span>
                        </a>
                      )}
                      <a href="/repair-tracking" className="cyber-user-dropdown-item">
                        <Icons.ShieldCheck />
                        <span>Tra Cứu Tiến Độ Sửa Chữa</span>
                      </a>
                      <a href="/builder" className="cyber-user-dropdown-item">
                        <Icons.CartBuild />
                        <span>Cấu Hình PC Đang Dựng</span>
                      </a>
                    </div>

                    <div className="cyber-user-dropdown-footer">
                      <button
                        type="button"
                        className="cyber-user-logout-btn"
                        onClick={() => {
                          authContext?.logout();
                          setUserDropdownOpen(false);
                        }}
                      >
                        Đăng Xuất (Logout)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Hamburger Button (44px min touch target) */}
            <button
              type="button"
              className={`cyber-hamburger ${mobileMenuOpen ? 'is-active' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
              aria-expanded={mobileMenuOpen}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        {/* 4. Desktop Directional Mega Dropdown Panel (4 Columns) */}
        {activeTab?.megaMenu && (
          <div
            className={`cyber-mega-panel ${isHovered ? 'is-visible' : ''} ${
              hoverDirection ? `slide-from-${hoverDirection}` : ''
            }`}
            onMouseEnter={handlePanelMouseEnter}
          >
            <div className="cyber-mega-grid">
              {/* CỘT 1: PC BUILDER & PRESETS */}
              <div className="cyber-col">
                <div className="cyber-col-header">
                  <div className="cyber-col-icon">
                    <Icons.Wrench />
                  </div>
                  <div>
                    <div className="cyber-col-title">{activeTab.megaMenu.builderColumn.title}</div>
                    <div className="cyber-col-subtitle">{activeTab.megaMenu.builderColumn.description}</div>
                  </div>
                </div>
                <ul className="cyber-col-list">
                  {activeTab.megaMenu.builderColumn.items.map((item: NavLinkItem) => (
                    <li key={item.id} className="cyber-col-item">
                      <a href={item.href} className="cyber-col-link">
                        <div className="cyber-item-top">
                          <span className="cyber-item-title">{item.title}</span>
                          {renderBadge(item.badge, item.badgeTone)}
                        </div>
                        <span className="cyber-item-desc">{item.description}</span>
                        {item.metaInfo && <span className="cyber-item-meta">{item.metaInfo}</span>}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CỘT 2: HARDWARE CATEGORIES (8 LINH KIỆN - SUBGRID 2 CỘT) */}
              <div className="cyber-col">
                <div className="cyber-col-header">
                  <div className="cyber-col-icon">
                    <Icons.CircuitChip />
                  </div>
                  <div>
                    <div className="cyber-col-title">{activeTab.megaMenu.hardwareColumn.title}</div>
                    <div className="cyber-col-subtitle">{activeTab.megaMenu.hardwareColumn.description}</div>
                  </div>
                </div>
                <ul className="cyber-col-hardware-grid">
                  {activeTab.megaMenu.hardwareColumn.items.map((item: NavLinkItem) => (
                    <li key={item.id} className="cyber-col-item">
                      <a href={item.href} className="cyber-col-link">
                        <div className="cyber-item-top">
                          <span className="cyber-item-title">{item.title}</span>
                          {renderBadge(item.badge, item.badgeTone)}
                        </div>
                        <span className="cyber-item-desc">{item.description}</span>
                        {item.metaInfo && <span className="cyber-item-meta">{item.metaInfo}</span>}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CỘT 3: DỊCH VỤ SỬA CHỮA & BẢO HÀNH */}
              <div className="cyber-col">
                <div className="cyber-col-header">
                  <div className="cyber-col-icon">
                    <Icons.ShieldCheck />
                  </div>
                  <div>
                    <div className="cyber-col-title">{activeTab.megaMenu.servicesColumn.title}</div>
                    <div className="cyber-col-subtitle">{activeTab.megaMenu.servicesColumn.description}</div>
                  </div>
                </div>
                <ul className="cyber-col-list">
                  {activeTab.megaMenu.servicesColumn.items.map((item: NavLinkItem) => (
                    <li key={item.id} className="cyber-col-item">
                      <a href={item.href} className="cyber-col-link">
                        <div className="cyber-item-top">
                          <span className="cyber-item-title">{item.title}</span>
                          {renderBadge(item.badge, item.badgeTone)}
                        </div>
                        <span className="cyber-item-desc">{item.description}</span>
                        {item.metaInfo && <span className="cyber-item-meta">{item.metaInfo}</span>}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CỘT 4: QUICK ACTION CARD (BANNER TRA CỨU & CTA) */}
              <div className="cyber-col">
                <div className="cyber-quick-card">
                  <div className="cyber-card-header">
                    <div style={{ marginBottom: 8 }}>
                      {renderBadge(
                        activeTab.megaMenu.quickActionCard.statusBadge.label,
                        activeTab.megaMenu.quickActionCard.statusBadge.tone
                      )}
                    </div>
                    <span className="cyber-card-tagline">
                      {activeTab.megaMenu.quickActionCard.tagline}
                    </span>
                    <h4 className="cyber-card-title">{activeTab.megaMenu.quickActionCard.title}</h4>
                    <p className="cyber-card-desc">{activeTab.megaMenu.quickActionCard.description}</p>
                  </div>

                  {/* Form tra cứu nhanh mã phiếu */}
                  <form
                    className="cyber-quick-ticket-input-box"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (quickTicketCode.trim()) {
                        window.location.href = `/repair-tracking?code=${encodeURIComponent(
                          quickTicketCode.trim()
                        )}`;
                      }
                    }}
                  >
                    <input
                      type="text"
                      className="cyber-quick-ticket-input"
                      placeholder="Mã TK-... / SĐT"
                      value={quickTicketCode}
                      onChange={(e) => setQuickTicketCode(e.target.value)}
                    />
                    <button type="submit" className="cyber-quick-ticket-btn">
                      Tra Cứu
                    </button>
                  </form>

                  {activeTab.megaMenu.quickActionCard.metrics && (
                    <div className="cyber-metrics-grid">
                      {activeTab.megaMenu.quickActionCard.metrics.map((m, idx) => (
                        <div key={idx} className="cyber-metric-box">
                          <div className="cyber-metric-value">{m.value}</div>
                          <div className="cyber-metric-label">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="cyber-card-actions">
                    <a
                      href={activeTab.megaMenu.quickActionCard.primaryActionHref}
                      className="cyber-btn-primary"
                    >
                      <span>{activeTab.megaMenu.quickActionCard.primaryActionLabel}</span>
                      <Icons.ArrowRight />
                    </a>
                    {activeTab.megaMenu.quickActionCard.secondaryActionLabel && (
                      <a
                        href={activeTab.megaMenu.quickActionCard.secondaryActionHref || '#'}
                        className="cyber-btn-secondary"
                      >
                        {activeTab.megaMenu.quickActionCard.secondaryActionLabel}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Mobile Drawer Backdrop Overlay */}
      <div
        className={`cyber-mobile-backdrop ${mobileMenuOpen ? 'is-open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* 6. Mobile Drawer Sidebar (Touch Friendly Accordions >= 44px) */}
      <div
        className={`cyber-mobile-drawer ${mobileMenuOpen ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation"
      >
        <div className="cyber-mobile-header">
          <div className="cyber-brand-title">
            CYBER<span>RIG</span>
          </div>
          <button
            type="button"
            className="cyber-mobile-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Đóng menu điều hướng"
          >
            <Icons.Close />
          </button>
        </div>

        {/* Mobile Search Box */}
        <div className="cyber-mobile-search">
          <input
            type="text"
            placeholder="Tìm linh kiện hoặc mã phiếu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Mobile User Profile / Auth Action */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          {!authContext?.isAuthenticated ? (
            <button
              type="button"
              className="cyber-auth-nav-btn"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => {
                setMobileMenuOpen(false);
                setAuthModalOpen(true);
              }}
            >
              <Icons.User />
              <span>Đăng Nhập / Đăng Ký</span>
            </button>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#ffffff', fontSize: 13 }}>
                  {authContext.user?.fullName}
                </div>
                <div style={{ fontSize: 11, color: '#00f0ff' }}>{authContext.user?.role}</div>
              </div>
              <button
                type="button"
                className="cyber-user-logout-btn"
                style={{ width: 'auto', padding: '4px 10px' }}
                onClick={() => {
                  authContext?.logout();
                  setMobileMenuOpen(false);
                }}
              >
                Đăng Xuất
              </button>
            </div>
          )}
        </div>

        {/* Mobile Accordion List */}
        {megaMenuData && (
          <div className="cyber-mobile-accordion-list">
            {/* ACCORDION 1: PC BUILDER & PRESETS */}
            <div className={`cyber-mobile-accordion-item ${expandedSections['builder'] ? 'is-expanded' : ''}`}>
              <button
                type="button"
                className="cyber-mobile-accordion-trigger"
                onClick={() => toggleSection('builder')}
                aria-expanded={expandedSections['builder']}
              >
                <div className="cyber-mobile-trigger-content">
                  <span className="cyber-mobile-trigger-icon">
                    <Icons.Wrench />
                  </span>
                  <span className="cyber-mobile-trigger-title">{megaMenuData.builderColumn.title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {renderBadge('AI CHECK', 'neon')}
                  <span className="cyber-mobile-chevron">
                    <Icons.ChevronDown />
                  </span>
                </div>
              </button>

              {expandedSections['builder'] && (
                <div className="cyber-mobile-accordion-panel">
                  {megaMenuData.builderColumn.items.map((item) => (
                    <a
                      key={item.id}
                      href={item.href}
                      className="cyber-mobile-sublink"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div className="cyber-mobile-sublink-title">
                        <span>{item.title}</span>
                        {item.metaInfo && <span className="cyber-mobile-sublink-meta">{item.metaInfo}</span>}
                      </div>
                      {renderBadge(item.badge, item.badgeTone)}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* ACCORDION 2: LINH KIỆN PHẦN CỨNG (8 DANH MỤC) */}
            <div className={`cyber-mobile-accordion-item ${expandedSections['hardware'] ? 'is-expanded' : ''}`}>
              <button
                type="button"
                className="cyber-mobile-accordion-trigger"
                onClick={() => toggleSection('hardware')}
                aria-expanded={expandedSections['hardware']}
              >
                <div className="cyber-mobile-trigger-content">
                  <span className="cyber-mobile-trigger-icon">
                    <Icons.CircuitChip />
                  </span>
                  <span className="cyber-mobile-trigger-title">{megaMenuData.hardwareColumn.title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {renderBadge('8 MỤC', 'pro')}
                  <span className="cyber-mobile-chevron">
                    <Icons.ChevronDown />
                  </span>
                </div>
              </button>

              {expandedSections['hardware'] && (
                <div className="cyber-mobile-accordion-panel">
                  {megaMenuData.hardwareColumn.items.map((item) => (
                    <a
                      key={item.id}
                      href={item.href}
                      className="cyber-mobile-sublink"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div className="cyber-mobile-sublink-title">
                        <span>{item.title}</span>
                        {item.metaInfo && <span className="cyber-mobile-sublink-meta">{item.metaInfo}</span>}
                      </div>
                      {renderBadge(item.badge, item.badgeTone)}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* ACCORDION 3: DỊCH VỤ SỬA CHỮA & BẢO HÀNH */}
            <div className={`cyber-mobile-accordion-item ${expandedSections['services'] ? 'is-expanded' : ''}`}>
              <button
                type="button"
                className="cyber-mobile-accordion-trigger"
                onClick={() => toggleSection('services')}
                aria-expanded={expandedSections['services']}
              >
                <div className="cyber-mobile-trigger-content">
                  <span className="cyber-mobile-trigger-icon">
                    <Icons.ShieldCheck />
                  </span>
                  <span className="cyber-mobile-trigger-title">{megaMenuData.servicesColumn.title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {renderBadge('SLA 24H', 'matrix')}
                  <span className="cyber-mobile-chevron">
                    <Icons.ChevronDown />
                  </span>
                </div>
              </button>

              {expandedSections['services'] && (
                <div className="cyber-mobile-accordion-panel">
                  {megaMenuData.servicesColumn.items.map((item) => (
                    <a
                      key={item.id}
                      href={item.href}
                      className="cyber-mobile-sublink"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div className="cyber-mobile-sublink-title">
                        <span>{item.title}</span>
                        {item.metaInfo && <span className="cyber-mobile-sublink-meta">{item.metaInfo}</span>}
                      </div>
                      {renderBadge(item.badge, item.badgeTone)}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* ACCORDION 4: TRA CỨU NHANH & CTA DỰNG PC */}
            <div className={`cyber-mobile-accordion-item ${expandedSections['quick'] ? 'is-expanded' : ''}`}>
              <button
                type="button"
                className="cyber-mobile-accordion-trigger"
                onClick={() => toggleSection('quick')}
                aria-expanded={expandedSections['quick']}
              >
                <div className="cyber-mobile-trigger-content">
                  <span className="cyber-mobile-trigger-icon">
                    <Icons.Bolt />
                  </span>
                  <span className="cyber-mobile-trigger-title">Tra Cứu Tiến Độ & CTA</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {renderBadge('ONLINE', 'matrix')}
                  <span className="cyber-mobile-chevron">
                    <Icons.ChevronDown />
                  </span>
                </div>
              </button>

              {expandedSections['quick'] && (
                <div className="cyber-mobile-accordion-panel">
                  <form
                    className="cyber-quick-ticket-input-box"
                    style={{ marginTop: 6 }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (quickTicketCode.trim()) {
                        window.location.href = `/repair-tracking?code=${encodeURIComponent(
                          quickTicketCode.trim()
                        )}`;
                      }
                    }}
                  >
                    <input
                      type="text"
                      className="cyber-quick-ticket-input"
                      placeholder="Mã TK-XXXX / SĐT"
                      value={quickTicketCode}
                      onChange={(e) => setQuickTicketCode(e.target.value)}
                    />
                    <button type="submit" className="cyber-quick-ticket-btn">
                      Tra Cứu
                    </button>
                  </form>

                  <a
                    href="/repair-tracking"
                    className="cyber-btn-primary"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>Tra Cứu Tiến Độ Phiếu</span>
                    <Icons.ArrowRight />
                  </a>

                  <a
                    href="/builder"
                    className="cyber-btn-secondary"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{ marginTop: 4 }}
                  >
                    Bắt Đầu Build PC Ngay
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 7. Cyberpunk Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </header>
  );
};

export default MegaNavbar;
