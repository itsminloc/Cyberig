/**
 * Hardware REST API Controller
 * Handles hardware catalog querying, multi-criteria filtering, and detail retrieval.
 * Aligned with Task BE-07 specification.
 */

import { Request, Response, NextFunction } from 'express';
import { hardwareService, HardwareService, HardwareQueryFilter } from './hardware.service';

export class HardwareController {
  constructor(private readonly service: HardwareService = hardwareService) {}

  /**
   * GET /api/hardware
   * Query hardware items with multi-criteria filters and pagination.
   */
  async listHardware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filter: HardwareQueryFilter = {
        category: req.query.category ? String(req.query.category) : undefined,
        brand: req.query.brand ? String(req.query.brand) : undefined,
        minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
        inStockOnly: req.query.inStockOnly === 'true',
        page: req.query.page ? Number(req.query.page) : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
      };

      const result = await this.service.getHardwareItems(filter);

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/hardware/:id
   * Retrieves single hardware item details by ID.
   */
  async getHardwareDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const hardwareItem = await this.service.getHardwareById(id);

      res.status(200).json({
        success: true,
        data: hardwareItem,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const hardwareController = new HardwareController();
export default hardwareController;
