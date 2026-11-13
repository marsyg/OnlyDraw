# Assumptions — OnlyDraw Agent v1

## 1. Package Manager
- **pnpm** is the package manager; all dependency installs use `pnpm add -D`.
- Exact versions are pinned in `pnpm-lock.yaml` after initial install.
- Command: `pnpm install` (or `pnpm fetch` then `pnpm install`).

## 2. Test Framework
- **vitest** and **node:test** co-exist in the repo.
- Agent unit tests and property tests use `vitest`.
- Existing tests (in `test/`) continue to run with `pnpm test` (which invokes node:test).
- New agent tests: `vitest run` or `pnpm test:agent`.

## 3. Model Mocking Strategy
- **Decision pending** (to be recorded after Phase 0 review):
  - **Option A**: Fixture-backed model — `@inngest/agent-kit` supports a custom model loader; fixtures live in `src/agent/fixtures/` and are loaded by step id.
  - **Option B**: Step AI mocking — `step.ai` is mocked per step id, returning predetermined JSON fixtures.
- Once decided, document the chosen option in this file and update `docs/agent/phase0.md` accordingly.
- All domain logic (plan, validate, layout, compile, verify) remains model-agnostic; only Inngest functions call `step.ai`.

## 4. Yjs Adapter Design
- **ONLY** `src/agent/canvas/onlydraw-adapter.ts` knows the real OnlyDraw element schema (`src/types/`).
- All other domain code (`src/agent/domain/`) stays schema-agnostic, working with abstract types (`ElementSummary`, `Op`, `ProposedChange`).
- Adapter maps agent ops → real YElement types at commit time.
- If adapter cannot share TextMeasurer with canvas renderer → flag under "Not verified" in final report.

## 5. ELK Layout
- `elkjs` layout algorithm, `direction: RIGHT` by default.
- v1 runs in-process (no worker setup yet).
- Option to run in a Web Worker later; not required for v1.
- ELK option names will be verified from the `elkjs` docs during Phase 1 implementation.

## 6. Text Measurer
- **Test mode**: Uses a fixed-width measurer (simple, deterministic).
- **Real mode**: Must reuse the canvas renderer's measurement function headlessly.
- If the real measurer cannot be shared headlessly → flag under "Not verified" in final report.
- `TextMeasurer` interface defined in `src/agent/domain/`; two implementations: test and real.

## 7. Property Tests
- **fast-check** generates random valid plans (1 to 25 nodes).
- Property: `forAll(validPlan(1,25), plan => { verify(layout(compile(plan))) produces zero violations }`.
- Same input must yield byte-identical ops across runs.
- Maximum 3 geometric retry attempts on violations.

## 8. Inngest Concurrency
- Function `agent-run-command` has `concurrencyKey: roomId, limit: 1`.
- **Cannot** have concurrent runs per room — if a second command arrives for the same roomId, it waits (or is rejected depending on policy).
- This is a hard constraint from the doc's "single agent-origin Yjs transaction" requirement.

## 9. Undo Scope
- One transaction per `runId` — the whole run is committed/undone together.
- `undoRun(roomId, runId)` removes the entire run's elements; human elements are untouched.
- A retried commit step (same `runId`) must not duplicate elements — idempotent by design.

## 10. No Scope Creep
- Any out-of-scope ideas (voice, learning loop, multi-diagram, UI, etc.) are documented in this file under "Known Issues" for future consideration.
- v1 strictly adheres to the "In scope" list from the design doc.

## 11. Run Log Structure
- One file per run at `runs/<commandId>.json`.
- Ordered list of `{ stage, attempt, input, output }` for: command, intent, policy, plan, validate, layout, compile, verify, commit and outcome.
- Timestamps and durations in a separate `meta` field so the rest is deterministic.
- File format stabilized for future TraceDiff input.

## 12. Critical Design Boundaries (Enforced)
- ❌ Domain layer: NO inngest imports, NO yjs imports
- ❌ No `Date.now` or `Math.random` in domain code
- ❌ No non-deterministic operations outside `step.run`
- ✅ All model interaction goes through `step.ai` in Inngest functions
- ✅ Adapter is the single point knowing real OnlyDraw schema
- ✅ Property tests run fast-check with seeded mode for reproducibility