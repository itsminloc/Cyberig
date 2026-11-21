/**
 * Admin Inventory Control Controller
 * Handles hardware catalog management: creation, restocking, price adjustments, and soft deletion.
 * Aligned with Task BE-PORTALS specification.
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../../core/errors/domain.error';
import { hardwareService } from '../hardware/hardware.service';
import { HardwareCategory } from '../hardware/hardware.model';

export class AdminController {
  /**
   * POST /api/admin/hardware
   * Thêm linh kiện mới vào kho
   */
  async createHardware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category, categoryId, name, brand, model, price, stockQuantity, stock_quantity, specs, specs_json, isActive, is_active } = req.body;

      const resolvedCategory = categoryId || category;
      if (!resolvedCategory || typeof resolvedCategory !== 'string' || !resolvedCategory.trim()) {
        throw new ValidationError('Danh mục linh kiện (category/categoryId) là bắt buộc.');
      }

      const validCategories = Object.values(HardwareCategory);
      if (!validCategories.includes(resolvedCategory.toUpperCase() as HardwareCategory)) {
        throw new ValidationError(
          `Danh mục "${resolvedCategory}" không hợp lệ. Cho phép: ${validCategories.join(', ')}`
        );
      }

      if (!name || typeof name !== 'string' || !name.trim()) {
        throw new ValidationError('Tên linh kiện (name) không được để trống.');
      }

      if (!brand || typeof brand !== 'string' || !brand.trim()) {
        throw new ValidationError('Thương hiệu (brand) không được để trống.');
      }

      const parsedPrice = Number(price);
      if (isNaN(parsedPrice) || parsedPrice <= 0) {
        throw new ValidationError('Giá bán (price) phải là số dương lớn hơn 0.');
      }

      const rawStock = stockQuantity !== undefined ? stockQuantity : stock_quantity;
      const parsedStock = Number(rawStock);
      if (isNaN(parsedStock) || parsedStock < 0) {
        throw new ValidationError('Số lượng tồn kho (stockQuantity) phải là số không âm (>= 0).');
      }

      let parsedSpecs: Record<string, unknown> = {};
      const rawSpecs = specs || specs_json;
      if (typeof rawSpecs === 'string') {
        try {
          parsedSpecs = JSON.parse(rawSpecs);
        } catch {
          throw new ValidationError('Thông số kỹ thuật (specs/specs_json) phải là chuỗi JSON hợp lệ.');
        }
      } else if (typeof rawSpecs === 'object' && rawSpecs !== null) {
        parsedSpecs = rawSpecs as Record<string, unknown>;
      }

      const item = await hardwareService.createHardwareItem({
        categoryId: resolvedCategory.toUpperCase(),
        name: name.trim(),
        brand: brand.trim(),
        model: model ? String(model).trim() : undefined,
        price: parsedPrice,
        stockQuantity: parsedStock,
        specs: parsedSpecs,
        isActive: isActive !== undefined ? Boolean(isActive) : is_active !== undefined ? Boolean(is_active) : true,
      });

      res.status(201).json({
        success: true,
        message: 'Thêm linh kiện mới vào kho thành công.',
        data: item,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/admin/hardware/:id/stock
   * Nhập thêm hàng (Restock) & Cập nhật giá
   */
  async restockHardware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Mã linh kiện ID là bắt buộc.');
      }

      const { addStock, newPrice } = req.body;

      const parsedAddStock = Number(addStock);
      if (addStock === undefined || isNaN(parsedAddStock) || parsedAddStock < 0) {
        throw new ValidationError('Số lượng nhập thêm (addStock) phải là số không âm (>= 0).');
      }

      let parsedNewPrice: number | undefined;
      if (newPrice !== undefined && newPrice !== null) {
        parsedNewPrice = Number(newPrice);
        if (isNaN(parsedNewPrice) || parsedNewPrice <= 0) {
          throw new ValidationError('Giá bán mới (newPrice) phải là số dương lớn hơn 0.');
        }
      }

      const updatedItem = await hardwareService.updateHardwareStock(id, {
        addStock: parsedAddStock,
        newPrice: parsedNewPrice,
      });

      res.status(200).json({
        success: true,
        message: 'Nhập hàng và cập nhật tồn kho thành công.',
        data: updatedItem,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/admin/hardware/:id
   * Ngừng kinh doanh linh kiện (Soft Delete)
   */
  async deleteHardware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id || typeof id !== 'string') {
        throw new ValidationError('Mã linh kiện ID là bắt buộc.');
      }

      const deletedItem = await hardwareService.softDeleteHardware(id);

      res.status(200).json({
        success: true,
        message: 'Linh kiện đã được ngừng kinh doanh thành công (soft delete).',
        data: deletedItem,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();
export default adminController;
