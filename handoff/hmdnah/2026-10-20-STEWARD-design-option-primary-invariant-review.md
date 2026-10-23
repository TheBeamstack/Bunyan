# STEWARD-design-option-primary-invariant review — PR #101 — 2026-10-20 — seat: hmdnah

- **implements:** one-turn review (`../diwan/docs/REVIEW-PROMPT.md`) of PR #101 at head `98b8d1a`, a docs-only
  steward PR adding T-055 and deleting the 2026-08-17 `## Discovered` finding it converts.
- **changed:** nothing in the PR's content; this record and `docs/PHASE_LOG.md`.
- **verdict:** approved; no defect proven.
- **verified:**
  - item 1 (the claim is the defect and the fix shape): a temporary probe `tests/zz-hmdnah-probe-t055.test.ts`
    (wA/wB tagged opt-a/opt-b in one set, code road and `loadBnn(saveBnn(...))` road) asserting T-055's first
    three done-when entries → RED, 4 failed, `expected [] to deeply equal [ [ 'wA', 'opt-a', 'wA' ], …(1) ]`;
    logged `isElementActive` wA=wB=`true` (two primaries) and wA=wB=`false` (none) on both roads. A
    temporary `primaryViolations` spread into `brokenRefs()` in `document.ts` → GREEN, `npx vitest run` of the
    probe + `design-option-refs` + `design-option-crud` → 28 passed. Probe and edit removed; tree clean.
  - item 4: `commands.ts:2665` (`checkPrimaryInvariant`) and its calls `:2768`, `:2821`, `:2844`;
    `bnn.ts:411-415` (plain-object check only); `document.ts:283` (`options.scene` unchecked);
    `designoptions.ts:140` (`option.isPrimary`); `document.ts:1551` (`danglingDesignOptionRefs`) read as the row says.
    D65/D85/D86 and both design-doc sections the row's `implements:` names exist.
  - frozen surface: `document.ts` is not in `.agent.toml [frozen_surface] watched`; `designoptions.ts` and
    `entities.ts` are, and the row keeps the fix out of both.
  - done-when: all five are headless `npx vitest run` assertions or `git diff --name-only`; no `requires:` needed.
  - item 7: `node scripts/reserved-classes.mjs --base a7c903e` → `none — RISK: additive`. Not owner-gated.
  - docs: `npx vitest run tests/docs-budget.test.ts` → 23 passed.
  - identity: `agent_start.py` → `✓ gh identity: narutousomaki741`.
- **items 2, 3, 5, 6:** n/a. No code rule, no new kind of entity, no unmethoded figure, no test added.
- **notes (opinion, non-blocking):** the row reports only elements tagged in the set; an untagged element hosted
  on one (D67's cascade) is double-counted or dropped with it and gets no entry. T-055's builder should say
  whether the tagged element's entry covers it.
- **risk:** normal (STEWARD PR); not owner-gated.
