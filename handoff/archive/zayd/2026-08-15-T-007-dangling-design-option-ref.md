# T-007 — a dangling `designOptionId` is a broken reference, and it is derived rather than stored

**Seat:** `zayd` (builder, box — headless). **Date:** 2026-08-15. **Decisions:** D86 (Q17c), D65, D67,
D68. **Task:** `docs/BACKLOG.md` T-007.

## 1. What was missing

`isElementActive` excludes an element whose `designOptionId` names no option in the document, and its own
comment calls that _"a BROKEN REFERENCE, not a licence to include it … a future body surfaces it (domain
rule 3)."_ The body was never written. Entry 82 measured what the silence costs: two identical walls, one
tagged, and a whole-model schedule reports **1 row and 3 600 000 000 mm³ where 7 200 000 000 is correct**,
carrying `basis: 'exact'`, with `brokenRefs()` and `unbuildable()` both empty
(`docs/design/P5_step6D_design_options_crud_design.md` §1.4).

D86 rules that `brokenRefs()` reports it, and that nothing else changes.

## 2. The fix

`danglingDesignOptionRefs(scene)` in `packages/document/src/document.ts` walks `scene.elements`, resolves
each `designOptionId` through `unresolvedDesignOptions` — the same predicate the schedule and view doors
use, so the third door cannot drift from the other two — and returns one `BrokenReference` per
unresolvable tag. `DocumentContext.brokenRefs()` returns the stored geometry-derived list followed by it.

**It is derived at the query, not staged into `scene.brokenRefs`.** `#stage` re-derives that field only
for the assemblies it rebuilds and carries the rest forward untouched, so an entry staged there would go
stale on every element whose assembly the next partial rebuild does not touch — D74's defect, in a
population where the subject is not even a rebuild root. A dangling tag is a pure fact about
`scene.elements` and needs no build to be true, so deriving it on read is both correct and cheaper than
teaching the staging filter to tell the two producers apart. It also leaves D74's _"exactly one producer,
and it reads `scene.elements`"_ invariant on `scene.brokenRefs` intact.

**`hostId` is set to the element's own id.** The reference is not hosted on anything, and
`interface BrokenReference` is a watched declaration that freezes at P5 — widening it to say so would have
made a diagnostic field `RISK: contract-touching`. No consumer reads the field: `App.tsx`'s panel and
`agent.ts`'s projection both take `elementId`/`ref`/`reason` only.

## 3. Where it lives, and why not in `designoptions.ts`

The rule stays in `designoptions.ts`; only the diagnostic is in `document.ts`. `build.ts` already produces
the geometry-derived broken references and `document.ts` unions them, so a scene-derived producer sitting
beside `brokenRefs()` is the shape that already existed. T-008's (c) half — a dangling `hostId` /
`parentElementId` ancestor — is the same kind of fact and extends this union rather than adding a second
surfacing path.

## 4. Verification

`pnpm verify` green: **836 tests across 94 files**, all six gates, real exit code 0, against the real OCCT
kernel. `tests/freeze-boundary.test.ts` green ⇒ the frozen surface has not moved.

**Revert-verified.** With `brokenRefs()` returned to `this.#scene.brokenRefs`,
`tests/design-option-refs.test.ts` goes **2 RED** in 1.3 s: `expected [] to have a length of 1 but got +0`
— the silence itself — and the derived-from-the-scene case fails on the missing second entry. Restoring
the union returns 8/8 green.

## 5. What the tests assert

`tests/design-option-refs.test.ts` §4, driven through the verbs against a real kernel:

- a wall created with `designOptionId: 'ghost'` is **accepted**, **built** (`partsOf` non-empty), and
  **still excluded** from `modelElements()` — the three halves D86 must not move, or it pre-empts Q17b;
- `brokenRefs()` names it once, with the option id as the `ref`;
- a resolvable tag and an untagged element report **nothing** — without this, a body reporting every
  element would pass the first test;
- a hand-assembled `Scene` (D43's population — no verb involved) reports the new entry **beside** the
  stored one, which is what fails if the union is ever written as a replacement.

## 6. Backward sweep — two fixtures came past deliberately

Invariant 7: a new rule binds the next consumer and nothing else. Six tests in two files went red, all
from the same shape — `tests/option-cascade-d67.test.ts` and `tests/model-enumeration.test.ts` tag
elements and supply the catalogue as a **consumer override** rather than storing it in the scene, which is
the only road available while `scene.designOptions` has no authoring verb. Both fixtures assert
`brokenRefs()` empty after building, and what that assertion is for is _"no window lost its host face"_.
Each now filters the option ids out of the list rather than expecting zero, with the reason named at the
site. **Until the catalogue CRUD lands (D85, T-011), every tagged element on this product is a broken
reference** — which is D86 reporting the truth, not a false positive.

## 7. What this does not do

Nothing refuses and nothing is permitted that was not. `core.createElement` still accepts an unresolvable
`designOptionId` (Q17b, ruled: no stopgap), `isElementActive` is untouched, and the 50% under-report is
unchanged in size — it is only no longer silent. The number itself closes when the catalogue can be
authored (D85, T-011).

## 8. Files

- `packages/document/src/document.ts` — `danglingDesignOptionRefs` NEW; `brokenRefs()` unions it.
- `packages/document/src/designoptions.ts` — comments only; `ownTagActive` and the file header now name
  the body instead of promising it.
- `tests/design-option-refs.test.ts` — §4 NEW (+3).
- `tests/option-cascade-d67.test.ts`, `tests/model-enumeration.test.ts` — the two fixture assertions.
- `current_state.md` — this abstract; **Entry 82 rotated** to `docs/history.md` §C, which is now
  contiguous over 54–84.
