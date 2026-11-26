# CyberRig — System Architecture & Technical Specification

Tài liệu đặc tả kiến trúc tổng thể, phân tách miền nghiệp vụ (Modular DDD), tích hợp hệ thống đa kênh SE445 và quy ước kỹ thuật của dự án **CyberRig**.

---

## 1. Tổng Quan Kiến Trúc (Architecture Overview)

```
src/
├── core/                       # Hạ tầng lõi (PostgreSQL, Redis Lua, EventBus Outbox/DLQ, Security, Tracing)
├── modules/                    # Các miền nghiệp vụ độc lập (SRP <= 300 dòng/tệp)
│   ├── auth/                   # Định danh RBAC 3 vai trò, JWT HttpOnly Rotation, 2FA TOTP, Brute-force Lock
│   ├── hardware/               # Danh mục 8 nhóm linh kiện, lọc đa tiêu chí & kho hàng (In-Memory Fallback)
│   ├── compatibility/          # Rule Engine 4 quy tắc (Socket, RAM, Clearance, Power +25%)
│   ├── orders/                 # Đặt hàng VietQR HMAC, Canonical Order Adapter & 3 Event Subscribers
│   ├── repair-tickets/         # Vòng đời bảo hành FSM 8 trạng thái & Báo giá chẩn đoán 2 chiều
│   ├── customer/               # Cổng quản lý đơn hàng & phiếu bảo hành cá nhân
│   ├── admin/                  # Quản trị kho & Trình cào dữ liệu giá linh kiện đa nguồn (SSE Price Bell)
│   └── monitoring/             # SI Studio Telemetry SSE, 6 Scenarios Lab, AI POS Mapper & CEO Analytics
└── ui/                         # Các thành phần giao diện React/TypeScript kiểm thử độc lập
```

---

## 2. Kiến Trúc Tích Hợp SE445 & Trình Cào Giá Linh Kiện

1. **Distributed Tracing & Gateway (`X-Correlation-ID`)**: Nginx (`nginx/nginx.conf`) và Kong (`CyberRig-Infra/kong/kong.yml`) gắn mã vết xuyên suốt HTTP → Express (`correlation.middleware.ts`) → `EventEnvelope`.
2. **Canonical Order Adapter & Dual-Mode EventBus**: `order.adapter.ts` chuẩn hóa đơn hàng dị thể (Web, Partner B2B, Legacy ERP, AI POS); `event-bus.ts` phân phối qua Topic Exchange `cyberrig.orders`, hỗ trợ Idempotency, Retry 3x → `cyberrig.orders.dlq` (1-click Replay) và Outbox `503 PENDING_RETRY`.
3. **AI POS Data Mapper & Nghị định 13/2023/NĐ-CP**: `maskRawTextPii` che SĐT/Email trong văn bản POS thô trước khi lưu cache hoặc gửi tới mô hình AI chuẩn hóa SKU.
4. **Multi-Source Hardware Crawler**: `hardware-crawler.service.ts` quét bảng giá nhà phân phối (ASUS, MSI, GearVN, URL JSON/JSON-LD chống SSRF), quản lý hàng đợi duyệt 1-click / Auto-Apply và phát cảnh báo đẩy SSE (`crawler:alert`).

---

## 3. Quy Ước Kỹ Thuật & Kiểm Thử

- **Clean Code & SRP**: Phân tách rõ Controller – Service – Repository – Adapter; sử dụng mã lỗi miền chuẩn hóa (`DOMAIN_ERROR_CODE`).
- **Kiểm thử tự động**: Thực thi `npm test` (`scripts/run-tests.mjs`) bao phủ **27 file `*.spec.ts` (29 suites / 186 test cases)** và cổng bảo mật 4-job trên GitHub Actions (`.github/workflows/security-scan.yml`).
