# UI Gaming & Cyberpunk Theme Rules (Quy Chuẩn Thiết Kế Giao Diện Gaming)

Tài liệu này quy định ngôn ngữ thiết kế thị giác (Visual Language) cho toàn bộ hệ thống CyberRig, định hướng phong cách High-tech, Cyberpunk Gaming sang trọng, hiện đại.

---

## 1. Bảng Màu Chủ Đạo (Color Palette)

- **Background Colors**:
  - `bg-base`: `#0b0f19` (Deep Space Dark)
  - `bg-surface`: `#111827` (Gunmetal Surface)
  - `bg-elevated`: `#1e293b` (Elevated Panel)
  - `bg-glass`: `rgba(17, 24, 39, 0.75)` (Glassmorphism backdrop-blur)

- **Accent / Neon Glow**:
  - `neon-cyan`: `#00f0ff` (Primary Cyber Neon - Dành cho CTA, active states, điểm nhấn)
  - `neon-magenta`: `#ff007f` (Secondary Neon - Badge cảnh báo, hot deals)
  - `electric-violet`: `#8b5cf6` (Gradient accents)
  - `matrix-green`: `#10b981` (Tương thích phần cứng hoàn hảo - Compatible OK)
  - `hazard-amber`: `#f59e0b` (Cảnh báo nghẽn cổ chai / Cần lưu ý - Warning)
  - `alert-crimson`: `#ef4444` (Không tương thích / Lỗi linh kiện - Incompatible)

- **Text Colors**:
  - `text-primary`: `#f8fafc` (Trắng sáng độ tương phản cao)
  - `text-secondary`: `#94a3b8` (Slate xám mô tả phụ)
  - `text-muted`: `#64748b` (Dữ liệu mờ, thời gian)

---

## 2. Typography & Font Hierarchy
- **Font Gia Đình**:
  - Heading: `'Orbitron'`, `'Rajdhani'`, hoặc `'Outfit'` (Góc cạnh, sci-fi/gaming aesthetic).
  - Body Text: `'Inter'`, `'Plus Jakarta Sans'`, hoặc `'JetBrains Mono'` (Rõ ràng, dễ đọc thông số kỹ thuật).

---

## 3. Hiệu Ứng Thị Giác (Visual Effects)
- **Glassmorphism**: Sử dụng `backdrop-filter: blur(12px)` kết hợp viền mờ `border: 1px solid rgba(255, 255, 255, 0.08)`.
- **Cyberpunk Glow**: Box-shadow nhẹ nhàng với màu neon:
  - `box-shadow: 0 0 15px rgba(0, 240, 255, 0.3);`
- **Beveled & Tech Borders**: Cắt vát góc (chamfered corners) hoặc thanh chỉ báo neon mảnh ở cạnh trái card.

---

## 4. Trạng Thái Tương Thích & Huy Hiệu (Badges)
- **Hợp Lệ (Compatible)**: Viền xanh matrix (`#10b981`), icon tick phát sáng, text: *Tương thích hoàn toàn*.
- **Cảnh Báo (Warning)**: Viền cam (`#f59e0b`), icon tam giác chấm than, text: *Cảnh báo công suất / kích thước*.
- **Không Hợp Lệ (Incompatible)**: Viền đỏ neon (`#ef4444`), nhấp nháy nhẹ, text: *Xung đột socket / chuẩn giao tiếp*.
