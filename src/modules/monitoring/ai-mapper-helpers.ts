/**
 * AI Data Mapper Types, Catalog Loader & Gemini Client Helpers
 */

import { config } from '../../core/config';
import { hardwareService } from '../hardware/hardware.service';

export type AiEngineMode = 'GEMINI_LLM' | 'TEMPLATE_CACHE' | 'OFFLINE_FALLBACK';

export interface PosResolvedItem {
  sku: string;
  name: string;
  quantity: number;
  unitPriceVnd: number;
  lineTotalVnd: number;
}

export interface AiPosMappedOrderResult {
  sourceLabel: string;
  redactedRawText: string;
  piiFieldsRedacted: number;
  engineUsed: AiEngineMode;
  confidenceScore: number;
  inferenceLatencyMs: number;
  resolvedItems: PosResolvedItem[];
  estimatedTotalVnd: number;
  canonicalOrderPreview: {
    customerName: string;
    shippingAddress: string;
    channel: 'AI_POS_INGEST';
    items: Array<{ hardwareId: string; quantity: number }>;
  };
  warnings: string[];
}

export interface VendorHardwareMappingResult {
  category: string;
  brand: string;
  model: string;
  specs: Record<string, string | number>;
  confidenceScore: number;
  inferenceLatencyMs: number;
  schemaCompliance: string;
  engineUsed: AiEngineMode;
}

export interface CatalogMatcherItem {
  id: string;
  name: string;
  price: number;
  keywords: string[];
}

export const FALLBACK_CATALOG: CatalogMatcherItem[] = [
  { id: 'gpu-rtx4090-strix', name: 'ASUS ROG Strix GeForce RTX 4090 OC 24GB', price: 54990000, keywords: ['rtx 4090', '4090'] },
  { id: 'gpu-rtx4080-strix', name: 'ASUS ROG Strix RTX 4080 16GB OC', price: 36990000, keywords: ['rtx 4080', '4080'] },
  { id: 'gpu-rtx4070-gigabyte', name: 'Gigabyte GeForce RTX 4070 WindForce OC 12GB', price: 17990000, keywords: ['rtx 4070', '4070'] },
  { id: 'cpu-i5-13600k', name: 'Intel Core i5-13600K (14C/20T)', price: 7890000, keywords: ['i5-13600k', '13600k'] },
  { id: 'cpu-r7-7800x3d', name: 'AMD Ryzen 7 7800X3D (8C/16T)', price: 10990000, keywords: ['7800x3d', 'ryzen 7'] },
  { id: 'ram-corsair-ddr5-32', name: 'Corsair Vengeance RGB 32GB (2x16GB) DDR5 6000MHz', price: 3490000, keywords: ['ddr5', '32gb'] },
  { id: 'mb-b760-plus', name: 'ASUS TUF GAMING B760M-PLUS WIFI II', price: 4690000, keywords: ['b760', 'b760m'] },
  { id: 'ssd-samsung-990-pro-1tb', name: 'Samsung 990 PRO 1TB NVMe M.2 PCIe 4.0', price: 3190000, keywords: ['990 pro', '1tb'] },
];

export async function loadActiveHardwareCatalog(): Promise<CatalogMatcherItem[]> {
  try {
    const result = await hardwareService.getHardwareItems({ page: 1, limit: 100 });
    if (result.items.length > 0) {
      return result.items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        keywords: [item.id.toLowerCase(), item.name.toLowerCase()],
      }));
    }
  } catch {
    // Use baseline catalog if hardware repo unavailable
  }
  return FALLBACK_CATALOG;
}

export async function requestGeminiPosExtraction(
  maskedText: string
): Promise<Array<{ keyword: string; quantity: number }> | null> {
  if (!config.integration.geminiApiKey || config.env === 'test') return null;
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      config.integration.geminiModel
    )}:generateContent?key=${encodeURIComponent(config.integration.geminiApiKey)}`;
    const prompt = [
      'Extract hardware items and integer quantities from this redacted POS receipt.',
      'Return JSON strictly matching {"items":[{"keyword":"string","quantity":number}]}.',
      `Receipt: ${maskedText}`,
    ].join('\n');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
      }),
    });
    if (!response.ok) return null;
    const json = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawJson = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson) return null;
    const parsed = JSON.parse(rawJson) as { items?: Array<{ keyword?: string; quantity?: number }> };
    return Array.isArray(parsed.items)
      ? parsed.items
          .filter((i) => typeof i.keyword === 'string')
          .map((i) => ({ keyword: String(i.keyword), quantity: Math.max(1, Number(i.quantity) || 1) }))
      : null;
  } catch {
    return null;
  }
}

export function buildPosTemplateKey(redactedText: string): string {
  return redactedText
    .toLowerCase()
    .replace(/^(?:khach(?:\s+hang)?|customer)\s+[^-\n:]{2,40}/, 'khach <name>')
    .replace(/\S*\*{2,}\S*/g, '<pii>')
    .replace(/\bq?\d+/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
}
