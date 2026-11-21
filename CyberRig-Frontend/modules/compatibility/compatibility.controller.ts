/**
 * Compatibility REST API Controller
 * Handles hardware configuration validation endpoints.
 */

import { Request, Response, NextFunction } from 'express';
import { compatibilityService } from './compatibility.service';

export class CompatibilityController {
  /**
   * POST /api/compatibility/validate
   * Validates hardware configuration against Socket, RAM, Power, and Clearance rules.
   */
  async validate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { items } = req.body;
      const hardwareItems = Array.isArray(items) ? items : [];

      const result = compatibilityService.validateBuild(hardwareItems);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const compatibilityController = new CompatibilityController();
export default compatibilityController;
