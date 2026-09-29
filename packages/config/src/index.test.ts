import { describe, expect, it } from 'vitest';
import { loadServerConfig } from './index';

const baseEnv: NodeJS.ProcessEnv = {
  NODE_ENV: 'test',
  AUTH_MODE: 'development',
  DATABASE_URL: 'postgres://example:test@localhost:5432/avitus',
  ADMIN_ORIGIN: 'http://localhost:3000',
};

describe('loadServerConfig API_LISTEN_HOST', () => {
  it('defaults to IPv4 wildcard for environments without explicit IPv6 support', () => {
    expect(loadServerConfig(baseEnv).API_LISTEN_HOST).toBe('0.0.0.0');
  });

  it('accepts IPv6 wildcard for dual-stack Fly private networking', () => {
    expect(loadServerConfig({ ...baseEnv, API_LISTEN_HOST: '::' }).API_LISTEN_HOST).toBe('::');
  });

  it('rejects unsupported listen hosts', () => {
    expect(() => loadServerConfig({ ...baseEnv, API_LISTEN_HOST: '127.0.0.1' })).toThrow();
  });

  it('requires a positive bounded intake budget', () => {
    expect(loadServerConfig(baseEnv).PUBLIC_INTAKE_MAX_PER_MINUTE).toBe(60);
    expect(loadServerConfig({ ...baseEnv, PUBLIC_INTAKE_MAX_PER_MINUTE: '120' }).PUBLIC_INTAKE_MAX_PER_MINUTE).toBe(120);
    for (const value of ['0', '-1', '1.5', '10001', 'invalid']) {
      expect(() => loadServerConfig({ ...baseEnv, PUBLIC_INTAKE_MAX_PER_MINUTE: value })).toThrow();
    }
  });
});
