/**
 * Ticket Tracking Sample Dataset & Lookup Service Helper
 * Matches database schema from Task BE-02, BE-03 and ticket.model.ts
 */

import { RepairTicket, TicketPriority } from '../../modules/repair-tickets/ticket.model';
import { TicketStatus } from '../../modules/repair-tickets/ticket.state';
import { EntityNotFoundError } from '../../core/errors';

export const SAMPLE_TRACKING_TICKETS: RepairTicket[] = [
  // 1. Seed Ticket: RECEIVED State
  {
    id: 'tk-uuid-001',
    ticketCode: 'TK-20260905-001',
    customerName: 'Nguyễn Văn An',
    customerPhone: '0901234567',
    customerEmail: 'an.nguyen@example.com',
    deviceType: 'PC Gaming Custom (Core i7 / RTX 3080)',
    serialNumber: 'SN-CR-99281-VN',
    initialCondition: 'Máy còn nguyên tem, case kính trầy xước nhẹ góc dưới, quạt tản nhiệt bám bụi.',
    faultDescription: 'Bật nguồn quạt quay nhưng không xuất hình, mainboard báo đèn đỏ VGA led, có mùi khét nhẹ khi chạy ứng dụng nặng.',
    diagnosisNotes: 'Đang tiến hành đo đạc trở kháng cuộn cảm và dàn VRM nguồn phụ 12V.',
    priority: TicketPriority.STANDARD,
    status: TicketStatus.RECEIVED,
    technicianId: 'KTV-TRUONG-01',
    quoteAmount: null,
    isQuoteApproved: false,
    warrantyMonths: 0,
    createdAt: new Date('2026-09-05T08:15:00Z'),
    updatedAt: new Date('2026-09-05T08:15:00Z'),
    timeline: [
      {
        id: 'log-001-1',
        ticketId: 'tk-uuid-001',
        fromStatus: null,
        toStatus: TicketStatus.RECEIVED,
        actorId: 'KTV-TRUONG-01',
        note: 'Tiếp nhận thiết bị tại quầy kỹ thuật CyberRig, lập biên bản kiểm tra ngoại quan cùng khách hàng.',
        createdAt: new Date('2026-09-05T08:15:00Z'),
      },
    ],
  },

  // 2. In-Progress Ticket: REPAIRING State
  {
    id: 'tk-uuid-002',
    ticketCode: 'TK-20260904-082',
    customerName: 'Lê Minh Tuấn',
    customerPhone: '0912345678',
    customerEmail: 'tuan.le@example.com',
    deviceType: 'Laptop ASUS ROG Zephyrus G14 (Ryzen 9 / RTX 4060)',
    serialNumber: 'SN-ROG-88219-VN',
    initialCondition: 'Vỏ máy nguyên vẹn, bàn phím gõ êm, màn hình không trầy, củ sạc zin 240W đi kèm.',
    faultDescription: 'Máy bị sập nguồn đột ngột khi chơi Black Myth Wukong, nhiệt độ GPU nhảy vọt lên 98°C.',
    diagnosisNotes: 'Quạt tản nhiệt bên GPU bị kẹt bụi xơ vải, keo tản nhiệt kim loại lỏng bị oxy hóa khô cứng.',
    priority: TicketPriority.URGENT,
    status: TicketStatus.REPAIRING,
    technicianId: 'KTV-HOANG-03',
    quoteAmount: 850000,
    isQuoteApproved: true,
    warrantyMonths: 6,
    createdAt: new Date('2026-09-04T09:30:00Z'),
    updatedAt: new Date('2026-09-05T09:00:00Z'),
    timeline: [
      {
        id: 'log-002-1',
        ticketId: 'tk-uuid-002',
        fromStatus: null,
        toStatus: TicketStatus.RECEIVED,
        actorId: 'LE-TAN-01',
        note: 'Tiếp nhận laptop ROG Zephyrus G14 kèm sạc zin, máy không lên hình.',
        createdAt: new Date('2026-09-04T09:30:00Z'),
      },
      {
        id: 'log-002-2',
        ticketId: 'tk-uuid-002',
        fromStatus: TicketStatus.RECEIVED,
        toStatus: TicketStatus.DIAGNOSING,
        actorId: 'KTV-HOANG-03',
        note: 'Tháo tản nhiệt kiểm tra: Quạt tản bị kẹt dị vật, keo tản nhiệt GPU bị khô hoàn toàn dẫn đến quá nhiệt ngắt nguồn bảo vệ.',
        createdAt: new Date('2026-09-04T11:00:00Z'),
      },
      {
        id: 'log-002-3',
        ticketId: 'tk-uuid-002',
        fromStatus: TicketStatus.DIAGNOSING,
        toStatus: TicketStatus.QUOTED,
        actorId: 'KTV-HOANG-03',
        note: 'Đề xuất: Vệ sinh toàn bộ heatsink, thay quạt tản ROG chính hãng và tra keo gốm dẫn nhiệt cao cấp Honeywell PTM7950. Tổng: 850.000 VNĐ.',
        createdAt: new Date('2026-09-04T14:20:00Z'),
      },
      {
        id: 'log-002-4',
        ticketId: 'tk-uuid-002',
        fromStatus: TicketStatus.QUOTED,
        toStatus: TicketStatus.WAITING_CUSTOMER,
        actorId: 'CSKH-LAN',
        note: 'Đã gọi điện tư vấn và gửi chi tiết báo giá qua Zalo cho khách hàng.',
        createdAt: new Date('2026-09-04T15:00:00Z'),
      },
      {
        id: 'log-002-5',
        ticketId: 'tk-uuid-002',
        fromStatus: TicketStatus.WAITING_CUSTOMER,
        toStatus: TicketStatus.REPAIRING,
        actorId: 'KTV-HOANG-03',
        note: 'Khách hàng xác nhận đồng ý phương án. Kỹ thuật viên bắt đầu thay thế linh kiện và làm sạch buồng tản nhiệt.',
        createdAt: new Date('2026-09-05T09:00:00Z'),
      },
    ],
  },

  // 3. Completed Ticket: COMPLETED State
  {
    id: 'tk-uuid-003',
    ticketCode: 'TK-20260903-015',
    customerName: 'Hoàng Thu Thảo',
    customerPhone: '0933445566',
    customerEmail: 'thao.hoang@example.com',
    deviceType: 'Workstation Đồ Họa 3D (i9 13900K / RTX 4090 / 64GB)',
    serialNumber: 'SN-WS-55410-VN',
    initialCondition: 'Case kính cường lực, có cấn nhẹ mặt sau thùng máy do vận chuyển.',
    faultDescription: 'Màn hình xanh BSOD (MEMORY_MANAGEMENT) liên tục mỗi khi render video 4K bằng Adobe Premiere.',
    diagnosisNotes: '1 thanh RAM Corsair DDR5 32GB bị lỗi ô nhớ (MemTest86 báo lỗi hàng loạt ở test số 7).',
    priority: TicketPriority.URGENT,
    status: TicketStatus.COMPLETED,
    technicianId: 'KTV-PHUC-02',
    quoteAmount: 3290000,
    isQuoteApproved: true,
    warrantyMonths: 36,
    createdAt: new Date('2026-09-03T08:00:00Z'),
    updatedAt: new Date('2026-09-04T17:30:00Z'),
    timeline: [
      {
        id: 'log-003-1',
        ticketId: 'tk-uuid-003',
        fromStatus: null,
        toStatus: TicketStatus.RECEIVED,
        actorId: 'LE-TAN-02',
        note: 'Tiếp nhận thùng máy Workstation, ghi nhận lỗi BSOD khi render.',
        createdAt: new Date('2026-09-03T08:00:00Z'),
      },
      {
        id: 'log-003-2',
        ticketId: 'tk-uuid-003',
        fromStatus: TicketStatus.RECEIVED,
        toStatus: TicketStatus.DIAGNOSING,
        actorId: 'KTV-PHUC-02',
        note: 'Chạy công cụ MemTest86 phát hiện thanh RAM số 2 bị lỗi ô nhớ phần cứng.',
        createdAt: new Date('2026-09-03T10:30:00Z'),
      },
      {
        id: 'log-003-3',
        ticketId: 'tk-uuid-003',
        fromStatus: TicketStatus.DIAGNOSING,
        toStatus: TicketStatus.QUOTED,
        actorId: 'KTV-PHUC-02',
        note: 'Báo giá đổi mới thanh RAM Corsair Vengeance 32GB DDR5 6000MHz. Bảo hành 36 tháng.',
        createdAt: new Date('2026-09-03T11:45:00Z'),
      },
      {
        id: 'log-003-4',
        ticketId: 'tk-uuid-003',
        fromStatus: TicketStatus.QUOTED,
        toStatus: TicketStatus.WAITING_CUSTOMER,
        actorId: 'CSKH-LAN',
        note: 'Khách hàng duyệt báo giá qua ứng dụng di động.',
        createdAt: new Date('2026-09-03T13:00:00Z'),
      },
      {
        id: 'log-003-5',
        ticketId: 'tk-uuid-003',
        fromStatus: TicketStatus.WAITING_CUSTOMER,
        toStatus: TicketStatus.REPAIRING,
        actorId: 'KTV-PHUC-02',
        note: 'Xuất kho thanh RAM mới, lắp đặt vào khe cắm số 2 và kích hoạt profile XMP 6000MHz.',
        createdAt: new Date('2026-09-03T14:30:00Z'),
      },
      {
        id: 'log-003-6',
        ticketId: 'tk-uuid-003',
        fromStatus: TicketStatus.REPAIRING,
        toStatus: TicketStatus.TESTING_QC,
        actorId: 'KTV-PHUC-02',
        note: 'Chạy stress test Prime95 + FurMark trong 3 giờ liên tục. Không còn hiện tượng BSOD, nhiệt độ CPU 72°C ổn định.',
        createdAt: new Date('2026-09-04T10:00:00Z'),
      },
      {
        id: 'log-003-7',
        ticketId: 'tk-uuid-003',
        fromStatus: TicketStatus.TESTING_QC,
        toStatus: TicketStatus.COMPLETED,
        actorId: 'KTV-PHUC-02',
        note: 'Vệ sinh máy, dán tem bảo hành mới, bàn giao đầy đủ thiết bị và hóa đơn cho khách hàng.',
        createdAt: new Date('2026-09-04T17:30:00Z'),
      },
    ],
  },

  // 4. Cancelled Ticket: CANCELLED State
  {
    id: 'tk-uuid-004',
    ticketCode: 'TK-20260901-099',
    customerName: 'Đỗ Quốc Huy',
    customerPhone: '0977889900',
    customerEmail: 'huy.do@example.com',
    deviceType: 'PC Văn Phòng Dell OptiPlex 7090',
    serialNumber: 'SN-DELL-11029-VN',
    initialCondition: 'Thùng máy bám bụi, nguồn có tiếng kêu rè rè nhỏ khi tải.',
    faultDescription: 'Máy tính hoàn toàn không nhận ổ cứng NVMe, không boot vào Windows được.',
    diagnosisNotes: 'Hư hỏng chip cầu nam (PCH chipset) trên mainboard nguyên bản.',
    priority: TicketPriority.LOW,
    status: TicketStatus.CANCELLED,
    technicianId: 'KTV-HOANG-03',
    quoteAmount: 2100000,
    isQuoteApproved: false,
    warrantyMonths: 0,
    createdAt: new Date('2026-09-01T08:00:00Z'),
    updatedAt: new Date('2026-09-02T10:00:00Z'),
    timeline: [
      {
        id: 'log-004-1',
        ticketId: 'tk-uuid-004',
        fromStatus: null,
        toStatus: TicketStatus.RECEIVED,
        actorId: 'LE-TAN-01',
        note: 'Tiếp nhận PC văn phòng không nhận ổ cứng.',
        createdAt: new Date('2026-09-01T08:00:00Z'),
      },
      {
        id: 'log-004-2',
        ticketId: 'tk-uuid-004',
        fromStatus: TicketStatus.RECEIVED,
        toStatus: TicketStatus.DIAGNOSING,
        actorId: 'KTV-HOANG-03',
        note: 'Kiểm tra đường tín hiệu PCIe m.2: Phát hiện chập đường dữ liệu vào Chipset.',
        createdAt: new Date('2026-09-01T11:00:00Z'),
      },
      {
        id: 'log-004-3',
        ticketId: 'tk-uuid-004',
        fromStatus: TicketStatus.DIAGNOSING,
        toStatus: TicketStatus.QUOTED,
        actorId: 'KTV-HOANG-03',
        note: 'Báo giá thay bo mạch chủ Dell đồng bộ: 2.100.000 VNĐ.',
        createdAt: new Date('2026-09-01T15:00:00Z'),
      },
      {
        id: 'log-004-4',
        ticketId: 'tk-uuid-004',
        fromStatus: TicketStatus.QUOTED,
        toStatus: TicketStatus.WAITING_CUSTOMER,
        actorId: 'CSKH-LAN',
        note: 'Liên hệ khách hàng để tư vấn phương án thay mainboard.',
        createdAt: new Date('2026-09-01T16:00:00Z'),
      },
      {
        id: 'log-004-5',
        ticketId: 'tk-uuid-004',
        fromStatus: TicketStatus.WAITING_CUSTOMER,
        toStatus: TicketStatus.CANCELLED,
        actorId: 'CSKH-LAN',
        note: 'Khách hàng từ chối báo giá sửa chữa và quyết định nâng cấp dàn máy mới. Bàn giao trả lại máy nguyên trạng.',
        createdAt: new Date('2026-09-02T10:00:00Z'),
      },
    ],
  },
];

/**
 * Service Lookup: Tra cứu mã phiếu theo Ticket Code hoặc Số điện thoại
 */
export async function lookupTicket(searchQuery: string): Promise<RepairTicket> {
  const query = searchQuery.trim().toUpperCase();

  // Mô phỏng độ trễ mạng thực tế 400ms để người dùng thấy HexSpinner
  await new Promise((resolve) => setTimeout(resolve, 400));

  const found = SAMPLE_TRACKING_TICKETS.find(
    (t) =>
      t.ticketCode.toUpperCase() === query ||
      t.customerPhone.includes(query) ||
      t.serialNumber.toUpperCase() === query
  );

  if (!found) {
    throw new EntityNotFoundError(
      `Không tìm thấy phiếu bảo hành hoặc sửa chữa nào khớp với mã "${searchQuery}". Vui lòng kiểm tra lại định dạng mã phiếu (ví dụ: TK-20260905-001).`
    );
  }

  return found;
}

/**
 * Dedicated Technician Diagnosing Sample Ticket for PB-11 & Task FE-06
 */
export const SAMPLE_DIAGNOSING_TICKET_1001: RepairTicket = {
  id: 'tk-uuid-1001',
  ticketCode: 'TK-1001',
  customerName: 'Trần Minh Hoàng',
  customerPhone: '0987654321',
  customerEmail: 'hoang.tran@example.com',
  deviceType: 'PC Gaming Cyber Rig Intel Gen 13 (Core i5 / RTX 4070)',
  serialNumber: 'SN-CR-1001-VN',
  initialCondition: 'Thùng máy bám bụi nhẹ, case kính nguyên vẹn, đèn LED nguồn sáng bình thường.',
  faultDescription: 'Máy bật lên quạt quay vù rồi dừng, màn hình đen, buzzer phát 3 tiếng bip liên tục.',
  diagnosisNotes: 'Đang tiến hành đo kiểm tra trở kháng khe RAM 1 và tụ lọc nguồn RAM.',
  priority: TicketPriority.STANDARD,
  status: TicketStatus.DIAGNOSING,
  technicianId: 'tech-nv-nam',
  quoteAmount: null,
  isQuoteApproved: false,
  warrantyMonths: 12,
  createdAt: new Date('2026-09-08T08:00:00Z'),
  updatedAt: new Date('2026-09-08T08:30:00Z'),
  timeline: [
    {
      id: 'log-1001-1',
      ticketId: 'tk-uuid-1001',
      fromStatus: null,
      toStatus: TicketStatus.RECEIVED,
      actorId: 'LE-TAN-01',
      note: 'Tiếp nhận PC Gaming kêu 3 tiếng bip không xuất hình.',
      createdAt: new Date('2026-09-08T08:00:00Z'),
    },
    {
      id: 'log-1001-2',
      ticketId: 'tk-uuid-1001',
      fromStatus: TicketStatus.RECEIVED,
      toStatus: TicketStatus.DIAGNOSING,
      actorId: 'tech-nv-nam',
      note: 'Kỹ thuật viên tiếp nhận, tháo máy kiểm tra tín hiệu socket và kênh nhớ RAM.',
      createdAt: new Date('2026-09-08T08:30:00Z'),
    },
  ],
};

