/**
 * Compatibility Domain Service
 * Aggregates all modular compatibility rules (Socket, RAM, Power, Clearance).
 * Implements Task BE-04 requirements.
 */

import { HardwareCategory, HardwareItem } from '../hardware/hardware.model';
import {
  BuildComponentMap,
  CompatibilityIssue,
  CompatibilityResult,
  CompatibilityRule,
  SocketRule,
  RamRule,
  PowerRule,
  ClearanceRule,
  calculateEstimatedWattage,
} from './rules';

export { CompatibilityResult, CompatibilityIssue };

export class CompatibilityService {
  private rules: CompatibilityRule[] = [
    new SocketRule(),
    new RamRule(),
    new PowerRule(),
    new ClearanceRule(),
  ];

  /**
   * Helper: Maps an array of HardwareItems into a structured BuildComponentMap
   */
  mapItemsToBuild(items: HardwareItem[]): BuildComponentMap {
    const build: BuildComponentMap = {};
    const ramItems: HardwareItem[] = [];
    const storageItems: HardwareItem[] = [];

    for (const item of items) {
      switch (item.categoryId) {
        case HardwareCategory.CPU:
          build.cpu = item;
          break;
        case HardwareCategory.MOTHERBOARD:
          build.motherboard = item;
          break;
        case HardwareCategory.RAM:
          ramItems.push(item);
          break;
        case HardwareCategory.GPU:
          build.gpu = item;
          break;
        case HardwareCategory.PSU:
          build.psu = item;
          break;
        case HardwareCategory.CASE:
          build.case = item;
          break;
        case HardwareCategory.COOLER:
          build.cooler = item;
          break;
        case HardwareCategory.STORAGE:
          storageItems.push(item);
          break;
      }
    }

    if (ramItems.length > 0) build.ram = ramItems;
    if (storageItems.length > 0) build.storage = storageItems;

    return build;
  }

  /**
   * Validates a complete custom PC build from an array of HardwareItem components.
   * Runs through Socket, RAM, Power, and Clearance rules.
   */
  validateBuild(items: HardwareItem[]): CompatibilityResult {
    const build = this.mapItemsToBuild(items);
    const issues: CompatibilityIssue[] = [];

    for (const rule of this.rules) {
      const ruleIssues = rule.validate(build);
      issues.push(...ruleIssues);
    }

    const totalEstimatedWattage = calculateEstimatedWattage(build);
    const recommendedPsuWattage = Math.ceil((totalEstimatedWattage * 1.25) / 50) * 50;

    const hasError = issues.some((i) => i.type === 'ERROR');
    const hasWarning = issues.some((i) => i.type === 'WARNING');

    const status = hasError
      ? 'INCOMPATIBLE'
      : hasWarning
      ? 'WARNING'
      : 'COMPATIBLE';

    return {
      status,
      totalEstimatedWattage,
      recommendedPsuWattage,
      issues,
    };
  }

  /**
   * Backward-compatible alias accepting a BuildComponentMap
   */
  async checkBuildCompatibility(build: BuildComponentMap): Promise<CompatibilityResult> {
    const items: HardwareItem[] = [];
    if (build.cpu) items.push(build.cpu);
    if (build.motherboard) items.push(build.motherboard);
    if (build.ram) items.push(...build.ram);
    if (build.gpu) items.push(build.gpu);
    if (build.psu) items.push(build.psu);
    if (build.case) items.push(build.case);
    if (build.cooler) items.push(build.cooler);
    if (build.storage) items.push(...build.storage);

    return this.validateBuild(items);
  }
}

export const compatibilityService = new CompatibilityService();
export default compatibilityService;
