# Tích Hợp SE445 Case Study 1 & Case Study 2 vào CyberRig

Tài liệu này tổng hợp các thành phần kiến trúc System Integration (SE445) đã được tích hợp trực tiếp vào hệ thống **CyberRig** (bảo toàn 100% kiểm thử bảo mật `SEC-01..10`, `MON-01..09`, Clean Code SRP `<= 300` dòng/tệp và nguyên tắc *Zero Admin Code in Storefront*).

---

## 1. Kiến Trúc Tích Hợp Case Study 1 (Omnichannel Order, Gateway & Event-Driven Mesh)

| Thành phần | Triển khai thực tế trong CyberRig |
| :--- | :--- |
| **API Gateway & SSE Proxy** | [nginx.conf](../nginx/nginx.conf), [CyberRig-Infra/nginx/nginx.conf](../CyberRig-Infra/nginx/nginx.conf), và topology tham chiếu Kong DB-less tại [kong.yml](../CyberRig-Infra/kong/kong.yml): gắn `X-Correlation-ID $request_id`, giới hạn tốc độ (`limit_req`), và tắt buffering (`proxy_buffering off`) cho `/api/monitoring/stream`. |
| **Distributed Tracing (`X-Correlation-ID`)** | [correlation.middleware.ts](../src/core/middlewares/correlation.middleware.ts): sinh/chuyển tiếp `X-Correlation-ID` end-to-end qua Express request, CORS `exposedHeaders`, Structured Logger và `EventEnvelope`. |
| **Canonical Order Adapter** | [order.adapter.ts](../src/modules/orders/order.adapter.ts): chuyển đổi payload dị thể B2B/Mobile/AI POS (`user`, `products`, `product_code`, `qty`, `delivery_addr`, `channel`) về `CreateOrderDto` chuẩn trước khi vào `OrderService` + Redis Atomic Lock. |
| **Dual-Mode Event Bus & Outbox** | [event-bus.ts](../src/core/events/event-bus.ts): Topic Exchange `cyberrig.orders`, DLX `cyberrig.dlx`, DLQ `cyberrig.orders.dlq`, Retry 3x với backoff, Idempotency Guard chống xử lý lặp, Pause/Resume queue và Outbox (`PENDING_RETRY` + HTTP `503` khi broker offline). |
| **Downstream Subscribers** | [order-events.subscriber.ts](../src/modules/orders/order-events.subscriber.ts): 3 subscriber độc lập `order.inventory-sync`, `order.crm-loyalty`, `order.fulfillment-tms` (hỗ trợ fault injection cho DLQ). |
| **RabbitMQ Topology** | [definitions.json](../CyberRig-Infra/rabbitmq/definitions.json), [rabbitmq.conf](../CyberRig-Infra/rabbitmq/rabbitmq.conf), [docker-compose.integration.yml](../CyberRig-Infra/docker/docker-compose.integration.yml). |

---

## 2. Kiến Trúc Tích Hợp Case Study 2 (AI POS Ingestion, PII Masking & CEO Decision Support)

| Thành phần | Triển khai thực tế trong CyberRig |
| :--- | :--- |
| **Che PII trước khi gọi AI (Nghị định 13/2023/NĐ-CP)** | `maskRawTextPii` / `maskRawPosPii` tại [pii-mask.util.ts](../src/core/security/pii-mask.util.ts) làm sạch SĐT & email trong văn bản POS thô trước khi lưu cache hoặc gửi prompt Gemini. |
| **AI Data Mapping Engine** | [ai-data-mapper.service.ts](../src/modules/monitoring/ai-data-mapper.service.ts): sanitize -> mask PII -> Template Cache (`confidence = 0.99`) -> Gemini Structured Output (nếu cấu hình `GEMINI_API_KEY`) -> Deterministic Offline Normalizer khớp SKU thật từ `hardwareService`. |
| **Scenario Runner & Telemetry Bridge** | [scenario-runner.service.ts](../src/modules/monitoring/scenario-runner.service.ts) + [telemetry.service.ts](../src/modules/monitoring/telemetry.service.ts): `scenario-3` và `scenario-4` thực thi trực tiếp `eventBus` và `aiDataMapperService`. |
| **Admin SI Lab — Tab 4: Order & AI POS** | [monitoring-simulator.js](../nginx/html/admin-monitoring/monitoring-simulator.js) trong `/admin-monitoring/`, chỉ gọi các API được bảo vệ `ADMIN` RBAC tại [monitoring-integration.controller.ts](../src/modules/monitoring/monitoring-integration.controller.ts). |
| **CEO SLA Benchmark & Postman** | [ceo-metrics.service.ts](../src/modules/monitoring/ceo-metrics.service.ts) mở rộng `integrationStats`, `aiPosStats`, `slaBenchmark`; bộ Postman tại [CyberRig_SE445_Integration.postman_collection.json](../tests/postman/CyberRig_SE445_Integration.postman_collection.json). |

---

## 3. Kiểm Thử Tự Động

- Unit test Event Bus, Tracing & PII Redaction: [event-bus.spec.ts](../src/core/events/event-bus.spec.ts)
- Integration test Canonical Adapter, AI POS Mapper, RBAC & Broker Offline `503`: [se445-integration.spec.ts](../src/modules/monitoring/se445-integration.spec.ts)
- Thực thi toàn bộ bộ test: `npm test`
