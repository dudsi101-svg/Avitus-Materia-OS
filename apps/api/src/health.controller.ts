import { Controller, Get, Inject } from '@nestjs/common';
import type { Pool } from 'pg';
import { TOKENS } from './tokens';

@Controller()
export class HealthController {
  constructor(@Inject(TOKENS.pool) private readonly pool: Pool) {}

  @Get('health')
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(): Promise<{ status: 'ready' }> {
    await this.pool.query('SELECT 1');
    return { status: 'ready' };
  }
}
