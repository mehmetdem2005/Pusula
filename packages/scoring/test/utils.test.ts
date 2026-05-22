import { describe, it, expect } from 'vitest';
import { clamp01_100, sigmoid, quantile, median } from '../src/utils.js';

describe('clamp01_100', () => {
  it.each([
    [-10, 0],
    [0, 0],
    [50, 50],
    [100, 100],
    [150, 100],
  ])('clamp(%d) = %d', (n, beklenen) => {
    expect(clamp01_100(n)).toBe(beklenen);
  });
});

describe('sigmoid', () => {
  it('sigmoid(0) = 0.5', () => {
    expect(sigmoid(0)).toBeCloseTo(0.5, 5);
  });
  it('sigmoid(+∞) → 1', () => {
    expect(sigmoid(50)).toBeCloseTo(1, 5);
  });
  it('sigmoid(-∞) → 0', () => {
    expect(sigmoid(-50)).toBeCloseTo(0, 5);
  });
});

describe('quantile / median', () => {
  it('median tek eleman', () => {
    expect(median([5])).toBe(5);
  });
  it('median çift eleman', () => {
    expect(median([1, 2, 3, 4])).toBeCloseTo(2.5, 5);
  });
  it('median sorted/unsorted aynı', () => {
    expect(median([5, 1, 4, 2, 3])).toBe(3);
  });
  it('q25 ve q75', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(quantile(arr, 0.25)).toBeCloseTo(3.25, 1);
    expect(quantile(arr, 0.75)).toBeCloseTo(7.75, 1);
  });
  it('boş dizi → NaN', () => {
    expect(quantile([], 0.5)).toBeNaN();
  });
});
