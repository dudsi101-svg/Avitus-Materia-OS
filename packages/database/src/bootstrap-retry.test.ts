import { describe, expect, it } from 'vitest';
import { runBootstrapWithRetry, type BootstrapFailureRecord } from './bootstrap-retry';

describe('idempotent bootstrap transient retry', () => {
  it('recovers a wrapped transport failure with bounded delay and private logs', async () => {
    const logs: BootstrapFailureRecord[] = []; const delays: number[] = []; let calls = 0;
    const attempts = await runBootstrapWithRetry(async () => {
      if (++calls === 1) throw Object.assign(new Error('SQL with customer@example.org'), { cause: new Error('Connection terminated unexpectedly'), params: ['secret'] });
    }, (record) => logs.push(record), async (ms) => { delays.push(ms); });
    expect(attempts).toBe(2); expect(delays).toEqual([1000]);
    expect(logs).toEqual([{ event: 'bootstrap.attempt_failed', attempt: 1, retrying: true, reason: 'connection_terminated' }]);
    expect(JSON.stringify(logs)).not.toMatch(/SQL|customer|secret/);
  });
  it('stops after three transport failures', async () => {
    let calls = 0; const delays: number[] = []; const logs: BootstrapFailureRecord[] = [];
    await expect(runBootstrapWithRetry(async () => {
      calls++; throw Object.assign(new Error('private'), { code: 'ECONNRESET' });
    }, r => logs.push(r), async ms => { delays.push(ms); })).rejects.toThrow('private');
    expect(calls).toBe(3); expect(delays).toEqual([1000, 2000]); expect(logs.at(-1)?.retrying).toBe(false);
  });
  it.each(['23505', '23503', '42501', '08P01', '40P01'])('does not retry deterministic/unapproved SQLSTATE %s', async (code) => {
    let calls = 0;
    await expect(runBootstrapWithRetry(async () => { calls++; throw Object.assign(new Error('invalid'), { code }); }, () => {}, async () => { throw Error('must not delay'); })).rejects.toThrow('invalid');
    expect(calls).toBe(1);
  });
  it('does not retry validation/configuration errors', async () => {
    let calls = 0;
    await expect(runBootstrapWithRetry(async () => { calls++; throw Error('config'); }, () => {})).rejects.toThrow('config');
    expect(calls).toBe(1);
  });
});
