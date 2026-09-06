# Review — `STEWARD: unblock-pc-and-chrome-boot` (PR #36)

**Seat:** `hmdnah` · **Date:** 2026-08-18 · **Abstract:** `current_state.md §7`

**Verdict: APPROVED, owner merges.** One defect found and fixed on the branch.

## Item 1 — revert-verification, in its docs-only form

The diff carries no code fix, so the honest form is a mutation of what the diff's own gate depends on.
Two were run.

**Mutation A — the diff's one non-prose byte.** Restored `_baselinedAt` to `2026-08-17`:

```
FAIL tests/freeze-boundary.test.ts > the baseline file records WHICH ENTRY authorised it (Q15)
AssertionError: expected [ Array(1) ] to deeply equal []
+   "_baselinedAtEntry 1000 is dated 2026-08-18 in §7, but _baselinedAt says 2026-08-17"
Tests  1 failed | 11 passed (12)
```

Restored → `12 passed (12)`, tree clean. This is the re-baseline earning its place, and it is also T-024's
premise measured rather than argued.

**Mutation B — the new rows' `machine:` fields bind mechanically.** Flipped T-022 to `machine: **pc**`:
`reviewer-for T-022` moved `hmdnah` → `khalihlna`, and `can-claim zayd T-022` went from `yes` to
`REFUSED — machine: pc and seat 'zayd' is on machine: box`. Restored → `hmdnah`. The box/pc split in these
rows is read by `seats.mjs`, not merely asserted in prose.

## Item 1's re-measurement of the claim T-022 rests on

Re-run here rather than taken from the entry, on this box's Node 20.20.2:

- a `TextDecoder` decode of a view over a resizable `ArrayBuffer` returns `"hello"` — no throw;
- `WebAssembly.Memory({initial:1,maximum:10}).buffer.resizable` is **`false`** on this runtime, so the
  Chrome-149+ shape is not merely tolerated here, it is not constructible from WASM memory at all.

The steward's conclusion holds and is stronger than stated: the box cannot reproduce Chrome's refusal, so
T-022 correctly carries no browser criterion and T-023 is a real dependency rather than a formality.

The diagnosis is also correct at the call site. `bunyan-kernel.js` has exactly one UTF-8 decoder and it
decodes a view of the heap:

```js
UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr))
```

with `HEAPU8 = new Uint8Array(b)` over the WASM buffer — which is what Chrome 149+ refuses. T-022's
"assert against the artifact" criterion is therefore box-executable and is the right assertion to write.

## The defect — T-024 named a fixture that does not reproduce

T-024's `done-when:` read _"measured on the two turns that hit it (T-011,
`STEWARD-unblock-pc-and-chrome-boot`)"_. **T-011 did not hit it.** Run against T-011's own merged tree
(`c18ae8e`):

```
newest §7 abstract: 2026-08-17 | _baselinedAt 2026-08-17 | _baselinedAtEntry 1000
baselineEntryIssues(...) => []
```

T-011's re-baseline was earned by a real declaration moving (`scene.ts :: type SceneCollection`, 1 changed
of 214 — its own step-2 review measured that), and its dates agreed on the day, so it is an instance of
`contract-touching`, not of the cross-day positional defect. A criterion that asks the implementer to
measure a green fixture is not checkable, which READY criterion 4 forbids.

Fixed on the branch (`REVIEW.md`'s findings table — provable, so latency zero): the item now names the one
turn that did hit it. T-024's last bullet already requires a synthetic red fixture, so nothing is lost.

## Items 2–7

- **2 — backward sweep.** This PR adds no rule and no invariant; it applies `docs/BACKLOG.md`'s existing
  splitting rule to two findings. Nothing to sweep.
- **3 — new kind of thing.** No new entity, collection or relationship. Five backlog rows.
- **4 — claims vs code.** Every citation checked against the file it names, not the prose: `Part.nodeId` is
  real (`entities.ts:683` doc-comment, `:695` declaration) and `Part.node` appears nowhere in
  `packages/`; `saveBnn(scene: Scene, options: SaveOptions)` (`bnn.ts:103`) takes no `DocumentContext`;
  `current_state.md §1c-9` is "MEASURE THE ARTIFACT, NOT THE MANUAL" as cited; D89's runner is Oracle
  arm64 Linux, so T-020's "CI green on the self-hosted runner" is box-observable; the five protocol files
  exist and all carry em-dashes.
- **5 — numbers.** Every figure carries its method. Two notes, neither blocking: the em-dash range is
  5–**38**, not 5–37 (`agent-start.test.ts` has 38) — the conclusion it supports is unaffected; and
  `§1c-3` says _only an OCCT **version** bump_ costs 2.5 h, so T-022's "an emsdk bump may invalidate the
  prebuilt libs" is a hypothesis rather than §6's cost model — the row already makes it a measure-first
  item with a number owed, which is the correct treatment.
- **6 — weak green.** No new tests. The test the T-005 discharge leans on was read: its `save` assertion
  compares `saveBnn(...).length`, not bytes — weaker than its own wording — but the load-bearing half is
  the exact `JSON.stringify(partial.doc.scene) === JSON.stringify(full.doc.scene)` comparison plus the
  type-level fact, and `partial` (9 elements) and `full` (43) are genuinely different builds. The
  discharge is honest as written.
- **7 — risk.** `pnpm state` says `RISK: additive` and the surface is unchanged vs baseline — 0 of 214
  declarations moved. `scripts/reserved-classes.mjs` says `⇒ OWNER-GATED` on `needs-operator/freeze`, and
  the `PR shape · reserved classes` job **ran** (14 s, pass) and applied that label. **Not merged.**

## The box/pc split, row by row

Every `done-when:` item in the three box rows is box-executable, and each box row carries an explicit
`unverified here:` naming its pc successor:

| Row       | Machine | Split honest? |
| --------- | ------- | ------------- |
| **T-020** | box     | Yes — bump + suite-count guard + API sweep + CI, all box; the Windows collection failure is deferred to T-021 by name. |
| **T-021** | pc      | Yes — collection, `pnpm verify` exit 0, and the revert are all pc-only. |
| **T-022** | box     | Yes — artifact assertion, committed test, pin re-proof and cost measurement are all box; the browser boot is deferred to T-023 by name. |
| **T-023** | pc      | Yes — boot, console-error-free, revert, and unsetting `BUNYAN_BROWSER_CMD` are pc-only. |
| **T-024** | box     | Yes — no browser or Windows criterion appears in it. |

`seats.mjs` agrees mechanically: T-020/T-022/T-024 route to `hmdnah` and are claimable by `zayd`;
T-021/T-023 route to `khalihlna` and are refused to a box seat; both `blocked` rows are refused on
`depends-on:` because an open PR is not a merged dependency.

## Non-blocking observations

1. **The two in-place corrections narrate.** T-018's row now says _"This read `Part.node` when written …
   corrected by `brahim` after the merge"_ and T-005's bullet says _"This bullet asked the claiming session
   to measure that first"_ — the shape `AGENTS.md §7.3` rules out, with the history belonging in the entry
   and the commit. Recorded rather than changed: invariant 10 wants a correction to stay visible, `T-005`
   is `ready` and its claimant needs to know the bullet is discharged, and the two rules genuinely pull
   opposite ways here. Worth an owner line on which wins in a planning file, not a reviewer's call.
2. **The rotation is clean.** T-011's step-2 abstract moved to `docs/history.md` §E byte-identical over all
   38 lines — invariant 10 satisfied, checked by diff rather than by eye.
3. **T-020 fixes a symptom by replacing the runner** without requiring the root cause be named. That is the
   fix shape `## Discovered` recommended, and the "suite count unchanged" criterion is exactly the guard
   against a bump that silently stops collecting — no finding, noted because the criterion is what makes it
   safe.

## The routing defect this turn exposes

`pnpm state` returns `RISK: additive` and `agent-finish.mjs --review` prints `gh pr merge` from that
verdict, while `reserved-classes.mjs` independently returns `⇒ OWNER-GATED`. The two disagree by
construction on a re-baseline, and the script that prints the merge command is reading the one that does
not know about the freeze class. `REVIEW.md` item 7's ⚠ covers it by instruction — _"any `needs-operator/*`
label ⇒ you do not merge"_ — which is the same load-bearing-instruction-instead-of-a-gate shape `T-014`
already fixed once for `risk: high`. The commands were printed and **not run**. Recorded in
`## Discovered`; it is the same class as T-014 and wants the same fix.
