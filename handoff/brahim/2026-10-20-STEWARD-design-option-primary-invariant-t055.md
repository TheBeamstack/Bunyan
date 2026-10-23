# STEWARD-design-option-primary-invariant — T-055: a design-option set's primary count surfaces in brokenRefs() — 2026-10-20 — brahim

## What was done

- `docs/BACKLOG.md`: `backlog.py add` appended T-055 after T-054, and the 2026-08-17 `## Discovered` finding it converts is deleted (R12).
- Every `ready` box row and open PR is held by a blocker or a pending decision (cycle sheet `skip:` line), so this was the cycle's available steward work.
- A row-less diagnosis subagent (R39) re-measured the finding at `a7c903e` with a temporary probe it deleted afterwards.
- The fix shape is (b) of the finding, surfacing in `brokenRefs()`, because `entities.ts:715-719` says a broken reference is never auto-healed and the document must still load.
- `risk: normal`: `document.ts` is outside every auto-high class (READY criterion 8), and T-007, the closest precedent, was `normal`.
- No `requires:` is needed: every check is a headless `npx vitest run`.

## Evidence

| Claim | Command / source |
|---|---|
| both primaries count, and both drop out with none | subagent probe, `npx vitest run tests/zz-probe-primary.test.ts`: `wA`/`wB` both `true` (two primaries), both `false` (none), code and `.bnn` roads |
| neither case is reported | same probe: `brokenRefs` 0, `unbuildable` 0 |
| enforced only at the CRUD doors | `packages/document/src/commands.ts:2665`, `:2768`, `:2821`, `:2844` |
| the load and construction roads are unchecked | `packages/document/src/bnn.ts:411-415`, `packages/document/src/document.ts:283` |
| precedent for the fix site | `packages/document/src/document.ts:1551` (`danglingDesignOptionRefs`, D86) |

Not verified: the probe source is not committed; T-055's own tests replace it.

## Next

`hmdnah` reviews this PR. After it merges, a box builder turn may take T-055.
