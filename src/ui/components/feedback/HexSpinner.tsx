/**
 * HexSpinner Component
 * Concentric multi-axis Neon Cyan & Magenta rotating polygon spinner.
 * Strictly implements docs/DESIGN-SYSTEM.md tokens.
 */

import React from 'react';
import './HexSpinner.css';

export type HexSpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

export interface HexSpinnerProps {
  size?: HexSpinnerSize;
  label?: string;
  sublabel?: string;
  className?: string;
}

export const HexSpinner: React.FC<HexSpinnerProps> = ({
  size = 'md',
  label,
  sublabel,
  className = '',
}) => {
  return (
    <div className={`cyber-hex-spinner-wrapper ${className}`} role="status" aria-live="polite">
      <div className={`cyber-hex-viewport cyber-hex-size-${size}`}>
        <svg
          className="cyber-hex-svg"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle Background HUD Ring */}
          <circle
            cx="60"
            cy="60"
            r="54"
            stroke="var(--cr-border-subtle)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Crosshair Axes */}
          <line x1="60" y1="12" x2="60" y2="108" className="hex-grid-axis" strokeWidth="1" />
          <line x1="12" y1="60" x2="108" y2="60" className="hex-grid-axis" strokeWidth="1" />

          {/* 1. Outer Polygon: Neon Cyan (Clockwise) */}
          <g className="hex-ring-cyan">
            <polygon
              points="60,10 102,34 102,86 60,110 18,86 18,34"
              strokeWidth="2.5"
              strokeDasharray="16 8"
              strokeLinecap="round"
              fill="none"
            />
            {/* Cyan Corner Nodes */}
            <circle cx="60" cy="10" r="3" className="hex-node-cyan" />
            <circle cx="102" cy="34" r="3" className="hex-node-cyan" />
            <circle cx="102" cy="86" r="3" className="hex-node-cyan" />
            <circle cx="60" cy="110" r="3" className="hex-node-cyan" />
            <circle cx="18" cy="86" r="3" className="hex-node-cyan" />
            <circle cx="18" cy="34" r="3" className="hex-node-cyan" />
          </g>

          {/* 2. Inner Polygon: Neon Magenta (Counter-Clockwise) */}
          <g className="hex-ring-magenta">
            <polygon
              points="60,26 89,43 89,77 60,94 31,77 31,43"
              strokeWidth="2"
              strokeDasharray="10 6"
              strokeLinecap="round"
              fill="rgba(var(--cr-magenta-rgb), 0.04)"
            />
            {/* Magenta Vertex Nodes */}
            <circle cx="60" cy="26" r="2.5" className="hex-node-magenta" />
            <circle cx="89" cy="43" r="2.5" className="hex-node-magenta" />
            <circle cx="89" cy="77" r="2.5" className="hex-node-magenta" />
            <circle cx="60" cy="94" r="2.5" className="hex-node-magenta" />
            <circle cx="31" cy="77" r="2.5" className="hex-node-magenta" />
            <circle cx="31" cy="43" r="2.5" className="hex-node-magenta" />
          </g>

          {/* 3. Pulsing Center Core Diode */}
          <g className="hex-core-diode">
            <circle cx="60" cy="60" r="10" fill="rgba(var(--cr-cyan-rgb), 0.3)" />
            <circle cx="60" cy="60" r="5" fill="var(--cr-primary-cyan)" />
            <circle cx="60" cy="60" r="2" fill="#ffffff" />
          </g>
        </svg>
      </div>

      {label && (
        <div className="cyber-hex-label">
          <span>{label}</span>
          <span className="cyber-hex-cursor" />
        </div>
      )}

      {sublabel && <div className="cyber-hex-sublabel">{sublabel}</div>}
    </div>
  );
};

export default HexSpinner;
