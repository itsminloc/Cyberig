/**
 * Hardware Express Routes
 * Mounts endpoints on /api/hardware
 */

import { Router } from 'express';
import { hardwareController } from './hardware.controller';
import { hardwareRateLimiter } from '../../core/middlewares/rate-limiter.middleware';

export const hardwareRouter: Router = Router();

// Tra cứu danh mục linh kiện (tối đa 120 req/phút)
hardwareRouter.get('/', hardwareRateLimiter, hardwareController.listHardware.bind(hardwareController));
hardwareRouter.get('/:id', hardwareController.getHardwareDetail.bind(hardwareController));

export default hardwareRouter;
