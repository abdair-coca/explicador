// The arithmetic of a <cosine>: the product of each pair of numbers, their sum (the dot product), the length of each
// vector and the division, at a precision that follows the numbers as written. Done here so the agent never computes.
import type { CosineBlock } from '../../../server/src/scene.ts';

export type CosinePart = 'vectors' | 'products' | 'sum' | 'lengths' | 'result';

export interface CosineRow {
  label?: string;
  a: number;
  b: number;
  aText: string;
  bText: string;
  product: number;
  productText: string;
  /** Strength of each number against the largest one shown in its vector, from 0 to 1. */
  aShare: number;
  bShare: number;
}

export interface CosineModel {
  rows: CosineRow[];
  /** Dimensions not shown. */
  hidden: number;
  size: number;
  /** All numbers shown: the viewer computes the dot product, the lengths and the cosine. */
  full: boolean;
  dotText: string;
  normAText: string;
  normBText: string;
  cos: number;
  cosText: string;
  parts: CosinePart[];
}

function decimalsOf(value: string): number {
  const mantissa = value.split(/[eE]/)[0] ?? '';
  return mantissa.includes('.') ? (mantissa.split('.')[1]?.length ?? 0) : 0;
}

/** A number at a fixed precision without the zeros that add nothing: 0.2000 → 0.2, -0.0075 stays. */
export function trimmed(value: number, decimals: number): string {
  const text = value.toFixed(decimals);
  return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text;
}

export function cosineModel(block: CosineBlock): CosineModel {
  const decimals = Math.min(4, Math.max(0, ...block.dims.map((dim) => decimalsOf(dim.a))) + Math.max(0, ...block.dims.map((dim) => decimalsOf(dim.b))));
  const largestA = Math.max(0, ...block.dims.map((dim) => Math.abs(Number(dim.a))));
  const largestB = Math.max(0, ...block.dims.map((dim) => Math.abs(Number(dim.b))));
  const rows = block.dims.map((dim): CosineRow => {
    const a = Number(dim.a);
    const b = Number(dim.b);
    return {
      ...(dim.label ? { label: dim.label } : {}),
      a,
      b,
      aText: dim.a,
      bText: dim.b,
      product: a * b,
      productText: trimmed(a * b, decimals),
      aShare: largestA > 0 ? Math.abs(a) / largestA : 0,
      bShare: largestB > 0 ? Math.abs(b) / largestB : 0,
    };
  });
  const size = Math.max(block.size ?? 0, rows.length);
  const full = size === rows.length;
  const dot = rows.reduce((sum, row) => sum + row.product, 0);
  const normA = Math.sqrt(rows.reduce((sum, row) => sum + row.a ** 2, 0));
  const normB = Math.sqrt(rows.reduce((sum, row) => sum + row.b ** 2, 0));
  const computed = normA > 0 && normB > 0 ? dot / (normA * normB) : 0;
  const cos = block.score !== undefined ? Number(block.score) : computed;
  return {
    rows,
    hidden: size - rows.length,
    size,
    full,
    dotText: trimmed(dot, decimals),
    normAText: normA.toFixed(3),
    normBText: normB.toFixed(3),
    cos,
    cosText: block.score ?? computed.toFixed(3),
    parts: full ? ['vectors', 'products', 'sum', 'lengths', 'result'] : ['vectors', 'products', 'sum', 'result'],
  };
}

/** Where a cosine falls on the line from -1 (opposite) to 1 (same direction), from 0 to 1. */
export const gaugeAt = (cos: number): number => (Math.max(-1, Math.min(1, cos)) + 1) / 2;
