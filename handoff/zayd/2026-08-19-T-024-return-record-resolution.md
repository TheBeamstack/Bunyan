# T-024 — defect return: the gate resolves against the RECORD, not §7 — 2026-08-19 — seat: `zayd`

**PR:** #38, `task/T-024-baselinedatentry-names-a-position-so-a-c`, existing claim, no new PR.
**Returned by:** `hmdnah` step 2 (`issuecomment-5342185121`,
`handoff/hmdnah/2026-08-19-T-024-review-step2.md`), reconciled against step 1
(`issuecomment-5341466379`). **Blocking finding: F3.** The backlog row stayed `review` throughout.
**Machine:** box (Hetzner, headless). Nothing here is owed to a `pc` seat.

## 1. F3 — what was actually wrong

The gate's tie to the real `current_state.md` was a test that did its own §7 lookup:

```js
const named = parseAbstracts(readCurrentState(ROOT)).find((a) => a.key === snapshot._baselinedAtEntry);
expect(named).toBeDefined();
```

§7 is a **byte** budget, not a count. Measured on the returned tip: **32209 of 32768 bytes, 7 of 10
abstracts**, headroom **559 B** — smaller than the smallest abstract §7 held, with the authorising
abstract at the **bottom**. So one append rotated it out and that assertion **failed** rather than
skipped. The predecessor it replaced skipped on rotation deliberately; this one did not.

That is T-024's own failure shape inside T-024's own gate: the next §7 abstract by any seat reddens
`pnpm docs:check` having moved no declaration, and the exits from that red are the three this task's
entry rejects — falsify a date, `--rebaseline`, or delete the test.

## 2. The repair — the population, not the assertion

Both repairs the review named are test-shaped, and a skip makes F4 worse: with the keyed path never
reading `abstracts`, a skip leaves the baseline with **no** tie to the record at all.

The defect is not that the test asked; it is **what it asked**. §7 is a rotating window, but the
record is not — abstracts roll into `docs/history.md` and invariant 10 makes that append-only, with
headings copied verbatim in both schemes. The union only grows.

- **`docs-state.mjs` — `recordedAbstracts(root)` NEW.** §7's parse plus every `docs/history.md`
  abstract heading (§C's legacy numbers, §E's `T-nnn`/`STEWARD-slug`). Archived new-scheme entries get
  `n: null`, never a synthetic position — minting a second `1000 - i` series would hand two different
  entries one number, which is the confusion that cost two turns their abstract. It **throws** on a
  zero-heading parse, for the reason `newestAbstract` throws on an empty §7.
- **`frozen-surface.mjs` — `baselineEntryIssues`'s keyed path resolves the key in `abstracts`**, and
  `abstracts` is now documented and typed as the record rather than §7. One new issue string:
  `_baselinedAtEntry <key> names no abstract in the record`.
- **Both real-file call sites pass `recordedAbstracts(ROOT)`.** No call site passes §7 alone.

The legacy half keeps its skip: entries 1–90 are closed (D82), nothing new is ever validated there,
and §A/§B summarise their oldest entries without a `###` heading at all.

### Revert-verified, twice

**(A) the resolution removed**, everything else in place:

```
 ×  ⚠⚠ catches Q15's own shape: an entry whose date disagrees with the one beside it
 ×  ⚠⚠ an abstract that has rotated OUT of §7 still resolves — the fuse is gone
 ×  ⚠⚠ a key that names no turn is refused, against the real record
 ×  ⚠ the gate is repaired, not removed — a key whose date is not the baseline's still fails
      Tests  4 failed | 46 passed (50)
```

Restored ⇒ 50/50, `tests/freeze-boundary.test.ts` 19/19.

**(B) the fuse itself, performed rather than simulated.** I rotated the authorising abstract out of
§7 and into `docs/history.md` §E — exactly what an append forces — and ran the suite unchanged:

```
§7 after rotation: 6 abstracts, holds the baseline's key? false

new gate  ⇒  tests/freeze-boundary.test.ts   19 passed (19)
old shape ⇒  expect(named).toBeDefined() on §7 alone   FAIL
new shape ⇒  key resolves in the record                PASS
```

Restored. **This turn's own abstract is that append**, so the branch as returned would have gone red
on the very commit fixing it — which is why this could not be a recorded follow-up.

## 3. F4 — the hole the self-contained key left, now closed

The keyed path compared the key's embedded date to `_baselinedAt` and returned, so `abstracts` was
inert: `T-999 — 2026-01-01 — nobody` returned `[]`, and so did the real key with **both** audit fields
hand-moved together — the one edit no cross-field check can see. Both are refused now, asserted
against the real record rather than a fixture.

## 4. Item 6 — the three weak-green shapes

| shape | disposition |
| --- | --- |
| three of four real-file assertions moved onto fixtures | the Q15-shape test takes its input **and** its expectation from the record; the legacy half runs against `docs/history.md` §C's 13 legacy abstracts instead of a two-entry fixture |
| **G4** — the "cannot name an entry that has not happened" bound is dead against the real file | live again: it is gated on `legacy.length > 0`, §7 holds **zero** legacy abstracts and the record holds 13, so `newestLegacy + 1` is refused against the real record. Both premises are asserted, so the test cannot go vacuous silently |
| the `abstracts` argument is inert | now load-bearing, and asserted as such: the same input against a non-empty population that does not hold the key reports one issue **more**. (An empty array is a different verdict — the parser has failed.) |
| `⚠ the gate is repaired, not removed` asserts `toHaveLength(1)` | asserts the **messages**. `toHaveLength` could not tell a repair from a different refusal, which is how narrowing `ENTRY_KEY` kept it green |

## 5. Item 2 — the backward sweep's two misses

**G2 — done.** The seven `docs-budget` diagnostics moved `.n` → `.id` in the first pass; `.id` is the
task id, and §7 holds three `T-024` abstracts, so *"Entry T-024 is missing the FULL: field"* names
none of them. They print `.key` now — the same rule the PR adds, applied to the messages it wrote.

**G1 — judged out of scope for this return, and here is why.** `agent-finish.mjs:280` identifies the
turn's abstract with `find(a => a.id === task && a.seat === seat)`, and swapping that for `.key` does
**not** fix it: this very turn is `T-024 — 2026-08-19 — zayd` and so is the abstract the first pass
wrote, so a key-based gate accepts the predecessor exactly as the tuple does. The collision *is* the
defect there, and closing it needs a turn identity the record does not carry — a step marker in the
heading, i.e. a §7 schema change, which is a task the size of T-024 rather than a sweep edit. It has a
`## Discovered` row (`hmdnah`, step 2) and stays `brahim`'s to sequence. Fixing it blind, mid-turn, in
the script this turn must run to finish, is how a harness defect becomes two.

**G3 and G5 are not touched.** Both are `hmdnah`'s `## Discovered` rows on the harness
(`isSyntheticEntryNumber`'s cap, `reviewFlipsToDone`'s blindness to two of three owner-gated classes);
neither is reachable from this task's `done-when:` and neither is red today.

## 6. The `⚠ MEASURED` uniqueness claim — all four copies corrected

Wrong in scope, count and generator, in `scripts/docs-state.mjs`, `docs/BACKLOG.md ## Discovered`, §5
of `handoff/zayd/2026-08-19-T-024-baseline-entry-identity.md`, and the §7 abstract's `FOUND:`. All four
corrected inside this editable window, before anything reaches the permanent record.

Measured over `current_state.md` §7 **plus** `docs/history.md`: **5 colliding keys of 51 distinct**
across 56 headings — 4 of 51 when step 2 measured it, plus the one step 2's own abstract created. The
generator is **any two turns by one seat on one task on one day**, with two live routes: D88's review
pair, and `agent-start.mjs --continue` returning a defect to its builder (`T-011 — 2026-08-17 — zayd`,
and this turn).

**The count is now measured rather than stated.** A number written into a comment is falsified by the
next abstract — which is exactly what happened to the claim being corrected — so
`tests/docs-budget.test.ts` gained *"the entry key collides, and every collision is a turn-PAIR"*: it
asserts collisions exist across the record and that every colliding key is one task, one seat, **one
day**. That last is the property that keeps the collision out of `baselineEntryIssues`: the date is in
the key, so a reference resolves to a turn-pair carrying one date, and the date is the half the gate
reads. An `abstractKey` narrowed to drop the date would break it, and that gate would say so.

**No uniqueness gate, and not for the reason first given.** At §7 scope such a gate is green today and
red on a *correct* turn — a second review step, or a returned build. That is cry-wolf, not invariant 10.

⚠ **The new gate found one thing:** `docs/history.md` §E holds
`### T-015 — review: the fix holds, backward sweep and weak-green clean — 2026-08-16 — seat: hmdnah`
**twice** (lines 2231 and 2300) — same heading, same `FULL:` path, bodies differing only in the
`REVIEW:` line's wording. A rotation that copied instead of moving, across two compactions. Invariant
10 makes the archive append-only, so it is not mine to edit; it is a `## Discovered` row, and it is
why the gate asserts one task/seat/day rather than distinct headlines.

## 7. Risk

`RISK: additive`. `diffSurface` empty, `_declarationCount` **214 = 214**; `WATCHED` is `packages/`
only, so the two `scripts/` contracts this return changes are outside the frozen surface. No
`apps/web` byte, no `SCENE_SCHEMA_VERSION`.

⚠ The PR still carries **`needs-operator/freeze`**: `reserved-classes.mjs` classes any diff to
`tests/frozen-surface.snapshot.json` on a bare path match, and this branch moves `_baselinedAtEntry`.
**The owner merges it** (`AGENTS.md §5.3`), and that composes with `risk: high` rather than competing
with it. The cry-wolf itself is a `## Discovered` row, not this task's `done-when:`.

## 8. Owed

- **A reviewer** — this return is an **unreviewed fix landing after step 2**, and `REVIEW.md`'s
  two-step table does not say what that turn is. Step 2 recorded the same gap; I have not invented an
  answer either. Item 1's revert is **(B)** above: it must reproduce a green under rotation and the
  old shape's red on the same rotated state.
- **The owner** — the merge. `needs-operator/freeze` is unconditional.
- **`brahim`** — the corrected uniqueness row; the new `T-015` duplicate-archive row; **G1**, **G3**
  and **G5**, all recorded and none claimed; and what a third review turn on a returned branch is.
- Nothing is owed to a `pc` seat.
