/**
 * Compatibility Status Badge Component (Skeleton)
 * Renders status pill (Compatible / Warning / Incompatible) with neon styling.
 */

export interface CompatibilityBadgeProps {
  status: 'COMPATIBLE' | 'WARNING' | 'INCOMPATIBLE';
  estimatedWattage?: number;
  issueCount?: number;
}

export const CompatibilityBadge = (_props: CompatibilityBadgeProps) => {
  // Skeleton component
  return null;
};

export default CompatibilityBadge;
