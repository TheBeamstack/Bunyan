# T-024 — `_baselinedAtEntry` records an identity, not a §7 position — 2026-08-19 — seat: `zayd`

**Task:** `docs/BACKLOG.md` T-024. **Branch:** `task/T-024-baselinedatentry-names-a-position-so-a-c`.
**Machine:** box (Hetzner, headless), Node 20.20.2, pnpm 10.34.5, vitest 4.1.10.

## 1. The defect, stated at its actual size

`parseAbstracts` mints `n = SYNTHETIC_ENTRY_BASE - i` over §7's array order for every five-seat
(`T-nnn`/`STEWARD-slug`) abstract, so `1000` denotes **the newest abstract right now** and nothing
else. `tests/frozen-surface.snapshot.json` stored that number in `_baselinedAtEntry`, and
`baselineEntryIssues` resolved it back through the same array — so the field re-pointed at a different
turn every time one was prepended, and its cross-field date check then compared the baseline's date
against an entry that never authorised it.

The cost is not a nuisance. `tests/freeze-boundary.test.ts` goes RED on a turn that moved no
declaration, and its only two exits are falsifying the abstract's date or `pnpm state --rebaseline`,
which records nothing and is owner-gated once the P5 freeze lands. Two turns hit it; the second
(`hmdnah`, T-020 review step 2) took neither and archived its abstract straight into
`docs/history.md` §E, so **§7 carries no abstract for that turn at all** — the gate cost the record
rather than a re-run.

## 2. What moved

| file | change |
| --- | --- |
| `scripts/docs-state.mjs` | `abstractKey()` + `ENTRY_KEY` + `SYNTHETIC_ENTRY_BASE` + `isSyntheticEntryNumber()`; every parsed abstract now carries `.key` |
| `scripts/frozen-surface.mjs` | `baselineEntryIssues` takes a key or a legacy number, and REFUSES a synthetic one |
| `scripts/state.mjs` | `--rebaseline` writes `newest.key`, never `newest.n` |
| `tests/frozen-surface.snapshot.json` | `_baselinedAtEntry: 1000` → `"STEWARD-unblock-pc-and-chrome-boot — 2026-08-18 — brahim"` |
| `tests/freeze-boundary.test.ts` | +5 tests, one describe block for T-024 |
| `tests/state-risk-e2e.test.ts` | the fixture §7 gains a five-seat entry; +1 end-to-end test |
| `tests/docs-budget.test.ts` | seven gate messages render `a.id`, not `a.n` (see §5) |

**The identity is `<id> — <date> — <seat>`** — the three authored fields of the abstract's own
heading. They survive rotation out of §7, they are greppable in the file, and they do not move when a
turn prepends its abstract. The headline is left out: it is prose, and the three fields are not.

**The gate is repaired, not removed.** A key carries its own date, so Q15's shape — a baseline whose
recorded date is not the authorising entry's — still fails, and now fails **forever** rather than
only while the named entry is inside §7's rotating window. The legacy numbered branch keeps the old
§7 lookup for baselines written before D82, and skips when §7 holds no legacy entry, exactly as it
already skipped a rotated-out one.

**A synthetic number is refused outright**, so the position cannot come back through the one file it
was written into:

```
_baselinedAtEntry is 1000, which is a §7 POSITION and not an entry identity (T-024)
```

## 3. Revert-verification (invariant 3)

**(A) The mechanism.** `abstractKey` neutralised to `return a.n;` — the pre-fix identity — with
everything else in place:

```
× tests/state-risk-e2e   ⚠⚠ writes a baseline its own gate accepts …            expected 1000 to be 'T-024 — 2026-08-05 — zayd'
× tests/state-risk-e2e   ⚠⚠ stays green when a LATER-DATED abstract is appended … expected [ Array(1) ] to deeply equal []
× tests/freeze-boundary  ⚠⚠ a §7 append on a later day leaves a sound baseline GREEN … expected [ …(2) ] to deeply equal []
× tests/freeze-boundary  the committed baseline records a key …                  names no abstract in §7: expected undefined to be defined
Tests  4 failed | 21 passed (25)
```

Restored: **25 passed (25)**.

**(B) The defect itself, on the real file rather than a fixture.** `scripts/docs-state.mjs`,
`scripts/frozen-surface.mjs`, `scripts/state.mjs`, `tests/frozen-surface.snapshot.json` and
`tests/freeze-boundary.test.ts` all restored from `origin/main` — the pre-fix scheme entire — with
this turn's §7 abstract (dated `2026-08-19`) present:

```
× tests/freeze-boundary  the committed baseline names an entry that exists, and no longer names 72
AssertionError: expected [ Array(1) ] to deeply equal []
+   "_baselinedAtEntry 1000 is dated 2026-08-19 in §7, but _baselinedAt says 2026-08-18",
Tests  1 failed | 11 passed (12)
```

That is the defect verbatim, on a branch that moved **0 of 214** declarations: the positional key
resolved to this turn's own abstract instead of the `2026-08-18` steward turn that authorised the
baseline. Restored: **17 passed (17)**.

**(C) And the cleanest revert-verification available: this turn's own abstract.** It is in §7, dated
`2026-08-19`, against a baseline dated `2026-08-18`, and `freeze-boundary` is green with
`_declarationCount` 214 and **0 declarations moved**. That is the defect's exact input, taken by the
turn that fixes it, with no re-baseline and no falsified date.

## 4. Backward sweep (invariant 7 — the rule binds the next consumer and nothing else)

The rule is *"never persist `.n` across a commit"*, so the sweep enumerates every site that stores or
prints an entry reference, not merely the one that broke.

| site | verdict |
| --- | --- |
| `tests/frozen-surface.snapshot.json` `_baselinedAtEntry` | **dirty** — the defect; fixed |
| `current_state.md` §8 "newest entry" row (`state.mjs:281`) | clean — prints `id (seat, date)` already, and is regenerated every run |
| `state.mjs:356`'s console line | clean — same three fields |
| `frozen-surface.mjs`'s legacy `a.n` lookups | clean — one parse, within one run |
| `docs-budget.test.ts:249` `a.n === newest.n` | clean — a comparison inside one parse |
| `docs-budget.test.ts` failure messages (7 sites) | **dirty, cosmetically** — rendered `Entry 1000` to a human, against `docs-state.d.mts`'s own *"never render this to a human — render `id`"*. Fixed |
| `docs/history.md` §C/§E, `handoff/` | clean — reference entries by heading and by path |

`grep -rn '\.n\b' scripts tests` and `grep -rn '\b1000\b' scripts tests` were the two mechanical
forms; nothing outside the table survives either.

## 5. Found while doing it — the key is not unique across §7 today

**Measured, not assumed:** `T-016 — 2026-08-17 — hmdnah` names **two** abstracts. D88's two review
steps are separate turns by the same seat on the same task, and T-016's two ran on one calendar day,
so the triple collides. It does not weaken the gate — the date is the half `baselineEntryIssues`
checks and it is identical either way — but a reference resolves to a turn-pair rather than a turn in
that case, so no uniqueness gate is added here (one would be red on a merged abstract, and invariant
10 forbids rewriting it). Recorded in `docs/BACKLOG.md ## Discovered`, not claimed.

## 6. Risk

`RISK: additive` — **0 of 214 declarations moved**, `_declarationCount` unchanged, no `packages/`
byte, no `SCENE_SCHEMA_VERSION`, no frozen shape. ⚠ The one byte that moved inside
`tests/frozen-surface.snapshot.json` is `_baselinedAtEntry` itself, which
`scripts/reserved-classes.mjs` classes as `freeze` on a path match — so CI labels this PR
`needs-operator/freeze` and **the owner merges it**, on a diff that touches no contract. That is the
cry-wolf this row was written to end, and ending it for the metadata fields is not in this task's
`done-when:`; it is recorded as a `## Discovered` row instead.

## 7. Owed

- `hmdnah` — the review. `risk: high` ⇒ **two review turns** (D88). ⚠ Item 1's revert is §3(B): all
  five files back to `origin/main` with this turn's §7 abstract in place, which must reproduce
  `_baselinedAtEntry 1000 is dated 2026-08-19 in §7, but _baselinedAt says 2026-08-18` — a red on a
  branch that moved no declaration.
- The **owner** — the merge, because `needs-operator/freeze` is applied. See §6.
- `brahim` — two `## Discovered` rows: the D88 key collision (§5), and `reserved-classes.mjs` classing
  a metadata-only edit of the snapshot as `freeze`.
- Nothing is owed to a `pc` seat: every claim here is headless and was executed here.
