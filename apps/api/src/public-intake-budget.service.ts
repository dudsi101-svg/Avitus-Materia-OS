import { HttpException, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import type { PublicIntakeBudget } from '@avitus/database';

export class PublicIntakeLimitException extends HttpException {
  readonly retryAfterSeconds = 60;

  constructor() {
    super('Public intake budget exceeded. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
  }
}

export class PublicIntakeBudgetService {
  constructor(private readonly budget: PublicIntakeBudget, private readonly limit: number) {}

  async consume(organizationId: string): Promise<void> {
    let allowed: boolean;
    try {
      allowed = await this.budget.consume(organizationId, this.limit);
    } catch {
      // Fail closed without exposing SQL or connection details.
      throw new ServiceUnavailableException('Public intake is temporarily unavailable.');
    }
    if (!allowed) throw new PublicIntakeLimitException();
  }
}
