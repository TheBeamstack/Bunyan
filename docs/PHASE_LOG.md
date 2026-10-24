# Bunyan — `docs/PHASE_LOG.md`

**What it is, and who reads it when.** The complete entry registry — every session this project has
had, oldest first — read on lookup by any seat that is stuck or missing older context, never as part of
a session briefing.

**Why it exists.** `docs/CURRENT_STATE.md` is read in full on every session, so its length is a cost
paid every run; an entry's value does not go to zero when it scrolls off it. Entries are compressed
here, never discarded. It answers: *why is this shaped this way* · *has this been tried* · *what did
that D-number cost to learn* · *where did this trap come from*.

⚠ **This file is a POINTER, not the source.** Every entry's durable lessons were promoted into
`docs/CURRENT_STATE.md` §1–§5 — that promotion is what makes compression safe — and its full,
uncompressed body is either in `handoff/<seat>/` (named in each entry below) or in git history on the
commit that wrote it.

---

## THE ROTATION RULE (binding — this is how the two files stay in balance)

**§7's budget is the authority: a BYTE budget** (`docs/CURRENT_STATE.md` §7's header;
`BUDGET.maxAbstracts` in `scripts/docs-state.mjs` caps the count at 10). Whenever §7 is at or over it,
the agent that notices compacts:

1. Keep the newest abstracts §7's budget allows, in full.
2. **Summarize each older entry into this file**, in order, keeping its id, date, seat, headline, the
   measured numbers, the decisions it took (with D-numbers), its `handoff/` body path and its review
   status. Drop only session bookkeeping (verify counts, box notes, commit hashes).
3. Before dropping an entry, **check its durable lessons are already in `docs/CURRENT_STATE.md`
   §1–§5**; promote first if not. *The summary here is a pointer; §1–§5 is where a rule binds.*
4. Leave `docs/CURRENT_STATE.md`'s pointer to this file intact.

⚠ **An entry's `###` heading is verbatim and permanent** (invariant 10). `recordedAbstracts` resolves a
durable reference against §7 **plus this file and its sealed volumes**, reading headings only — so a summarised entry keeps its
identity fields, and compressing a body never moves the population a reference resolves against.

*Compaction is maintenance, not work: it does not get an entry of its own.*

**Sealed volumes** (never edited again): `docs/phase-log-01.md` — §A–§E, Entries 1–88 and the
`T-nnn`/`STEWARD-slug` turns through 2026-08-31 · sealed 2026-10-07. `docs/phase-log-02.md` — the turns
from 2026-10-06 through T-053's step-2 review · sealed 2026-10-20.

## T-063 — review step 1 of PR #114 — 2026-10-24 — seat: hmdnah

Item 1 at `3b6a713`: caller `read('index.json')` restored → "no inflate of index.json on the caller: expected 1 to be +0"; restored → 6 passed.
Labeller run 40074714314: additive, not owner-gated; worker bundle 10.66 kB reproduced. No build defect proven; no approval.
T-061 pin edit: spec contradiction (BACKLOG.md:685,686,688 vs :690); steward owes the doc fix.
Body: `handoff/hmdnah/2026-10-24-T-063-review-step-1.md`

## T-063 — opening a file inflates its geometry-cache index in the worker and parses it root by root — 2026-10-24 — seat: zayd

The cache-open worker caps-checks (leaf `bnncaps.ts`), inflates and opens `index.json` from the posted file bytes, then transfers one per-root JSON buffer. `#stage` parses a root only in its batch.
T-063 test 6 passed; restoring the caller's `read('index.json')` → "expected 1 to be +0". `pnpm verify` green (1058 passed). One T-061 import-pin assertion changed (spec defect, see body).
Body: `handoff/zayd/2026-10-24-T-063-open-inflates-in-worker.md`

## T-062 — review step 2 of PR #113 — 2026-10-24 — seat: hmdnah

APPROVED, no defect proven. Item 1 at `d73d0d5`: `usableRecord` without `key` → "at most one key per root: expected 2 to be 1"; key memo bypassed → "expected 3 to be +0"; restored → 3 passed.
Item 2/3: keys read only scene+tables, every `#scene` write replaces it, and consumers never write the shared entries. Item 6: keys carried across scenes → 6 red.
Done-when 2: main's two test files pass against this code (16 passed, 1 skipped); the PR deletes no line of them. T-064 must not transfer `files` (opinion).
Body: `handoff/hmdnah/2026-10-24-T-062-review-step-2.md`

## T-062 — review step 1 of PR #113 — 2026-10-24 — seat: hmdnah

Item 1 at `cb225ac`: save loop re-keying → "at most one key per root: expected 2 to be 1" and "expected 3 to be +0"; carried-memo skip removed → "expected 6 to be 3"; restored → 3 passed.
Labeller on `cb225ac` says additive, not owner-gated; figures trace to design §5 lines 201, 228. No defect proven; no approval.
Flagged for step 2: memoized `.brep` buffers are shared across saves (safe while `bnnZip.ts:84` copies).
Body: `handoff/hmdnah/2026-10-24-T-062-review-step-1.md`

## T-062 — a named save keys each cached root once, and not at all for an unchanged scene — 2026-10-24 — seat: zayd

`geometryCacheFiles()` keeps root keys and carried `.brep` bytes per scene object and passes its key into `usableRecord`. A second save of the same scene keys nothing, inflates nothing and writes the same bytes.
T-062 test 3 passed; reverting `document.ts:740,749` → "expected 2 to be 1" and "expected 3 to be +0". `pnpm verify` green (1052 passed). No watched file changed; nothing timed.
Body: `handoff/zayd/2026-10-24-T-062-save-keys-once.md`

## STEWARD-d29-cache-followups — re-review of PR #112 — 2026-10-24 — seat: hmdnah

APPROVED. All four B-20261024-01 items are fixed at `170a54d`; the code is unchanged since `624b5ba`. Item 1: T-063 `implements:` dropped → `gates.py docs` exit 1; restored → exit 0.
Fixed on the branch: `main` failed `gates.py docs` on a stale `## BLOCKED` render (R15). I merged `main` in and ran `blocked.py`, and the gate passes. Not owner-gated.
Body: `handoff/hmdnah/2026-10-24-STEWARD-d29-cache-followups-review.md` (§ Re-review)

## STEWARD-d29-cache-followups — the four B-20261024-01 corrections — 2026-10-24 — seat: brahim

Design §5:230 now points at T-062/T-064, and T-064 runs `named-save.mjs` with the `--playwright`/`--browser` arguments its usage line requires (`named-save.mjs:30-31`).
Corrected here, not in the entry below: an open's whole-index parse already runs in the worker (`cacheOpen.ts:28` → `cachesign.ts:171`). The caller inflates the index and clones the reply. `cachesign.ts:81` is `canonicalJson` (the MAC), `:94` is `JSON.stringify` (the stored index).
Body: `handoff/brahim/2026-10-24-STEWARD-d29-cache-followups-t062.md` (§ Corrections)

## STEWARD-d29-cache-followups — review of PR #112 — 2026-10-24 — seat: hmdnah

CHANGES REQUESTED; not approved, not merged (B-20261024-01). Design §5:230 still points at the deleted `## Discovered` finding; the parse runs in the worker at `624b5ba`, not on the caller.
The handoff swaps `cachesign.ts:81`/`:94`, and T-064's bare `named-save.mjs` exits 2. Item 1: T-062 `implements:` dropped → `gates.py docs` exit 1; restored → exit 0.
Every other cited line matches the code; CI green at `34bffdd`; not owner-gated.
Body: `handoff/hmdnah/2026-10-24-STEWARD-d29-cache-followups-review.md`

## STEWARD-d29-cache-followups — T-062, T-063, T-064 from the two 2026-10-23 findings — 2026-10-24 — seat: brahim

A diagnosis subagent at `624b5ba` confirmed both findings in part. A save keys each carried root twice (`document.ts:740,749`); an open inflates and parses the whole index on the caller (`cacherestore.ts:92`).
T-062 (`ready`): one key per root, none for an unchanged scene. T-063 (`ready`): the worker inflates; per-root records parse lazily. T-064 (`blocked` on both, `requires: browser`): records posted as one transferred buffer.
All `risk: high`; both findings deleted (R12). No code changed.
Body: `handoff/brahim/2026-10-24-STEWARD-d29-cache-followups-t062.md`

## T-061 — review step 2 of PR #111 — 2026-10-23 — seat: hmdnah

APPROVED, no defect proven. Item 1 at `1a0d26c`: `openIndexOf` verifying on the caller → "opened before rebuildAll: expected +0 to be 1"; restored → 6 passed, 1 skipped.
Item 2/3: only `rebuildAll`/`rebuildOnly` restore, and both await the open; `vite build` emits `cacheOpenWorker` at 2.97 kB.
Item 6: no `error` listener → timeout red; no MAC check → other-install test red. 16k figures not re-run (permissions).
Body: `handoff/hmdnah/2026-10-23-T-061-review-step-2.md`

## T-061 — review step 1 of PR #111 — 2026-10-23 — seat: hmdnah

Item 1 at `32b2dd1`: `#stage` opening the index again → "no parse or verify runs on the caller: expected 1 to be +0"; dropping the awaits → `rebuildOnly` "expected +0 to be 1"; restored → 6 passed, 1 skipped.
Labeller on `a47e56a` says additive, not owner-gated; 13 files 111 passed as claimed. No defect proven; no approval.
Flagged: `rebuildAll`'s JSDoc now sits on `openGeometryCache`; the 16k figures were not re-run here.
Body: `handoff/hmdnah/2026-10-23-T-061-review-step-1.md`

## T-061 — opening a file verifies its geometry-cache index off the main thread — 2026-10-23 — seat: zayd

`doc.openGeometryCache()` posts `index.json` to the app's cache-open worker, which parses and verifies it with the leaf `@bunyan/document/cachesign`; `#stage` reads the result.
T-061 test 6 passed, 1 skipped; `#stage` opening the index again → "no parse or verify runs on the caller" red. D29/T-043–T-060 tests unchanged and green.
16k under node: verify 2,195–2,229 ms, parse 227–231 ms; the reply clone (337–343 ms) stays on the main thread (Discovered). Not timed in a browser.
Body: `handoff/zayd/2026-10-23-T-061-open-verifies-in-worker.md`

## T-060 — review step 2 of PR #110 — 2026-10-23 — seat: hmdnah

APPROVED, no defect proven. Item 1 re-run at `a4c5561`: caller signing again → "expected [ 1 ] to deeply equal [ +0 ]"; restored → 4 passed, 1 skipped.
Item 2/3: every `geometryCacheFiles()` and `SaveOptions.cache` consumer signs or drops the unsigned cache; `vite build` puts the signer in the 11.92 kB worker bundle.
Item 6: a worker that skips signing goes red; an HMAC added inside `geometryCacheFiles()` stays green (gap, not a defect).
Body: `handoff/hmdnah/2026-10-23-T-060-review-step-2.md`

## T-060 — review step 1 of PR #110 — 2026-10-23 — seat: hmdnah

Item 1: `saveDocument` signing on the caller again → "no HMAC runs on the caller: expected [ 1 ] to deeply equal [ +0 ]"; restored → 4 passed, 1 skipped.
`named-save.mjs` re-run twice: hold 1,444–1,491 ms, control 8,295/8,516 ms; labeller on `2e7ce32` says additive, not owner-gated. No defect proven.
Flagged: test count is 4, not 3; clone low bound 328 vs 318 ms across docs; the 16k file size differs per run. No approval.
Body: `handoff/hmdnah/2026-10-23-T-060-review-step-1.md`

## T-060 — a named save signs its geometry-cache index in the zip worker — 2026-10-23 — seat: zayd

`geometryCacheFiles()` returns the cache unsigned; the worker signs `index.json` with the new leaf `@bunyan/document/cachesign`. Bytes equal `saveBnn`.
T-060 test 3 passed, 1 skipped; signing on the caller again → "no HMAC runs on the caller" red. `pnpm verify` green.
`named-save.mjs` at 16k: main thread held 1,431–1,476 ms against 8,515 ms for `saveBnn`. Its 200 ms bar fails: keys and the records clone still run on the main thread (Discovered).
Body: `handoff/zayd/2026-10-23-T-060-sign-in-zip-worker.md`

## STEWARD-d29-cache-sign-off-main — review of PR #109 — 2026-10-23 — seat: hmdnah

APPROVED, no defect proven. Item 1 (docs-only): deleting T-060's `implements:` → `gates.py docs` exit 1; restored → exit 0.
Every cited file:line matches `5203ad3`, every `implements:` section exists, and T-060's `requires: browser` is needed by `named-save.mjs`.
Body: `handoff/hmdnah/2026-10-23-STEWARD-d29-cache-sign-off-main-review.md`

## STEWARD-d29-cache-sign-off-main — T-060, T-061 from the 2026-10-20 finding — 2026-10-23 — seat: brahim

A diagnosis subagent confirmed at `b927f6e` that a named save signs the D29 index on the main thread (`App.tsx:328`) and an open verifies it there (`cacherestore.ts:91`).
T-060 (`ready`, `requires: browser`): the zip worker signs, bytes unchanged. T-061 (`blocked` on T-060): the open's parse+verify moves off the main thread.
Both `risk: high`; the finding is deleted (R12). No code changed.
Body: `handoff/brahim/2026-10-23-STEWARD-d29-cache-sign-off-main-t060.md`

## T-059 — review step 2 of PR #108 — 2026-10-23 — seat: hmdnah

APPROVED, no defect proven. Item 1 re-run: `namedSaveOptions` without `cache` → 2 red; restored → 3 green.
Every heap writer, the agent's included, takes `docLock`; the save reads one synchronous cache snapshot, and its gateway-less `saveDocument` sends no kernel op.
Decided: "test-first" is unmet as written but proven in substance; the `App.tsx` effects and the re-kick branch are untested gaps, not defects.
Body: `handoff/hmdnah/2026-10-23-T-059-review-step-2.md`

## T-059 — review step 1 of PR #108 — 2026-10-23 — seat: hmdnah

Item 1: export outside `lock.run` → 1 red (`:253`); `namedSaveOptions` without `cache` → 2 red; restored → 3 green.
`pnpm verify` green, 119 files / 1039 passed / 2 skipped; labeller on `431d6bf` says additive, not owner-gated. No defect proven.
Flagged for step 2: "test-first" is unmet as written (purpose re-verified); the `App.tsx` kick wiring has no test. No approval.
Body: `handoff/hmdnah/2026-10-23-T-059-review-step-1.md`

## T-059 — the app exports in idle time, and a named save carries the cache — 2026-10-23 — seat: zayd

`createIdleCacheExporter` runs `doc.exportCacheIdle(1)` under the doc lock per idle slot, re-kicked by every edit/build.
`saveDoc` passes `namedSaveOptions` (`cache: geometryCacheFiles()`); autosave unchanged. T-059 test 3 passed; `pnpm verify` green.
Revert-verify: no `cache` → 2 red; export outside the lock → "never alongside an edit" red. Next: hmdnah, step 1.
Body: `handoff/zayd/2026-10-23-T-059-idle-cache-export.md`

## T-058 — review step 2 of PR #107 — 2026-10-23 — seat: hmdnah

APPROVED. B-20261023-02 is resolved: step 1's probe at `1a4a7f5` shows that a second save after `error` rejects at once and posts nothing.
Item 1: the early reject was removed → red (`resolved "'pending'"`), then restored → green. Items 2, 3 and 6 found nothing.
The `App.tsx:303` respawn line is checked by hand only (`null=true failed=true live=false`), because nothing renders `App`.
Body: `handoff/hmdnah/2026-10-23-T-058-review-step-2.md`

## T-058 — fix B-20261023-02, a named save after a zip-worker error — 2026-10-23 — seat: zayd

`createBnnZipper` rejects every `zip()` after the worker's `error` and reports `failed`; `saveDoc` respawns a failed zipper.
New T-058 test: early reject removed → red (`resolved "'pending'"`, the hang); restored → 4 passed, 1 skipped.
Next: hmdnah, step 2 of PR #107.
Body: `handoff/zayd/2026-10-23-T-058-named-save-zip-worker.md`

## T-058 — review step 1 of PR #107 — 2026-10-23 — seat: hmdnah

Item 1: `saveDocument` storing `saveBnn` → 2 red (`posts to the worker: expected +0 to be 1`); restored → green. Browser re-run:
123/133/125 ms vs 5,025 ms on-thread. Size drift between runs is new element ids per fixture run, not save nondeterminism.
One defect, back to zayd (B-20261023-02): after a zip-worker `error`, later named saves never settle. Not owner-gated; no approval.
Body: `handoff/hmdnah/2026-10-23-T-058-review-step-1.md`

## T-058 — a named save zips in a dedicated worker — 2026-10-23 — seat: zayd

`saveDoc` → `saveDocument`: entries assembled on the main thread, zipped in `bnnZipWorker.ts`, bytes equal `saveBnn`
(T-058 test; revert to `saveBnn` → red). Browser, 16k solids: main thread held 125–133 ms per save vs 4,940 ms on-thread.
Next: hmdnah, step 1 of this PR.
Body: `handoff/zayd/2026-10-23-T-058-named-save-zip-worker.md`

## T-057 — review step 2 of PR #106, re-run after the fix — 2026-10-23 — seat: hmdnah

APPROVED. B-20261023-01 is resolved: step 1's delayed-store probe at `a148f77` gives `AeqB=false`, the loser's index fails
`verifyCacheIndex`, and the reworded comment now says exactly that. Item 1: `geometryCache` dropped → 1 red; restored → 10 green.
Items 2, 3 and 6 re-run: nothing new. Not owner-gated.
Body: `handoff/hmdnah/2026-10-23-T-057-review-step-2.md` § step 2 re-run

## T-057 — review fix: `installSecret`'s race comment — 2026-10-23 — seat: zayd

B-20261023-01: `documentStorage.ts` `installSecret`'s comment no longer claims racing first boots agree; it says they can
differ and the loser's cache is refused by `verifyCacheIndex`. Comment only; code unchanged. T-057 tests: 10 passed.
Next: hmdnah, step 2 of PR #106.
Body: `handoff/zayd/2026-10-23-T-057-app-cache-open.md` § review fix

## T-057 — review step 2 of PR #106 — 2026-10-23 — seat: hmdnah

CHANGES REQUESTED; not approved, not merged, row stays `review` (B-20261023-01). Step 1's defect is unresolved: no code commit
since, and `documentStorage.ts:88-91` still claims racing first boots agree. Item 1: `geometryCache` dropped → 1 red; restored →
10 green. Items 2, 3, 6: nothing else found. CI green on `7952ee4`; not owner-gated.
Body: `handoff/hmdnah/2026-10-23-T-057-review-step-2.md`

## T-057 — review step 1 of PR #106 — 2026-10-23 — seat: hmdnah

Item 1: `geometryCache` dropped → restore test red (`expected Set{ 'extrude' } to deeply equal Set{ 'importBrep' }`); restored → green.
One item-4 defect proven, back to zayd: `installSecret`'s comment says racing first boots agree, but a delayed-store probe gives `AeqB=false`.
No geometry effect (a foreign MAC is refused, no app cache write yet). No watched file changed. Not owner-gated; no approval.
Body: `handoff/hmdnah/2026-10-23-T-057-review-step-1.md`

## T-057 — Opening a stored `.bnn` in the app restores its geometry cache, under a per-install secret — 2026-10-23 — seat: zayd

`readInitial` keeps `pkg.cache`; `documentOptions` (out of `bootstrap.ts`) wires the D29 cache options; `installSecret` writes one key.
Real OCCT: own secret → `rebuildOnly` sends only `importBrep`; other secret or no cache → builds. Both revert-verified red.
Spec defect fixed: T-057's `tests/_d29_` (prettier-mangled) is now `` `tests/*-d29.test.ts` ``. No watched file changed.
Body: `handoff/zayd/2026-10-23-T-057-app-cache-open.md`

## STEWARD-d29-app-wiring — review of PR #105 — 2026-10-23 — seat: hmdnah

Approved; no defect proven. Item 1: T-057's `implements:` removed → `gates.py docs` RED (exit 1, named);
restored → GREEN, `pnpm docs:check` 66 passed. Every cited site read at `3d72653` and matches; T-058's
`requires: browser` is right, T-057/T-059 check under node. Not owner-gated.
Body: `handoff/hmdnah/2026-10-23-STEWARD-d29-app-wiring-review.md`

## STEWARD-d29-app-wiring — T-057, T-058, T-059 from the 2026-10-14 finding — 2026-10-23 — seat: brahim

A diagnosis subagent confirmed at `3d72653` that `apps/web` does not restore, export, save or sign the D29 cache.
T-057 (`ready`): the open path restores it under a per-install secret. T-058 (`ready`, `requires: browser`): a named save zips in a worker.
T-059 (`blocked` on both): idle export, and a named save carries the cache, so the ~6 s 16k stall never ships. All `risk: high`. No code changed.
Body: `handoff/brahim/2026-10-23-STEWARD-d29-app-wiring-t057.md`

## T-049 — review step 2 of PR #88 (on the fix) — 2026-10-23 — seat: hmdnah

Approved; no defect proven. Item 1 at `bea8173`: pre-fix `cacherestore.ts` from `4be9c20` → test 3 red
(`expected [] to deeply equal [ 'W00000', 'W00002' ]`); restored → 3 green. Probes: corruption before `loadBnn`, and 3 corrupt
entries over 1,030 multi-part roots, restore exactly the healthy roots. Reserved classes: none; CI green. Not owner-gated.
Body: `handoff/hmdnah/2026-10-23-T-049-review-step-2.md`

## T-044 — review step 2 of PR #90 (on the fix) — 2026-10-23 — seat: hmdnah

Approved; no defect proven. Item 1 at `24a0cc3`: pre-fix plugin and `codeId.ts` restored → 2 red (step 1's probe); restored →
4 green. Two real app builds: only the 4 HTML entries change bytes; `PartBatch-*.js` keeps name and bytes. Chromium reads the
meta. Reserved classes: none; CI green. Not owner-gated. Body: `handoff/hmdnah/2026-10-23-T-044-review-step-2.md`

## T-044 — `CODE_ID` is stamped into the HTML, never a hashed chunk (B-20261020-02) — 2026-10-23 — seat: zayd

`codeIdPlugin` stamps the bundle digest into each HTML entry's meta tag; `CODE_ID` reads it at runtime. hmdnah's
probe is landed; pre-fix code → 2 red (probe: `assets/id-GK_lKDOT.js`), restored → 4 green. Merged `origin/main`
(PR #90 conflicted). `pnpm verify` → 1024 passed, 1 skipped. Body: `handoff/zayd/2026-10-23-T-044-codeid-in-html.md`

## T-043 — review step 2 of PR #89 (on the fix) — 2026-10-23 — seat: hmdnah

Approved; no defect proven. Item 1 at `f840309`: the `openCacheIndex` try/catch reverted → 1 red (`RangeError`); restored →
green. An e2e `rebuildAll` probe on the hostile index: red reverted, green restored. `pnpm verify` → 1020 passed, 1 skipped.
Reserved classes: none; CI green. Not owner-gated. Body: `handoff/hmdnah/2026-10-23-T-043-review-step-2.md`

## T-043 — a hostile cache index is refused, not thrown (B-20261020-01) — 2026-10-23 — seat: zayd

`openCacheIndex` returns `undefined` when `verifyCacheIndex` throws; hmdnah's 200,000-deep probe is a test, red before.
Merged `origin/main` (PR #89 conflicted); main's T-052/T-056 tests now pass a secret. `pnpm verify` → 1020 passed, 1 skipped.
Body: `handoff/zayd/2026-10-23-T-043-hostile-index-refused.md`

## T-044 — review step 1 of PR #90 — 2026-10-20 — seat: hmdnah

Changes requested (step 1): the stamped chunk keeps its pre-stamp content-hash name, so a URL-keyed cache can serve
a stale `CODE_ID` (B-20261020-02). Proof: two app builds give `PartBatch-C8aMdl36.js` the same name and different
bytes, and a probe test reads 1 red. Item 1: assets dropped from the digest → 1 red, restored 3 green. Not owner-gated.
Body: `handoff/hmdnah/2026-10-20-T-044-review-step-1.md`

## T-044 — D29 R6 — `codeId` is the shipped bundle's sha256 (D-20261012-06 `bundle`) — 2026-10-20 — seat: zayd

`vite build` stamps `CODE_ID` (`apps/web/src/codeId.ts`) with sha256 over every chunk and asset (`codeIdPlugin.ts`).
`cacheEnvelope(kernelBuildId)` carries it; nothing calls it yet (`## Discovered`). A real fixture build: a changed
main or worker moves the id. Revert-verified twice, 1 red then 3 green each. `pnpm verify` green (979).
Body: `handoff/zayd/2026-10-20-T-044-d29-codeid-bundle.md`

## T-056 — review step 2 of PR #104 — 2026-10-20 — seat: hmdnah

Approved; no defect proven. Item 1: mtime 1980-01-02 → 2 red; `saveBnn` inlining level 5 → 1 red (worker ≠ save); restored
→ 2 passed. One production `zipSync` remains, at `bnnzip.ts:26`. Step 1's item-6 flag holds the done-when: the reference
catches it. `pnpm verify` → 1002 passed, 1 skipped. Not owner-gated. Body: `handoff/hmdnah/2026-10-20-T-056-review-step-2.md`

## T-056 — review step 1 of PR #104 — 2026-10-20 — seat: hmdnah

No defect proven; no approval, no merge, and the row stays `review`. Item 1: `level` 5 → 1 red, and a 1980-01-02 mtime → 2 red;
restored → 2 passed. The 16k re-run is discharged through a /tmp vitest config: `saveBnn` 4075.8 ms with the cache, now in
design §5. `pnpm verify` → 1002 passed, 1 skipped. Not owner-gated. Body: `handoff/hmdnah/2026-10-20-T-056-review-step-1.md`

## T-056 — a save carrying the D29 cache can zip off the main thread — 2026-10-20 — seat: zayd

`saveBnn` is `zipBnnEntries(assembleBnnEntries(...))`; the zip step is `bnnzip.ts`, fflate only, for a worker.
New test: worker bytes equal `saveBnn` and an independent `zipSync` reference, 20-solid cache and cache-less;
level 5 and a 1980-01-02 mtime each turn it red. `pnpm verify` → 1002 passed, 1 skipped. Unverified here: the 16k
re-run (env-prefixed command refused) — hmdnah to confirm. Body: `handoff/zayd/2026-10-20-T-056-bnn-zip-worker.md`

## STEWARD-cache-save-zip-worker — review of PR #103 — 2026-10-20 — seat: hmdnah

Approved; no defect proven. Item 1: T-056's `implements:` and `risk:` removed → `gates.py docs` RED (exit 1, both
named); restored → GREEN, `pnpm docs:check` 66 passed. Cited sites (`bnn.ts:189`, fflate `:2287`, `App.tsx:297-301`)
read and match. Unverified here: the 16k timings, not re-run — zayd to confirm in T-056. Not owner-gated.
Body: `handoff/hmdnah/2026-10-20-STEWARD-cache-save-zip-worker-review.md`

## STEWARD-cache-save-zip-worker — T-056 from the 2026-10-14 finding — 2026-10-20 — seat: brahim

T-056 (`ready`, `risk: high`, `depends-on: —`) splits `saveBnn` so its level-6 zip can run in a worker with identical bytes.
A diagnosis subagent re-measured at `12fa699`: 4076–4249 ms at 16k. Level 1 is ~3.0 s, and level 0 is ~0.4 s at 6x the bytes,
so a lower level is not the fix. Wiring the worker into `apps/web` needs a browser and T-044, so it is left for a later row. No code changed.
Body: `handoff/brahim/2026-10-20-STEWARD-cache-save-zip-worker-t056.md`

## T-055 — review of PR #102 — 2026-10-20 — seat: hmdnah

Approved; no defect proven. Item 1: the `primaryViolations` spread removed → the new test RED (5 failed, 2 passed);
restored → GREEN with both design-option test files (30 passed). No watched path; `isElementActive` and
`modelElements()` unchanged. The hosted-element choice matches D67 and the two existing bodies. Not owner-gated.
Body: `handoff/hmdnah/2026-10-20-T-055-review.md`

## T-055 — a design-option set with no primary or two primaries surfaces in brokenRefs() — 2026-10-20 — seat: zayd

`document.ts` `primaryViolations` reports one `brokenRefs()` entry per element tagged in a set whose primary
count is not 1; nothing healed, `isElementActive` untouched. New test: 7 cases, both roads; red with the spread
reverted (5 failed). `pnpm verify` → 1000 passed, 1 skipped. An untagged hosted element is covered by its host's entry.
Body: `handoff/zayd/2026-10-20-T-055-design-option-primary-invariant.md`

## STEWARD-design-option-primary-invariant — T-055 from the 2026-08-17 finding — 2026-10-20 — seat: brahim

T-055 (`ready`, `risk: normal`, `depends-on: —`) makes a design-option set with zero or two primaries surface
in `brokenRefs()`. A diagnosis subagent re-measured it at `a7c903e`: both roads bypass the check, and both
counts are silent. The fix stays in `document.ts`, off the frozen surface. The `## Discovered` line is deleted. No code changed.
Body: `handoff/brahim/2026-10-20-STEWARD-design-option-primary-invariant-t055.md`

## STEWARD-design-option-primary-invariant — review of PR #101 — 2026-10-20 — seat: hmdnah

Approved; no defect proven. Item 1: a probe of T-055's done-when went RED on both roads (`brokenRefs()` [],
`isElementActive` both true / both false); the row's fix shape in `document.ts` turned it GREEN (28 passed), then
removed. Cited lines read as T-055 says; `document.ts` is not watched. Reserved classes: none. Not owner-gated.
Body: `handoff/hmdnah/2026-10-20-STEWARD-design-option-primary-invariant-review.md`

## STEWARD-datum-inherited-level-restage — T-054 from PR #98's step-2 finding — 2026-10-20 — seat: brahim

T-054 (`ready`, `risk: high`, `depends-on: —`) makes a container move re-stage every datum on a Level beneath it
and those elements' join neighbours. Evidence is step 2's probe: C's low point 3000 incrementally, 2000 after
`rebuildAll`. The fix stays in `dependency.ts` (`scene.ts` is frozen). The `## Discovered` line is deleted. No code changed.
Body: `handoff/brahim/2026-10-20-STEWARD-datum-inherited-level-restage-t054.md`

## STEWARD-datum-inherited-level-restage — review of PR #99 — 2026-10-20 — seat: hmdnah

Approved; no defect proven. Item 1: un-rolling the log made the steward roll gate red (41054 > 40960) and a
copy-not-move roll made `gates.py docs` red (82 duplicates); both restored green. All 82 entry headings moved
exactly once, byte-identical. Cited lines read as T-054 says. Reserved classes: none. Not owner-gated.
Body: `handoff/hmdnah/2026-10-20-STEWARD-datum-inherited-level-restage-review.md`

## T-054 — a container move re-stages every datum on a Level beneath it — 2026-10-20 — seat: zayd

`dependency.ts` `case 'containers'` now also re-stages datums on every Level beneath the moved container that
inherits its elevation, plus their join neighbours. New test covers `base` and `top`, move and undo; red before the
fix (C 3000 vs 2000). `pnpm verify` → 993 passed, 1 skipped. `scene.ts` untouched.
Body: `handoff/zayd/2026-10-20-T-054-datum-inherited-level-restage.md`

## T-054 — review step 1 of PR #100 — 2026-10-20 — seat: hmdnah

Step 1 passes with no defect proven; no approval, no merge, and the row stays `review`. Item 1: `dependency.ts`
reverted → 2 red (`expected 3000 to be 2000`), restored → 10 green. `pnpm verify` → 993 passed, 1 skipped.
Reserved classes: none (`RISK: additive`). Items 2, 3, 6 are step 2's.
Body: `handoff/hmdnah/2026-10-20-T-054-review-step-1.md`

## T-054 — review step 2 of PR #100 — 2026-10-20 — seat: hmdnah

Approved; no defect proven. Item 1: `dependency.ts` reverted → 2 red (`expected 3000 to be 2000`), restored → 3
green. Probes show the edge also covers `deleteContainer` and its undo. Two mutations (neighbour hop, elevation
shield) each go red. Reserved classes: none. Not owner-gated.
Body: `handoff/hmdnah/2026-10-20-T-054-review-step-2.md`

## T-043 — review step 2 of PR #89 — 2026-10-20 — seat: hmdnah

DEFECT; not approved, not merged, row stays `review` (B-20261020-01). A hostile `index.json` with deeply nested `records`
makes `verifyCacheIndex`'s recursive `canonicalJson` throw `RangeError`, so `rebuildAll` rejects and the file does not open;
with the verify call removed it opens. Item 1: `true ||` before `sameInstallSecret` → 1 red; restored → 34 green.
Body: `handoff/hmdnah/2026-10-20-T-043-review-step-2.md`

## T-043 — review step 1 of PR #89 — 2026-10-20 — seat: hmdnah

No defect proven; not approved (step 1). Item 1: `verifyCacheIndex` check removed → 7 red across the three d29 files;
restored → 34 green. 16k signing re-measured 2073.6 ms, foreign open 92 ops; a 0.4 mm `.brep` edit is refused.
Reserved classes: none; CI green on `9cf35b6`. Items 2, 3, 6 are step 2's.
Body: `handoff/hmdnah/2026-10-20-T-043-review-step-1.md`

## T-043 — D29 R5 — the cache envelope is trusted per the owner answer to D-20261012-05 — 2026-10-20 — seat: zayd

`own` built: `envelope.mac` is an HMAC-SHA-256 keyed by a per-install secret over the canonical index; `openCacheIndex`
refuses any other, so a foreign or edited file opens with 0 imports and a cache-less open's op sequence (real OCCT).
Test-first (12 red); MAC check reverted → 7 red, carry guard → 1 red. 16k signing: 2,074 ms, one run.
Body: `handoff/zayd/2026-10-20-T-043-d29-cache-trust.md`

## T-049 — A cache restore reads each batch of roots' entries in one `readMany` — 2026-10-19 — seat: zayd

`#stage` reads one `readMany` per `RESTORE_BATCH_ROOTS` (1024) roots; a throw from it rebuilds that batch. New test:
2B+5 roots → 0 `.brep` reads, 3 `readMany`; per-name `read` restored → 2053 reads, red. 16,000 entries restore in
16 calls, 1,059–1,122 ms of `readMany`, 2.28–2.40 s `rebuildAll` (kernel import excluded). `pnpm verify` green (978).
Body: `handoff/zayd/2026-10-19-T-049-cache-restore-batch.md`

## T-049 — review step 1 of PR #88 — 2026-10-19 — seat: hmdnah

No defect proven; not approved (step 1). Item 1: main's per-part `read` restored with `RESTORE_BATCH_ROOTS` kept →
2 red (`brepReads: 2053, readMany: 0`); restored → 26 green over the four files. 16k re-measured: 16 `readMany`,
1,157–1,208 ms, `rebuildAll` 2.39–2.51 s. Reserved classes: none; CI green on `54b7c62`. Items 2, 3, 6 are step 2's.
Body: `handoff/hmdnah/2026-10-19-T-049-review-step-1.md`

## T-049 — review step 2 of PR #88 — 2026-10-19 — seat: hmdnah

DEFECT; not approved, not merged, row stays `review` (B-20261019-04). One corrupt `.brep` (DEFLATE `invalid block type`)
rebuilds its whole batch: a 3-root probe restores 0 at `355d4cd` and 2 on main, against design §4's per-root restore.
Item 1: per-name `read` at `cacherestore.ts:118` → red (`brepReads: 2053`); restored → 26 green. Items 2, 3, 6 are clean otherwise.
Body: `handoff/hmdnah/2026-10-19-T-049-review-step-2.md`

## T-049 — one corrupt cache entry costs its root, not its batch (B-20261019-04) — 2026-10-23 — seat: zayd

Merged main (F1). After a non-cap `readMany` throw, `readRestoreBatch` re-reads each root alone and keeps the roots that
read; a cap refusal still empties the batch. Step-2 probe as test 3: red (`[]`) before, then `W00000`, `W00002` restore.
Cap branch forced off → test 2 red. `bnn.ts` unchanged.
Body: `handoff/zayd/2026-10-23-T-049-corrupt-entry-per-root.md`
