#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p apps/api/.temp
exec > >(tee apps/api/.temp/mvp-validation.log) 2>&1
echo 'Installing locked dependencies'
pnpm install --frozen-lockfile
echo 'Applying versioned migrations to the configured local database'
docker compose --env-file infra/.env -f infra/compose.yaml up -d --wait --wait-timeout 60
pnpm --filter api db:deploy
pnpm --filter api prisma:generate
pnpm --filter api test
pnpm --filter api test:e2e
pnpm --filter api lint
pnpm --filter api build
pnpm --filter api test:integration
pnpm --filter web lint
pnpm --filter web build
echo 'WATCHTOWER_MVP_VALIDATION_OK'
