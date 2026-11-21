/**
 * Compatibility Express Routes
 * Mounts endpoints on /api/compatibility
 */

import { Router } from 'express';
import { compatibilityController } from './compatibility.controller';

export const compatibilityRouter: Router = Router();

compatibilityRouter.post('/validate', compatibilityController.validate.bind(compatibilityController));

export default compatibilityRouter;
