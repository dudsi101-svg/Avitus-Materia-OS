const RETRYABLE_CODES = new Set(['08000', '08001', '08003', '08006', '57P01', '57P02', '57P03', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ETIMEDOUT']);

function transientReason(error: unknown): string | null {
  let current = error;
  // Drizzle wraps driver failures. Never log a wrapper's SQL, parameters or message.
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth++) {
    const value = current as { code?: unknown; message?: unknown; cause?: unknown };
    if (typeof value.code === 'string' && RETRYABLE_CODES.has(value.code)) return value.code;
    if (value.message === 'Connection terminated unexpectedly') return 'connection_terminated';
    current = value.cause;
  }
  return null;
}

export interface BootstrapFailureRecord {
  event: 'bootstrap.attempt_failed';
  attempt: number;
  retrying: boolean;
  reason: string;
}

/** Only for the idempotent production bootstrap, never arbitrary customer writes. */
export async function runBootstrapWithRetry(
  work: () => Promise<void>,
  emit: (record: BootstrapFailureRecord) => void,
  delay: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<number> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await work();
      return attempt;
    } catch (error) {
      const reason = transientReason(error);
      const retrying = reason !== null && attempt < 3;
      emit({ event: 'bootstrap.attempt_failed', attempt, retrying, reason: reason ?? 'non_transient' });
      if (!retrying) throw error;
      await delay(attempt * 1000);
    }
  }
  throw new Error('Bootstrap attempts exhausted.');
}
