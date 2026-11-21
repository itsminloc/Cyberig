# CyberRig - Design System Specification

> [!IMPORTANT]
> **Tài liệu quy chuẩn chính thức v2.0 đã được chuyển sang [docs/STYLE_GUIDE.md](STYLE_GUIDE.md)** theo phong cách GSAP & Osmo Minimalist Hybrid (100% không dùng icon trang trí, Day/Night Mode 60 FPS, nút bấm Capsule). Vui lòng tra cứu tài liệu mới để áp dụng các Design Tokens và Component Snippets chuẩn mực nhất.

---

## 1. Design Tokens

### Colors & Variables
```css
:root {
  /* Surface & Background */
  --cr-bg-base: #0b0f19;
  --cr-bg-surface: #111827;
  --cr-bg-surface-elevated: #1f2937;
  --cr-bg-glass: rgba(17, 24, 39, 0.75);

  /* Borders */
  --cr-border-subtle: rgba(255, 255, 255, 0.08);
  --cr-border-focus: #00f0ff;

  /* Brand / Neon Highlights */
  --cr-primary-cyan: #00f0ff;
  --cr-secondary-magenta: #ff007f;
  --cr-accent-violet: #8b5cf6;

  /* Semantic Status Colors */
  --cr-status-success: #10b981;
  --cr-status-warning: #f59e0b;
  --cr-status-danger: #ef4444;
  --cr-status-info: #3b82f6;

  /* Typography */
  --cr-font-display: 'Orbitron', 'Rajdhani', sans-serif;
  --cr-font-body: 'Inter', system-ui, sans-serif;
  --cr-font-mono: 'JetBrains Mono', monospace;
}
```

---

## 2. Component Guidelines

### A. Navigation & App Bar
- Thanh điều hướng kính mờ (`backdrop-blur-md`), dải viền LED phát sáng ở cạnh dưới.
- Bao gồm: Logo CyberRig với biểu tượng vi mạch đa giác, thanh tìm kiếm nhanh linh kiện / mã phiếu bảo hành, giỏ hàng / danh sách build PC, và nút tài khoản.

### B. PC Builder Matrix
- **Slot Selector**: Thẻ chọn từng thành phần phần cứng (CPU, Bo mạch chủ, RAM, GPU, Nguồn, Tản nhiệt, Ổ cứng, Case).
- **Live Compatibility Bar**: Hiển thị tổng công suất ước tính (W), cảnh báo kích thước, và thanh thông báo trạng thái tương thích tức thời (Real-time compatibility check).
- **Spec Pill Badges**: Thể hiện socket (ví dụ `LGA1700`, `AM5`), form-factor (`ATX`, `mATX`), chuẩn RAM (`DDR5`).

### C. Repair Tracking Timeline
- Hiển thị tiến độ trực quan dạng Stepper/Timeline từ `Tiếp nhận` đến `Hoàn tất bàn giao`.
- Thẻ thông tin chi tiết: Kỹ thuật viên phụ trách, kết quả chẩn đoán, chi phí báo giá, hình ảnh hiện trạng thiết bị.

### D. Loading States & Feedback Patterns
- **Cyber Skeleton Loader:**
  - Áp dụng cho: Danh sách linh kiện, thẻ chi tiết phần cứng, bảng lịch sử phiếu sửa chữa.
  - Hiệu ứng: Nền tối surface (`--cr-bg-surface-elevated`) với lớp quét tia laser neon (`--cr-primary-cyan` opacity 10%) trượt ngang (Shimmer wave).
- **Tech Radar / Hexagon Spinner:**
  - Áp dụng cho: Quá trình thẩm định tương thích (Compatibility Check) và tra cứu tiến độ sửa chữa.
  - Thiết kế: Biểu tượng vi mạch hoặc hình lục giác xoay đa trục phát sáng neon.
- **Top Route Progress Bar:**
  - Thanh nạp mảnh 2px ở sát mép trên màn hình với dải gradient `Cyan -> Magenta`, kích hoạt khi điều hướng trang.
