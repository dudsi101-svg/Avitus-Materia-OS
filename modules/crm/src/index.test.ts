import { describe, expect, it } from 'vitest';
import { createLead, createLeadSchema } from './index';

describe('Lead domain', () => {
  it('creates a NEW organization-scoped lead', () => {
    const input = createLeadSchema.parse({ title: 'Oak table', source: 'WEBSITE' });
    const lead = createLead('22222222-2222-4222-8222-222222222222', input);
    expect(lead.organizationId).toBe('22222222-2222-4222-8222-222222222222');
    expect(lead.status).toBe('NEW');
    expect(lead.priority).toBe('NORMAL');
  });

  it('rejects an empty organization id', () => {
    expect(() => createLead('', createLeadSchema.parse({}))).toThrow('Organization is required');
  });
});
