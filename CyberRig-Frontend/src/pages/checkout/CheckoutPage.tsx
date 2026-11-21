/**
 * Checkout Page Component (Task FE-07 / Sprint 3)
 * Full PC build checkout flow with shipping validation, VietQR bank payment,
 * BuildSpecSheetCard summary, OutOfStockError handling, and double-submit protection.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { HardwareItem } from '../../../modules/hardware/hardware.model';
import { OrderDetail } from '../../../modules/orders/order.model';
import { MainLayout } from '../../layouts/MainLayout';
import { BuildSpecSheetCard } from '../../components/orders/BuildSpecSheetCard';
import { HexSpinner } from '../../components/feedback/HexSpinner';
import { submitOrder } from '../../services/order.api';
import { OutOfStockError } from '../../../core/errors';
import { BUILD_PRESETS, MOCK_HARDWARE_CATALOG } from '../pc-builder.data';
import './CheckoutPage.css';

export type PaymentMethod = 'BANK_TRANSFER' | 'COD' | 'E_WALLET';

export interface CheckoutPageProps {
  initialItems?: HardwareItem[];
  onBackToBuilder?: () => void;
  onOrderSuccess?: (order: OrderDetail) => void;
}

const PHONE_REGEX = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  initialItems,
  onBackToBuilder,
  onOrderSuccess,
}) => {
  // 1. Resolve Build Items (from Props, SessionStorage, or Fallback Preset)
  const buildItems = useMemo<HardwareItem[]>(() => {
    if (initialItems && initialItems.length > 0) {
      return initialItems;
    }

    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('cyberrig_checkout_build');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {}
    }

    // Fallback: Standard Gaming Preset
    const defaultPreset = BUILD_PRESETS[0];
    return MOCK_HARDWARE_CATALOG.filter((item) =>
      defaultPreset.itemIds.includes(item.id)
    );
  }, [initialItems]);

  // 2. Form States
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [orderNotes, setOrderNotes] = useState('');

  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [outOfStockError, setOutOfStockError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<OrderDetail | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const totalPrice = useMemo(() => {
    return buildItems.reduce((acc, item) => acc + item.price, 0);
  }, [buildItems]);

  // 3. Form Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!customerName.trim()) {
      newErrors.customerName = 'Vui lòng nhập họ và tên người nhận.';
    }

    if (!customerPhone.trim()) {
      newErrors.customerPhone = 'Vui lòng nhập số điện thoại.';
    } else if (!PHONE_REGEX.test(customerPhone.trim())) {
      newErrors.customerPhone = 'Số điện thoại không hợp lệ (cần 10 chữ số chuẩn Việt Nam).';
    }

    if (!customerEmail.trim()) {
      newErrors.customerEmail = 'Vui lòng nhập địa chỉ email.';
    } else if (!EMAIL_REGEX.test(customerEmail.trim())) {
      newErrors.customerEmail = 'Định dạng email không hợp lệ.';
    }

    if (!shippingAddress.trim()) {
      newErrors.shippingAddress = 'Vui lòng nhập địa chỉ nhận hàng chi tiết.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 4. Submit Order
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOutOfStockError(null);

    if (isSubmitting) return; // Prevent double submit

    if (!validateForm()) {
      return;
    }

    if (buildItems.length === 0) {
      setOutOfStockError('Giỏ hàng chưa có linh kiện nào. Vui lòng quay lại chọn cấu hình.');
      return;
    }

    setIsSubmitting(true);

    try {
      const order = await submitOrder({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        shippingAddress: shippingAddress.trim(),
        items: buildItems.map((item) => ({
          hardwareId: item.id,
          quantity: 1,
        })),
      });

      setCompletedOrder(order);
      if (onOrderSuccess) {
        onOrderSuccess(order);
      }
    } catch (err: any) {
      if (err instanceof OutOfStockError || err?.code === 'OUT_OF_STOCK') {
        setOutOfStockError(
          err.message || 'Một hoặc nhiều linh kiện trong cấu hình vừa hết hàng trong kho. Vui lòng kiểm tra lại!'
        );
      } else {
        setOutOfStockError(err.message || 'Đã xảy ra lỗi khi tạo đơn hàng. Vui lòng thử lại sau.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyOrderCode = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleNavigateBack = () => {
    if (onBackToBuilder) {
      onBackToBuilder();
    } else if (typeof window !== 'undefined') {
      window.location.href = '/builder';
    }
  };

  // 5. Render Order Success View
  if (completedOrder) {
    return (
      <MainLayout>
        <div className="checkout-success-container">
          <div className="checkout-success-card">
            <div className="success-icon-badge">✓</div>
            <h2 className="success-title">ĐẶT HÀNG THÀNH CÔNG & ĐÃ KHÓA KHO</h2>
            <p className="success-subtitle">
              Mã đơn hàng: <strong className="order-id-highlight">{completedOrder.id}</strong>
            </p>
            <div className="stock-lock-notice">
              🔒 Linh kiện đã được khóa tạm thời trong 15 phút để đảm bảo đơn hàng của bạn.
            </div>

            {/* Bank Transfer QR Box (VietQR Cyberpunk Simulation) */}
            {paymentMethod === 'BANK_TRANSFER' && (
              <div className="vietqr-box">
                <div className="vietqr-header">
                  <span className="vietqr-title">THANH TOÁN CHUYỂN KHOẢN VIETQR</span>
                  <span className="vietqr-badge">TỰ ĐỘNG XÁC NHẬN 24/7</span>
                </div>

                <div className="vietqr-body">
                  <div className="vietqr-code-art">
                    {/* Stylized Cyberpunk QR Code Placeholder */}
                    <div className="qr-matrix">
                      <div className="qr-finder top-left" />
                      <div className="qr-finder top-right" />
                      <div className="qr-finder bottom-left" />
                      <div className="qr-center-brand">CYBERRIG</div>
                    </div>
                  </div>

                  <div className="vietqr-info">
                    <div className="qr-info-row">
                      <span className="qr-label">Ngân hàng:</span>
                      <span className="qr-val">Vietcombank (Hội Sở Chính)</span>
                    </div>
                    <div className="qr-info-row">
                      <span className="qr-label">Số tài khoản:</span>
                      <span className="qr-val highlight">99281004889</span>
                    </div>
                    <div className="qr-info-row">
                      <span className="qr-label">Chủ tài khoản:</span>
                      <span className="qr-val">CONG TY CP CYBERRIG VIETNAM</span>
                    </div>
                    <div className="qr-info-row">
                      <span className="qr-label">Số tiền:</span>
                      <span className="qr-val amount">{formatCurrency(completedOrder.totalAmount)}</span>
                    </div>
                    <div className="qr-info-row">
                      <span className="qr-label">Nội dung CK:</span>
                      <span className="qr-val code-box">
                        <code>{completedOrder.id}</code>
                        <button
                          type="button"
                          className="copy-btn"
                          onClick={() => handleCopyOrderCode(completedOrder.id)}
                        >
                          {copiedCode ? '✓ Đã chép' : '📋 Chép'}
                        </button>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Spec Sheet Embedded in Success Screen */}
            <div className="success-spec-sheet-wrapper">
              <BuildSpecSheetCard
                items={buildItems}
                totalPrice={completedOrder.totalAmount}
                orderId={completedOrder.id}
                customerInfo={{
                  name: completedOrder.customerName,
                  phone: completedOrder.customerPhone || customerPhone,
                  email: completedOrder.customerEmail || customerEmail,
                  address: completedOrder.shippingAddress || shippingAddress,
                }}
              />
            </div>

            {/* Action Buttons */}
            <div className="success-actions-row no-print">
              <button
                type="button"
                className="action-btn secondary"
                onClick={handleNavigateBack}
              >
                ← Dựng cấu hình khác
              </button>
              <button
                type="button"
                className="action-btn primary"
                onClick={() => window.print()}
              >
                🖨️ In hóa đơn & Bản kê (PDF)
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // 6. Main Checkout Split-View Layout
  return (
    <MainLayout>
      <div className="cyber-checkout-page-root">
        {/* Page Title Breadcrumb */}
        <div className="checkout-top-header">
          <button
            type="button"
            className="checkout-back-link"
            onClick={handleNavigateBack}
          >
            ← Quay lại PC Builder
          </button>
          <h1 className="checkout-main-title">XÁC NHẬN ĐƠN HÀNG & THANH TOÁN</h1>
          <p className="checkout-main-desc">
            Kiểm tra thông số kỹ thuật cấu hình và điền địa chỉ để khóa tạm kho linh kiện
          </p>
        </div>

        {/* Out of Stock Error Banner */}
        {outOfStockError && (
          <div className="checkout-error-banner" role="alert">
            <div className="error-banner-icon">⚠️</div>
            <div className="error-banner-content">
              <div className="error-banner-title">KHÔNG THỂ ĐẶT HÀNG - HẾT HÀNG TRONG KHO</div>
              <p className="error-banner-desc">{outOfStockError}</p>
            </div>
            <button
              type="button"
              className="error-banner-cta-btn"
              onClick={handleNavigateBack}
            >
              Quay lại Builder để đổi linh kiện
            </button>
          </div>
        )}

        {/* Split View Container */}
        <div className="checkout-split-view">
          {/* CỘT TRÁI: FORM GIAO HÀNG & PHƯƠNG THỨC THANH TOÁN */}
          <div className="checkout-form-column">
            <form onSubmit={handleSubmitOrder} noValidate>
              {/* Card 1: Thông tin người nhận */}
              <div className="checkout-card">
                <div className="checkout-card-header">
                  <span className="card-header-icon">📍</span>
                  <h2 className="card-header-title">1. ĐỊA CHỈ NHẬN HÀNG</h2>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Họ và tên người nhận <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className={`cyber-input ${errors.customerName ? 'is-invalid' : ''}`}
                    placeholder="Nguyễn Văn An"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (errors.customerName) setErrors({ ...errors, customerName: '' });
                    }}
                  />
                  {errors.customerName && <span className="form-error">{errors.customerName}</span>}
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label">
                      Số điện thoại <span className="required">*</span>
                    </label>
                    <input
                      type="tel"
                      className={`cyber-input ${errors.customerPhone ? 'is-invalid' : ''}`}
                      placeholder="0901234567"
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value);
                        if (errors.customerPhone) setErrors({ ...errors, customerPhone: '' });
                      }}
                    />
                    {errors.customerPhone && <span className="form-error">{errors.customerPhone}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      Địa chỉ Email <span className="required">*</span>
                    </label>
                    <input
                      type="email"
                      className={`cyber-input ${errors.customerEmail ? 'is-invalid' : ''}`}
                      placeholder="an.nguyen@example.com"
                      value={customerEmail}
                      onChange={(e) => {
                        setCustomerEmail(e.target.value);
                        if (errors.customerEmail) setErrors({ ...errors, customerEmail: '' });
                      }}
                    />
                    {errors.customerEmail && <span className="form-error">{errors.customerEmail}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Địa chỉ nhận hàng chi tiết <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className={`cyber-input ${errors.shippingAddress ? 'is-invalid' : ''}`}
                    placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành"
                    value={shippingAddress}
                    onChange={(e) => {
                      setShippingAddress(e.target.value);
                      if (errors.shippingAddress) setErrors({ ...errors, shippingAddress: '' });
                    }}
                  />
                  {errors.shippingAddress && (
                    <span className="form-error">{errors.shippingAddress}</span>
                  )}
                </div>
              </div>

              {/* Card 2: Phương thức thanh toán */}
              <div className="checkout-card">
                <div className="checkout-card-header">
                  <span className="card-header-icon">💳</span>
                  <h2 className="card-header-title">2. PHƯƠNG THỨC THANH TOÁN</h2>
                </div>

                <div className="payment-options-grid">
                  <label
                    className={`payment-option-pill ${
                      paymentMethod === 'BANK_TRANSFER' ? 'is-selected' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="BANK_TRANSFER"
                      checked={paymentMethod === 'BANK_TRANSFER'}
                      onChange={() => setPaymentMethod('BANK_TRANSFER')}
                    />
                    <div className="pill-content">
                      <div className="pill-title">Chuyển khoản QR Ngân hàng (VietQR)</div>
                      <div className="pill-desc">Khóa kho ưu tiên, quét mã QR tự động xác nhận trong 30s</div>
                    </div>
                    <span className="pill-badge">KHUYÊN DÙNG</span>
                  </label>

                  <label
                    className={`payment-option-pill ${
                      paymentMethod === 'COD' ? 'is-selected' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="COD"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                    />
                    <div className="pill-content">
                      <div className="pill-title">Thanh toán khi nhận hàng (COD)</div>
                      <div className="pill-desc">Kiểm tra linh kiện và thanh toán tiền mặt với shipper</div>
                    </div>
                  </label>

                  <label
                    className={`payment-option-pill ${
                      paymentMethod === 'E_WALLET' ? 'is-selected' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="E_WALLET"
                      checked={paymentMethod === 'E_WALLET'}
                      onChange={() => setPaymentMethod('E_WALLET')}
                    />
                    <div className="pill-content">
                      <div className="pill-title">Ví điện tử (MoMo / ZaloPay)</div>
                      <div className="pill-desc">Thanh toán qua cổng ví điện tử trực tuyến</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Card 3: Ghi chú đơn hàng */}
              <div className="checkout-card">
                <div className="checkout-card-header">
                  <span className="card-header-icon">📝</span>
                  <h2 className="card-header-title">3. DỊCH VỤ & GHI CHÚ BỔ SUNG</h2>
                </div>

                <div className="form-group">
                  <textarea
                    className="cyber-textarea"
                    rows={3}
                    placeholder="Yêu cầu lắp ráp máy hoàn thiện, cài đặt sẵn Windows/driver, cập nhật BIOS mới nhất..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Submit CTA Button on Mobile View */}
              <div className="mobile-submit-box">
                <button
                  type="submit"
                  className="cyber-checkout-submit-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <HexSpinner size="sm" label="Đang khóa kho..." />
                  ) : (
                    <>
                      <span>⚡ XÁC NHẬN ĐẶT HÀNG & KHÓA KHO</span>
                      <span>({formatCurrency(totalPrice)})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* CỘT PHẢI: BẢN KÊ CẤU HÌNH & TỔNG THANH TOÁN */}
          <div className="checkout-summary-column">
            <div className="sticky-summary-wrapper">
              <BuildSpecSheetCard
                items={buildItems}
                totalPrice={totalPrice}
                customerInfo={{
                  name: customerName,
                  phone: customerPhone,
                  email: customerEmail,
                  address: shippingAddress,
                }}
              />

              {/* Financial Pricing Breakdown Box */}
              <div className="pricing-breakdown-card">
                <div className="pricing-row">
                  <span className="pricing-label">Tạm tính linh kiện:</span>
                  <span className="pricing-val">{formatCurrency(totalPrice)}</span>
                </div>
                <div className="pricing-row">
                  <span className="pricing-label">Phí vận chuyển toàn quốc:</span>
                  <span className="pricing-val text-free">MIỄN PHÍ</span>
                </div>
                <div className="pricing-row">
                  <span className="pricing-label">Công lắp ráp & Cập nhật BIOS:</span>
                  <span className="pricing-val text-free">TẶNG KÈM</span>
                </div>

                <div className="pricing-divider" />

                <div className="pricing-total-row">
                  <span className="total-title">TỔNG THANH TOÁN:</span>
                  <span className="total-price-highlight">{formatCurrency(totalPrice)}</span>
                </div>

                {/* Desktop Primary CTA Button */}
                <button
                  type="button"
                  className="cyber-checkout-submit-btn desktop-only"
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <HexSpinner size="sm" label="Đang khóa tồn kho..." />
                  ) : (
                    <>
                      <span>⚡ XÁC NHẬN ĐẶT HÀNG & KHÓA KHO</span>
                      <span>→</span>
                    </>
                  )}
                </button>

                <div className="checkout-policy-notes">
                  🔒 Đơn hàng được giữ chỗ trong 15 phút. Bạn có thể kiểm tra hàng trước khi thanh toán.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CheckoutPage;
