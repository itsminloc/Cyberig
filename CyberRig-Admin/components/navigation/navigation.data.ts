/**
 * Navigation Data & Type Specifications for CyberRig
 * Aligned with docs/DESIGN-SYSTEM.md and .skills/ui-gaming-theme.md
 */

export type BadgeTone = 'neon' | 'hot' | 'pro' | 'matrix' | 'warning';

export interface NavLinkItem {
  id: string;
  title: string;
  description: string;
  href: string;
  badge?: string;
  badgeTone?: BadgeTone;
  iconName: string;
  metaInfo?: string;
}

export interface QuickActionCardData {
  id: string;
  title: string;
  tagline: string;
  description: string;
  primaryActionLabel: string;
  primaryActionHref: string;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  statusBadge: {
    label: string;
    tone: BadgeTone;
  };
  metrics?: {
    label: string;
    value: string;
  }[];
  accentGlow: string;
}

export interface MegaMenuContent {
  builderColumn: {
    title: string;
    icon: string;
    description: string;
    items: NavLinkItem[];
  };
  hardwareColumn: {
    title: string;
    icon: string;
    description: string;
    items: NavLinkItem[];
  };
  servicesColumn: {
    title: string;
    icon: string;
    description: string;
    items: NavLinkItem[];
  };
  quickActionCard: QuickActionCardData;
}

export interface NavTabItem {
  id: string;
  label: string;
  href: string;
  badge?: string;
  badgeTone?: BadgeTone;
  hasMegaMenu: boolean;
  megaMenu?: MegaMenuContent;
}

export const MAIN_NAV_TABS: NavTabItem[] = [
  {
    id: 'pc-builder',
    label: 'PC Builder',
    href: '/builder',
    badge: 'AI CHECK',
    badgeTone: 'neon',
    hasMegaMenu: true,
    megaMenu: {
      // CỘT 1: PC BUILDER & PRESETS
      builderColumn: {
        title: 'PC Builder & Presets',
        icon: 'wrench-screwdriver',
        description: 'Tùy biến cấu hình và chọn preset theo ngân sách & nhu cầu.',
        items: [
          {
            id: 'custom-builder',
            title: 'Dựng Cấu Hình Theo Linh Kiện',
            description: 'Tự chọn linh kiện với thuật toán thẩm định socket, TDP & kích thước case tự động.',
            href: '/builder/custom',
            badge: 'AI COMPATIBLE',
            badgeTone: 'neon',
            iconName: 'wrench-screwdriver',
            metaInfo: 'Real-time Rule Engine',
          },
          {
            id: 'preset-esports',
            title: 'Gaming Esport Preset',
            description: 'Tối ưu 180+ FPS cho CS2, Valorant, LMHT, FO4 (Từ 12M - 25M).',
            href: '/builder/preset?category=esports',
            badge: '180+ FPS',
            badgeTone: 'matrix',
            iconName: 'sparkles',
            metaInfo: 'i5 13600K / R5 7600 + RTX 4060',
          },
          {
            id: 'preset-workstation',
            title: 'Đồ Họa 3D & Render AI',
            description: '64GB DDR5, VRAM 16GB+ cho Blender, Premiere, After Effects & Stable Diffusion.',
            href: '/builder/preset?category=workstation',
            badge: 'PRO STUDIO',
            badgeTone: 'pro',
            iconName: 'cube-transparent',
            metaInfo: 'Multi-Core & Gen 5 NVMe',
          },
          {
            id: 'preset-office',
            title: 'Máy Văn Phòng & Doanh Nghiệp',
            description: 'Vận hành êm ái, tiết kiệm điện năng, hỗ trợ xuất đa màn hình 4K (Từ 8M - 15M).',
            href: '/builder/preset?category=office',
            badge: 'TIẾT KIỆM ĐIỆN',
            badgeTone: 'matrix',
            iconName: 'briefcase',
            metaInfo: 'Độ bền 24/7 ổn định',
          },
        ],
      },

      // CỘT 2: HARDWARE CATEGORIES (8 DANH MỤC LINH KIỆN)
      hardwareColumn: {
        title: 'Linh Kiện Phần Cứng',
        icon: 'squares-2x2',
        description: 'Kho linh kiện chính hãng kèm thông số kỹ thuật chuẩn hóa.',
        items: [
          {
            id: 'hw-cpu',
            title: 'CPU - Bộ Vi Xử Lý',
            description: 'Intel Gen 13/14/Ultra & AMD Ryzen 7000/9000.',
            href: '/hardware?category=CPU',
            iconName: 'cpu',
            metaInfo: 'LGA1700 / AM5',
          },
          {
            id: 'hw-mb',
            title: 'Mainboard - Bo Mạch Chủ',
            description: 'B760, Z790, B650, X670E từ ASUS, MSI, Gigabyte.',
            href: '/hardware?category=MOTHERBOARD',
            iconName: 'server',
            metaInfo: 'ATX / Micro-ATX / ITX',
          },
          {
            id: 'hw-gpu',
            title: 'GPU - Card Màn Hình',
            description: 'NVIDIA RTX 40-Series & AMD Radeon RX 7000.',
            href: '/hardware?category=GPU',
            badge: 'HOT',
            badgeTone: 'hot',
            iconName: 'device-tablet',
            metaInfo: 'DLSS 3.5 & Ray Tracing',
          },
          {
            id: 'hw-ram',
            title: 'RAM - Bộ Nhớ Trong',
            description: 'DDR4 / DDR5 Dual Channel bus 5600MHz - 7200MHz.',
            href: '/hardware?category=RAM',
            iconName: 'bars-3',
            metaInfo: 'RGB / Low-profile',
          },
          {
            id: 'hw-storage',
            title: 'Ổ Cứng SSD & HDD',
            description: 'SSD NVMe Gen 4/5 đọc ghi tới 12,000 MB/s.',
            href: '/hardware?category=STORAGE',
            iconName: 'circle-stack',
            metaInfo: 'M.2 NVMe PCIe',
          },
          {
            id: 'hw-psu',
            title: 'PSU - Nguồn Máy Tính',
            description: 'Chuẩn 80 Plus Bronze/Gold, cáp nguồn 12VHPWR.',
            href: '/hardware?category=PSU',
            iconName: 'bolt',
            metaInfo: 'Đệm an toàn 25% công suất',
          },
          {
            id: 'hw-case',
            title: 'Vỏ Case - Thùng Máy',
            description: 'Case bể cá kính cong, luồng gió thoáng, hỗ trợ VGA 400mm.',
            href: '/hardware?category=CASE',
            iconName: 'archive-box',
            metaInfo: 'Tương thích Radiator 360mm',
          },
          {
            id: 'hw-cooling',
            title: 'Tản Nhiệt Fan & AIO',
            description: 'Tản khí tháp đôi & tản nhiệt nước AIO 240/360 RGB.',
            href: '/hardware?category=COOLER',
            iconName: 'sun',
            metaInfo: 'Hỗ trợ gông LGA1700/AM5',
          },
        ],
      },

      // CỘT 3: DỊCH VỤ SỬA CHỮA & KỸ THUẬT (SERVICES)
      servicesColumn: {
        title: 'Dịch Vụ Kỹ Thuật & Bảo Hành',
        icon: 'shield-check',
        description: 'Quy trình tiếp nhận minh bạch, test bench chuyên sâu và tra cứu realtime.',
        items: [
          {
            id: 'svc-intake',
            title: 'Tiếp Nhận Sửa Chữa Thiết Bị',
            description: 'Đăng ký kiểm tra PC/Laptop, test bench phần cứng & đo mạch trong 24h.',
            href: '/repair/intake',
            badge: 'SLA 24H',
            badgeTone: 'matrix',
            iconName: 'calendar-days',
            metaInfo: 'Miễn phí chẩn đoán sơ bộ',
          },
          {
            id: 'svc-pricing',
            title: 'Bảng Giá Thay Linh Kiện',
            description: 'Báo giá niêm yết đóng chip VGA, thay socket mainboard, vệ sinh tra keo tản.',
            href: '/repair/pricing',
            iconName: 'banknotes',
            metaInfo: 'Báo giá minh bạch trước khi sửa',
          },
          {
            id: 'svc-ticket-tracking',
            title: 'Tra Cứu Mã Phiếu Bảo Hành',
            description: 'Theo dõi trực tiếp tiến độ xử lý, ảnh hiện trạng và nhật ký kỹ thuật viên.',
            href: '/repair-tracking',
            badge: 'REALTIME',
            badgeTone: 'neon',
            iconName: 'magnifying-glass',
            metaInfo: 'Nhập mã TK-XXXX hoặc SĐT',
          },
          {
            id: 'svc-warranty-policy',
            title: 'Chính Sách Bảo Hành & Đổi Mới',
            description: 'Bảo hành dịch vụ lên tới 6 tháng, 1 đổi 1 trong 30 ngày với linh kiện mới.',
            href: '/warranty/policy',
            iconName: 'shield-check',
            metaInfo: 'Tem điện tử SN/IMEI',
          },
        ],
      },

      // CỘT 4: QUICK ACTION CARD (BANNER TRA CỨU & CTA)
      quickActionCard: {
        id: 'quick-tracker-card',
        title: 'Tra Cứu Nhanh Tiến Độ Phiếu TK-XXXX',
        tagline: 'CYBERRIG REAL-TIME AUDIT',
        description:
          'Nhập mã phiếu sửa chữa (ví dụ: TK-20260905-001) hoặc số điện thoại để xem trực tiếp ảnh hiện trạng, kết quả stress test và nhật ký kỹ thuật viên.',
        primaryActionLabel: 'Tra Cứu Tiến Độ Phiếu',
        primaryActionHref: '/repair-tracking',
        secondaryActionLabel: 'Bắt Đầu Build PC Ngay',
        secondaryActionHref: '/builder',
        statusBadge: {
          label: 'HỆ THỐNG TRỰC TUYẾN 24/7',
          tone: 'matrix',
        },
        metrics: [
          { label: 'Thời gian chẩn đoán', value: '≤ 24h' },
          { label: 'Kiểm thử QA Fullload', value: '100% OK' },
          { label: 'Bảo hành dịch vụ', value: 'Lên tới 6T' },
        ],
        accentGlow: 'rgba(var(--cr-cyan-rgb), 0.25)',
      },
    },
  },
  {
    id: 'hardware-catalog',
    label: 'Linh Kiện Bán Lẻ',
    href: '/hardware',
    hasMegaMenu: false,
  },
  {
    id: 'repair-service',
    label: 'Dịch Vụ Kỹ Thuật',
    href: '/repair-tracking',
    badge: 'LIVE STATUS',
    badgeTone: 'matrix',
    hasMegaMenu: false,
  },
  {
    id: 'deals',
    label: 'Khuyến Mãi & Giảm Giá',
    href: '/promotions',
    badge: 'HOT DEALS',
    badgeTone: 'hot',
    hasMegaMenu: false,
  },
  {
    id: 'community-builds',
    label: 'Cộng Đồng Góc Máy',
    href: '/community',
    hasMegaMenu: false,
  },
];
