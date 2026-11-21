---
name: clean-code
description: Enforces Clean Code, Single Responsibility Principle (SRP), modular domain separation, and Monorepo folder organization for CyberRig. Activate when refactoring code, splitting bloated services, organizing folder structures, or reviewing architectural boundaries.
---

# Clean Code & Architectural Standards for CyberRig

Tài liệu quy chuẩn kỹ thuật định hướng việc viết mã nguồn sạch (Clean Code), thiết kế phân tầng (Layered Architecture), tuân thủ nguyên tắc đơn trách nhiệm (Single Responsibility Principle - SRP) và tổ chức cấu trúc thư mục Monorepo cho toàn bộ hệ sinh thái CyberRig.

---

## 1. Nguyên Tắc Cốt Lõi (Core Principles)

### 1.1. Single Responsibility Principle (SRP)
- Mỗi tệp tin (File), lớp (Class) hoặc hàm (Function) chỉ đảm nhận **một trách nhiệm duy nhất**.
- **Quy tắc độ dài tệp tin (File Length Limit)**: Không để bất kỳ file mã nguồn nào vượt quá **300 dòng**. Nếu một file phình to, bắt buộc phải phân rã thành các module chuyên biệt:
  - **Tách Data Fixtures / Seed / Mock**: Đưa vào thư mục `fixtures/` hoặc `seeds/`, không nhúng mảng JSON hàng trăm dòng trực tiếp vào Service.
  - **Tách Validation Rules**: Tách các hàm kiểm tra hợp lệ thành `*.validator.ts` hoặc `*.rules.ts`.
  - **Tách Helpers / Utilities**: Đưa các hàm phụ trợ tính toán vào `*.util.ts`.

### 1.2. Phân Tách Tầng Trách Nhiệm (Layered Domain Boundaries)
- **Model (`*.model.ts`)**: Chỉ chứa TypeScript interfaces, types, enums, DTOs (Data Transfer Objects). Tuyệt đối không chứa logic nghiệp vụ hay truy vấn SQL/Redis.
- **Service (`*.service.ts`)**: Trọng tâm xử lý Business Logic, phối hợp giữa các Repository, Transaction, phát sinh sự kiện (Events). Không xử lý HTTP Request/Response (Req, Res).
- **Controller (`*.controller.ts`)**: Nhận HTTP request, kiểm tra đầu vào cơ bản (Param/Body extraction), gọi Service tương ứng, định dạng và trả về HTTP response với mã trạng thái chuẩn.
- **Routes (`*.routes.ts`)**: Khai báo URI endpoint, gắn kết middleware xác thực/phân quyền (Auth/Role Guards) và định tuyến tới Controller methods.

---

## 2. Tiêu Chuẩn Cấu Trúc Thư Mục Monorepo (Folder Organization)

Khi tổ chức hoặc tái cấu trúc thư mục dự án CyberRig thành cấu trúc phân tầng doanh nghiệp:

```text
CYBERRIG-ECOSYSTEM/
├── .agents/                        # AI Skills & Context Rules
│   └── skills/
│       ├── clean-code/SKILL.md     # Quy chuẩn Clean Code & Kiến trúc
│       └── ...
├── docs/                           # Tài liệu kỹ thuật, Scrum, System Spec
├── certs/                          # Chứng chỉ SSL/TLS
│
├── CyberRig-Backend/               # Tầng xử lý logic nghiệp vụ, Database & APIs
│   ├── src/
│   │   ├── core/                   # Hạ tầng cốt lõi: DB Pool, Redis Lua, EventBus, Config
│   │   └── modules/                # Các domain nghiệp vụ độc lập
│   │       ├── auth/               # Xác thực, JWT, RBAC Guards
│   │       ├── hardware/           # Quản lý linh kiện, kho hàng
│   │       ├── compatibility/      # Thuật toán Socket & TDP
│   │       ├── tickets/            # Vòng đời bảo hành 6 trạng thái
│   │       ├── orders/             # Đơn hàng, VietQR, Stock lock
│   │       └── monitoring/         # Telemetry, DLQ Inspector, Scenario Lab
│   ├── Dockerfile
│   └── package.json
│
├── CyberRig-Frontend/              # Ứng dụng Web dành cho Khách Hàng (Customer Portal)
│   ├── public/                     # Static assets, media, fonts
│   ├── src/
│   │   ├── pages/                  # Home, PC Builder, Catalog, Checkout, Tra cứu bảo hành
│   │   ├── components/             # Reusable UI components (Navbar, Modals, Cards)
│   │   ├── styles/                 # Cyberpunk Design System, theme.css, tokens
│   │   └── services/               # API Client gọi về Backend
│   └── index.html
│
├── CyberRig-Admin/                 # Phân hệ Quản trị & Kỹ thuật viên (Admin & Technician Hub)
│   ├── src/
│   │   ├── business-ops/           # Quản trị kho hàng, duyệt báo giá, tiếp nhận máy Lab
│   │   └── si-monitoring/          # SI Monitoring Dashboard (SOC Dual-Mode, DLQ, Test Lab)
│   │       ├── telemetry/          # Widget sức khỏe Container, RabbitMQ throughput
│   │       ├── scenario-lab/       # Trình kích hoạt 6 kịch bản kiểm thử
│   │       └── terminal/           # Live Event Stream qua SSE
│   └── index.html
│
└── CyberRig-Infra/                 # Hạ tầng vận hành & Điều phối Gateway
    ├── nginx/
    │   ├── nginx.conf              # Reverse proxy định tuyến: / -> Frontend, /admin -> Admin, /api -> Backend
    │   └── conf.d/
    ├── docker-compose.prod.yml     # PostgreSQL, Redis, Backend App, Nginx Gateway
    └── docker-compose.dev.yml
```

---

## 3. Quy Tắc Bất Biến Về Bảo Mật & Điều Hướng (Security & Routing Rules)

1. **Single-Origin Gateway (Nginx Reverse Proxy)**:
   - Toàn bộ lưu lượng đi qua cổng 80/443 của Nginx Gateway.
   - Nginx điều phối:
     - `/api/*` -> Backend Container (`cyberrig_app_prod:3000`).
     - `/admin-monitoring/*` và `/admin/*` -> Admin Portal.
     - `/*` -> Storefront Khách hàng.
   - **Lợi ích**: Không gặp lỗi CORS, chia sẻ an toàn JWT/Cookie cùng domain, không phải public các port nội bộ ra ngoài Internet.

2. **Zero Admin Code in Storefront (Cách ly bề mặt tấn công)**:
   - Bundle JavaScript của người dùng mua sắm (`CyberRig-Frontend`) **tuyệt đối không chứa** mã nguồn, routes hay components của Admin Hub và SI Monitoring Lab.
   - Bất kỳ cố gắng đảo ngược mã (reverse engineering) mã nguồn frontend của khách hàng cũng không thể tìm ra cấu trúc nội bộ của trung tâm chỉ huy Quản trị.

---

## 4. Checklist Thực Hiện Khi Refactor Mã Nguồn (Refactor Checklist)

Trước khi đánh dấu hoàn thành bất kỳ tác vụ tái cấu trúc nào:
- [ ] File mới hoặc file sửa đổi có vượt quá 300 dòng không? Nếu có, đã tách fixtures/rules chưa?
- [ ] Có vi phạm nguyên tắc SRP không? Controller có đang xử lý SQL trực tiếp không?
- [ ] Đã kiểm tra Type Safety với `npx tsc --noEmit` (thoát mã 0) chưa?
- [ ] Toàn bộ bộ kiểm thử tự động `npm test` có vượt qua 100% không?
- [ ] Các đường dẫn tương đối (`import ... from '...'`) có bị gãy sau khi đổi thư mục không?
- [ ] Đường dẫn cấu hình Nginx Gateway và Dockerfile có phản ánh đúng thư mục mới không?
