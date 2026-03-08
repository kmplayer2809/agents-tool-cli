import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { sanitizeName, getCanonicalDir } from '../src/skills/installer.js';

describe('installer', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `test-installer-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('sanitizeName', () => {
    it('lowercases the name', () => {
      expect(sanitizeName('MySkill')).toBe('myskill');
    });

    it('replaces spaces with dashes', () => {
      expect(sanitizeName('my skill')).toBe('my-skill');
    });

    it('removes leading/trailing dashes', () => {
      expect(sanitizeName('-my-skill-')).toBe('my-skill');
    });

    it('handles special characters', () => {
      expect(sanitizeName('my@skill!')).toBe('my-skill');
    });

    it('returns unnamed-asset for empty string', () => {
      expect(sanitizeName('')).toBe('unnamed-asset');
    });
  });

  describe('getCanonicalDir', () => {
    it('returns path within cwd for local install', () => {
      const dir = getCanonicalDir('skills', 'my-skill', false, tmpDir);
      expect(dir).toBe(join(tmpDir, '.agents', 'skills', 'my-skill'));
    });

    it('sanitizes the asset name in path', () => {
      const dir = getCanonicalDir('skills', 'My Skill', false, tmpDir);
      expect(dir).toBe(join(tmpDir, '.agents', 'skills', 'my-skill'));
    });
  });
});
