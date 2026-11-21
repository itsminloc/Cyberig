/**
 * CyberRig Main Navigation Bar Component (Skeleton)
 * Follows Cyberpunk / Gaming UI theme with glassmorphism and neon accents.
 */

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: string;
}

export const navigationItems: NavItem[] = [
  { label: 'Linh Kiện', href: '/hardware' },
  { label: 'PC Builder', href: '/builder', badge: 'PRO' },
  { label: 'Tra Cứu Sửa Chữa', href: '/repair-tracking' },
  { label: 'Bảo Hành', href: '/warranty' },
];

export const Navbar = () => {
  // Skeleton component
  return null;
};

export default Navbar;
