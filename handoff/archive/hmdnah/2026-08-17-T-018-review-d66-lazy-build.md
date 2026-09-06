# T-018 — review: the deferral numbers reproduce, and the tripwire has teeth

**Seat:** `hmdnah` (reviewer on box, `narutousomaki741`). **PR:** #35, opened by `zayd` on
`davidian-abdo`. **Task risk:** `normal` ⇒ one review turn (`REVIEW.md`). **Verdict: approved and
merged.**

## 1. Revert-verification — mandatory, re-executed here

The row's claim is _"the instrument's identity-comparison assertion fails if `Part.node` is read instead
of `Part.refs`"_. **`Part.node` has never existed**; the field is `Part.nodeId`
(`packages/document/src/entities.ts:695`), which is what the author built the tripwire against, so the
claim is judged against `Part.nodeId`.

`identitiesOf` reverted from `parts.flatMap((p) => [...p.refs])` to `parts.flatMap((p) => [p.nodeId])`:

```
 ❯ tests/d66-lazy-build-measure.test.ts (8 tests | 1 failed) 16690ms
   × ⚠⚠ every element built in BOTH carries byte-identical sub-shape identities
     → the identity signature must carry more than the recipe-derived node ids: expected 12 to be greater than 12
 Test Files  1 failed (1)
      Tests  1 failed | 7 passed (8)
```

Restored (`git diff` clean on the file): **8/8 green, 16426 ms**.

⚠ The element-for-element comparison itself stays green through that revert, which is the tripwire's
whole point — `partNodeId` is `${elementId}.${partName}` (`geometry.ts:60`), computed with no kernel
call, so a `nodeId` agreement check is true by construction. The author's entry says this in the same
words.

## 2. Backward sweep

Does not apply. The diff adds no rule to product code — no `packages/`, no `apps/web`, no `scripts/`.
The one constraint the doc states on existing code (§2a: `resolveJoins` must read the recipe, never the
built set) is a property of today's code, asserted by the instrument rather than newly imposed.

## 3. New kind of thing

Does not apply. No new entity, collection or relationship; `rebuildOnly` already ships (`document.ts:552`)
and §4 proposes no API.

## 4. Claims vs code — every assertion in the doc read against the source

| Doc claim                                                                    | Code                                                                        | Held |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---- |
| `partNodeId` is `${elementId}.${partName}`, no kernel call                   | `geometry.ts:60`                                                            | ✓    |
| `rebuildOnly` closes over assemblies                                         | `document.ts:553` — `affectedAssemblies(this.#scene, ids)`                   | ✓    |
| `saveBnn` takes a `Scene`, never a `DocumentContext`                         | `bnn.ts:103`                                                                | ✓    |
| an element with no geometry entry gets `state: 'failed'`/`failure: 'unbuildable'` | `enumerate.ts:215-217`                                                 | ✓    |
| `ElementState.stale` already means _recipe present, solid not built_         | `entities.ts:708`                                                           | ✓    |
| `baselineOf` returns `undefined` for `{length,height}` walls, so `resolveJoins` early-returns | `joins.ts:103-108`, `joins.ts:379-380`                     | ✓    |
| `partnersAt` matches in plan with no level or container scoping              | `joins.ts:205-213` — `cellKey` is 2D, `indexOf` indexes every baseline       | ✓    |
| `releaseShape` is frozen and already fired by the kernel client              | `kernel-client/src/client.ts:247`                                           | ✓    |
| `Part.node` does not exist; the field is `Part.nodeId`                       | `entities.ts:695`                                                           | ✓    |

**"Nothing ported from closed PR #16" holds.** PR #16's instrument has no `warmUp`, no sweep, no
`fitLine` and no `identitiesOf`, and its doc reports a different measurement entirely (3 storeys / 54
elements, "~35% forced", 64.5% deferrable) against this one's 8 storeys / 88 elements. The two files
differ by 655 insertions / 563 deletions.

**One correction, minor.** The entry's `CHANGED:` field names **one** rotated abstract (T-011's step-1
review); the commit rotates **two** — T-016's and T-011's — both preserved verbatim in `docs/history.md`
§E. The second rotation is required, not accidental: nine abstracts and 30.4 KB is what keeps §7 inside
its 10-abstract and 32 KB budgets once T-018's own abstract lands. The act is right; the description of
it is short by one row. `AGENTS.md §4.10` keeps the entry as written rather than editing it, so this is
recorded here and not corrected in place.

## 5. Numbers — method stated, and re-measured

Every figure in the doc is printed by the committed instrument, and the method is stated with it:
ordinary least squares of ms on elements over a four-point `rebuildOnly` sweep, a fresh kernel per point,
one throwaway element built and freed before each clock starts, and **no wall-clock threshold assertion**
— the standing rule for timing harnesses here.

Re-measured on this box, two runs, against the doc's committed figures:

| Figure                      | Doc            | Run 1 (reverted) | Run 2 (restored) |
| --------------------------- | -------------- | ---------------- | ---------------- |
| deferred, by element        | 89.8 %         | 89.8 %           | 89.8 %           |
| deferred, by solid          | 89.3 %         | 89.3 %           | 89.3 %           |
| cold load removed           | 85.8 %         | 86.0 %           | 85.4 %           |
| marginal cost per element   | 28.3 ms        | 27.82 ms         | 28.04 ms         |
| fixed cost (intercept)      | 39 ms / 1.6 %  | 90 ms / 3.5 %    | 67 ms / 2.8 %    |
| R²                          | 0.9961         | 0.9968           | 0.9983           |
| south wall bounds, both docs| `[-100,-100,0 … 8100,100,3000]` | same | same |
| partial take-off            | 12 rows / 79 unmeasured, all `'unbuildable'` | same | same |

The slope reproduces to ~2 %, inside the ~4 % run-to-run spread the doc itself declares. The intercept
is the noisy term (39 → 67 → 90 ms), but it is the small term the doc says it is — under 4 % of a full
cold load in every run — so the conclusion it carries (_"no large fixed cost hides behind the element
fraction"_) survives the spread. The doc's own caveat that 28 ms/element is this fixture's number and
**not** the per-element cost at scale (T-004's 41.9–43.8 ms) is stated where it could be misquoted.

## 6. Weak green — what would each new test take to pass while its title is false?

- **identity agreement** — the weak green is the whole point of the test and it is disarmed explicitly.
  `nodeId` agreement is true by construction; the tripwire asserts the compared signature carries strictly
  more distinct tokens than the node ids do, and it goes RED on exactly the substitution the row names
  (§1 above). Strong.
- **across a join** — could pass vacuously if the west wall were built after all, or if a jointless cap
  happened to match. Both are closed: `partsOf(west)` is asserted `undefined` in the partial document and
  non-empty in the full one, and `fullBounds[0] < -1` proves the miter really is in the solid (a jointless
  cap starts at 0). Measured on `bounds` rather than `refs`, because T-011 measured that `refs` cannot see
  a miter. Strong.
- **deferrable fraction** — a measurement, not a gate, and it guards its own denominator:
  `fullBuilt === elements`, `slope > 0`, and the top sweep point asserted to BE the whole model so the
  `rebuildOnly`-vs-`rebuildAll` line compares equal work.
- **`projectQuantities` DECLARES** — `expect([...reasons]).toEqual(['unbuildable'])` is an equality on the
  set, not a membership check, so it pins the defect it names rather than merely tolerating it.
- **quantities agree part for part** — the one soft spot: its loop over `builtElementIds(partial.doc)`
  carries no non-empty guard of its own, so it would pass vacuously if the partial build ever built
  nothing. It shares `partial` with the identity test, which asserts `common.length > 0`, so the suite is
  not vacuous today; a `toBeGreaterThan(0)` inside this test would make it independent. Recorded as an
  opinion, not a defect — `REVIEW.md` does not block on one.
- **`save` reads no built state** — compares `JSON.stringify(scene)` (strong) and then `saveBnn(...).length`
  rather than the bytes (weaker). The length check is redundant belt on a function that is pure in the
  scene, so it costs nothing; bytes would say the same thing more directly.

## 7. Risk

`RISK: additive`, and three independent readings agree:

- `pnpm state` on this branch — **`RISK: additive` — unchanged vs baseline**;
- `tests/freeze-boundary.test.ts` green in `pnpm verify`, no `SCENE_SCHEMA_VERSION` bump, no frozen byte,
  and the diff touches no `packages/` source at all;
- CI's `PR shape · reserved classes` job **ran and passed** on the tip (`gh pr checks 35`), so the
  labeller executed and applied no `needs-operator/*` label — "no label" and "the labeller never ran" are
  distinguished, per `REVIEW.md` item 7.

⇒ `hmdnah` approves and merges on `narutousomaki741`, which is never the account that opened it.

## `done-when:` — all four executed, on a machine that could execute them

1. **The doc answers all four questions, measured fresh** — forced vs deferrable (§3b), partial-vs-full
   agreement including across a join (§2, §2a), and whether the build half needs a new API (§4: no,
   `rebuildOnly` suffices). ✓
2. **The instrument is a committed test file** — `tests/d66-lazy-build-measure.test.ts`, 8 tests, run
   twice here. ✓
3. **§3a / §3b / §3c each a citable section number** — present, plus §3d ruling eviction out of v1.0.0. ✓
4. **Revert-verified tripwire** — §1 above, judged against `Part.nodeId`. ✓

## What this box could not verify

- _unverified here: lazy first paint improves time-to-first-pixel — `khalihlna` to confirm._ The doc
  writes it as `unverified here` already and it belongs to **T-006**, `machine: pc`; it is not this PR's
  claim and is not ticked.

## For `brahim`

1. **T-018's `done-when:` names `Part.node`, a field that has never existed** — it is `Part.nodeId`
   (`entities.ts:695`). Correcting the row is a post-merge steward act; the tripwire itself is right.
2. `main`'s committed §8 disagreed with what `agent-start.mjs` measured at the start of this turn — the
   branch-shaped block T-011's merge carried onto `main`. Regenerated with `pnpm state` and committed
   (`state: regenerate current_state.md §8 from main`) so the turn could start; the systemic writer
   defect is already recorded on your list.
3. The `## Discovered` row this task found (wall joins are not level-scoped) wants a decision on becoming
   a `T-nnn`; T-005's first `done-when:` bullet is discharged by §3c's `save` measurement.
