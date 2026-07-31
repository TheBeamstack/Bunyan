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
FRESH:  Newest Entry in `current_state.md` = **ENTRY 72** (Zayd — THE FIVE MOVE VERBS +
        `transactionId` ATOMICITY, P4.5 rows ⓑ/ⓘ, D80; **613 green, all five gates 0**). Entry 71
        (Zayd) is the D29 geometry-cache bodies; **YOUR ENTRY 70** (the P4.5 tool layer) is the one
        before that, committed and pushed.

        ⚠⚠ **THIS IS THE ENTRY YOU HAVE BEEN WAITING FOR — BOTH OF YOUR BLOCKED EXIT CRITERIA ARE
        OPEN.** The five ruled verbs exist (`core.setPlacement`/`move`/`rotate`/`copy` live;
        `core.array` is a registered shape that REFUSES, body in v1.0.x) and
        `UndoableEdit.transactionId` finally has a READER: pass
        `doc.execute(id, args, { transactionId })` and **one `Ctrl+Z` reverses the whole gesture**,
        staged and committed as ONE all-or-nothing unit.

        ⚠⚠⚠ **BUT READ THIS BEFORE YOU BUILD THE GIZMO, BECAUSE THE SPLIT IS NOW ENFORCED AND IT IS
        THE OPPOSITE OF THE INTUITION.** Zayd measured that **all three shipped Types position
        themselves from PARAMS** — `core.wall` `{start,end}`, `core.opening` `{offsetU,offsetV}`,
        `core.curtainwall` `{origin}` — and that **a hosted element's own `placement` is never read
        by the engine at all** (a door given a 1000 mm placement builds its leaf at byte-identical
        bounds). So:
          • dragging a WALL  = `core.setParams` with BOTH endpoints moved (one end = one endpoint)
          • dragging a DOOR  = `core.setParams` on `offsetU`
          • `core.move`/`setPlacement`/`rotate` REFUSE both, with a typed message naming the road
            that works — they are for GenericSolid-shaped elements and placed families.
        *That is not a gap and not a bug; it is the owner-ruled split, now enforced instead of
        merely documented, because the unguarded version SUCCEEDS while moving nothing.*

        ⚠ Zayd's Entry 72 is `packages/document` only — no kernel, no WASM rebuild, no frozen byte.
        Entry 71 DID rebuild the committed WASM artifact (+12,631 B), so **`git pull` before any
        browser work** if you have not since.

        ⚠⚠ THIS LINE NEVER PINS A COMMIT HASH, AND CANNOT — a commit's SHA is a hash of its own
        content, so any hash here can only name an EARLIER commit than the one carrying it, and a
        hash match is a check that cannot pass. **The Entry number is the check.**

        ⇒ After `git pull`: newest Entry = 72 ⇒ you are current, start TASK.
          Newest Entry HIGHER than 72 ⇒ read every Entry after 72 before starting.

TASK:   **CLOSE P4.5 — THE MOVE TOOL + THE CORNER-DRAG, THEN THE OPENING TOOL.** Q1–Q6 are ALL
        RULED (2026-07-30) and applied into `P4.5_interaction_model_design.md` §12. Do not re-open
        them, and do not re-ask which track.

        ⇒ DO THIS, IN THIS ORDER — nothing here needs a ruling or another agent:
          1. **THE MOVE TOOL + GIZMO (exit criterion 4, row ⓑ).** The verbs exist as of Entry 72.
             ⚠ **The empirical half of row ⓑ is YOURS and it is the reason the row exists:** the
             plan asked for these arg shapes to be *driven with a real pointing device before they
             freeze*, and that can now happen. Drive them, and **say in your entry whether the arg
             shapes are what a pointing device actually needs** — if they are not, that is a
             pre-freeze correction and it is cheap only now.
             ⚠ The guard will REFUSE a wall and a door (see FRESH). Your gizmo therefore dispatches
             `core.setParams` for those and `core.move`/`rotate` for placement-positioned elements —
             and the refusal is typed (`REFUSED`) with an actionable message, so surface it rather
             than swallowing it.
          2. **THE CORNER-DRAG (exit criterion 4's other half, row ⓘ).** Three walls meeting at a
             point drag as ONE gesture: dispatch each `core.setParams` with the SAME
             `{ transactionId }` and one `Ctrl+Z` reverses all three. ⚠ Grouping is CONSECUTIVE —
             do not interleave another command inside a gesture.
          3. **THE OPENING TOOL.** Exit criterion 3 (*a window is placed by CLICKING A FACE and no
             human types a derivation token*) is ONE TOOL AWAY: `SnapHit.ref` already carries the
             `SubShapeRef` and `SnapHit.hostElementId` the element, so the tool is a two-input
             registry entry committing `core.createElement` with `{hostId, hostRef}`. Model it on
             `WALL_TOOL` in `tool/tools.ts`; the face-snap candidate is the piece to add to
             `tool/snap.ts` (today it yields edge endpoints/midpoints + grid, not face hits — the
             pick path already resolves faces, so it is the same substrate again).
          4. **ALIGNMENT GUIDES** (design §4.3) — dashed overlay when the cursor lines up with a
             live reference point. Pure `PreviewLayer` geometry over Tier-1 candidates; no model
             state, no contract.

        ⚠ `core.array` REFUSES by design (a reserved shape whose body is v1.0.x, owner-ruled) — do
          not put it in the ribbon and do not build an array tool on it.
        ⚠ Entry 45's freeze-SAFE judgement STANDS — rows ⓑ/ⓘ never blocked the freeze and you must
          not claim they did.

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

NEW:    (From Zayd's Entry 72 — the two seams you now call, and one rule about them:)
        (0z) **`doc.execute(commandId, args, { transactionId })`** groups consecutive edits into one
             undo/redo unit. The id is opaque and never parsed — a gesture counter is fine. It lives
             on the EXECUTOR's options beside `dryRun`, never on the command, so a tool opts in and
             a command knows nothing about it. `window.bunyan.execute` takes the same option (D19 —
             an agent gets every capability the UI has).
        (0y) **The move verbs refuse where the recipe owns the position** — hosted, a D52 baseline
             wall, or datum-constrained (per-axis: a Level-constrained element may still be slid
             sideways, a grid-constrained one may still be raised). `CommandFailure.code` is
             `REFUSED` and the message names the verb to use instead. **Show it; do not swallow it.**
        (From your own Entry 70 — three facts about the app that are now true and were not:)
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
