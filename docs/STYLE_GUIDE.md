# CyberRig — Frontend Design System & Style Guide
**Architecture Version:** 2.1 (High-Tech Industrial, Barlow Condensed & Telemetry System)  
**Target Platform:** CyberRig Hardware Perfection & Diagnostic Lab  
**Authoritative Tokens:** [`nginx/html/css/tokens.css`](file:///d:/Project/cyberig/nginx/html/css/tokens.css)  
**Core Stylesheets:** [`nginx/html/css/`](file:///d:/Project/cyberig/nginx/html/css/)

---

## 1. Triết Lý Thiết Kế Cốt Lõi (Core Design Principles)

Hệ thống giao diện CyberRig v2.1 kết hợp sự chính xác kỹ thuật cao cấp của **GSAP & Osmo** với ngôn ngữ hình khối công nghiệp sắc nét **Industrial High-Tech**:
- **Full-Bleed 100vh Hero Stage**: Chiếm trọn khung nhìn đầu tiên, không bị thò phần dưới, tích hợp chỉ dẫn cuộn High-Tech.
- **Tall & Narrow Typography (Barlow Condensed)**: Tiêu đề dạng chiều dài cao nhưng chiều ngang hẹp mang đậm bản sắc phòng lab vi điện tử.
- **100% Sharp 90-Degree Corners**: Loại bỏ hoàn toàn bo tròn, toàn bộ thẻ card, nút bấm, ô tìm kiếm và telemetry HUD đều có góc vuông sắc cạnh công nghiệp (`border-radius: 0`).
- **Bi-directional Draining Scanner HUD**: Khi hover thanh đo tăng mượt mà lên 100% kèm rung chấn vi điện tử (`tech-rumble`) và hào quang tỏa sáng; khi rời chuột, thanh đo tự động tụt mượt mà về 0%.
- **Dual Day/Night Studio Backdrops**: Nền studio ban đêm và ban ngày chuyển tiếp crossfade êm dịu, không bị chìm ảnh ở Day Mode.

### 4 Nguyên Tắc Bất Biến (Immutable Rules)
1. **Tall & Narrow Condensed Headings:**
   Toàn bộ tiêu đề H1, H2, H3, tiêu đề thẻ card và chỉ dẫn kỹ thuật đều sử dụng `Barlow Condensed` viết hoa, tạo dáng chữ cao, hẹp và đậm chất High-Tech Industrial.
2. **100% Sharp Square Form Language (`border-radius: 0`):**
   Toàn bộ nút bấm tương tác (`<button>`, thẻ CTA), ô nhập liệu (`<input>`), thẻ card, HUD scanner và huy hiệu đều có góc vuông sắc cạnh 90° không bo tròn.
3. **Phản Hồi Xúc Giác Chuẩn Xác (`scale(0.96)`):**
   Khi người dùng click/chạm vào bất kỳ nút bấm nào, nút sẽ co lại chính xác tỷ lệ `scale(0.96)` với đường cong `cubic-bezier(0.2, 0, 0, 1)` trong `150ms`.
4. **Day / Night Mode 60 FPS & Smooth Backdrop Crossfade:**
   Chuyển đổi theme chạy 100% bằng CSS custom properties. Quá trình đổi theme tự động kích hoạt cơ chế triệt tiêu transition tức thì cho màu sắc, đồng thời duy trì transition mượt mà 0.8s cho 2 lớp ảnh nền ban ngày và ban đêm.

---

## 2. Bảng Mã Design Tokens (Design Tokens Reference)

Toàn bộ biến CSS được lưu trữ tập trung tại [`nginx/html/css/tokens.css`](file:///d:/Project/cyberig/nginx/html/css/tokens.css).

### 2.1. Color Palette (Bảng Màu & Tương Phản)

| Danh Mục Token | Token CSS | Night Mode (Default) | Day Mode (`theme-day`) | Mục Đích Sử Dụng |
| :--- | :--- | :--- | :--- | :--- |
| **Accent Bar & Brand** | `--accent-bar` | `#0AE448` (GSAP Green) | `#2563EB` (Cobalt Blue) | Dải Accent 6px cố định trên đỉnh trình duyệt |
| **Accent Primary** | `--accent-primary` | `#0AE448` | `#2563EB` | Màu nhấn chính cho nút bấm, liên kết và tiêu điểm |
| **Accent Contrast** | `--accent-contrast` | `#000000` | `#FFFFFF` | Màu chữ hiển thị bên trong nền Accent Primary |
| **Accent Subtle** | `--accent-subtle` | `rgba(10, 228, 72, 0.12)` | `rgba(37, 99, 235, 0.08)` | Nền huy hiệu mềm, chip linh kiện được chọn |
| **Accent Border** | `--accent-border` | `rgba(10, 228, 72, 0.35)` | `rgba(37, 99, 235, 0.30)` | Viền thẻ khi hover, viền trạng thái xác nhận |
| **Canvas Background** | `--bg-canvas` | `#0E100F` (Matte Dark) | `#FAFAFA` (Smoke White) | Nền chính toàn bộ trang web |
| **Surface Background** | `--bg-surface` | `#161819` | `#FFFFFF` | Nền thẻ Card, Header, Mega Menu, Modal Dialog |
| **Elevated Surface** | `--bg-surface-elevated`| `#1C1F21` | `#F4F5F7` | Nền ô input form, chip linh kiện, hàng bảng hover |
| **Border Subtle** | `--border-subtle` | `rgba(255, 255, 255, 0.08)`| `rgba(0, 0, 0, 0.08)` | Đường kẻ phân cách nhẹ giữa các phần tử |
| **Border Medium** | `--border-medium` | `rgba(255, 255, 255, 0.14)`| `rgba(0, 0, 0, 0.14)` | Đường viền thẻ Card, khung viền Mega Menu |
| **Border Focus** | `--border-focus` | `rgba(255, 255, 255, 0.28)`| `rgba(0, 0, 0, 0.28)` | Viền thẻ Card khi hover hoặc focus |
| **Text Primary** | `--text-main` | `#F5F5F7` | `#111827` | Tiêu đề, nhãn giá trị, nội dung nổi bật |
| **Text Muted** | `--text-muted` | `#8E9299` | `#6B7280` | Văn bản mô tả phụ, nhãn phụ tá (Đạt chuẩn WCAG AA 4.5:1+) |
| **Text Tertiary** | `--text-tertiary` | `#5E626A` | `#9CA3AF` | Chữ số định danh 01-03, đường kẻ tiến trình |
| **Radiating Aura** | `--aura-radiate` | `0 0 45px rgba(10,228,72,0.4)` | `0 0 45px rgba(37,99,235,0.35)` | Hào quang phát quang quanh Scanner HUD |

---

### 2.2. Typography System (Hệ Thống Phông Chữ & Thang Tỷ Lệ)

Dự án chuẩn hóa trên các bộ phông chữ hiện đại:
- **Headings & Telemetry Titles:** `Barlow Condensed` (weights: 600, 700, 800) — chiều dài cao, chiều ngang hẹp, đậm chất công nghệ kỹ thuật cao.
- **Display Accents & Sub-headings:** `Space Grotesk` (weights: 500, 600, 700) — đường nét kỹ thuật hiện đại.
- **Body & UI Controls:** `Inter` (weights: 400, 500, 600) — độ dễ đọc tối ưu ở mọi kích cỡ màn hình.
- **Data & Numerals:** `JetBrains Mono` (weights: 500, 600, 800) — căn chỉnh số liệu, mã SKU đơn hàng, định danh.

```css
:root {
  --font-sans: 'Space Grotesk', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

#### Quy Chuẩn Typography Chuyên Sâu (Áp Dụng Từ `better-typography`)
1. **Smoothing ở Root:** Áp dụng duy nhất 1 lần tại `body`:
   ```css
   -webkit-font-smoothing: antialiased;
   -moz-osx-font-smoothing: grayscale;
   ```
2. **Tự Động Cân Bằng Dòng Tiêu Đề (`text-wrap: balance`):**
   Áp dụng bắt buộc trên tất cả các tiêu đề lớn (`.showcase-headline`, `.tier-title`, `.ending-title`, `.modal-headline`) để tránh việc tiêu đề bị lệch dòng không đều.
3. **Chống Từ Đơn Lẻ Cuối Dòng (`text-wrap: pretty`):**
   Áp dụng trên toàn bộ đoạn văn bản mô tả (`.showcase-subtext`, `.tier-desc`, `.preset-desc`, `.modal-subtext`, `.standard-card-text`) để ngăn chặn từ cụt (widow words).
4. **Cố Định Chiều Rộng Chữ Số (`font-variant-numeric: tabular-nums`):**
   Bắt buộc cho mọi hiển thị giá tiền (`.preset-price-val`, `.order-total-price`), số đo giám sát (`.telemetry-val-text`), số đếm kho và số thứ tự (`.standard-numeral`) để khi giá trị thay đổi, bố cục không bị giật ngang (layout shift).
5. **Cấm Auto-Zoom Trên Mobile iOS:**
   Tất cả ô nhập liệu form (`.form-field-input`) trên màn hình di động (`@media (max-width: 960px)`) phải có `font-size: 16px` để ngăn Safari tự động phóng to màn hình.

---

### 2.3. Concentric Radii & Depth Elevation (Bo Góc Đồng Tâm & Đổ Bóng)

Công thức bo góc đồng tâm chuẩn xác: $R_{\text{ngoài}} = R_{\text{trong}} + \text{Padding}$.

```css
:root {
  --radius-pill: 9999px;   /* Nút bấm Capsule, Badge, Input form */
  --radius-modal: 20px;    /* Khung Modal Dialog lớn */
  --radius-card: 16px;     /* Thẻ Preset, Thẻ Standard, Đơn hàng */
  --radius-tile: 12px;     /* Thẻ Telemetry nhỏ, Bảng điều khiển */
  --radius-sm: 8px;        /* Mục liên kết trong Mega Menu */

  /* Đổ bóng phân lớp (Layered Shadows) */
  --shadow-card: 0 20px 45px rgba(0, 0, 0, 0.45);
  --shadow-modal: 0 25px 60px rgba(0, 0, 0, 0.50);
  --shadow-dropdown: 0 16px 36px rgba(0, 0, 0, 0.40);
}
```

---

### 2.4. Motion & Tactile Feedback Tokens (Chuyển Động & Phản Hồi)

Tuyệt đối **không** dùng `transition: all` trên các phần tử tương tác để đảm bảo hiệu năng 60 FPS và tránh giật hình.

```css
:root {
  --ease-tactile: cubic-bezier(0.2, 0, 0, 1);
  --ease-smooth: cubic-bezier(0.16, 1, 0.3, 1);
  --trans-fast: 150ms var(--ease-tactile);
  --trans-smooth: color 0.18s var(--ease-tactile), 
                  background-color 0.18s var(--ease-tactile), 
                  border-color 0.18s var(--ease-tactile), 
                  box-shadow 0.18s var(--ease-tactile), 
                  transform 0.18s var(--ease-tactile);
}
```

---

## 3. Thư Viện Thành Phần & Mã Nguồn Chuẩn (Component Snippets)

### 3.1. Dải Accent Bar 6px Phát Sáng Neon (Top Accent Bar)
Dải màu 6px cố định ở đỉnh viewport, kết hợp gradient neon (`--accent-bar` chuyển sang `#00F0FF`) và hiệu ứng hào quang (`box-shadow: 0 0 16px var(--accent-glow)`).

```html
<!-- HTML -->
<div id="top-accent-bar" class="top-accent-bar"></div>
```
```css
/* CSS */
.top-accent-bar {
  height: 6px;
  width: 100%;
  background: linear-gradient(90deg, var(--accent-bar) 0%, #00f0ff 50%, var(--accent-bar) 100%);
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  box-shadow: 0 0 16px var(--accent-glow);
  transition: background 0.3s ease, box-shadow 0.3s ease;
}
```

---

### 3.2. Nút Bấm High-Tech Vuông Có Shadow Nổi Khối (Square Tech Buttons)

Hệ thống nút bấm dạng ô vuông có bo nhẹ góc công nghệ (`border-radius: 8px`), đổ bóng nổi khối (`--shadow-tech-btn`), phản hồi xúc giác `scale(0.96)`.

#### A. Nút Nhấn Nổi Bật High-Tech (Accent Tech Button)
```html
<a href="/builder" class="tech-btn tech-btn-accent">
  Tự ráp PC
</a>
```

#### B. Nút Nhấn Kích Thước Lớn (Large Tech Button)
```html
<a href="/builder" class="tech-btn tech-btn-accent tech-btn-large">
  Bắt đầu tự ráp máy
</a>
```

#### C. Nút Viền Mảnh High-Tech (Outline Tech Button)
```html
<button type="button" class="tech-btn tech-btn-outline">
  Tìm Kiếm
</button>
```

#### CSS Thực Thi Nút Bấm High-Tech:
```css
.tech-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 11px 22px;
  border-radius: var(--radius-tech); /* 8px */
  font-family: var(--font-sans);
  font-size: 0.86rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-decoration: none;
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: var(--shadow-tech-btn);
  transition-property: transform, opacity, background-color, border-color, box-shadow;
  transition-duration: 150ms;
  transition-timing-function: var(--ease-tactile);
}

.tech-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.tech-btn:active {
  transform: scale(0.96) translateY(0);
  box-shadow: var(--shadow-tech-active);
}

.tech-btn-accent {
  background: var(--accent-primary);
  color: var(--accent-contrast);
  border-color: var(--accent-primary);
  box-shadow: 0 4px 16px var(--accent-glow), inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.tech-btn-outline {
  background: var(--bg-surface-elevated);
  color: var(--text-main);
  border-color: var(--border-medium);
}
```

#### CSS Thực Thi Nút Bấm:
```css
.pill-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 9px 20px;
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-decoration: none;
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition-property: transform, opacity, background-color, border-color, box-shadow;
  transition-duration: 150ms;
  transition-timing-function: var(--ease-tactile);
}

.pill-btn:hover {
  transform: translateY(-1px);
}

/* Xúc giác chuẩn 0.96 scale */
.pill-btn:active {
  transform: scale(0.96);
}

.pill-btn:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

.pill-btn-accent {
  background: var(--accent-primary);
  color: var(--accent-contrast);
  border-color: var(--accent-primary);
}

.pill-btn-accent:hover {
  opacity: 0.94;
  box-shadow: 0 4px 14px var(--accent-glow);
}

.pill-btn-outline {
  background: transparent;
  color: var(--text-main);
  border-color: var(--pill-border);
}

.pill-btn-outline:hover {
  background: var(--pill-bg);
  border-color: var(--border-focus);
}

.pill-btn-ghost {
  background: var(--pill-bg);
  color: var(--text-main);
  border-color: var(--pill-border);
}

.pill-btn-ghost:hover {
  background: var(--pill-hover);
  border-color: var(--border-medium);
}

.pill-btn-large {
  padding: 13px 32px;
  font-size: 0.92rem;
  letter-spacing: 0.03em;
}
```

---

### 3.3. Menu Điều Hướng Đa Cột Thuần Typography (Mega Menu)

```html
<!-- Cụm Menu 3 Cột: Linh Kiện PC -->
<div class="nav-item-wrapper">
  <button type="button" class="nav-link-btn">Linh kiện PC</button>
  <div class="mega-menu-drawer mega-menu-3col">
    <div>
      <div class="mega-col-header">Vi xử lý &amp; Bo mạch</div>
      <a href="/api/hardware?category=CPU" class="mega-link-item">
        <span class="mega-link-title">Vi Xử Lý (CPU)</span>
        <span class="mega-link-desc">Intel Core thế hệ 14 &amp; AMD Ryzen 7000/9000</span>
      </a>
      <a href="/api/hardware?category=MOTHERBOARD" class="mega-link-item">
        <span class="mega-link-title">Bo Mạch Chủ (Mainboard)</span>
        <span class="mega-link-desc">Chipset Z790, B760, X670E, B650</span>
      </a>
    </div>
    <div>
      <div class="mega-col-header">Đồ họa &amp; Bộ nhớ</div>
      <a href="/api/hardware?category=GPU" class="mega-link-item">
        <span class="mega-link-title">Card Đồ Họa (VGA)</span>
        <span class="mega-link-desc">NVIDIA GeForce RTX 40 Series &amp; Radeon</span>
      </a>
      <a href="/api/hardware?category=RAM" class="mega-link-item">
        <span class="mega-link-title">Bộ Nhớ Trong (RAM)</span>
        <span class="mega-link-desc">DDR5 6000MHz+ độ trễ thấp &amp; DDR4</span>
      </a>
    </div>
    <div>
      <div class="mega-col-header">Nguồn &amp; Khung máy</div>
      <a href="/api/hardware?category=PSU" class="mega-link-item">
        <span class="mega-link-title">Nguồn Máy Tính (PSU)</span>
        <span class="mega-link-desc">Chuẩn ATX 3.0, 80 Plus Gold &amp; Platinum</span>
      </a>
      <a href="/builder" class="mega-link-item" style="background: var(--accent-subtle);">
        <span class="mega-link-title" style="color: var(--accent-primary);">Tự Ráp Máy Tính</span>
        <span class="mega-link-desc">Kiểm tra tương thích tự động tức thì</span>
      </a>
    </div>
  </div>
</div>
```

---

### 3.4. Thẻ Cấu Hình & Số Đo (Spec Sheet & Metric Cards)

#### A. Thẻ Tiêu Chuẩn Kèm Số Thứ Tự Mono (Standard Card)
```html
<div class="standard-card">
  <div class="standard-numeral">01</div>
  <h3 class="standard-card-title">Chuẩn kết nối vật lý</h3>
  <p class="standard-card-text">
    Đồng bộ chính xác Socket CPU (LGA1700, AM5), chuẩn RAM DDR4/DDR5 và kích thước chiều dài card đồ họa tương thích với khoang vỏ case.
  </p>
</div>
```

#### B. Thẻ Cấu Hình Dựng Sẵn (Preset Card)
```html
<div class="preset-card">
  <div>
    <span class="preset-task-badge">Rendering &amp; CAD</span>
    <h3 class="preset-name">Studio Master Rig</h3>
    <p class="preset-desc">
      Cấu hình tối ưu cho biên tập video 4K/8K, dựng hình 3D đa luồng và mô phỏng vật lý chuyên sâu.
    </p>
    <ul class="preset-specs-list">
      <li class="preset-spec-row">
        <span class="spec-key">CPU</span>
        <span class="spec-val">Intel Core i9-14900K</span>
      </li>
      <li class="preset-spec-row">
        <span class="spec-key">GPU</span>
        <span class="spec-val">GeForce RTX 4080 Super 16GB</span>
      </li>
      <li class="preset-spec-row">
        <span class="spec-key">RAM</span>
        <span class="spec-val">64GB DDR5 6000MHz</span>
      </li>
    </ul>
  </div>
  <div class="preset-bottom-bar">
    <div>
      <div class="preset-price-label">Giá niêm yết</div>
      <div class="preset-price-val">82.900.000 đ</div>
    </div>
    <a href="/builder" class="pill-btn pill-btn-accent">Chọn dàn này</a>
  </div>
</div>
```

---

### 3.5. Huy Hiệu Trạng Thái Chữ (Status Badges)

```html
<!-- Chờ xử lý -->
<span class="status-pill status-pending">Đang xử lý</span>

<!-- Đã xác nhận / Hoàn tất -->
<span class="status-pill status-confirmed">Đã xác nhận</span>
<span class="status-pill status-completed">Hoàn tất</span>

<!-- Hủy bỏ -->
<span class="status-pill status-cancelled">Đã hủy</span>
```
```css
.status-pill {
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.status-pill.status-pending {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.status-pill.status-confirmed, 
.status-pill.status-completed {
  background: var(--accent-subtle);
  color: var(--accent-primary);
  border: 1px solid var(--accent-border);
}

.status-pill.status-cancelled {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}
```

---

### 3.6. Cửa Sổ Modal & Ô Nhập Liệu Capsule (Modals & Form Inputs)

```html
<div class="modal-backdrop is-active" id="auth-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <div class="modal-dialog-box">
    <!-- Nút đóng Capsule -->
    <button type="button" class="modal-close-pill" id="auth-close-btn" aria-label="Đóng cửa sổ">
      ESC
    </button>

    <div class="modal-header-box">
      <h2 class="modal-headline" id="modal-title">TRUY CẬP HỆ THỐNG</h2>
      <p class="modal-subtext">Đăng nhập tài khoản để theo dõi đơn hàng và linh kiện bảo hành.</p>
    </div>

    <form class="auth-form" id="auth-form">
      <div class="form-field-group">
        <label for="input-email" class="form-field-label">Địa chỉ Email</label>
        <input 
          type="email" 
          id="input-email" 
          class="form-field-input" 
          placeholder="name@company.vn" 
          required 
          autocomplete="email"
        />
      </div>

      <div class="form-field-group">
        <label for="input-password" class="form-field-label">Mật khẩu</label>
        <input 
          type="password" 
          id="input-password" 
          class="form-field-input" 
          placeholder="••••••••" 
          required 
          autocomplete="current-password"
        />
      </div>

      <button type="submit" class="pill-btn pill-btn-accent" style="width: 100%; margin-top: 10px;">
        Xác Nhận Đăng Nhập
      </button>
    </form>
  </div>
</div>
```

---

## 4. Tiêu Chuẩn Kỹ Thuật & Checklist Kiểm Định (Audit Checklist)

Bất kỳ thành phần giao diện mới nào khi được thêm vào CyberRig đều phải vượt qua 5 tiêu chuẩn dưới đây (đúc kết từ các bộ kỹ năng `better-interface`, `better-ui`, `better-typography`, `better-accessibility`):

### Checklist Đảm Bảo Chất Lượng (Quality Gate)
- [ ] **Accessibility (Hỗ trợ truy cập):**
  - Mọi nút bấm hoặc liên kết đều có thể kích hoạt bằng phím `Tab` và hiển thị viền `:focus-visible` độ dày `2px`.
  - Mọi cửa sổ Modal đóng được bằng phím `Escape`, có `overscroll-behavior: contain` trên backdrop.
  - Tồn tại liên kết `.skip-link` đầu tiên trên trang dẫn thẳng vào `#main-content`.
  - Tuân thủ `@media (prefers-reduced-motion: reduce)` triệt tiêu rung giật/co giãn cho người dùng nhạy cảm chuyển động.
- [ ] **Typography:**
  - Tiêu đề dùng `text-wrap: balance;`.
  - Đoạn mô tả dùng `text-wrap: pretty;`.
  - Tất cả số tiền, số lượng kho, đồng hồ thời gian dùng `font-variant-numeric: tabular-nums;`.
  - Ô input form trên mobile không nhỏ hơn `16px` để tránh iOS zoom.
- [ ] **UI & Motion Polish:**
  - Nút bấm có hiệu ứng xúc giác `scale(0.96)` khi `:active`.
  - Các phần tử bo góc lồng nhau tuân thủ công thức bán kính đồng tâm: $R_{\text{ngoài}} = R_{\text{trong}} + \text{Padding}$.
  - Hình ảnh có viền mảnh `1px` với độ trong suốt thấp (`outline: 1px solid rgba(255, 255, 255, 0.1); outline-offset: -1px`) để tạo chiều sâu đồng nhất.
  - Không sử dụng `transition: all`. Liệt kê chính xác từng thuộc tính (`transform`, `opacity`, `background-color`).
- [ ] **60 FPS Performance:**
  - Cơ chế đổi Day/Night mode không gọi lại hàm render layout nặng bằng JS.
  - Áp dụng kỹ thuật triệt tiêu chuyển động đổi màu đồng loạt để tránh smearing.
