# Cachet — Agent Engineering Guide

This file defines the engineering principles, architecture, workflow, and safety rules for AI coding agents working in the Cachet repository.

Read this file before making changes.

The goal is not merely to make tests pass. Changes must preserve Cachet's architectural boundaries, data integrity, analytics correctness, user isolation, and ability to evolve safely.

---

# 1. Product Context

Cachet is a sports betting analytics platform.

Users import sportsbook bets. Cachet parses the sportsbook representation, normalizes betting data, maps normalized values into canonical sports-domain entities, and produces personalized analytics about how the user bets.

The long-term product is not simply a bet tracker.

Cachet should help users understand patterns such as:

- which players consistently hit their lines;
- which players consistently miss;
- which markets a user performs well or poorly in;
- which combinations of selections hurt otherwise successful bets;
- which players or markets contribute disproportionately to losing bets;
- whether successful selections are being weakened by poor parlay pairings;
- how performance changes over time;
- eventually, evidence-backed suggestions derived from the user's betting history.

Example future insight:

> A user repeatedly pairs one player's successful selections with another player's unsuccessful selections. With a sufficient sample size, Cachet could identify the pairing drag and surface the historical evidence.

Analytics and recommendations must describe the user's historical betting behavior.

Do not present weak samples as reliable conclusions.

---

# 2. Core Engineering Philosophy

Prefer simple, explicit systems over speculative abstractions.

Rules:

- Build abstractions when demonstrated behavior requires them.
- Do not build infrastructure merely because it might be useful later.
- Prefer small vertical slices.
- Prefer surgical changes over broad refactors.
- Fix root causes rather than symptoms.
- Preserve observability.
- Do not silently discard information.
- Do not weaken correctness to make a test pass.
- Do not refactor unrelated code while implementing a scoped feature.
- Do not introduce new dependencies without a clear need.
- Do not duplicate domain knowledge across architectural layers.
- When behavior is ambiguous, stop and surface the ambiguity rather than inventing a rule.
- When data is ambiguous, preserve it rather than guessing.
- Correctness and explainability are more important than cleverness.

A useful rule:

> Do the simplest thing that is correct now while preserving a safe path to evolve later.

---

# 3. External Platform Documentation

Cachet depends on external platforms whose APIs, runtimes, SDKs, and limits can change.

When implementing behavior that depends on Cloudflare Workers or another external platform:

- Do not rely solely on model knowledge for current platform behavior.
- Retrieve current official documentation before making platform-specific architectural decisions.
- Prefer official documentation over blog posts, examples, or third-party tutorials.
- Verify current limits before designing around quotas or resource constraints.
- Do not assume an API, configuration option, SDK, or limit still behaves as remembered.

See the Platform-Specific Instructions section at the end of this file for Cloudflare-specific requirements.

---

# 4. Architecture Boundaries

Cachet intentionally separates HTTP behavior, business logic, persistence, parsing, normalization, enrichment, and analytics.

Maintain these boundaries.

## Controllers

Controllers are responsible for:

- reading validated request input;
- authentication and user context;
- invoking services;
- mapping service results into HTTP responses.

Controllers should NOT:

- contain SQL;
- implement domain rules;
- perform normalization;
- calculate analytics;
- contain enrichment logic.

Prefer:

    request
      ↓
    controller
      ↓
    service

## Services

Services own business behavior.

Services may:

- orchestrate repositories;
- compare persisted and computed values;
- calculate analytics;
- make enrichment decisions;
- enforce business invariants;
- determine whether a write is necessary;
- coordinate pure transformations with persistence.

Services should NOT:

- contain raw SQL;
- know unnecessary database implementation details;
- absorb responsibilities belonging to parsing or normalization.

## Repositories

Repositories own persistence and query shape.

Repositories may:

- query the database;
- insert, update, or delete records;
- return database-shaped data.

Repositories should NOT:

- decide what sportsbook text means;
- implement analytics policy;
- contain product decisions;
- normalize betting terminology;
- infer domain meaning from strings unless explicitly required by the persistence query.

Important distinction:

> Repository data shape represents persistence. Service data shape represents interpreted or transformed application data.

Database rows may use snake_case.

Application and API objects may use camelCase.

Do not force persistence objects to masquerade as domain objects.

---

# 5. Pure Logic and Side Effects

Pure transformations should remain separate from infrastructure whenever practical.

Examples of pure logic include:

- normalization;
- classification;
- rate calculations;
- deterministic transformations.

Pure modules should not import database or network dependencies unnecessarily.

Side effects belong at architectural edges.

Prefer:

    raw input
      ↓
    pure transformation
      ↓
    service orchestration
      ↓
    repository/network side effect

This improves testability and prevents unit tests from accidentally loading infrastructure modules.

Do not create a new module merely for theoretical purity. Extract boundaries when they improve correctness, testability, or maintainability.

---

# 6. Data Pipeline

The conceptual data flow is:

    sportsbook source
        ↓
    parser
        ↓
    normalization
        ↓
    persistence
        ↓
    canonical enrichment
        ↓
    analytics
        ↓
    future insights/recommendations

Each stage has a distinct responsibility.

Do not collapse these stages together for convenience.

---

# 7. Raw Data Is Evidence

This is a critical Cachet invariant.

> Never destroy source data during normalization.

Raw sportsbook representations are evidence.

Derived interpretations must be stored separately.

Example:

Raw sportsbook value:

    James Wood Hits + Runs + RBIs

Derived interpretation:

    player_name = James Wood
    market_subtype = Hits + Runs + RBIs

These are not interchangeable.

The database should preserve:

    raw_market_subtype = James Wood Hits + Runs + RBIs

alongside derived fields such as:

    player_name = James Wood
    market_subtype = Hits + Runs + RBIs

Rules:

- Raw fields are immutable evidence whenever practical.
- Normalization must not overwrite the only copy of source information.
- Never reconstruct source truth from derived fields unless performing an explicitly reviewed legacy repair.
- If source data is unavailable, do not pretend derived data can reproduce it.
- New parsing and normalization features should preserve relevant source representations.
- Derived interpretations should remain independently repairable when preserved source evidence exists.

This rule exists because historical normalized data cannot always be safely reinterpreted once its original source representation has been discarded.

---

# 8. Parsing

Parsers translate sportsbook-specific payloads into Cachet's import representation.

Parser responsibilities include:

- extracting source fields;
- decoding sportsbook payloads;
- flattening sportsbook-specific nesting where appropriate;
- preserving enough source information for later normalization.

Parsers should NOT:

- perform persistence;
- create canonical domain entities;
- calculate analytics;
- silently discard unknown sportsbook fields needed for future interpretation.

Sportsbook-specific behavior belongs close to the sportsbook parser rather than leaking throughout the application.

---

# 9. Normalization

Normalization converts sportsbook-specific representations into Cachet's normalized vocabulary.

Normalization may determine:

- player name;
- market name;
- sport;
- league;
- live status;
- selection;
- line;
- other structured betting concepts.

Normalization must be deterministic.

Given the same raw input and normalization version, it should produce the same interpretation.

Do not place sportsbook interpretation logic in repositories.

Unknown values should generally be preserved rather than aggressively guessed.

Example:

A string that resembles a player prop is not necessarily a player prop.

Season-long futures such as:

    MLB 2026 - Player to Record 30+ Regular Season Home Runs

must not be interpreted as a player named:

    MLB 2026 - Player to Record 30+ Regular Season

Domain-specific guards should execute before generic suffix matching when required.

---

# 10. Normalization Versioning

Cachet versions normalization behavior.

Current normalization logic should expose a version constant such as:

    NORMALIZATION_VERSION

Persist the version used to interpret a leg when the schema supports it.

This allows Cachet to distinguish:

- data already verified under current rules;
- data created by older normalization behavior;
- data eligible for safe re-normalization.

Do not assume existing normalized data was produced by current rules.

A row matching today's expected output does not necessarily prove it was processed under today's normalizer.

---

# 11. Backfill and Data Repair Safety

Backfills require stronger safeguards than ordinary writes.

Critical rule:

> Recompute derived values from preserved source evidence, not from previous derived values.

Safe:

    raw source
        ↓
    current normalizer
        ↓
    compare against stored derived fields
        ↓
    update if necessary

Unsafe:

    old derived value
        ↓
    current normalizer
        ↓
    overwrite other derived fields

Backfill rules:

- Only automatically re-normalize rows with trustworthy preserved raw source data.
- Do not use existing `player_name` as normalization input when reassessing whether that player interpretation was correct.
- Do not use normalized `market_subtype` as if it were raw source.
- Compare newly computed values with persisted derived values.
- Avoid unnecessary writes.
- Persist the normalization version after successful processing.
- Backfills must be idempotent.
- Backfills must support deterministic progress through batches.
- Prefer cursor-based pagination over offset pagination for large repair jobs.
- Never broaden a repair query merely to make a particular corrupted row reachable.
- Do not add sportsbook/domain interpretation to SQL merely to locate a known bug when a safer source-driven repair mechanism exists.
- If recomputation invalidates a canonical relationship, clear that relationship rather than leaving stale canonical data attached.

Legacy rows without preserved source data require targeted, reviewed repairs.

Do not guess.

A targeted reconstruction is acceptable only when the exact historical corruption mechanism is known, the affected rows can be tightly identified, and the repair is explicitly reviewed.

---

# 12. Database Migrations

Database state and repository migrations must remain synchronized.

Rules:

- Every schema change must exist as a migration in the repository.
- Do not make a permanent Neon schema change without adding the corresponding migration.
- Migrations should be reviewable and reproducible.
- Avoid destructive migrations unless explicitly required.
- New columns should be nullable when historical rows cannot truthfully populate them.
- Do not manufacture historical source values merely to achieve 100% coverage.

A migration being applied successfully is not sufficient.

The repository must accurately describe the database state.

Parameterized SQL containing placeholders such as `$1`, `$2`, and `$3` belongs in application code executed through the database client. Do not treat application parameter placeholders as directly executable SQL in a database console.

---

# 13. Canonical Domain

Cachet has canonical sports-domain entities including:

- sports;
- leagues;
- teams;
- players;
- events;
- markets.

Bet legs may reference canonical entities.

Canonical entities represent shared domain concepts, not user-specific copies.

For example:

    Aaron Judge

should be one canonical player referenced by many users' bet legs when identity is safely established.

Canonical enrichment should be conservative.

Rules:

- Do not create canonical entities from ambiguous data.
- Normalize before canonical enrichment.
- Preserve user ownership at the bet level.
- Canonical entities may be shared globally.
- Analytics queries must still be scoped to the authenticated user.
- Avoid duplicate canonical entities where identity can be safely established.
- Do not assume player name alone guarantees identity.
- If multiple plausible canonical matches exist, skip rather than guess.

Ambiguity should produce an observable skip, not silent incorrect enrichment.

---

# 14. Player Identity

Names are not globally unique identifiers.

Two players may:

- have the same name in different leagues;
- have the same name on different teams;
- theoretically share a name within the same competition.

Therefore:

> Never design canonical player identity around display name alone.

`players.id` is Cachet's internal identity.

Names, teams, and leagues are attributes used to help establish that identity.

Current matching may use the strongest information presently available, but architecture must preserve the ability to incorporate:

- league;
- team;
- external provider ID;
- event context;
- provider identity.

External/provider IDs should become preferred identity signals when reliable IDs become available.

Do not prematurely build a universal identity system, but do not create constraints that make future disambiguation difficult.

---

# 15. Enrichment

Enrichment connects normalized betting data to canonical entities.

Enrichment should be:

- idempotent;
- observable;
- conservative;
- retry-safe.

Useful enrichment outcomes include:

- inspected;
- matched;
- created;
- skipped.

A second run over already-enriched eligible data should normally produce no additional changes.

Example expected behavior:

First run:

    inspected > 0
    matched/created > 0

Second run:

    inspected = 0
    matched = 0
    created = 0

Do not hide ambiguous or failed enrichment behind successful counters.

---

# 16. Analytics Principles

Cachet analytics are about the user's betting behavior.

All user analytics must be scoped to the authenticated user.

Never allow another user's betting history to influence a user's personal analytics unless a future feature explicitly calls for aggregated or anonymized population data.

Analytics correctness requires both:

1. correct arithmetic;
2. correct classification and denominators.

Correct math over incorrectly classified data is still incorrect analytics.

---

# 17. Leg Performance vs Bet Performance

These are fundamentally different concepts.

Example:

James Wood selection:

    WON

Entire parlay:

    LOST

Both facts matter.

Therefore player analytics should distinguish:

## Leg Performance

How often selections involving the player hit.

Example fields:

    totalSelections
    settledSelections
    pendingSelections
    hits
    misses
    hitRate

## Bet Performance

How often bets containing that player ultimately won.

Example fields:

    totalBets
    wins
    losses
    winRate

Do not collapse these metrics.

A player can have:

    100% leg hit rate
    0% associated bet win rate

That is valuable bettor insight, not contradictory data.

---

# 18. Settled vs Pending Analytics

Pending selections are not losses.

This is a critical analytics invariant.

Definitions:

    settledSelections = hits + misses

    pendingSelections =
      totalSelections - settledSelections

Hit rate must use settled selections as the denominator:

    hitRate = hits / settledSelections

NOT:

    hitRate = hits / totalSelections

If:

    settledSelections = 0

then:

    hitRate = null

not:

    hitRate = 0

Zero percent means settled opportunities existed and none hit.

Null means there is not yet a settled sample.

Do not misrepresent absence of evidence as poor performance.

---

# 19. Market Performance

Player analytics may be broken down by market.

Example:

    Aaron Judge
      Home Runs
      Hits + Runs + RBIs
      Total Bases

Market performance should follow the same settled/pending rules as player performance.

Do not assume a player's performance is uniform across markets.

---

# 20. Losing Bet Attribution

Cachet should explain why otherwise successful selections appeared on losing bets.

Example:

A tracked player hits his line, but the parlay loses because other selections missed.

Cachet may expose:

- losing bets containing a successful player;
- selections that missed on those bets;
- player/market combinations associated with those losses;
- aggregate loss-contributor summaries.

Use language such as:

- missed selection;
- loss contributor;
- recurring co-leg miss.

Avoid claiming that a selection "caused" a loss when the data only establishes that it was one of the missed legs.

This is intended to evolve toward bettor-specific insight.

Do not turn attribution into recommendations prematurely.

---

# 21. Sample Size and Reliability

Future recommendations and evaluative labels require sufficient evidence.

Current planning assumption:

    minimum useful sample ≈ 10 observations

This is a working hypothesis, not a permanent universal threshold.

Do not hard-code it into unrelated systems without a product requirement.

However:

- do not describe 1/1 as a reliably strong player;
- do not describe 0/1 as a reliably poor player;
- distinguish descriptive statistics from meaningful trends;
- future UI should communicate sample size alongside rates.

Advanced recommendations should be evidence-backed.

---

# 22. Future Advanced Analytics

Planned future analytics include:

- strongest players by line hit rate;
- weakest players by line hit rate;
- strongest and weakest markets;
- player-market performance;
- time-window filters;
- recurring loss contributors;
- pairing performance;
- combination drag;
- personalized suggestions.

Potential time windows include:

- 7 days;
- 14 days;
- 30 days;
- season;
- all time.

Future filters may include:

- date range;
- sport;
- league;
- player;
- market;
- bet type;
- sportsbook.

Do not prematurely implement recommendation engines while foundational analytics are still incomplete.

---

# 23. Event Resolution — Future Architecture

Cachet will eventually need to resolve pending selections automatically.

Critical architectural rule:

> External result retrieval is keyed by canonical sporting entities and events, never by an individual user's bet.

Do NOT design result retrieval as:

    user
      ↓
    bet
      ↓
    external API request

Instead:

    users' bets
        ↓
    bet_legs
        ↓
    canonical_event_id
        ↓
    canonical event
        ↓
    one external result lookup
        ↓
    shared event/stat data
        ↓
    grade all affected legs

If 500 users bet on the same game, Cachet should resolve that event once.

External-data cost should scale approximately with:

    unique relevant events

not:

    users × bets

This is an architectural direction, not a requirement to build Event Resolution before current foundational work is complete.

---

# 24. Event Resolution Lifecycle

Future canonical events may use statuses such as:

- scheduled;
- in_progress;
- final;
- postponed;
- cancelled.

Potential fields include:

- starts_at;
- status;
- last_checked_at;
- next_check_at;
- completed_at.

A scheduled resolution process should eventually query events due for checking.

Conceptually:

    event scheduled
        ↓
    wait until reasonable resolution time
        ↓
    check provider
        ↓
    final?
      yes → persist results and stop polling
      no  → schedule next check

Use backoff rather than constant polling when possible.

A cheap daily stale-event sweep may detect events that became stuck, were postponed, or otherwise failed to resolve.

Do not poll every user's bet independently.

---

# 25. Event Results vs Participant Statistics

Knowing that an event ended is not enough to grade every market.

Separate these concepts:

    Event status
    "Did the game finish?"

    Event result
    "What was the final score?"

    Participant statistics
    "What did a player do?"

    Leg grading
    "Did this selection hit?"

Do not overload the `events` table with every participant statistic.

Shared statistics should eventually be retrieved and stored once and reused across users.

---

# 26. Futures Resolution

Season-long futures have a different lifecycle from same-day events.

Example:

    MLB 2026 - Player to Record
    30+ Regular Season Home Runs

Such selections may legitimately remain unresolved for months.

Do not poll futures using the same schedule as ordinary game events.

Future internal states may distinguish concepts such as:

- awaiting_event;
- event_in_progress;
- awaiting_result;
- future_open.

These do not necessarily need to be user-facing.

---

# 27. Demand-Driven Sports Data

Cachet does not need to monitor every sporting event in existence.

Events should generally enter result tracking because a user imported a bet referencing them.

Conceptually:

    user imports bet
        ↓
    resolve/create canonical event
        ↓
    event becomes relevant to Cachet
        ↓
    event enters resolution lifecycle

If another user imports a bet for the same canonical event:

    reuse existing event

Do not create duplicate monitoring work.

---

# 28. TDD Workflow

New behavior should normally follow:

    RED
      ↓
    GREEN
      ↓
    REFACTOR

Required workflow:

1. Write a test expressing the desired behavior.
2. Run the focused test.
3. Confirm it fails for the intended reason.
4. Implement the smallest correct change.
5. Run the focused test again.
6. Run the relevant test group.
7. Run the full test suite.
8. Review the diff for unintended changes.

Do not skip step 3.

A red test is useful only if it fails for the behavior being introduced.

For bug fixes:

> First create a regression test that reproduces the bug.

---

# 29. Testing Philosophy

Tests should protect behavior and invariants, not implementation trivia.

High-value tests include:

- normalization classification;
- raw-data preservation;
- user-data isolation;
- canonical matching ambiguity;
- idempotent enrichment;
- safe backfills;
- analytics denominators;
- settled vs pending behavior;
- repository/service contracts;
- regression tests for previously discovered production bugs.

When a production bug is discovered:

> Add a regression test that would have prevented it.

Do not simply patch the production code.

---

# 30. Never Weaken Tests to Make Them Green

If a test unexpectedly fails:

1. Determine whether the test is wrong or the implementation is wrong.
2. Explain the discrepancy.
3. Fix the correct layer.

Do NOT:

- remove assertions because implementation differs;
- loosen equality checks without justification;
- change expected values merely to match current output;
- mock away the behavior being tested;
- delete a failing regression test because the fix is inconvenient.

A failing test may reveal an architectural flaw.

Treat unexpected failures as information.

---

# 31. Mocking and Test Boundaries

Be careful with Vitest module mocking.

`vi.mock()` is hoisted.

Prefer `vi.hoisted()` for shared mock definitions used inside mock factories when necessary.

Do not accidentally import runtime database modules such as `pg` into unit tests intended to mock persistence boundaries.

Where useful, separate:

- repository contracts/types;
- repository runtime implementation.

This allows services and pure logic to be tested without loading infrastructure modules unnecessarily.

Do not create interfaces solely for mocking if the existing boundary is already clean.

---

# 32. Idempotency

Operations that may be retried should be designed for safe repetition.

Especially:

- normalization backfills;
- enrichment;
- canonical entity creation;
- import processing;
- future event resolution.

A second identical run should not create duplicate entities or corrupt already-correct data.

When possible, expose counters that make idempotency observable.

---

# 33. Observability

Operational and repair processes should report meaningful outcomes.

Useful counters include:

- inspectedCount;
- matchedCount;
- createdCount;
- updatedCount;
- unchangedCount;
- skippedCount;
- errorCount.

Health diagnostics may expose coverage for important pipeline stages.

Examples:

- parsed sport coverage;
- parsed league coverage;
- player-name coverage;
- market coverage;
- canonical sport coverage;
- canonical league coverage;
- canonical player coverage;
- canonical market coverage;
- canonical event coverage;
- unenriched counts;
- possible normalization misses.

Observability is part of the feature, not an afterthought.

Engineering diagnostics do not automatically belong in the user-facing product.

Keep operational observability distinct from product UX unless explicitly required.

---

# 34. User Isolation

This is non-negotiable.

Analytics, bets, rankings, and personal insights must be scoped to the authenticated user.

Canonical entities may be global.

User betting history is not.

Every analytics repository query should make ownership scope explicit.

When modifying analytics code, verify user isolation with tests.

Do not accidentally aggregate one user's history into another user's results merely because both reference the same canonical entity.

---

# 35. Security and Secrets

Never:

- commit credentials;
- commit access tokens;
- hard-code production secrets;
- expose authentication tokens in logs;
- include real secrets in fixtures;
- print sensitive environment variables during debugging.

Use environment variables and existing environment abstractions.

Test credentials should remain confined to development and test workflows.

---

# 36. Scope Discipline

When given a vertical-slice task:

Do:

- modify the minimum necessary files;
- preserve existing public behavior unless explicitly changing it;
- add targeted tests;
- report adjacent issues separately.

Do NOT:

- perform unrelated cleanup;
- rename unrelated modules;
- introduce broad abstractions;
- change formatting across unrelated files;
- migrate unrelated data;
- silently fix adjacent behavior.

If an adjacent issue materially blocks the requested change, explain it before expanding scope.

---

# 37. Refactoring Rules

Refactor when:

- duplication has become meaningful;
- an abstraction boundary is demonstrably wrong;
- new behavior is difficult to implement safely without restructuring;
- tests provide sufficient protection.

Do not refactor because code could theoretically be cleaner.

Prefer:

    behavior first
    evidence second
    abstraction third

---

# 38. Utility Extraction

Do not move helpers into shared abstractions merely because multiple future domains might eventually need them.

Example:

If player slugging works locally and no demonstrated reuse problem exists, leave it local.

Extract shared utilities when actual reuse, inconsistency, or testing pressure appears.

This applies broadly:

> Earn abstractions through demonstrated need.

---

# 39. External Providers

Future sports-data providers should sit behind an application boundary.

Domain and service code should not become tightly coupled to a specific vendor response format.

Conceptually:

    sports provider
        ↓
    provider adapter
        ↓
    Cachet domain representation

This will allow provider replacement or multi-provider strategies later.

Do not build this abstraction until external result retrieval or another concrete provider integration actually requires it.

---

# 40. Performance and Cost

Optimize based on demonstrated cost, not imagined scale.

However, avoid architectures with obviously multiplicative cost.

Good:

    one canonical event
        ↓
    one result retrieval
        ↓
    many user legs graded

Bad:

    every user bet
        ↓
    separate request for the same event

Database queries should be appropriately scoped and indexed when demonstrated query patterns require it.

Do not add speculative indexes without a query pattern.

---

# 41. Agent Workflow

Before coding:

1. Read this file.
2. Inspect the relevant implementation.
3. Inspect relevant tests.
4. Trace the current data flow.
5. Identify the smallest architectural boundary affected.
6. State assumptions if behavior is ambiguous.

During implementation:

1. Add or modify tests first.
2. Run them and confirm RED for the intended reason.
3. Implement the smallest correct change.
4. Run focused tests.
5. Run the relevant test group.
6. Run the full suite.
7. Review the diff.

Before completion:

- verify no unrelated files changed;
- verify migrations exist for schema changes;
- verify raw data is preserved;
- verify user scope where applicable;
- verify no secrets were introduced;
- verify tests cover the new invariant;
- verify the full suite passes;
- verify no destructive production operation was performed.

---

# 42. Agent Completion Report

When completing a task, report the following.

## Summary

What behavior changed.

## Files Changed

List files and why each changed.

## Tests Added or Changed

Describe the behavior protected.

## Verification

List commands actually run and their results.

Example:

    npx vitest run test/analytics/rankingsService.spec.ts
    PASS

    npm run test
    PASS

Do not claim a command passed unless it was actually executed.

## Data / Schema Impact

State whether the task:

- adds a migration;
- changes persisted data;
- requires a backfill;
- requires manual database action.

If none apply, explicitly say so.

## Risks / Follow-ups

Report architectural concerns, uncertainty, or adjacent issues without expanding scope automatically.

---

# 43. Destructive Operations

Do not perform destructive production-data operations automatically.

An agent may:

- write a migration;
- write repair SQL;
- write verification SQL;
- test repair behavior;
- explain expected effects.

An agent should NOT automatically:

- delete production data;
- execute broad historical repair against production;
- drop tables or columns;
- perform irreversible production migrations;
- modify production data merely to make diagnostics look correct.

Prepare potentially destructive operations and require explicit human review and execution.

---

# 44. Current Architectural Direction

Cachet is currently establishing the foundation required for trustworthy analytics.

The system is evolving toward:

- reliable sportsbook parsing;
- source-preserving normalization;
- normalization versioning;
- conservative canonical enrichment;
- trustworthy canonical player, market, and event identity;
- user-scoped analytics;
- explicit settled vs pending semantics;
- separation of leg performance from bet performance;
- loss-contributor analysis;
- player and market performance over meaningful sample sizes;
- time-window analytics;
- frontend analytics built on trustworthy backend semantics;
- demand-driven canonical event resolution;
- eventually, evidence-backed personalized betting insights.

This section describes architectural direction, not implementation priority.

Do not assume the order above is the current task order.

The task prompt determines what should be implemented now.

---

# 45. Guiding Question

When uncertain, ask:

> Does this change make Cachet's understanding of the user's betting history more truthful, explainable, and safely evolvable?

If the answer is unclear, stop and surface the decision rather than guessing.

---

# Platform-Specific Instructions

The following instructions apply when working with the technologies used by Cachet.

Platform-specific instructions supplement the Cachet engineering rules above.

They do not override Cachet's architecture, data-integrity, testing, user-isolation, or safety requirements.

---

# Cloudflare Workers

STOP. Your knowledge of Cloudflare Workers APIs and limits may be outdated. Always retrieve current documentation before any Workers, KV, R2, D1, Durable Objects, Queues, Vectorize, AI, or Agents SDK task.

## Docs

- https://developers.cloudflare.com/workers/
- MCP: https://docs.mcp.cloudflare.com/mcp

For all limits and quotas, retrieve from the product's `/platform/limits/` page. For example: `/workers/platform/limits/`.

## Commands

| Command | Purpose |
|---------|---------|
| `npx wrangler dev` | Local development |
| `npx wrangler deploy` | Deploy to Cloudflare |
| `npx wrangler types` | Generate TypeScript types |

Run `wrangler types` after changing bindings in `wrangler.jsonc`.

## Node.js Compatibility

https://developers.cloudflare.com/workers/runtime-apis/nodejs/

## Errors

- **Error 1102** (CPU/Memory exceeded): Retrieve limits from `/workers/platform/limits/`
- **All errors**: https://developers.cloudflare.com/workers/observability/errors/

## Product Docs

Retrieve API references and limits from:

`/kv/` · `/r2/` · `/d1/` · `/durable-objects/` · `/queues/` · `/vectorize/` · `/workers-ai/` · `/agents/`