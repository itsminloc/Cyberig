# BÁO CÁO PHÂN TÍCH KHOẢNG CÁCH (GAP ANALYSIS)
## ĐỐI CHIẾU TÀI LIỆU ĐẶC TẢ v2.4.0 VỚI CODEBASE THỰC TẾ HỆ THỐNG CYBERRIG

> **Hệ thống**: CyberRig Ecosystem (CR-2026-ENT)  
> **Thời điểm kiểm toán**: Tháng 11/2026  
> **Tài liệu đối chiếu**: `CYBERRIG - TÀI LIỆU YÊU CẦU PHẦN MỀM & THIẾT KẾ HỆ THỐNG (v2.4.0-RELEASE)`  
> **Đối tượng rà soát**: Toàn bộ codebase (PostgreSQL schema, Redis Lock, Express 5 backend modules, React 19 frontend/admin packages, Docker & Nginx Gateway)

---

## 1. TỔNG QUAN KẾT QUẢ ĐỐI CHIẾU

Quá trình quét tự động và đối chiếu chi tiết giữa tài liệu đặc tả v2.4.0 và mã nguồn thực tế ghi nhận:
- **Mức độ tương thích tổng thể (Overall Alignment)**: **86%**
- **Điểm khớp hoàn toàn (Matched & Verified)**: Tầm nhìn 4 trụ cột nghiệp vụ, mô hình chuyển đổi ADLC, 5 tác nhân hệ thống (Guest, Customer, Tech, Admin, DevOps), quy trình VietQR động, và kiến trúc In-Memory Telemetry SSE.
- **Điểm sai lệch kỹ thuật (Discrepancies / Outdated)**: 6 điểm trọng yếu (Thư viện UI/State, Số lượng Rule kiểm tra tương thích, Công thức Margin nguồn, Số trạng thái FSM bảo hành, 6 kịch bản Test Lab thực tế, và Kiến trúc đóng gói Gateway).
- **Tính năng mã nguồn vượt trội chưa có trong tài liệu (Missing Specs in Docs)**: 5 tính năng cốt lõi (Clearance Rule, RAM Slots Rule, In-Memory Fallback Resilience, Dual Device Ingestion, Token Rotation & Price Snapshot).

---

## 2. MA TRẬN PHÂN TÍCH KHOẢNG CÁCH CHI TIẾT (GAP MATRIX)

| Hạng mục kiểm toán | Mô tả trong Tài liệu v2.4.0 | Hiện trạng Mã nguồn thực tế (Codebase) | Đánh giá & Khuyến nghị điều chỉnh |
| :--- | :--- | :--- | :--- |
| **1. UI & State Stack** | • React 19, TypeScript 5.5+<br>• Tailwind CSS 3.4+<br>• Quản lý trạng thái bằng Zustand 4.5+ | • React 19.2.8, TypeScript 5.3.3<br>• Custom Cyberpunk CSS Design System (BEM, CSS Modules, Tokens)<br>• React Context API thuần (`BuilderContext`, `ThemeContext`, `AuthContext`) | **LỆCH KỸ THUẬT**:<br>Codebase không cài đặt Tailwind hay Zustand. Sử dụng CSS thuần tối ưu hiệu năng render và React Context zero-dependency. Cần cập nhật lại Tech Stack trong tài liệu. |
| **2. Testing Framework** | • Vitest & Supertest | • Native Node.js Test Runner (`node:test`, `node:assert`) chạy thông qua `tsx --test` | **LỆCH KỸ THUẬT**:<br>Bộ kiểm thử chạy native qua Node.js Runner, không phụ thuộc Vitest. Cần cập nhật lệnh chạy kiểm thử `npm run test:monorepo`. |
| **3. PC Builder Rule Engine** | • Chỉ kiểm tra Socket CPU-Mainboard và công suất TDP nguồn.<br>• Công thức: $P_{PSU} \ge (TDP + 50W) \times 1.20$ (biên an toàn 20%). | • Triển khai 4 Rules độc lập theo Clean Code SRP:<br>1. `SocketRule` (AM5 vs LGA1700)<br>2. `RamRule` (Chuẩn DDR4/DDR5 và số thanh RAM $\le$ số khe cắm Mainboard)<br>3. `ClearanceRule` (Dài GPU $\le$ Case max - 10mm đệm; Cao tản nhiệt $\le$ Case max)<br>4. `PowerRule`: $TDP_{CPU} + TDP_{GPU} + 50W (MB) + 50W (Phụ kiện) = +100W$, đệm an toàn **25%** ($1.25$). | **CODE VƯỢT TRỘI SO VỚI DOC**:<br>Code thực tế kiểm tra sâu và an toàn hơn hẳn tài liệu (có thêm RAM và Clearance kích thước vật lý; hệ số an toàn nguồn là 25% thay vì 20%). Cần cập nhật công thức và bổ sung 2 rules còn thiếu vào tài liệu. |
| **4. FSM Vòng đời Bảo hành** | • Gồm 6 trạng thái tuyến tính: `RECEIVED` $\rightarrow$ `DIAGNOSING` $\rightarrow$ `QUOTED` $\rightarrow$ `REPAIRING` $\rightarrow$ `QC` $\rightarrow$ `COMPLETED`.<br>• Khi khách từ chối chuyển sang `REJECTED_RETURN`. | • Máy trạng thái gồm **8 trạng thái** rõ ràng (`ticket.state.ts`):<br>`RECEIVED`, `DIAGNOSING`, `QUOTED`, `WAITING_CUSTOMER`, `REPAIRING`, `TESTING_QC`, `COMPLETED`, `CANCELLED`.<br>• Khách từ chối báo giá chuyển sang `CANCELLED`.<br>• `TESTING_QC` có thể lặp ngược lại `REPAIRING` nếu không đạt tiêu chuẩn. | **LỆCH QUY TRÌNH NGHIỆP VỤ**:<br>Code có trạng thái trung gian quan trọng `WAITING_CUSTOMER` sau khi kỹ thuật viên lập báo giá, và cho phép QC lặp lại nếu máy chưa đạt chuẩn. Tài liệu thiếu trạng thái này. |
| **5. Danh mục 6 Kịch bản Lab** | • Kịch bản sự cố chung chung: Sập kết nối DB, Nghẽn mạng giả định, và Tải CPU cực đại 100%. | • 6 Kịch bản chuẩn hóa thực thi tự động (`scenario-runner.service.ts`):<br>1. `scenario-1-order-placement` (Pipeline)<br>2. `scenario-2-stock-check` (Zero Oversell Concurrency)<br>3. `scenario-3-trigger-dlq` (Poison Message & DLQ)<br>4. `scenario-4-ai-mapping` (AI Data Normalization)<br>5. `scenario-5-rate-limiting` (HTTP 429 Barrier)<br>6. `scenario-6-system-health` (Diagnostic Probes) | **LỆCH ĐẶC TẢ KỸ THUẬT**:<br>Codebase đã xây dựng 6 kịch bản kiểm thử tích hợp bài bản và cụ thể hơn nhiều so với mô tả sơ sài trong tài liệu. Cần cập nhật danh mục 6 kịch bản chuẩn xác. |
| **6. Kiến trúc Monorepo & Gateway** | • Đóng gói chung chung 4 container trong Docker Compose. | • Kiến trúc Monorepo phân tách miền rõ ràng:<br>`CyberRig-Backend`, `CyberRig-Frontend`, `CyberRig-Admin`, `CyberRig-Infra`.<br>• Quy tắc bảo mật: **Zero Admin Code in Storefront** (tách biệt bundle khách hàng và quản trị).<br>• Nginx Gateway điều phối Single-Origin tại cổng 80/443. | **BỔ SUNG QUY CHUẨN KIẾN TRÚC**:<br>Tài liệu chưa ghi nhận quy chuẩn bảo mật phân lập UI Storefront và Admin Portal. |
| **7. Cơ chế Chịu lỗi (Resilience Fallback)** | • Chưa được đề cập trong tài liệu. | • Tích hợp In-Memory Store Fallback (`queryFallback`, `fallbackOrders`, `fallbackTickets`) trong Backend khi PostgreSQL/Redis gặp sự cố, đảm bảo dịch vụ không sập đột ngột. | **BỔ SUNG VÀO TÀI LIỆU**:<br>Là một điểm cộng lớn về tính sẵn sàng cao (High Availability) cần đưa vào mục Kiến trúc Độ tin cậy. |
| **8. Bảo vệ Giá (Price Snapshot)** | • Chưa nêu rõ cơ chế lưu vết giá. | • Bảng `order_items` lưu cứng trường `price_at_purchase` tại thời điểm đặt hàng để chống trượt giá khi catalog biến động. | **BỔ SUNG VÀO TÀI LIỆU**:<br>Đưa vào phần quy chuẩn thanh toán và toàn vẹn đơn hàng. |

---

## 3. TỔNG HỢP USE CASES ĐỐI CHIẾU CODEBASE

- **Các Use Case đã hiện thực hóa hoàn chỉnh và kiểm thử thành công (100% Verified)**:
  - `UC-01` (Duyệt & Tìm kiếm linh kiện đa tiêu chí)
  - `UC-02` (Xem chi tiết thông số kỹ thuật linh kiện)
  - `UC-03` (Chọn linh kiện vào 8 khoang PC Builder)
  - `UC-04` (Thẩm định tương thích Socket, RAM, Clearance và TDP Nguồn)
  - `UC-06` (Chuyển cấu hình sang giao diện Checkout)
  - `UC-07` (Đặt hàng, khóa kho Redis và tạo mã VietQR động)
  - `UC-08` (Tra cứu tình trạng đơn hàng công khai)
  - `UC-09` (Tiếp nhận & Lập hồ sơ thiết bị sửa chữa)
  - `UC-10` (Khách hàng duyệt / từ chối báo giá 2 chiều trực tuyến)
  - `UC-11` (Cập nhật trạng thái phiếu bảo hành theo State Machine)
  - `UC-12` (Ghi nhận kết quả kiểm định & Stress Test QC)
  - `UC-13` (Tra cứu tiến độ sửa chữa công khai bằng Ticket ID)
  - `UC-15` (Chuyển đổi giao diện Dual-Theme Cyberpunk Day/Night)
  - `UC-16` (Quản trị danh mục linh kiện, Restock và cảnh báo tồn an toàn)
  - `UC-17` (Xác thực và phân quyền RBAC JWT 3 vai trò)
  - `UC-18` (Giám sát SOC thời gian thực qua Server-Sent Events)
  - `UC-19` (Kích hoạt 6 kịch bản kiểm thử tích hợp trong Test Lab)
  - `UC-20` (Thu giữ Poison Message vào Dead Letter Queue và Replay)
- **Use Case mang tính trình diễn mở rộng (Extensible)**:
  - `UC-05` / `UC-14` (Danh mục PC Setup ngoại vi mẫu): Dữ liệu được tích hợp sẵn sàng trong hệ thống danh mục phụ trợ.

---

## 4. HÀNH ĐỘNG KHẮC PHỤC (ACTION PLAN)
1. Xuất bản tài liệu chuẩn hóa mới `CYBERRIG-SYSTEM-SPEC-V2.4.md` đồng bộ hóa 100% với mã nguồn hiện tại.
2. Cập nhật lại công thức đệm an toàn nguồn $25\%$ ($1.25$) và bổ sung đặc tả 2 quy tắc `RamRule`, `ClearanceRule`.
3. Chuẩn hóa sơ đồ máy trạng thái 8 bước cho quy trình bảo hành (`WAITING_CUSTOMER`, `TESTING_QC`, `CANCELLED`).
4. Khẳng định kiến trúc Monorepo phân tách miền (`CyberRig-Backend`, `CyberRig-Frontend`, `CyberRig-Admin`, `CyberRig-Infra`) và nguyên tắc Zero Admin Code in Storefront.
