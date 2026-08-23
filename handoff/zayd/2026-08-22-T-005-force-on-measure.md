# T-005 — D66 §3c: FORCE on measure, and the state a deferred element is actually in

**Seat:** `zayd` (builder on box) · **Date:** 2026-08-22 · **Branch:**
`task/T-005-d66-3c-force-on-measure-and-whether-save` · **Risk:** additive

---

## 1. What the task owed

`docs/design/P5_step9_D66_lazy_build_design.md` §3c: every aggregate that quantifies over the model must
either **FORCE** the elements it is about to report or **DECLARE** that it did not, chosen per aggregate
and justified against T-018's measurement. Its first `done-when:` was already discharged by T-018 —
`save` reads no built state — and its second ⚠ named the load-bearing item: `enumerate.ts` reported a
deferred element as `failure: 'unbuildable'`, so a consumer could not tell _"nobody has asked for this
yet"_ from _"this cannot be built at all"_.

## 2. The finding that decided the choice — DECLARE was never available

The design doc framed FORCE and DECLARE as two live options for each aggregate. Measured here, they are
not:

> **A declaration can only name what it can see, and a deferred parent's D59 children are not enumerated
> at all.**

`modelElements()` walks `ElementGeometry.children`, and deriving children **is** the build (D59 Model A),
so an unbuilt curtain wall produces no panel rows — and nothing an aggregate could put in `unmeasured` to
say so. The authored row is still reported; only its children vanish, and that asymmetry is the argument.

**Measured** (`tests/d66-force-declare.test.ts` §2, real OCCT, a 3×2 curtain wall):

| From                                 | Panel/column/mullion rows |
| ------------------------------------ | ------------------------- |
| a fully built document               | **6** (`COLS × ROWS`)     |
| a document that built the wall only  | **0**                     |

An aggregate that DECLAREd would therefore be plausible and short — domain rule 15's failure mode one
level up, and precisely what `projectView`'s own standing comment says nobody audits.

## 3. The ruling, per aggregate

Each is one `await this.#forceBuild()` (or, for the exporter, one bounded `rebuildOnly`), and each is
revert-verified against the same aggregate on a fully built document.

| Aggregate             | Choice                         | Why                                                                                                              | Red without it         |
| --------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `projectQuantities()` | **FORCE** (whole model)        | A project-wide total's whole contract is completeness.                                                            | 3 rows against 16      |
| `evaluateSchedule()`  | **FORCE** (whole model)        | Its **row set**, not its measurement, is what needs the build.                                                    | 0 panel rows against 6 |
| `projectView()`       | **FORCE** (whole model)        | A short drawing is what nobody audits — its own standing argument, applied to the unbuilt.                        | 2 drawn against 8      |
| `exportCleanDelta()`  | **FORCE**, bounded to the delta | Owner ruling Q2 sets that scope: the cost tracks the size of the CHANGE, exactly as its prior rebuild already does. | 1 PEI against 17       |
| `saveBnn()`           | **NEITHER**                    | Its signature takes a `Scene`, so no built state is in reach.                                                     | —                      |

⚠ **`save` was not a design call and was not treated as one.** T-018 measured that it reads no built
state, and the signature is the proof rather than the evidence — `saveBnn(scene, options)` cannot reach a
`DocumentContext`. The code now carries one sentence saying that, and that it FORCEs if that ever changes,
because a save that silently omits unbuilt elements is data loss and not a reporting shortfall.

⚠ **FORCE is free outside lazy build.** `deferredElements()` is empty on a fully built document, so every
call above is a no-op on the discipline the product runs today. That is also why the whole suite was
expected to be unmoved by it, and was.

## 4. The supporting changes

1. **`enumerate.ts` — a never-built element is `stale`, with no `failure`.** `ElementState.stale` already
   means _recipe present, solid not built_ (`entities.ts`), and `agent.ts:151` **already answered `stale`
   for the same element** through `geometryOf()` — so the two roads into the document disagreed about one
   element's state, and the enumeration was the one that was wrong. `ModelElement.state` widens by that
   one member; `ElementGeometry['state']` structurally cannot carry it, because it is the state of an
   element that has no `ElementGeometry` at all.
2. **`deferredElements(scene, geometryOf, ids?)` — the FORCE set**, one function so the four call sites
   cannot each compute it slightly differently. `ids` bounds it for the Clean Delta.
3. **`#forceBuild()`** on `DocumentContext`, private: the three whole-model aggregates call it. The Clean
   Delta is outside the class and uses the public `rebuildOnly` + `deferredElements` instead, so no new
   public method was added.

## 5. FORCE is a build, not an edit (domain rule 17)

Asserted (`§4` of the new test): after `projectQuantities()` on a partial document the append-only
journal, the undo stack and `doc.revision` are all unchanged.

⚠ **The one stored field a build moves is `scene.brokenRefs`** — `#commit` sets it from the staged
rebuild. It is a MEASUREMENT of geometry, `rebuildOnly` already moves it, and a partial build had simply
not taken it yet; no authored byte, no `UndoableEdit`, no revision. Stated rather than left for a reviewer
to find.

## 6. The backward sweep (`AGENTS.md §4-7`, `§1c-8`)

The rule *"a deferred element is `stale`, not `unbuildable`"* binds every existing reader of
`ModelElement.state`/`.failure`. Counted rather than sampled — `grep -n "\.state\b\|\.failure\b"` over
`packages/document/src` and `apps/web/src`:

| Site                                | Verdict                                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| `document.ts:677` `projectQuantities` | reads `state !== 'valid'` ⇒ correct, and now FORCEs                                     |
| `document.ts:796` `projectView`     | same shape ⇒ correct, and now FORCEs                                                     |
| `document.ts:970` `evaluateSchedule` | same shape ⇒ correct, and now FORCEs                                                    |
| `cleandelta.ts:466`, `:532`         | same shape ⇒ correct, and now FORCEs (bounded)                                           |
| `document.ts:320` `unbuildable()`   | reads the geometry MAP, so a never-built element was never in its reach — already correct |
| `agent.ts:151`                      | already `?? 'stale'` — the precedent this change aligns the enumeration to                |
| `apps/web/tool/QueryGateway.ts:108` | a kernel `classifyPoint` result, unrelated                                               |

**Nothing else switches on the union**, so widening it breaks no exhaustive check.

⚠ **One site the sweep found and this turn did NOT fix:** `ModelElement.hasParts` is `false` on a `stale`
element for the same reason it is `false` on a pure void, so the field alone cannot separate _"nothing to
measure"_ from _"not measured yet"_. All five consumers test `state` first, so it is unreachable today —
a convention rather than a guarantee, which `§1c-8` calls a dirty rule that has not happened yet. The
field now says so, and it is a `## Discovered` row rather than a silent assumption.

## 7. Revert-verification (`AGENTS.md §4-3`)

Five reverts, one per changed line, each restored afterwards. `tests/d66-force-declare.test.ts` alone:

| Reverted                                              | Result                                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| `enumerate.ts` back to `'failed'` + `'unbuildable'`   | **1 failed \| 7 passed** — `expected 'failed' to be 'stale'`                  |
| FORCE removed from `projectQuantities`                | **2 failed \| 6 passed** — `row for row: expected 3 to be 16`                 |
| FORCE removed from `evaluateSchedule`                 | **1 failed \| 7 passed** — `expected [] to deeply equal [ …(6) ]`             |
| FORCE removed from `projectView`                      | **1 failed \| 7 passed** — `expected [ …(2) ] to deeply equal [ …(8) ]`       |
| FORCE removed from the Clean Delta                    | **1 failed \| 7 passed** — `expected [ Array(1) ] to deeply equal [ …(17) ]`  |
| restored                                              | **8 passed (8)**                                                              |

⚠ The `enumerate.ts` revert is the one that matters most, and the test is built to make it bite: §1 puts a
deferred element and a genuinely refused one (D43's unknown type) in **the same document**, so the revert
collapses them onto each other rather than merely changing a string.

## 8. The T-018 instrument, corrected

`tests/d66-lazy-build-measure.test.ts`'s §3c case asserted `[...reasons]).toEqual(['unbuildable'])` — the
defect this turn removes — so it is rewritten rather than left to fail: it reads the DECLARE half off
`modelElements()` **before** anything forces, then asserts the forced take-off matches the full one. It is
moved to the end of the file, because `projectQuantities` now builds and would otherwise leave the cases
above it nothing deferred to measure. `docs/design/P5_step9_D66_lazy_build_design.md` §3c carries the
ruling in place of its "what T-005 owes" list.

## 9. Verification

- `pnpm verify` — full CI step list, green (typecheck incl. `apps/web`, lint, `format:check`, test,
  `reseed:check`, `docs:check`).
- `tests/freeze-boundary.test.ts` green; `WATCHED` holds none of the four files changed here
  (`enumerate.ts`, `document.ts`, `cleandelta.ts`, `bnn.ts`), and `SCENE_SCHEMA_VERSION` stays 2.
- `scripts/reserved-classes.mjs` classes `freeze` on `tests/frozen-surface.snapshot.json` alone, which is
  untouched ⇒ no `needs-operator/*`.

## 10. What is NOT verified here

- **Nothing needs a browser.** Every aggregate above is document-layer, every measurement is headless and
  was executed here. No `unverified here:` debt is created by this turn.
- **Behaviour at D48's 10,000-element target.** FORCE's cost at scale is `rebuildAll`'s cost, which
  `§1a` already carries as the open cold-load row; nothing here re-measures it, and nothing here changes
  it, since the FORCE set is empty unless somebody defers.
- **The narrower force** (building only the Types that declare `buildChildren`) is named in the design
  doc as not built and recorded as a `## Discovered` row.

## 11. OWES

- **`brahim`** — two `## Discovered` rows are filed and unclaimed: `hasParts` needing `state` to be read
  first, and the whole-model-vs-composite-only FORCE. **T-006** (D66 §3a/§3b, `machine: pc`) is what this
  unblocks; its `depends-on: T-005` is now satisfiable.
- **No `pc` seat is owed anything by this turn.**
