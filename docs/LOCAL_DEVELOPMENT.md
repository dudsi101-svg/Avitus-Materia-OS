# Local Development — Sprint 0

## Requirements
- Node.js 22+
- Corepack / pnpm
- Docker with Compose

## Start
```bash
cp .env.example .env
corepack enable
pnpm install

docker compose up -d postgres
pnpm db:migrate
pnpm db:seed:dev
pnpm dev
```

Admin: http://localhost:3000  
API: http://localhost:4000  
Health: http://localhost:4000/health  
Readiness: http://localhost:4000/ready

## Development authentication
Sprint 0 deliberately uses an explicit development-only adapter. The API requires:
- `x-avitus-user-id`
- `x-avitus-organization-id`

The sample `.env.example` IDs match the development seed. `@avitus/config` refuses to start production with `AUTH_MODE=development`.

## Database
Migrations are committed SQL files in `packages/database/migrations` and recorded in `_avitus_migrations`.

```bash
pnpm db:migrate
```

Do not edit a production schema manually.

## Verification
```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Bootstrap limitation
A lockfile must be generated and committed from the first environment with registry access. Until then CI uses `pnpm install --no-frozen-lockfile`. After `pnpm-lock.yaml` is committed, CI must switch to `--frozen-lockfile`.
