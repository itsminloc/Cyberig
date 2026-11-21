/**
 * Admin Control Center & Inventory Hub Component (Task FE-10 / Sprint 5)
 * Dedicated command portal for role 'ADMIN' to manage hardware catalog,
 * monitor low stock telemetry, restock inventory, and soft-delete items.
 * Wrapped by AdminRoute and styled in Cyberpunk Control Room aesthetic.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../CyberRig-Frontend/src/context/AuthContext';
import { AdminRoute } from '../../../CyberRig-Frontend/src/components/auth/AdminRoute';
import {
  adminService,
  NewHardwareDto,
  RestockHardwareDto,
  HardwareCategory,
  HardwareItem,
} from './admin.service';
import {
  HARDWARE_CATEGORIES,
  formatVND,
  getStockStatusMeta,
  calculateKpis,
  validateNewHardware,
  validateRestock,
} from './admin-control-center.utils';
import './AdminControlCenterPage.css';

export const AdminControlCenterContent: React.FC = () => {
  const { user } = useAuth();

  // Inventory State
  const [items, setItems] = useState<HardwareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');

  // Modal State: Create New Hardware
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState<Partial<NewHardwareDto>>({
    categoryId: 'CPU',
    name: '',
    brand: '',
    model: '',
    price: 0,
    stockQuantity: 10,
    specs: {},
  });
  const [addSpecsText, setAddSpecsText] = useState('{\n  "socket": "LGA1700",\n  "tdp": 125\n}');
  const [addError, setAddError] = useState<string | null>(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Modal State: Restock & Reprice
  const [restockItem, setRestockItem] = useState<HardwareItem | null>(null);
  const [addStockValue, setAddStockValue] = useState<number>(5);
  const [newPriceValue, setNewPriceValue] = useState<string>('');
  const [restockError, setRestockError] = useState<string | null>(null);
  const [isSubmittingRestock, setIsSubmittingRestock] = useState(false);

  // Delete Confirm State
  const [itemToDelete, setItemToDelete] = useState<HardwareItem | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Fetch Inventory Data
  const loadHardwareCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.fetchAdminHardware();
      setItems(data || []);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh mục linh kiện kho.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHardwareCatalog();
  }, [loadHardwareCatalog]);

  // Real-time Search & Category Filtering
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Category filter
      if (selectedCategory !== 'ALL' && item.categoryId !== selectedCategory) {
        return false;
      }
      // 2. Search query (name, brand, model)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = item.name?.toLowerCase().includes(query);
        const matchBrand = item.brand?.toLowerCase().includes(query);
        const matchModel = item.model?.toLowerCase().includes(query);
        if (!matchName && !matchBrand && !matchModel) return false;
      }
      // 3. Stock filter
      if (stockFilter === 'LOW') {
        return item.stockQuantity > 0 && item.stockQuantity <= 2;
      }
      if (stockFilter === 'OUT') {
        return item.stockQuantity <= 0;
      }
      return true;
    });
  }, [items, selectedCategory, searchQuery, stockFilter]);

  // Calculate Real-time KPIs
  const kpiData = useMemo(() => calculateKpis(items), [items]);

  // Handle Add Form Submission
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    let parsedSpecs: Record<string, unknown> = {};
    if (addSpecsText.trim()) {
      try {
        parsedSpecs = JSON.parse(addSpecsText);
      } catch {
        setAddError('Thông số kỹ thuật JSON không hợp lệ. Vui lòng kiểm tra lại cú pháp.');
        return;
      }
    }

    const payload: NewHardwareDto = {
      categoryId: addForm.categoryId || 'CPU',
      name: addForm.name || '',
      brand: addForm.brand || '',
      model: addForm.model?.trim() || undefined,
      price: Number(addForm.price) || 0,
      stockQuantity: Number(addForm.stockQuantity) || 0,
      specs: parsedSpecs,
      isActive: true,
    };

    const validation = validateNewHardware(payload);
    if (!validation.isValid) {
      setAddError(validation.error || 'Dữ liệu nhập không hợp lệ.');
      return;
    }

    setIsSubmittingAdd(true);
    try {
      const created = await adminService.createHardwareItem(payload);
      setItems((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      setAddForm({
        categoryId: 'CPU',
        name: '',
        brand: '',
        model: '',
        price: 0,
        stockQuantity: 10,
        specs: {},
      });
      setAddSpecsText('{}');
    } catch (err: any) {
      setAddError(err?.message || 'Không thể tạo mới linh kiện.');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Handle Restock & Reprice Submission
  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockItem) return;
    setRestockError(null);

    const parsedAddStock = Number(addStockValue);
    const parsedNewPrice = newPriceValue.trim() ? Number(newPriceValue) : undefined;

    const validation = validateRestock(parsedAddStock, parsedNewPrice);
    if (!validation.isValid) {
      setRestockError(validation.error || 'Dữ liệu không hợp lệ.');
      return;
    }

    setIsSubmittingRestock(true);
    try {
      const updated = await adminService.updateStockAndPrice(restockItem.id, {
        addStock: parsedAddStock,
        newPrice: parsedNewPrice,
      });

      setItems((prev) =>
        prev.map((it) => (it.id === updated.id ? { ...it, ...updated } : it))
      );
      setRestockItem(null);
    } catch (err: any) {
      setRestockError(err?.message || 'Không thể cập nhật tồn kho & giá bán.');
    } finally {
      setIsSubmittingRestock(false);
    }
  };

  // Handle Soft Delete
  const handleSoftDelete = async () => {
    if (!itemToDelete) return;
    setIsSubmittingDelete(true);
    try {
      await adminService.softDeleteHardwareItem(itemToDelete.id);
      // Remove or mark inactive
      setItems((prev) => prev.filter((it) => it.id !== itemToDelete.id));
      setItemToDelete(null);
    } catch (err: any) {
      setError(err?.message || 'Không thể ngừng bán linh kiện.');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  return (
    <div className="cyber-admin-page-root">
      <div className="cyber-admin-container">
        {/* 1. Header & Admin Command HUD */}
        <header className="cyber-admin-header">
          <div className="cyber-admin-header-row">
            <div className="cyber-admin-brand-box">
              <div className="cyber-admin-shield-icon">🛡️</div>
              <div className="cyber-admin-title-meta">
                <span className="cyber-admin-badge-line">SECURITY CLEARANCE LEVEL-3 // MATRIX ROOT</span>
                <h1 className="cyber-admin-main-title">
                  ADMIN COMMAND CORE // USER: {user?.fullName || user?.email}
                </h1>
              </div>
            </div>
            <div>
              <span className="cyber-admin-role-pill">ROLE: ADMIN</span>
            </div>
          </div>

          {/* KPI Telemetry Cards */}
          <div className="cyber-kpi-grid">
            {/* Card 1: Total hardware */}
            <div className="cyber-kpi-card" id="kpi-total-items">
              <span className="cyber-kpi-icon">📦</span>
              <div className="cyber-kpi-data">
                <span className="cyber-kpi-val">{kpiData.totalItems}</span>
                <span className="cyber-kpi-label">Tổng Mặt Hàng Trong Kho</span>
              </div>
            </div>

            {/* Card 2: Low Stock Warning */}
            <div
              className={`cyber-kpi-card ${kpiData.lowStockCount > 0 ? 'is-danger' : ''}`}
              id="kpi-low-stock"
            >
              <span className="cyber-kpi-icon">⚠️</span>
              <div className="cyber-kpi-data">
                <span className="cyber-kpi-val">{kpiData.lowStockCount}</span>
                <span className="cyber-kpi-label">Cảnh Báo Tồn Kho Thấp (≤ 2)</span>
              </div>
            </div>

            {/* Card 3: Total estimated inventory value */}
            <div className="cyber-kpi-card is-green" id="kpi-inventory-value">
              <span className="cyber-kpi-icon">💎</span>
              <div className="cyber-kpi-data">
                <span className="cyber-kpi-val">{formatVND(kpiData.totalInventoryValue)}</span>
                <span className="cyber-kpi-label">Tổng Giá Trị Tồn Kho Ước Tính</span>
              </div>
            </div>
          </div>
        </header>

        {/* 2. Toolbar: Search, Filters, Stock Toggle & CTA */}
        <section className="cyber-admin-toolbar">
          <div className="cyber-toolbar-left">
            {/* Search Input */}
            <div className="cyber-search-box">
              <span className="cyber-search-icon">🔍</span>
              <input
                type="text"
                className="cyber-search-input"
                placeholder="Tìm theo tên linh kiện, thương hiệu, mã..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                id="admin-search-input"
              />
            </div>

            {/* Category Dropdown */}
            <select
              className="cyber-filter-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              id="admin-category-filter"
            >
              {HARDWARE_CATEGORIES.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.label}
                </option>
              ))}
            </select>

            {/* Stock State Filter */}
            <select
              className="cyber-filter-select"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              id="admin-stock-filter"
            >
              <option value="ALL">Tất cả trạng thái tồn kho</option>
              <option value="LOW">Cảnh báo sắp hết (≤ 2 chiếc)</option>
              <option value="OUT">Hết hàng (0 chiếc)</option>
            </select>
          </div>

          <div>
            <button
              type="button"
              className="cyber-btn-add-hardware"
              onClick={() => {
                setIsAddModalOpen(true);
                setAddError(null);
              }}
              id="btn-open-add-modal"
            >
              <span>+ THÊM LINH KIỆN MỚI</span>
            </button>
          </div>
        </section>

        {/* Global Error Banner if any */}
        {error && (
          <div className="cyber-modal-alert is-error" style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {/* 3. Hardware Data Grid Table */}
        <div className="cyber-grid-wrapper">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#00f0ff' }}>
              ĐANG QUÉT VÀ ĐỒNG BỘ DỮ LIỆU KHO PHẦN CỨNG...
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              Không tìm thấy linh kiện nào khớp với bộ lọc tìm kiếm.
            </div>
          ) : (
            <table className="cyber-admin-table" id="admin-hardware-table">
              <thead>
                <tr>
                  <th>Mã Linh Kiện</th>
                  <th>Tên Linh Kiện</th>
                  <th>Chủng Loại</th>
                  <th>Thương Hiệu</th>
                  <th>Giá Niêm Yết</th>
                  <th>Tồn Kho</th>
                  <th>Trạng Thái</th>
                  <th style={{ textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const stockMeta = getStockStatusMeta(item.stockQuantity);
                  return (
                    <tr key={item.id} id={`row-hardware-${item.id}`}>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', color: '#94a3b8' }}>
                          #{item.id.substring(0, 8)}
                        </span>
                      </td>
                      <td>
                        <div className="cyber-item-name">
                          <span>{item.name}</span>
                          {item.model && <span className="cyber-item-model">Model: {item.model}</span>}
                        </div>
                      </td>
                      <td>
                        <span className="cyber-cat-pill">{item.categoryId}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{item.brand}</span>
                      </td>
                      <td>
                        <span className="cyber-price-tag">{formatVND(item.price)}</span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'Orbitron', fontWeight: 700, fontSize: '1rem', color: '#fff' }}>
                          {item.stockQuantity}
                        </span>
                      </td>
                      <td>
                        <span className={`cyber-stock-badge ${stockMeta.className}`}>
                          {stockMeta.label}
                        </span>
                      </td>
                      <td>
                        <div className="cyber-actions-cell" style={{ justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="cyber-btn-restock"
                            onClick={() => {
                              setRestockItem(item);
                              setAddStockValue(5);
                              setNewPriceValue(String(item.price));
                              setRestockError(null);
                            }}
                            id={`btn-restock-${item.id}`}
                          >
                            ⚡ Nhập Kho / Đổi Giá
                          </button>
                          <button
                            type="button"
                            className="cyber-btn-delete"
                            onClick={() => setItemToDelete(item)}
                            id={`btn-delete-${item.id}`}
                          >
                            ⛔ Ngừng Bán
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ==================================================================
            Modal 1: Thêm Mới Linh Kiện (POST /api/admin/hardware)
           ================================================================== */}
        {isAddModalOpen && (
          <div className="cyber-modal-overlay" onClick={() => setIsAddModalOpen(false)}>
            <div
              className="cyber-admin-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-labelledby="add-modal-title"
            >
              <button
                type="button"
                className="cyber-modal-close-btn"
                onClick={() => setIsAddModalOpen(false)}
              >
                ✕
              </button>

              <div className="cyber-modal-header">
                <div className="cyber-modal-badge">DATABASE INVENTORY INJECTION // MATRIX-IN</div>
                <h2 className="cyber-modal-title" id="add-modal-title">
                  THÊM MỚI LINH KIỆN VÀO KHO
                </h2>
              </div>

              {addError && <div className="cyber-modal-alert is-error">{addError}</div>}

              <form onSubmit={handleCreateSubmit} id="form-create-hardware">
                <div className="cyber-form-row">
                  <div className="cyber-form-group">
                    <label className="cyber-form-label" htmlFor="input-new-cat">
                      Danh Mục Linh Kiện *
                    </label>
                    <select
                      id="input-new-cat"
                      className="cyber-form-select"
                      value={addForm.categoryId}
                      onChange={(e) => setAddForm({ ...addForm, categoryId: e.target.value })}
                      required
                    >
                      {HARDWARE_CATEGORIES.filter((c) => c.key !== 'ALL').map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="cyber-form-group">
                    <label className="cyber-form-label" htmlFor="input-new-brand">
                      Thương Hiệu / Hãng *
                    </label>
                    <input
                      type="text"
                      id="input-new-brand"
                      className="cyber-form-input"
                      placeholder="VD: ASUS, MSI, Corsair..."
                      value={addForm.brand}
                      onChange={(e) => setAddForm({ ...addForm, brand: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="cyber-form-group">
                  <label className="cyber-form-label" htmlFor="input-new-name">
                    Tên Linh Kiện Đầy Đủ *
                  </label>
                  <input
                    type="text"
                    id="input-new-name"
                    className="cyber-form-input"
                    placeholder="VD: ASUS ROG Strix GeForce RTX 4080 OC 16GB"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="cyber-form-row">
                  <div className="cyber-form-group">
                    <label className="cyber-form-label" htmlFor="input-new-model">
                      Model / Part Number
                    </label>
                    <input
                      type="text"
                      id="input-new-model"
                      className="cyber-form-input"
                      placeholder="VD: ROG-STRIX-RTX4080-O16G"
                      value={addForm.model || ''}
                      onChange={(e) => setAddForm({ ...addForm, model: e.target.value })}
                    />
                  </div>

                  <div className="cyber-form-group">
                    <label className="cyber-form-label" htmlFor="input-new-price">
                      Giá Niêm Yết (VNĐ) *
                    </label>
                    <input
                      type="number"
                      id="input-new-price"
                      className="cyber-form-input"
                      placeholder="VD: 31500000"
                      value={addForm.price || ''}
                      onChange={(e) => setAddForm({ ...addForm, price: Number(e.target.value) })}
                      min="1000"
                      required
                    />
                  </div>

                  <div className="cyber-form-group">
                    <label className="cyber-form-label" htmlFor="input-new-stock">
                      Tồn Kho Ban Đầu *
                    </label>
                    <input
                      type="number"
                      id="input-new-stock"
                      className="cyber-form-input"
                      placeholder="VD: 10"
                      value={addForm.stockQuantity !== undefined ? addForm.stockQuantity : ''}
                      onChange={(e) =>
                        setAddForm({ ...addForm, stockQuantity: Number(e.target.value) })
                      }
                      min="0"
                      required
                    />
                  </div>
                </div>

                <div className="cyber-form-group">
                  <label className="cyber-form-label" htmlFor="input-new-specs">
                    Thông Số Kỹ Thuật (Specs JSON)
                  </label>
                  <textarea
                    id="input-new-specs"
                    className="cyber-form-textarea"
                    rows={4}
                    value={addSpecsText}
                    onChange={(e) => setAddSpecsText(e.target.value)}
                    placeholder='{"socket": "AM5", "vram": "16GB"}'
                  />
                </div>

                <button
                  type="submit"
                  className="cyber-modal-submit-btn"
                  disabled={isSubmittingAdd}
                  id="btn-submit-create"
                >
                  {isSubmittingAdd ? 'Đang Xử Lý...' : '✓ Xác Nhận Thêm Vào Danh Mục'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ==================================================================
            Modal 2: Nhập Kho & Cập Nhật Giá (PATCH /stock)
           ================================================================== */}
        {restockItem && (
          <div className="cyber-modal-overlay" onClick={() => setRestockItem(null)}>
            <div
              className="cyber-admin-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-labelledby="restock-modal-title"
            >
              <button
                type="button"
                className="cyber-modal-close-btn"
                onClick={() => setRestockItem(null)}
              >
                ✕
              </button>

              <div className="cyber-modal-header">
                <div className="cyber-modal-badge">STOCK INCREMENT // REPRICE PROTOCOL</div>
                <h2 className="cyber-modal-title" id="restock-modal-title">
                  NHẬP KHO & ĐIỀU CHỈNH GIÁ BÁN
                </h2>
                <div style={{ color: '#00f0ff', marginTop: '4px', fontWeight: 600 }}>
                  {restockItem.name}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  Hiện tại trong kho: <strong>{restockItem.stockQuantity}</strong> chiếc | Giá hiện hành:{' '}
                  <strong>{formatVND(restockItem.price)}</strong>
                </div>
              </div>

              {restockError && <div className="cyber-modal-alert is-error">{restockError}</div>}

              <form onSubmit={handleRestockSubmit} id="form-restock-hardware">
                <div className="cyber-form-group">
                  <label className="cyber-form-label" htmlFor="input-restock-add">
                    Số Lượng Nhập Thêm (Cộng Dồn) *
                  </label>
                  <input
                    type="number"
                    id="input-restock-add"
                    className="cyber-form-input"
                    placeholder="VD: 5"
                    value={addStockValue}
                    onChange={(e) => setAddStockValue(Number(e.target.value))}
                    min="0"
                    required
                  />
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                    Tồn kho sau khi nhập:{' '}
                    <span style={{ color: '#00ff66', fontWeight: 700 }}>
                      {restockItem.stockQuantity + (Number(addStockValue) || 0)}
                    </span>{' '}
                    chiếc
                  </div>
                </div>

                <div className="cyber-form-group">
                  <label className="cyber-form-label" htmlFor="input-restock-price">
                    Giá Bán Mới (VNĐ) (Để trống nếu giữ nguyên)
                  </label>
                  <input
                    type="number"
                    id="input-restock-price"
                    className="cyber-form-input"
                    placeholder={`Giữ nguyên: ${restockItem.price}`}
                    value={newPriceValue}
                    onChange={(e) => setNewPriceValue(e.target.value)}
                    min="1000"
                  />
                </div>

                <button
                  type="submit"
                  className="cyber-modal-submit-btn"
                  disabled={isSubmittingRestock}
                  id="btn-submit-restock"
                >
                  {isSubmittingRestock ? 'Đang Xử Lý...' : '✓ Xác Nhận Nhập Kho & Cập Nhật Giá'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ==================================================================
            Modal 3: Xác Nhận Ngừng Bán (DELETE /:id)
           ================================================================== */}
        {itemToDelete && (
          <div className="cyber-modal-overlay" onClick={() => setItemToDelete(null)}>
            <div
              className="cyber-admin-modal"
              style={{ maxWidth: '480px' }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
            >
              <div className="cyber-modal-header">
                <div className="cyber-modal-badge">SYSTEM DECOMMISSION // SOFT DELETE</div>
                <h2 className="cyber-modal-title" style={{ color: '#ff003c' }}>
                  XÁC NHẬN NGỪNG BÁN
                </h2>
              </div>

              <p style={{ fontSize: '0.92rem', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                Bạn có chắc chắn muốn ngừng kinh doanh linh kiện{' '}
                <strong style={{ color: '#ffffff' }}>"{itemToDelete.name}"</strong>?
                <br />
                <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  Hành động này sẽ ẩn sản phẩm khỏi danh mục bán hàng công khai (Soft Delete) và bảo toàn lịch sử các đơn hàng cũ.
                </span>
              </p>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="cyber-btn-delete"
                  style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.05)', color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}
                  onClick={() => setItemToDelete(null)}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  className="cyber-modal-submit-btn"
                  style={{ width: 'auto', padding: '0.75rem 1.5rem' }}
                  disabled={isSubmittingDelete}
                  onClick={handleSoftDelete}
                  id="btn-confirm-delete"
                >
                  {isSubmittingDelete ? 'Đang Xử Lý...' : 'Xác Nhận Ngừng Bán'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const AdminControlCenterPage: React.FC = () => {
  return (
    <AdminRoute redirectTo="/dashboard">
      <AdminControlCenterContent />
    </AdminRoute>
  );
};

export default AdminControlCenterPage;
