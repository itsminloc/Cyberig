/**
 * Clearance & Dimension Compatibility Rule
 * Checks GPU length against case clearance (including 10mm safety buffer)
 * and CPU air cooler height against case maximum cooler height.
 */

import { CompatibilityIssue, CompatibilityRule, BuildComponentMap } from './index';
import { GpuSpecs, CaseSpecs, CoolerSpecs } from '../../hardware/hardware.model';

export class ClearanceRule implements CompatibilityRule {
  rule = 'CLEARANCE' as const;

  validate(build: BuildComponentMap): CompatibilityIssue[] {
    const issues: CompatibilityIssue[] = [];

    // 1. GPU Length vs Case Max GPU Length (with 10mm safety buffer)
    if (build.gpu && build.case) {
      const gpuSpecs = build.gpu.specs as GpuSpecs;
      const caseSpecs = build.case.specs as CaseSpecs;

      const rawGpu = gpuSpecs as unknown as Record<string, number>;
      const rawCase = caseSpecs as unknown as Record<string, number>;

      const gpuLength = gpuSpecs.lengthMm || rawGpu.gpu_length_mm || 0;
      const caseMaxGpu = caseSpecs.maxGpuLengthMm || rawCase.max_gpu_length_mm || 0;

      if (gpuLength > 0 && caseMaxGpu > 0) {
        const safeClearance = caseMaxGpu - 10;
        if (gpuLength > safeClearance) {
          issues.push({
            type: 'ERROR',
            rule: 'CLEARANCE',
            message: `Chiều dài GPU (${gpuLength}mm) vượt quá khoảng trống lắp đặt an toàn của case (${safeClearance}mm, đã trừ 10mm đệm an toàn / tối đa case ${caseMaxGpu}mm).`,
          });
        }
      }
    }

    // 2. CPU Air Cooler Height vs Case Max CPU Cooler Height
    if (build.cooler && build.case) {
      const coolerSpecs = build.cooler.specs as CoolerSpecs;
      const caseSpecs = build.case.specs as CaseSpecs;

      const rawCooler = coolerSpecs as unknown as Record<string, number>;
      const rawCase = caseSpecs as unknown as Record<string, number>;

      const coolerHeight = coolerSpecs.coolerHeightMm || rawCooler.cooler_height_mm || 0;
      const caseMaxCooler = caseSpecs.maxCpuCoolerHeightMm || rawCase.max_cpu_cooler_height_mm || 0;

      if (coolerHeight > 0 && caseMaxCooler > 0 && coolerHeight > caseMaxCooler) {
        issues.push({
          type: 'ERROR',
          rule: 'CLEARANCE',
          message: `Chiều cao tản nhiệt khí (${coolerHeight}mm) vượt quá giới hạn hỗ trợ tối đa của case (${caseMaxCooler}mm).`,
        });
      }
    }

    return issues;
  }
}
