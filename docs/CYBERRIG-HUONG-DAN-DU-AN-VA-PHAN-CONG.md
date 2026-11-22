# TÀI LIỆU DỰ ÁN CYBERRIG: TỔNG QUAN, ĐẶC TẢ USE-CASE VÀ KẾ HOẠCH PHÂN CÔNG NHÓM

> **Hệ thống**: CyberRig Ecosystem  
> **Mô hình**: Agile / Scrum kết hợp Vòng đời Tác tử ADLC (Agentic Development Life Cycle)  
> **Thời gian dự án**: 11.5 Tuần (3 Sprint nghiệp vụ chính 2.5 tháng + 1 Hardening Sprint — tổng 4 Sprint)  
> **Tổng khối lượng**: 182 Story Points (10 Epics • 37 User Stories • 44 Sub-tasks — Jira Key: `SCRUM`)  
> **Mục đích**: Tài liệu bàn giao nhóm, làm rõ bài toán, hướng dẫn vẽ sơ đồ Use-Case và phân công chi tiết công việc.

---

## 📌 BẢNG TỔNG QUAN THÔNG TIN DỰ ÁN

| Thuộc tính | Chi tiết định nghĩa |
| :--- | :--- |
| **Tên dự án** | **CyberRig** - Hệ sinh thái Bán lẻ Phần cứng PC, Bộ Lắp Ráp PC Tương Thích & Quản Lý Vòng Đời Bảo Hành / Sửa Chữa |
| **Mô hình quản trị** | Scrum 4 Sprint (Jira `SCRUM`, 182 SP) + ADLC (Agentic Development Life Cycle) + DevSecOps CI/CD 4-Job |
| **Công nghệ Frontend** | React 19, TypeScript, Vanilla CSS, Thiết kế công nghiệp Cyberpunk, Dual-Theme (Day/Night) |
| **Công nghệ Backend** | Node.js (v20+), Express 5, TypeScript, Modular Architecture (Domain-Driven Design) |
| **Cơ sở dữ liệu & Cache**| PostgreSQL 16 (Relational DB), Redis 7 Alpine (Atomic Stock Reservation qua Lua Script) |
| **Hạ tầng & Vận hành** | Docker Compose 4 containers (`postgres`, `redis`, `app`, `nginx`), Nginx Gateway, Server-Sent Events (SSE) |
| **Giám sát & Testing** | In-Memory Telemetry Ring Buffer (Zero-DB Overhead), Dead Letter Queue (DLQ), 6 Kịch bản Testing Lab |

---

# PHẦN 1: TỔNG QUAN HỆ SINH THÁI CYBERRIG

CyberRig là nền tảng công nghệ toàn diện giải quyết trọn vẹn chuỗi giá trị máy tính chuyên nghiệp, kết hợp giữa bán lẻ linh kiện, lắp ráp cấu hình tương thích thời gian thực, quản lý bảo hành theo quy trình khép kín và hệ thống giám sát vận hành SOC Mission Control.

### 1.1. Ba Trụ Cột Nghiệp Vụ Cốt Lõi
1. **PC Hardware Retail & Inventory Control**:
   - Quản lý danh mục 8 loại linh kiện phần cứng chính (CPU, Mainboard, RAM, GPU, Nguồn PSU, Case, Storage, Cooling).
   - Bộ lọc đa tiêu chí (danh mục, khoảng giá, thương hiệu Intel/AMD/ASUS/MSI/Corsair, tình trạng kho).
   - Quản trị kho Admin: nhập bổ sung, ngừng kinh doanh (Soft Delete), bảo vệ giá vốn và cảnh báo sắp hết hàng.
2. **Intelligent PC Compatibility Builder**:
   - Bộ lắp ráp cấu hình PC thông minh với 8 khoang phần cứng.
   - **Rule Engine thẩm định tương thích thời gian thực (4 Rules độc lập)**:
     - *SocketRule*: Bắt xung đột chân cắm CPU và Bo Mạch Chủ (AM5 vs LGA1700).
     - *RamRule*: Kiểm tra khớp chuẩn DDR4/DDR5 và số thanh RAM vật lý không vượt quá số khe cắm của Bo Mạch Chủ.
     - *ClearanceRule*: Kiểm tra kích thước chiều dài GPU (kèm 10mm đệm an toàn) và chiều cao tản nhiệt khí so với vỏ Case.
     - *PowerRule & TDP*: Tính tổng công suất tiêu thụ điện ($TDP_{CPU} + TDP_{GPU} + 100W$), khuyến nghị bộ nguồn PSU có biên an toàn $\ge 25\%$.
   - Thanh tiến trình tương thích trực quan (0% - 100%), cảnh báo xung đột tức thì và các bộ Preset cấu hình mẫu theo ngân sách.
3. **Repair & Warranty Lifecycle Tracking**:
   - Vòng đời phiếu bảo hành bất biến kiểm soát bởi **Finite State Machine 8 trạng thái**:  
     `RECEIVED` $\rightarrow$ `DIAGNOSING` $\rightarrow$ `QUOTED` $\rightarrow$ `WAITING_CUSTOMER` $\rightarrow$ `REPAIRING` $\rightarrow$ `TESTING_QC` $\rightarrow$ `COMPLETED` / `CANCELLED`.
   - Cổng tra cứu tiến độ sửa chữa công khai (`/repair-tracking`) với dòng thời gian chi tiết.
   - **Phê duyệt báo giá 2 chiều trực tuyến**: Khách hàng trực tiếp bấm `[ ĐỒNG Ý SỬA CHỮA ]` (chuyển sang `REPAIRING`) hoặc `[ TỪ CHỐI ]` (chuyển sang `CANCELLED`) trên trang tra cứu.
4. **SI Monitoring Mission Control & Testing Lab**:
   - Bảng điều khiển giám sát phong cách Dark SOC Dual-Mode (`/admin-monitoring/`).
   - *Tab 1 (Real-Time Monitoring)*: Thu thập chỉ số tài nguyên và sức khỏe 4 container Docker qua In-Memory Telemetry Ring Buffer (Zero-DB Overhead) truyền trực tiếp qua Server-Sent Events (SSE); Dead Letter Queue (DLQ) bắt giữ Poison Message kèm nút Replay phát lại.
   - *Tab 2 (Scenario Testing Lab)*: Phòng Lab thực thi tự động 6 kịch bản kiểm thử tích hợp (Order Pipeline, Stock Check, Trigger DLQ, AI Data Mapping, Rate Limiting, Health Diagnostics).

---

# PHẦN 2: MÔ HÌNH VÒNG ĐỜI ADLC & CHUỖI TẠO TÁC KIỂM TOÁN

Dự án áp dụng mô hình chuyển đổi từ **SDLC truyền thống** sang **ADLC (Agentic Development Life Cycle)** có sự cộng tác trực tiếp giữa thành viên nhóm và Tác tử AI (AI Agents).

```
intent.md ➔ spec.md ➔ plan.md ➔ code + tests ➔ review record ➔ production signal
(Mục tiêu)    (Đặc tả)   (Kế hoạch)    (Mã nguồn)       (Nghiệm thu)      (Giám sát SOC)
```

![So sánh Vòng đời Phát triển Phần mềm: SDLC vs ADLC](file:///d:/Project/cyberig/docs/diagrams/diagram_adlc.png)

![Chuỗi Tạo Tác Kiểm Toán Xuyên Suốt trong ADLC](file:///d:/Project/cyberig/docs/diagrams/diagram_artifacts.png)

### 6 Giai Đoạn Vận Hành Trong ADLC:
1. **Lập Kế Hoạch (Planning)**: Mô tả mục tiêu trong `intent.md`, đủ rõ ràng để con người hiểu và AI Agent có thể thực thi ngay từ commit đầu tiên mà không qua nhiều vòng họp kéo dài.
2. **Thiết Kế (Design)**: Yêu cầu và thiết kế kiến trúc được xử lý trong cùng một phiên; chính sách nghiệp vụ đóng gói thành các Kỹ năng (`.skills/`) để định hướng Agent.
3. **Phát Triển (Development)**: Tri thức tổ chức được chuẩn hóa trong `.agentrules`; các nguyên tắc Clean Code và SRP được kiểm soát tự động.
4. **Kiểm Thử (Testing)**: Đánh giá liên tục qua test suites (`npm test`, `monitoring.spec.ts`) tại mỗi phiên làm việc thay vì kiểm thử dồn ở cuối giai đoạn.
5. **Triển Khai (Deployment)**: Agent rà soát theo quy tắc quản trị đóng gói trong Docker Compose và Nginx; con người phê duyệt các thay đổi có mức độ rủi ro cao.
6. **Vận Hành & Bảo Trì (Operations)**: Cảnh báo từ SI Monitoring và Dead Letter Queue tự động hình thành yêu cầu mới đưa trở lại quy trình mà không cần chờ con người khởi tạo.

---

# PHẦN 3: HƯỚNG DẪN VẼ SƠ ĐỒ USE-CASE CHO CÁC THÀNH VIÊN

Phần này cung cấp căn cứ chuẩn xác để các thành viên tiến hành vẽ sơ đồ Use-Case (bằng StarUML, Draw.io, PlantUML hoặc Visual Paradigm).

![Sơ Đồ Use-Case Tổng Thể Toàn Hệ Thống CyberRig](file:///d:/Project/cyberig/docs/diagrams/diagram_usecase_master.png)

### 3.1. Danh Sách Tác Nhân Hệ Thống (5 Tác Nhân Người Dùng & 1 Hệ Thống Ngoài)
1. **Khách Vãng Lai (Guest)**: Người dùng chưa đăng nhập. Xem catalog, sử dụng PC Builder, đặt hàng và quét mã VietQR, tra cứu đơn hàng/phiếu bảo hành (áp dụng Anti-IDOR, Rate Limit & PII Masking) và duyệt báo giá trực tuyến.
2. **Khách Hàng (Customer)**: Người dùng có tài khoản đã đăng nhập (`CUSTOMER`, hỗ trợ 2FA TOTP). Kế thừa toàn bộ quyền của Guest; có thêm Customer Unified Hub (`#dashboard`) quản lý dàn máy cá nhân, lịch sử đơn hàng và thiết bị gửi sửa chữa.
3. **Kỹ Thuật Viên (Technician)**: Nhân sự phòng Lab (`TECHNICIAN`). Tiếp nhận máy tại quầy (thiết bị mua tại cửa hàng hoặc ngoài), soạn biên bản chẩn đoán, lập bảng báo giá linh kiện + công thợ, cập nhật trạng thái phiếu bảo hành theo State Machine.
4. **Quản Trị Viên (Admin)**: Quản lý cửa hàng và hệ thống (`ADMIN`). Quản lý danh mục linh kiện (CRUD), nhập kho bổ sung (Restock), soft-delete, quản trị RBAC/JWT/2FA TOTP, xem Audit Logs, vận hành SOC/Testing Lab/DLQ và theo dõi KPI tồn kho an toàn.
5. **Kỹ Sư DevOps / QA (System Operator — Quyền `ADMIN`)**: Giám sát SOC thời gian thực (SSE Ticket & Audit Logs), quản lý và phát lại thông điệp lỗi trong Dead Letter Queue (DLQ), kích hoạt 6 kịch bản kiểm thử tích hợp tại Testing Lab.
6. **Cổng Thanh Toán VietQR (`«system»` Webhook HMAC-SHA256)**: Tác nhân hệ thống ngoài gửi tín hiệu xác nhận giao dịch có chữ ký `HMAC-SHA256` (`X-CyberRig-Signature`) tới `POST /api/orders/:id/confirm` để chuyển trạng thái đơn hàng sang `PAID`.

---

### 3.2. Bảng Danh Mục 20 Use Cases Cần Vẽ Sơ Đồ (Chia Theo 5 Packages)

| Mã UC | Tên Use Case | Thuộc Package | Tác Nhân Thực Hiện | Mức Ưu Tiên |
| :---: | :--- | :--- | :--- | :---: |
| **UC-01** | Tra cứu danh mục & bộ lọc linh kiện đa tiêu chí | Package 1: Hardware & Builder | Guest, Customer | Must |
| **UC-02** | Xem chi tiết thông số kỹ thuật phần cứng | Package 1: Hardware & Builder | Guest, Customer | Must |
| **UC-03** | Chọn cấu hình mẫu định sẵn (Preset Tiers) | Package 1: Hardware & Builder | Guest, Customer | Should |
| **UC-04** | Tự phối linh kiện & Thẩm định tương thích Socket/TDP | Package 1: Hardware & Builder | Guest, Customer | Must |
| **UC-05** | Xem danh mục PC Setup & Thiết bị không gian làm việc | Package 1: Hardware & Builder | Guest, Customer | Should |
| **UC-06** | Chuyển giỏ hàng cấu hình sang Checkout Split-View | Package 2: Checkout & Orders | Guest, Customer | Must |
| **UC-07** | Đặt hàng & Thanh toán VietQR Napas 247 (Xác thực Webhook HMAC) | Package 2: Checkout & Orders | Guest, Customer, VietQR Webhook | Must |
| **UC-08** | Tra cứu trạng thái đơn hàng theo mã (Anti-IDOR & PII Masking) | Package 2: Checkout & Orders | Guest, Customer | Should |
| **UC-09** | Tra cứu tiến độ phiếu bảo hành 6 chặng (Rate Limit & PII Masking) | Package 3: Repair & Warranty | Guest, Customer | Must |
| **UC-10** | Khách hàng duyệt hoặc từ chối báo giá sửa chữa 2 chiều | Package 3: Repair & Warranty | Guest, Customer | Must |
| **UC-11** | Tiếp nhận thiết bị sửa chữa tại quầy Lab | Package 3: Repair & Warranty | Technician | Must |
| **UC-12** | Soạn biên bản chẩn đoán & Lập báo giá vật tư Lab | Package 3: Repair & Warranty | Technician | Must |
| **UC-13** | Cập nhật chuyển trạng thái phiếu qua State Machine | Package 3: Repair & Warranty | Technician | Must |
| **UC-14** | Quản lý dàn máy & Lịch sử mua hàng cá nhân | Package 4: Portals & Hubs | Customer | Should |
| **UC-15** | Quản lý hàng đợi sửa chữa theo trạng thái (Workbench) | Package 4: Portals & Hubs | Technician | Must |
| **UC-16** | Quản trị kho hàng, nhập bổ sung & Cảnh báo tồn kho | Package 5: Admin & SOC | Admin | Must |
| **UC-17** | Xác thực JWT (`HttpOnly` Rotation), 2FA TOTP & Phân quyền RBAC | Package 5: Admin & SOC | Admin, System | Must |
| **UC-18** | Giám sát SOC Real-time SSE (Ticket) & Nhật ký Audit Logs | Package 5: Admin & SOC | Admin, DevOps/QA | Must |
| **UC-19** | Kích hoạt 6 kịch bản kiểm thử tích hợp tự động | Package 5: Admin & SOC | Admin, DevOps/QA | Must |
| **UC-20** | Phân tích, cô lập & Phát lại (Replay) thông điệp lỗi DLQ | Package 5: Admin & SOC | Admin, DevOps/QA | Must |

---

### 3.3. Đặc Tả Kịch Bản Chi Tiết Cho 3 Use Case Trọng Yếu

#### Đặc tả UC-04: Tự Phối Linh Kiện & Thẩm Định Tương Thích (PC Builder)
- **Tiền điều kiện**: Hệ thống đã nạp đầy đủ danh mục linh kiện có structured specs.
- **Luồng chính (Main Flow)**:
  1. Người dùng truy cập trang `/builder`.
  2. Chọn khoang "CPU" (ví dụ: `AMD Ryzen 7 7800X3D` - Socket AM5).
  3. Hệ thống nạp CPU, tính toán TDP cơ sở, tăng thanh tương thích lên 12%.
  4. Người dùng chọn tiếp khoang "Bo Mạch Chủ".
  5. Rule Engine kiểm tra Socket: Trùng khớp AM5 $\rightarrow$ Xác nhận tương thích, cập nhật công suất khuyến nghị.
  6. Người dùng chọn tiếp RAM, Card đồ họa VGA, Ổ cứng SSD, Tản nhiệt, Nguồn PSU, Vỏ Case.
  7. Hệ thống tính tổng TDP, đối chiếu công suất nguồn PSU (đảm bảo biên an toàn $\ge 20\%$).
  8. Cấu hình đủ 8 linh kiện và không xung đột $\rightarrow$ Thanh tương thích đạt 100%, nút `[ TIẾN HÀNH MUA CẤU HÌNH ]` được kích hoạt.
- **Luồng ngoại lệ (Alternative Flow)**:
  - *4a. Xung đột chân cắm Socket*: Chọn Bo Mạch Chủ LGA1700 $\rightarrow$ Cảnh báo đỏ `XUNG ĐỘT PHẦN CỨNG: Socket AM5 không tương thích Bo mạch chủ LGA1700`, hạ thanh tương thích, vô hiệu hóa nút mua.
  - *6a. Nguồn yếu không đủ tải*: Tổng TDP vượt quá công suất nguồn $\rightarrow$ Cảnh báo vàng `NGUỒN YẾU: Cần nâng cấp PSU tối thiểu 750W`.

#### Đặc tả UC-07: Đặt Hàng & Thanh Toán Bằng VietQR Napas 247 Động
- **Tiền điều kiện**: Cấu hình PC có ít nhất 1 linh kiện.
- **Luồng chính (Main Flow)**:
  1. Khách bấm `[ TIẾN HÀNH MUA CẤU HÌNH ]`, chuyển hướng sang `/checkout`.
  2. Điền thông tin người nhận, chọn phương thức thanh toán VietQR và bấm `[ XÁC NHẬN ĐẶT HÀNG ]`.
  3. Backend thực thi Redis Lua script khóa kho nguyên tử (TTL 15 phút), tạo Price Snapshot và sinh mã đơn hàng `ORD-XXXXXX`.
  4. Giao diện hiển thị khung mã VietQR động chứa số tài khoản, số tiền chính xác và cú pháp chuyển khoản bắt buộc `CYBERRIG ORD-XXXXXX` kèm đồng hồ đếm ngược 15:00.
  5. Khách hàng quét mã trên ứng dụng ngân hàng và hoàn tất chuyển khoản; Cổng thanh toán VietQR gửi Webhook có chữ ký `HMAC-SHA256` (`X-CyberRig-Signature`) tới `POST /api/orders/:id/confirm` để hệ thống xác thực và chuyển trạng thái sang `PAID`.

#### Đặc tả UC-10: Khách Hàng Duyệt Báo Giá Sửa Chữa 2 Chiều Trực Tuyến
- **Tiền điều kiện**: Phiếu bảo hành đang ở trạng thái `QUOTED` kèm báo giá vật tư và tiền công thợ.
- **Luồng chính (Main Flow)**:
  1. Khách hàng truy cập `/repair-tracking`, nhập mã phiếu (ví dụ: `TK-1001`).
  2. Hệ thống hiển thị Stepper 6 chặng (bước `QUOTED` sáng đèn) và bảng chi tiết chi phí thay thế.
  3. Khách hàng xem xét và bấm nút `[ ĐỒNG Ý SỬA CHỮA ]`.
  4. State Machine kiểm tra và chuyển trạng thái sang `REPAIRING`, ghi nhận nhật ký audit thời gian duyệt.
  5. Giao diện cập nhật tức thì: bước `REPAIRING` sáng đèn, hiển thị thông báo "Thiết bị đang được kỹ thuật viên sửa chữa".

---

# PHẦN 4: KẾ HOẠCH PHÁT TRIỂN 4 SPRINT (182 STORY POINTS)

Toàn bộ khối lượng phát triển & gia cố bảo mật gồm **182 Story Points** (10 Epics, 37 Stories, 44 Sub-tasks trên Jira `SCRUM`) được chia thành 4 Sprint kế tiếp nhau:

### 4.1. SPRINT 1 (Tuần 1 - Tuần 3.5 | 58 SP): Core Value Functional MVP
- **Mục tiêu**: Người dùng truy cập là có thể sử dụng ngay lập tức toàn bộ luồng nghiệp vụ tạo ra giá trị cốt lõi.
- **Phạm vi công việc**:
  - Tra cứu linh kiện (`/hardware`), lọc theo danh mục, giá, thương hiệu.
  - Lắp ráp PC (`/builder`), Rule Engine kiểm tra Socket CPU-Mainboard và TDP, thanh tiến trình tương thích.
  - Đặt hàng Checkout Split-View (`/checkout`), lưu Price Snapshot, sinh mã VietQR Napas 247 động.
  - Tra cứu tiến độ bảo hành (`/repair-tracking`) theo State Machine 6 chặng, duyệt báo giá 2 chiều trực tuyến.

![Sơ Đồ Tuần Tự Sprint 1](file:///d:/Project/cyberig/docs/diagrams/diagram_seq_sprint1.png)

### 4.2. SPRINT 2 (Tuần 3.5 - Tuần 7 | 38 SP): UI/UX Excellence & Trải Nghiệm Cao Cấp
- **Mục tiêu**: Nâng cấp vượt bậc phần nhìn và cảm giác tương tác đạt chuẩn Tech Industrial.
- **Phạm vi công việc**:
  - Chuẩn hóa Design System Cyberpunk: bo góc 0px, font kỹ thuật, viền HUD scanner.
  - Hệ thống **Dual-Theme (Day / Night Mode)**: Chuyển đổi mượt mà 60 FPS, chuẩn tương phản WCAG 2.1 AA.
  - Tích hợp bộ ảnh chụp Studio thực tế chất lượng cao cho 8 nhóm linh kiện, loại bỏ 100% placeholder.
  - Xây dựng trang PC Setup & Không gian làm việc (`/equipments`): 20 sản phẩm công thái học (Màn hình OLED, Bàn nâng hạ, Ghế Ergonomic).
  - Tối ưu hóa UI/UX Bàn làm việc Kỹ thuật viên (`#technician` Split-View) và Cổng thông tin khách hàng (`#dashboard`).
  - Phản hồi vi tương tác (Micro-interactions, âm thanh click, nút "+ Chọn" nhanh).

![Sơ Đồ Tuần Tự Sprint 2](file:///d:/Project/cyberig/docs/diagrams/diagram_seq_sprint2.png)

### 4.3. SPRINT 3 (Tuần 7 - Tuần 10.5 | 60 SP): Enterprise Core, Bảo Mật & SI Monitoring Lab
- **Mục tiêu**: Hoàn thiện toàn bộ hạ tầng chiều sâu, quản trị cấp cao, bảo mật và công cụ giám sát vận hành.
- **Phạm vi công việc**:
  - Bảo mật & Phân quyền RBAC 3 vai trò (`CUSTOMER`, `TECHNICIAN`, `ADMIN`), JWT token rotation, Route Guards.
  - Bộ đệm khóa tồn kho nguyên tử **Redis Atomic Stock Reservation** qua Lua script, triệt tiêu bán khống (Zero Oversell).
  - Cổng Quản trị kho hàng Admin Control Center (`#admin`): CRUD linh kiện, Restock, Soft Delete, Low Stock KPI Alerts.
  - Bảng điều khiển giám sát **SI Monitoring Dashboard Dual-Mode SOC** (`/admin-monitoring/`):
    - *Tab 1 (Real-Time)*: SSE Telemetry stream Docker metrics & Dead Letter Queue (DLQ) bắt Poison Message và nút Replay.
    - *Tab 2 (Testing Lab)*: Kích hoạt tự động 6 kịch bản kiểm thử tích hợp (Order, Stock, DLQ, AI Mapping, Rate Limit, Health).
  - Đóng gói cụm hạ tầng Docker Compose 4 containers (`postgres`, `redis`, `app`, `nginx`) và chuẩn hóa chuỗi tạo tác ADLC.

![Sơ Đồ Tuần Tự Sprint 3](file:///d:/Project/cyberig/docs/diagrams/diagram_seq_sprint3.png)

### 4.4. SPRINT 4 (Tuần 11 — Hardening | 26 SP): Security Hardening OWASP Top 10 & DevSecOps Release
- **Mục tiêu**: Hoàn tất 3 giai đoạn gia cố bảo mật theo chuẩn OWASP Top 10, tự động hóa cổng CI/CD DevSecOps 4-Job và đồng bộ toàn bộ hồ sơ UML/Scrum/Jira 5 thành viên.
- **Phạm vi công việc**:
  - Gia cố phiên & Token: `HttpOnly` Cookie Rotation + Reuse Detection, Redis `jti` Blacklist, Brute-Force Lockout.
  - Chống IDOR (`?phone=`), Che mờ PII (`pii-mask.util.ts`), Khóa RBAC `ADMIN` cho `/api/monitoring/*` & Single-use SSE Ticket (`/stream-ticket`).
  - Xác thực Webhook VietQR bằng chữ ký `HMAC-SHA256` (`X-CyberRig-Signature`, `X-CyberRig-Timestamp`) + chống Replay Attack.
  - Bảo mật 2 lớp MFA/2FA TOTP (RFC 6238) & Nhật ký Kiểm toán bất biến (`audit_logs`).
  - Pipeline DevSecOps 4-Job trên GitHub Actions (`.github/workflows/security-scan.yml`: TypeScript+173 Tests, Gitleaks, Semgrep OSS, Trivy CVE) & Đồng bộ Use Case v2.1 + Tài liệu dự án.

---

# PHẦN 5: MA TRẬN PHÂN CÔNG CÔNG VIỆC TRONG NHÓM (5 THÀNH VIÊN — RACI MATRIX)

| Thành Viên & Vai Trò | Nhiệm Vụ Vẽ Sơ Đồ Use-Case | Nhiệm Vụ Kỹ Thuật Chính | Phụ Trách Theo Sprint | Tỷ Lệ Đóng Góp |
| :--- | :--- | :--- | :---: | :---: |
| **Thành viên 1**<br>*(PO / Team Lead & FE E-Commerce)* | Vẽ **Sơ đồ Use-Case Tổng Thể (Master)**, Package 2 (`UC-06`, `UC-07`, `UC-08`) và Package 4 (`UC-14`). | Quản lý Product Backlog & Jira `SCRUM` (`My Software Team`, Board `1`), điều phối ADLC (`intent`, `spec`, `plan`), nghiệm thu Sprint Review; xây dựng `/checkout` Split-View, hiển thị VietQR Napas 247, Customer Hub (`#dashboard`) và bộ ảnh Studio 8 nhóm linh kiện. | Xuyên suốt Sprint 1, 2, 3, 4 | **20%** |
| **Thành viên 2**<br>*(Frontend Lead & Design System UI)* | Vẽ Sơ đồ Use-Case Package 1: Hardware & Builder (`UC-01` đến `UC-05`) và Package 4 (`UC-15`: Tech UI). | Xây dựng `/hardware`, `/builder`, thanh tiến trình tương thích, trang `/equipments` (20 thiết bị Setup), chuẩn hóa Design System v2.1 (0px, Dual-Theme Day/Night 60 FPS), Micro-interactions, Tech UI và đồng bộ Sơ đồ Use-Case v2.1 + Security Architecture. | Sprint 1, 2 & Sprint 4 (UML) | **20%** |
| **Thành viên 3**<br>*(Backend Core Domain & Repair Lab)* | Vẽ Sơ đồ Use-Case Package 3: Repair & Warranty (`UC-09` đến `UC-13`). | Xây dựng 4 Compatibility Rules (Socket, RAM, Clearance, Power +25%), State Machine 8 trạng thái bảo hành, Diagnostics Quotation duyệt báo giá 2 chiều, Redis Atomic Stock Reservation (Lua Script chống bán âm) và bảng `audit_logs` PostgreSQL. | Sprint 1, 3 & Sprint 4 (Audit DB) | **20%** |
| **Thành viên 4**<br>*(Backend Security, DB & Admin Hub)* | Vẽ Sơ đồ Use-Case Package 5 (Quản trị & Bảo mật): `UC-16`, `UC-17`. | Thiết kế PostgreSQL 16 Schema (`seed.ts`, `audit_logs`), In-Memory Fallback; xây dựng Admin Control Center (`#admin`); triển khai gia cố bảo mật OWASP 3 giai đoạn (RBAC JWT `HttpOnly` Rotation, 2FA TOTP, Webhook HMAC-SHA256, Anti-IDOR, PII Masking). | Sprint 1, 3 & Sprint 4 (Hardening) | **20%** |
| **Thành viên 5**<br>*(DevOps, SI Monitoring & QA Automation)* | Vẽ Sơ đồ Use-Case Package 5 (Giám sát SOC): `UC-18`, `UC-19`, `UC-20`. | Xây dựng Dark SOC (`/admin-monitoring/`), Telemetry SSE (Single-use Ticket), Audit Logs Viewer, DLQ Replay, 6 kịch bản Testing Lab; đóng gói Docker Compose 4 containers, Nginx Hardening, bộ 24 Spec Tests (173 tests) và Pipeline GitHub Actions DevSecOps 4 jobs. | Sprint 1, 2 (QA), 3 & Sprint 4 (DevSecOps) | **20%** |

---

### Tiêu Chuẩn Tiếp Nhận & Nghiệm Thu Công Việc (DoR & DoD)

- **Definition of Ready (DoR) - Trước khi bắt đầu làm**:
  - Đã có User Story chuẩn: *"Là một [User], tôi muốn [Tính năng], để [Mục đích]"*.
  - Đã có tiêu chí chấp nhận viết dưới định dạng **Given - When - Then (Gherkin)**.
  - Đã ước lượng điểm Story Points (Fibonacci $\le 8$ SP).
  - Đã vẽ xong sơ đồ Use-Case tương ứng và xác định rõ API/Components liên quan.
- **Definition of Done (DoD) - Trước khi hoàn tất task**:
  - Mã nguồn tuân thủ Clean Code & Single Responsibility Principle (SRP).
  - 100% TypeScript Strict Mode, lệnh `npx tsc --noEmit` hoàn thành với mã thoát 0.
  - Toàn bộ kiểm thử tự động vượt qua (`npm test`).
  - Giao diện đúng chuẩn Design System Cyberpunk (bo góc 0px, Dual-Theme đạt chuẩn WCAG AA).
  - Được xác thực trực tiếp trên trình duyệt hoặc cụm container Docker.
