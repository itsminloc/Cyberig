/**
 * Socket Compatibility Rule
 * Checks CPU and Motherboard socket compatibility and VRM throttling on entry-level chipsets.
 */

import { CompatibilityIssue, CompatibilityRule, BuildComponentMap } from './index';
import { CpuSpecs, MotherboardSpecs } from '../../hardware/hardware.model';

const ENTRY_LEVEL_CHIPSETS = ['H610', 'A620', 'A520', 'A320', 'H510', 'H410', 'H310'];

export class SocketRule implements CompatibilityRule {
  rule = 'SOCKET' as const;

  validate(build: BuildComponentMap): CompatibilityIssue[] {
    const issues: CompatibilityIssue[] = [];

    if (build.cpu && build.motherboard) {
      const cpuSpecs = build.cpu.specs as CpuSpecs;
      const mbSpecs = build.motherboard.specs as MotherboardSpecs;

      // 1. Socket Mismatch Check
      if (cpuSpecs.socket && mbSpecs.socket) {
        const normalizedCpuSocket = cpuSpecs.socket.trim().toUpperCase();
        const normalizedMbSocket = mbSpecs.socket.trim().toUpperCase();

        if (normalizedCpuSocket !== normalizedMbSocket) {
          issues.push({
            type: 'ERROR',
            rule: 'SOCKET',
            message: `Socket CPU (${cpuSpecs.socket}) không tương thích với Socket bo mạch chủ (${mbSpecs.socket}).`,
          });
        }
      }

      // 2. High TDP CPU on Entry-Level VRM Warning
      if (cpuSpecs.tdpWatts && cpuSpecs.tdpWatts >= 125 && mbSpecs.chipset) {
        const normalizedChipset = mbSpecs.chipset.trim().toUpperCase();
        const isEntryChipset = ENTRY_LEVEL_CHIPSETS.some((entry) =>
          normalizedChipset.includes(entry)
        );

        if (isEntryChipset) {
          issues.push({
            type: 'WARNING',
            rule: 'SOCKET',
            message: `CPU ${build.cpu.name} có TDP cao (${cpuSpecs.tdpWatts}W) khi đi kèm bo mạch chủ phổ thông (${mbSpecs.chipset}) có thể gây nghẽn hiệu năng hoặc quá nhiệt mạch cấp nguồn VRM.`,
          });
        }
      }
    }

    return issues;
  }
}
