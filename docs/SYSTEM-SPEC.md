# CyberRig - System Architecture & Technical Specification

Tài liệu này mô tả kiến trúc tổng thể, mô hình phân chia module (Domain-Driven Design), và các nguyên tắc kỹ thuật của dự án CyberRig.

---

## 1. Tổng Quan Kiến Trúc (Architecture Overview)

CyberRig được tổ chức theo cấu trúc **Modular / Domain-Driven Architecture** nhằm đảm bảo tính độc lập, dễ mở rộng và kiểm thử cho từng nghiệp vụ cốt lõi:

```
src/
├── core/                       # Cơ sở hạ tầng dùng chung (Database, Config, Logger, Middleware)
├── modules/                    # Các domain nghiệp vụ biệt lập
│   ├── hardware/               # Quản lý danh mục, thông số kỹ thuật & kho linh kiện
│   ├── compatibility/          # Engine thẩm định tương thích phần cứng máy tính
│   ├── repair-tickets/         # Quy trình tiếp nhận, chẩn đoán, sửa chữa & bảo hành
│   └── orders/                 # Quản lý đơn hàng linh kiện & cấu hình PC hoàn chỉnh
└── ui/                         # Tầng giao diện người dùng (Components, Layouts, Pages)
```

---

## 2. Các Phân Hệ Nghiệp Vụ (Core Domains)

### 2.1. Hardware Domain (`src/modules/hardware`)
- **Trách nhiệm**: Quản lý chi tiết danh mục linh kiện (CPU, GPU, Motherboard, RAM, PSU, Case, Storage, Cooling).
- **Đặc trưng**: Mỗi linh kiện sở hữu tập thông số kỹ thuật định dạng chuẩn (Structured Specs) phục vụ cho việc tính toán tương thích.

### 2.2. Compatibility Domain (`src/modules/compatibility`)
- **Trách nhiệm**: Đóng gói quy tắc và thuật toán kiểm tra tính tương thích giữa các linh kiện trong một cấu hình PC Builder.
- **Quy tắc hạt nhân (Rule Engine)**:
  - `SocketRule`: Khớp socket CPU và Mainboard.
  - `MemoryRule`: Khớp chuẩn DDR, số khe cắm, dung lượng tối đa.
  - `PowerRule`: Tính tổng công suất tiêu thụ và khuyến nghị nguồn PSU.
  - `DimensionRule`: Kiểm tra kích thước chiều dài VGA, chiều cao tản nhiệt so với giới hạn của Case.

### 2.3. Repair & Warranty Domain (`src/modules/repair-tickets`)
- **Trách nhiệm**: Quản lý vòng đời sửa chữa thiết bị khách gửi, kiểm tra tình trạng bảo hành theo Serial Number (SN), lưu vết lịch sử sửa chữa và phụ tùng thay thế.

### 2.4. Orders Domain (`src/modules/orders`)
- **Trách nhiệm**: Xử lý giỏ hàng, đặt hàng cấu hình build PC, thanh toán và xuất hóa đơn bán lẻ.

---

## 3. Quy Ước Kỹ Thuật (Engineering Conventions)
- **Strict Typing**: Mọi module phải định nghĩa Interface/Type cho Entity, DTO (Data Transfer Object) và Response.
- **Dependency Inversion**: Service không phụ thuộc trực tiếp vào framework HTTP cụ thể, cho phép dễ dàng chuyển đổi hoặc viết unit test.
- **Error Handling**: Sử dụng mã lỗi chuẩn hóa (`DOMAIN_ERROR_CODE`) để phía client xử lý giao diện linh hoạt.
