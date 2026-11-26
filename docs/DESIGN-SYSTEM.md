# CyberRig — Studio Bento & Pill Design System Specification (v3.0)

Tài liệu quy chuẩn thiết kế giao diện đồng bộ xuyên suốt giữa **Cửa hàng CyberRig (`/`)** và **Trung tâm Điều hành CyberRig Studio · SI Monitor (`/admin-monitoring/`)**.

---

## 1. Hệ Bảng Màu Kép (Dual-Theme Semantic Tokens)

- **Performance Night (Mặc định)**:
  - Canvas: `#0e100f` · Surface: `#161819` · Elevated: `#1c1f21` · Obsidian: `#090b0a`
  - Primary Accent: `#0ae448` (Electric Green) · Contrast Ink: `#000000`
  - Hairline Border: `rgba(255, 255, 255, 0.08)`
- **Showroom Day (`body.theme-day` / `[data-theme="light"]`)**:
  - Canvas: `#fafafa` · Surface: `#ffffff` · Elevated: `#f4f5f7`
  - Primary Accent: `#2563eb` (Cobalt Blue) · Contrast Ink: `#ffffff`
  - Hairline Border: `#e5e7eb`
- **Chuyển cảnh Sáng/Tối**: Sử dụng `document.startViewTransition` với hoạt ảnh lan tỏa tròn `clip-path: circle(...)` từ vị trí nút bấm kèm thông báo nổi Floating Pill Toast.

---

## 2. Hình Học Bo Góc Đồng Tâm (Concentric Bento & Pill Radii)

Tuân thủ nguyên lý `outer_radius = inner_radius + padding`:
- **Thẻ Bento & Hộp thoại ngoài (`--radius-bento` / `--radius-modal`)**: `20px` – `22px`
- **Khối nội dung phụ & Ô con (`--radius-sub`)**: `13px`
- **Ô nhập liệu biểu mẫu (`--radius-tech`)**: `12px`
- **Thanh điều hướng nổi, Nút bấm, Nhãn trạng thái & Toast (`--radius-pill`)**: `999px` (Capsule Pill)

---

## 3. Tương Tác Xúc Giác, Song Ngữ & Chuẩn Hóa Sản Xuất Thực Tế

- **Tactile Press**: Mọi nút tương tác phản hồi nhấn `transform: scale(0.96)` với đường cong `cubic-bezier(0.2, 0, 0, 1)`, tôn trọng `prefers-reduced-motion: reduce`.
- **Song ngữ tức thì (`VIE / ENG`)**: Trang SI Monitor hỗ trợ chuyển đổi toàn diện Tiếng Việt ↔ Tiếng Anh qua `i18n-vi.js` lưu trạng thái vào `localStorage`.
- **Chuẩn hóa Production Auth & Logout**:
  - Tuyệt đối không hiển thị nút tự điền tài khoản mẫu hay gợi ý tên tài khoản thật trong `placeholder`; chặn trình duyệt tự điền trước cho đến khi người dùng chủ động nhấn vào ô nhập.
  - Khi bấm **Đăng Xuất**, kích hoạt lớp chuyển cảnh `.logout-transition-veil` thu hồi phiên JWT an toàn và hiển thị thông báo xác nhận dạng viên nang ở cạnh dưới màn hình.
