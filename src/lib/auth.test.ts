import { afterEach, describe, expect, it, vi } from 'vitest';
import { configuredHash, isGateEnabled, isUnlocked, sha256Hex, tryUnlock } from './auth';

// SHA-256("hello") — a stable known vector.
const HELLO = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824';

afterEach(() => {
  vi.unstubAllEnvs();
  localStorage.clear();
});

describe('sha256Hex', () => {
  it('computes lowercase hex SHA-256', async () => {
    expect(await sha256Hex('hello')).toBe(HELLO);
  });
});

describe('access gate', () => {
  it('is disabled (open) when no hash is embedded', () => {
    vi.stubEnv('VITE_ACCESS_TOKEN_HASH', '');
    expect(isGateEnabled()).toBe(false);
    expect(isUnlocked()).toBe(true);
  });

  it('normalizes the configured hash', () => {
    vi.stubEnv('VITE_ACCESS_TOKEN_HASH', `  ${HELLO.toUpperCase()}  `);
    expect(configuredHash()).toBe(HELLO);
  });

  it('unlocks only with the correct token and remembers it', async () => {
    vi.stubEnv('VITE_ACCESS_TOKEN_HASH', HELLO);
    expect(isGateEnabled()).toBe(true);
    expect(isUnlocked()).toBe(false);

    expect(await tryUnlock('wrong')).toBe(false);
    expect(isUnlocked()).toBe(false);

    expect(await tryUnlock('hello')).toBe(true);
    expect(isUnlocked()).toBe(true);
  });

  it('invalidates a remembered unlock when the token rotates', async () => {
    vi.stubEnv('VITE_ACCESS_TOKEN_HASH', HELLO);
    await tryUnlock('hello');
    expect(isUnlocked()).toBe(true);

    vi.stubEnv('VITE_ACCESS_TOKEN_HASH', 'deadbeef');
    expect(isUnlocked()).toBe(false);
  });
});
