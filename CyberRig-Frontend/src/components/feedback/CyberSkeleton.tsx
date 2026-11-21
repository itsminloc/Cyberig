/**
 * Cyber Skeleton Loader Components
 * Laser neon shimmer sweep feedback for hardware cards, ticket lists, and specs.
 */

import React from 'react';
import './CyberSkeleton.css';

export interface CyberSkeletonProps {
  variant?: 'text' | 'title' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const CyberSkeleton: React.FC<CyberSkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className = '',
  style = {},
}) => {
  const customStyle: React.CSSProperties = {
    ...style,
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  };

  return (
    <span
      className={`cyber-skeleton cyber-skeleton-${variant} ${className}`}
      style={customStyle}
      aria-hidden="true"
    />
  );
};

/**
 * Composite Skeleton for Hardware Product Cards
 */
export const HardwareCardSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="cyber-skeleton-hw-card">
          <CyberSkeleton variant="rect" className="cyber-skeleton-image-box" />
          <div className="cyber-skeleton-pill-row">
            <CyberSkeleton variant="rect" className="cyber-skeleton-pill" />
            <CyberSkeleton variant="rect" className="cyber-skeleton-pill" />
          </div>
          <CyberSkeleton variant="title" width="80%" />
          <CyberSkeleton variant="text" width="60%" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <CyberSkeleton variant="text" width="40%" height={24} />
            <CyberSkeleton variant="rect" width={90} height={32} style={{ borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </>
  );
};

/**
 * Composite Skeleton for Repair Ticket Table Rows
 */
export const RepairTicketRowSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="cyber-skeleton-ticket-row">
          <CyberSkeleton variant="text" width={110} height={18} />
          <div>
            <CyberSkeleton variant="text" width="75%" height={16} />
            <CyberSkeleton variant="text" width="45%" height={12} style={{ marginTop: 4 }} />
          </div>
          <CyberSkeleton variant="text" width="60%" height={16} />
          <CyberSkeleton variant="rect" width={85} height={24} style={{ borderRadius: 12 }} />
          <CyberSkeleton variant="text" width={70} height={14} />
        </div>
      ))}
    </>
  );
};

export default CyberSkeleton;
