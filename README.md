# Cachet

Cachet is a sports betting analytics API. It imports sportsbook share links, preserves source data, normalizes selections, and connects them to canonical sports entities so bettors can understand their own betting history. Analytics distinguish individual selection performance from the outcome of the entire bet, including missed selections on losing parlays.

This README covers development and navigation. Read [AGENTS.md](AGENTS.md) for the engineering rules that govern changes.

## Tech Stack

| Area | Implementation |
| --- | --- |
| Language and runtime | TypeScript on Cloudflare Workers, with `nodejs_compat` enabled |
| HTTP | Native Worker `fetch` handler and explicit routing in [src/index.ts](src/index.ts) |
| Validation | Zod request schemas |
| Database | PostgreSQL through `pg` and the Cloudflare Hyperdrive binding |
| Authentication | Password hashing with `bcryptjs`, JWT sessions with `jose`, and Google OAuth |
| Testing | Vitest with `@cloudflare/vitest-pool-workers` |
| Development tooling | npm, Wrangler, and a standalone Playwright inspection script |

Hono and Chanfana remain in `package.json`, but the current router does not use them. There is no active Swagger UI or generated OpenAPI endpoint.

## Prerequisites

- Node.js 22.12+ on the 22.x line, or Node.js 24+, and npm. These satisfy the locked Wrangler, Vite, and Vitest engine requirements. The repository has no Node version file or root `engines` setting.
- A development PostgreSQL database with the schema in [sql/](sql/) applied, plus a SQL client for manual migration work. The initial schema uses `pgcrypto`.
- Development database credentials and a local JWT signing secret. Google OAuth credentials and a frontend callback destination are needed only when exercising Google sign-in.
- Cloudflare account access and an appropriately configured Hyperdrive resource when deploying. Wrangler is installed locally by npm.

## Installation

From the repository root:

```sh
npm ci
```

This installs dependencies from `package-lock.json`. Set up the database and local environment below before testing database-backed requests.

## Environment / Configuration

[wrangler.jsonc](wrangler.jsonc) defines the `cachet-api` Worker, its `src/index.ts` entry point, compatibility settings, observability, and the `HYPERDRIVE` binding. [src/env.ts](src/env.ts) defines the application environment contract.

| Name | Purpose |
| --- | --- |
| `HYPERDRIVE` | Wrangler binding exposing `connectionString`; all database clients use this binding |
| `JWT_SECRET` | Signs and verifies password and Google login sessions |
| `GOOGLE_CLIENT_ID` | Google OAuth application ID |
| `GOOGLE_CLIENT_SECRET` | Exchanges the Google authorization code for an access token |
| `GOOGLE_REDIRECT_URI` | API callback URL used in Google authorization and token exchange |
| `FRONTEND_URL` | Frontend base URL for OAuth success and failure redirects |

Create a root `.dev.vars` file with your local values. It is ignored by Git. The following is a placeholder template, not working credentials:

```dotenv
JWT_SECRET="replace-with-a-random-local-signing-secret"
GOOGLE_CLIENT_ID="replace-with-your-development-client-id"
GOOGLE_CLIENT_SECRET="replace-with-your-development-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:8787/api/auth/google/callback"
FRONTEND_URL="http://localhost:YOUR_FRONTEND_PORT"
```

Password login uses `JWT_SECRET` and the database; it does not use the Google settings. For Google sign-in, replace the frontend port and use a callback URI registered for your development OAuth client. This repository does not define a frontend port.

Wrangler loads local secrets from `.dev.vars`; these values are separate from deployed Worker secrets. See [Cloudflare's local secrets documentation](https://developers.cloudflare.com/workers/configuration/secrets/#local-development-with-secrets).

For the local database, export the binding-specific override in the shell that starts Wrangler. Replace every placeholder with your development database values:

```sh
export CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE='postgresql://DEV_USER:DEV_PASSWORD@DEV_HOST:5432/DEV_DATABASE'
```

Include the TLS options required by your database. This variable overrides `hyperdrive[].localConnectionString` in Wrangler configuration; it is a Wrangler setting, not an application `DATABASE_URL`. In local mode, database requests connect directly to that database. See [Hyperdrive local development](https://developers.cloudflare.com/hyperdrive/configuration/local-development/).

The tracked Wrangler configuration currently contains a credential-bearing remote database URL. Override it with your development database before making database-backed requests. Removing that value from tracked configuration and rotating the credential is an outstanding configuration task; its contents are intentionally not reproduced here.

## Running Locally

After configuring the environment:

```sh
npm run dev
```

`npm start` is an alias for the same `wrangler dev` command. No custom development port is configured, so the expected URL is `http://localhost:8787`, Wrangler's default. Use the address printed by Wrangler if it differs.

Check the public health endpoint from another terminal:

```sh
curl http://localhost:8787/health
```

Expected JSON:

```json
{"ok":true,"service":"cachet-api"}
```

This checks the HTTP handler, not database connectivity. The root `/` returns a JSON 404; it does not serve an API explorer.

## Authentication for Local Development

Use the ordinary password endpoints against your development database. There is no separate development auth bypass, token-generation script, or seeded test account in the repository.

Register a local account (this writes a user to the configured database):

```sh
curl -X POST http://localhost:8787/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"developer@example.test","password":"replace-with-local-password","displayName":"Local Developer"}'
```

Registration requires an email and a password of at least eight characters; `displayName` is optional. For subsequent sessions:

```sh
curl -X POST http://localhost:8787/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"developer@example.test","password":"replace-with-local-password"}'
```

Both return `{ "token": "...", "user": { ... } }`. Replace `LOCAL_TOKEN` below with the returned token:

```sh
curl http://localhost:8787/api/auth/me \
  -H 'Authorization: Bearer LOCAL_TOKEN'
```

JWT sessions expire after seven days. Protected endpoints use the same bearer header. Google sign-in starts at `GET /api/auth/google/start`; a successful callback redirects to `${FRONTEND_URL}/auth/callback` with a `token` query parameter.

## Useful Development Commands

Run commands from the repository root.

| Command | Purpose |
| --- | --- |
| `npm ci` | Install locked dependencies |
| `npm run dev` / `npm start` | Start the local Worker |
| `npm test` | Start Vitest in its interactive/watch workflow |
| `npm run test:run` | Run the full suite once |
| `npx vitest run test/analytics/rankings.spec.ts` | Run a focused test file |
| `npx vitest run test/analytics` | Run the analytics test group |
| `npm exec --yes --package=typescript -- tsc --noEmit` | Typecheck using a temporary compiler |
| `npm run cf-typegen` | Regenerate Wrangler runtime/binding types |
| `npm run deploy` | Deploy the Worker with Wrangler to the configured Cloudflare resource |

The project has a [tsconfig.json](tsconfig.json), but no `typecheck` script or pinned TypeScript dependency. The temporary-compiler command above has been verified; it may download TypeScript and is not version-pinned. The current configuration checks `src/` and `worker-configuration.d.ts`, not `test/`.

Run `npm run cf-typegen` after changing Wrangler bindings and review the generated [worker-configuration.d.ts](worker-configuration.d.ts). Deployment requires the intended account, Hyperdrive resource, and deployed environment/secrets; there is no repository-defined staging or release workflow.

## Project Structure

| Path | Responsibility / where new code belongs |
| --- | --- |
| [src/index.ts](src/index.ts) | Worker entry point, routing, CORS preflight, and health response |
| [src/auth/](src/auth/) | Registration, login, OAuth, JWT verification, and authenticated handler wrapper |
| [src/imports/](src/imports/) | Share-link request handling and orchestration; import evidence persistence |
| [src/parsers/](src/parsers/) | Sportsbook-specific extraction and parser dispatch |
| [src/normalization/](src/normalization/) | Pure normalization, versioning, and source-driven backfill service/repository |
| [src/db/](src/db/) | PostgreSQL client and transactional persistence of bets, groups, and legs |
| [src/bets/](src/bets/) | User-scoped bet listing and detail controller/service/repository |
| [src/enrichment/](src/enrichment/) | Canonical matching, player creation/linking, and data-health diagnostics |
| [src/analytics/](src/analytics/) | Rankings and player performance controller/service/repository modules |
| [src/types/](src/types/) | Shared bet/parser contracts and request schemas |
| [src/lib/](src/lib/) | HTTP responses, sportsbook detection, and HTML retrieval helpers |
| [test/](test/) | Tests grouped by the corresponding domain directory |
| [sql/](sql/) | Ordered schema migrations and domain seed SQL |
| [scripts/](scripts/) | Standalone DraftKings browser/network inspection utility; outside the API runtime |

Add controllers, services, and repositories beside the relevant domain's existing modules. Add sportsbook extraction under `src/parsers/`, deterministic interpretation under `src/normalization/`, and regression tests under the matching `test/` directory. Register new routes in `src/index.ts`.

## Architecture

The normal request boundary is:

```text
request → controller → service → repository → database
```

Controllers validate input, use authenticated context, and shape HTTP responses. Services own business decisions and orchestration. Repositories own SQL and persistence/query shapes. Pure parsing and normalization stay separate from database side effects. Some existing operational routes invoke services directly from `src/index.ts`.

The data pipeline is:

```text
sportsbook source → parser → normalization → persistence
                                            ↓
                                  canonical enrichment → analytics
```

[importSharedBet](src/imports/service.ts) first creates an import record, retrieves the sportsbook representation, and stores available raw evidence and parse status. Successfully parsed bets pass through [normalizeParsedBet](src/normalization/normalizer.ts) and then [createBetWithLegs](src/db/bets.ts), which persists the bet, groups, and legs. DraftKings uses its share-post API; the other parser path receives fetched HTML.

Raw sportsbook market text is retained separately from derived player/market fields, with a normalization version. Enrichment is a separate operation after import; it links legs to canonical entities. Canonical entities are shared, while bet history and personal analytics are scoped to the authenticated user. Ambiguous player matches are skipped.

See [AGENTS.md](AGENTS.md) for the detailed boundaries, source preservation, identity, user isolation, and analytics invariants.

## Database and Migrations

Migrations live in **`sql/`**, not a `migrations/` directory:

| File | Purpose |
| --- | --- |
| [001_init.sql](sql/001_init.sql) | Users, sportsbooks, imports, bets, and legs |
| [002_create_bet_leg_groups.sql](sql/002_create_bet_leg_groups.sql) | Bet grouping and leg ordering |
| [003_add_user_auth_v1.sql](sql/003_add_user_auth_v1.sql) | Password and Google account fields |
| [004_domain_model_v1.sql](sql/004_domain_model_v1.sql) | Canonical sports, leagues, teams, players, events, markets, and leg references |
| [005_seed_domain_basics.sql](sql/005_seed_domain_basics.sql) | Initial sports, leagues, and markets |
| [006_add_normalization_source.sql](sql/006_add_normalization_source.sql) | Preserved market source and normalization version |

For a fresh development database, review and apply the files in numeric order through your SQL client. For an existing database, establish which migrations are already applied before proceeding. The repository defines no migration runner, migration-history mechanism, automated database provisioning, or reset command; coordinate the actual database setup with the maintainer.

Every schema change needs a reviewable migration committed alongside its application changes. Keep database state synchronized with these files. Historical repair and destructive production changes require the explicit review described in [AGENTS.md](AGENTS.md); migration application is not an automatic part of starting the Worker.

## Testing

[vitest.config.ts](vitest.config.ts) runs tests through Cloudflare's Workers integration using the Wrangler configuration. Existing unit tests use mocked database/network boundaries; they do not require a seeded login account and do not establish that a live database or OAuth setup works.

Follow **RED → GREEN → REFACTOR**: write a regression or desired-behavior test, run it and confirm the intended failure, implement the smallest correct change, then run the focused file, relevant group, and full suite. Preserve existing assertions and review the final diff. [AGENTS.md](AGENTS.md) contains the complete workflow.

```sh
npx vitest run test/analytics/rankings.spec.ts
npx vitest run test/analytics
npm run test:run
npm exec --yes --package=typescript -- tsc --noEmit
```

Tests cover parsing, normalization and raw-source preservation, imports, persistence contracts, safe backfills, player enrichment, and analytics. Ranking coverage includes pending/settled counts, nullable hit rates, and user-scoped query contracts. The Workers test runtime opens local listeners and writes Wrangler logs; restricted execution environments may need permission for those operations.

## API Overview

The source of truth is [src/index.ts](src/index.ts). `:id` below denotes a path parameter.

| Group | Existing routes | Authentication |
| --- | --- | --- |
| Health | `GET /health` | Public |
| Password auth | `POST /api/auth/register`, `POST /api/auth/login` | Public |
| Session profile | `GET /api/auth/me` | Bearer token |
| Google auth | `GET /api/auth/google/start`, `GET /api/auth/google/callback` | OAuth flow |
| Imports | `POST /api/imports/share-link` with JSON `{ "url": "SPORTSBOOK_SHARE_URL" }` | Bearer token |
| Bets | `GET /api/bets`, `GET /api/bets/:id` | Bearer token; user-scoped |
| Analytics | `GET /api/analytics/rankings`, `GET /api/analytics/players/:id` | Bearer token; user-scoped |
| Enrichment writes | `POST /api/enrichment/run`, `POST /api/enrichment/players` | Bearer token |
| Diagnostics | `POST /api/enrichment/report`, `GET /api/enrichment/data-health` | Bearer token |
| Normalization repair | `POST /api/normalization/backfill` | Bearer token |

Enrichment, diagnostics, and backfill currently operate across the database: their handlers do not pass a user ID, and the router has no separate admin-role check. They are operational endpoints, not personal analytics. The write routes use batches of 50. The backfill service supports a cursor internally, but its HTTP handler does not accept one. Review these boundaries before invoking operational endpoints against shared data.

## Current Development State

- Password and Google authentication, share-link import, and user-scoped bet retrieval exist.
- DraftKings parsing handles nested same-game-parlay groups. FanDuel is a stub that can return an empty bet; it is not a complete sportsbook integration.
- Normalization preserves raw market evidence and supports versioned, source-driven repairs. Separate enrichment operations link sports/leagues/markets and match or create canonical players.
- Analytics expose player selection performance separately from associated bet performance, market breakdowns, losing-bet attribution, and loss-contributor summaries.
- Rankings report total, settled, and pending selections. Hit rates use `hits / (hits + misses)`, rounded to one decimal place as a percentage, and return `null` without a settled sample. Rankings remain ordered by selection count. The separate player-detail analytics endpoint still uses zero for an empty sample and does not expose the same settled/pending counts.
- Canonical event tables exist, but automatic event/result resolution and recommendation generation are not implemented.

## Engineering Guide

Read [AGENTS.md](AGENTS.md) before significant changes. It defines architecture boundaries, source-data preservation, conservative enrichment, user isolation, migration safety, TDD, and completion reporting. This README explains how to work with the repository; the engineering guide explains the rules for changing it.

Outstanding setup gaps are a pinned Node/TypeScript toolchain, a committed environment example, a reproducible database provisioning/migration workflow, and a documented deployment environment/release process. Database credentials in tracked Wrangler configuration also need separate remediation. No unverified staging URLs, deployment account details, or shared test credentials are provided here.
