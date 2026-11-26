import { describe, expect, it } from 'vitest';
import { joinUrl } from './index.ts';

describe('joinUrl', () => {
  it.each([
    ['https://app.example.com', '/api/health/live', 'https://app.example.com/api/health/live'],
    ['https://app.example.com/', 'api/health/live', 'https://app.example.com/api/health/live'],
    ['https://app.example.com//', '//api', 'https://app.example.com/api'],
    ['', '/api', '/api'],
  ])('joinUrl(%j, %j) = %j', (baseUrl, path, expected) => {
    expect(joinUrl(baseUrl, path)).toBe(expected);
  });
});
