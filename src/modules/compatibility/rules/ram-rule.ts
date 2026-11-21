/**
 * RAM Compatibility Rule
 * Checks RAM generation match (DDR4/DDR5) and physical slot availability.
 */

import { CompatibilityIssue, CompatibilityRule, BuildComponentMap } from './index';
import { RamSpecs, MotherboardSpecs } from '../../hardware/hardware.model';

export class RamRule implements CompatibilityRule {
  rule = 'RAM' as const;

  validate(build: BuildComponentMap): CompatibilityIssue[] {
    const issues: CompatibilityIssue[] = [];

    if (build.ram && build.ram.length > 0 && build.motherboard) {
      const mbSpecs = build.motherboard.specs as MotherboardSpecs;
      let totalRamModules = 0;

      for (const ramItem of build.ram) {
        const ramSpecs = ramItem.specs as RamSpecs;

        // 1. Generation Match Check (DDR4 vs DDR5)
        if (ramSpecs.generation && mbSpecs.ramType) {
          const normalizedRamGen = ramSpecs.generation.trim().toUpperCase();
          const normalizedMbRam = mbSpecs.ramType.trim().toUpperCase();

          if (normalizedRamGen !== normalizedMbRam) {
            issues.push({
              type: 'ERROR',
              rule: 'RAM',
              message: `Chuẩn RAM ${ramSpecs.generation} (${ramItem.name}) không tương thích với bo mạch chủ hỗ trợ ${mbSpecs.ramType} (${build.motherboard.name}).`,
            });
          }
        }

        // Count physical modules (e.g., 2 for 2x16GB kit)
        totalRamModules += ramSpecs.modulesCount || 1;
      }

      // 2. Physical Slots Count Check
      if (mbSpecs.ramSlots && totalRamModules > mbSpecs.ramSlots) {
        issues.push({
          type: 'ERROR',
          rule: 'RAM',
          message: `Tổng số thanh RAM (${totalRamModules} thanh) vượt quá số lượng khe cắm vật lý (${mbSpecs.ramSlots} khe) trên bo mạch chủ ${build.motherboard.name}.`,
        });
      }
    }

    return issues;
  }
}
