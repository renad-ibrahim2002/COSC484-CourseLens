import { describe, expect, test } from 'vitest';
import { bytes, initials, plural, timeAgo } from '../lib/format';

describe('format helpers', () => {
  test('initials', () => {
    expect(initials('Renad Ibrahim')).toBe('RI');
    expect(initials('Talal')).toBe('T');
    expect(initials('')).toBe('?');
  });
  test('bytes', () => {
    expect(bytes(512)).toBe('512 B');
    expect(bytes(2048)).toBe('2 KB');
    expect(bytes(1.2 * 1024 * 1024)).toBe('1.2 MB');
  });
  test('timeAgo', () => {
    expect(timeAgo(new Date(Date.now() - 2 * 3600 * 1000))).toBe('2 h ago');
    expect(timeAgo(new Date(Date.now() - 26 * 3600 * 1000))).toBe('yesterday');
  });
  test('plural', () => {
    expect(plural(1, 'review')).toBe('1 review');
    expect(plural(3, 'review')).toBe('3 reviews');
  });
});
