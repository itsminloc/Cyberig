/**
 * CyberRig Main Application Layout
 * Embeds MegaNavbar, ambient lighting, cyberpunk tech grid, and children slot.
 */

import React from 'react';
import '../styles/theme.css';
import './MainLayout.css';
import { MegaNavbar } from '../components/navigation/MegaNavbar';
import { TopProgressBar } from '../components/feedback/TopProgressBar';
import { AuthProvider } from '../context/AuthContext';

export interface MainLayoutProps {
  children?: React.ReactNode;
  isRouteLoading?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, isRouteLoading = false }) => {
  return (
    <AuthProvider>
      <div className="cyber-layout-root">
      {/* 2.5px Top Route Neon Laser Progress Bar */}
      <TopProgressBar isLoading={isRouteLoading} />

      {/* Ambient Cyber Lighting & Tech Grid Overlay */}
      <div className="cyber-layout-ambient" aria-hidden="true">
        <div className="ambient-spot-cyan" />
        <div className="ambient-spot-magenta" />
        <div className="ambient-spot-violet" />
        <div className="ambient-grid" />
      </div>

      {/* Floating Mega Navigation Bar */}
      <MegaNavbar />

      {/* Primary Page Content Wrapper */}
      <main className="cyber-layout-main">
        {children}
      </main>

      {/* Cyberpunk Footer */}
      <footer className="cyber-layout-footer">
        <div className="cyber-footer-inner">
          <div className="cyber-footer-brand">
            <div className="cyber-status-pulse">
              <span className="status-dot" />
              <span>HỆ THỐNG KIỂM TRA TƯƠNG THÍCH HOẠT ĐỘNG 100%</span>
            </div>
          </div>
          <div className="cyber-footer-copy">
            © {new Date().getFullYear()} CyberRig Ecosystem. High Performance PC Builder & Repair Lab.
          </div>
        </div>
      </footer>
    </div>
    </AuthProvider>
  );
};

export default MainLayout;
