export const TOKENS = {
  config: Symbol('config'),
  database: Symbol('database'),
  pool: Symbol('pool'),
  identityRepository: Symbol('identityRepository'),
  leadRepository: Symbol('leadRepository'),
  createLeadService: Symbol('createLeadService'),
  readLeadService: Symbol('readLeadService'),
} as const;
