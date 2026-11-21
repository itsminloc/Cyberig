/**
 * Compatibility Rules Interface & Types
 * Defined in accordance with Task BE-04 specification.
 */

import { HardwareItem } from '../../hardware/hardware.model';

export type CompatibilityStatus = 'COMPATIBLE' | 'WARNING' | 'INCOMPATIBLE';
export type RuleCategory = 'SOCKET' | 'RAM' | 'POWER' | 'CLEARANCE';
export type IssueSeverity = 'ERROR' | 'WARNING';

export interface CompatibilityIssue {
  type: IssueSeverity;
  rule: RuleCategory;
  message: string;
}

export interface CompatibilityResult {
  status: CompatibilityStatus;
  totalEstimatedWattage: number;
  recommendedPsuWattage: number;
  issues: Array<{
    type: 'ERROR' | 'WARNING';
    rule: 'SOCKET' | 'RAM' | 'POWER' | 'CLEARANCE';
    message: string;
  }>;
}

export interface BuildComponentMap {
  cpu?: HardwareItem;
  motherboard?: HardwareItem;
  ram?: HardwareItem[];
  gpu?: HardwareItem;
  psu?: HardwareItem;
  case?: HardwareItem;
  cooler?: HardwareItem;
  storage?: HardwareItem[];
}

export interface CompatibilityRule {
  rule: RuleCategory;
  validate(build: BuildComponentMap): CompatibilityIssue[];
}

export * from './socket-rule';
export * from './ram-rule';
export * from './power-rule';
export * from './clearance-rule';
