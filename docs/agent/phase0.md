# Phase 0: Recon & Spike

## 0.1 Package Manager & Dependencies

- **Manager**: `pnpm` (repo standard, already in use)
- **New devDependencies installed** (verified in `package.json`):
  - `inngest@^4.26.2` (SDK v4)
  - `@inngest/agent-kit@^0.13.2` (v0.9+, requires separate inngest dep)
  - `elkjs@^0.12.1` (layout algorithm)
  - `zod@^4.6.7` (validation)
  - `vitest@^5.1.0` (test runner, co-exists with node:test)
  - `fast-check@^4.10.2` (property-based testing)
- **Pinned versions** recorded in `pnpm-lock.yaml` after install

## 0.2 Yjs Document Structure (Repo Facts)

- **SharedDoc**: `{ elements: Y.Map<Y.Map<unknown>>; order: Y.Array<string> }`
- **Element types** (from `src/types/`): rectangle, ellipse, line, arrow, freehand, text, image
- **Locked flag**: Represented via `isLocked` boolean on Y.Map elements (verify in `type.ts`)
- **Yjs origin**: `LOCAL_ORIGIN` used by `useCanvasActions`; agent origin tracks via `AgentOrigin` = `{ agent: true, runId, invokedBy }`
- **43 files** import from `yjs` — existing patterns reused in adapter

## 0.3 Element Schema (What Agent Needs to Know)

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Unique across doc |
| `type` | `'rectangle' \| 'ellipse' \| ...` | Agent maps its ops to these |
| `x`, `y` | `number` | Position |
| `width`, `height` | `number` | Size |
| `isLocked` | `boolean` | **Critical**: agent must respect locked elements |
| `label` | `string \| undefined` | Node label for flow diagrams |
| `fillColor`, `strokeColor` | `string` | Visual styling |
| `author` | `number` | Client ID (Yjs) |

## 0.4 Inngest + AgentKit Setup

- **Function**: `agent-run-command`
- **Trigger**: `agent/command.received` event
- **Concurrency**: `roomId` key, limit 1 (prevents concurrent runs per room)
- **Step IDs** (stable, explicit per attempt):
  - `command-handled`
  - `intent-attempt-1`, `intent-attempt-2`
  - `plan-attempt-1`, `plan-attempt-2`
  - `validate-attempt-1`, `validate-attempt-2`
  - `layout-attempt-1`, `layout-attempt-2`, `layout-attempt-3`
  - `compile-attempt-1`
  - `verify-attempt-1`, `verify-attempt-2`, `verify-attempt-3`
  - `commit-attempt-1`
- **Events sent**: `agent/question.asked`, `agent/change.proposed`, `agent/change.decided`, `agent/run.completed`
- **Timeouts**: question answer 5min, decision 10min

## 0.5 Model Mocking Strategy (Decision Required)

**Two options for later selection:**

**Option A: Fixture-Backed Model**
- `@inngest/agent-kit` supports custom model → load fixtures from `src/agent/fixtures/`
- `plan-fixture.json`, `question-fixture.json`, `refuse-fixture.json`
- Tests replace model with fixture loader

**Option B: Step AI Mocking** (fallback)
- Mock `step.ai` calls by step id → return predetermined JSON
- Example: `step.run('plan-attempt-1', async () => planFixture)`
- Document in `ASSUMPTIONS.md` which chosen

**Senior call**: Design domain layer model-agnostic; Inngest functions call `step.ai` which can be swapped.

## 0.6 Test Framework Co-Existence

- **Existing**: `node:test` (import from 'node:test')
- **New**: `vitest` (for property-based tests, elkjs integration)
- **Configuration**: `vitest.config.mts` at repo root
  - `test: node:test files match **/test/*.ts`
  - `vitest: **/agent/**/*.ts, **/evals/*.ts`
- **Migration path**: Run existing tests with `pnpm test`, new agent tests with `pnpm test:agent` or `vitest run`

## 0.7 Property-Based Testing Specs

- **Library**: `fast-check`
- **Property 1**: `forAll(validPlan(1,25), plan => {
    const ops = verify(layout(compile(plan)));
    assert(ops.length === 0, 'no violations');
    const ops2 = verify(layout(compile(plan)));
    assert(ops.equals(ops2), 'byte-identical');
  })`
- **Property 2**: Deterministic refusals — same input refusal reason → same output message
- **Property 3**: Layout same input → same node positions (ELK deterministic)

## 0.8 Critical Design Boundaries (Enforced)

```
❌ Domain layer: NO inngest imports, NO yjs imports
✅ Domain layer: pure TS, exports types only
✅ Inngest functions: import from domain, use step.run/step.ai
✅ Adapter layer: ONLY place knowing real OnlyDraw schema
✅ No Date.now, Math.random in domain code
✅ No non-deterministic operations outside steps
```

## 0.9 Run Log Format (From Day One)

```json
{
  "runs": [
    {
      "commandId": "cmd_abc123",
      "stages": [
        { "stage": "command", "attempt": 1, "input": { "text": "..." }, "output": { "intent": "act" } },
        { "stage": "intent", "attempt": 1, "input": {}, "output": { "kind": "act", "diagram": "flow" } },
        { "stage": "plan", "attempt": 1, "input": {}, "output": { "nodes": [...], "edges": [...] } },
        { "stage": "validate", "attempt": 1, "input": {}, "output": { "valid": true } },
        { "stage": "layout", "attempt": 1, "input": {}, "output": { "positions": {...} } },
        { "stage": "compile", "attempt": 1, "input": {}, "output": { "ops": [...] } },
        { "stage": "verify", "attempt": 1, "input": {}, "output": { "passed": true } },
        { "stage": "commit", "attempt": 1, "input": {}, "output": { "committedIds": [...] } }
      ],
      "meta": {
        "timestamps": { "start": "...", "end": "...", "stageDurations": {...} },
        "durations": { "total": 1234, "modelCalls": 150 }
      }
    }
  ]
}
```

## 0.10 Spike Checklist (Gate: `pnpm spike:verify`)

- [ ] Inngest dev server (`npx inngest-cli@latest dev`) registers hello function
- [ ] Event triggers function, step retry works after failure
- [ ] `waitForEvent` round-trip (question → answer → continue)
- [ ] Test engine runs function without dev server (fixture mode)
- [ ] One AgentKit agent call works (or record as skipped with reason)
- [ ] All above printed pass/fail summary

## 0.11 Assumptions to Record in `ASSUMPTIONS.md`

1. Package manager: pnpm, exact versions pinned after install
2. Test framework: vitest + node:test co-exist; agent tests use vitest
3. Model mocking: Option A (fixture) or Option B (step.ai mock) — decide in Phase 0 review
4. Yjs adapter: ONLY `onlydraw-adapter.ts` knows real element schema; domain stays schema-agnostic
5. ELK layout: `direction: RIGHT` default; option to run in worker later; option names verified from elkjs docs
6. Text measurer: test uses fixed-width; real one reuses canvas renderer (flagged Not verified if unsharable)
7. Property tests: fast-check generates valid plans; 3 geometric retry attempts max
8. Inngest concurrency: `roomId` key, limit 1 — cannot have concurrent runs per room
9. Undo scope: one transaction per runId; undo removes whole run only
10. No scope creep: document any out-of-scope ideas in ASSUMPTIONS.md for future