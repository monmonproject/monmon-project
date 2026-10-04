import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ENV_KEY = 'VITE_API_URL';

async function freshImport() {
  vi.resetModules();
  const { default: api } = await import('./api.js');
  return api;
}

describe('src/services/api.js', () => {
  beforeEach(() => {
    vi.stubEnv(ENV_KEY, 'http://localhost:3000');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('mengambil base URL dari VITE_API_URL', async () => {
    vi.stubEnv(ENV_KEY, 'http://api.dev.example');

    const api = await freshImport();

    expect(api.defaults.baseURL).toBe('http://api.dev.example');
  });

  it('melempar error yang jelas kalau VITE_API_URL tidak diset', async () => {
    vi.stubEnv(ENV_KEY, '');

    await expect(freshImport()).rejects.toThrow('VITE_API_URL belum diatur');
  });

  it('menetapkan header Content-Type application/json', async () => {
    const api = await freshImport();

    expect(api.defaults.headers['Content-Type']).toBe('application/json');
  });
});