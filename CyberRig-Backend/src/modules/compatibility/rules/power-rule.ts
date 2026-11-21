/**
 * Power & PSU Compatibility Rule
 * Formula: Estimated_Wattage = TDP_CPU + TDP_GPU + 50W (Mainboard) + 50W (Linh kiện khác)
 * Validates PSU wattage capacity and 25% safety headroom.
 */

import { CompatibilityIssue, CompatibilityRule, BuildComponentMap } from './index';
import { CpuSpecs, GpuSpecs, PsuSpecs } from '../../hardware/hardware.model';

export function calculateEstimatedWattage(build: BuildComponentMap): number {
  const cpuTdp = build.cpu ? (build.cpu.specs as CpuSpecs).tdpWatts || 65 : 0;
  const gpuTdp = build.gpu ? (build.gpu.specs as GpuSpecs).tdpWatts || 0 : 0;
  const motherboardWattage = build.motherboard ? 50 : 0;
  const peripheralsWattage = 50; // Fans, SSDs, RGB, Chipset

  return cpuTdp + gpuTdp + motherboardWattage + peripheralsWattage;
}

export class PowerRule implements CompatibilityRule {
  rule = 'POWER' as const;

  validate(build: BuildComponentMap): CompatibilityIssue[] {
    const issues: CompatibilityIssue[] = [];
    const estimatedWattage = calculateEstimatedWattage(build);

    if (build.psu) {
      const psuSpecs = build.psu.specs as PsuSpecs;
      const psuWattage = psuSpecs.wattage || 0;
      const safeHeadroomWattage = Math.ceil(estimatedWattage * 1.25);

      if (psuWattage < estimatedWattage) {
        issues.push({
          type: 'ERROR',
          rule: 'POWER',
          message: `Công suất bộ nguồn (${psuWattage}W) nhỏ hơn tổng công suất tiêu thụ ước tính tối đa của hệ thống (${estimatedWattage}W).`,
        });
      } else if (psuWattage < safeHeadroomWattage) {
        issues.push({
          type: 'WARNING',
          rule: 'POWER',
          message: `Công suất nguồn (${psuWattage}W) không đạt mức đệm an toàn 25% khuyến nghị (${safeHeadroomWattage}W) nhằm tránh quá tải khi tải đỉnh.`,
        });
      }
    }

    return issues;
  }
}
