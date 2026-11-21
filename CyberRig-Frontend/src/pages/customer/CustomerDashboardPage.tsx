/**
 * Customer Dashboard Page Component (Task FE-09 / Sprint 5)
 * Dedicated customer control center for tracking purchased PC builds and active repair/warranty tickets.
 * Styled with rich Cyberpunk Neon aesthetics and protected by ProtectedRoute.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { customerService, OrderDetail, RepairTicket } from '../../services/customer.service';
import { BuildSpecSheetCard } from '../../components/orders/BuildSpecSheetCard';
import { HardwareCategory, HardwareItem } from '../../../modules/hardware/hardware.model';
import { TicketStatus } from '../../../modules/repair-tickets/ticket.state';
import './CustomerDashboardPage.css';

import {
  DashboardTab,
  formatCurrency,
  formatDate,
  mapOrderItemToHardware,
  REPAIR_MILESTONES,
  getMilestoneStep,
  getOrderStatusMeta,
} from './customer-dashboard.utils';

export {
  DashboardTab,
  formatCurrency,
  formatDate,
  mapOrderItemToHardware,
  REPAIR_MILESTONES,
  getMilestoneStep,
  getOrderStatusMeta,
};


export const CustomerDashboardContent: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<DashboardTab>('orders');
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [tickets, setTickets] = useState<RepairTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedOrders, fetchedTickets] = await Promise.all([
        customerService.fetchMyOrders(),
        customerService.fetchMyTickets(),
      ]);
      setOrders(fetchedOrders || []);
      setTickets(fetchedTickets || []);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải dữ liệu cổng thông tin khách hàng.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const activeRepairsCount = tickets.filter(
    (t) => t.status !== TicketStatus.COMPLETED && t.status !== TicketStatus.CANCELLED
  ).length;

  const toggleOrderSpec = (orderId: string) => {
    setExpandedOrderId((prev) => (prev === orderId ? null : orderId));
  };

  const handlePrintOrder = (orderId: string) => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="cyber-dashboard-root">
      <div className="cyber-dashboard-container">
        {/* 1. Header & Telemetry HUD */}
        <header className="cyber-dashboard-header">
          <div className="cyber-header-top-row">
            <div className="cyber-user-identity">
              <div className="cyber-avatar-hex">👤</div>
              <div className="cyber-greeting-meta">
                <span className="cyber-greeting-badge">SECURITY LEVEL-3 // CITIZEN NEXUS</span>
                <h1 className="cyber-greeting-name">
                  CYBER-CITIZEN: {user?.fullName || user?.email || 'KHÁCH HÀNG'}
                </h1>
              </div>
            </div>
            <div className="cyber-role-tag-container">
              <span className={`cyber-role-pill is-${(user?.role || 'customer').toLowerCase()}`}>
                ROLE: {user?.role || 'CUSTOMER'}
              </span>
            </div>
          </div>

          {/* Telemetry Stats Grid */}
          <div className="cyber-telemetry-grid">
            <div className="cyber-telemetry-card">
              <span className="cyber-telemetry-icon">🚀</span>
              <div className="cyber-telemetry-data">
                <span className="cyber-telemetry-val">{orders.length}</span>
                <span className="cyber-telemetry-label">Dàn PC Đã Đặt Hàng</span>
              </div>
            </div>
            <div className="cyber-telemetry-card is-magenta">
              <span className="cyber-telemetry-icon">🛠️</span>
              <div className="cyber-telemetry-data">
                <span className="cyber-telemetry-val">{activeRepairsCount}</span>
                <span className="cyber-telemetry-label">Thiết Bị Đang Sửa Chữa</span>
              </div>
            </div>
            <div className="cyber-telemetry-card is-green">
              <span className="cyber-telemetry-icon">⚡</span>
              <div className="cyber-telemetry-data">
                <span className="cyber-telemetry-val">CONNECTED</span>
                <span className="cyber-telemetry-label">Neural Link 0x99 // Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* 2. Cyberpunk Tab Navigation */}
        <nav className="cyber-tabs-bar" aria-label="Customer Dashboard Tabs">
          <button
            type="button"
            className={`cyber-tab-btn ${activeTab === 'orders' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('orders')}
            id="tab-orders-btn"
          >
            <span>🖥️ DÀN MÁY ĐÃ ĐẶT (MY RIGS)</span>
            <span className="cyber-tab-count">{orders.length}</span>
          </button>
          <button
            type="button"
            className={`cyber-tab-btn ${activeTab === 'repairs' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('repairs')}
            id="tab-repairs-btn"
          >
            <span>🔧 THIẾT BỊ BẢO HÀNH & SỬA CHỮA</span>
            <span className="cyber-tab-count">{tickets.length}</span>
          </button>
        </nav>

        {/* Error Alert */}
        {error && (
          <div className="cyber-alert-box is-error" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,0,60,0.1)', border: '1px solid #ff003c', color: '#ff003c' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="cyber-dashboard-loading" style={{ textAlign: 'center', padding: '4rem 0', color: '#00f0ff' }}>
            <div style={{ fontFamily: 'Orbitron', fontSize: '1.2rem', marginBottom: '0.5rem' }}>ĐANG TRUY VẤN DỮ LIỆU CÁ NHÂN...</div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Synchronizing Quantum Encrypted Records</div>
          </div>
        ) : (
          <>
            {/* ==========================================================
                TAB 1: DÀN MÁY ĐÃ ĐẶT (MY PC BUILDS & ORDERS)
                ========================================================== */}
            {activeTab === 'orders' && (
              <section className="cyber-tab-panel" aria-label="Orders List">
                {orders.length === 0 ? (
                  <div className="cyber-empty-state">
                    <div className="cyber-empty-icon">🖥️</div>
                    <h3 className="cyber-empty-title">CHƯA CÓ DÀN PC NÀO ĐƯỢC ĐẶT</h3>
                    <p className="cyber-empty-desc">
                      Bạn chưa đặt mua cấu hình PC nào trên hệ thống. Hãy truy cập công cụ PC Builder để tự thiết kế dàn máy chiến game đỉnh cao theo phong cách Cyberpunk.
                    </p>
                    <a href="/builder" className="cyber-empty-cta">
                      XÂY DỰNG DÀN PC ĐẦU TIÊN →
                    </a>
                  </div>
                ) : (
                  <div className="cyber-orders-list">
                    {orders.map((order) => {
                      const statusMeta = getOrderStatusMeta(order.status);
                      const isExpanded = expandedOrderId === order.id;
                      const hardwareItems = (order.items || []).map(mapOrderItemToHardware);

                      return (
                        <article key={order.id} className="cyber-order-card" id={`order-${order.id}`}>
                          <div className="cyber-order-header">
                            <div className="cyber-order-code-group">
                              <span className="cyber-order-code">
                                #ORD-{order.id.slice(0, 8).toUpperCase()}
                              </span>
                              <span className="cyber-order-date">
                                📅 {formatDate(order.createdAt)}
                              </span>
                            </div>
                            <span className={`cyber-order-status-badge ${statusMeta.className}`}>
                              {statusMeta.label}
                            </span>
                          </div>

                          <div className="cyber-order-body">
                            <div className="cyber-order-summary-meta">
                              <div className="cyber-order-meta-item">
                                <span className="cyber-meta-label">Số lượng linh kiện</span>
                                <span className="cyber-meta-val">{order.items?.length || 0} món</span>
                              </div>
                              <div className="cyber-order-meta-item">
                                <span className="cyber-meta-label">Địa chỉ nhận máy</span>
                                <span className="cyber-meta-val">{order.shippingAddress || 'Nhận tại Showroom'}</span>
                              </div>
                              <div className="cyber-order-meta-item">
                                <span className="cyber-meta-label">Tổng tiền thanh toán</span>
                                <span className="cyber-meta-val is-price">
                                  {formatCurrency(order.totalAmount)}
                                </span>
                              </div>
                            </div>

                            <div className="cyber-order-actions">
                              <button
                                type="button"
                                className="cyber-btn-spec-toggle"
                                onClick={() => toggleOrderSpec(order.id)}
                                aria-expanded={isExpanded}
                              >
                                {isExpanded ? '▲ Ẩn Cấu Hình' : '▼ Xem Chi Tiết Cấu Hình'}
                              </button>
                              <button
                                type="button"
                                className="cyber-btn-print"
                                onClick={() => handlePrintOrder(order.id)}
                                title="In hóa đơn & Spec Sheet"
                              >
                                🖨️ In Hóa Đơn
                              </button>
                            </div>
                          </div>

                          {/* Expanded Spec Sheet View */}
                          {isExpanded && (
                            <div className="cyber-order-spec-expanded">
                              <BuildSpecSheetCard
                                items={hardwareItems}
                                totalPrice={order.totalAmount}
                                orderId={`#ORD-${order.id.slice(0, 8).toUpperCase()}`}
                                customerInfo={{
                                  name: order.customerName,
                                  phone: order.customerPhone,
                                  email: order.customerEmail,
                                  address: order.shippingAddress,
                                }}
                                showExportButton={true}
                                onExportPdf={() => handlePrintOrder(order.id)}
                              />
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* ==========================================================
                TAB 2: THIẾT BỊ BẢO HÀNH & SỬA CHỮA (ACTIVE REPAIRS)
                ========================================================== */}
            {activeTab === 'repairs' && (
              <section className="cyber-tab-panel" aria-label="Repairs List">
                {tickets.length === 0 ? (
                  <div className="cyber-empty-state">
                    <div className="cyber-empty-icon">🛡️</div>
                    <h3 className="cyber-empty-title">KHÔNG CÓ THIẾT BỊ NÀO ĐANG SỬA CHỮA</h3>
                    <p className="cyber-empty-desc">
                      Tất cả các dàn máy của bạn đều đang vận hành hoàn hảo. Nếu thiết bị gặp sự cố hoặc cần bảo dưỡng định kỳ, hãy gửi yêu cầu kiểm tra tới quầy kỹ thuật.
                    </p>
                    <a href="/repair-tracking" className="cyber-empty-cta">
                      GỬI YÊU CẦU KIỂM TRA MÁY →
                    </a>
                  </div>
                ) : (
                  <div className="cyber-repairs-list">
                    {tickets.map((ticket) => {
                      const currentStep = getMilestoneStep(ticket.status);
                      const isCancelled = ticket.status === TicketStatus.CANCELLED;
                      const progressPct = isCancelled ? 0 : ((currentStep - 1) / 4) * 100;

                      return (
                        <article key={ticket.id} className="cyber-repair-card" id={`ticket-${ticket.ticketCode}`}>
                          <div className="cyber-repair-top">
                            <div className="cyber-device-title-box">
                              <span className="cyber-tracking-code">
                                🎫 {ticket.ticketCode}
                              </span>
                              <h3 className="cyber-device-name">
                                {ticket.deviceType}
                              </h3>
                              <span className="cyber-repair-date">
                                📅 Tiếp nhận: {formatDate(ticket.createdAt)} • Serial: {ticket.serialNumber}
                              </span>
                            </div>

                            <a
                              href={`/repair-tracking?code=${encodeURIComponent(ticket.ticketCode)}`}
                              className="cyber-btn-track-detail"
                            >
                              🔍 Xem Chi Tiết Tiến Trình →
                            </a>
                          </div>

                          {/* 5-Step Mini Progress Stepper */}
                          <div className="cyber-stepper-container" aria-label="Repair Progress Stepper">
                            <div className="cyber-stepper-track">
                              {/* Background Bar */}
                              <div className="cyber-stepper-bar-bg" />
                              {/* Active Fill Bar */}
                              <div
                                className="cyber-stepper-bar-fill"
                                style={{ width: `${progressPct * 0.8}%` }}
                              />

                              {REPAIR_MILESTONES.map((m) => {
                                const isDone = !isCancelled && currentStep > m.step;
                                const isActive = !isCancelled && currentStep === m.step;
                                return (
                                  <div
                                    key={m.key}
                                    className={`cyber-step-node ${isDone ? 'is-done' : ''} ${
                                      isActive ? 'is-active' : ''
                                    }`}
                                  >
                                    <div className="cyber-step-circle">
                                      {isDone ? '✓' : m.step}
                                    </div>
                                    <span className="cyber-step-label">{m.label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Status and Notes Footer */}
                          <div className="cyber-repair-footer-note">
                            <strong>Mô tả sự cố:</strong> {ticket.faultDescription}
                            {ticket.quoteAmount != null && (
                              <span style={{ marginLeft: '1.5rem', color: '#ffaa00' }}>
                                <strong>Chi phí báo giá:</strong> {formatCurrency(Number(ticket.quoteAmount))}
                              </span>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export const CustomerDashboardPage: React.FC = () => {
  return (
    <ProtectedRoute allowedRoles={['CUSTOMER', 'TECHNICIAN', 'ADMIN']}>
      <CustomerDashboardContent />
    </ProtectedRoute>
  );
};

export default CustomerDashboardPage;
