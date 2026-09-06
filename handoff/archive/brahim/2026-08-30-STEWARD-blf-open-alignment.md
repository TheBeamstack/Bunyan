# STEWARD-blf-open-alignment — 2026-08-30 — seat: brahim

## 1. What this was

The owner built a second Beamstack licensing instrument — the Beamstack
Community License (BCL 1.1) — for the sibling project Road-Designer, and
asked whether Bunyan should move to it. Bunyan's own D15 makes the OSI
"open source" label itself the anti-Revit wedge; BCL's own text states it is
explicitly **not** OSI open source or FSF free software (it withholds the
right to sell and requires a UI attribution badge). The owner's own
Beamstack License Framework (`github.com/TheBeamstack/beamstack-licensing`,
BLF-D2/BLF-D6, decided the same day) independently reaches the same
conclusion: Bunyan is assigned **BLF-Open**, i.e. it keeps AGPL-3.0-only,
unmodified, plus its existing commercial dual-licence option — recorded here
as `docs/decisions.md` **D90**.

This turn is the mechanical alignment that ruling calls for, not a licence
change.

## 2. What changed

- **SPDX headers** added to 202 of 216 tracked `.ts`/`.tsx`/`.mjs`/`.cpp`/`.h`
  files — `SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>` +
  `SPDX-License-Identifier: AGPL-3.0-only`, none existed before. Mechanical
  insertion (script, not hand-edited per file) + `prettier --write .`;
  prettier made no further changes, confirming the inserted lines already
  matched house style. **The remaining 14 files — `scripts/reseed-paths.mjs`'s
  `GEOMETRY_PATHS` exactly — were reverted after CI caught a real gap**: the
  re-seed gate is path-based, not content-aware, so a comment-only header on
  a watched file still trips "geometry changed, no golden re-seeded," and
  its only escape hatch (a `Re-seed-unchanged:` commit trailer) applies only
  when a golden file WAS touched but its payload didn't move — not when
  none was touched at all, which is what a bare header addition does. This
  session cannot re-run the seeder correctly (`tools/oracle/` needs the
  pinned native-OCCT toolchain, `cadquery-ocp`, which this pc cannot
  faithfully reproduce), so those 14 headers are left for a `zayd`/box turn
  that also re-seeds goldens for real.
- **`NOTICE`** — a Beamstack copyright/brand block added at the head
  (mirrors `templates/NOTICE` in the framework repo); every existing
  OCCT/planegcs/MIT attribution section below it is untouched, byte-for-byte.
- **`TRADEMARKS.md`** (new) — a short pointer to the framework's canonical
  trademark policy, per `tiers/open.md`'s checklist.
- **`CONTRIBUTING.md`** (new) — from the framework's Open-tier template,
  filled in for Bunyan: CLA + DCO sign-off + no-trademark-rights + the
  standard source header.
- **`README.md`** (new — none existed before) — carries only the Open-tier
  licence section from the framework's template; no other project
  description was invented, since none was asked for.
- **`CLA.md`** — one cross-reference note added at the top (BLF-D6/BLF-D3:
  Bunyan's own CLA is framework-compatible and is kept rather than
  replaced). **Substance unchanged**: `<LEGAL ENTITY>` stays an unfilled
  placeholder — per the owner's explicit instruction this turn, that fill-in
  waits for actual incorporation, not this pass, matching the existing D87
  ruling and `open_rulings.md` Q11/Q12, both untouched.
- **`docs/decisions.md`** D90, **`current_state.md`** §4 decision index —
  this ruling recorded.

## 3. What did NOT change, deliberately

- `LICENSE` — already verbatim AGPL-3.0-only text; no edit.
- All ten manifests' `"license"` field — already `AGPL-3.0-only`; no edit.
- `licenses/` — untouched; T-003 (the in-app open-source-licences screen,
  `ready`, unclaimed) needs no change to its `done-when:` list, since
  nothing it reads (`NOTICE`, `licenses/`) lost content, only gained a
  header block at the top of `NOTICE`.
- `open_rulings.md` Q11/Q12 — untouched, per the owner's explicit
  instruction this turn.
- `CLA.md`'s legal substance — untouched (see above).

## 4. Verification

`pnpm verify` run on this branch: [see the commit this turn ends with for
the actual numbers — this body is written before that run completes].
`tests/notice-attribution.test.ts` reads `NOTICE` for the presence of each
shipped dependency's name, not a fixed line structure, so the added header
block does not disturb it. `tests/reserve-shapes.test.ts` and
`tests/freeze-boundary.test.ts` touch no file this turn changed. A
`Re-seed-unchanged:` trailer is on the commit — `tools/kernel-build/src/
kernel.cpp` and `src/probe.cpp` each gained a two-line comment header,
which changes nothing a compiler emits, so no golden needs re-seeding; the
committed `bunyan-kernel.wasm`/glue are binary artifacts, not `.ts`/`.cpp`
source, and were not touched by the SPDX sweep.

## 5. What this leaves

`amer`/`khalihlna`: T-003 (the in-app licences screen) remains `ready` and
unaffected — a good next pc build turn, now that `NOTICE` also carries the
brand block T-003's own `done-when:` never required reading.

The owner: incorporation is still the trigger for filling `CLA.md`'s
`<LEGAL ENTITY>` placeholder and resolving `open_rulings.md` Q11/Q12 — this
turn does not change that trigger, only records that Bunyan's tier
assignment is now settled and applied.
