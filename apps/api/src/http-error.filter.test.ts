import 'reflect-metadata';
import { type ArgumentsHost, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpErrorFilter } from './http-error.filter';

function invoke(exception: unknown) {
  const response = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ correlationId: '4b9a0b35-688f-4733-8d0a-8a1b642576eb' }),
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;
  new HttpErrorFilter().catch(exception, host);
  return response;
}

describe('HTTP failure logging privacy boundary', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does not serialize SQL parameters, nested causes, stack or arbitrary thrown data', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const secret = 'private-person@example.com secret-database-password';
    const exception = Object.assign(new Error(secret, { cause: new Error(secret) }), {
      query: 'INSERT INTO contact_points VALUES ($1)', params: [secret], detail: secret,
    });
    for (const thrown of [exception, { detail: secret }, secret, null]) {
      const response = invoke(thrown);
      expect(response.status).toHaveBeenLastCalledWith(500);
      expect(JSON.stringify(response.json.mock.calls)).not.toContain(secret);
    }
    expect(log).toHaveBeenCalledTimes(4);
    for (const [line] of log.mock.calls) {
      expect(typeof line).toBe('string');
      expect(JSON.parse(line)).toEqual({
        level: 'error', event: 'http.server_error', timestamp: expect.any(String),
        correlationId: '4b9a0b35-688f-4733-8d0a-8a1b642576eb', statusCode: 500,
      });
      expect(line).not.toContain(secret);
    }
  });

  it('records explicit 503 failures for alerting without logging exception data', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = invoke(new ServiceUnavailableException('Public website intake is not configured.'));
    expect(response.status).toHaveBeenCalledWith(503);
    expect(JSON.parse(log.mock.calls[0]![0])).toMatchObject({ event: 'http.server_error', statusCode: 503 });
  });

  it('keeps expected 400 failures out of the server-failure stream', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = invoke(new BadRequestException('Invalid request.'));
    expect(response.status).toHaveBeenCalledWith(400);
    expect(log).not.toHaveBeenCalled();
  });
});
