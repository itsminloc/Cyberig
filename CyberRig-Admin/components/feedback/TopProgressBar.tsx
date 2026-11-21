/**
 * Top Route Progress Bar Component
 * Ultra-thin 2px neon laser progress bar pinned to the top edge for page routing.
 */

import React, { useEffect, useState } from 'react';
import './TopProgressBar.css';

export interface TopProgressBarProps {
  isLoading?: boolean;
  progress?: number; // 0 to 100
  mode?: 'trickle' | 'indeterminate' | 'determinate';
}

export const TopProgressBar: React.FC<TopProgressBarProps> = ({
  isLoading = false,
  progress,
  mode = 'trickle',
}) => {
  const [internalProgress, setInternalProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isLoading) {
      setVisible(true);
      if (mode === 'trickle') {
        setInternalProgress(15);
        interval = setInterval(() => {
          setInternalProgress((prev) => {
            if (prev >= 90) return prev;
            const step = Math.max(1, (90 - prev) * 0.1);
            return Math.min(90, prev + step);
          });
        }, 200);
      }
    } else {
      // Completed transition
      if (visible) {
        setInternalProgress(100);
        const timeout = setTimeout(() => {
          setVisible(false);
          setInternalProgress(0);
        }, 320);
        return () => clearTimeout(timeout);
      }
    }

    return () => clearInterval(interval);
  }, [isLoading, mode, visible]);

  if (!visible && !isLoading && progress === undefined) {
    return null;
  }

  const currentWidth = progress !== undefined ? progress : internalProgress;

  return (
    <div className="cyber-top-progress-container" aria-hidden="true">
      {mode === 'indeterminate' && isLoading ? (
        <div className="cyber-top-progress-bar cyber-top-progress-indeterminate" />
      ) : (
        <div
          className="cyber-top-progress-bar"
          style={{
            width: `${Math.min(100, Math.max(0, currentWidth))}%`,
            opacity: visible || isLoading ? 1 : 0,
          }}
        />
      )}
    </div>
  );
};

export default TopProgressBar;
