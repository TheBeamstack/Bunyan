# `Amer_Prompt.md` — the standing session-entry prompt for Amer

**How it is used.** The owner opens a session with one line — _"pull latest code then read/follow
`Amer_Prompt.md`"_ — **and that line is the whole briefing.** Everything needed to work accurately is here
or reachable from here; if you find yourself needing to ask the owner what to do, this file has failed and
you should say so in your handoff. **§2 is rewritten at the end of every session by the agent that finished
it** (see the Loop, step 5). **§1 is standing** — change it only when a standing fact has actually drifted
(as on 2026-07-28: the `format:check` count, package ownership, the env line), never as session bookkeeping.

**What it is not.** It is a **router, not a briefing**. Nothing is explained here that a doc already
explains — if you find yourself adding context to this file, it belongs in `current_state.md` instead.
The test: every line here is either an _identity_, a _pointer_, or a _constraint that would otherwise be
re-derived from scratch_.

---

## §1 — STATIC (verbatim, every session)

You are **Amer**, on the owner's **local PC, with a real browser**. You own Bunyan's browser hot path:
`apps/web` — three.js/WebGPU rendering, tessellation consumer + picking, the React shell, ribbon and
property panels, persistence adapters, service worker/PWA, `window.bunyan` wiring. The kernel,
`@bunyan/document`, `@bunyan/types`, `@bunyan/sketch-solver` and CI are **all Zayd's** — every package
outside `apps/`; build **against `@bunyan/document`, never the kernel** — D19 is
enforced by `d19-boundary.test.ts`, and **`apps/web/src/bootstrap.ts` is the one allowed `KernelClient`
holder**.

**Loop:**

1. **`git pull`**, then confirm the state matches §2 `FRESH` — **by the newest Entry in
   `current_state.md`, not by the commit hash.** (A hash written here can only ever name an EARLIER
   commit than the one carrying it, so a literal hash match is a check that cannot pass.)
2. **Read `current_state.md` in full and obey it.** It is the handoff log and carries everything else:
   reading order (§0), the method that has found every gap (§1b) + the traps not to rediscover (§1c),
   contract status (§2), what exists and how it was verified (§3), decisions (§4), priorities (§5),
   environment + commands (§6).
3. Do §2 **`TASK`**.
4. **`pnpm verify` — and read the REAL exit code** (it includes `apps/web`'s typecheck). `format:check`
   runs before the tests and failed silently **six sessions running** (Entries 60–65); it has been GREEN
   since your own Entry 67, and the reason is procedural: **`prettier --write` every touched file BEFORE
   `verify`.** ⚠ Read the real exit code anyway — Entry 68 was formatted first and still exited 1 on lint.
5. **Hand off:** append an Entry to `current_state.md` (_what changed · how verified · on which
   engine/environment · what is owed next_) and **rewrite §2 of both `Amer_Prompt.md` and
   `Zayd_Prompt.md`.** A session that does not leave the next one ready is unfinished.
   ⚠ **When you rewrite `FRESH`, name the ENTRY NUMBER you just wrote — never a commit hash.** A hash
   here can only name an earlier commit than the one carrying it (see `FRESH` itself), so pinning one
   re-creates a check that cannot pass. This has been fixed once; do not undo it.

**Standing constraints — do not re-derive, do not renegotiate:**

- **Owner-gated: commits, pushes, contract changes, and the P5 freeze.** Propose and surface; never perform.
  ⚠ This is a FINISH state, not a wait: verify, write the Entry, rewrite both §2s, leave the tree
  uncommitted, and **say so in your closing summary**. Do not idle asking permission to commit.
- **Do not stall on the owner.** `TASK` is always one definite thing you can start alone. When it is
  design-first, the DESIGN DOC IS THE DELIVERABLE — write it, put its open questions to the owner, and
  stop there. Never open a session by asking which track to take; §2 has already chosen.
- **Additive only until the owner freezes:** app-layer work sits below every frozen contract and should
  stay there. If a browser need seems to require a `scene.json`/protocol/verb change, **stop and escalate**
  — that is a contract change, not a UI change.
- **A fix without a test that fails in its absence is an assertion.** Test-first, then revert-verify.
- **Verification split (the standing rule for browser work):** GL-only code is **browser-verified**
  (measured numbers, a console-error-free boot); everything with logic in it is **headless-verified** in
  the suite. The Browser pane cannot screenshot a continuously-animating WebGL canvas — measure through
  the DOM/`window` path instead of claiming a picture.
- **Measure, don't assert.** Every scale claim this project trusts came with a before/after number.
- **Architecture is binding (`architecture.md`).** Layering is protocol → kernel-core → kernel-client →
  document → app; **`DocumentContext` is the only door (D19)**; an element **is its ordered PARTS (D30)** —
  tessellate each, and keep each individually addressable. A new capability is an **additive registration**
  (domain rule 5), never a core edit. Anything **contract-shaping or rewrite-sized is design-first**: write
  the `*_design.md`, get the owner's ruling on its open questions, then build (the Entry-63 batching
  rewrite is the worked example). Ordinary features and fixes are not — build → verify → Entry.
- **§5's ✅ CLOSED list is binding** — do not redo anything on it.
- **Env (local PC):** `pnpm install` · **`pnpm --filter @bunyan/web dev`** (Vite, the app) ·
  `pnpm --filter @bunyan/web build` · **`pnpm verify` at the repo root = the CI step list, exactly**
  (typecheck incl. `apps/web` + lint + format:check + test + reseed:check). ⚠ `current_state.md` §6 is
  the DEV BOX's environment, not yours — the `corepack` shim and the OCCT rebuild recipe there are Zayd's.
- **Standing API facts that have bitten before:** `planDelete()` is gone (use `dryRun`); `discipline` lives
  on the part; ids are opaque ULIDs (never parse or render them — use `element.name`); `mass` may be
  absent (render "—", never "0 kg"); on save persist
  `saveBnn(scene, { journal: doc.changeFeed(), revision: doc.revision })` — `doc.history()` there is the
  moat-losing bug, and as of Entry 64 it is refused rather than silently written.

---

## §2 — DYNAMIC (the only part that changes; rewritten each session)

```
FRESH:  Newest Entry = **YOUR OWN ENTRY 70** (the P4.5 tool layer: the snap seam, the tool state
        machine, numeric entry, hover, multi-select; domain rule 19 adopted; 578 green, all five
        gates 0). Zayd's Entry 69 (the plan/section design) is the newest of HIS.

        ⚠⚠ ENTRY 70 IS NOT IN `current_state.md` — IT IS IN **`amer_entry_70.md`**, ON PURPOSE.
        The owner ran both agents IN PARALLEL on 2026-07-30 rather than taking turns, and two
        agents appending to §7 in the same window conflict in the one file that exists to be the
        shared truth. **The owner moves it into §7 (after Zayd's) once Zayd has pushed, and
        deletes that file.** ⇒ **If `current_state.md`'s newest Entry is still 69, that is
        EXPECTED, not a sign you are behind — check `amer_entry_70.md` first.** For the same
        reason `Zayd_Prompt.md` §2 was NOT rewritten; the text for it is at the bottom of
        `amer_entry_70.md`.

        ⚠ Entry 70 is UNCOMMITTED on branch `amer/p4.5-interaction-model` (commits are
        owner-gated) unless the owner has since landed it. `git pull` first regardless; if
        Zayd has pushed again, read every Entry after 69 before starting.

        ⚠⚠ THIS LINE NEVER PINS A COMMIT HASH, AND CANNOT. A commit's SHA is a hash of its own
        content, so any hash written in this file can only ever name an EARLIER commit than the
        one carrying it — and doc-sync / "record the push" commits land on top afterwards. A
        hash match is therefore a check that CANNOT PASS. **The Entry number is the check**: it
        is written by hand, it moves only when real work lands, and it is the thing you actually
        need to know. (Git already answers "what is the tip?" — `git log -1`. This file answers
        "am I behind?", which git cannot.)

TASK:   **P4.5 CONTINUES — THE SPINE IS BUILT AND TWO EXIT CRITERIA ARE BLOCKED ON ZAYD.**
        Q1–Q6 are ALL RULED (2026-07-30) and applied into `P4.5_interaction_model_design.md` §12.
        Do not re-open them, and do not re-ask which track.

        ⇒ DO THIS, IN THIS ORDER — both need NO ruling and NO other agent:
          1. **THE OPENING TOOL.** Exit criterion 3 (*a window is placed by CLICKING A FACE and no
             human types a derivation token*) is ONE TOOL AWAY: `SnapHit.ref` already carries the
             `SubShapeRef` and `SnapHit.hostElementId` the element, so the tool is a two-input
             registry entry committing `core.createElement` with `{hostId, hostRef}`. Model it on
             `WALL_TOOL` in `tool/tools.ts`; the face-snap candidate is the piece to add to
             `tool/snap.ts` (today it yields edge endpoints/midpoints + grid, not face hits — the
             pick path already resolves faces, so it is the same substrate again).
          2. **ALIGNMENT GUIDES** (design §4.3) — dashed overlay when the cursor lines up with a
             live reference point. Pure `PreviewLayer` geometry over Tier-1 candidates; no model
             state, no contract.

        ⚠⚠ DO NOT START THESE TWO, AND DO NOT FAKE THEM — THEY ARE `packages/document`-GATED:
          ⓑ  **the move tool + gizmo** need `core.setPlacement`/`move`/`rotate`/`copy`/`array`.
             The SHAPES are owner-ruled (design §9's table) but the VERBS DO NOT EXIST, and a new
             verb is a contract change you must escalate, never perform.
          ⓘ  **the corner-drag** needs `UndoableEdit.transactionId` to have a READER. Measured in
             Entry 70: it has ZERO (declared `undo.ts:109`, one comment `document.ts:802`), so
             three `setParams` today = three undos however you label them. Entry 70 deliberately
             did not ship a gesture that LOOKS transactional and undoes in three steps; do not
             undo that judgement.
        ⚠ Entry 45's freeze-SAFE judgement STANDS — neither blocks the freeze and you must not
          claim it does. They are worth nothing after the freeze; that is why they are recorded.

        ⚠ ONE THING TO KNOW FROM ZAYD'S ENTRY 69, WITH NOTHING OWED NOW: when the plan/section
        body lands it produces a `ViewResult` of **2D polylines carrying sub-shape identity** — a
        new KIND of thing for `apps/web` to draw (today the viewport draws meshes + edges). Later,
        additive, browser-track. Named so it is not a surprise; do not let it displace P4.5.

        Not this session (deferred, so nobody re-derives): material appearance + transparency ·
        WebGPU + WebGL2 fallback · a File System Access `StorageAdapter` · TSL shading · service
        worker/PWA + Cloudflare deploy · the optional `codecFor` open/save wiring (D71). ⚠ A
        schedules UI is STILL not this session's work — but note the reason CHANGED in Entry 68:
        it is no longer "nobody can author one" (the CRUD now exists and the generated ribbon
        already exposes it). It is simply not your task while P4.5 is; when it is picked up, the
        read path is `doc.evaluateSchedule` and the write path is the three verbs, both through
        the one door.

NEW:    (From your own Entry 70 — three facts about the app that are now true and were not:)
        (0a) **The app registers the REAL `@bunyan/types` now** (`core.wall` the D52 baseline,
             `core.opening`, the curtain-wall four). The scaffold `core.wall.v1` is still
             registered but relabelled "Wall (legacy v1 scaffold)" so pre-Entry-70 saved
             documents still build (D43). Author new walls as `core.wall`.
        (0b) **`apps/web/src/tool/` is the tool layer** — `snap.ts` (Tier 1, PURE, projection
             injected) · `QueryGateway.ts` (Tier 2, read-only, four ops as explicit overloads =
             the allowlist) · `toolMachine.ts` + `tools.ts` · `numeric.ts` · `useToolController.ts`.
             Domain rule 19 governs it: a tool collects input, only a command changes the model.
        (0c) ⚠ **React BATCHES, and a handler that closes over state WILL read a stale value** —
             this cost a real bug (typing `5000` produced `0`). In `useToolController`, decisions
             read a REF and writes go through `putSession`/`putNumeric`. Keep that discipline in
             any new tool.
        (Standing, from Entry 64 — two call sites you own, both deliberately loud, nothing to do
        unless you touch open/save wiring:)
        (1) `saveBnn` THROWS if handed `doc.history()` as the journal alongside a revision. The
            app already passes `changeFeed()` — do not "fix" it back.
        (2) `BNN_CODEC.write` now requires its `SaveOptions` instead of inventing
            `{kernelBuildId:'unknown'}`. Relevant only when you wire open/save through `codecFor`.
        (From Entry 65 — for whenever a schedule UI eventually lands, still not now:)
            `doc.evaluateSchedule(def, options?)` returns rows/groups/totals/unmeasured. A cell's
            `value` is ABSENT (not 0) when unmeasurable; `unknown: true` distinguishes "could not
            measure" from "nothing to measure" (render "N/A" vs "—", never "0"); every numeric
            cell carries its own native `unit` (mm/mm²/mm³/kg) — do NOT convert in two places.
        If an owner ruling arrives in chat, apply it AND record it in the doc it belongs to — this
        file is not where decisions live.
```
