/**
 * Tech Radar / Hexagon Spinner Component
 * Multi-axis neon rotating HUD scanner for Compatibility Checks and Repair Tracking.
 */

import React from 'react';
import './HexagonSpinner.css';

export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

export interface HexagonSpinnerProps {
  size?: SpinnerSize;
  label?: string;
  sublabel?: string;
  variant?: 'radar' | 'hexagon';
  className?: string;
}

export const HexagonSpinner: React.FC<HexagonSpinnerProps> = ({
  size = 'md',
  label,
  sublabel,
  variant = 'radar',
  className = '',
}) => {
  return (
    <div className={`cyber-spinner-container ${className}`} role="status" aria-live="polite">
      <div className={`cyber-spinner-svg-wrapper cyber-spinner-${size}`}>
        <svg
          className="cyber-spinner-svg"
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Radial Defs for glowing sweeps and gradients */}
          <defs>
            <linearGradient id="cyber-cyan-violet" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f0ff" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ff007f" />
            </linearGradient>

            <linearGradient id="radar-beam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0" />
              <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.8" />
            </linearGradient>

            <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="1" />
              <stop offset="60%" stopColor="#8b5cf6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 1. Static Circular HUD Grid and Radar Axis Crosshair */}
          <circle
            cx="60"
            cy="60"
            r="54"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <circle
            cx="60"
            cy="60"
            r="38"
            stroke="rgba(0, 240, 255, 0.15)"
            strokeWidth="1"
          />
          <line
            x1="60"
            y1="8"
            x2="60"
            y2="112"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1"
          />
          <line
            x1="8"
            y1="60"
            x2="112"
            y2="60"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1"
          />

          {/* 2. Outer Rotating Hexagon (Clockwise) */}
          <g className="hex-outer">
            <polygon
              points="60,10 102,34 102,86 60,110 18,86 18,34"
              stroke="#00f0ff"
              strokeWidth="2"
              strokeDasharray="14 10"
              strokeLinecap="round"
              fill="none"
            />
            {/* Corner Node Points */}
            <circle cx="60" cy="10" r="2.5" fill="#00f0ff" />
            <circle cx="102" cy="34" r="2.5" fill="#00f0ff" />
            <circle cx="102" cy="86" r="2.5" fill="#00f0ff" />
            <circle cx="60" cy="110" r="2.5" fill="#00f0ff" />
            <circle cx="18" cy="86" r="2.5" fill="#00f0ff" />
            <circle cx="18" cy="34" r="2.5" fill="#00f0ff" />
          </g>

          {/* 3. Middle Rotating Hexagon (Counter-Clockwise) */}
          <g className="hex-middle">
            <polygon
              points="60,24 90,41 90,79 60,96 30,79 30,41"
              stroke="#8b5cf6"
              strokeWidth="1.75"
              strokeDasharray="8 6"
              fill="rgba(139, 92, 246, 0.05)"
            />
          </g>

          {/* 4. Radar Sweep Beam (If radar variant) */}
          {variant === 'radar' && (
            <g className="radar-sweep">
              <path
                d="M60,60 L102,60 A42,42 0 0,0 60,18 Z"
                fill="url(#radar-beam)"
                opacity="0.6"
              />
              <line
                x1="60"
                y1="60"
                x2="102"
                y2="60"
                stroke="#00f0ff"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </g>
          )}

          {/* 5. Center Core Pulse LED Diode */}
          <g className="core-pulse">
            <circle cx="60" cy="60" r="14" fill="url(#core-glow)" />
            <circle cx="60" cy="60" r="4.5" fill="#ffffff" />
          </g>
        </svg>
      </div>

      {label && (
        <div className="cyber-spinner-label">
          <span>{label}</span>
          <span className="blinking-cursor" />
        </div>
      )}

      {sublabel && <div className="cyber-spinner-sublabel">{sublabel}</div>}
    </div>
  );
};

export default HexagonSpinner;
