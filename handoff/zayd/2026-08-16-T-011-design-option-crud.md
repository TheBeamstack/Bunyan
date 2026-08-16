# T-011 — Q17a — `scene.designOptions` becomes a `SceneCollection`, and its CRUD ships

**Seat:** `zayd` (builder, box — headless). **Date:** 2026-08-16. **Decisions:** D85 (Q17a, the ruling),
D65, D67, D68, D79, D86. **Task:** `docs/BACKLOG.md` T-011. **Design:**
`docs/design/P5_step6D_design_options_crud_design.md`.

## 1. What was missing

0 of 40 commands could author a design option. `core.createElement` has accepted a `designOptionId` since
row Ⓕ (D65), and the schedule/view doors have refused an unresolvable one since the same row, and T-007/D86
made a dangling tag a reported `BrokenReference` — but nothing could ever mint a resolvable id, so the
reservation was reachable only in the negative. Measured through the shipped verbs before this unit
(design doc §1.4, reproduced in `tests/design-option-crud.test.ts`'s RED case): two identical
6000×200×3000 walls, one tagged with an id nothing had ever minted — `modelElements()` returns **1 of 2**,
a whole-model schedule totals **3 600 000 000 mm³ where 7 200 000 000 is correct**, wearing
`basis: 'exact'`, with `brokenRefs()` naming the dangling tag but `unbuildable()` empty. D65's own named
failure mode (a schedule double-counting an optioned element), arriving inverted — 0.5000× under instead of
2.0000× over.

## 2. The fix

**Three ordinary additive verbs** (`commands.ts`): `core.createDesignOption` / `updateDesignOption` /
`deleteDesignOption`, the `createSchedule`/`createView` template exactly — minted id (D44), materialises
`scene.designOptions` on first authoring (no `emptyScene()` entry, D79's trick verbatim), registered in
`CORE_COMMANDS`.

**The primary invariant is enforced at the door**, not left for `ownTagActive` to paper over
(`designoptions.ts`'s own comment): `checkPrimaryInvariant` validates the MERGED set after create/
update/delete and refuses anything other than exactly one `isPrimary` per `setName` — except one place,
documented because it is the one place this unit does not just refuse:

> **Promoting an option to primary (`updateDesignOption({isPrimary: true})`) atomically demotes the set's
> other primary, in the SAME `UndoableEdit`.** Without it, swapping a set's primary deadlocks: demote the
> old one first and the set has zero primaries (refused); promote the new one first and it has two
> (refused too) — no ordering of two single-option calls ever succeeds. `core.createDesignOption` does
> NOT do this (an explicit `isPrimary:true` against an existing primary is refused) — a brand-new row
> silently stealing an existing option's primacy is not a gesture a create should ever perform, and
> keeping create strict is what makes the "two explicit primaries" refusal path testable at all.

**Delete is a full D51 refuse-or-retarget**, `designOptionReferrers` covering all three writable referrer
classes named in the design (§4.2): `Element.designOptionId`, `ViewDescriptor.designOptionIds`,
`ScheduleDefinition.designOptionIds`. Unlike D79's sheet case every rung is real — `redirect` never has to
refuse because nothing can retarget the collection it lives in.

**The dependency edge is NOT a declared "nothing"** (`dependency.ts`'s new `designOptions` case) — the
`schedules`/`views` argument ("a projection reads the model, the model does not read the projection")
does not transfer: `partnersAt`/`assembleRoomInput` (D68) read the active option selection WHILE
BUILDING, so which option is primary changes a built B-Rep (the ambiguity flip). The conservative,
D73-consistent form the design settles for: re-stage every element tagged into the CHANGED option's set,
plus everything hosted or parented on one of them (D67, `belongsToDescendants` — a forward walk of the
same edge `isElementActive` walks backward). This closed the compiler's `TS2345` in the exhaustive switch
(Entry 33's mechanism) as its own proof the edge is now declared.

**The hostile-`.bnn` guard** (`bnn.ts`) gained `designOptions` alongside `schedules`/`views` — it had a
reader (`isElementActive`) before it had a writer, and a writer is what makes a `null` value reachable as
an object.

## 3. Verification

`pnpm verify` green, foreground, real OCCT kernel, real exit code 0: **main suite 913 tests / 96 files**;
`docs:check` **146 tests / 8 files**. `tests/freeze-boundary.test.ts` green because the baseline was
re-generated in this same PR (below) — the live diff against `origin/main`'s committed baseline is exactly
the one declaration the design doc predicted:

```
CHANGED (1):
  packages/document/src/scene.ts :: type SceneCollection
```

**⚠⚠ `RISK: contract-touching`, ruled in advance by the design doc itself (§3.2) and D85's own sentence —
the owner merges this PR, not the reviewing agent.** `risk: high` per the BACKLOG row too, so D88's
two-step review applies on top of the owner-merge requirement.

**Revert-verified.** `git stash` on the five touched `packages/document/src/*.ts` files, keeping the new
test: **12 of 13 tests in `tests/design-option-crud.test.ts` go RED** (`unknown command
"core.createDesignOption"`) — the one survivor is the RED baseline test itself, which asserts the
UNCHANGED defect and is not supposed to move. `git stash pop` restores 13/13 green, and
`tests/design-option-refs.test.ts`'s existing 8 tests are unaffected (21/21 across both files).

## 4. What the tests assert (`tests/design-option-crud.test.ts`, 13 new)

- the three verbs exist and close 0-of-40; the collection materialises on first authoring into a scene
  that predates it (no raw `TypeError`); a document that never authors an option matches `emptyScene()`
  byte-for-byte — create-then-undo restores to an EMPTY collection, not an absent key (the `views`
  precedent, `plan-section.test.ts` §8, not a new claim);
- create → undo → redo and update/delete each mint their own `UndoableEdit`, asserted against the journal;
- the primary invariant refused in BOTH directions — two explicit primaries (create) and zero primaries
  (an explicit demote with nothing promoted) — and the promote-then-delete swap that would otherwise
  deadlock;
- delete's referrer guard exercised against all three classes (element / view / schedule), REFUSED without
  `retargetMap`/`acknowledge`, and the redirect actually rewrites the referring id;
- the dependency edge re-stages the tagged wall AND its hosted opening, and explicitly NOT an untagged
  sibling wall (criterion 7 — asserts WHICH, not "something"); authoring an option nobody is tagged into
  yet re-stages nothing;
- §1.4 itself: the RED baseline (unresolvable tag, 1 row, 3 600 000 000 mm³, `brokenRefs()` non-empty) and
  the GREEN close (a CRUD-minted id, 2 rows, 7 200 000 000 mm³, `brokenRefs()`/`unmeasured` both empty).

## 5. What this does not do

`core.createElement` still does not validate `designOptionId` referentially (Q17b, ruled: no stopgap —
D86 surfaces the dangling case instead, and adding a check here now would pre-empt nothing Q17b left
open). `optionSets` as its own collection and `ActiveOptions` persistence are explicitly out of scope
(design doc §6) and untouched. The option-aware UI is `apps/web` / Amer's layer — nothing here touches it.

## 6. Backward sweep (invariant 7)

Grepped every `'schedules'`/`'views'` pairing and every `SceneCollection` reference in
`packages/document/src` and `apps/web/src`: `bnn.ts`'s hostile-guard list was the only site besides the
exhaustive `dependency.ts` switch (which fails to compile until handled, so the compiler is the sweep for
every other exhaustive site — `pnpm typecheck` was green throughout). No other hardcoded
`['schedules', 'views']`-shaped list exists in the tree.

## 7. Files

- `packages/document/src/scene.ts` — `SceneCollection` gains `'designOptions'` (contract-touching); the
  `designOptions` field's own comment updated to say PROMOTED rather than reserved.
- `packages/document/src/commands.ts` — `createDesignOptionCommand`/`updateDesignOptionCommand`/
  `deleteDesignOptionCommand` NEW, registered in `CORE_COMMANDS`; `checkPrimaryInvariant`,
  `designOptionReferrers` NEW; `createElementCommand`'s own comment corrected (the CRUD exists now; the
  door still does not check against it, and why).
- `packages/document/src/dependency.ts` — `designOptions` case NEW (closes `TS2345`); `elementsTaggedIntoSet`,
  `belongsToDescendants` NEW helpers.
- `packages/document/src/bnn.ts` — `designOptions` added to the hostile-`.bnn` guarded-key list.
- `packages/document/src/designoptions.ts` — header comment updated: the CRUD is built, not merely queued.
- `tests/design-option-crud.test.ts` — NEW, 13 tests.
- `tests/frozen-surface.snapshot.json` — re-baselined in this PR (`type SceneCollection` only).
- `current_state.md` — this abstract; §8 regenerated.

## 8. OWES

`hmdnah` — this PR's review. **`risk: high`** (BACKLOG row) ⇒ D88's two-step route. **AND** `RISK:
contract-touching` ⇒ after both review steps approve, the **owner** merges it, not `hmdnah`.
