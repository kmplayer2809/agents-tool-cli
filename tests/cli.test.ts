import { describe, it, expect, vi } from 'vitest';

describe('CLI routing', () => {
  it('should export main function', async () => {
    const { main } = await import('../src/cli.js');
    expect(typeof main).toBe('function');
  });
});
