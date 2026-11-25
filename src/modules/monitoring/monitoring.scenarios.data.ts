/**
 * Scenario Definitions Catalog (SE445 Interactive Integration Lab)
 * Decoupled from execution logic to respect clean-code file size limits.
 */

import { ScenarioDefinition, ScenarioId } from './monitoring.model';

export const SCENARIO_DEFINITIONS: Record<ScenarioId, ScenarioDefinition> = {
  'scenario-1-order-placement': {
    id: 'scenario-1-order-placement',
    name: 'Order Placement Integration Pipeline',
    category: 'PIPELINE',
    description: 'Kiểm tra luồng đặt hàng: Ingest order -> Lock kho Redis -> Dispatch AMQP Message -> Fulfillment ack.',
    expectedOutcome: 'Đơn hàng được tiếp nhận, tồn kho được khóa tức thì, message lưu vào broker an toàn.',
  },
  'scenario-2-stock-check': {
    id: 'scenario-2-stock-check',
    name: 'Real-time Stock Check & Concurrency Lock',
    category: 'CONCURRENCY',
    description: 'Giả lập 5 luồng đặt hàng đồng thời trên SKU HOT (RTX 4090) để kiểm tra cơ chế chống bán quá số lượng (Zero Oversell).',
    expectedOutcome: 'Chỉ các request trong giới hạn tồn kho được cấp Lock; các request vượt ngưỡng bị từ chối an toàn.',
  },
  'scenario-3-trigger-dlq': {
    id: 'scenario-3-trigger-dlq',
    name: 'Trigger DLQ Error & Poison Message',
    category: 'RESILIENCE',
    description: 'Cố tình bơm payload lỗi cấu trúc (Poison Message) vào queue để kiểm tra cơ chế thử lại (Retry) và chuyển vào Dead Letter Queue.',
    expectedOutcome: 'Consumer từ chối sau 3 lần retry, message được chuyển tự động vào DLQ mà không làm sập pipeline chính.',
  },
  'scenario-4-ai-mapping': {
    id: 'scenario-4-ai-mapping',
    name: 'Run AI Data Mapping Pipeline',
    category: 'AI_ENGINE',
    description: 'Chạy pipeline AI chuẩn hóa dữ liệu linh kiện thô từ nhà phân phối dị thể về schema chuẩn của CyberRig.',
    expectedOutcome: 'Dữ liệu được chuẩn hóa thành công với độ chính xác >98% và thời gian suy luận <50ms.',
  },
  'scenario-5-rate-limiting': {
    id: 'scenario-5-rate-limiting',
    name: 'Rate Limiting Stress Test (429 Barrier)',
    category: 'SECURITY',
    description: 'Bắn loạt 25 request dồn dập trong 150ms để kích hoạt cơ chế phòng thủ Rate Limiting và kiểm tra mã phản hồi HTTP 429.',
    expectedOutcome: 'Hệ thống chặn các request vượt ngưỡng với mã 429 Too Many Requests và header Retry-After.',
  },
  'scenario-6-system-health': {
    id: 'scenario-6-system-health',
    name: 'Full System Diagnostic Probe',
    category: 'DIAGNOSTIC',
    description: 'Chẩn đoán kết nối toàn diện qua tất cả các mắt xích: PostgreSQL, Redis, Node.js App V8 Heap, Nginx Gateway.',
    expectedOutcome: 'Tất cả 4 container và dịch vụ trả về trạng thái HEALTHY với độ trễ thấp.',
  },
};
