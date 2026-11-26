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
- **Chuẩn hóa Production Auth, Login Gate & Instant Logout**:
  - Tuyệt đối không hiển thị nút tự điền tài khoản mẫu hay gợi ý tên tài khoản thật trong `placeholder`; chặn trình duyệt tự điền trước cho đến khi người dùng chủ động nhấn vào ô nhập.
  - Khi người dùng chưa đăng nhập thao tác mua hàng, chốt cấu hình, tạo phiếu bảo hành hoặc mở trang cá nhân, hiển thị hộp thoại Studio Bento **`#auth-required-modal` ("Vui Lòng Đăng Nhập")** thay thế hoàn toàn `window.alert()`, tự động lưu `redirectUrl` để tiếp tục luồng sau khi xác thực.
  - Sau khi khách hàng (`CUSTOMER`) đăng nhập thành công, hệ thống điều hướng thẳng tới trang thương mại **`/hardware`** thiết kế theo chuẩn bán lẻ điện máy hiện đại (Top Deal Strip, Dual Spotlight Promo Banners, lưới 9 ô *"Danh mục nổi bật"*, bộ lọc Hãng & Giá, huy hiệu giảm giá `-%` / `Trả góp 0%`).
  - Khi bấm **Đăng Xuất**, không hiển thị hộp thoại chặn giữa màn hình: hệ thống xóa phiên cục bộ, điều hướng ra trang chủ tức thì (`0ms` UI wait), đồng thời gửi yêu cầu thu hồi JWT (`keepalive: true`) ngầm dưới nền và hiển thị thông báo viên nang ngắn gọn ở cạnh dưới.
