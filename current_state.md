# Bunyan — `current_state.md`

**What this file is.** The **cross-session, cross-agent, cross-machine handoff log** for Bunyan. It
lives in the repo and travels with the code between the local PC (Amer) and the Hetzner dev box
(Zayd), per `cross_projects_policy.md` §9.

**Why it exists.** So the next agent does **not** re-derive context, does **not** make false
assumptions about what is built, and does **not** redo verified work. If you are a fresh session:
read §0 → §1 → §2 → §3's traps → §5, then work.

**⚠⚠ ITS COMPANION: `history.md` — THE COMPLETE ENTRY REGISTRY, AND WHERE TO GO WHEN YOU ARE STUCK.**
This file's §7 keeps only the **newest 15 entries**, in full. Every older entry is in **`history.md`**,
summarized — entry 1 to today, with its measurements and its rulings. **If you lack a piece of context,
or something here assumes a decision you cannot place — read `history.md` before re-deriving it or
asking the owner.** It answers *"why is this shaped this way?"*, *"has this already been tried?"* and
*"what did that D-number cost to learn?"*. (The uncompressed narrative of every entry is in git history.)

**How to use it.**
- **Read** §0–§5 and the newest Entry before touching anything. Reach for **`history.md`** the moment
  you are missing something older.
- **Append** a new Entry when you finish a meaningful unit of work. Never rewrite history — but
  **do compress it: whenever §7 holds MORE THAN 20 entries, keep the newest 15 here and summarize the
  rest into `history.md`** (the procedure is in that file's header — including the check that a dropped
  entry's durable lessons are already promoted into §1–§5, which is what makes compressing it safe).
  **That compaction is maintenance and does NOT get an entry of its own.**
- **Record who validated what, and on which engine/environment.** A claim without a verification
  method is not done.
- Keep §2 (contract status), §3 (what exists) and §4 (decisions) **current** — those are the three
  things a new agent gets wrong most easily. ⚠ **They are also why compression is safe: a rule binds
  because it is in §1–§5, never because an old entry mentioned it.**

---

## §0 — Orientation (read this first)

**What Bunyan is:** a browser-native, serverless, parametric BIM/CAD authoring platform. An exact
B-Rep kernel (OpenCascade/OCCT compiled to WebAssembly) computes geometry; the design is stored as a
*parametric recipe*, and meshes/2D views are disposable projections of it.

**Document reading order** (repo root; they are the contract, this file is the status):
**1.** `core_logic.md` — the domain model. *What the app means.* · **2.** `architecture.md` — layers,
worker protocol, registries. *How it is built.* · **3.** `V1.0.0_spec.md` — scope, decisions **D1–D39**.
*What ships first.* · **4.** `v1.0.0_imp_plan.md` — the phases, exit criteria, and **THE FREEZE GATE**
(the authoritative pre-freeze checklist at the head of P5) + **"NEXT AGENT — START HERE."**

**⚠ AND `history.md` — NOT in the reading order, because it is a REFERENCE, not a briefing.** It is the
complete entry registry (every session, summarized; this file's §7 keeps only the newest 15). **Open it
when you are stuck or missing older context** — not at the start of every session.

**5. `Miqdar_v1.0.0_spec.md`** (+ `Miqdar_normative_register.md`) — **the second product**, and **NOT
optional reading before a contract freeze** (§4g). ⚠ **It lives here for exactly one reason: Bunyan's
contract freezes must not foreclose it.** **P5 has a gate pointing at its §3.4.** It is **not** a Bunyan
work item — Miqdar starts only after **Bunyan v1.0.0** ships.

**Design docs** (the design-first record for step 0): `P5_step0b_design.md` (associativity/constraints),
`P5_step0e_design.md` (CRUD + guard), `P5_step0g_design.md` (reserve-the-shapes + Space extent),
**`P5_step0d_design.md` (the sketch solver — ✅ BUILT + green, Entry 40).** Reviews:
`review_P3.md`, `review_P4.md`, **`review_P5.md` (the pre-freeze review, Entry 43).** `P3_correction_plan.md` is fully executed.

⚠ **Version strings: always "Bunyan v1.0.0" or "Miqdar v1.0.0" — never a bare "v1.0.0."** Two
independently-versioned products both have one. *(Miqdar M17.)*

**The one non-negotiable invariant:** B-Rep is the source of truth; the parametric recipe is the source
of truth for the B-Rep; meshes and 2D views are disposable. Everything else follows from it.

**The hardest idea (and the schedule risk):** persistent sub-shape naming (D1). Sub-shape identity is
*derived* from the operation DAG — a `SubShapeRef` is a derivation path (`nodeId` + `role` +
`occurrence`), **never a geometric index.** It is assigned when an op runs and propagated forward, never
recovered by matching geometry afterwards.

**Actors** (spec §12) — roles are by *environment*, not seniority:

| Actor | Where | Owns |
|---|---|---|
| **Architect** (the owner/human) | — | Contracts, scope, AEC correctness, merge arbitration. **All contract changes and all commits/pushes are owner-gated.** |
| **Amer** (agent) | Local PC, **real browser** | Browser hot path: three.js/WebGPU, tessellation consumer + picking, React shell, ribbon/property panels, persistence adapters, service worker/PWA, `window.bunyan` wiring. |
| **Zayd** (agent) | Hetzner dev box, **headless** | Kernel: OCCT WASM builds, worker API, naming resolver, regression harness + offline golden seeding, IFC importer, CI, release pipeline. **And (Entry 18) the document model — `@bunyan/document`.** |

Also read the box-local `../cross_projects_policy.md` and `../last_session_work.md` **if you are on
the dev box** (they are not in this repo and do not travel).

---

## §0a — DISTANCE TO FREEZE ≠ DISTANCE TO REVIT (read this before you feel "almost done") *(2026-07-21 strategic review)*

**The freeze checklist being ~closed says NOTHING about competitiveness with Revit. They are different axes, years apart, and the docs used to conflate them.** A fresh agent reads "step 0 closed, gates discharged, ready to freeze" and absorbs "nearly a Revit competitor." That is the exact failure mode of §1's own history ("P2 declared done twice", "the whole modelling layer was missing") — *measuring against the checklist, never against the ambition.*

**Ground truth (verified by build, not prose — 2026-07-21):** the shipped product is **two element types** (`@bunyan/types`: `core.wall`, `core.opening`) on an exact kernel. What is genuinely excellent — the exact-B-Rep + persistent-naming + parametric-recipe core, the agent-native single command layer, the stable-PEI ecosystem substrate — is *the hard, rare part most Revit challengers never finish*, which is why it comes first. **But it is a foundation, not a Revit competitor.** What Bunyan is NOT yet: a documentation tool (Revit's actual product — one plan/section/schedule ships in v1.0.0, the rest is the largest parity item, D58), multi-user (D60), MEP (D62), families-by-users (D61), DWG-interoperable (D63); its 10k-element target is unproven on 3 of 4 axes (D66); and its taxonomy is almost entirely unbuilt (`core_logic.md` §9a).

**⇒ THE STANDING METHOD (added to §1b): measure the product against the Revit-parity ledger (`v1.0.0_imp_plan.md` "Road to Revit parity"), NOT against the phase's exit criteria.** The owner validated D58–D66 to make this measurable and to reserve the contracts these capabilities need before the freeze. *The distance to Revit is not what the momentum in these docs makes it feel like — and the freeze is the moment to reserve for it, because after it every gap is a three-product amendment.*

---

## §1 — Where the build is right now

**Phases P1–P3 CLOSED; the kernel protocol is FROZEN (18→now 19 live ops + 5 reserved).** P4 + P4.5
(the interaction model) and P5 (types) are the open work. **THE PROJECT IS IN THE PRE-FREEZE WINDOW:**
`SubShapeRef` / `BimObjectType` / `Command` / `scene.json` / `ParamSchema` / `UndoableEdit` are
**release-candidate** and freeze at **P5 step 6**. That freeze is the one irreversible act — after it a
wrong contract costs an amendment across three products (`.bnn` in the field, Miqdar, Planitor).

**P5 STEP 0 (the D50 constraint model — the largest scope ruling this project made) is COMPLETE.** Done and
green: **0a** typed dependency graph · **0b** associativity/hosting (datums, base/top constraints,
grid-hosting) · **0e/0f** the missing CRUD + the generalised no-silent-re-identify guard · **0g** the
reserve-the-shapes pass + the verb half · **0d** the sketch constraint solver (real planegcs, D26
revert-verified — Entry 40) · **the room-bounding solver** (D55 — Entry 41) · **0c wall-to-wall joins**
(auto-miter, anti-fuse gate green, the real D52 Wall in `@bunyan/types` — Entry 42). The types (steps 4–5)
+ the MVP-checklist gates are also done (ⓙ door-leaf, ⑥ Clean Delta, #4/⑧/⑨ — Entries 44–45).
**⚠⚠ REMAINING — AND THE FREEZE IS REOPENED (Entry 46):** the 2026-07-21 strategic review (the "will it beat
Revit, ecosystem built?" lens) added **pre-freeze rows Ⓐ–Ⓕ + the D66 scale measurement** (see §5 + imp_plan
"🟠 REOPENED"). These land **before** the FREEZE (step 6). The MVP checklist was closed; the parity/foreclosure
lens was not. See `v1.0.0_imp_plan.md` FREEZE GATE (🟠 REOPENED) + §0a + Entry 46.

> **⚠⚠ THE P4 REVIEW HEADLINE (Entry 24) — STILL THE FRAME:** there was **no interaction model in any
> contract document** — only *"button/drag → Command"*, which is how an action *reaches* the model, not
> how a human *authors a building.* `snap`/`inference`/`preview`/`hover`/`gizmo`/`tool state` appear
> nowhere. **`argsSchema` is a machine-readable contract for an AGENT; the app used it as a UI spec for a
> HUMAN.** ⇒ new phase **P4.5** (the tool state machine, snapping, preview, numeric entry, the
> spatial-query seam) lands **before** the freeze. And the second sweep (Entry 24b) found the deeper one:
> **Bunyan had exactly ONE associative relationship (`opening → host face`); everything else was
> absolute** — a Level could not be moved, a Grid hosted nothing, no command moved an element. **D50 moved
> the full constraint model into v1.0.0.**

### §1a — THE SCALE NUMBERS (D48: the interactive target is 10,000+ elements, BINDING)

Measured against the real OCCT WASM (`review_P4.md` §4; a 5-storey building). **Read the columns:** the
kernel **rebuild is FLAT** (always one wall); the **redraw grows LINEARLY with the whole model** because
`App.tsx` re-tessellates every part of every element on every edit (~2.8 ms/solid).

```
                              rebuild 1 wall   REDRAW ALL (as built)   redraw only changed wall
  195 elements / 310 solids        100 ms              865 ms                    12.0 ms
```

**Extrapolated to ~16,000 solids:** one edit ~45 s · cold load ~6.3 min · draw calls ~16,000 (10–20× a
60 fps budget). ✅ **The one contract-bearing axis — WASM heap — is MEASURED and FITS (Entry 29):**
~16.2 KB/live-solid, dead-linear ⇒ ~0.3 GB at target, inside a tab. **⇒ heap-eviction / lazy-build stays
a v1.0.x OPTION, not a v1.0.0 requirement; it does not force a pre-freeze contract change.** The other
three axes (draw calls, cold load, edit latency) are **all in the renderer — Amer's, in the browser.**

> **⚠⚠ THE STRATEGIC FINDING:** all three kernel performance levers (D29 BREP cache, `instantiate`,
> multithreading) attack the **kernel rebuild**. **NOT ONE touches the redraw**, which is the dominant
> interactive cost — and it was invisible because **every measurement this project ever took was taken
> BELOW the renderer.** (Amer's incremental-redraw work in Entries 26–27 addresses it browser-side.)

> **⚠⚠ STRONGER CORRECTION (Entry 46, 2026-07-21 review — D66): "the one contract-bearing axis is measured and
> it FITS ⇒ scale is settled" is a measurement scoped to ITS input (the §2 trap turned on ourselves). Only ONE
> of the four scale axes (WASM heap) was measured; the other three — edit latency (~45 s/edit extrapolated),
> cold load (~6.3 min), draw calls (~16k, 10–20× a 60 fps budget) — extrapolate the WRONG way at target, and the
> O(N²) join scan below adds ~100 s on the REBUILD side. "It's all in the renderer / scale is settled" is false.**
> **✅ THE JOIN HALF IS RETIRED (Entry 61, D73, 2026-07-27), measured on both sides:** the scan is now an O(N) spatial
> index — **4757.7 ms → 27.2 ms at 1984 walls**, and at the 10k target **169 ms with per-wall cost FLAT at 14–17 µs**.
> The ~100 s (in fact ~3.5 min once Entry 60's mid-span scan joined it) is gone. ⚠ The other three axes are unaffected:
> this was always a REBUILD-side cost, and Entry 55's renderer-batching wall still stands.**
> **The 4-axis measurement is now a BINDING PRE-FREEZE deliverable (D66)** because heap-eviction "touches contracts,
> must be known before P5 freezes" and a failed single-threaded target reopens D8 (multithreading). ⚠ Renderer
> batching + heap eviction are, by the plan's own words, "a rewrite not an optimisation" if found late.
>
> **⚠ CORRECTION (Entry 43, `review_P5.md` finding #3): "the other three axes are ALL in the renderer" is
> no longer true.** 0c joins (Entry 42) added a NEW cost to the **rebuild path** (Zayd's layer): the
> wall-join resolver is **O(N²)** in element count — `partnersAt`/`wallsJoinedTo` scan every element, and
> `resolveJoins` runs per element in the build (`build.ts:404`), even when nothing joins. **Measured** (pure
> TS, no kernel): ~97 µs/wall at 40 walls → 2113 µs/wall at 1984 walls (**4.2 s of join scan alone at
> ~2000 walls**; quadratic). Negligible at a house's few-hundred walls; ~100 s at the 10k BINDING target,
> on top of the kernel. **NOT a freeze item** — fixable anytime with an endpoint spatial hash, no contract
> change — so it is a **v1.0.x perf item**, but the D48 "scale is settled / it's all Amer's" narrative must
> account for it. ⚠ **Re-run the D29 5-storey measurement WITH joins in the path** — the headline number
> above predates them.

### §1b — THE METHOD THAT HAS FOUND EVERY GAP — it is not reading; it is USING the API

**Keep modelling real buildings against the real kernel, and measure.** It has found **eleven** gaps; no
other method ever has. A written finding describes only the shape someone actually cut.

| Gap | Found by |
|---|---|
| `at` (placement) | a boolean could otherwise only bite a *corner* off a wall |
| the split-face naming bug | cutting a **groove** across a wall |
| `extrude` / `chamfer` | trying to model a **floor plate** (a Slab is not a rectangle) |
| the SYMMETRIC-TIE hole (D28) | cutting a duct through a **round column** — five sessions missed it; every boolean tested had cut a BOX |
| our `bounds` LOOSE on curves | gating that column vs the native-OCCT oracle (`Add` bounds a spline by its control polygon) |
| the modelling layer (D30–D33) | reading the product **against its own ambition** |
| the ecosystem joint (D34–D38) | reading the product **against its neighbours** (Planitor, BIMsync) |
| the STYLE-EDIT PERF CLIFF (§4j) | building a real 195-element building and **timing** it |
| the six P3 defects (Entry 19) | driving the document API at its **FAILURE** boundaries — every happy path was already green |
| the `BuildContext` HEAP-LEAK (Entry 21) | writing the first fixture that ran **two** kernel ops per part |
| the VOID INWARD-DIRECTION gap (Entry 28) | cutting a duct through a **beam** (a void had only ever been cut on a wall's `y-min` face) |
| the CURVED-FACE HOSTING gap (Entry 30) | a duct through a **round column** — every void before had been on a planar axis-aligned face |

**⇒ Keep cutting shapes nobody has cut** — now aimed at the shapes D50 introduces (grid-hosted columns,
base/top walls, joins, a Space). The kernel-level gaps are nearly mined out; the next foreclosure is
likelier in a **type's contract** than in the kernel.

**⚠ AND THE SECOND METHOD (Entry 19):** a green test proves only what it ASSERTS — and two of P3's
asserted something weaker than their own title (the rule-4 test failed in the *schema*, before the kernel
ran; the autosave test never opened a second session). ⇒ **For every exit criterion, read the test that
discharges it and ask what it would take for that test to pass while the criterion is FALSE.** And the
standing rule since Entry 21: **a fix without a test that fails in its absence is an assertion** —
revert every fix and watch its test fail.

**⚠ THE THIRD (Entry 21):** when a decision is framed as a trade-off, check what it costs the
**INVARIANT**, not just the schedule. "Ship the BREP cache" read as a perf call; it dragged in a
persisted name→shape index — the "token map" D1 forbids. The perf question was an afternoon; the identity
question it hid could have repealed D1.

### §1c — EIGHT THINGS A FRESH AGENT MUST NOT REDISCOVER THE HARD WAY

1. **`opencascade.js` CANNOT be linked on this box — and we do not use it.** Its `-flto` whole-program
   link OOMs at a 2 GB cap even for a 6-symbol build (Entry 3). Do not retry it. We build **upstream OCCT
   7.9.3, LTO off** — recipe in `tools/kernel-build/`; it builds here.
2. **`/tmp` is a tmpfs — it costs RAM, not disk.** Before invoking §6a to pause another project's
   containers, run `du -sh /tmp` — our own scratchpads are usually the hog.
3. **You do NOT need a 2.5 h rebuild to change the kernel's C++.** OCCT's static libs are prebuilt at
   `~/occt-wasm-spike/install`. Changing `src/kernel.cpp` is a **~60 s single-file compile + link** (§6).
   Only an *OCCT version bump* costs 2.5 h.
4. **OCCT's `Left/Right/Front/Back` do NOT mean what they sound like.** `BackFace()`=x-min,
   `FrontFace()`=x-max, `LeftFace()`=y-min, `RightFace()`=y-max. Guessing mislabels four faces and
   nothing fails (geometry perfect, names wrong). `occt-kernel.test.ts` re-measures it.
5. **The naming literature is WRONG about OCCT 7.9.3, and we MEASURED it (D24).** Boolean history is
   complete (zero orphans); the weak spot is the fillet; and `Modified()` reports only *splits*, so an
   untouched face appears in **no** history list — that silence means *"unchanged"*, not *"unknown"*.
   Re-run the probe (`tools/kernel-build/probe.cpp`, ~60 s) before trusting naming on a new shape class.
6. **⚠⚠ THE PROBE ONLY MEASURES THE SHAPES YOU THINK TO CUT — this has cost us repeatedly.** Even a
   measured, written-down finding describes only the shape someone actually cut. Before trusting naming on
   a shape class nobody has cut, **cut it.**
7. **⚠⚠ A PHASE'S EXIT CRITERIA ARE A SPECIFICATION, NOT A SUMMARY OF WHAT GOT DONE.** `extrude`/`chamfer`
   sat unbuilt in P2's step list while P2 was declared "complete" twice, because every test built walls
   out of boxes. **Read a phase's own step list against the code before declaring it done.**
8. **⚠⚠ A NEW RULE BINDS THE NEXT CONSUMER AND NOTHING ELSE — SWEEP IT *BACKWARD* (Entry 59, D68).** The
   inverse of trap 7, and it cost two real defects. D65 wrote the design-option exclusion invariant *into
   the frozen contract* and D67 corrected its signature — both of which guarantee that code written
   **after** them obeys the rule, and do **nothing whatever** about code written before. The room solver
   and the join resolver both shipped 07-18; the rule landed 07-23; the sweep that fixed the other
   consumers (Entry 58) touched only the two that existed when the rule was written. **⇒ When you add a
   correctness rule to a mature codebase, enumerate every existing site that could violate it and check
   each one.** The mechanical form that worked: grep every iteration over the collection the rule governs,
   then ask of each *"does this aggregate or publish?"* — 14 sites, 12 correct, 2 silently wrong for eight
   days. **No rule in this project had ever been given that sweep.**

   **⚠⚠⚠ THE LEDGER AFTER ENTRY 64 — THE SWEEP IS COMPLETE: ALL EIGHTEEN RULES SWEPT, NINE DIRTY. Dirty: 1, 3, 4, 5, 8, 12, 14, 15, 16, 18 (+ the D68 option invariant) — counting 8 as a SURFACED foreclosure rather than a fix. Clean: 2, 6, 7, 9, 10, 11, 13, 17.** Entry 64 swept the last five (7, 8, 14, 17, 18): **14 and 18 dirty (D76, D77), 8 dirty-by-foreclosure and SURFACED, 7 and 17 clean.** ⚠⚠ **THE FINAL BASE RATE IS 1-IN-2, AND THE TWO NEW LESSONS ARE ABOUT *WHEN* A RULE ROTS:** **(a) rule 14 was dirty in its PRECONDITION, not its mechanism** — every asserted half (never trimmed, an undo appends a reversal, the delta is one filter) was sound *and tested*, while nothing checked that the log a consumer holds actually reaches the baseline it is read against; the failure was therefore not a wrong answer but **silence that reads as "nothing changed"**, which a green suite cannot see. *Ask of every rule not only "is the mechanism right?" but "what must be TRUE for the mechanism to be asked a meaningful question?"* **(b) rule 18 was dirty against the INVALIDATOR while clean against every consumer** — the Entry-59 sweep form (grep everything that iterates the collection, ask "does this aggregate or publish?") would have missed it, because the invalidator neither aggregates nor publishes: it decides *what is even rebuilt*. ⇒ **when a rule adds a new KIND of thing, sweep what quantifies over "every one of them", which includes the machinery, not only the readers.** ⚠ **AND RULE 7 IS THE FIRST RULE FOUND CLEAN WITH NO MECHANISM PROTECTING IT** (rules 9/10 were clean because a violation could not be written silently; rule 7 was clean because everyone remembered) — so it was given one, `tests/units-rule7.test.ts`, which fails on any numeric field that ships without a unit. *A clean rule with no enforcement is a dirty rule that has not happened yet.*

   **⚠⚠ THE LEDGER AFTER ENTRY 62: THIRTEEN RULES SWEPT, SEVEN DIRTY (1, 3, 4, 5, 12, 15, 16 + the D68 option invariant); CLEAN: 2, 6, 9, 10, 11, 13. STILL UNSWEPT: 7, 8, 14, 17, 18 — AND THE CORRELATION HAS NOW INVERTED ONCE, WHICH IS THE NEW LESSON.** Entry 62 swept **1, 3, 9, 10**: rules 1 and 3 were dirty **together** (D74 — a broken reference outlived the element it named, surviving even `rebuildAll` and every save), and rules **9 and 10 are the FIRST rules ever swept clean without needing a fix.** ⚠ **Why those two held is the transferable part, and it is not diligence:** rule 10 held because `validateParams` **refuses an undeclared arg**, so a drifted schema is a hard refusal rather than silence; rule 9 held because `dryRun` is one branch in the **executor** and `applyChanges(scene, edit.changes)` is the only way the scene moves — **a command cannot opt out of either, because a command never knew about them.** ⇒ **the rules that came back clean are the ones a violation could not have been written silently.** *When you write a rule down, ask what makes violating it LOUD; a rule enforced only by everyone remembering it has been dirty 6 times out of 8 here.* ⚠ **Rules 2, 4 and 11 were then swept in the same session (D75): 4 dirty — an unmeasurable element killed the whole take-off — while 2 and 11 came back clean, both by COUNTING (one positional ref read, and exactly two boolean call sites).** Still unswept: **7, 8, 14, 17, 18.**

   **⚠⚠ THE LEDGER, AFTER ENTRY 60 SWEPT THE REST: FOUR RULES SWEPT, THREE CAME BACK DIRTY.** This is no
   longer a lesson about design options — it is the base rate for *every* rule this codebase has written
   down. **Rule 5** (formats and views were decorative registrations — two of the four kinds rule 5 names
   had no behaviour and no dispatcher, and a closed freeze-gate row rested on one) · **rule 12** (the
   published Clean Delta keyed materials by display NAME while the internal roll-up keyed by id) ·
   **rule 16** (a T-junction double-counted: measured 2.8800 m³ where 2.8320 m³ is true) — all dirty.
   **⇒ FINAL LEDGER FOR THIS SESSION: SIX RULES SWEPT, FOUR DIRTY.** Rules **5, 12, 15, 16** + the D68
   option invariant were broken; **rules 6 and 13 came back clean** — *and both of them are clean by
   MEASUREMENT, not by reading*: rule 6 was tested by deleting the re-sort and rebuilding the kernel,
   rule 13 by a new suite that drives undo→redo/resize/re-issue/save→load against the real kernel. That
   correlation is the finding: **every rule verified only by reading has been dirty; every rule that was
   actually exercised came back clean or was fixed.** ⇒ **~30 min per rule, hit rate 2-in-3. Rules 1–4,
   7–11, 14, 17 and 18 have never been swept at all.**

   **⚠ AND THE SECOND FORM THE SWEEP TAKES, which is what found rule 5's: don't grep — COUNT.** Rule 5
   promises that four kinds of thing are additive registrations. Counting what is actually registered took
   one command and answered it: **51 types · 39 commands · 1 codec (inside a test) · 0 views.** *A rule
   that quantifies over a set is checked by enumerating the set, never by reading the code that implements
   one member of it.*

---

## §2 — Contract status (get this wrong and you break the build model)

The **split contract-freeze** (D13) is the rule that lets Amer and Zayd work in parallel: *adding* an op
is additive and permitted; *changing an existing op's envelope* needs Architect sign-off.

| Contract | Status | Freezes |
|---|---|---|
| **Kernel message protocol** (`@bunyan/protocol`) | **✅ FROZEN, v1 (Entry 21)** — **19 live ops + 5 RESERVED** + `CACHE_STALE`. ⚠ `faceFrame` is the FIRST post-freeze op (Entry 30) — a face's frame from the B-Rep surface, explicitly permitted (D13). Reserved: `sectionCut` · `importIfc` (P6) · `instantiate` (the ~21 s style-edit answer, §4j) · `exportBrep`+`importBrep` (the D29 cache — RULED SHIP, §4j). | **✅ FROZEN.** |
| **`SubShapeRef`** | RC — exercised by the real kernel + the document model (a window survives save→load→rebuild + a 30° rotation). ⚠ `kind:'vertex'` **reserved** (D54a, 0g). | **P5** |
| **`BimObjectType`** | **⚠⚠ D72 (Entry 60, 2026-07-27) RESERVED `BuiltPart.exposedRefs?` — the session's ONE contract change, and the only pre-freeze item it created. Optional + absent-defaulted (absent ⇒ the pre-Entry-60 whole-solid area), so no existing Type or saved document moves. It exists because *which faces a trade BILLS* is not derivable generically — only the Type knows — and without it the product cannot answer "what area do I bill?", which is not a question a BIM tool may decline. ✅ **EVERY SHIPPED TYPE NOW DECLARES (Entry 62): `core.wall`, `core.opening` (leaf + frame) and `core.curtainwall`'s panel/mullion/transom — under the owner's ONE rule, *exposed = every face that is a surface of the assembled thing*. `core.curtainwall.column` is a pure composite and owes nothing. ⚠ Building it found that `exposedRefs` reached only 3 of the 4 `BuiltPart → Part` sites — a door leaf could never have carried one (D74/Entry 62); when a member is added to `Part`, COUNT its construction sites, because only the `{...part}` spread one maintains itself.** The absent-defaulted fallback stays for any FUTURE Type that has not declared yet.** **✅ WRITTEN (Entry 18), corrected (21), extended.** Carries `parameterSchema`, `styleSchema`, `defaultClassification`, `defaultDiscipline` (D45), `buildGeometry→Part[]` (D30), `buildVoid`, `migrate`, and (0g) `ifcMapping?`/`migrateStyle?`. ⚠⚠ `BuildContext.discard(handle)` — a Type running two ops per part MUST declare its intermediate or it leaks; **declare BEFORE the risky op.** ⚠⚠ `VoidBuildContext.hostFace.inward` (Entry 28) + `.frame` (Entry 30, from `faceFrame`) — a hosted void projects along the host's honest inward normal (correct for curved faces too). `BuildContext` gained `grid()`/base+top datums (0b). ✅ **ⓙ RESOLVED (Entry 44): a hosted type provides BOTH `buildVoid` AND the new additive `buildLeaf?(VoidBuildContext)` — a door builds a leaf+frame, not just a hole; the real `core.opening` ships it. PROVEN no new `VoidBuildContext`/`BuiltPart`/`hostFace` field (a `tsc` TS2322 proof); `buildLeaf`, not `buildGeometry`, because a door is a solid only when hosted.** ✅ **D59 COMPOSITION (Entry 48): gained the additive `buildChildren?(ctx)=>BuiltChild[]` (a parent owns child ELEMENTS, rule 18 — the real `core.curtainwall` ships it, Model A = children DERIVED by PEI `${parentId}:${slot}`, never stored). `Element` gained reserved `childOverrides?`/`ChildOverride`; `parentElementId` RE-PINNED to the group/manual-nest meaning.** | **P5** (freeze against the composite Wall + the real Opening + the composite Curtain Wall — all now exist) |
| **`Command`** | **✅ WRITTEN (Entry 18)** — `argsSchema` + `execute` returns its `UndoableEdit`. **The agent API** (§4f). CRUD verbs carry the D51 refuse-or-retarget args (`acknowledge`/`retargetMap`, 0e/0f); `createElement` carries the six reserved-metadata args + `core.setElementMetadata` (0g.2). **0d BUILT `core.createSketchConstraint`/`core.deleteSketchConstraint`** (Entry 40; datum verbs and sketch verbs each refuse the other's ids). **0c BUILT `core.setJoin`/`core.clearJoin`** (Entry 42 — override verbs; joins are AUTOMATIC on proximity, these only deviate a corner to butt/mitre/none). | **P5** (with its `argsSchema`) |
| **`ElementStyle`/`Part`/`Material`/`Section`/spatial tree/`Constraint`/`scene.json`** | **✅ WRITTEN.** `scene.json` = `packages/document/src/scene.ts`. **0b:** `scene.constraints` (discriminated-union `Constraint`, `SCENE_SCHEMA_VERSION` 1→2). **0d (Entry 40):** `SketchConstraint` is the union's SECOND member; the `Sketch` data model lives in `element.params` (Q1=A — no schema bump). **0c (Entry 42):** `JoinConstraint` is the union's THIRD member (`{element, other, kind:'join', resolution:'butt'|'mitre'|'none'}`) — an OVERRIDE of the auto-miter default; no schema bump. **0g:** reserved fields on `Element` (`phaseCreated?`/`phaseDemolished?`/`parentElementId?`/`properties?`/`classifications?`/`mark?`), `SpatialContainer`/`Grid` (IFC bags + Space extent inputs + `Grid.geometry?`), `Scene.georeference?`/`roomSeparators`, `ParamField.relevantWhen?`/`formula?`. **Ⓐ (Entry 47):** `Scene.views?`/`annotations?`/`schedules?`/`sheets?` (documentation, `documentation.ts`) — optional absent-defaulted, no bump. **Ⓓ (Entry 50, D61):** `Scene.families?` (`families.ts`) — a data-family DEFINITION embedded (self-contained per rule 15); a fully-shaped discriminated-union grammar; optional absent-defaulted, no bump; PROVEN to need no `BimObjectType` field. **⚠ D78 (Entry 65) — the FIRST body over an Ⓐ reservation, and building it corrected the shape in three places, all optional/additive, no bump:** `ScheduleDefinition.groupBy` now says it names **STABLE COLUMN KEYS, never display headings** (the heading reading was **D70 verbatim** — a rename re-keys every group, two columns sharing a title merge, an unheaded column is ungroupable); `ScheduleDefinition.designOptionIds?` RESERVED (`ViewCommon` had D65's field, the tabular view did not, so *"the Option B door schedule"* was inexpressible — the comment carries the exclusion invariant, ⓥ); `ChildOverride.mark?` RESERVED (a D59 child is not a scene row, so neither `BuiltChild` nor `ChildOverride` could carry a builder's label — a curtain-panel Mark column blank for 16 of 17 rows). ⚠⚠ **The lesson for the REMAINING Ⓐ bodies (plan + section): reserving a shape and building its body are two different verifications, and only the second meets the model — these three were found in the first hour of driving a reservation that had been green for seven days.** ⚠⚠ **D79 (Entry 68) PROMOTED `scene.schedules` TO A FULL `SceneCollection`** — the first documentation collection with an authoring verb (`core.createSchedule`/`updateSchedule`/`deleteSchedule`), so it now participates in undo and the dependency graph (a declared "nothing" edge — a schedule reads the model, nothing reads the schedule). ⚠ **The FIELD is unchanged and still optional-absent: the collection materialises on first authoring**, so a document with no schedules is byte-identical to one written before, and `views`/`annotations`/`sheets` remain pure reservations. **No frozen byte moved, no bump.** The one contract-touching line is `ParamField.refTo` gaining `'schedule'` (additive, nothing switches on it, row Ⓕ's precedent). | **P5** |
| **Agent surface** (`window.bunyan`) | **✅ WRITTEN** — `createAgentSurface`, versioned separately (`agentApi: 1`, D22); does **not** inherit the P5 freeze. | evolves on its own clock |
| **`.bnn`** | **✅ WRITTEN + FINISHED (Entry 21).** Zip of `manifest.json` + `scene.json` + `history.json` (the JOURNAL — append-only `seq`; an undo appends a REVERSAL) + optional `thumbnail.png`. Ids are prefixed ULIDs (D44); unknown/future-typed elements round-trip VERBATIM (D43). `geometry-cache.brep` (D29) is purely additive — breaks no saved file when it lands. ✅ **D60 MERGE SEAM RESERVED (Entry 49): `manifest.documentLineage?` (a ULID doc id for un-issued files) + the journal's `UndoableEdit.origin?`/`lamport?` + `ModelRevision.frontier?` — all optional, absent in v1.0.0, round-trip additively; no `SCENE_SCHEMA_VERSION` bump.** | **P5** |

---

## §3 — What exists, and how it was verified

```
packages/
  protocol/       @bunyan/protocol      flat versioned message contract (zero deps). 19 ops + 5 reserved.
  kernel-core/    @bunyan/kernel-core   KernelHost (dispatch + failure marshalling) + ShapeRegistry
  kernel-mock/    @bunyan/kernel-mock   protocol-conformant fake kernel + Worker entry (NO booleans — says so
                                          in `capabilities` rather than faking one; answers faceFrame in closed form)
  kernel-occt/    @bunyan/kernel-occt   ★ THE REAL KERNEL — OCCT 7.9.3 in WASM + Worker entry
                    src/kernel.ts         adapter: C++ STRUCTURE -> Bunyan IDENTITIES
                    src/naming.ts       ★ THE RESOLVER (D1/D24): 4 relations, no geometry, ever
                    wasm/bunyan-kernel.*  the COMMITTED artifact (14.59 MB / 4.19 MB gzip, -O3) + .d.ts
  kernel-client/  @bunyan/kernel-client KernelClient + WorkerTransport / InProcessTransport
  sketch-solver/  ★ @bunyan/sketch-solver  THE 2D SKETCH SOLVER (0d) — planegcs (FreeCAD GCS/WASM) behind the
                    src/planegcs-solver.ts  SketchSolver seam. THE ONLY package that imports @salusoft89/planegcs;
                                             injected at construction (like the kernel client). Lines + 7 point/line
                                             constraints; arc/tangent frozen in the CONTRACT but v1.0.x in the impl.
  types/        ★ @bunyan/types           THE SHIPPED MVP BimObjectTypes (P5) — the REAL registered elements, distinct
                    src/wall.ts             from the tests/ exercise fixtures. D52 baseline join-aware Wall (`core.wall`);
                    src/opening.ts          the ⓙ Door (`core.opening`, buildVoid+buildLeaf); and (D59, Entry 48) the
                    src/curtainwall.ts      composite Curtain Wall (`core.curtainwall` + column/panel/mullion child types
                                             — `buildChildren`, elements-of-elements, depth-2). D19: the document engine
                                             loads these, never depends on them.
  document/     ★ @bunyan/document      THE PARAMETRIC TRUTH LAYER (Entry 18; corrected 21; D50 step-0 33–38)
                    entities.ts    Element/Part/ElementStyle/Material/Section/spatial tree/Grid/Constraint/
                                     RoomSeparator (Part carries `discipline`, D45; Classification={ifcClass,loadBearing})
                    scene.ts       ★ THIS OBJECT *IS* scene.json. + SceneChange (the undo delta) + constraints resolver
                    schema.ts      ParamSchema — ONE language, THREE consumers: property panel, ribbon, AGENT TOOLS (D21)
                    registries.ts  the SIX registries + the GENERATED capability projection (the 7th, naming, is the KERNEL's)
                    types.ts       BimObjectType (+BuildContext.discard, grid/datum accessors, hostFace.inward/frame)
                    ulid.ts      ★ D44 — the PEI is a prefixed, monotonic ULID. No counter, ever.
                    revision.ts  ★ ModelRevision + issued_at_seq. Minted ONLY by the command.
                    commands.ts    the Command layer — THE agent API (D19). core commands + issueRevision + CRUD + guard
                                     + (D79, Entry 68) the SCHEDULE CRUD — the first documentation verbs. ⚠ `Referrer.
                                     redirect` is OPTIONAL there: a reference into a collection nothing authors yet
                                     (a Sheet's viewport) can be kept or broken, never SET.
                    dependency.ts  ★ 0a — the TYPED dependency graph (exhaustive over SceneCollection; container edge closed)
                    enumerate.ts ★ 6A — THE MODEL ENUMERATION QUERY (Entry 58). The ONE walk three consumers share:
                                     children tree (D59) + option cascade (D67) + no-own-parts + unmeasured.
                                     `modelElements` / `projectQuantities` / totalsBy{Material,Discipline,Container,Type}
                    schedule.ts  ★ D58 row Ⓐ — THE SCHEDULES BODY (Entry 65) + THE AUTHORING GRAMMAR (Entry 68).
                                     `ScheduleDefinition` -> rows: `evaluateSchedule` (the D19 door) =
                                     modelElements() -> selectRows -> a cell projector. ⚠ NO enumeration loop of
                                     its own — that IS its correctness.
                                     `columnKeyOf` is the one place the column-key grammar lives (owner Q1), and
                                     `scheduleDefinitionIssues` (D79) is the validator BESIDE it — the CRUD's
                                     refusals, kept here so the grammar is never re-stated in commands.ts.
                                     ⚠ The BODY degrades and never refuses (rule 17); the VERBS refuse.
                                     ⚠ Every RESULT type lives here, never in `documentation.ts`: stored-vs-derived
                                     is legible from the file a type is in (rule 17, and it is greppable).
                    cleandelta.ts ★ ⑥ THE CLEAN DELTA EXPORTER (Entry 58) — journal + revN -> CleanDeltaPackage.
                                     `change_type` READ off the journal; `sceneAt` rewinds; prior priced on a
                                     throwaway doc. Schema: `schema/clean-delta-1.1.schema.json` (Planitor D11)
                    build.ts       ★ base parts -> resolve hostRef -> cut EVERY layer -> PLACE LAST. Broken refs. UNBUILDABLE (D43)
                    document.ts    ★ DocumentContext — THE ONLY DOOR (D19). scene + heap + undo + JOURNAL + revision.
                                     STAGED, all-or-nothing rebuild + universal dryRun (D42)
                    undo.ts        UndoableEdit (STATE DELTAS, never replay) + THE JOURNAL (D40)
                    agent.ts       createAgentSurface() — agentApi:1, thin shim, no browser
                    bnn.ts         the .bnn codec + migration + StorageAdapter + Autosave
                    geometry.ts    ★ GeometryGateway — the narrow seam that makes D19 STRUCTURAL (excludes `tessellate`)
                    sketch.ts    ★ 0d — the SketchSolver SEAM + solver-neutral IR + MockSketchSolver + readSketch +
                                     solveSketch (the D26 guard). @bunyan/document stays pure (no planegcs dep).
                    designoptions.ts ★ D65/D67/D68 — the exclusion INVARIANT as code: `isElementActive` (the rule, with
                                     the D67 host/parent traversal) + `optionScopeOf` (the SCOPE the rule is evaluated
                                     against — shared, after Entry 59 found it copy-pasted). FOUR consumers call both.
                    joins.ts     ★ 0c — the WALL-JOIN resolver (Entry 42): auto-miter on proximity + butt near-face,
                                     all plane geometry from the {start,end} params (recipe = truth, D1-safe). Feeds
                                     BuildContext.joins (cap-lines). The bidirectional wall↔wall dependency edge lives here.
apps/web/        ★ Amer's Vite/React shell — bootstrap (the one KernelClient holder), WebGL2 three.js viewport,
                    generated ribbon + property panel, incremental redraw, sub-shape picking, failure-state panels
tests/            428 tests (all document tests run against the REAL OCCT kernel, never the mock) + goldens + harness
tools/kernel-build/ the OCCT->WASM recipe + src/probe.cpp (THE NAMING PROBE, ~60 s)
tools/oracle/     Python (uv): offline golden seeding — analytic + native-OCCT cross-check (also a MEASURING instrument)
```

**The architectural decision that shapes everything: the kernel is transport-agnostic.**
`KernelHost.handle(request) → response` is a pure function knowing nothing about Workers/`postMessage`/DOM.
⇒ the whole seam is testable headlessly in Node (why the suite runs on a browserless box), the headless
server-side north-star is a `Transport` swap, and mock and real kernel are the same interface.

**⚠ FOUR SILENT OCCT TRAPS, all caught by the harness (plus §1c trap 4) — all OUR misuse, never an OCCT
defect:** (1) `BRepBndLib::Add` is TOLERANT not tight ⇒ `box.SetGap(0.0)`. (2) `LinearProperties` on a
solid sums each edge once per adjoining face (double-counts). (3) `Add` bounds a curve by its CONTROL
POLYGON ⇒ use `AddOptimal`. (4) a full 360° revolve has NO caps and cap accessors don't return null; a
segment perpendicular to the axis reports NO history while its face sits in the result. ⚠ §4j breaks the
streak: the boolean's cost is **real OCCT work**, not our misuse.

### Verified — the kernel (Zayd, dev box, headless)

Protocol v1 (envelope, 15 typed failure codes, ref encode/decode/compare, provenance channel) · typed
failures never throw (even on a non-Error throw — OCCT throws bare ints) · **persistent naming (D1) on
real topology** (faces from semantic accessors, edges as the canonical pair of generating faces,
canonical re-sort before IDs — D8; survives two windows + a resize + a fillet on a boolean edge) · **mock
and real emit BYTE-IDENTICAL refs** (the swap is one line for Amer) · `measure` exact (`BRepGProp`, not
the mesh) + optional `ref` + derived `capabilities` + `INVALID_RESULT` gate · **no WASM heap leak**
(asserted vs `wasmLiveHandles()`, the WASM side's own count) · one JS↔WASM crossing per op · **D28 the
bounded positional key** (a duct cuts clean through a round column; orders two structurally-tied
sub-shapes by mm-rounded centroid, never identifies; runs in the element's OWN build frame so moving a
column can't re-rank; a grid collision is refused) · **query ops** `bounds`/`distance`/`classifyPoint`
+ `faceFrame` (read the B-Rep, never the mesh; return mm + identities).

### Verified — the document model (Zayd, headless, ALL vs REAL OCCT)

D30 an element IS its ordered PARTS ("how much plaster on this wall?" → 135 kg from the B-Rep + density)
· D31 a style edit rebuilds every instance (in the B-Rep) · an opening cuts EVERY layer · a window
through all three layers of a wall ROTATED 30° (volumes identical, host token byte-identical — built in
its own frame, placed last, D25) · D39 cascade delete in ONE undoable edit (warn-first = `dryRun`, D42;
`planDelete()` DELETED) · **the broken-reference state** (marked, visible, never auto-healed; host still
builds; document still loads + edits; retarget is itself an `UndoableEdit`) · reject+keep-last-good
(all-or-nothing, D42) · save→reload in a fresh session → identical parametric state AND geometry from
`scene.json` alone · migration (forward-only) · autosave recovers a crashed session (an ordinary `.bnn`)
· **D19 is a MACHINE check** (`packages/document` does not even depend on `@bunyan/kernel-client`).
**D50 step 0 (Entries 33–38):** the model is **associative** (move a Level/Grid → the building follows),
**editable** (the full CRUD), and **guarded** (no command silently re-identifies, D51 generalised).
**0d (Entry 40):** a 2D profile is **solved** (real planegcs, headless) and extruded — a rough rectangle +
constraints → an exact solid; `lateral.k` = authored segment k across a dimensional re-solve (D26,
revert-verified); an over-constrained sketch refuses at build time (D42), under-constrained solves (`dof>0`).

### NOT verified / NOT built (do not assume otherwise)

- **No `geometry-cache.brep`** — D29 RULED SHIP, ops reserved, **bodies NOT written** (§4j; read it first
  — it is an IDENTITY task, not a serializer task). Deprioritised behind step-0 work.
- **0d the sketch constraint solver — ✅ BUILT + GREEN (Entry 40).** **The room-bounding solver** (D55) —
  **designed/ruled, NOT built** (§5). v1.0.0, its own design doc next.
- ~~**No browser storage**~~ — ✅ **BUILT + BROWSER-VERIFIED (Entry 56):** `IndexedDbStore` (a real IndexedDB
  `StorageAdapter`) + Save/Open/Delete/Autosave/Recover wired into the app; opening `rebuildAll`s from the recipe. Verified
  by `storage-check.html` (8/8, incl. the cross-session Autosave gotcha) + an app save→open round-trip. No frozen contract
  touched. ⚠ `list()` MUST return keys already in the store (it does — `getAllKeys()`). A File System Access adapter (real
  files the user picks) is an additive second `StorageAdapter`, v1.0.x.
- No sweep-along-path, no loft (out of scope). **No 2D views, no IFC import** (P6; both ops reserved).
- No Clean Delta exporter / **no Clean Delta JSON Schema yet** (⑥). ⚠ **NOT blocked (D57):** Bunyan
  designs it on its own terms for **Planitor + Miqdar** (on-box consumers); BIMsync is unbuilt and adapts.
  Headless-closable design work, must be right before the `UndoableEdit`/`SceneChange`/journal freeze.
- No `LICENSE`/CLA/OCCT attribution yet (§4e; must land before public). No service worker/PWA/Cloudflare
  deploy (Amer's).
- ~~0c wall-to-wall joins~~ — **✅ BUILT + GREEN (Entry 42).** Auto-miter on proximity + butt/none overrides,
  the real D52 Wall in `@bunyan/types`, anti-fuse gate + associativity edge revert-verified.

---

## §4 — Decisions

### 4a — The decision index (D1–D56)

| # | Ruling (one line) |
|---|---|
| D1 | **Persistent naming**: identity is a derivation path from the op DAG, never a geometric index. The #1 risk. |
| D3 | IFC **import** only in v1.0.0; export v1.0.x. |
| D8 | Canonical re-sort before identities are assigned (still required when MT lands, v1.0.x). |
| D9 | **We trust OCCT; we verify our own code** (§4b). |
| D10 | Typed-failure contract: the kernel never throws; a failed op yields no edit. |
| D11 | Offline-first; the service worker caches the kernel once. |
| D12 | Anchoring/validation of a hosted opening (a `fixed` opening off its host contributes no hole — a P5 item). |
| D13 | **The freeze's meaning**: *adding* an op is additive; *changing* an op's envelope needs sign-off. |
| D14 | The WASM module *is* the kernel — JS never touches OCCT; `opencascade.js` rejected. |
| D15 | **Bunyan is open source: AGPL-3.0 + commercial** (§4e). |
| D16 | IFC import via **IfcOpenShell** → exact B-Rep solids. `web-ifc` (mesh-only) rejected. |
| D19–D23 | **Bunyan is agent-native** (§4f). |
| D24 | Measured OCCT history (boolean complete; fillet weak; silence = unchanged). |
| D25 | **`transform` mints NO identities** — a rigid motion is a topological isomorphism. Load-bearing. |
| D26 | `extrude`/`revolve` name `lateral.k` after the **authored** segment; **never permute the array** (re-targets every ref). |
| D27 | `revolve` — GenericSolid's other half. |
| D28 | **The bounded positional key** (§3). |
| D29 | **✅ RULED: THE BREP CACHE SHIPS.** An IDENTITY task — bind by CANONICAL ORDER, VERIFY a fingerprint, refuse with `CACHE_STALE`. Ops reserved; bodies NOT written (§4j). |
| D30–D33 | **The modelling layer** (§4h): element owns ordered PARTS · ElementStyle · LinearMember+Grid · Material/Section are REGISTRIES. |
| D34–D38 | **The ecosystem** (§4i): Bunyan is a third producer of the Clean Delta · spatial tree · loadBearing · no backend · `.bnn`. |
| D39 | Cascade delete: deleting a wall deletes its windows in ONE undoable edit; warn-first is `dryRun`. |
| D40 | **The change feed is an APPEND-ONLY JOURNAL** (`seq`/`issued_at_seq`; undo appends a REVERSAL). Delta = read, not inferred. |
| D41 | **`core.issueRevision` is a Command.** |
| D42 | Rule 4 is ALL-OR-NOTHING + a universal `dryRun`; `planDelete()` DELETED. |
| D43 | An unknown OR FUTURE type: the document OPENS, the element is `failed`+visible+PRESERVED VERBATIM through save. |
| D44 | The PEI is a **PREFIXED ULID** (`wall-01J8Z3K7Q2`). No allocator, id-reuse impossible by construction. |
| D45 | **`discipline` lives on the PART**, not the element. Classification={ifcClass,loadBearing}. An unmeasurable quantity is omitted, never zeroed. |
| D46 | One physical thing = one element, one PEI. Superposition PROVISIONAL; the MEP-vs-structure clash question is OPEN and named. |
| D47 | **The tool/interaction layer is a first-class layer, and it was missing.** A ribbon button activates a TOOL, not a form over `argsSchema`. New phase P4.5, before the freeze. |
| D48 | **The interactive target is 10,000+ elements. BINDING.** The WASM-heap sub-question is CLOSED (Entry 29: it fits). |
| D49 | 2D documentation stays v1.0.x, but its anchoring contracts are RESERVED pre-freeze (P5 step 6b). |
| D50 | **✅✅ THE FULL CONSTRAINT MODEL IS IN v1.0.0** — the largest scope ruling. Typed dependency graph + hosting (Level/Grid as active datums) + base/top constraints + wall joins + a SKETCH SOLVER + the missing CRUD. ⚠⚠ **THE ANTI-FUSE RULE STILL BINDS: a join is display/quantities cleanup, NEVER a fuse. A constraint is not a boolean.** |
| D51 | **A command may never silently re-identify.** `updateStyle` must REFUSE an orphaning layer rename (a layer name is identity-bearing — inside the `SubShapeRef` token) unless acknowledged or given a retarget map. Generalised to every reference (0f). |
| D52 | **A WALL IS A BASELINE `{start,end}`; length + height are DERIVED** (params: `start`,`end`,`baseLevel`,`topLevel`). The only parameterisation on which joins + grid-hosting are expressible. |
| D53 | **Constraints live in a first-class `scene.json` `constraints` collection**, orthogonal to `params`. `ParamSchema` stays a value schema. |
| D54 | Reserve three optional shapes (a/b/c): `SubShapeRef kind:'vertex'` · `Element.phase` · `ParamField.relevantWhen`. |
| D55 | **Space extent = Option B (room-bounding).** Boundary DERIVED from bounding walls (+ separators), never stored. **The room-bounding solver ships in v1.0.0.** |
| D56 | The pre-freeze reservation set (0g): phasing = TWO datums; `ifcMapping`/`migrateStyle`/`georeference`/`formula`/`parentElementId` + the Revit-parity sweep (`properties`/`classifications`/`mark`/`Grid.geometry`). |
| D57 | **The Clean Delta is designed on BUNYAN's terms; BIMsync is UNBUILT and adapts (owner, 2026-07-20).** ⑥ was mis-filed as an external blocker on an off-box BIMsync spec. BIMsync is built from scratch *after* Bunyan v1.0.0; its spec conforms to Bunyan. ⇒ Design the change-feed payload for **Planitor + Miqdar** (the on-box, known consumers); never wait on or infer from BIMsync. ⑥ is headless-closable design work, not an escalation. |
| **D58** | **2026-07-21 — Documentation is a live projection of the B-Rep (core_logic rule 17). v1.0.0 ships MINIMAL 2D (1 plan + 1 section + 1 schedule); full apparatus is post-v1.0.0. ⚠ PRE-FREEZE: the View/Schedule/Dimension/Tag/Sheet ANCHORING contracts freeze at P5 (row Ⓐ).** |
| **D59** | **2026-07-21 — An element may own child ELEMENTS, not only Parts (rule 18): curtain walls, stairs, groups. Nesting is mandatory for parity. ✅ DESIGNED + BUILT (Entry 48, Model A = children DERIVED, never stored): `BimObjectType.buildChildren?` + `ElementGeometry.children?` (a tree) + `Element.childOverrides?`; `parentElementId` re-pinned to groups. The real `core.curtainwall` (depth-2) validates it; anti-fuse held; 328 green.** |
| **D60** | **2026-07-21 — Multi-user co-authoring is Bunyan's (ecosystem apps are downstream consumers, not co-authors). ✅ SEAM RESERVED (Entry 49, row Ⓒ): four optional additive fields — `UndoableEdit.origin?`/`lamport?`, `ModelRevision.frontier?`, `Manifest.documentLineage?` — proven mergeable by a pure commutative `mergeOrdered()`; no `scene.json`/schema/verb/backend change (D37 stands). Found 3 foreclosures the D44-ULID prose missed (the edit id is `seq`-derived; the anchor is scalar; un-issued files have no doc identity).** |
| **D61** | **2026-07-21 — Data-driven family authoring (Revit Family Editor moat): families as DATA, not code. ⚠ PRE-FREEZE: reserve a family-definition data-format seam (row Ⓓ). Code-types stay for complex behaviour.** |
| **D62** | **2026-07-21 → ✅ DONE (Entry 53). MEP systems & connectors RESERVED** — `scene.systems?` (`systems.ts`) + `Element.systemId?`/`connectors?` + their `createElement` args. ⚠ **A connector is AUTHORED placement in the element's OWN BUILD FRAME (D25), never a `SubShapeRef`** ⇒ the naming path is untouched and a placed duct's ports survive the move. ⚠ **The sweep-along-path/loft OP needed NO reservation** — the protocol froze at P3 and `faceFrame` was added *after* it under D13 ⇒ additive, precedented. |
| **D63** | **2026-07-21 → ✅ DONE (Entry 53) — NOTHING WAS OWED.** The DWG seam **already exists**: `FormatCodec` + `registries.codecs`, and domain rule 5 makes a new format an **additive registration** (asserted in the test, not just written down). A DWG *underlay* is post-v1.0.0 documentation apparatus (recorded out of scope, owner-ruled). IFC export stays v1.0.x (D3); point-cloud/RVT recorded absent. |
| **D64** | **2026-07-21 → ✅ RULED 2026-07-23 (Entry 52). RE-OPEN gate ⑧'s "reserve nothing": on-element analytical-anchor for real Miqdar structural/energy analysis, or PEI-bound side-graph? (row Ⓔ).** **ANSWER, EARNED from the proper Miqdar spec's real-frame walk (`~/projects/Miqdar/Miqdar_v1.0.0_spec.md` §4, M19): the SIDE-GRAPH SUFFICES — reserve NOTHING analytical on the type/part** (idealization is many-valued per element — cracked stiffness is gross + 0.35EI at once ⇒ not an element property). **ONE exception, NOT an analytical anchor: `Material.thermal?` reserved for the energy north-star (M18, owner-ruled), `entities.ts`, revert-verified.** |
| **D65** | **2026-07-21 → ✅ DONE (Entry 53). Design Options RESERVED** — `scene.designOptions?` (`designoptions.ts`) + `Element.designOptionId?` + `ViewCommon.designOptionIds?` + the `createElement` arg. ⚠⚠ **AND THE INVARIANT IS IN THE FROZEN CONTRACT, NOT JUST THE STORAGE (owner-ruled):** a document with options deliberately holds **mutually-exclusive elements**, so `quantities()`/the roll-up/the Clean Delta/schedules — and Planitor/Miqdar — **MUST exclude non-active options** (`isElementActive`), or a schedule double-counts and work packages are published for a scheme nobody builds (rule 15's failure mode by a new road). The `Grid.geometry`/ⓥ precedent: the consumer-facing rule is written in **at reserve time.** ⚠ **Phase filters + area schemes needed NOTHING** — a phase filter is a view property over datums that already exist and an override is display (derived, never stored); an area was never *stored*, so gross/rentable are additional **derivations**, not fields. |
| **D66** | **2026-07-21 → ✅ CONTRACT HALF DONE (Entry 54). The 4-axis scale measurement.** ⚠ **The ONLY freeze-gating part was the heap-eviction CONTRACT hook, and it is RULED: reserve NOTHING — additive by construction.** Recipe-is-truth makes every solid disposable-and-rebuildable (proven by the D29 cold-load rebuild), the evicted state (`ElementState.stale`) and the release mechanism (`releaseShape`, kernel-client fires it) are ALREADY FROZEN, and the keep-live policy is runtime state never persisted. Measured fresh (2026-07-24): **heap 0.31 GB at 10k — FITS** (16.2 KB/solid); **cold load ~6.35 min single-thread/no-cache** (levers — D29 cache RULED SHIP, `instantiate` RESERVED, MT/D8 — all additive, none foreclose). ⚠ **Draw calls + edit latency are Amer's (browser-side, unmeasurable headless); the D8 single-thread verdict needs them and is additive either way** ⇒ **NOT contract-gating.** `P5_step9_D66_scale_design.md`. ✅ **AMER'S TWO AXES MEASURED (Entry 55, real browser, Intel UHD): draw calls ~30,700 / ~606 ms/frame (1.6 fps) at target; incremental edit ~23 ms compute (FLAT — 2b works) + ~570 ms post-edit render. BOTH collapse to the one-mesh-per-part redraw wall; the fix is renderer BATCHING/instancing (additive, no contract). D8 verdict: the interactive axes do NOT need multithreading (it attacks the kernel, not the redraw) ⇒ recommend MT stays v1.0.x — RAISED with the owner, additive either way. All four axes now have a number.** |

| **D67** | **2026-07-25 → ✅ RULED + BUILT (Entry 57, row Ⓖ, `P5_step5G_option_cascade_design.md`). THE DESIGN-OPTION EXCLUSION INVARIANT CASCADES OVER EVERY "BELONGS-TO" EDGE.** Found by the owner-authorised pre-freeze adversarial sweep. D65 put the invariant *inside the frozen contract* so three products would implement ONE rule — but it read only an element's **own** tag and its signature handed it **no model**, so it could not ask what the element hangs off. **Measured: a consumer counted 4 windows where 1 was correct, 3 of them hosted on the wall the same rule had just excluded** — D65's own failure mode by the hosting road. **Fix (owner-ruled): `isElementActive(element, scope, active?)` resolves against the MODEL and TRAVERSES `hostId` + `parentElementId`** (a traversal, not a chain walk — an element may hang off both). Missing ancestor ⇒ excluded (broken-ref precedent); cycle ⇒ excluded and terminates (cycle-guard precedent). ⚠ **Generated children (D59 Model A) needed nothing — not scene rows, excluded WITH their parent by construction.** No schema bump, no field, no verb. Revert-verified (`expected 4 to be 1`). |
| **D68** | **2026-07-26 → ✅ RULED + BUILT (Entry 59, row Ⓗ). THE EXCLUSION INVARIANT REACHES THE ROOM SOLVER AND THE JOIN RESOLVER TOO — FOUND BY SWEEPING THE RULE *BACKWARD* OVER CODE THAT PREDATES IT.** D65 wrote the rule into the frozen contract and D67 made it cascade; both guaranteed the *next* consumer would obey it and did nothing about the two that were already written (**both shipped Entry 41/42 on 07-18; the rule landed 07-23**). **`assembleRoomInput` measured a 4800×3800 room at 10,640,000 mm² where 18,240,000 is correct** — a 42% under-report on a room that is **entirely main-model**, caused by one partition in a scheme nobody will build. **`partnersAt` was worse: it corrupts the BUILT B-Rep**, via *miter-against-a-ghost* and — the vicious one — **the AMBIGUITY FLIP**, where adding a facade variant that reaches an existing corner pushes the partner count 1→2, the crowd reads as ambiguous, and **a correctly-mitered main-model corner silently loses its miter**. **FIX: an optional `RoomOptionSelection`/`JoinOptionSelection` on `roomMetrics`/`assembleRoomInput`/`resolveJoins`, defaulting to each set's primary** ⇒ behaviour unchanged for every existing document; plus **`optionScopeOf()`** extracted so the SCOPE is shared, not just the RULE (it had been copy-pasted into two consumers and was about to become four). ⚠ **`wallsJoinedTo` deliberately NOT filtered** — it is the invalidator, and over-naming costs a rebuild while under-naming leaves a stale solid. No schema bump, no field, no verb, no frozen byte. Revert-verified test-first (`expected 10640000 to be close to 18240000`; `expected [] to deeply equal [{end:'end',…}]`). **428 green.** |
| **D69** | **2026-07-27 → ✅ RULED + BUILT (Entry 60). MID-SPAN / T-JUNCTION JOINS SHIP IN v1.0.0 — because the absence of them was a QUANTITY defect, not a missing feature.** Found by sweeping **domain rule 16** (*"a quantity can never double-count"*, D45/D46, 07-13) backward over the join resolver (07-20) and `projectQuantities` (07-25). `partnersAt` matched **endpoint-to-endpoint only**, so a partition landing on another wall's mid-span found no partner, kept its plain perpendicular cap, and drove its last half-thickness **inside** the through wall — that sliver living in **both** B-Reps. **Measured on real OCCT: 2.8800 m³ reported where 2.8320 m³ is the truth, `unmeasured: []`, `basis: 'exact'`.** ⚠ The over-report is **fixed per junction** (`t_partition × t_through/2 × height`) ⇒ it scales with the NUMBER of partitions, and a T is the commonest interior condition in a building. **FIX (owner-ruled "fix it at the source, don't report it"): `pointOnSegment` + `throughWallsAt` ⇒ auto-BUTT on a mid-span T**, directional (only the butting wall's cap moves), with the **same ambiguity discipline as a corner** (2+ through walls ⇒ default cap). `wallsJoinedTo` gained the **segment** edge so thickening a through wall re-stages the partitions on it; `core.setJoin` accepts a mid-span pair via a widened `wallsMeet` precondition, so `none` can disable it. ⚠ **`review_P5.md` #4's freeze-safety analysis held exactly**: no new frozen field, no `SCENE_SCHEMA_VERSION` bump — the precondition relaxed, the contract did not move. Revert-verified test-first (5 failures incl. the headline). |
| **D70** | **2026-07-27 → ✅ RULED + BUILT (Entry 60). THE CLEAN DELTA IDENTIFIES A MATERIAL BY ITS SHARED-ENTITY ID — `contract_version` 1.1 → 1.2.** Found by sweeping **domain rule 12** backward: *"Materials and Sections are shared entities, never strings — a value that must be grouped, scheduled, or read by an analysis engine cannot be a copy."* `partToWire` emitted **`material: part.materialName`** — a display label — and dropped `materialId`; the published `clean-delta-1.1.schema.json` **required** `material` as a plain string and carried no id at all. Three silent failures: a **rename** re-keys every downstream work package (rule 13 defeated for materials); **two materials sharing a display name merge** into one group (`Material.name` has no uniqueness constraint); and an **unresolvable material emits its raw id AS the name** (`materialName: name ?? materialId`), so one material arrives under two keys. ⚠ **The tell it was a backward-sweep miss, not a design choice: `enumerate.ts`'s `totalsByMaterial` has always grouped by `part.materialId`** — the rule was obeyed internally and broken on the contract three products bind to. **FIX: `parts[].materialId` REQUIRED, schema renamed to 1.2** (owner ruled required-over-optional: an optional identity field leaves the defect reachable). Cheapest possible moment — 1.1 was published 07-25 and no consumer had implemented it. ⚠ **Cross-project: `../Planitor/v2.2_spec.md` §4 defines this shape and must be updated to match.** Revert-verified (`expected undefined to be 'concrete'`) + a schema mutation test that refuses a package missing `materialId`. |
| **D71** | **2026-07-27 → ✅ RULED + BUILT (Entry 60). THE FORMAT-CODEC SEAM GAINS BEHAVIOUR; THE VIEWS REGISTRY IS RECORDED AS A RESERVATION.** Found by sweeping **domain rule 5** (*"types, commands, formats, views are additive registrations, never core edits"*) backward and simply **counting what is registered: 51 types · 39 commands · 1 codec (inside the test asserting the seam exists) · 0 views.** `FormatCodec` and `ViewDefinition` carried **no behaviour** — no read/write, no projection member — and **nothing consulted `registries.codecs` or `registries.views`**; `saveBnn`/`loadBnn` are called by name. Of the four kinds rule 5 names, **two worked.** ⚠⚠ **It lands on D63**, which discharged freeze-gate row Ⓕ with *"the DWG seam ALREADY EXISTS… asserted in the test, not just written down"* — that test registered a descriptor and asserted `size` went 0→1, i.e. it exercised the generic `Registry` class and would have passed had `FormatCodec` been `{id}`. **D63's CONCLUSION survives (nothing was owed pre-freeze — `FormatCodec` is not frozen and gained its behaviour additively); its EVIDENCE did not.** **FIX: `read?`/`write?` on `FormatCodec`, a `codecFor(registries, filename, need)` dispatcher (longest extension wins), and `BNN_CODEC` registering the format Bunyan itself ships** ⇒ the seam is exercised by the primary path, not only by a test for a format that does not exist. ⚠ **Views deliberately left a reservation and now SAY SO in the code + a test** — the P6 bodies (D58) are what change it. ⚠ **`apps/web` still calls `saveBnn`/`loadBnn` by name — wiring the app's open/save through `codecFor` is Amer's, additive, not owed by this fix.** |
| **D72** | **2026-07-27 → ✅ RULED + BUILT (Entry 60 cont.). RULE 15's TWO ROADS: `length` WAS RECONSTRUCTED AND `area` WAS THE WRONG NUMBER ENTIRELY. ⚠ THIS ONE RESERVED A FIELD ON A SHAPE THAT FREEZES AT P5 — the only contract change of the session.** Found by sweeping **domain rule 15** (*"a quantity is MEASURED, never reconstructed… it must never emit a WRONG one wearing the `exact` badge"*) backward. **(a) `canonical.length` was join-blind:** it read the `{start,end}` param while `volume` beside it was measured, so a butted partition reported **2.00 m for a solid that ran 1.9 m** — the two disagreeing about the same wall **inside one `basis: 'exact'` block**, which a consumer can catch unaided. ⚠ **This session's own D69 widened the exposure** (before it, butts needed an explicit `setJoin`; after it, every T-junction butts) — *a surface going green is when the sweep should START*. FIX: `builtAxisLength()` clips the baseline at the cap lines `resolveJoins` already produces — recipe-derived, kernel-free, D1-safe, and identical to the baseline when nothing is joined. ⚠ Freeze-Gate ⓗ's *"length must not be `measure.edgeLength`"* is **not overturned** — "not edgeLength" simply never implied "the raw baseline"; the built AXIS is the third option. **(b) `area` was the solid's TOTAL ENCLOSING SURFACE: a 5 × 3 m three-layer wall measured 94.80 m² against a 15 m² paintable face (6.3×)**, counting buried inter-layer faces, edges and both caps — every number exactly measured and the total meaningless, rule 15's failure by the road nobody checks. **FIX (owner-ruled: exposed faces only; net of openings, reveals excluded): `BuiltPart.exposedRefs?` RESERVED** — optional, absent-defaulted (absent ⇒ the old whole-solid number, so no existing Type or saved file moves) — because *"exposed" is not derivable generically* (it depends on a wall layer's position in the stack, a panel's framing, a column's nothing) so **only the Type can say**, and without it the product has no way to answer *"what area do I bill?"*. `core.wall` populates it from D26's already-documented segment order (a-side `lateral.1` / b-side `lateral.3`, filtered by stack position); `quantities()` then MEASURES each declared face via `measure(ref)` — the machinery Entry 13 built for exactly this and that nothing ever consumed (§1c-7 again). ⚠ **Openings fall out for free and that is why it is measured per FACE rather than computed:** a door's hole shrinks the face it cuts while its reveals are *different* faces, so 30 m² → **26 m²**, no opening-aware arithmetic anywhere. ⚠ **`exposedRefs: []` (a buried middle layer) MUST NOT be conflated with absent** — that bug was caught in my own code before it shipped and would have re-reported the 31.28 m² it exists to remove. Revert-verified test-first. **451 green.** |
| **D73** | **2026-07-27 → ✅ BUILT (Entry 61). THE JOIN RESOLVER'S O(N²) SCAN IS AN O(N) SPATIAL INDEX — `review_P5.md` #3 RETIRED, MEASURED BOTH SIDES.** `partnersAt`, `throughWallsAt` and `wallsJoinedTo` each walked `Object.values(scene.elements)` in full while `resolveJoins` runs **per element** in the build ⇒ N full scans per cold load. **Measured before (pure TS, no kernel, room grid): 4757.7 ms at 1984 walls, per-wall cost RISING with N (143 µs → 2398 µs)** ⇒ ~**3.5 min of pure join scanning** at the 10k target D48 makes BINDING, before the kernel does any geometry. ⚠ Entry 60's `throughWallsAt` had made it worse — a second full scan per wall end — so this was partly the project's debt to itself. **FIX: a uniform grid (CELL 500 mm) over endpoints AND segments, cached in a `WeakMap` KEYED ON THE `Scene` OBJECT.** `Scene` is replaced immutably on every change, so a stale index is not unlikely but *unreachable* — a changed scene is a different key. **No signature changed, no contract touched, no invalidation logic to get wrong.** Option filtering (D65/D67/D68) deliberately stays at QUERY time on the few candidates, because the same scene is legitimately queried under different selections. **Measured after: 169 ms at 9940 walls, per-wall FLAT at 14–17 µs from 1k to 10k** ⇒ ~**540× at the binding target**; the invalidator 3645 ms → 220 ms. ⚠⚠ **AND THE RISK THE SPEED CREATED IS THE POINT: an index buys speed by changing WHO IS ASKED.** All 32 existing join/dependency tests passed unchanged — *and they could not have caught the new failure mode*, because every one places its walls at round coordinates. The real risk is a **coincident corner straddling a cell boundary** (two endpoints within `JOIN_TOL` in different buckets ⇒ the miter silently never found, and the output is a perfectly valid wall with a plain cap — D68's shape by a new road). `tests/join-spatial-index.test.ts` (7) is hostile to the GRID rather than to the geometry, and was **revert-verified by neutering the 3×3 lookup to a single cell: exactly one test fired, and all 21 existing join tests still passed.** |
| **D74** | **2026-07-27 → ✅ RULED + BUILT (Entry 62). A BROKEN REFERENCE MAY NOT OUTLIVE THE ELEMENT IT NAMES — domain rules 1 AND 3, swept backward together.** `scene.brokenRefs` is the one field in `scene.json` that is a RESULT rather than a recipe (persisted on purpose: closing a file must not "fix" a model by forgetting its problem). `#stage` re-derived it only for the assemblies it was rebuilding, and **`affectedAssemblies` deliberately skips any id no longer in the scene** ⇒ **a deleted element is never a rebuild root, so its entry survived the filter forever** — measured on both roads (delete the orphaned opening; delete the host whose D39 cascade took it). ⚠⚠ **Rule 3's sentence is what breaks:** a broken ref is a state *awaiting manual retargeting*, and this one awaited nothing — `core.retargetReference` cannot act on an element that does not exist — while `scene.brokenRefs` is **saved into the `.bnn`**, so the document was left permanently, unfixably dirty and any consumer asking *"is this model clean?"* read dirty for the life of the file. ⚠ **Rule 1 is the deeper half: it survived `rebuildAll`**, the primary load path, because the element it names is not among the elements there are to rebuild — *a derived value that outlives its subject is no longer derived.* **FIX: one filter clause (`scene.elements[b.elementId] !== undefined`)**, safe because there is exactly ONE producer and it reads the scene's own rows (`buildAssembly` → `hostedBy`) — in particular a **D59 generated child is not a scene row and cannot be the subject of an entry**. ⚠⚠ **The test that proves it is a DROP and not a SUPPRESSION: undo the delete and the broken ref COMES BACK**, re-derived from the recipe. No frozen byte, no schema bump, no field, no verb. Revert-verified test-first (4 of 5 measured failing). **Also in Entry 62: the OWED `exposedRefs` declarations (D72) are closed for `core.opening` and `core.curtainwall` under the owner's ONE rule — *exposed = every face that is a surface of the assembled thing* — and building them found that `exposedRefs` reached only 3 of the 4 `BuiltPart → Part` sites, so a door leaf could never have carried one. Rules 9 and 10 swept CLEAN.** |
| **D75** | **2026-07-27 → ✅ RULED + BUILT (Entry 62 cont.). ONE UNMEASURABLE ELEMENT MAY NOT BRICK THE BUILDING'S TAKE-OFF — domain rule 4, swept backward at the granularity the rule is actually about.** The single-edit case was sound (D42's staged, all-or-nothing rebuild); the AGGREGATE was not. `projectQuantities` called `quantities(id)` **unguarded**, so one `measure` refusal threw out of the loop and the export returned **nothing** — not even the `unmeasured` list built for exactly this, and **against an explicit owner ruling** (Entry 58 Q1: an unmeasurable element is *reported*, never zeroed and never dropped). D43's shape one level up: *one unregistered type must not brick a file* becomes *one unmeasurable element must not brick an export.* ⚠⚠ **D72 + Entry 62 widened the exposure days earlier** — `quantities()` now issues a `measure(ref)` per declared exposed face, so the refusable surface grew by the number of faces declared (*a surface going green is when the sweep should start*). **THE REACHABLE CAUSE: `BuiltPart.exposedRefs` was never validated to be a SUBSET of the part's own `refs`**, so a Type naming a face it lacked built **`valid`** and refused only at pricing time — on a member that FREEZES at P5, with D61 data-families making third-party Types a v1.0.x reality. **FIXED TWICE, NOT REDUNDANTLY: (a)** one shared `badExposedRef()` refuses such a declaration at build time, wired into all **three** part-producing sites (base / D59 child / `buildLeaf`), in the idiom of the duplicate-DAG-node check beside it — ⚠ silently SKIPPING the bad ref was the tempting alternative and is worse, since it under-reports an area still wearing `basis: 'exact'` (**rule 15's failure by a new road**); **(b)** `projectQuantities` reports a measure failure in `unmeasured` instead of throwing, honouring the ruling for causes nobody can name in advance. ⚠ **A direct `quantities(id)` still throws deliberately** — the last-good state of one element is nothing, of an aggregate it is every other element. ⚠ **The test was wrong before the code was:** it first asserted D43 semantics, and the build correctly REJECTED instead — **D43 is for a type this session does not KNOW (`unbuildable`, carried verbatim); a type that is simply WRONG is `geometry`, and rule 4 rejects it.** No frozen byte, no schema bump, no field, no verb. Revert-verified test-first (3 of 5). **Also: rules 2 and 11 swept CLEAN by counting — one positional `refs` read (a tessellation wire format) and exactly two boolean call sites, neither taking two elements' solids.** |
| **D76** | **2026-07-28 → ✅ RULED + BUILT (Entry 64). A DELTA MAY NOT BE ANSWERED OUT OF A LOG THAT CANNOT SEE ITS BASELINE — domain rule 14, swept backward.** Every mechanical half of D40 was sound *and tested*; the **precondition** was not. `issued_at_seq` names a position in the journal and nothing verified the journal contained it, so `since()` returned `[]` — **indistinguishable from the true answer *"nothing has happened since I issued it."*** Measured on a wall grown 6 m → 8 m after the baseline: (a) a `.bnn` carrying its revision but **no `history.json`** reopened and published a valid `contract_version: 1.2`, `source: bunyan` package with **zero elements and an all-zero summary**; (b) a `.bnn` saved with **`doc.history()`** in place of `doc.changeFeed()` — the mistake D40's docs have warned about in prose for five weeks — **dropped an entire wall built after the baseline** out of the delta once the 200-deep stack had shifted. Planitor's own rule reads absence-from-`elements` as `unchanged` ⇒ **it keeps billing the model it already has.** ⚠⚠ **THE DETECTOR IS STRUCTURAL, NOT HEURISTIC, AND D41 IS WHY IT WORKS: an issued revision is journalled but never pushed onto the undo stack**, so a log that is really the undo stack *cannot* carry the anchor. **FIX: one shared predicate (`journalCoversRevision`) + one shared message, refused at three sites** — `changesSince`, `exportCleanDelta`, and `saveBnn`, which now refuses to WRITE a file whose journal contradicts its own manifest (the lie is refused where it is minted). ⚠ **An absent journal stays LEGAL** — a scene-only `.bnn` is a real document (twenty tests write one) — and is refused only when asked for a delta; the refusal is scoped to the delta, never to opening the model (D43's discipline). ⚠⚠ **AND THE GUARD, WRITTEN SCALAR-ONLY, WAS REFUSED BY THE D60 CO-AUTHORING TEST — a reservation defending itself**: under a merge frontier the scalar cut is ambiguous by design, so `revision.frontier` (reserved, never minted in v1.0.0) now defers the check to the frontier path. *Writing it without that clause would have foreclosed row Ⓒ four days before the freeze.* Also: `BNN_CODEC.write` no longer defaults to `{kernelBuildId:'unknown'}`, which fabricated a build id and silently dropped both journal and revision on the very seam D71 built for the app's save path. No frozen byte, no schema bump, no field, no verb. Revert-verified test-first (**5 of 5 measured failing**). |
| **D77** | **2026-07-28 → ✅ RULED + BUILT (Entry 64). THE STYLE (AND SECTION) INVALIDATOR EDGES REACH GENERATED CHILD ELEMENTS — domain rule 18, swept backward.** `BuiltChild.styleId` is a real member (D31 one level down — *"a panel style shared across every panel"*) and `contextFor` resolves it into a child's `BuildContext` exactly as for an authored row, **so the build READS a child's style.** But `elementsUsingStyle`/`instancesOfStyle` answer *"every element wearing this style"* out of `Object.values(scene.elements)`, and **a D59 Model-A child is not a scene row.** Measured on real OCCT: `core.updateStyle` on a style worn only by children reported **`rebuilt: []`** — so the geometry stayed **3× stale** (20,000,000 mm³ where 60,000,000 is correct) *and* the Clean Delta was told the façade was `unchanged` — **until an unrelated `rebuildAll` silently cured it**, meaning the live session and the saved file disagreed and only the file was right. The `sections` edge inherited the defect verbatim (a Section reaches geometry only through a style). ⚠⚠ **IT BREAKS `dependency.ts`'s OWN STATED RULE — *an edge the build READS must be an edge the invalidator KNOWS*** — and it could not be fixed inside that file's purity, because **which children exist is produced by a Type's `buildChildren` (code, not data)**, so no pure function of `scene.json` can know it. **FIX: `childStyleUsers(builtTree, authoredIds)` walks DOWN from each authored root** (never parsing a PEI — D44/D59 say ids are opaque) and the graph takes it as an optional argument, so the EDGE stays declared in `dependency.ts` and `#touched` stays the seam that feeds it. The **authored root** is what re-stages, which regenerates the child. ⚠ **The dates are the sweep:** the style edge is D31 (07-13), composition landed 07-22 (D59) — §1c-8 for the fourth time. ⚠ **Dirty against the INVALIDATOR while clean against every consumer**, so Entry 59's sweep form (*"does this aggregate or publish?"*) could not have found it. No frozen byte, no schema bump, no field, no verb. Revert-verified test-first (2 of 3, the third being the additivity gate that an unworn style still invalidates nothing). |
| **D78** | **2026-07-28 → ✅ RULED + BUILT (Entry 65). THE SCHEDULES BODY SHIPS, AND ITS CORRECTNESS IS THAT IT HAS NO ENUMERATION LOOP OF ITS OWN (D58 row Ⓐ, `P5_step6B_schedules_design.md`).** The anchoring contract froze green in Entry 47 **with a hand-rolled evaluator inside its own test** — `Object.values(doc.scene.elements)`, commented *"this is what the v1.0.x renderer will do."* It was correct for its fixture (two plain walls) and **wrong on the model in three measured ways**: a curtain-panel schedule returned **0 rows where 6 is correct** (a curtain wall is **1 authored row and 17 real elements**) — ⚠ *the failure mode is an EMPTY TABLE, not a crash*; a no-filter schedule **THREW** on the **pure composite** (not the void — `P5_step6A` §1 finding 3 confirmed from the schedule's side); and one non-active design option produced a **2.0000× over-report**, which is **D65's own named failure mode** (*"a schedule double-counts and work packages are published for a scheme nobody builds"*) on **the consumer its sentence names FIRST and the only one that never had a body to fix**. ⇒ **The body consumes `modelElements()` and all three defects are closed by that one decision**, before a line of column code. ⚠⚠ **AND THE REAL LESSON IS WHERE THE WRONG LOOP WAS LIVING: a reservation's own proof-of-concept is the most likely thing a body author lifts** — §1c-7's disease in a new form, since the artifact that misled was a **passing test**, not prose. It is retired onto the real body in the same commit, asserting exactly what it asserted before. **THREE OWNER RULINGS, all cheap only until step 6 and all found by walking the reserved shape against a real model for the first time: (Q1) `groupBy` names STABLE COLUMN KEYS, never display headings** — the heading reading is **D70's defect verbatim** (rename ⇒ every group re-keys; two columns sharing a title merge; an unheaded column is ungroupable), caught here **before the shape ever had a body**; **(Q2) `ScheduleDefinition.designOptionIds?` RESERVED** — `ViewCommon` got D65's field and the tabular view did not, so a drawing view could be saved as "the Option B plan" while the schedule beside it on the same sheet could not (the ⓥ precedent: the consumer-facing rule is written in **at reserve time**); **(Q3) `ChildOverride.mark?` RESERVED** — a D59 child is not a scene row, so neither the recipe half (`BuiltChild`) nor the authored half could carry the label a builder reads, leaving a curtain-panel Mark column blank for 16 of 17 rows. ⚠ **Two defects were found IN MY OWN CODE by the tests, and both are the same conflation one level down:** a total went **absent where 250,320,000 mm³ is right** because "no quantity BY CONSTRUCTION" (a pure composite) was read as "could not measure" — **D72's `exposedRefs: [] vs absent` by a new road** ⇒ `ScheduleCell.unknown` marks the real unknown, and totals mirror `QuantityTotal` exactly (volume/area sum what is there with `unmeasured` beside; **mass absent, never partial**); and a wholly-unknown column got **no total entry at all**, so `totals.get(key) === undefined` read as *"there is no such column"* rather than *"the answer is unknown"* — **rule 14's shape** ⇒ numeric-ness is the column's **declared source**, never what the rows happened to produce. ⚠ A schedule with no `quantity` column makes **zero kernel calls**. No frozen byte moved, no `SCENE_SCHEMA_VERSION` bump, no verb (the CRUD is a separate additive unit, owner Q4). Revert-verified five ways. **517 green.** |
| **D79** | **2026-07-29 → ✅ BUILT (Entry 68). THE SCHEDULE CRUD, AND `scene.schedules` IS PROMOTED TO A FIRST-CLASS `SceneCollection` — D58 row Ⓐ's second unit (owner Q4).** The reserved shape had a READER (D78) and no WRITER: 0 of 29 commands could author a schedule, so v1.0.0's "one schedule" could be evaluated but never created, renamed or deleted. **`core.createSchedule`/`updateSchedule`/`deleteSchedule`** are ordinary additive registry entries (Entry 47 §7 settled that in advance — documentation entities are not elements), and the promotion carries undo + a declared dependency edge. ⚠⚠ **THE ARCHITECTURAL SENTENCE: the verbs carry the refusal the body deliberately will not.** `projectSchedule` DEGRADES rather than refuses because a projection must never deny a builder his table (rule 17) ⇒ the authoring door is the only place a malformed definition can be stopped, and there was none. Measured before it existed: a `groupBy` naming a column the schedule lacks **collapses 2 groups into 1 keyed `[""]`** (every subtotal becomes the grand total — **Q1's own failure mode arriving through the door Q1 did not cover**); a `quantity` key outside the grammar makes **every cell and the TOTAL NaN**, which `JSON.stringify` writes as **`null`**, i.e. reaches a consumer as *"no value"*; an unknown `source` is a **raw TypeError** out of the evaluator; **two columns sharing one key** yield 2 headers and **ONE total** (`checkLayers`' rule one level up — a structure addressed by a derived key must have unique keys, or the second column is unaddressable by construction). All refused at the door, in `schedule.ts` beside `columnKeyOf` so the grammar has ONE home (Q1). ⚠⚠ **THE PROMOTION LANDED IN TWO OF THE THREE STEPS ROW Ⓐ'S DESIGN PREDICTED, AND THE THIRD IS THE FINDING: an `emptyScene()` entry turned two GREEN Entry-47 reservation assertions RED** (*"a Scene with none of the documentation collections is valid"* / *"a `.bnn` carrying none defaults absent, not empty"*). Relaxing them was the tempting move and the wrong one — they are still true and they are the reservation's own proof. ⇒ **the collection MATERIALISES ON FIRST AUTHORING** (`applyOne` creates it), so a document with no schedules stays byte-identical, all four documentation collections keep ONE rule, and Entry 47's tests pass **unmodified**; the hostile-`.bnn` guard is correspondingly shaped for an OPTIONAL collection (absent legal, present-and-not-an-object refused). ⚠ **`Referrer.redirect` became OPTIONAL** — a `Sheet.viewports` entry may place a schedule, and repointing it means writing `scene.sheets`, which nothing authors yet, so D51's SET rung genuinely does not exist for it: refuse-or-break, with the gap in the TYPE rather than in the behaviour (the sheet CRUD restores it by supplying a `redirect`). ⚠ **One contract-touching line: `ParamField.refTo` gained `'schedule'`** — additive, nothing switches on it, and row Ⓕ's precedent verbatim (`'system'`/`'designOption'` pre-widened for the same reason); **`view`/`sheet`/`annotation`/`family` deliberately NOT added — an owner call, surfaced.** ⚠ Also fixed: `schedule.ts` carried a **raw NUL byte** in a string literal (Entry 65's group-key separator), which made the file **binary to `grep`** — on a project whose method is grep-based backward sweeps (§1c-8), a file no sweep can see. No frozen byte, no `SCENE_SCHEMA_VERSION` bump. Revert-verified ten ways (the absent-collection handling alone fires **11 of 14**). **538 green.** |
| **D8** | **2026-07-25 → ✅ DECIDED (Entry 57): MULTITHREADING STAYS v1.0.x.** Raised by Amer (Entry 55) and confirmed by the owner. The two INTERACTIVE axes are a renderer-batching problem MT does not touch; cold load is MT's only real candidate and has additive levers of its own (D29 cache RULED SHIP, `instantiate` RESERVED). Additive either way (COOP/COEP + `SharedArrayBuffer` deploy config, not a `scene.json` contract) ⇒ never gated the freeze. |

**⚠ THE OWED `exposedRefs` DECLARATIONS ARE CLOSED (Entry 62): every shipped Type declares, under one
owner-ruled sentence. `tests/exposed-area-declarations.test.ts` (7, real OCCT). The absent-defaulted
fallback remains for a FUTURE Type that has not declared yet — it is a transitional default, never a
second definition of what an area means.**

**⚠ D40–D46 are ALL BUILT (Entry 21), each with a test that fails if the fix is reverted. D50 STEP 0 IS
NOW FULLY BUILT — 0a/0b/0e/0f/0g (Entries 33–38), 0d (Entry 40), room-bounding (Entry 41), 0c (Entry 42).**

### 4b — Verification scope: WE TRUST OCCT; WE VERIFY OUR OWN CODE (D9)

Validating OpenCascade is out of scope. The harness catches **our** bugs via: **(1) the reference-build
oracle** (committed values from a native OCCT build — `cadquery-ocp`, seeded offline; same kernel,
different binding/build/path ⇒ a disagreement means *our* code is wrong; also a MEASURING instrument —
§4j used it to prove the boolean's cost is real OCCT work). **(2) closed-form sanity checks** (guard our
own measurement code — it earned this on the `LinearProperties` double-count). **(3) regression
snapshots** (drift). *(Toolchain: `cadquery-ocp`, not `pythonocc-core`; needs `libgl1`.)*

### 4e–4i — THE FIVE BIG RULINGS. **Full text: `V1.0.0_spec.md` §14 + `core_logic.md`.** The one thing you must not get wrong:

- **4e — OPEN SOURCE, AGPL-3.0 + commercial (D15).** The moat was never the client code, it is hosted
  collaboration. ⚠ The LGPL side-module task is CANCELLED (public source discharges relink; the static
  link STANDS). ⚠⚠ **The CLA is a hard prerequisite before the first external PR** (a merged PR without
  one can never be commercially licensed, and murkies a closed Miqdar). CLA, not DCO.
- **4f — AGENT-NATIVE (D19–D23).** One command layer; humans and agents both act through it. `argsSchema`
  ⇒ the agent's tool list is **generated, never maintained**. `window.bunyan` ships with the app (zero
  install); MCP is v1.0.x. ⚠ **TWO LAYERS, ONE IS THE AGENT'S:** kernel ops (`makeBox`) froze at P3,
  callable by `DocumentContext` alone; document commands (`createElement`) freeze at P5, callable by
  everyone. *The kernel is not an API surface; it is an implementation of one.*
- **4g — MIQDAR, a second product (M1–M22).** Bunyan models; Miqdar analyses & designs; **starts only
  after Bunyan v1.0.0 ships. M13: Miqdar is CLOSED SOURCE.** ⚠⚠ **THE LIVE MIQDAR SPEC NOW LIVES IN
  `~/projects/Miqdar/`** (spec + register + current_state + decisions, M22, 2026-07-23) — the Bunyan copies
  are **retained + `SUPERSEDED`-headed** (not deleted; the freeze gate references them). **THE P5 FREEZE
  HAS A MIQDAR GATE** (plan P5 step 6a): its rows are `~/projects/Miqdar/Miqdar_v1.0.0_spec.md` §3.5 (was
  §3.4). ✅ **The gate's hard row — the analytical-anchor D64/row Ⓔ — is RULED (Entry 52): the PEI-bound
  side-graph suffices; reserve nothing analytical on the type/part; one `Material.thermal?` reserved for
  the energy north-star (M18).** ⚠ Miqdar may never require of Bunyan: analysis code inside it, a second
  API, or coupled release schedules.
- **4h — THE MODELLING LAYER (D30–D33).** An element owns ordered PARTS (a wall is
  blockwork+insulation+plaster; "how much plaster?" was unanswerable at any price). ElementStyle = the
  shared named param set (change one type → update 400 walls). LinearMember (Beam+Column are ONE concept)
  + Grid. Material/Section are REGISTRIES not strings. ⚠⚠ **THE ANTI-FUSE RULE — NEVER FUSE TWO
  ELEMENTS.** Fusing two walls at a corner re-owns 4 of the first wall's 6 faces to the fuse ⇒ **every
  window hosted on it breaks the moment a neighbour is joined, retroactively** (measured, Entry 12).
  Corner joins are a QUANTITIES/DISPLAY problem (D50's 0c — a constraint, never a boolean). All four were
  cheap because `nodeId` is an opaque string ⇒ a Part is just its own DAG node.
- **4i — THE ECOSYSTEM (D34–D38).** Bunyan authors → Miqdar engineers → Planitor builds, BIMsync the
  on-ramp for foreign models. Bunyan is a **third producer** of the existing Clean Delta Package (`.bnn`
  = the model, Clean Delta = the change feed, IFC = the door for outsiders — IFC can't be the internal
  transport: no recipe, no `SubShapeRef`, no stable id). ⚠ **saving is not issuing** (D34). ⚠⚠ **THE MOAT
  IS STRUCTURAL:** everyone's GlobalIds churn on revision, breaking every schedule binding; BIMsync is an
  entire platform built to *manufacture* the property Bunyan has by construction (a PEI + a
  confusing-change queue Planitor blocks on). For a Bunyan model that queue is EMPTY, ALWAYS. ⚠⚠ **BUT
  `BIMsync_cloude` IS NOT ON THIS BOX and its spec has not been read** — everything about BIMsync is
  inferred from `Planitor/v2.2_spec.md`. No BIMsync doc may be edited until its spec is here. Safe to act
  on: **do not build a Bunyan backend.**

⚠ **The payoff nobody saw (D30/D33):** Planitor reconstructs a steel column's weight through a fallback
ladder that hardcodes `density: 7850`; **Bunyan holds every input exactly and emits `basis: "exact"`, per
part, per material** — the estimate becomes a measurement, and a task binds to *the part it builds* (the
plasterer bills plaster). *(Built: `DocumentContext.quantities()`.)*

### 4j — THE OPEN ITEMS ON THE OWNER'S DESK

**(1) D39 cascade delete — ✅ RULED + BUILT** (§3).

**(2) D29 — THE BREP CACHE — ✅ RULED SHIP; bodies NOT written. READ BEFORE IMPLEMENTING.**
The measurement (5-storey building): **cold load 7.3 s (37.6 ms/element), 100% inside OCCT** (our
plumbing 0.2%); the boolean genuinely costs 11 ms native (35 ms in our WASM ≈ 3× native, exactly
LTO-off + single-threaded). ⚠⚠ **A `.brep` stores SHAPES, not their NAMES** — a cached load must
re-attach every `SubShapeRef`, which is the "token map" D1 forbids. **THE RULED DESIGN (keeps D1
intact):** bind by CANONICAL ORDER (D8, a rule derived from the shape, never a raw index) · emit a
`fingerprint` over each named sub-shape's measured geometry, recompute it on load, refuse with
`CACHE_STALE` on any disagreement · **a refusal costs a rebuild, never a wrong name** — the cache is a bet
the document is always free to abandon. The no-cache path stays PRIMARY forever (Miqdar has a solver, not
an OCCT kernel — it can't produce a cache even in principle). ⚠ **The hostile-BREP hardening test is a
REQUIRED deliverable** (a `.bnn` is a file a user can be SENT; the `.brep` is the one part fed as binary
to OCCT's deserializer).

**(3) Performance — ✅ RULED.** `instantiate` RESERVED (collapses a 400-wall style edit from 400 booleans
to 1 boolean + 400 cheap re-owns; the payload shape was the expensive thing to get wrong, so reserved
before the freeze). `-O3` ships (5% smaller) but **`-O3`/LTO buy NO SPEED — measured, answered, do not
re-run it** (our OCCT static libs are plain objects, not LTO bitcode, so LTO can't reach where the time
is). Multithreading (v1.0.x) is the lever that closes the 3× gap to native. ⚠ **These three levers all
attack the KERNEL REBUILD, not the renderer redraw** (§1a).

**(4) The P3 defects (Entry 19) — ✅ ALL SIX FIXED (Entry 21, revert-verified).** The Clean Delta could
not be computed from a `.bnn` (D40 fixed it) · ids were reused (D44 ULID) · reject+keep-last-good was
false for multi-element edits (D42 staged rebuild) · one unregistered type bricked the file (D43) ·
autosave recovered stale work (seeds from the store) · a dangling material gave `0 kg basis:exact`
(omitted now, D45). The spec's "token map" claim was DELETED (there was never any code).

**(5) Awareness:** the kernel is **4.19 MB gzip** — an owner call on download size is due (accept /
lazy-load / split). planegcs adds a **second ~150 KB gzip WASM** (0d — lazy-loadable behind the sketch
tool). Multithreading drags COOP/COEP + `SharedArrayBuffer` (v1.0.x).

---

## §5 — Next actions (in priority order)

> ## ⚠⚠ THE FREEZE IS REOPENED (Entry 46, 2026-07-21) — THE MVP CHECKLIST WAS CLOSED; THE REVIT-PARITY LENS ADDED PRE-FREEZE WORK.
> **Entries 44–45 closed everything the *MVP's own checklist* owed (ⓙ door-leaf, ⑥ Clean Delta, #4, ⑧, ⑨ — 310 green).
> The 2026-07-21 strategic review then measured the product against *"will it beat Revit, with the ecosystem built?"* —
> the §1b method turned on the product itself — and the owner validated nine new decisions (D58–D66). Six add pre-freeze
> work, because the contract they lean on freezes at P5.** ⇒ **NOT ready to freeze.** Land first (imp_plan "🟠 REOPENED"):
> **Ⓐ** documentation anchoring contracts (D58 — ✅ DONE Entry 47) · **Ⓑ** element composition/nesting
> **DESIGNED + BUILT** (D59 — ✅ DONE Entry 48, the real `core.curtainwall`) · **Ⓒ** co-authoring concurrency seam on the journal+`.bnn`
> (D60 — ✅ DONE Entry 49) · **Ⓓ** family-definition data-format seam (D61) · **Ⓔ** reopen gate ⑧'s analytical-anchor (D64) · **Ⓕ** MEP/DWG/
> Design-Option reservations (D62/63/65) · **plus D66** the 4-axis scale measurement (pre-freeze). **THEN the owner-gated
> freeze (step 6).** See Entry 46 + `v1.0.0_imp_plan.md` "🟠 REOPENED" + "Road to Revit parity."
>
> ## ✅✅ ALL REOPENED PRE-FREEZE WORK IS NOW DONE (Ⓐ–Ⓕ + D66's contract half) — AND THE FREEZE IS HELD ON AMER (owner, 2026-07-24).
> **Ⓐ** docs anchors (D58, E47) · **Ⓑ** nesting (D59, E48) · **Ⓒ** merge seam (D60, E49) · **Ⓓ** family seam (D61, E50) ·
> **Ⓔ** analytical anchor ruled from the Miqdar spec (D64, E52 — side-graph suffices, `Material.thermal?` reserved) ·
> **Ⓕ** MEP/systems + Design-Options reservations (D62/63/65, E53) · **D66** the scale measurement (E54 — the
> heap-eviction CONTRACT hook needs nothing, additive by construction; heap FITS at 0.31 GB; cold load ~6.35 min).
> ⚠⚠ **THE OWNER RULED HOLD ON THE FREEZE (E54): it does NOT proceed until ALL FOUR scale axes have a number + the D8
> single-thread verdict is made. The two missing axes (draw calls, edit latency) are AMER'S browser scale page** — so for
> the first time **the last pre-freeze blocker is Amer's, not Zayd's.** The contracts are safe to freeze on scale grounds;
> the owner is holding the *act* until the *measurement* is complete. **⇒ NEXT is AMER's browser measurement, THEN the
> freeze.** See Entry 54 + `P5_step9_D66_scale_design.md` §5.
>
> ## ✅✅ AMER'S TWO AXES ARE NOW MEASURED (Entry 55, 2026-07-25) — THE HOLD CONDITION IS MET. THE FREEZE IS AN OWNER ACT.
> The browser scale page (`apps/web/src/scale/`, imp_plan P4 step 9b) ran on the real kernel + real three.js + a real GPU:
> **(b) ~30,700 draw calls / ~606 ms per frame (1.6 fps)** at the 10k-element target; **(d) incremental edit ~23 ms compute
> (FLAT vs scale — 2b works, only the 3 changed parts re-tessellate) + ~570 ms post-edit render.** BOTH axes collapse to the
> ONE-MESH-PER-PART redraw wall (~30k draw calls), which **multithreading (D8) does not touch** — the fix is renderer
> BATCHING/instancing (Amer's, additive, no contract change; `instantiate` already reserved). **D8 recommendation (RAISED,
> not decided): keep MT v1.0.x — the interactive axes don't need it; cold load is its only candidate and has additive levers.**
> **⇒ all four scale axes have a number + the D8 verdict is surfaced ⇒ the Entry-54 HOLD condition is satisfied; whether to
> FREEZE (step 6) is now the owner's act.** Nothing measured forecloses a contract. See Entry 55.
>
> ## ⚠⚠ THE SWEEP WAS TAKEN INSTEAD OF THE FREEZE — AND IT FOUND ONE (Entry 57, 2026-07-25). D67 FIXED; THE FREEZE IS AGAIN THE OWNER'S ACT.
> Offered FREEZE NOW vs one more adversarial sweep, **the owner chose the sweep** (*"fix it, and keep sweeping"*) and **decided
> D8 — multithreading STAYS v1.0.x.** The sweep found **D67**: D65's exclusion invariant — which D65 had deliberately placed
> *inside the frozen contract* so Bunyan, Planitor and Miqdar would share ONE rule — **read only an element's own option tag and
> was handed no model**, so a consumer counted **4 windows where 1 was correct**, three of them hosted on the wall the same rule
> had just excluded. Pre-freeze because the defect is in the **signature** of a helper three products will call. **Fixed +
> revert-verified** (`expected 4 to be 1`); 387 green. ⚠ **The sweep's second finding is NOT freeze-blocking but is the moat's
> critical path: THE MODEL CANNOT BE ENUMERATED** — `scene.elements` misses generated children (**1 row, 17 real elements**),
> includes non-active options, and includes voids (`quantities()` still throws on the first Opening, as measured 2026-07-14 —
> **§1c-7's disease, third occurrence**). One query serves the roll-up, schedules and the Clean Delta alike. **⇒ no contract
> foreclosure beyond D67; the contracts are safe to freeze, and the freeze is the owner's act.**
>
> ## ✅✅ THE ENUMERATION QUERY + THE CLEAN DELTA EXPORTER ARE BUILT (Entry 58, 2026-07-25) — 412 green. THE FREEZE IS STILL THE OWNER'S ACT.
> Entry 57's second finding is discharged: `modelElements()` / `projectQuantities()` walk the D59 children tree, apply the
> D67 option cascade, skip no-own-parts elements **by construction**, and report the unmeasurable rather than zeroing or
> dropping it (owner Q1). The 42-day-old crashing exit criterion answers — *"how much C25/30 is in this building?"* = **3.18 m³**.
> The **Clean Delta exporter** ships on top (`contract_version 1.1`, `source bunyan`, Planitor v2.2 §4 field-for-field) with
> the journal rewind + bounded prior rebuild (owner Q2) and a **published JSON Schema** (Planitor D11).
> ⚠⚠ **Building it found TWO real defects, and the second is on the moat's load-bearing sentence:** a generated child's Type
> was unrecoverable from the built tree (so a curtain-panel schedule had nothing to group by); and **the journal was not
> recording the associative cascade at all** — 13 commands declare `rebuilt: []`, so *"a Level moved and 400 walls
> re-quantified"* reached a consumer as **`unchanged`**. Both fixed + revert-verified. ⚠ **Nothing frozen moved.**
> **⇒ §1c-7's disease, FOURTH occurrence** — a design doc named a field and nobody read it against the code. See Entry 58.
>
> ## ✅✅ THE ASSERTED-BEHAVIOUR SWEEP RAN (Entry 59, 2026-07-26) — AND IT FOUND TWO MORE. D68. 428 GREEN. THE FREEZE IS STILL THE OWNER'S ACT.
> The owner took Entry 58's raised judgement call over the freeze, and authorised the push (`origin/main` `6ec5139 → 2dd2215`,
> Entries 57+58 — **Amer had been two entries behind**). The sweep asked *"which asserted behaviours have no test that would
> fail without them?"* and answered it **mechanically**: enumerate every site that iterates `scene.elements` (14), ask of each
> *"does this aggregate or publish?"*. **Two consumers had never obeyed the D65 exclusion invariant.** The **room solver**
> reported **10,640,000 mm² where 18,240,000 is correct** (a 42% under-report on a room that is *entirely main-model*); the
> **join resolver** was sharper still because it corrupts the **built B-Rep** — *miter-against-a-ghost*, and the **AMBIGUITY
> FLIP**, where adding a facade variant that reaches an existing corner **silently un-miters a main-model corner nobody
> edited**. ⚠⚠ **THE LESSON GENERALISES PAST OPTIONS: D65 put the rule in the frozen contract and D67 fixed its signature —
> both bind the NEXT consumer and do nothing about the ones already written** (both of these shipped 07-18; the rule landed
> 07-23). **A correctness rule added to a mature codebase must be swept BACKWARD. No rule here had ever had that sweep.**
> Fix is additive (optional selection args defaulting to each set's primary + `optionScopeOf()` so the SCOPE is shared too);
> nothing frozen moved. **⇒ the freeze remains unblocked and is the owner's act.** See Entry 59 + D68.
>
> ## ✅✅ THE REMAINING BACKWARD SWEEPS RAN (Entry 60, 2026-07-27) — AND ALL THREE CAME BACK DIRTY. D69/D70/D71. 440 GREEN. THE FREEZE IS STILL THE OWNER'S ACT.
> Entry 59 listed three rules as still unswept and priced them *"cheap now, a three-product amendment after the
> freeze."* All three were swept and **all three were broken.** **Rule 16** — `partnersAt` matched endpoint-to-endpoint
> only, so a partition landing on a wall's MID-SPAN kept its plain cap and drove its last half-thickness INSIDE the
> through wall: **2.8800 m³ reported where 2.8320 m³ is true**, `basis: 'exact'` — and the over-report is *fixed per
> junction*, so it scales with the NUMBER of partitions. ⚠⚠ **A green test had pinned that exact fixture for a week**
> and asserted only the geometry and the contract-additivity, never the quantity. **Rule 12** — the published Clean
> Delta keyed materials by **display name** (rename ⇒ every work package re-keys; two materials sharing a name merge;
> an unresolvable material emits its id AS the name) while `totalsByMaterial` had always keyed by id. **Rule 5** — a
> count settled it: **51 types · 39 commands · 1 codec (in a test) · 0 views**; `FormatCodec`/`ViewDefinition` carried
> no behaviour and nothing dispatched through either, so **D63 discharged a freeze-gate row on a test that would have
> passed had `FormatCodec` been `{id}`** (its conclusion survives; its evidence did not).
> **Fixed: mid-span auto-butt (D69) · `contract_version` 1.2 with `materialId` required (D70) · `read`/`write` +
> `codecFor` + `BNN_CODEC` (D71).** All additive — no frozen byte, no schema bump, no field or verb. **⚠ OWED
> CROSS-PROJECT: `../Planitor/v2.2_spec.md` §4 must move to 1.2.** See Entry 60 + §1c-8's ledger.
>
> ## ✅✅ RULES 13 AND 15 SWEPT TOO (Entry 60 cont., 2026-07-27) — 13 CLEAN AND NOW MEASURED, 15 DIRTY TWICE. D72. 451 GREEN.
> **Rule 13 is the SECOND rule ever to come back clean** — and, like rule 6, it is now clean *by measurement*: a new
> suite pins that the PEI survives undo→redo, resize, re-issue and save→load→rebuild, and that a D59 child keeps its
> derived PEI across an edit that does not touch its slot. It had been true **by construction and by nothing else** —
> change `redo()` to re-execute instead of re-applying and every downstream binding breaks with no test going red.
> ⚠ One real defect on the way: **seven doc sites** described the derived PEI as `${parentId}/${slot}` where the code
> uses `:`; `/` is a `SubShapeRef` separator that `commands.ts` refuses in a part name, so the documented format could
> not have worked. Corrected, with the fact now exported as `DERIVED_PEI_SEPARATOR` and asserted.
> **Rule 15 was dirty on two roads (D72).** `canonical.length` was reconstructed from a param while `volume` beside it
> was measured — **2.00 m reported for a 1.9 m solid, both under one `basis: 'exact'`**, a package contradicting itself.
> And **`area` was the solid's total enclosing surface: 94.80 m² on a 15 m² paintable face.** ⚠⚠ **THE AREA FIX IS THE
> SESSION'S ONE CONTRACT CHANGE — `BuiltPart.exposedRefs?`, owner-ruled and reserved PRE-FREEZE** because only a Type
> can say which of its faces a trade bills. Openings then fall out for free (30 m² → 26 m², reveals excluded).
> **⇒ SWEEP LEDGER: 6 rules swept, 4 dirty (5, 12, 15, 16 + the D68 option invariant), 2 clean (6, 13).**
>
> ## ✅✅ THE `exposedRefs` DEBT IS PAID AND RULES 1/3/9/10 ARE SWEPT (Entry 62, 2026-07-27) — 1 AND 3 DIRTY (D74), 9 AND 10 THE FIRST CLEAN PAIR. 470 GREEN. THE FREEZE IS STILL THE OWNER'S ACT.
> Entry 61's NEXT list owed the `exposedRefs` declarations for `core.opening`/`core.curtainwall`; measured first, they were out by
> **1.07× (door leaf) · 1.71× (frame) · 2.06× (glass panel) · 3.03× (mullion)**, all wearing `basis: 'exact'` — while the façade
> ROLL-UP was out by only 1.19×, because the panels dominate the sum and were the least wrong. *A plausible total is how a per-part
> defect survives inspection.* The owner ruled **ONE rule for every Type — *exposed = every face that is a surface of the assembled
> thing*** — over the competing QS convention for glass. ⚠⚠ **Building it found `exposedRefs` reached 3 of the 4 `BuiltPart → Part`
> sites: a door leaf could not have carried a billable area even when its Type declared one** (`placeTree` spreads and inherited it;
> the three that enumerate fields did not — §1c-8 inside one commit). **Then rules 1 and 3 came back dirty together (D74): a broken
> reference OUTLIVED the element it named** — deleted elements are never rebuild roots, so the entry survived every rebuild
> *including `rebuildAll`*, was saved into the `.bnn`, and could never be retargeted ⇒ a document permanently and unfixably dirty.
> **Rules 9 and 10 are the first ever swept clean without a fix — and the reason is transferable: a violation of either could not have
> been written silently** (`validateParams` refuses an undeclared arg; `dryRun` and `applyChanges` live in the executor, where a
> command cannot opt out). ⇒ **nothing frozen moved; the freeze remains the owner's act.** See Entry 62 + D74 + §1c-8's ledger.
>
> ## ✅✅✅ THE BACKWARD SWEEP IS COMPLETE — ALL 18 DOMAIN RULES SWEPT (Entry 64, 2026-07-28). THE LAST FIVE: 14 AND 18 DIRTY (D76/D77, FIXED), 8 DIRTY AND SURFACED, 7 AND 17 CLEAN. 503 GREEN. THE FREEZE IS STILL THE OWNER'S ACT.
> **Rule 14 (D76) — the change feed could report SILENCE it had no right to.** Every mechanical half was sound and tested; the
> PRECONDITION was not. `issued_at_seq` names a position in the journal and **nothing checked the journal contained it**, so
> `since()` on a log that cannot see the baseline returns `[]` — identical to *"nothing has happened since I issued it."*
> Measured on a wall grown 6 m → 8 m after the baseline: a `.bnn` carrying its revision but no `history.json` published a valid
> **contract-1.2 package with zero elements and an all-zero summary**; one saved with `doc.history()` (the undo stack) instead
> of the journal **dropped a whole wall built after the baseline** once the 200-cap shifted. Planitor reads absence as
> *unchanged* ⇒ it keeps billing the model it has. ⚠ The detector is structural — **D41 keeps an issued revision off the undo
> stack**, so that log *cannot* contain the anchor. Refused now at all three sites, incl. `saveBnn` refusing to WRITE a file
> whose journal contradicts its own manifest; a scene-only `.bnn` stays legal and is refused only when asked for a delta.
> **Rule 18 (D77) — a style edit did not reach the CHILD elements wearing it.** `BuiltChild.styleId` is a real member and the
> build resolves it exactly as for an authored row, but the style→instance edge answered out of `scene.elements` and **a
> Model-A child is not a scene row**: `updateStyle` reported **`rebuilt: []`** and left the children's solids **3× stale**
> (20,000,000 mm³ where 60,000,000 is right) under `basis: 'exact'` — until an unrelated `rebuildAll` silently cured it, so the
> live session and the saved file disagreed and only the file was right. The section edge inherited it verbatim. ⚠ It was
> dirty against the **INVALIDATOR** while clean against every consumer — the Entry-59 sweep form could not have found it.
> **⚠⚠ RULE 8 — DIRTY AND SURFACED, NOT FIXED (owner ruling owed, cheap only until step 6):** the sweep asked *what has been
> BUILT since the reservations were made* (D58–D66 landed 07-21→07-24; D67–D75 + Entry 63 after) and found that
> **`BuiltPart.exposedRefs` (D72, 07-27) is Type-only knowledge and the D61 FAMILY GRAMMAR has no slot for it** ⇒ every
> data-authored family can only ever report the absent-defaulted whole-solid area, the number D72 measured at 1.07×–3.03×
> wrong. **The families north-star would ship permanently unable to bill correctly.** The fix is a grammar shape (how DATA
> names a face), which is a design ruling, not a mechanical change. **Rules 7 and 17 came back clean** — 7 by counting every
> boundary (and it is now ENFORCED: `tests/units-rule7.test.ts` fails on any numeric field shipped without a unit; it was the
> first rule found clean with nothing protecting it), 17 *by shape* (a `Dimension` has no value field to go stale) with one
> surfaced finding: **`Dimension.anchors` accepts the free `point` anchor**, so a dimension between two paper points — a
> number no model edit will ever update — is expressible on the one annotation a builder reads AS a measurement.
> ⇒ **no frozen byte moved, no `SCENE_SCHEMA_VERSION` bump, no field, no verb** ⇒ the freeze remains the owner's act.
>
> ## ✅✅ THE SCHEDULES BODY SHIPS (Entry 65, 2026-07-28) — D58 row Ⓐ's FIRST BODY, AND THE WRONG LOOP WAS INSIDE THE RESERVATION'S OWN PASSING TEST. D78. 517 GREEN. THE FREEZE IS STILL THE OWNER'S ACT.
> Design-first as the task required (`P5_step6B_schedules_design.md`, four questions, all four ruled). **Measured before designing:**
> a curtain-panel schedule over `scene.elements` returns **0 rows where 6 is correct** (a curtain wall is **1 authored row, 17 real
> elements**) — ⚠ *the failure mode is an EMPTY TABLE, not a crash*; a no-filter schedule **THREW** on the pure composite; and one
> non-active design option produced a **2.0000× over-report** — **D65's own named failure mode, on the consumer its sentence names
> FIRST and the only one that never had a body to fix.** ⇒ **the body consumes `modelElements()` and has no enumeration loop of its
> own, which IS its correctness** — all three close by that one decision. ⚠⚠ **THE DURABLE LESSON IS WHERE THE WRONG LOOP LIVED: it
> is the `evaluate` helper Entry 47 wrote to PROVE the reservation, green from the day it was written because its fixture is two
> plain walls.** §1c-7's disease in a new form — **the misleading artifact was a PASSING TEST, not prose**, which is worse, because
> this project's method trusts tests over claims. Retired onto the real body in the same commit. **Three pre-freeze rulings, all
> found by walking the reserved shape against a real model for the first time:** `groupBy` names **stable column keys** (the heading
> reading is **D70 verbatim**, caught before the shape had a body) · `ScheduleDefinition.designOptionIds?` reserved (`ViewCommon`
> got D65's field and the tabular view did not) · `ChildOverride.mark?` reserved (a D59 child is not a scene row, so nothing could
> carry the label a builder reads). ⚠ **Two defects in my own code, both the same conflation one level down** — a total went absent
> where 250,320,000 mm³ is right because *"no quantity by construction"* was read as *"could not measure"* (**D72's `[] vs absent`
> by a new road**), and a wholly-unknown column got no total entry at all (**rule 14's silence-as-a-fact**). Revert-verified five
> ways. **Nothing frozen moved ⇒ the freeze remains the owner's act.** See Entry 65 + D78.
>
> ## ✅✅ THE SCHEDULE CRUD SHIPS (Entry 68, 2026-07-29) — D58 row Ⓐ's SECOND UNIT. 538 GREEN, ALL FIVE GATES 0. THE FREEZE IS STILL THE OWNER'S ACT.
> The reserved shape had a reader (D78) and **no writer**: **0 of 29 commands could author a schedule**, and no documentation verb of any
> kind existed — so v1.0.0's "one schedule" (D58) could be evaluated but never created, renamed or deleted. `core.createSchedule`/
> `updateSchedule`/`deleteSchedule` land as ordinary additive registry entries (Entry 47 §7 had settled the freeze question in advance),
> and `scene.schedules` is promoted to a full `SceneCollection` — undo + a declared "nothing" dependency edge, the exhaustive switch
> refusing to compile until it was declared (Entry 33's mechanism, verified by deleting the case).
> ⚠⚠ **THE SENTENCE THAT SHAPES THE UNIT: the verbs carry the refusal the body deliberately will not.** `projectSchedule` degrades rather
> than refuses because a projection must never deny a builder his table (rule 17) ⇒ **the authoring door is the only place a malformed
> definition can be stopped, and there was no authoring door.** Measured before it existed: a `groupBy` naming a column the schedule lacks
> **collapses 2 groups into 1 keyed `[""]`** — every subtotal becoming the grand total, which is **Q1's own failure mode arriving through
> the one door Q1 did not cover**; a `quantity` key outside the grammar makes every cell **and the TOTAL NaN**, and NaN JSON-stringifies to
> **`null`**, so it reaches a consumer as *"no value"*; an unknown `source` is a raw **TypeError**; **two columns sharing one key** give 2
> headers and **ONE total** (`checkLayers`' rule one level up).
> ⚠⚠ **AND THE PROMOTION ITSELF TAUGHT SOMETHING THE DESIGN DOC HAD PREDICTED WRONG:** row Ⓐ §6 said the CRUD adds *the collection member +
> an `emptyScene()` entry + the guard*. The `emptyScene` entry turned **two GREEN Entry-47 reservation assertions RED** — and relaxing them
> was the tempting move and the wrong one. ⇒ **the collection materialises on first authoring instead**, Entry 47's tests pass
> **unmodified**, and a document with no schedules is byte-identical to one written before. *Even a design doc's own prediction of how an
> additive promotion lands is a claim that only building it can check.*
> ⚠ **`Referrer.redirect` is now OPTIONAL** (a Sheet's viewport can place a schedule, and `sheets` is a collection nothing authors — so
> D51's SET rung genuinely does not exist for it; the gap is in the type, not in the behaviour). ⚠ **One contract-touching line:
> `ParamField.refTo` gained `'schedule'`** (row Ⓕ's precedent; `view`/`sheet`/`annotation`/`family` deliberately left to the owner).
> ⚠ Also fixed: `schedule.ts` carried a **raw NUL byte** that made the file **invisible to `grep`** — on a project whose method is
> grep-based backward sweeps. Revert-verified ten ways. **Nothing frozen moved ⇒ the freeze remains the owner's act.** See Entry 68 + D79.
>
> ## 🟡 THE PLAN/SECTION DESIGN IS DELIVERED AND THE BUILD IS BLOCKED ON FIVE RULINGS (Entry 69, 2026-07-30, Zayd). NO SOURCE TOUCHED. THE FREEZE IS STILL THE OWNER'S ACT.
> D58 row Ⓐ's last two units, design-first (`P5_step6C_plan_section_design.md`) because a projected 2D view is a new KIND of
> derived artifact and D58 froze only its ANCHORING shape. **Measured first, against native OCCT (seven probes, all deleted) —
> and the headline is a contradiction inside the FROZEN protocol's own comment.** `SectionCurve.ref` says provenance is
> *"absent only where a curve has no single owner (a silhouette of a curved surface)"*; **measured, that exception is the ENTIRE
> PROJECTED HALF.** The CUT curves attribute perfectly — **4/4, 1/1 and 8/8 with zero orphans** on a 3-layer wall, a round column
> (the §1c-6 repeat offender) and a wall cut THROUGH its window — via `BRepAlgoAPI_Section.Generated()`, which is OCCT's own
> history, the channel D24 measured. The PROJECTED curves cannot attribute at all: HLR's output **shares no topology with the
> input (0 of 4 `IsSame()`)** and its finest supported granularity is the whole solid (`VCompound(shape)`, verified a genuine
> partition: 4+4=8, overlap 0) — and **`SubShapeKind` has no `'solid'` member for that to degrade into**, so a plan's projected
> half would be *anonymous polylines*, the exact outcome the op's own comment calls *"a picture, and pictures go stale."*
> ⚠ **Nothing is broken today** — no body reads the field, no `.bnn` carries a projected curve — **which is precisely why it is
> free now and an amendment across three products after P5.** ⚠ The dead end was CHECKED, not asserted: `HLRBRep_Data` does hold
> the original topology (`EdgeMap`/`FaceMap`), so per-edge provenance is a from-scratch re-implementation of an OCCT class in our
> own C++ — real work of unknown size, named so nobody re-derives it. ⚠ **A scale number the design turns on: the cut is FLAT at
> 1.28–1.31 ms/solid; HLR RISES (0.55 → 0.91 → 1.59 ms/solid), so 10× the solids costs 29× the time (≈ N^1.5).** Both measured
> facts point the same way ⇒ **recommend `mode:'cut'` only for v1.0.0**, where every curve carries full identity and the drawing
> is genuinely annotatable. ⚠ **`sectionCut` MINTS NOTHING** — a query op like `measure`/`faceFrame`; a cut curve BORROWS the
> owner face's existing token, so the tempting repair for an anonymous polyline (match it back to a face geometrically) is the
> one thing D1 forbids, and the doc says so because the likelier failure is that someone does it quietly. **Five questions put
> (§7); Q3 is Entry 68's owed `refTo` ruling, now BLOCKING a unit.** Nothing frozen moved ⇒ the freeze remains the owner's act.
>
> ## 🟡 P4.5 THE INTERACTION MODEL — DESIGN DELIVERED, AWAITING SIX OWNER RULINGS (Entry 66, 2026-07-28, Amer). NO SOURCE TOUCHED.
> The owner chose P4.5 (design-first) as Amer's task. `P4.5_interaction_model_design.md` is written and grounded against the
> real `apps/web` seams (it names `Viewport.ts`/`pick.ts`/`mesh.ts`/`runner.ts` by file): **no move verb exists** (re-verified,
> row ⓑ); the renderer already retains the `MeshBuffers` a snap needs; the kernel already has the exact spatial ops but **no
> seam lets the UI reach them** — that read-only two-tier snap seam is the phase's real work. Spine: domain rule 17 (a tool
> collects input, only a command changes the model) · the tool state machine · the two-tier snap seam (browser index + kernel
> confirm) · preview-is-never-truth · numeric entry. **The two pre-freeze rows are surfaced with proposed shapes and flagged
> freeze-SAFE-but-not-free (Entry 45's judgement stands): ⓑ the move/placement arg shapes (Q4) and ⓘ exercising
> `UndoableEdit.transactionId` via the corner-drag (Q5) — D52 already made "drag the wall's end" one `setParams` edit.**
> ⚠ **The design-first spine is BLOCKED on Q1–Q6 (design §12).** Nothing frozen moved ⇒ the freeze remains the owner's act.
> See Entry 66 + D47.
>
> ## ✅ P4.5 NON-GATING HALF SHIPPED — SELECTION + VIEW FILTER + THE FIRST KEYBOARD OWNER (Entry 67, 2026-07-28, Amer). 524 GREEN, ALL 5 CI GATES 0.
> Owner said "go for next entry"; the spine waits on Q1–Q6, so per Entry 66's own "NOT RULED" branch I built the part of P4.5
> that needs no ruling and touches no frozen contract (design §7/§8): **selection highlight · hide/isolate · type + discipline
> view-filter · the app's first-ever `keydown` handler** (Esc/undo/redo). The one decision: it is a **pure predicate over the
> existing `renderParts` array** — dropping a part IS hide (the viewport's `plan.remove`), a changed colour IS selection (the
> existing recolour path) — so `Viewport`/`PartBatch`/`pick`/every seam are untouched. New pure `apps/web/src/view/viewFilter.ts`
> (+7 headless tests); wired into `App.tsx` with a View panel. Browser-verified (clean boot, filter/isolate/Esc exercised live,
> zero console errors) + headless (524 pass). ⚠⚠ **`format:check` PASSES for the first time since Entry 59 — by formatting
> BEFORE verify, not by luck.** Nothing frozen moved ⇒ the freeze remains the owner's act. See Entry 67.
>
> ## ✅✅ STEP 0 IS CLOSED — BOTH SOLVERS + 0c JOINS ARE BUILT + GREEN (0d E40, room-bounding E41, 0c E42).
> All of D50 step 0 is done: **0a–0g**, **0d (real planegcs, D26 revert-verified)**, the **room-bounding
> solver (D55, Entry 41)**, and now **0c wall-to-wall joins (Entry 42 — auto-miter, anti-fuse gate green,
> the real D52 Wall pulled forward into `@bunyan/types`).** ⚠⚠ THE ANTI-FUSE RULE HELD (a join reshapes only
> the cap; side faces keep their tokens, D26). The types (steps 4–5) + MVP gates are also DONE (Entries 44–45).

**For Zayd (kernel / document / headless) — the close-order:**

1. **✅ DONE — 0d THE SKETCH CONSTRAINT SOLVER** (Entry 40). Real `@salusoft89/planegcs` behind a
   `SketchSolver` seam (`@bunyan/document` stays pure; `MockSketchSolver` tests the seam; `PlanegcsSolver`
   in the new `@bunyan/sketch-solver` package). Sketch geometry on `params` (Q1=A, no `.bnn` bump);
   `SketchConstraint` a union member (Q2) via dedicated `create/deleteSketchConstraint`; the full named set
   (Q3). **D26 held + revert-verified**; over-constrained refuses at build time (D42). ⚠ `tangent`/arc are
   frozen in the CONTRACT but the solver impl is lines + the 7 point/line constraints — a swappable v1.0.x
   extension, no freeze risk. Feeds step 2 (2D sketching). Did NOT touch the frozen kernel protocol.
2. **✅ DONE — THE ROOM-BOUNDING SOLVER** (Space extent Option B, D55 — Entry 41). Designed
   (`P5_step1_room_bounding_design.md`), owner ruled Q1–Q5, built pure-TS document-layer 2D behind a
   `RoomSolver` seam (`packages/document/src/room.ts` + `DocumentContext.roomMetrics`). Inner-finish-face area
   + perimeter + prismatic volume, derived on demand (never stored/cached). **Freeze-Gate ⓞ resolved**
   (openings don't leak rooms). No frozen byte moved. **Estimate re-inverted: ~1 session, not 5–8.**
3. **✅ DONE — 0c — WALL-TO-WALL JOINS** (Entry 42). Auto-miter on proximity (owner Q3) + `core.setJoin`/
   `core.clearJoin` overrides (butt/mitre/none); the real D52 Wall pulled forward into `@bunyan/types`
   (`core.wall`). ⚠⚠ **THE ANTI-FUSE RULE HELD** — the wall builds as an extruded plan polygon in fixed
   segment order, a join reshapes only the CAP, side faces keep byte-identical `lateral.k` tokens (D26).
   The anti-fuse gate + the bidirectional join edge are revert-verified. Did NOT touch the frozen kernel
   protocol; `JoinConstraint` is the `Constraint` union's additive third member.
4. **✅ DONE — THE TYPES (steps 4–5) + the MVP-checklist gates** (Entries 44–45). ⓙ resolved (`core.opening`
   Door builds a leaf via `buildLeaf`, no new frozen field, revert-verified); ⑥ Clean Delta designed (no
   frozen change, `P5_step6_clean_delta_design.md`); #4 mid-span additivity confirmed; gates ⑧/⑨ discharged;
   the join-drift gap fixed (Entry 45, offsetU anchors to the baseline). 310 green.
5. **THE REOPENED PRE-FREEZE WORK (Entry 46, D58–D66). ⚠ THE FREEZE IS NOT READY UNTIL THESE LAND. Ⓐ + Ⓑ + Ⓒ + Ⓓ DONE
   (Entries 47–50); ⏭⏭ START HERE = Ⓔ.** Mostly reservations + one gate re-examination; the builds so far (Ⓐ anchors,
   Ⓑ nesting, Ⓒ merge seam, Ⓓ family seam) are done. All are contract-shaping and therefore genuinely pre-freeze. Order (see imp_plan "🟠 REOPENED"):
   - **Ⓐ D58 — documentation anchoring contracts. ✅ DONE + GREEN (Entry 47, `P5_step5A_documentation_
     anchoring_design.md`).** Reserved on `scene.json` as four OPTIONAL, absent-defaulted collections
     (`views`/`annotations`/`schedules`/`sheets`; `documentation.ts`): a `ViewDescriptor` (plan/section/
     elevation/3d union), an `AnnotationAnchor`-based Dimension/Tag (ref/vertex/element/point union), a
     `ScheduleDefinition` bound to type/param/quantity KEYS, a Sheet nesting Viewports. Gate ⑨ WIDENED
     (`tests/documentation-anchoring.test.ts`, +8, real OCCT): a Schedule's type/param/quantity keys
     re-derive across a resize (the row ⑨ never covered), a Dimension's `SubShapeRef`s stay byte-identical,
     the whole surface round-trips. No frozen byte moved, no `SCENE_SCHEMA_VERSION` bump, no verb owed (a
     documentation command is an additive registry entry, D19 — distinct from ⓣ). 319 green.
   - **Ⓑ D59 — element composition / nesting. ✅ DONE + GREEN (Entry 48, `P5_step5B_composition_nesting_
     design.md`).** Owner ruled Q1–Q5 (Model A = DERIVED children; curtain wall; a tree; reserve the override
     patch; `parentElementId` re-pinned to groups). Built the frozen surface (`BimObjectType.buildChildren?` +
     `BuiltChild`, `ElementGeometry.children?`, `Element.childOverrides?`/`ChildOverride`), the recursive engine
     (`buildChildrenTree`/`placeTree`, cycle guard, subtree supersede/sweep), and the real shipped
     `core.curtainwall` (4 types, genuinely depth-2: wall → columns → panels + mullions). **Anti-fuse held**
     (a panel token byte-identical across a `cols` change); quantities roll the tree up to glass m² + aluminium
     kg per child per material. No frozen byte moved, no `SCENE_SCHEMA_VERSION` bump. `tests/composition-
     nesting.test.ts` (9, real OCCT), revert-verified. 328 green.
   - **Ⓒ D60 — co-authoring concurrency/merge seam. ✅ DONE + GREEN (Entry 49, `P5_step5C_coauthoring_merge_
     seam_design.md`).** Owner ruled Q1–Q4 (all recommended): `(origin,id)` global key with `edit.id` unchanged;
     a Lamport scalar; a revision `frontier`; a manifest `documentLineage`. Reserved four optional absent-defaulted
     fields — `UndoableEdit.origin?`/`lamport?`, `ModelRevision.frontier?`, `Manifest`/`SaveOptions.documentLineage?`
     — proven additive by a pure commutative `mergeOrdered()` (`tests/coauthoring-merge-seam.test.ts`, 9). The §1b
     method found 3 foreclosures: `edit.id` is `seq`-derived not a ULID; `issued_at_seq` is a scalar cut; an
     un-issued `.bnn` has no doc identity. **No `scene.json` touch, no `SCENE_SCHEMA_VERSION` bump, no verb, no
     backend (D37 intact).** Revert-verified. 337 green.
   - **Ⓓ D61 — family-definition data-format seam. ✅ DONE + GREEN (Entry 50, `P5_step5D_family_seam_design.md`).**
     Owner ruled Q1–Q3 (Q1 embedded in `scene.json`; **Q2 = a FULLY-SHAPED grammar now**, not the recommended opaque
     envelope; Q3 prefixed ULID). Reserved `Scene.families?` (the `views`/documentation precedent — one optional
     absent-defaulted collection, no schema bump) + a fully-shaped, discriminated-union `FamilyDefinition` grammar
     (`families.ts`: params + `box`/`extrude`/`revolve` primitives + `chamfer`/`fillet` modifiers + `FamilyChildPlacement`
     nesting + `FamilyHosting` — a data door; every scalar a `FamilyValue`, a `formatVersion` for evolution). **The §1b
     finding, PROVEN not assumed: a data family needs NO new `BimObjectType` field** — it is a `BimObjectType` a loader
     produces by closing over the def. `tests/family-seam.test.ts` (4 — a fully-shaped def, built FROM the round-tripped
     `.bnn`, drives a real OCCT element with exact quantities; the whole grammar round-trips). No frozen byte moved, no
     `SCENE_SCHEMA_VERSION` bump, no verb, no backend. Revert-verified. 341 green.
   - **✅ Ⓔ D64 — DONE (Entry 52): RULED FROM EVIDENCE — the PEI-bound side-graph suffices; reserve NOTHING analytical
     on the type/part.** The proper Miqdar spec was built first (**`~/projects/Miqdar/`** — spec + register + current_state
     + decisions, Miqdar Entry 1); its **real-frame walk (§4)** earned the answer: every idealization datum is either
     already-readable from the frozen contract or **many-valued per physical element** (cracked stiffness is gross +
     0.35EI *at once* ⇒ not an element property, even in principle). The anchor is `physicalBinding` on **Miqdar's**
     entities, pointing in. **The ONE exception is NOT an analytical anchor: `Material.thermal?` (D64/M18, owner-ruled) —
     a physical material property reserved for the energy north-star**, landed in `entities.ts`, revert-verified
     (`tests/analytical-anchor-d64.test.ts`, 345 green). Gate repointed at the new spec (§4g); Bunyan copies retained +
     `SUPERSEDED`-headed (M22).
   - **✅ Ⓕ D62/63/65 — DONE (Entry 53, `P5_step5F_reservations_design.md`).** Owner ruled Q1/Q3/Q4/Q5.
     **RESERVED (owed):** `scene.systems?` + `Element.systemId?`/`connectors?` (D62, `systems.ts`);
     `scene.designOptions?` + `Element.designOptionId?` + `ViewCommon.designOptionIds?` (D65,
     `designoptions.ts`); the three `createElement` args + `refTo` widened to `'system'`/`'designOption'`
     (the **ⓣ lesson applied before it bit again**). **NOTHING OWED (the findings):** the MEP sweep op
     (additive under D13 — `faceFrame` already landed post-freeze); the **DWG seam ALREADY EXISTS**
     (`FormatCodec` + `registries.codecs`, domain rule 5); phase filters (a view property over existing
     datums); area schemes (a *derived-query* extension — an area was never stored). ⚠⚠ **The one thing
     HARDER than billed: the design-option EXCLUSION INVARIANT** — mutually-exclusive elements mean
     `quantities()`/Clean Delta/schedules **must exclude non-active options** or double-count; owner ruled
     it into the frozen contract (`isElementActive`, the ⓥ precedent). No schema bump; revert-verified.
   - **D66 — the 4-axis scale measurement** (pre-freeze): partly Amer's (renderer), but the **heap-eviction
     contract hook is Zayd's and is pre-freeze** — "must be known before P5 freezes." A failed single-thread
     target reopens D8.
   - **THEN the owner-gated FREEZE (step 6)** — now also tagging the Ⓐ–Ⓕ reservations frozen.
5b. **✅ DONE — THE ENUMERATION QUERY + THE CLEAN DELTA EXPORTER (Entry 58, `P5_step6A_enumeration_design.md`).**
   Owner ruled Q1 (`unmeasured[]` beside the totals) / Q2 (rewind the journal + rebuild only the delta) / Q3 (both units
   in one build). `enumerate.ts` = the ONE walk three consumers share; `cleandelta.ts` = `journal + revN →
   CleanDeltaPackage` (Planitor v2.2 §4, contract 1.1) + `schema/clean-delta-1.1.schema.json` (Planitor D11).
   ⚠⚠ **Two defects found by building it:** a generated child's Type was unrecoverable from the built tree; and **the
   journal recorded `rebuilt: []` for 13 commands, so the ASSOCIATIVE CASCADE — the moat's own example — reached a
   consumer as `unchanged`.** ⚠⚠ **A POST-BUILD ADVERSARIAL SWEEP OF THE EXPORTER THEN FOUND THREE MORE** — a non-active
   design option emitted as a GHOST ROW; an edit-then-undo reported as a spatial move that never happened; a generated
   child whose slot vanished silently absent from the package. All five fixed, **each revert-verified**, no frozen shape
   touched. **417 green.**
5c. **✅ DONE — THE SCHEDULES BODY (Entry 65, D78) AND ITS CRUD (Entry 68, D79).** Owner Q4 deliberately split them:
   the evaluator first (`schedule.ts` + `DocumentContext.evaluateSchedule`), then the authoring verbs + the
   `SceneCollection` promotion. ⏭ **What row Ⓐ still owes v1.0.0 is the OTHER two minimal-2D bodies — ONE PLAN and ONE
   SECTION** (D58). `sectionCut` is already reserved in the frozen protocol, so the op is additive under D13; the
   `views` collection promotes the same way `schedules` just did (member + guard + edge — and note Entry 68 found the
   `emptyScene` entry is NOT part of that package). ⚠ Read Entry 65's and Entry 68's closing notes first: **reserving a
   shape and building its body are two different verifications.**
5d. **🟡 THE PLAN/SECTION DESIGN IS DELIVERED — BUILD BLOCKED ON FIVE RULINGS (Entry 69, `P5_step6C_plan_section_design.md`).**
   Design-first, and the walk against real OCCT found the frozen `SectionCurve.ref` comment is **false about the projected
   half**: cut curves attribute perfectly (4/4, 1/1, 8/8, zero orphans — incl. a round column and a wall cut through its
   window), projected curves cannot attribute at all (HLR output shares no input topology; per-SOLID is its finest supported
   granularity and `SubShapeKind` has no `'solid'` member). ⚠ Free now, an amendment after P5 — nothing reads the field yet.
   **Q1 recommend `mode:'cut'` only for v1.0.0** (full identity + linear cost; HLR is ≈N^1.5). **Q2 recommend
   `SectionCurve.nodeId?`** over widening `SubShapeKind`. **Q3 is Entry 68's owed `refTo` ruling and it now BLOCKS this unit.**
   ⚠ The build reuses Entry 68's promotion verbatim **including its correction — no `emptyScene()` entry.**
6. **Still owed, lower priority (post-freeze / v1.0.x):** the D29 cache bodies (§4j-2 — read first) · the
   join O(N²) endpoint index (`review_P5.md` #3 — no contract change) · housekeeping (`LICENSE` AGPL-3.0,
   the CLA, the OCCT + planegcs attribution notices — none blocks work, all block going public) · then the
   **"Road to Revit parity"** phase map (imp_plan appendix) — the taxonomy, full documentation, MEP,
   families, worksharing, DWG, scale. *That is the actual distance to beating Revit; v1.0.0 is its foundation.*

**✅ CLOSED, DO NOT REDO:** the op set (`transform`/`extrude`/`chamfer`/`revolve`/`faceFrame`) ·
`measure(ref)` + derived `capabilities` + `INVALID_RESULT` · the positional key (D28) · the protocol
freeze (D13) · CI (all five steps pass here) · the document model + agent surface + `.bnn` + undo +
broken-ref state + cascade delete (Entry 18) · all six P3 defects + D40–D46 (Entry 21, revert-verified) ·
`-O3`/LTO (MEASURED — no speed; do not re-run) · the heap ceiling (Entry 29 — it fits) · **domain rule 6 / the
canonical re-sort (Entry 59 — MEASURED by deleting it and rebuilding: 2 naming tests fail, and they fail as a
`UNRESOLVED_SUBSHAPE_REF` REFUSAL, never a wrong name; no comparator reads a traversal index; `rowLess`/`sameDerivation`
agree on all 7 fields so `std::sort` is not misused ⇒ the D8/MT unlock carries no hidden identity risk)** ·
**the backward sweeps of domain rules 5, 12 and 16 (Entry 60 — all three found defects, all three fixed and
revert-verified: mid-span T-junctions now auto-butt so quantities stop double-counting D69; the Clean Delta carries
`materialId` at contract 1.2 D70; the codec seam dispatches and `.bnn` is registered through it D71)** ·
**the backward sweeps of domain rules 1, 3, 9 and 10 (Entry 62 — 1 and 3 dirty together and fixed: a broken reference
outlived the element it named, D74, revert-verified by undo bringing it back; 9 and 10 CLEAN, verified by counting
`argsSchema` against what each `execute` reads and by the executor owning `dryRun`) + the OWED `exposedRefs`
declarations for `core.opening`/`core.curtainwall` (D72's debt, closed)** ·
**the backward sweeps of domain rules 7, 8, 14, 17 and 18 (Entry 64 — ⇒ ALL EIGHTEEN RULES ARE NOW SWEPT, nine dirty.
14 and 18 fixed + revert-verified (D76: a delta read from a log that cannot see its baseline is REFUSED, not answered
`[]`; D77: the style/section invalidator edges reach generated child elements); 7 and 17 clean, with rule 7 now
ENFORCED by an enumerating test; ⚠ RULE 8's foreclosure — the family grammar has no slot for `exposedRefs` — is
SURFACED AND OWED AN OWNER RULING, and rule 17's free-`point` Dimension anchor with it)** ·
**THE SCHEDULES BODY (Entry 65, D78 — D58 row Ⓐ's first body: `schedule.ts` + `DocumentContext.evaluateSchedule`,
consuming `modelElements()` so a curtain-panel schedule returns 6 rows not 0, a composite does not throw, and a
non-active option's 2.0000× over-report is gone; owner Q1/Q2/Q3 ruled — `groupBy` keys by stable column key,
`ScheduleDefinition.designOptionIds?` + `ChildOverride.mark?` reserved; the Entry-47 naive evaluator RETIRED onto
the real body; revert-verified five ways)** ·
**THE SCHEDULE CRUD (Entry 68, D79 — row Ⓐ's second unit: `core.createSchedule`/`updateSchedule`/`deleteSchedule` +
`scene.schedules` promoted to a full `SceneCollection` with undo and a declared "nothing" edge; the verbs carry the
refusals the projection body deliberately will not — bad groupBy keys, out-of-grammar column keys, duplicate column
keys, blank/zero-column schedules; `Referrer.redirect` made optional for a reference nothing can retarget yet;
revert-verified ten ways)** · D50 step
0a/0b/0e/0f/0g (Entries 33–38) · **0d the sketch constraint solver (Entry 40 — real planegcs, green)** ·
the **room-bounding solver (Entry 41)** · **0c wall-to-wall joins (Entry 42 — auto-miter, anti-fuse gate
green, real Wall in `@bunyan/types`). ⇒ ALL OF D50 STEP 0 IS CLOSED.**

**For Amer (browser hot path):** ✅✅ **THE PRE-FREEZE BLOCKER IS DISCHARGED (Entry 55, 2026-07-25).** The owner held the
freeze until **all four D66 scale axes have a number + the D8 verdict is made**; the two headless axes were Zayd's (heap
FITS at 0.31 GB; cold load ~6.35 min) and **the two browser axes are now measured on a real GPU: (b) ~30,700 draw calls /
~606 ms per frame (1.6 fps) at target; (d) incremental edit ~23 ms compute (FLAT vs scale — 2b works) + ~570 ms post-edit
render.** Both collapse to the ONE-MESH-PER-PART redraw wall; the fix is renderer BATCHING/instancing (additive, no
contract). D8 verdict RAISED (not decided): the interactive axes don't need multithreading ⇒ recommend MT stays v1.0.x.
**⇒ the HOLD condition is met; the FREEZE (step 6) is now an owner act.** The scale page is `apps/web/src/scale/` +
`scale.html` (P4 step 9b, gated). ✅✅ **THE RENDERER BATCHING/INSTANCING REWRITE IS NOW DONE (Entry 63, P4 step 9(b)):
~30,700 draw calls → 2 at the 10k target (606 ms → ~10–14 ms, 1.6 → ~80 fps), the Entry-55 (b)+(d) wall gone; a
`THREE.BatchedMesh` (faces) + one batched `LineSegments` (edges) inside `Viewport`, picking/2b/D30 all preserved, no
frozen contract touched, `P4_step9_renderer_batching_design.md`.** It was post-freeze / parallel — additive, below every
frozen contract, never a freeze blocker. — P4 steps done through Entry 27 (the
gate now sees `apps/web`; incremental redraw; sub-shape picking; the failure-state panels; the D19
equivalence test). ⚠ Build against
`@bunyan/document`, never the kernel (D19 — enforced by `d19-boundary.test.ts` + the package boundary;
the one allowed `KernelClient` holder is `apps/web/src/bootstrap.ts`). **An element is its PARTS (D30) —
tessellate each.** Remaining: **P4.5** (the interaction model — the tool state machine, snapping, preview,
numeric entry; do not start the wall tool before the baseline-Wall parameterisation is in — D52 rules
it) · browser storage (`StorageAdapter` over FSA/OPFS/IndexedDB; `list()` MUST return existing keys) ·
WebGPU + fallback, service worker/PWA, Cloudflare deploy · the typed-`SUPERSEDED` propagation (Zayd's
package, coordinate). ⚠ Key changes since Entry 18: `planDelete()` gone (use `dryRun`); `discipline` on
the part; ids are ULIDs (never parse/render them — use `element.name`); `mass` may be absent (render "—",
never "0 kg"); on save persist `saveBnn(scene, { journal: doc.changeFeed(), revision: doc.revision })` —
`doc.history()` there is the moat-losing bug.

---

## §6a — BOX DISCIPLINE (owner ruling, 2026-07-11 — binding)

**Full text: box-local `cross_projects_policy.md` §6/§6a.** The dev box is small (~3.7 GiB RAM + 2 GiB
swap) AND it is the production host for two live public sites — **an OOM here can take the owner's public
sites offline.**

1. **Never run anything that would overload the box.** Constrain at the source (cap Docker memory, cap
   `-j`). If a run can't be made safe, **escalate** with the numbers.
2. **PRE-AUTHORIZED to pause** (graceful `docker stop` only; never `kill`/`rm`/remove a volume; check that
   project's `current_state.md` for active work; restore + verify after): **Planitor** (`planitor-pg`),
   **Chantier_Manager** (`chantier_test_pg`/`chantier_test_redis` — `restart=no`, won't come back on their
   own), **Portique_Designer**, **SmartBar**.
3. **⚠⚠ HARD LIMIT — NEVER, including box strain:** `portfolio-caddy-1` (live `beam-stack.com` +
   `daoudi.beam-stack.com` on :80/:443) and `beamstack-contact` (real inbound leads). This box is their
   production box.
4. **Before pausing anything, `du -sh /tmp`** — it is tmpfs (RAM); our own dead scratchpads are usually
   the hog. All other projects' containers combined use ~77 MB.
5. **Record any pause + restore** in the box-local `last_session_work.md`.

---

## §6 — Environment & commands (dev box)

```bash
# ⚠ pnpm is corepack-only — NOT on PATH, NOT at ~/.npm-global/bin. Drop a shim for the session:
mkdir -p ~/bin && printf '#!/bin/sh\nexec corepack pnpm "$@"\n' > ~/bin/pnpm && chmod +x ~/bin/pnpm
export PATH="$HOME/bin:$PATH"

pnpm install
pnpm verify          # THE CI STEP LIST EXACTLY: typecheck (incl. apps/web) + lint + format:check + test + reseed:check
pnpm format:check    # ⚠ CI runs this BEFORE the tests — it silently failed every push for 7 entries

# Change the kernel's C++ and re-test: ~60 s (OCCT's static libs are prebuilt). Only a VERSION bump costs 2.5 h.
SPIKE=$HOME/occt-wasm-spike;  REPO=$HOME/projects/Bunyan/tools/kernel-build
docker run --rm --memory=2g --cpus=2 --user "$(id -u):$(id -g)" \
  -v "$REPO:/work" -v "$SPIKE/install:/install:ro" \
  emscripten/emsdk:latest bash /work/link.sh
cp $REPO/dist/bunyan-kernel.{js,wasm} $HOME/projects/Bunyan/packages/kernel-occt/wasm/ && pnpm verify

# Offline golden seeding (NEVER in CI): cd tools/oracle && VIRTUAL_ENV=$PWD/.venv uv run seed-goldens ../../tests/goldens
# The native-OCCT oracle is also a MEASURING instrument (`.venv/bin/python`, `from OCP.… import …`).
```

- **Node** 20.20.2, **pnpm** 10.34.5 (corepack only), **uv** 0.11.20 (`~/.local/bin/uv`). **`libgl1`**
  installed (OCP → VTK → `libGL.so.1`). No system pip/venv — always `uv` (policy §8).
- ⚠ **`verify` = the CI step list, EXACTLY** (Entry 24/25): a local gate that is a strict SUBSET of CI is
  a false-negative generator. `.prettierrc` has `endOfLine:"auto"` so `format:check` is green on both
  Windows (CRLF) and CI (LF).
- No ports bound, no containers created, no other project touched by this work.

---

## §7 — Entry log (the newest 15 entries, in full)

**⚠⚠ THE OLDER ENTRIES ARE NOT GONE — THEY ARE IN `history.md`, SUMMARIZED.** This section holds only the
**newest 15**, because this file is read IN FULL by every agent on every session and its length is a cost
paid on every run. `history.md` carries the **complete registry, entry 1 to today**, compressed to what a
future agent could still need; the uncompressed narrative of every entry is in git history.

**⇒ IF YOU ARE STUCK, OR SOMETHING HERE ASSUMES CONTEXT YOU DO NOT HAVE, READ `history.md`.** It is where
*"why is this shaped this way?"*, *"has this been tried?"* and *"what did that D-number cost to learn?"*
are answered. §1–§5 carry every durable lesson (that is what makes compressing the entries safe), but the
session that EARNED a rule — with its measurement — is in `history.md`.

**⚠ THE ROTATION RULE (binding, and it is YOUR job when you notice it): whenever this section holds MORE
THAN 20 entries, compact it — keep the newest 15 here, and summarize the rest into `history.md`** (its own
header states the procedure, including the check that a dropped entry's durable lessons are already
promoted into §1–§5 first). **The compaction is maintenance, not work: it does NOT get an entry of its own.**

### Entry 54 — 2026-07-24 — Zayd — **D66 CONTRACT HALF DONE: THE HEAP-EVICTION HOOK NEEDS NOTHING RESERVED (additive by construction) — SO THE CONTRACT IS SAFE TO FREEZE ON SCALE GROUNDS. THE REMAINING SCALE WORK IS AMER'S AND BELOW THE FREEZE LINE.**
**Task (owner):** "commit then start D66." Committed Entries 52+53 (`origin/main` @ `e737aa9`) + Miqdar Entry 1 (local
`26b442c`, no remote), then started D66 — the last pre-freeze item. `P5_step9_D66_scale_design.md`. **No code change**
(an evidence-based contract ruling, like D64); the two headless scale harnesses re-run green as part of the suite.

- **⚠⚠ THE ONLY FREEZE-GATING PART OF D66 IS THE HEAP-EVICTION CONTRACT HOOK — and it is RULED: reserve NOTHING,
  ADDITIVE BY CONSTRUCTION.** The imp_plan feared heap-eviction/lazy-build might be a v1.0.0 requirement that *touches
  contracts*. Two findings retire it: **(i)** the heap FITS (below), so eviction is not required; **(ii)** even as a
  v1.0.x option, eviction FORECLOSES NOTHING — the same recipe-is-truth logic that earned D64. Verified against code:
  - *"any built solid may be dropped and rebuilt from the recipe"* = **the core invariant** (rule 1), and the D29
    cold-load test **proves it** (a fresh `DocumentContext` rebuilds every solid from `scene.json` alone, byte-identical,
    `brokenRefs()==0`; if the WHOLE model rebuilds, any SUBSET does — that IS lazy-build/eviction).
  - the evicted state already exists: **`ElementState.stale`** = recipe present, solid not built.
  - the release mechanism is **ALREADY FROZEN**: **`releaseShape`** is in the frozen protocol (P3), and the kernel-client
    **already fires it** for dropped handles (`kernel-client/src/client.ts:9`).
  - the keep-live POLICY (which solids to hold, by camera/selection/viewport) is **RUNTIME state, never `scene.json`**
    (persisting it would violate recipe-is-truth exactly as storing a mesh would) ⇒ **no frozen-type field.**
  - the build/evict-on-demand API is an **additive DocumentContext method** (D19/rule 5), not an edit to a frozen shape.
  ⇒ **The freeze does not — and could not — foreclose eviction, because eviction is recipe-is-truth exercised on a
  subset.** D64's finding in a second guise: a runtime concern binds to the recipe; nothing new on the frozen data shapes.
- **MEASURED FRESH (2026-07-24, this box, box healthy — 854 MB free / 2.28 GB avail; the heap harness is capped at ~310
  solids and extrapolates via a slope, never building 16k solids on a 3.7 GB box):**
  - **(a) HEAP: 16.2 KB/live-solid + 64 MB floor → 0.31 GB at 10,000 elements. FITS** (1.5 GB tab budget; 4 GB WASM32
    cap). Confirms Entry 29 on the current kernel. The harness's own verdict: eviction stays a v1.0.x option.
  - **(c) COLD LOAD: 38.1 ms/element → ~6.35 min at 10k, single-thread, NO cache.** Too slow for a good first-load UX —
    but every lever is already-ruled and **additive**: the D29 BREP cache (RULED SHIP; its ops reserved), `instantiate`
    (RESERVED), multithreading (D8, v1.0.x — deploy config, not a `scene.json` contract). **None touches a frozen shape.**
  - **(b) DRAW CALLS + (d) EDIT LATENCY: Amer's — browser-side, unmeasurable headless.**
- **⚠ THE O(N²) JOIN RESOLVER IS NOT IN THESE NUMBERS, AND THAT IS CORRECT.** The scale fixture's wall is
  `{length,height}`-parameterised, so `baselineOf` returns undefined and `resolveJoins` early-returns — the scan never
  fires. review_P5 #3 already measured it in isolation (~4.2 s at ~2,000 walls) and **ruled it a v1.0.x perf item, NOT a
  freeze item** (fixable with an endpoint spatial hash, no contract change). Re-deriving it is not the freeze-gating work.
- **⇒ THE CONTRACT IS SAFE TO FREEZE ON SCALE GROUNDS.** The only scale question that could foreclose a contract — the
  heap-eviction hook — is resolved (reserve nothing). Every remaining lever (cache, instantiate, MT, renderer batching)
  is additive.
- **⚠⚠ OWNER RULED THE FREEZE-READINESS QUESTION: HOLD (2026-07-24).** I put FREEZE NOW (recommended — contract safe,
  remaining perf additive) vs HOLD (wait for Amer's numbers). **The owner chose HOLD:** the freeze does NOT proceed until
  **all four scale axes have a number** and the **D8 single-thread verdict** is made. ⇒ **THE LAST PRE-FREEZE BLOCKER IS
  NOW AMER'S, NOT ZAYD'S** — the two missing axes (draw calls, edit latency) are the browser scale page (imp_plan P4 step
  9b), which a headless box cannot run. Nothing about the contracts changes; the owner is holding the *act* until the
  *measurement* is complete (a higher bar than "the contract is safe," and his to set).
- **⚠ Entry 54 = docs only; owner ruled COMMIT + PUSH.** Committed + pushed with this entry (see below). Box: read +
  measure only; nothing installed, no containers touched, no ports bound; the scale harnesses stayed within box limits.

**NEXT — ⚠ THE FREEZE IS BLOCKED ON AMER, FOR THE FIRST TIME:**
- **Amer (browser, THE pre-freeze blocker):** build the scale page (imp_plan P4 step 9b), produce **draw calls** +
  **edit latency** at ~10,000 elements with a written recommendation each — the two numbers the freeze now waits on.
  Then the **D8 single-thread verdict** (renderer wall vs kernel wall) can be made.
- **Zayd (headless):** the D66 contract half is done; nothing further owed until the freeze is called. Heap + cold-load
  stand (Entry 54 §1); the join O(N²) is a v1.0.x perf item (review_P5 #3).
- **The FREEZE (step 6)** unblocks only once those two axes exist + the D8 call is made — then the Architect signs off and
  the contracts freeze (tagging the Ⓐ–Ⓕ reservations + `Material.thermal?`). ⚠ **Committed + pushed: Entries 52+53+54.**

### Entry 55 — 2026-07-25 — Amer — **D66 AXES (b) + (d) MEASURED IN A REAL BROWSER: THE LAST TWO SCALE NUMBERS EXIST. BOTH COLLAPSE TO ONE WALL — THE ~30k-DRAW-CALL ONE-MESH-PER-PART REDRAW — WHICH MULTITHREADING (D8) DOES NOT TOUCH. THE FIX IS RENDERER BATCHING, ADDITIVE, NO CONTRACT CHANGE.**
**Task (owner, via the Entry-54 hold):** build the browser scale page (imp_plan P4 step 9b), load a ~10k-element model,
and produce a real number for **(b) draw calls / frame time** and **(d) edit latency** at ~10,000 elements, each with a
one-paragraph recommendation; **raise D8 (pull multithreading into v1.0.0?) with the owner — do not decide it.** Built the
page, ran it on the real OCCT kernel + real three.js on this box's real GPU. `pnpm verify` fully green (**370 tests, +6**;
typecheck incl. apps/web, lint, format, reseed). ⚠ **No commit — owner-gated.**

- **WHAT I BUILT (`apps/web/src/scale/` + `scale.html`, plan P4 step 9b — the browser half the headless box cannot run).**
  A dedicated scale page that boots the REAL kernel + document through `bootstrap()` (**D19 — the app never holds a
  `KernelClient`; it authors through `DocumentContext` and draws through `RenderGateway`**), builds a small REAL reference
  set of composite walls through the command layer (D30 — an element is its PARTS; each layer tessellated), then fills ONE
  three.js scene — mirroring the shipped `Viewport` byte-for-byte (I EXPORTED `toBufferGeometry`/`buildEdgeSegments`/
  `createPartMaterial`/`EDGE_COLOR` so the harness builds meshes with the *identical* code path, not a lookalike) — to the
  ~16,000-part target and measures. ⚠ **NO BATCHING (plan step 9b is explicit): measure the as-built one-mesh-per-part
  architecture FIRST; batching is the decision the number informs, not a thing to sneak in — "a rewrite, not an
  optimisation".**
- **⚠ METHOD — the same discipline the headless harnesses use, and box-safe (§6a: 3.7 GB RAM, live public sites).** The
  renderer axes are a function of what is IN the scene (draw calls + triangles), not of how the geometry was produced — a
  box the kernel built and a box cloned from it render identically. Building 16k real OCCT solids in a tab is ~10 min and
  strains the box (the heap harness caps at ~310 solids and EXTRAPOLATES for the same reason). So filler meshes SHARE a pool
  of ~36 real composite-wall layer geometries (one draw call each — three.js does not auto-instance a shared geometry),
  grid-spread with a fit camera (nearly all in-frustum — the honest worst case a CAD user hits zoomed-to-fit). **Draw calls
  = mesh count EXACTLY; frame time is draw-call-bound and faithful; memory stays a few pooled buffers.** The (d) edit runs
  the REAL kernel + document on a REAL wall (`core.setParams`) — only the filler is cloned.
- **⚠ THE HARDWARE, DISCLOSED (it is what makes the absolute number legible).** Real GPU, not a software rasterizer:
  **ANGLE / Intel UHD Graphics (Direct3D11)** — a genuine low-end INTEGRATED GPU, the most common class in laptops.
  Canvas 795×684, `devicePixelRatio` 1. The draw-call COUNT is hardware-independent; the frame TIME scales with the GPU, so
  **a discrete GPU would be materially faster** — Intel UHD is a fair "modest laptop" floor, not the best case.

**⚠⚠ (b) DRAW CALLS + FRAME TIME — measured, this box, Intel UHD:**
```
   parts   draw calls   tris    ms/frame   p95      fps
    1,000     2,036      12k       36.9     75.1    27.1
    2,000     4,016      24k       69.8    162.5    14.3
    4,000     7,948      48k      139.2    211.9     7.2
    8,000    15,762      95k      363.8    548.3     2.7
   12,000    23,398     140k      525.1   1009.4     1.9
►  16,000    30,746     184k      606.3    834.2     1.6   ← the 10,000-element target (~1.6 solids/el)
```
**At the target: ~30,700 draw calls, ~606 ms/frame (1.6 fps).** ~1.9 draw calls per part — because the Viewport draws a
face `Mesh` AND an edge `LineSegments` per part (2× the part count, as designed). Frame time is linear-to-slightly-
superlinear in parts (the slight super-linearity is `scene.updateMatrixWorld` over a growing graph — real, and part of the
honest cost). **~0.02 ms per draw call on this GPU.** This is the plan's own extrapolation (§1a: "~16k draw calls, 10–20×
a 60 fps budget"), now a MEASURED number and worse than the extrapolation because edges double the calls: **~30k calls is
~20× over a 16 ms frame budget.**

**⚠⚠ (d) EDIT LATENCY — one incremental edit (`setParams` on one wall), at rising resident scale:**
```
   resident   changed   total ms   rebuild   retess   install   next-frame
        0        3        46.6       29.4     16.7      0.4        0.9      ← cold JIT
    8,000        3        21.4        7.0     13.8      0.5      194.1
   16,000        3        23.4        5.0     18.1      0.3      568.5      ← the target
```
**THE INCREMENTAL EDIT COMPUTE IS ~23 ms AND FLAT vs SCALE — step 2b works.** Only **3 of 16,000 parts** re-tessellate
(the changed wall's 3 layers); the kernel rebuilds ONE element (~5 ms), the 3 parts tessellate (~18 ms), the mesh swap is
~0.3 ms. **The kernel is NOT the wall at edit time** (the redraw-not-kernel finding of §1a, now confirmed from the browser
side). **BUT the frame the user waits to SEE the edit is ~568 ms** — the (b) render cost, because after the swap the whole
30k-draw-call scene must render once. **⇒ end-to-end perceived edit latency at target ≈ 23 ms compute + ~570 ms render ≈
~590 ms.** The compute half is solved; the render half is the wall.

- **⚠⚠ THE FINDING: BOTH AXES COLLAPSE TO ONE WALL — the one-`THREE.Mesh`-per-part redraw at ~30k draw calls.** (b) IS that
  wall; (d)'s perceived latency is that wall plus a flat ~23 ms of kernel+tessellation. The incremental redraw (2b, Entry 26)
  already did its job — it made the edit COMPUTE flat and cheap, exactly as designed — so what remains is purely the
  per-frame *render* of 30k independent draw calls. **The fix is renderer BATCHING-BY-MATERIAL / GPU INSTANCING** (a real
  building has few DISTINCT part geometries per type; instancing collapses N identical meshes to ~1 draw call). It is
  Amer's browser-side work, **additive, below every frozen contract**, and its kernel partner `instantiate` is **already
  RESERVED in the frozen protocol** (§4j-3). The plan calls it "a rewrite not an optimisation" — a RENDERER rewrite, **not a
  contract change.**

- **⚠ RECOMMENDATION (b) — reachable single-threaded; multithreading is the wrong lever.** ~30k draw calls at ~606 ms is a
  renderer-ARCHITECTURE problem (too many draw calls), not a compute-throughput problem. **D8 / multithreading attacks the
  KERNEL rebuild (§1a — "not one of the three kernel levers touches the redraw"), so it would NOT move this number.** The
  unlock is batching/instancing on the three.js side, single-threaded: merge parts sharing a geometry+material into one
  instanced draw, batch edges, add frustum-culling/LOD. That drops ~30k calls toward the low hundreds and the frame back
  under budget — **no thread, no contract, no kernel change.**
- **⚠ RECOMMENDATION (d) — the kernel is already fast enough; this is the SAME renderer-batching fix.** The edit compute is
  ~23 ms and flat (2b + one-element rebuild) — the kernel does not need multithreading to make an EDIT interactive. The
  ~570 ms a user waits is the post-edit frame, i.e. (b). Once (b)'s batching lands, the post-edit frame is interactive and
  (d) becomes ~23 ms compute + one cheap frame. **⇒ neither interactive axis needs D8.**

- **⚠⚠ D8 (multithreading into v1.0.0?) — RAISED WITH THE OWNER, NOT DECIDED (as instructed; imp_plan step 9c: "raise it,
  do not re-decide it").** The evidence says the two INTERACTIVE axes (b)+(d) do **not** need multithreading — they are a
  single-threaded renderer-batching fix. The axis where D8 would actually help is **COLD LOAD** (Entry 54: ~6.35 min
  single-thread), which is Zayd's kernel wall and already has additive levers (D29 cache RULED SHIP, `instantiate`
  RESERVED). **My recommendation: do NOT pull D8 into v1.0.0 on the strength of the renderer axes — they don't need it; the
  renderer batching (additive) is the real unlock, and cold-load's own levers are additive too.** But **D8 is the owner's
  call and it is additive either way** (MT is COOP/COEP + `SharedArrayBuffer` deploy config, not a `scene.json` contract —
  Entry 54 §4), **so it does not gate the freeze.**
- **⇒ ALL FOUR SCALE AXES NOW HAVE A NUMBER** (heap 0.31 GB FITS · cold load ~6.35 min · **draw calls ~30k / ~606 ms · edit
  ~23 ms compute + ~570 ms render**), and the D8 verdict is made and surfaced. The Entry-54 owner HOLD condition ("all four
  axes + the D8 verdict") is **satisfied.** Nothing measured forecloses a frozen contract (confirms Entry 54 §2/§3): every
  remaining lever — renderer batching, `instantiate`, the D29 cache, MT — is additive. **On the evidence the contracts are
  safe to freeze on scale grounds; whether to FREEZE now is the owner's act (P5 step 6).**
- **VERIFICATION + fidelity notes.** `pnpm verify` green (**370 tests**; the pure `percentile` helper is unit-tested —
  `apps/web/src/scale/stats.test.ts`, 6 — the rest is a WebGL measurement, exercised only in a real browser). The page is
  gated: `scale.html` is a second vite build input, and apps/web's typecheck/lint/format cover the new files (the P4-step-0
  gate). ⚠ **Filler geometry is cloned from real composite-wall LAYER solids (rectangular prisms — the simplest real part),
  so per-part TRIANGLES are a conservative lower bound; the DRAW-CALL count — the axis's binding cost — is exact.** ⚠ A
  weak-GPU caveat is honest: the ~606 ms is Intel-UHD-integrated; a discrete GPU is faster, but the ~30k-draw-call COUNT and
  the "20× over budget" shape are hardware-independent and are the real finding.
- **⚠ NO COMMIT — owner-gated.** Box: dev server on :5173 during the run then STOPPED; the kernel WASM + up to ~30k meshes
  lived in the browser tab (peaked well within the tab, box stayed healthy); no containers touched, the two live public
  sites untouched, nothing installed beyond the existing workspace (`pnpm install` linked the two packages Zayd added —
  `@bunyan/types`, `@bunyan/sketch-solver`).

**NEXT:**
- **Owner:** the freeze's Entry-54 HOLD condition is met (four axes + D8 verdict). **The FREEZE (step 6) is now an owner
  act** — sign off and tag `SubShapeRef`/`BimObjectType`/`Command`/`scene.json`/`ParamSchema`/`UndoableEdit` frozen (with
  the Ⓐ–Ⓕ reservations + `Material.thermal?`). And the D8 call: my recommendation is to keep multithreading v1.0.x (the
  interactive axes don't need it); confirm or overrule.
- **Amer (post-freeze / parallel, NOT a freeze blocker):** the renderer-batching / instancing rewrite (the (b)+(d) unlock)
  · P4.5 interaction model · browser storage · WebGPU + fallback · service worker/PWA. All additive, all below the freeze.
- **Zayd:** nothing owed on scale; the join O(N²) endpoint index stays a v1.0.x perf item (review_P5 #3).

### Entry 56 — 2026-07-25 — Amer — **BROWSER STORAGE SHIPS: a real IndexedDB `StorageAdapter` + Autosave + Save/Open/Recover, wired into the app and verified in a real browser. The §3 "No browser storage" gap is closed. NO frozen contract touched.**
**Task (owner):** after the scale-page blocker was discharged (Entry 55, kept UNCOMMITTED — owner-gated), the owner chose
"another Amer track." Picked **browser storage** — the one entirely-missing foundation piece (§3 NOT-built: "No browser
storage — FSA/OPFS/IndexedDB behind `StorageAdapter` … **Amer's** (cannot be verified headless)"). It pairs with the
`.bnn` codec + `Autosave` Zayd already built, touches no frozen contract, and is fully verifiable in a real browser.
`pnpm verify` fully green (**375 tests, +5**; typecheck incl. apps/web, lint, format, reseed). ⚠ **No commit — owner-gated.**

- **WHAT I BUILT (`apps/web/src/storage/`).** The document layer defines the `StorageAdapter` SEAM (`read`/`write`/`remove`/
  `list` over `Uint8Array`) + `Autosave` + the `.bnn` codec, and keeps a `MemoryStore` so the round-trip is tested
  headlessly — but ships NO browser implementation on purpose ("code I cannot exercise is code I must not claim to have
  verified", `bnn.ts`). This is that implementation:
  - **`IndexedDbStore`** (`indexeddb.ts`) — a promisified IndexedDB `StorageAdapter`: one object store, string keys →
    `Uint8Array`, lazy shared connection, `write` COPIES the bytes (`.slice()`) so a subarray view never persists its whole
    backing buffer, `read` normalises back to `Uint8Array`. ⚠⚠ **`list()` returns EVERY key via `getAllKeys()` with no
    caching** — the property `Autosave`'s counter-seed depends on (the "saved 9999, recovered 1300" data-loss bug).
  - **The reload-based OPEN + Save/Delete/Autosave/Recover UI, wired into `App.tsx`.** A "Files" panel: name → **Save**
    (`saveBnn` → `store.write('doc/<name>.bnn')`), a list with **Open**/**Delete**, and a **Recover** banner on boot when a
    newer autosave exists. **Autosave** snapshots the whole `.bnn` into the ring 1.5 s after each edit. `bootstrap()` gained
    an optional `InitialDocument` — opening a file constructs the doc over the loaded scene and `rebuildAll()`s every solid
    from the recipe (the D29 cold-load path, now in the browser).
  - ⚠⚠ **THE MOAT RULE HONOURED: Save persists `doc.changeFeed()` (the journal) + `doc.revision`, NEVER `doc.history()`**
    (the capped undo stack — the moat-losing bug, plan step 10). Both the explicit Save and Autosave use `changeFeed()`.
  - **OPEN is reload-based (`documentStorage.ts`):** the shell is built around ONE `DocumentContext` from `bootstrap()`;
    swapping a loaded doc in place would thread a new doc + agent surface + reset all state. Instead Open parks the store key
    in `sessionStorage` and reloads — the boot path loads that file instead of seeding the demo. Robust, and a document
    switch IS a clean boot over the chosen scene.
- **⚠⚠ THE STRICTMODE BUG I HIT AND FIXED — the exact class Entry 23 already warned about.** First cut of the open path
  booted the DEMO, not the file: `takeOpenRequest()` read-and-CLEARED `sessionStorage`, and under StrictMode the effect
  double-mounts — the DISCARDED first mount consumed+cleared the key, so the SURVIVING mount saw `null`. **Fix: memoise the
  taken key at MODULE scope** (`takenOpenKey`), so both mounts of one page load read the SAME value, while a real reload
  (fresh page load, module re-evaluated) still returns to the demo. Same lesson as the `window.bunyan` StrictMode race:
  a consume-once action must survive the double-mount. **Verified fixed** (below).
- **VERIFIED IN A REAL BROWSER (the only place browser storage can be, the scale-harness precedent):**
  - **`storage-check.html`** — an asserting self-check (`storageCheck.ts`) that runs the adapter + `Autosave` contract
    against REAL IndexedDB (fresh throwaway DB, deleted after). **8/8 PASS**, including the two that matter: ⚠⚠ **a fresh
    `Autosave` over a store with 3 snapshots writes `autosave-4`, NOT `autosave-1`** (cross-session ring continuation — the
    data-loss gotcha, the case a same-instance test cannot see), and the ring prunes to depth keeping the newest. This is the
    browser-side "test" for browser-only code.
  - **The app, end to end:** saved a scene → `doc/house-b.bnn` landed in IndexedDB (1.6 KB, ZIP magic `PK\x03\x04`); edited
    the wall to a DISTINCT `length: 7000` (via `window.bunyan.execute` — the agent path, D19) and saved; **opened it via
    reload → booted "Open: house-b" with `length: 7000` (not the demo's 4000), state `valid`, geometry rebuilt, zero console
    errors** — proving Save → `loadBnn` → `rebuildAll` round-trips the real scene. The Autosave + Recover banner appeared on a
    fresh boot.
- **⚠ NO FROZEN CONTRACT TOUCHED, and it is not a freeze item.** `StorageAdapter`/`Autosave`/`saveBnn`/`loadBnn` all
  pre-exist; `IndexedDbStore` is an app-layer IMPLEMENTATION of the seam (D19-clean — no `KernelClient`, it only moves
  bytes); the `bootstrap()` `InitialDocument` param and the App UI are app-local. No `scene.json`/`SCENE_SCHEMA_VERSION`/
  verb/protocol change. Storage was always "Amer's, below the freeze" (§3) — this closes it without moving a frozen byte.
- **GATING.** `storage-check.html` is a third vite build input (built + gated). apps/web typecheck/lint/format cover the new
  files (the P4-step-0 gate). The pure helpers (`docKey`/`docName`/**`latestAutosaveKey`** — the recover-key selection, which
  must pick the highest counter NUMERICALLY not lexically, the `autosave-10 > autosave-2` trap) are unit-tested in Node
  (`documentStorage.test.ts`, 5) — the IndexedDB adapter itself is browser-verified. **375 green.**
- **⚠ NO COMMIT — owner-gated.** ⚠ **Still uncommitted and owner-gated: Entry 55 (the scale page) AND Entry 56 (storage).**
  Box: dev server on :5173 during verification then STOPPED; the app wrote a couple of throwaway docs into the local `bunyan`
  IndexedDB (dev-machine data, harmless); no containers touched, live public sites untouched, nothing installed.

**NEXT (Amer, all post-freeze / parallel — none blocks the freeze):** the renderer-batching / instancing rewrite (the (b)+(d)
unlock, Entry 55) · P4.5 interaction model (gated on the baseline-Wall) · a File System Access adapter behind the same seam
(save to real files the user picks — an additive second `StorageAdapter`) · WebGPU + WebGL2 fallback · service worker/PWA ·
Cloudflare deploy. **The freeze (step 6) remains the owner's act** (Entry 55: four axes + D8 verdict done).

### Entry 57 — 2026-07-25 — Zayd — **THE PRE-FREEZE ADVERSARIAL SWEEP (owner-authorised in place of freezing): IT FOUND A DEFECT IN A RULE D65 HAD ALREADY PUT INSIDE THE FROZEN CONTRACT — THE DESIGN-OPTION EXCLUSION DID NOT CASCADE OVER THE HOSTING EDGE, AND A CONSUMER COUNTED 4 WINDOWS WHERE 1 WAS CORRECT. FIXED (D67) + REVERT-VERIFIED. THE SWEEP'S SECOND FINDING IS THAT THE MODEL STILL CANNOT BE ENUMERATED.**
**Task (owner):** all pre-freeze rows Ⓐ–Ⓕ + D66's four axes were closed and the freeze was an owner act. Offered FREEZE NOW
(recommended) vs one more adversarial sweep; **the owner chose the sweep** — *"fix it, and keep sweeping"* — and separately
**DECIDED D8: multithreading STAYS v1.0.x** (Amer's Entry-55 recommendation confirmed; it was "raised, not decided" until now).
`pnpm verify` **387/387 green** (375 → +12), real exit code captured.

- **⚠⚠ THE FINDING (D67, new row Ⓖ — `P5_step5G_option_cascade_design.md`). D65 ruled the exclusion invariant INTO the frozen
  contract** — not merely into storage — *"so the three consumers implement the SAME rule instead of three slightly different
  ones."* It shipped as `isElementActive`, tested, revert-verified, 19 assertions. **It read only the element's OWN
  `designOptionId`, and its signature `(element, options, active)` handed it NO MODEL — so it was structurally incapable of
  asking what the element hangs off.** Measured against the real kernel, two real facade schemes, `brokenRefs()==0`:
  ```
  Scheme A (chosen):     1 wall, 1 window        Scheme B (not built):  1 wall, 3 windows
    active WALLS   = 1   ✓        active WINDOWS = 4   ✗ (correct: 1)
    ⇒ all 3 spurious windows are hosted on the wall THE SAME RULE JUST EXCLUDED — each a window with no wall
  ```
  **This is verbatim D65's own stated failure mode** (*"a schedule double-counts and publishes work packages for a scheme
  nobody is building"*), reached by the one road D65 did not walk: **the hosting edge.** The author tags the WALL — the natural
  authoring act, and the only one Revit asks for — and the windows follow it in the model but not in the rule.
  ⚠ **Why pre-freeze and not an ordinary bug: the defect is in the SIGNATURE, not the body.** Correcting it later changes a
  helper D65 deliberately froze **for three products to call** — the exact cross-product amendment the freeze exists to prevent.
- **THE EDGE INVENTORY (the §1b method turned on the rule itself — *which edges make one element's reality depend on another's?*):**
  **hosting (`hostId`) — BROKEN, measured.** **Generated children (D59 Model A) — ✅ SAFE BY CONSTRUCTION:** they are not
  `scene.elements` rows, so a consumer never enumerates them separately and they are excluded WITH their parent. **D59's
  derived-children ruling pays off a second time.** **Manual groups (`parentElementId`, reserved) — the same hole, dormant**;
  the rule is now written for that edge too, so v1.0.x groups land additively.
- **THE FIX (owner-ruled shape: "widen the rule to see the model").** `isElementActive(element, scope, active?)` where `scope`
  is the document (`Scene` satisfies it structurally). An element counts iff **its own option is active AND every element it
  hangs off is active.** ⚠ It is a **TRAVERSAL, not a chain walk** — an element may hang off `hostId` AND `parentElementId` at
  once, and following only one would silently ignore the other, which is the shape of the very defect being corrected. Edge
  semantics each match an existing precedent: **a missing ancestor ⇒ excluded** (the broken-reference precedent — counting it
  bills a window into thin air); **a cycle ⇒ excluded and it TERMINATES** (the `buildChildrenTree` cycle-guard precedent —
  a hostile `.bnn` must break predictably, never hang). New exported types `OptionedElement`/`OptionScope`.
  **No `SCENE_SCHEMA_VERSION` bump, no new field, no verb, no stored byte** — a correction to a frozen RULE.
- **⚠ REVERT-VERIFIED:** neuter the ancestor walk ⇒ **8 tests fail, the headline one reproducing the original defect exactly —
  `expected 4 to be 1`, `{ walls: 1, windows: 4 }`.** `tests/option-cascade-d67.test.ts` (12, real OCCT — the two-scheme
  building is real geometry, not hand-made objects; the §1b method is what found this). `tests/step5F-reservations.test.ts`
  updated to the new signature (19, still green).
- **⚠⚠ THE SWEEP'S SECOND FINDING — THE MODEL CANNOT BE ENUMERATED, AND THREE SEPARATE CONSUMERS ALL NEED THAT ONE QUERY.**
  Not freeze-blocking (a query is additive, D19/rule 5) — but it is on the moat's critical path and it is the design input for
  the Clean Delta exporter. `scene.elements` is the AUTHORED ROWS, which is **not** the set of real elements:
  - **it MISSES generated children** — a 3×2 curtain wall is **1 scene row and 17 real elements**; a schedule over
    `scene.elements` misses **16**. A curtain-panel schedule is completely standard in Revit.
  - **it INCLUDES non-active design options** — that is D67 above; the rule now exists but nothing applies it.
  - **it INCLUDES voids** — and `quantities()` on an Opening still **throws** (*"has no built geometry"*), so the naive
    project-wide loop still dies on the first window, exactly as `review_P4.md` measured on **2026-07-14**. Still zero code
    **42 days and 13 entries later**, while P5 was declared closed twice — **§1c-7's disease, third occurrence.**
  - **there is no LBS/ancestry API** (`DocumentContext` has no container-path method) and **`QuantityBreakdown` carries no
    container address** — so the per-container roll-up the plan demands (spec §7a, Planitor's Location Breakdown Structure)
    has nowhere to land. ⚠ Two towers themselves are fine — `Site → Tower A/B → Levels` builds correctly (probed).
  ⇒ **ONE missing query serves all of it:** enumerate every real element (walking generated children), excluding non-active
  options, skipping voids by construction. **This is the plan's own instruction** — *"MAKE IT A COMMAND/QUERY, NOT A LOOP EVERY
  CONSUMER REWRITES"* — and *"a producer that cannot enumerate the model's quantities cannot produce a Clean Delta."*
- **RECORDED, NOT DEFECTS:** hosting an opening on a generated child is **refused cleanly** (*"no element …/panel.r0c0 in this
  document"*) — a capability gap vs Revit, but predictable breakage beat silent wrongness and `hostId` can express it, so it is
  additive. The journal for a composite edit names only the **parent** row (`rebuilt: [curtainwall-…]`, before/after params) —
  **correct** under Model A (children re-derive from the recipe), but a panel-level delta requires the same enumeration query.
- **⇒ THE SWEEP FOUND NO CONTRACT FORECLOSURE BEYOND D67.** Every other gap is an additive query. **On the evidence the
  contracts are now safe to freeze** — and one real defect was caught in a rule that had already been declared frozen-contract,
  which is precisely what the sweep was authorised to find.
- **Box:** read/measure/build only; `pnpm verify` ×5; nothing installed, no containers touched, no ports bound; `/tmp` 10 MB;
  both live public sites up throughout. ⚠ **UNCOMMITTED — owner-gated.**

**NEXT:**
- **Owner:** **the FREEZE (step 6) is again the owner's act** — the sweep is discharged and D67 is fixed. Sign off and tag
  `SubShapeRef`/`BimObjectType`/`Command`(+`argsSchema`)/`scene.json`/`ParamSchema`/`UndoableEdit` frozen, carrying the Ⓐ–Ⓖ
  reservations + `Material.thermal?`. ⚠ Also owner-gated: **committing Entry 57.**
- **Zayd (next build, owner-chosen):** **the Clean Delta exporter** — and it opens with the enumeration query above, which is
  its stated prerequisite. The join O(N²) endpoint index stays a v1.0.x perf item (`review_P5.md` #3).
- **Amer:** unchanged and all post-freeze/parallel — renderer batching/instancing (the Entry-55 unlock), P4.5, FSA adapter,
  WebGPU, service worker/PWA, Cloudflare deploy.

### Entry 58 — 2026-07-25 — Zayd — **THE ENUMERATION QUERY + THE CLEAN DELTA EXPORTER SHIP (owner ruled "both in one unit"). THE 42-DAY-OLD CRASHING EXIT CRITERION IS CLOSED — AND FIVE REAL DEFECTS WERE FOUND: TWO BY BUILDING IT (ONE ON THE MOAT'S LOAD-BEARING SENTENCE — THE JOURNAL WAS NOT RECORDING THE ASSOCIATIVE CASCADE AT ALL) AND THREE MORE BY THEN SWEEPING MY OWN NEW CODE ADVERSARIALLY.**
**Task (owner):** Entry 57's chosen next build — the Clean Delta exporter, opening with the enumeration query it is gated on.
Design-doc-first (`P5_step6A_enumeration_design.md`), then an AskUserQuestion round: **Q1 unmeasurable ⇒ a separate
`unmeasured[]` list · Q2 `prior` ⇒ rewind the journal + rebuild ONLY the delta · Q3 scope ⇒ BOTH units in one build**
(the owner overrode the recommendation to split them). `pnpm verify` **417/417 green** (387 → +30), real exit code captured.

- **⚠ THE GAP, RE-MEASURED ON REAL GEOMETRY RATHER THAN QUOTED** (§1b). A Site → Tower A → Level 1 with one `core.wall`,
  one `core.opening` Door and one 3×2 `core.curtainwall`, against the real OCCT kernel:
  ```
    scene.elements (AUTHORED rows)      3        real elements    19    ⇒ 16 invisible to `scene.elements`
    with own parts                     15        with none         4    the curtain-wall parent + its 3 columns
    NAIVE LOOP  for (id of Object.keys(scene.elements)) await doc.quantities(id)
       ⇒ counted 2, then THREW: `element "curtainwall-01KYD7CYZ…" has no built geometry`
  ```
  **⚠⚠ AND THE THIRD FINDING IS NEW — "SKIP VOIDS" IS THE WRONG RULE.** `review_P4.md` (2026-07-14) and Entry 57 both named
  **the Opening** as what kills the loop (*"a void has no parts"*). On the SHIPPED types it dies on the **CURTAIN WALL** — a
  **pure composite**, which has no own parts *by design*. **A rule written to skip voids specifically would have shipped
  green and still crashed on the very element D59 was built to prove.** The honest rule is *"an element with no OWN parts
  yields no quantity rows"*, and it has **two** populations. *(The ⓙ door is in neither — leaf + frame, and it is measured.)*
- **BUILT — the enumeration query** (`enumerate.ts`, additive, nothing frozen moved): `modelElements()` (sync, kernel-free)
  applies the four filters **in one place so three products cannot each get them slightly wrong** — the D59 children TREE
  (not one level: a column is itself composite), the D65/D67 option cascade, no-own-parts, and the build state.
  `projectQuantities()` returns **flat per-part rows carrying the LBS address** + `totalsBy{Material,Discipline,Container,Type}`;
  `containerCodeOf()` exposes the LBS path Entry 57 found missing. **The exit criterion answers: *"how much C25/30 is in this
  building?"* = 3.18 m³**, one call, no throw.
- **⚠⚠ DEFECT 1, FOUND BY THE TYPECHECKER WHILE WIRING IT: A GENERATED CHILD'S TYPE WAS NOT RECOVERABLE FROM THE BUILT TREE.**
  The engine constructs a full `Element` for every D59 child (it must — `buildGeometry` takes one) and then **threw it away**,
  keeping only geometry. So a **curtain-panel schedule** — *"completely standard in Revit"*, Entry 57's own example — could not
  say what type its rows were, and the Clean Delta's `classification.ifc_class` / `type_name` were unproducible for **16 of the
  19** real elements. Fixed by carrying it (`ElementGeometry.element?`) — a build-output projection, never stored, not a frozen
  shape; the object already existed in the engine's hand. It also makes a derived child and an authored row the **same shape**,
  which is why the enumeration has one code path instead of two.
- **⚠⚠⚠ DEFECT 2 — AND IT IS ON THE MOAT'S LOAD-BEARING SENTENCE. THE JOURNAL WAS NOT RECORDING THE ASSOCIATIVE CASCADE.**
  `P5_step6_clean_delta_design.md` §3 rests `modified_qty` on *"whether the element's own params changed **OR it appears in
  some edit's `rebuilt`**"*, and calls it *"the case a naive two-model diff gets right only by luck; Bunyan reads it off
  `rebuilt`."* **It did not.** **Thirteen commands** — `updateContainer`, `updateGrid`, `updateMaterial`, `updateSection`
  among them — declare `rebuilt: []`, because the command layer legitimately does not KNOW what a container/grid/material edit
  reaches; the **typed dependency graph** does, and `#affected` had already resolved it to *do* the rebuild. **So the geometry
  was always right and the journal simply did not say so: moving a Level rebuilt every wall on it and recorded `rebuilt: []`** —
  and a Clean Delta consumer would have been told a storey of re-quantified walls was `unchanged`. **A wrong schedule, from a
  green suite.** Fixed at the one place both answers meet (`execute` now journals the RESOLVED set — the field is frozen and
  unchanged, only its content is now complete). **⚠ §1c-7's disease, FOURTH occurrence: the claim was written in a design doc
  and never read against the code.**
- **BUILT — the Clean Delta exporter** (`cleandelta.ts`): `journal + revN → CleanDeltaPackage`, `contract_version "1.1"`,
  `source "bunyan"`, mapped field-for-field onto the real on-box `../Planitor/v2.2_spec.md` §4. `change_type` derived from the
  journal slice; `sceneAt()` **rewinds** by inverting `SceneChange.before/after` (exact — the journal is append-only and an
  undo is a REVERSAL, D40); `prior` priced on a **throwaway document rebuilt over only the delta's elements** (owner Q2) via
  the new bounded `rebuildOnly()`. `reidentified` is declared and **never emitted**. The LBS zones/floors fall straight out of
  `scene.containers` — nothing minted, nothing mapped. **No frozen change, exactly as the ⑥ design proved pre-freeze.**
- **⚠ AND A HEAP CONSEQUENCE THE RULING CREATED: a throwaway document holds real OCCT solids.** Added `DocumentContext.dispose()`
  — without it every export would bleed the whole prior model into the tab the user is still modelling in (spec §6.2, the
  Entry-21 leak class one level up). Pinned by a `wasmLiveHandles()` before/after assertion.
- **BUILT — the JSON Schema** (`packages/document/schema/clean-delta-1.1.schema.json`), the artifact **Planitor D11** makes the
  contract itself (*"a contract maintained by remembering to edit N files WILL drift, and this one carries money"*). A real
  export is validated against it, and **the validator is itself revert-verified** against 8 deliberate mutations (a wrong
  `const`, a downgraded `basis`, an out-of-enum `change_type`, a nested bad part…) — a conformance test whose checker cannot
  fail is theatre. A third test asserts the schema uses **only** the draft-07 keywords the validator implements, so the subset
  cannot silently fall behind. ⚠ `ajv` is in the tree only as an eslint transitive (not importable under pnpm) — **nothing was
  installed**; cross-repo CI validation (Planitor D11's other half) is not this repo's to land.
- **⚠ REVERT-VERIFIED, all three:** remove the no-own-parts guard ⇒ the roll-up **throws on the curtain wall**; remove the
  children walk ⇒ the glass and aluminium totals **silently vanish** while the run stays green (*the* failure mode — a
  plausible, short number wearing `basis: 'exact'`); revert the journalled cascade ⇒ `expected [] to include 'wall-…'`.
  `tests/model-enumeration.test.ts` (12), `tests/clean-delta-export.test.ts` (9), `tests/clean-delta-schema.test.ts` (4) —
  all on real OCCT, real `@bunyan/types`, real buildings.
- **Box:** read/measure/build only; `pnpm verify` ×4 + targeted vitest runs; **nothing installed, no containers touched, no
  ports bound**; `/tmp` 11 MB; available RAM never below ~2.2 GB; **both live public sites up throughout**.
  ⚠ **UNCOMMITTED — owner-gated** (Entries 57 + 58 now both sit in the tree).

- **⚠⚠⚠ AND THEN THE SAME METHOD WAS TURNED ON THIS SESSION'S OWN CODE — A POST-BUILD ADVERSARIAL SWEEP OF THE EXPORTER,
  WHICH FOUND THREE MORE. Every one of them is a row Planitor would have ACTED on.**
  - **(a) A NON-ACTIVE DESIGN OPTION WAS EMITTED AS A GHOST ROW — D65's failure mode by a THIRD road.** `modelElements`
    applies the exclusion rule, but **the journal names element ids directly**, so an element in a non-active option
    arrived through `histories` with no match in the enumeration and was emitted as `modified_qty`, no quantity, empty
    `spatial_container_code`, `IfcBuildingElementProxy` — **a work-package row for a facade nobody will build.** D65's
    own stated failure mode, reached neither by the option tag (D65) nor by hosting (D67) but by the **exporter's
    journal path.** ⇒ not-active is neither a change nor a deletion: those elements are omitted entirely.
  - **(b) AN EDIT THAT WAS UNDONE WAS REPORTED AS A SPATIAL MOVE THAT NEVER HAPPENED.** The derivation read the **last
    change in the slice** — and an undo is a first-class journal entry (D40), so the last change is the REVERSAL, a
    `before → after` differing in `end`. Net effect since the baseline: nothing. Reported: `modified_move`. ⇒ rewritten
    to compare **the two ENDPOINTS** (state at revision N vs state now). ⚠ **This is still not "diffing two models":
    the journal decides WHICH elements are asked about — including the cascade nothing names — and only those elements'
    endpoints are read.** The moat is the SET, not the comparison.
  - **(c) A GENERATED CHILD WHOSE SLOT VANISHED FELL OUT OF THE PACKAGE SILENTLY.** Shrink a curtain wall from 3 columns
    to 2 and the dropped column is in no scene row and no current enumeration — so under Planitor's *"absence-from-
    `elements` ⇒ unchanged"* rule **it would have been billed forever.** ⇒ the prior model's enumeration is now walked
    too, and the authored root is derived **structurally from the PEI** (`${parentId}:${slot}`) rather than looked up —
    the lookup returned nothing for exactly the element that needed it most.
  - **✅ CHECKED AND CLEAN (don't re-probe):** the ⓣ reserved metadata args (`mark`/`phaseCreated`/`properties`/
    `classifications`) thread through `createElement` **and** survive a `.bnn` round-trip; and **the Clean Delta is
    computable from a reloaded `.bnn`** — save → load → export gives the exact prior (3.6 m³) and current (5.4 m³). That
    is the D40 headline end-to-end, and it is now a permanent test rather than a claim.
  - **⚠ THE PATTERN, AND IT IS THE SESSION'S REAL LESSON: five defects, and NOT ONE was on a happy path.** Each needed a
    question the build itself never asks — *what if the option is excluded? what if it was undone? what if the child is
    gone?* The sweep cost ~30 minutes and found three defects in code that was already green and already revert-verified.

**NEXT:**
- **Owner:** **the FREEZE (step 6) is still the owner's act** and is unblocked — nothing in this entry touched a frozen shape.
  ⚠ Also owner-gated: **committing Entries 57 + 58** (`origin/main` is still at `6ec5139`).
- **⚠⚠ A JUDGEMENT CALL, AND THIS SESSION STRENGTHENED IT RATHER THAN CLOSING IT.** Defect 2 means **every claim in a design
  doc that names a field should be read against the code before the freeze tags it** — four occurrences now. And the
  post-build sweep then found **three defects in code that was already green and already revert-verified**, in ~30 minutes,
  none of them on a happy path. ⇒ **the adversarial sweep is not a one-off pre-freeze ritual; it is the only method that has
  ever found anything** (§1b), and it should run against each new surface *after* it goes green, not instead of. A standing
  sweep of *"which asserted behaviours have no test that would fail without them?"* is cheap now; after the freeze a missing
  one is a three-product amendment.
- **Zayd:** the schedules body (D58 row Ⓐ — the enumeration query is now their input too) · the join O(N²) endpoint index
  (`review_P5.md` #3, v1.0.x perf, no contract change) · the D29 cache bodies.
- **Amer:** unchanged and all post-freeze/parallel — renderer batching/instancing (the Entry-55 unlock), P4.5, FSA adapter,
  WebGPU, service worker/PWA, Cloudflare deploy.

### Entry 59 — 2026-07-26 — Zayd — **THE ASSERTED-BEHAVIOUR SWEEP (the judgement call Entry 58 raised; owner chose it over the freeze). IT FOUND TWO MORE CONSUMERS OF THE D65 EXCLUSION INVARIANT THAT NEVER OBEYED IT — AND THE SECOND CORRUPTS THE BUILT B-REP OF A WALL NOBODY EDITED. D68. 428 GREEN.**
**Task (owner):** the standing sweep Entry 58 asked for — *"which asserted behaviours have NO test that would fail without
them?"* — chosen in place of calling the freeze. Also owner-authorised: **push Entries 57+58**, done (`origin/main`
`6ec5139 → 2dd2215`; Amer had been two entries behind). `pnpm verify` **428/428**, real exit code captured (417 → +11).

- **⚠⚠ THE METHOD THAT WORKED, AND IT IS MECHANICAL — worth reusing verbatim.** Rather than re-reading prose, I took the
  rule D65 put *inside the frozen contract* (*"every consumer that AGGREGATES or PUBLISHES elements MUST exclude
  non-active options"*) and enumerated **every place in the codebase that iterates `scene.elements`** — 14 sites. Then I
  asked of each: *does this aggregate or publish?* Twelve correctly see everything (save/load per D43, the delete guards,
  the invalidator, `instancesOf`/`hostedBy`). **Two did not, and neither had ever been swept.**
- **⚠⚠ FINDING 1 — THE ROOM SOLVER (`assembleRoomInput`).** A Space's floor area is derived from its bounding walls, and
  the scan walked every element on the Level with no option filter. **Measured on a 4800×3800 room: 10,640,000 mm²
  reported where 18,240,000 is correct — a 42% under-report**, because one partition belonging to a scheme nobody will
  build crossed it. ⚠ **And the failure is worse in KIND than the double-count D65 predicted:** the corrupted number
  belongs to a room that is **entirely main-model**, and it is *smaller* than the truth — the direction nobody audits.
  D55's own words for this number: *"architecture's most-scheduled quantity"* (paint, ceilings, screed).
- **⚠⚠⚠ FINDING 2 — THE WALL-JOIN RESOLVER (`partnersAt`), AND IT IS THE SHARPER ONE: IT CORRUPTS THE BUILT B-REP, SO THE
  WRONG NUMBER ARRIVES WEARING `basis: 'exact'`.** The auto-join rule is *"exactly one coincident neighbour ⇒ miter; zero
  or a crowd of 2+ ⇒ the default cap"*, and an unfiltered scan turns that into **two** wrong answers:
  **(1) miter against a ghost** — a main-model wall miters itself against an option wall that will never be built;
  **(2) ⚠ THE AMBIGUITY FLIP, and it is vicious** — two main-model walls meet and correctly miter; the author adds a
  facade variant that happens to reach the same corner; each wall now counts **2** partners, the crowd reads as ambiguous,
  and **the miter is silently dropped.** ⇒ ***Adding a design option changes the geometry of a main-model corner
  elsewhere in the building that nobody touched.*** Measured: `expected [] to deeply equal [{end:'end', capLine…}]`.
  Mode 2 is **D67's shape exactly** — a rule that cannot see what an element hangs off gives a confidently wrong answer
  about an innocent third party.
- **⚠⚠ AND THE PATTERN IS A NEW ONE, NOT THE OLD DISEASE — THIS IS THE ENTRY'S REAL FINDING.** §1c-7's four prior
  occurrences were all *a claim written down and never implemented*. **These two are the opposite: the rule WAS
  implemented, correctly, and only in the consumers that existed the day it was written.** The chronology is the whole
  story — the room solver shipped **Entry 41 (07-18)**, the join resolver **Entry 42 (07-18)**; the invariant landed
  **Entry 53 (07-23)** and cascaded in **Entry 57 (07-25)**; Entry 58's sweep then fixed `enumerate.ts` and
  `cleandelta.ts` — **the two consumers that existed when the rule was written.** ⇒ **A CORRECTNESS RULE ADDED TO A
  MATURE CODEBASE MUST BE SWEPT BACKWARD OVER THE CODE THAT ALREADY EXISTS, NOT MERELY APPLIED FORWARD.** Writing the
  rule into the frozen contract (D65's whole point) guarantees the *next* consumer obeys it; it does nothing whatever
  about the ones already written. **Nobody had ever run that backward sweep, for any rule.**
- **⚠ A THIRD, SMALLER FINDING — THE SCOPE WAS SHARED BY COPY-PASTE.** The three-line block that resolves the option
  catalogue was **duplicated in `enumerate.ts` and `cleandelta.ts`**, and my fix was about to make it a third and fourth
  copy. That is the drift `isElementActive` was extracted to prevent, reappearing one level up: **the RULE was shared
  while the SCOPE THE RULE IS EVALUATED AGAINST was not** — and a consumer that assembles the scope slightly differently
  gets a slightly different answer from an identical rule (domain rule 10). ⇒ extracted **`optionScopeOf(scene, override)`**
  into `designoptions.ts` beside the rule it serves; all four consumers now call it.
- **FIXED (D68), all additive — no frozen byte moved, no `SCENE_SCHEMA_VERSION` bump, no field, no verb.**
  `assembleRoomInput` / `DocumentContext.roomMetrics` take an optional `RoomOptionSelection`; `resolveJoins` takes an
  optional `JoinOptionSelection`; both default to every set's primary, which is the whole of v1.0.0 (nothing authors an
  option yet) ⇒ **behaviour is unchanged for every existing document.** The join override path is filtered too (an
  override naming a non-active wall cannot force a join). ⚠ **`wallsJoinedTo` is DELIBERATELY left unfiltered and now
  says so in the code** — it is the INVALIDATOR, whose error directions are not symmetric: naming too many walls costs a
  rebuild that produces identical geometry, naming too few leaves a stale solid (0a's original `#touched` hole). *An
  undocumented asymmetry invites a wrong "fix" later.*
- **⚠ REVERT-VERIFIED, in the stronger order:** both tests were written and **measured failing against the unfixed code
  first** — room `expected 10640000 to be close to 18240000` (2 failures), joins 4 failures incl. mode 2's vanished
  miter — and only then fixed. `tests/room-option-cascade.test.ts` (5) + `tests/join-option-cascade.test.ts` (6), both
  pure (neither path reaches the kernel), plus the 8 real-OCCT `wall-joins` tests still green ⇒ the anti-fuse gate held.
- **➕ SAME SESSION — THE SECOND BACKWARD SWEEP: DOMAIN RULE 6 (THE CANONICAL RE-SORT / D8). ✅ RESULT: CLEAN, AND
  MEASURED RATHER THAN REASONED. DO NOT RE-AUDIT.** This was the rule I flagged as *"no test would fail if it were
  removed"* — the one whose whole purpose is to let v1.0.x multithreading turn on **without invalidating every saved
  file in the field**, and whose falsity is invisible on a single-threaded build. Two halves, both now answered:
  - **(a) THE CODE READS NO TRAVERSAL INDEX — verified by walking the chain, not by trusting the comment.** Faces sort
    on derivation → a structural signature built from the neighbours' **derivations** (strings, explicitly *not* their
    canonical indices, to avoid a circularity) → the D28 centroid. `canonOfFace` then falls out of that canonical order;
    `vertexSig` is built from **canonical** face indices; edges sort on derivation → an endpoint signature of those
    canonical indices → the centroid. **No comparator term anywhere reads an OCCT map index.** ⚠ I also checked the
    thing that would be undefined behaviour rather than a wrong answer: `rowLess` and `sameDerivation` compare **exactly
    the same seven fields**, so the comparator is a valid strict weak ordering and `std::sort` is not being misused.
  - **(b) ⚠⚠ AND THE SUITE *DOES* CATCH ITS REMOVAL — I MEASURED IT BY DELETING IT.** Neutered the face re-sort,
    rebuilt the kernel (~60 s, §1c-3), and ran the naming suite: **2 tests fail** — `naming-hard-topology`'s *"a GROOVE
    splits a face and both halves keep their identity through a resize"* and `naming-transform`'s *"refs the BOOLEAN
    itself owns — a split face, occurrence and all — survive a rotation"*. **Both are split-face cases, which is
    exactly right:** they are the shapes where several sub-shapes share a derivation and the sort is the only thing
    separating them. ⚠⚠ **AND THE FAILURE MODE IS THE ONE THE DESIGN PROMISES: `UNRESOLVED_SUBSHAPE_REF` — a
    REFUSAL, not a wrong name** (*"two sub-shapes resolved to the SAME identity — refusing rather than hand out a ref
    that names two things"*). Losing the normalisation does not silently misname anything; it makes the kernel decline.
    That is core_logic §5's *"fails loudly rather than inventing a name"* holding under a deliberate injury.
  - ⇒ **My Entry-59 claim that "no test would fail if the re-sort were removed" was WRONG, and measuring is what
    corrected it.** Rule 6 has real coverage and a safe failure mode; **the D8 multithreading unlock is not carrying a
    hidden identity risk.** Kernel source restored from backup and the committed `.wasm` restored byte-identical
    (`git checkout`, md5 `238a38e0…`); `pnpm verify` re-run green afterwards.
- **⚠ NOTED, NOT FIXED (deliberate, and neither is pre-freeze):** `agent.query()` has **no way to express the option
  question** — an agent asking *"how many load-bearing walls on level 2"* would count both schemes. It is a browse API
  rather than an aggregator, and **`agentApi` is versioned separately (D22) and does NOT inherit the P5 freeze**, so it
  is additive whenever the bodies land. And **`RoomSeparator` carries no `designOptionId`** — a separator cannot belong
  to an option; additive if ever wanted.
- **Box:** read/measure/build only; `pnpm verify` ×3 + targeted vitest; **nothing installed, no containers touched, no
  ports bound**; `/tmp` 10 MB; available RAM never below ~2.3 GB; **both live public sites up throughout**.
  ⚠ **The `format:check` trap bit again and was caught by capturing the real exit code** — a background job's reported
  status was the *wrapper's* 0, while pnpm had exited 1 on two unformatted files, **before the tests ever ran**.

**NEXT:**
- **Owner:** **the FREEZE (step 6) remains the owner's act and is unblocked** — D68 is additive and touched no frozen
  shape. ⚠ Entries 57+58 are now **pushed**; Entry 59 is owner-gated for commit/push as usual.
- **⚠⚠ THE JUDGEMENT CALL IS NOW ANSWERED WITH EVIDENCE, AND THE BACKWARD SWEEP SHOULD BE RUN ONCE PER LOAD-BEARING
  RULE, NOT ONCE PER SESSION.** Two rules were swept this session and they came back differently, which is the point:
  **the design-option invariant was broken in two places** (D68, above), and **domain rule 6 was clean and is now
  measured clean** (above — and measuring overturned my own written claim about it). ⚠ **A clean sweep is worth as much
  as a dirty one:** rule 6 is the D8/MT unlock, and it is now recorded as verified rather than assumed, so nobody
  re-audits it. **Still unswept: rule 12** (shared-on-style/unique-on-instance) · **rule 16's "a quantity can never
  double-count"** · **rule 5** (new views/formats/commands are additive registrations — the *views* half is untested).
  Each is cheap now and a three-product amendment after the freeze.
- **Zayd:** the schedules body (D58 row Ⓐ) · the join O(N²) endpoint index · the D29 cache bodies.
- **Amer:** unchanged — renderer batching/instancing, P4.5, FSA adapter, WebGPU, service worker/PWA, Cloudflare deploy.

### Entry 60 — 2026-07-27 — Zayd — **THE REMAINING BACKWARD SWEEPS (rules 12, 16, 5 — the ones Entry 59 listed as still unswept). ALL THREE CAME BACK DIRTY. D69/D70/D71. 440 GREEN.**
**Task (owner):** the three sweeps Entry 59 named — **rule 12** (shared-on-style/unique-on-instance), **rule 16**'s *"a quantity can never double-count"*, and **rule 5**'s *views* half — each *"cheap now and a three-product amendment after the freeze."* Also owner-authorised and done first: **push Entry 59** (`origin/main` `2dd2215 → 40a4ee1`; Amer had been one entry behind). `pnpm verify` **440/440**, real exit code captured (428 → +12).

- **⚠⚠ THE HEADLINE: THREE FOR THREE. Every rule swept backward in this project has now come back dirty except domain rule 6** — and rule 6 is the one that was swept by *deleting it and measuring* rather than by reading. §1c-8 is not a lesson about design options; it is a lesson about **every rule this codebase has ever written down.**
- **⚠⚠ RULE 16 — THE T-JUNCTION DOUBLE COUNT (D69), and it is the commonest wall condition in a building.** `partnersAt` matched **endpoint-to-endpoint only**, so a partition whose end lands on another wall's *mid-span* found no partner, kept its plain perpendicular cap, and drove its last half-thickness **inside** the through wall — that sliver of blockwork existing in **both** B-Reps and summed twice by `projectQuantities`. **Measured on real OCCT: 2.8800 m³ where 2.8320 m³ is the truth, with `unmeasured: []` and `basis: 'exact'`.** ⚠ The over-report is **fixed per junction** (`t_partition × t_through/2 × height`), *independent of wall length* ⇒ it scales with the **number** of partitions, not their size.
  - **⚠⚠⚠ AND THE TEST THAT SHOULD HAVE CAUGHT IT WAS ALREADY THERE, GREEN, FOR A WEEK.** `wall-join-midspan.test.ts` (Entry 44, `review_P5.md` #4) pinned this exact fixture — and asserted the **geometry** (*"the partition's cap stays at its baseline"*) and the **contract-additivity** (*"no new frozen field"*), and **never asked what the limit did to a quantity.** Its line 80 literally asserted `min[1] ≈ 0` — the partition's cap sitting at the through wall's **centreline** — and called it a recorded limit. **§1b's second method exactly: a green test proves only what it ASSERTS.** The limit was analysed twice, from two angles, and the third angle was the one that mattered.
  - **FIXED (owner ruled "fix it at the source, don't report it"):** `pointOnSegment` + `throughWallsAt` ⇒ **auto-BUTT on a mid-span T**, directional (only the butting wall's cap moves — the through wall runs on untouched), with the **same ambiguity discipline a corner has** (2+ through walls ⇒ no single face to stop on ⇒ default cap, and the test proves it was ambiguity by deleting one and watching the butt appear). `wallsJoinedTo` gained the **segment** edge, so *thickening* a through wall — a change that moves neither endpoint — re-stages every partition resting on it; without it the partition keeps a stale solid, the silent direction that function's own header warns about. `core.setJoin` accepts a mid-span pair via a widened `wallsMeet`, so `none` can disable the auto-butt.
  - ⚠ **`review_P5.md` #4's freeze-safety analysis held exactly as written:** the precondition relaxed, the contract did not move — no new frozen field, no `SCENE_SCHEMA_VERSION` bump, and `{element, other, resolution:'butt'}` already keyed the junction uniquely.
- **⚠⚠ RULE 12 — THE CLEAN DELTA IDENTIFIED MATERIALS BY DISPLAY NAME (D70).** Clause 1 (style/instance) is **clean** — `build.ts` resolves a style *by reference* at build time and snapshots nothing, so a style edit propagates. Clause 2 was broken on the one surface the rule names: *"a value that must be grouped, scheduled, or read by an analysis engine cannot be a copy."* `partToWire` emitted `material: part.materialName` and dropped `materialId`; the **published** `clean-delta-1.1.schema.json` *required* `material` as a plain string and carried no id anywhere. Three silent consequences: a **rename** re-keys every downstream work package (rule 13 defeated for materials); **two materials sharing a display name merge** into one schedule group (`Material.name` has no uniqueness constraint and nothing refuses a duplicate); and an **unresolvable material emits its raw id AS the name** (`materialName: name ?? materialId`), so the same material arrives under two different keys depending on whether it resolved.
  - **⚠ THE TELL THAT THIS WAS A SWEEP MISS, NOT A DESIGN CHOICE: `enumerate.ts`'s `totalsByMaterial` has always grouped by `part.materialId`.** The rule was obeyed **internally** and broken on the **contract three products bind to** — and both were written in the same session (Entry 58).
  - **FIXED: `parts[].materialId` REQUIRED, `contract_version` 1.1 → 1.2**, schema renamed. Owner ruled required-over-optional because *an optional identity field leaves the defect reachable* — a consumer could still key by name. Cheapest possible moment: 1.1 was published 07-25 and nothing has implemented it. ⚠ **CROSS-PROJECT AND OWED: `../Planitor/v2.2_spec.md` §4 defines this payload and must be updated to 1.2 to match.**
- **⚠⚠ RULE 5 — TWO OF THE FOUR REGISTRIES WERE DECORATIVE (D71), AND A CLOSED FREEZE-GATE ROW RESTED ON ONE.** The sweep was a count: **51 type registrations · 39 command registrations · 1 codec registration (inside the test asserting the seam exists) · 0 view registrations.** `FormatCodec` and `ViewDefinition` carried **no behaviour** — no read/write, no projection member — and **nothing anywhere consulted `registries.codecs` or `registries.views`**; `saveBnn`/`loadBnn` are called by name from `App.tsx`. Of the four kinds rule 5 names, **two worked.**
  - **⚠⚠⚠ IT LANDS ON D63**, which discharged freeze-gate row Ⓕ with *"the DWG seam **already exists**… asserted in the test, not just written down."* Apply §1b's second method to that test: it registers a `{id,label,extensions,canRead,canWrite}` descriptor and asserts `codecs.size` goes 0→1 — it exercises the generic `Registry` class (already proven 90 times over by types and commands) and **would have passed verbatim had `FormatCodec` been `{id}`.** The seam it certified could not read a byte. **D63's CONCLUSION survives** — `FormatCodec` is not a frozen shape and took its behaviour additively, so nothing was owed pre-freeze — **but its EVIDENCE did not.** *A decision can be right and its proof still be worthless; the proof is what the next agent inherits.*
  - **FIXED: `read?`/`write?` on `FormatCodec`, a `codecFor(registries, filename, need)` dispatcher** (longest extension wins, and a `canRead:false` codec is never handed to a reader), and **`BNN_CODEC`** registering the format Bunyan itself ships — so the seam is exercised by the **primary path**, not only by a test for a format that does not exist yet. `tests/format-codec-seam.test.ts` (7) proves the actual claim: a `.dwg` codec is **reached and invoked** by a caller holding only a filename, with zero core edits, and a `.bnn` written through the registry is **byte-identical** to one written by name (rule 10 — the wrapper must not fork the format).
  - ⚠ **VIEWS DELIBERATELY LEFT A RESERVATION — and it now SAYS SO, in the code and in a test.** The P6 bodies (D58) are what change it. It is recorded rather than quietly left *because the codec registry beside it had the identical shape and a decision was discharged on the assumption it worked*. **A reservation is fine; a reservation mistaken for a mechanism is not.**
  - ⚠ **NOT DONE, AND NOT OWED BY THIS FIX: `apps/web` still calls `saveBnn`/`loadBnn` by name.** Routing the app's open/save through `codecFor` is Amer's layer (persistence adapters, §0) and is additive.
- **⚠ REVERT-VERIFIED, all three, in the stronger order** — every test written and **measured failing against the unfixed code first**: rule 16 five failures incl. `expected 2880000000 to be close to 2832000000`; rule 12 `expected undefined to be 'concrete'` plus a TS2551, and a schema mutation test that now refuses a package missing `materialId` (without it the 1.2 schema would accept exactly what 1.1 accepted, making the bump a number rather than a contract); rule 5's seam proven by dispatch-and-invoke rather than by `size`.
- **⚠ THE `format:check` TRAP BIT AGAIN and was again caught only by capturing the REAL exit code** — `pnpm verify` exited **1** on two unformatted files *after* typecheck and lint had both passed and *before* the tests ran. Third session running.
- **Box:** read/measure/build only; `pnpm verify` ×4 + targeted vitest; **nothing installed, no containers touched, no ports bound, no kernel rebuild needed** (every fix is TS document-layer); `/tmp` 11 MB; available RAM never below ~2.3 GB; **both live public sites up throughout**.

**NEXT:**
- **Owner:** **the FREEZE (step 6) remains the owner's act and is still unblocked** — D69/D70/D71 moved no frozen byte, bumped no `SCENE_SCHEMA_VERSION`, added no field or verb to a frozen shape. Entry 60 is owner-gated for commit/push as usual.
- **✅ CROSS-PROJECT HALF CLOSED (D70), same session: `../Planitor/v2.2_spec.md` §4 updated to `contract_version 1.2`** — `parts[].materialId` added to the payload example and made REQUIRED, a consumer rule added (*"group and bind on `materialId`, never on `material`"*, with the three silent failure modes spelled out for a Planitor reader), and **D10 amended** to record the 1.1 → 1.2 change. ⚠ **UNCOMMITTED in Planitor and owner-gated** — that repo is on branch `v2.1` and already carried unrelated uncommitted work (`General_description.md`, `v2.2_spec.md`) which I did not touch or commit. The two halves of the contract now agree in writing; committing Planitor is yours.
- **⚠⚠ THE SWEEP LEDGER IS NOW COMPLETE FOR EVERY RULE ANYONE HAS NAMED — and the score is 4 swept, 3 dirty.** Rules 5, 12, 16 (this entry) + the design-option invariant (D68) came back dirty; **only rule 6 came back clean, and it is the only one that was tested by DELETING it.** ⇒ **The remaining rules have never been swept at all** (1–4, 7–11, 13–15, 17, 18). Rules **13** (*an element's id IS its PEI, and it survives every rebuild, resize and re-issue* — now with D59 derived children whose ids encode a slot) and **15** (*a quantity is MEASURED, never reconstructed; what cannot be measured is OMITTED*) are the two with the most consumers and the most to lose.
- **Zayd:** the schedules body (D58 row Ⓐ) · ~~the join O(N²) endpoint index~~ **✅ DONE (Entry 61, D73 — 4757.7 ms → 27.2 ms at 1984 walls; 169 ms at 9940, per-wall flat)** · the D29 cache bodies (§4j-2 first — it is an identity task).
- **Amer:** unchanged, plus the optional additive follow-up of routing open/save through `codecFor` (D71).

**➕ SAME SESSION, CONTINUED — RULES 13 AND 15 SWEPT (D72). 451 GREEN.**
- **⚠ RULE 13 — CLEAN, AND THE SECOND RULE EVER TO BE.** `redo()` re-applies recorded changes rather than re-executing
  the command, so `createElement`'s `mintId` never fires twice; save/load reads ids from the file; re-issue mints
  nothing. **But it was true by CONSTRUCTION and by no test at all** — the day someone makes `redo()` re-execute, every
  downstream binding breaks and nothing goes red. `tests/pei-stability-rule13.test.ts` (6, real OCCT) now pins rule 13's
  own sentence: the PEI survives **undo→redo, resize, re-issue and save→load→rebuild**, and a D59 child keeps its
  derived PEI across an edit that leaves its slot alone.
  - **⚠ ONE REAL DEFECT ON THE WAY: seven doc sites described the derived PEI as `${parentId}/${slot}`; the code has
    always used `:`.** Not cosmetic — **`/` is a `SubShapeRef` separator** that `commands.ts` refuses in a part name,
    and a child PEI is embedded in its parts' nodeIds, so the *documented* format could not have worked. All seven
    corrected; the fact now has one home as the exported **`DERIVED_PEI_SEPARATOR`**, asserted by a test so code and
    docs cannot drift again. ⚠ Ids stay OPAQUE (D44) — the constant keeps the documentation honest, it is not licence
    to parse a PEI.
- **⚠⚠ RULE 15 — DIRTY TWICE (D72), and the second one required the session's ONLY contract change.**
  - **(a) `canonical.length` was RECONSTRUCTED while `volume` beside it was MEASURED.** A butted partition reported
    **2.00 m for a solid running 1.9 m**, and `volume / (t × h)` agreed with the solid, not with `length` — **the
    package contradicting itself inside one `basis: 'exact'` block**, which is the one form of wrongness a consumer can
    detect unaided, and worth fixing precisely because most consumers will not look. ⚠⚠ **THIS SESSION'S OWN D69
    WIDENED IT:** before, a butt needed an explicit `setJoin`; after, every T-junction butts automatically — so a rare
    discrepancy became every interior partition. *Entry 58's lesson turned on my own work: a surface going green is when
    the sweep should START.* FIX: `builtAxisLength()` clips the baseline at the cap lines `resolveJoins` already
    produces — recipe-derived, kernel-free, D1-safe, and byte-identical to the baseline when nothing is joined.
    ⚠ Freeze-Gate ⓗ is **not overturned**: *"not `measure.edgeLength`"* never implied *"the raw baseline"*.
  - **(b) `area` WAS THE SOLID'S TOTAL ENCLOSING SURFACE — 94.80 m² on a 5 × 3 m wall whose paintable face is 15 m².**
    It summed every layer's buried faces, its edges and both caps. **Every number exactly measured, and the total
    meaningless** — rule 15's *"never a WRONG one wearing the `exact` badge"* by the road nobody audits: arithmetically
    impeccable, and the answer to a question no one asked. Nothing broke when it changed, which is its own evidence —
    **no test asserted it, because nobody could use it.**
  - **⚠⚠ THE CONTRACT CHANGE, AND IT IS THE ONE PRE-FREEZE ITEM THIS SESSION CREATED: `BuiltPart.exposedRefs?`**
    (owner-ruled 2026-07-27). Optional, absent-defaulted ⇒ absent gives the old number, so no existing Type and no saved
    document moves. **It had to be the TYPE that declares it**: "exposed" depends on a wall layer's position in the
    stack, a curtain panel's framing, a column's nothing — the roll-up cannot derive it and had nowhere to read it.
    Without it the product has no way to answer *"what area do I bill?"*, which a BIM tool may not decline. `core.wall`
    populates it from **D26's already-documented segment order** (a-side `lateral.1`, b-side `lateral.3`, filtered by
    stack position); `quantities()` then **MEASURES** each declared face via `measure(ref)` — the machinery **Entry 13
    built for exactly this and that nothing ever consumed (§1c-7 once more)**. Storing an area would have been the
    reconstruction rule 15 forbids.
  - **⚠ OPENINGS FALL OUT FOR FREE, and that is why it is measured per FACE rather than computed:** a door's hole
    shrinks the face it cuts, its reveals are *different* faces and are not in `exposedRefs` ⇒ **30 m² → 26 m²**, the
    owner's ruled QS convention (net of openings, reveals excluded) with **no opening-aware arithmetic anywhere**.
  - **⚠ `exposedRefs: []` MUST NOT BE READ AS "SAID NOTHING".** A wall's buried middle layer declares an empty list
    because its right answer is **zero**; conflating it with absent would have fallen back to its 31.28 m² total
    surface — re-introducing the exact over-report the member exists to remove, on the one layer that must read 0.
    Caught in my own code before it shipped.
- **⚠ OWED, and recorded rather than quietly left: every shipped Type other than `core.wall` still owes its
  `exposedRefs` declaration** (`core.opening`'s leaf/frame, `core.curtainwall`'s panels/mullions/columns). Until each
  does, those parts report the old whole-solid area. The mechanism is in and proven; the per-type AEC judgement is not
  mine to invent type by type.

### Entry 61 — 2026-07-27 — Zayd — **THE JOIN RESOLVER'S O(N²) SCAN IS GONE (D73). `review_P5.md` #3 RETIRED, MEASURED ON BOTH SIDES — AND THE OPTIMISATION'S OWN RISK IS WHAT GOT TESTED. 458 GREEN.**
**Task (owner): "go for next work."** Taken from Entry 60's own NEXT list. Chosen over the schedules body because it needs
no ruling to proceed (a schedules build opens with a design doc + a ruling round), it is bounded and measurable, and
**Entry 60 had made it worse** — `throughWallsAt` added a second full scan per wall end, so this is partly debt I created.

- **⚠⚠ MEASURED FIRST, WHICH IS THE ONLY REASON THE NUMBER IS TRUSTWORTHY.** A pure-TS probe (no kernel) over a room
  grid, reproducing `review_P5.md` #3's method:
  ```
    walls    resolveJoins(all)   per-wall    wallsJoinedTo(all)
       60             8.6 ms      143 µs               12.7 ms
      544           344.9 ms      634 µs              281.7 ms
     1984          4757.7 ms     2398 µs             3645.1 ms
  ```
  **The per-wall cost RISES with N** — that is the quadratic, seen directly rather than inferred. `review_P5` measured
  4193 ms at 1984 walls; the 4757.7 ms here is the same shape plus Entry 60's mid-span scan. Extrapolated to the 10,000
  element target **D48 makes BINDING**: ~**3.5 minutes of pure join scanning before the kernel computes any geometry.**
- **THE FIX, AND THE PART WORTH REUSING: A `WeakMap` KEYED ON THE `Scene` OBJECT.** A uniform grid (CELL 500 mm) over
  every wall's endpoints and its segment, built once and cached against the scene it describes. **`Scene` is replaced
  immutably on every change** (`applyChanges` folds into a new object) ⇒ **a stale index is not merely unlikely, it is
  unreachable**: a changed scene is a different key and the old entry is collected with the old scene. **There is no
  invalidation logic, therefore none to get wrong** — which matters because a stale spatial index is exactly the class
  of bug that produces confidently wrong geometry. **No function signature changed. No contract touched.**
- **⚠ OPTION FILTERING DELIBERATELY STAYS AT QUERY TIME** (D65/D67/D68), on the handful of candidates a cell returns.
  Baking a selection into the index would be faster and wrong: the same scene is legitimately queried under different
  option selections, and an index that had chosen one would answer the wrong question for the next.
- **MEASURED AFTER, at the real target rather than extrapolated:**
  ```
    walls    resolveJoins(all)   per-wall    wallsJoinedTo(all)
     1984            32.1 ms       16 µs                51.9 ms
     5100            75.0 ms       15 µs               108.7 ms
     9940           169.2 ms       17 µs               219.7 ms
  ```
  **Per-wall cost is FLAT from 1k to 10k** — the quadratic term is gone, not merely reduced. ~**540× at the binding
  target**; 3.5 minutes of join scanning becomes **under half a second**.
- **⚠⚠⚠ THE REAL LESSON OF THIS ENTRY IS ABOUT THE TEST, NOT THE SPEED. AN INDEX BUYS SPEED BY CHANGING *WHO IS
  ASKED*, AND THAT IS PRECISELY HOW IT FAILS SILENTLY.** All **32** existing join/dependency tests passed unchanged
  the moment the index landed — and **that proves less than it appears to**, because every one of them places its
  walls at comfortable round coordinates. The failure this optimisation actually risks is a **coincident corner that
  straddles a cell boundary**: two endpoints within `JOIN_TOL` of each other but in different buckets, so the miter is
  **silently never found** — and what comes out is *a perfectly valid wall with a plain cap*, which nothing flags.
  **That is D68's failure shape (a join silently not happening) reached by an entirely new road.**
  ⇒ `tests/join-spatial-index.test.ts` (7) is written **hostile to the GRID rather than to the geometry**: corners on
  a cell boundary, corners either side of one (999.9999 vs 1000.0001), a mid-span T on a boundary, a 60 m wall queried
  from the middle of its span, walls far apart that must NOT join, and the scene-identity cache test.
- **⚠ REVERT-VERIFIED BY NEUTERING THE MECHANISM, not by deleting the fix:** the 3×3 neighbourhood lookup was narrowed
  to a single cell and the suite re-run — **exactly one test fired (the cell-boundary corner), and all 21 existing
  join tests still passed.** That is the whole argument for the new file in one measurement: *the existing suite could
  not have caught it.*
- **Box:** read/measure/build only; `pnpm verify` ×3 + targeted vitest + one pure-TS probe (deleted after); **nothing
  installed, no containers touched, no ports bound, no kernel rebuild** (pure TS); `/tmp` 11 MB; available RAM never
  below ~2.3 GB; **both live public sites up throughout**.

**NEXT:**
- **Owner:** **the FREEZE (step 6) is still the owner's act and still unblocked** — D73 touched no contract at all.
- **Zayd:** the schedules body (D58 row Ⓐ) — now the largest remaining v1.0.0 item, and it wants a design doc + a
  ruling round · the D29 cache bodies (§4j-2 FIRST — it is an identity task, not a serializer task) · **the OWED
  `exposedRefs` declarations** for `core.opening` and `core.curtainwall` (D72, Entry 60).
- **⚠ STILL UNSWEPT (§1c-8's ledger): rules 1–4, 7–11, 14, 17, 18.** Six swept, four dirty; the two clean ones were
  the two that were EXERCISED rather than read.
- **Amer:** unchanged — renderer batching/instancing (Entry 55's wall, now the only remaining scale item), P4.5, FSA
  adapter, WebGPU, service worker/PWA, Cloudflare deploy; plus the optional `codecFor` wiring (D71).

### Entry 62 — 2026-07-27 — Zayd — **THE OWED `exposedRefs` DECLARATIONS ARE CLOSED (D72's debt), AND RULES 1/3/9/10 SWEPT BACKWARD — 1 AND 3 CAME BACK DIRTY (D74). 470 GREEN.**
**Task (owner): "continue development, a significant amount of work."** Taken from Entry 61's own NEXT list (the owed `exposedRefs`) plus §1c-8's standing ledger (rules 1–4, 7–11, 14, 17, 18 unswept). Chosen over the schedules body because both are bounded and need at most one ruling, where a schedules build opens with a design doc + a ruling round. `pnpm verify` **470/470**, real exit code captured (458 → +12).

- **⚠⚠ PART 1 — THE `exposedRefs` DEBT IS PAID, AND MEASURING IT FIRST IS WHY IT WAS WORTH PAYING.** Entry 60 recorded that every shipped Type but `core.wall` still owed its declaration and meanwhile reported the solid's TOTAL ENCLOSING SURFACE. Measured on real OCCT before touching anything:
  ```
    part                          reported     exposed     over-report
    door leaf   800×2000×40        3.4240      3.2000        1.07×
    door frame  (lining)           2.9000      1.7000        1.71×
    curtain panel 1950×1450        5.8182      5.6550        2.06×   (vs one pane face)
    mullion     50×100×3000        0.9100      0.3000        3.03×
    whole façade (6 + 7 children)  43.9792     36.9300       1.19×
  ```
  - **⚠ THE ROLL-UP IS THE LEAST WRONG NUMBER IN THAT TABLE, AND THAT IS THE POINT.** A mullion is out by 3.03× and the façade total by 1.19×, because the panels dominate the sum and the panels were the least wrong. **A total that looks plausible is exactly how a per-part defect survives inspection** — the same shape as D69's fixed-per-junction over-report, seen from the aggregate end.
  - **THE OWNER RULED ONE RULE, NOT A PER-TYPE CONVENTION (2026-07-27): *exposed = every face that is a surface of the assembled thing.*** The glazing case was the one that could legitimately have gone either way — a QS bills glass by the single pane — and the owner chose the assembly rule (the sentence `core.wall` already obeyed), so a panel reports both faces and pane supply stays derivable as half of it. **One sentence now governs every Type**, which is worth more than any single number in the table.
  - **BUILT:** `core.opening`'s leaf (its two door-sized faces — the extrude's CAPS, since a leaf is extruded along the wall's inward normal) and frame (the four reveal faces + the two visible rings); `core.curtainwall`'s panel/mullion/transom (the `y` pair — the façade's local frame is X-along / Y-depth / Z-up for every bar, so **one declaration covers both orientations**). `core.curtainwall.column` is a pure composite and owes nothing.
  - **⚠⚠ AND THE `node` QUALIFIER IS NOT POLISH — A PART BUILT FROM TWO OPS OWNS ONE ROLE TWICE.** The door frame is `outer − inner`, so it carries **both** `frame:outer/face/lateral.0` (buried in the wall's opening) and `frame:inner/face/lateral.0` (the visible lining). Matching on the role alone returns whichever the canonical order put first and would have billed **1.20 m² of buried surface**, silently, wearing `exact`. `facesWithRoles(refs, roles, {node})` exists for that, and a test asserts the declaration names the inner node rather than merely counting to six.
  - **⚠ ONE SHARED HELPER, NOT A THIRD COPY:** `packages/types/src/exposed.ts` holds the role→ref lookup and `core.wall` now uses it too. **What stays per-Type is the only part that is a Type's own knowledge — WHICH faces — which is the whole reason D72 put the member on the Type.** The lookup never was.
- **⚠⚠ AND BUILDING IT FOUND A DEFECT IN D72's OWN PLUMBING, ONE LAYER BELOW WHERE ANY TYPE AUTHOR COULD SEE IT.** The first declaration on `core.opening` arrived at `quantities()` as **`undefined`**: `exposedRefs` reached **three of the four `BuiltPart → Part` construction sites** and not the `buildLeaf` one. **A door leaf could not have carried a billable area even when its Type declared one.**
  - **⚠ WHY EXACTLY THAT SITE, and it generalises:** the four are the base-part loop, the child-tree loop, `placeTree`, and the leaf loop. **`placeTree` rebuilds a part with `{...part}` and inherited the new member for free; the three that ENUMERATE fields had to be edited by hand, and D72 edited the two in front of it.** §1c-8 inside a single commit — *a new field binds the sites its author was looking at.* ⇒ **when a member is added to `Part`, count its construction sites; only the spread one maintains itself.**
- **⚠⚠ PART 2 — RULES 1 AND 3 SWEPT BACKWARD, AND THEY ARE DIRTY TOGETHER (D74): A BROKEN REFERENCE OUTLIVED THE ELEMENT IT NAMED.** The sweep's mechanical form for rule 1 is *enumerate everything persisted and ask of each "is this a RESULT?"* — and `scene.brokenRefs` is the one field in `scene.json` that is a result rather than a recipe, persisted deliberately so that closing a file cannot "fix" a model by forgetting its problem. It is re-derived on every rebuild… **for the assemblies being rebuilt.** `affectedAssemblies` deliberately skips any id no longer in the scene, so **a deleted element is never a rebuild root and its entry passed the filter untouched, forever.** Measured on both roads: deleting the orphaned opening, and deleting the host whose D39 cascade took it.
  - **⚠⚠ IT IS RULE 3's SENTENCE THAT BREAKS, NOT A COSMETIC LEAK.** Rule 3 says a broken ref is a first-class visible state **awaiting manual retargeting**. This one awaited nothing — `core.retargetReference` cannot act on an element that does not exist — and it is **saved into the `.bnn`**, so it was permanent: `brokenRefs()` never emptied, a UI showed a fault the user was given no way to clear, and any consumer asking *"is this model clean?"* read dirty for the life of the file. ***A refusal nobody can act on has stopped being a refusal and become a lie about the model's state.***
  - **⚠ AND RULE 1 IS THE DEEPER HALF: it survived `rebuildAll`** — the primary load path, which rebuilds every element there is — precisely because the element it names is not among the elements there are to rebuild. **A derived value that outlives its subject is no longer derived; it is stored.**
  - **FIX: one clause — drop an entry whose `elementId` is no longer in `scene.elements`.** Safe because there is **exactly one producer** and it reads the scene's own rows (`buildAssembly` → `hostedBy`), so no entry can legitimately name something absent; in particular a **D59 generated child is not a scene row and cannot be the subject of one** (it is not a hosted void). That was the trap worth checking before writing the clause, and it is recorded where the clause lives.
  - **⚠⚠ THE TEST THAT PROVES IT IS A DROP AND NOT A SUPPRESSION: undo the delete and THE BROKEN REF COMES BACK** — the recipe is the source of truth, the rebuild re-derives it, nothing was remembered. Had the fix hidden the symptom, that assertion would stay clean and be wrong. Plus the additivity gate (§5): a broken ref on an element that still exists is untouched. **Revert-verified — four of the five measured failing first.**
- **⚠ PART 3 — RULES 9 AND 10 SWEPT, AND BOTH CAME BACK CLEAN. They are the first rules to be swept and found clean WITHOUT needing a fix**, and the method was the count, not the read:
  - **Rule 10, mechanically:** a script extracted, per command, the keys declared in `argsSchema` versus the keys `execute` actually reads — **29 commands, zero mismatches** (the two flagged were a shared helper between blocks). Same over the shipped Types' `parameterSchema` versus what `buildGeometry`/`buildChildren` read — clean. `validateParams` refuses an undeclared arg, so a drifted schema would be a hard refusal rather than silence, which is why this one held.
  - **Rule 9's two mechanical halves are sound BY CONSTRUCTION, which is the strongest form:** *"every Command returns the state delta it produced"* holds because `applyChanges(scene, edit.changes)` is the **only** way the scene moves; *"every Command can be run as a `dryRun`"* holds because `dryRun` is one branch in the **executor**, returning before `#scene` is assigned, before `#record`, before the undo push — a command cannot opt out of it because a command never knew about it.
  - **⚠ ONE HONEST FINDING, RECORDED AND NOT ACTED ON: `undo()`/`redo()` are things an actor does to the Document and are NOT Commands** — no `argsSchema`, absent from `listCommands()`, though exposed as members of the agent surface. That is D41's exact argument shape (*"an agent could author a building but could not release one"*). **It is NOT freeze-gating: a `core.undo`/`core.redo` verb is an additive registration (rule 5), so nothing forecloses it** — and there is a real counter-argument (undo moves the undo STACK, session state, and a `dryRun` of an undo is close to meaningless). ⇒ **an owner call, at leisure, not before the freeze.**
- **⚠ THE `format:check` TRAP BIT AGAIN, TWICE, AND WAS AGAIN CAUGHT ONLY BY CAPTURING THE REAL EXIT CODE** — once on formatting and once on a `saveBnn` arity error that typecheck caught. **Fourth session running.** A local gate whose exit code you do not read is not a gate.
- **Box:** read/measure/build only; `pnpm verify` ×4 + targeted vitest + two throwaway probes (deleted); **nothing installed, no containers touched, no ports bound, no kernel rebuild** (every change is TS); `/tmp` 11 MB; available RAM never below ~2.3 GB; **both live public sites up throughout**.

**NEXT:**
- **Owner:** **the FREEZE (step 6) is still the owner's act and still unblocked.** D74 and D75 moved no frozen byte, bumped no `SCENE_SCHEMA_VERSION`, added no field or verb; the `exposedRefs` work is Type-local population of a member D72 already reserved. ✅ **Entry 62 was owner-authorised and PUSHED: `origin/main` `d045f10 → 2534e10` (2026-07-28).** ⚠ Amer was two entries behind at Entry 61 and is now current. ⚠ **One question parked for you, not blocking: should `undo`/`redo` become Commands (rule 9)?** Additive either way.
- **Zayd:** the schedules body (D58 row Ⓐ) — now the largest remaining v1.0.0 item, and it wants a design doc + a ruling round · the D29 cache bodies (§4j-2 FIRST — it is an identity task, not a serializer task).
- **⚠ STILL UNSWEPT (§1c-8's ledger): rules 7, 8, 14, 17, 18.** Thirteen swept, seven dirty — and of the five that remain, **14 (a model is ISSUED; `change_type` is READ from the log) has by far the most consumers and the most to lose**, since three products bind to it. ⚠ It is also the one currently enforced by MEMORY ALONE: nothing stops a caller handing `saveBnn` the 200-deep, undo-popped `doc.history()` in place of `doc.changeFeed()` — the docs warn about it in prose, which this session's own lesson says is the condition under which every swept rule was found dirty.
- **Amer:** unchanged — renderer batching/instancing (Entry 55's wall), P4.5, FSA adapter, WebGPU, service worker/PWA, Cloudflare deploy; plus the optional `codecFor` wiring (D71). ⚠ **`brokenRefs()` emptying on delete is a behaviour change the UI will see** — a panel that never cleared now clears; nothing to do, but do not read it as a regression.

**➕ SAME SESSION, CONTINUED — RULES 2, 4 AND 11 SWEPT (D75). 4 DIRTY; 2 AND 11 CLEAN. 475 GREEN.**
- **⚠ RULES 2 AND 11 — CLEAN, and both by COUNTING rather than reading.** Rule 2 (*a sub-shape reference is
  never a positional index*): grepped every positional read of a `refs` array in production code — **one hit,
  and it is `protocol/src/mesh.ts` mapping a triangle to a ref INDEX inside one tessellation message**, a wire
  format, not an identity derivation. Rule 11 (*never fuse two elements*): counted the `boolean` op call sites
  that actually build — **exactly two**, `build.ts` cutting a hosted void through its host's parts (the
  sanctioned intra-assembly case, §4h) and `core.opening` building its frame as `outer − inner` (intra-element).
  **No boolean anywhere takes two elements' solids as operands.**
- **⚠⚠ RULE 4 — DIRTY (D75): ONE ELEMENT THAT COULD NOT BE MEASURED KILLED THE WHOLE BUILDING'S TAKE-OFF.**
  `projectQuantities` called `quantities(id)` **unguarded**, so a single `measure` refusal threw out of the
  loop and the export returned **nothing** — no rows, no totals, **not even the `unmeasured` list that exists
  for exactly this case.** ⚠ **The owner had already ruled the opposite** (Entry 58, Q1: *an element that
  cannot be measured is reported in `unmeasured`, never zeroed and never silently dropped*) — **aborting was a
  third behaviour nobody sanctioned**, and it is D43's shape one level up: *one unregistered type must not
  brick a file* becomes *one unmeasurable element must not brick an export*. At the 10k target D48 makes
  BINDING, that is a whole building's quantities lost to one box.
  - **⚠⚠ AND THIS SESSION'S OWN WORK WIDENED IT, WHICH IS WHY IT WAS SWEPT NOW.** D72 made `quantities()` issue
    a `measure(ref)` **per declared exposed face**, and Entry 62 put a declaration on every shipped Type — so
    the number of kernel calls a take-off makes, and with it the surface on which one can refuse, grew by
    roughly the number of faces declared. *Entry 58's standing lesson turned on my own work for the second
    time this session: a surface going green is when the sweep should START.*
  - **THE REACHABLE CAUSE, and nothing validated it: `BuiltPart.exposedRefs` was never checked to be a SUBSET
    of the part's own `refs`.** A Type naming a face it does not have produced an element that built
    **`valid`**, looked perfect, and refused only when somebody priced the building. Measured end to end: three
    good walls plus one such element ⇒ `projectQuantities` threw `[UNRESOLVED_SUBSHAPE_REF]` and the three
    walls were lost with it. ⚠ **On a member that FREEZES at P5, and D61 data-families make third-party Types
    a v1.0.x reality.**
  - **FIXED TWICE, AND THE TWO ARE NOT REDUNDANT.** **(a) At the source:** a declaration naming a face the part
    does not have is now REFUSED at build time — one shared `badExposedRef()` wired into all **three**
    part-producing sites (base, D59 child, `buildLeaf`), in the same idiom and two lines from the check that
    already refuses a Type minting two parts on one DAG node. ⚠ Silently SKIPPING the bad ref was the tempting
    alternative and is worse: it under-reports an area while still wearing `basis: 'exact'` — **rule 15's own
    failure mode by a new road.** **(b) As a backstop:** `projectQuantities` reports a measure failure in
    `unmeasured` instead of throwing, which honours the ruling for every cause nobody can name in advance (a
    degenerate solid, an `INVALID_RESULT`). Tested with a gateway that refuses one measurement — the only
    honest way left to reach it once (a) exists.
  - **⚠ A DIRECT `quantities(id)` STILL THROWS, deliberately.** Rule 4 is about *which* last-good state is
    preserved: for one element that is nothing, for an aggregate it is **every other element**. Asserted.
  - **⚠ AND THE TEST WAS WRONG BEFORE THE CODE WAS: I first asserted D43 semantics** (carry the element as
    `failed`) and the build correctly REJECTED the command instead. **The existing idiom is right and the
    distinction is worth writing down: D43 is for a type this session does not KNOW** — a plugin, a Miqdar
    file, one from the future — which is `failure: 'unbuildable'`, carried and preserved verbatim; **a type
    that is simply WRONG is `failure: 'geometry'`, and rule 4 rejects it and keeps last-good.** On the LOAD
    path both are carried (`rebuildAll` never rejects), which is the road the backstop test takes — author
    with a correct Type, save, reopen against a registry whose same type id now declares a face it lacks (an
    app upgrade, a plugin version, a `.bnn` authored elsewhere).
  - **Revert-verified test-first: 3 of the 5 measured failing**, the other two being the additivity gates (a
    correctly-declaring Type is untouched; a direct query still refuses).
- **⇒ SWEEP LEDGER AFTER THIS SESSION: THIRTEEN RULES SWEPT, SEVEN DIRTY.** Dirty: 1, 3, 4, 5, 12, 15, 16 (+ the
  D68 option invariant). Clean: 2, 6, 9, 10, 11, 13. **⚠ STILL UNSWEPT: 7, 8, 14, 17, 18.**

### Entry 63 — 2026-07-28 — Amer — **THE RENDERER BATCHING REWRITE SHIPS: ~30,700 DRAW CALLS → 2 AT THE 10k TARGET (606 ms → ~10–14 ms, 1.6 → ~80 fps). THE ENTRY-55 (b)+(d) SCALE WALL IS GONE. NO FROZEN CONTRACT TOUCHED; ONE REAL BUG FOUND BY REMOVING 16k PARTS.**
**Task (owner):** resume Bunyan as Amer; picked the **renderer batching / instancing** track (the owner chose it from
the post-freeze Amer tracks) — the direct answer to Entry 55's finding that BOTH interactive scale axes collapse to the
one-`THREE.Mesh`-per-part redraw wall (~30,700 draw calls / ~606 ms / 1.6 fps at 16k parts). Design-first per this
project's ethos: wrote `P4_step9_renderer_batching_design.md`, owner ruled its §8 (Q1 = batch edges now, the full win),
then built + measured. `pnpm verify` fully green (**490 tests, +20**; typecheck incl. apps/web, lint, format, reseed).
✅ **COMMITTED + PUSHED (owner-authorised, 2026-07-28).**

- **WHAT I BUILT (`apps/web/src/render/`, all internal to `Viewport` — the seam was already right).** Every opaque face
  part now lives in ONE `THREE.BatchedMesh` (per-instance colour via `setColorAt`, one multi-draw call) and every edge in
  ONE `THREE.LineSegments` over a shared, sub-range-allocated position buffer. **End state ~2 draw calls for the whole
  model**, down from ~2 per part. New files: **`PartBatch.ts`** (the three.js batch owner — install/recolor/remove/
  pick-remap, `setGeometryAt`-in-place-with-delete+add-fallback, geometric growth, `optimize()`+edge compaction),
  **`edgeAlloc.ts`** (the PURE edge-buffer allocator + compaction planner — `reconcile.ts` discipline, unit-tested in
  Node), **`tessellation.ts`** (the shared `toBufferGeometry`/`buildEdgeSegments`/`EDGE_COLOR` helpers, moved out of
  `Viewport` to break the `PartBatch` import cycle; `Viewport` re-exports them so the scale harness is untouched).
- **⚠ EVERY INVARIANT PRESERVED (design §4).** `RenderPart`, `RenderGateway`, `planRedraw`/`reconcile.ts`, `pick.ts`/
  `PickResult`, `App.tsx` — ALL unchanged; batching is entirely inside `Viewport`. **D30** (a part is individually
  addressable) — one instance per part, per-instance colour. **2b incremental redraw** — a rebuilt part rewrites only ITS
  instance + edge slot (O(changed), not O(N)); the step-2b tessellation-count test is green VERBATIM. **step-4 picking**
  — the load-bearing one the plan warned "after picking it is a rewrite" (imp_plan:366): a `BatchedMesh` raycast reports a
  GLOBAL face index + `batchId`; `getGeometryIdAt`+`getGeometryRangeAt` remap it to the part's LOCAL triangle, which runs
  through the UNCHANGED retained-provenance path (`localFaceIndex` helper, pure-tested). **Gained free:**
  `perObjectFrustumCulled`. **No `scene.json`/protocol/verb/`@bunyan/document` change — app-layer three.js only, below
  every frozen contract; not a freeze item.**
- **⚠⚠ THE MEASURED BEFORE/AFTER (real browser, ANGLE / Intel UHD — Entry 55's GPU; the scale page now runs BOTH sweeps
  of the same scene):**
```
   parts    UNBATCHED (Entry 55)         BATCHED (this build)
    1,000   2,036 calls /  ~65 ms        2 calls /  1.8 ms (555 fps)
    8,000  15,762 calls / ~350 ms        2 calls /  6.6 ms (152 fps)
►  16,000  30,746 calls /  606 ms        2 calls / 10–14 ms (73–93 fps)   ← the 10k-element target
```
  **At target: 30,746 → 2 draw calls (~15,000×), 606 → ~10–14 ms (~50×, 1.6 → ~80 fps).** Same triangle counts (184k at
  16k) in both columns — identical geometry, just batched, so the win is purely the draw-call collapse the finding named.
  **(d) follows by composition (Entry 55's own logic in reverse): edit COMPUTE unchanged (~23 ms flat, 2b), post-edit
  frame now a batched frame (~10 ms) ⇒ perceived edit latency ~590 ms → ~35 ms.** ⇒ the D8 recommendation from Entry 55
  is REINFORCED, not changed: the interactive axes were a single-threaded renderer-batching fix, and they are now fixed
  single-threaded — multithreading stays v1.0.x (owner already ruled D8 that way, Entry 57).
- **⚠ ONE REAL BUG, FOUND THE PROJECT'S WAY (§1b — "cut a shape nobody cut").** Removing 16,000 parts at once (the harness
  teardown) threw `THREE.BatchedMesh: Invalid instanceId` — `PartBatch.remove` deleted the instance and THEN the geometry,
  but three's `deleteGeometry` ALREADY cascades to the instance, so the second delete hit a dead id. The small unit
  fixtures never removed enough parts to see it; the 16k teardown did. **Fixed (call `deleteGeometry` alone) + REVERT-
  VERIFIED headlessly** — `PartBatch.test.ts` reintroduces the double-delete and gets the EXACT browser error. ⚠ This is
  the app's real element-delete path too (a `deleteElement` removes parts through the same seam), so it is a genuine fix,
  not just a harness artifact.
- **VERIFICATION (measure, don't assert).** (1) Both sweeps measured in a real browser (numbers above); the batched sweep
  runs FIRST + parks on `window.__batchedSweep` as it accrues, so the deliverable is captured before the heavy unbatched
  re-confirmation strains the tab. (2) The batched teardown that had thrown now proceeds cleanly into the next phase
  (the fix, in-browser). (3) `PartBatch` is HEADLESSLY testable (its textures are plain data, GPU-uploaded only at render)
  ⇒ `PartBatch.test.ts` (5), `edgeAlloc.test.ts` (7), `pick.test.ts` +3 (the batch remap). (4) The APP boots, builds,
  tessellates + computes EXACT quantities through the batched `Viewport` with ZERO console errors. (5) `pnpm verify`
  green (**490 tests**). ⚠ **The Browser pane cannot screenshot the continuously-animating WebGL canvas** (it times out) —
  so correctness is proven via the DOM/`window` measurement path + the console-error-free app boot + the headless tests,
  the same "GL-only code is browser-verified, logic is headless-verified" split as the storage/scale precedents.
- **✅ COMMITTED + PUSHED (owner-authorised).** Box: dev server on :5173 during measurement then STOPPED; the scale page
  peaked ~16k batched instances in the tab (box healthy); nothing installed, no containers touched.

**NEXT (Amer, all still post-freeze / parallel — none blocks the owner's freeze):** the renderer batching is now DONE, so
the remaining browser tracks are **P4.5** (the interaction model — tool state machine, snapping, preview, numeric entry;
gated on the baseline-Wall, which exists) · a **File System Access** `StorageAdapter` (additive, Entry 56) · **WebGPU +
WebGL2 fallback** (P4 step 1) · **TSL shading** (step 7) · **service worker/PWA + Cloudflare deploy** · real material
appearance + transparency (a second `BatchedMesh` material group — designed for in §2, not built). **The freeze (step 6)
remains the owner's act.**

### Entry 64 — 2026-07-28 — Zayd — **THE PRE-FREEZE BACKWARD SWEEP IS COMPLETE: THE LAST FIVE RULES (7, 8, 14, 17, 18) SWEPT. 14 AND 18 DIRTY AND FIXED (D76, D77), 8 DIRTY AND SURFACED, 7 AND 17 CLEAN. ALL EIGHTEEN RULES NOW SWEPT — NINE DIRTY. 503 GREEN.**
**Task (owner):** continue the pre-freeze adversarial backward sweep (Entries 57–62) over the five rules §1c-8's ledger still listed as UNSWEPT, one at a time, by the §1b/§1c method. Pulled first — already at `a175d61` (Entry 63, Amer's renderer batching). `pnpm verify` **503/503**, real exit code captured (490 → +13). Nothing committed: commits and pushes are owner-gated.

- **⚠⚠ RULE 14 — DIRTY (D76). THE CHANGE FEED COULD REPORT A SILENCE IT HAD NO RIGHT TO, AND THAT IS WORSE THAN A WRONG NUMBER.** Swept first because Entry 62 flagged it as *"the one currently enforced by MEMORY ALONE"* and the one with the most consumers. **Every mechanical half was sound AND already tested** (`document-persistence.test.ts`: never trimmed, an undo appends a reversal, the anchor exists, the delta is one filter) — so the defect was not in the mechanism but in **the precondition underneath it**: `issued_at_seq` names a position in the journal, and **nothing anywhere checked that the journal handed to a consumer contained that position.** Measured on a wall that grew 6 m → 8 m after the baseline:
  ```
    the log the .bnn carried              anchor?   what the consumer received
    doc.changeFeed()  (correct)            yes      1 element, modified_qty, 4.8 m³   ✓
    doc.history()     (the undo stack)     NO       0 elements — the wall built after the baseline ABSENT
    omitted, revision kept                 NO       0 elements, all-zero summary
  ```
  - **⚠⚠ `[]` IS INDISTINGUISHABLE FROM *"NOTHING HAS HAPPENED SINCE I ISSUED IT"*** — which is a true and ordinary answer — so the failure arrives as a **valid `contract_version: 1.2`, `source: bunyan` package saying the storey did not change.** Planitor's own consumer rule reads absence-from-`elements` as `unchanged` ⇒ **it keeps billing the model it already has.** *The moat's sentence is "a tool that guesses what changed will eventually guess wrong"; this arrives with no guessing at all.*
  - **⚠ THE DETECTOR IS STRUCTURAL, AND D41 IS WHY IT WORKS:** an issued revision is journalled but **deliberately never pushed onto the undo stack** (*"you cannot recall a revision you have already handed downstream"*). So a "journal" that is really `doc.history()` **cannot** contain the anchor — the exact mistake the docs have warned about in prose since D40 is the one thing the check is guaranteed to catch.
  - **FIX: one predicate + one message, three refusal sites.** `changesSince` and `exportCleanDelta` refuse to answer; **`saveBnn` refuses to WRITE** a file whose journal contradicts its own manifest — the lie is refused where it is minted. ⚠ **An ABSENT journal stays legal** (a scene-only `.bnn` is a real document) and is refused only when asked for a delta; **the model still opens, rebuilds and measures** — the refusal is scoped to the delta, never to the document (D43's discipline). Also fixed: `BNN_CODEC.write` defaulted to `{kernelBuildId:'unknown'}`, fabricating a build id and silently dropping journal AND revision on the very seam D71 built for the app's save path.
  - **⚠⚠ AND THE GUARD, WRITTEN SCALAR-ONLY, WAS REFUSED BY THE D60 CO-AUTHORING TEST — a reservation defending itself.** Under a merge frontier the scalar cut is ambiguous *by design* (two replicas both have a `seq = 42`), so the edit at `issued_at_seq` need not be an issuance at all. `revision.frontier` (reserved, never minted in v1.0.0) now defers the check to the frontier path. **Writing it without that clause would have foreclosed row Ⓒ four days before the freeze** — and nothing but that test would have said so. *This is what rule 8 looks like when it works.*
  - Revert-verified in the stronger order: **5 of 5 measured failing first** (`tests/journal-transport-rule14.test.ts`, 6).
- **⚠ RULE 7 — CLEAN, by counting the BOUNDARIES rather than reading the code; AND IT IS THE FIRST RULE FOUND CLEAN WITH NOTHING PROTECTING IT.** Every crossing declares its units: the **frozen kernel protocol** says *"Angles are DEGREES"* and `kernel.cpp` converts to radians **and range-validates `(0,360]`**; the Clean Delta converts mm³→m³/mm²→m²/mm→m under `units:'metric'`; every reserved surface that freezes at P5 declares mm/degrees in its own doc; and of **49 numeric `ParamSchema` leaves, 40 declared `unit`** — the 9 that did not were 5 dimensionless counts/indices (correct) and 4 coordinate arrays declaring mm in prose only.
  - **⚠⚠ BUT IT WAS CLEAN ONLY BECAUSE EVERYONE REMEMBERED — the condition under which all nine dirty rules were found dirty.** Rules 9/10 held because a violation *could not be written silently*; rule 7 had no such mechanism. **It has one now:** `tests/units-rule7.test.ts` enumerates every numeric leaf and fails on any that ships without a unit, against a **named** dimensionless allow-list (both directions, so a dead exemption cannot linger). Revert-verified by deleting `unit` from `core.wall`'s `height`: the failure names the field. The 4 coordinate arrays now declare `unit:'mm'` on their items, so a wall's baseline — the most unit-bearing pair of numbers in the product — is machine-readable rather than something an agent must parse out of a description.
- **⚠⚠ RULE 18 — DIRTY (D77), AND DIRTY AGAINST THE *INVALIDATOR* WHILE CLEAN AGAINST EVERY CONSUMER.** `BuiltChild.styleId` is a real member and the build resolves it into a child's context exactly as for an authored row — **so the build READS a child's style** — while the style→instance edge answered *"every element wearing this style"* out of `scene.elements`, **and a Model-A child is not a scene row.** Measured on real OCCT: `updateStyle` on a style worn only by children reported **`rebuilt: []`**, the panels' solids stayed at **20,000,000 mm³ where 60,000,000 is correct (3×)**, published by `projectQuantities` under `basis: 'exact'` — **and an unrelated `rebuildAll` silently cured it**, so the live session and the saved file disagreed and only the file was right. The `sections` edge inherited it verbatim.
  - **⚠ THE SWEEP FORM THAT FOUND IT IS NOT ENTRY 59's.** *"Grep everything that iterates the collection, ask does it aggregate or publish"* could not have found this: the invalidator neither aggregates nor publishes — **it decides what is rebuilt at all.** ⇒ **when a rule adds a new KIND of thing, sweep everything that quantifies over "every one of them", the machinery included.**
  - **FIX:** `childStyleUsers(builtTree, authoredIds)` walks DOWN from each authored root (never parsing a PEI — D44/D59 say ids are opaque) and the graph takes it as an optional argument, so **the EDGE stays declared in `dependency.ts`** and `#touched` stays the seam that feeds it rather than becoming a second place edges live (the hole that lost the container edge in Entry 24b). The **authored root** re-stages, which regenerates the child. Revert-verified test-first (2 of 3; the third is the additivity gate — an unworn style still invalidates nothing).
- **⚠ RULE 17 — CLEAN, and clean BY SHAPE, which is the strong form:** a `Dimension` has **no value field at all**, a `Tag` stores a `subject` KEY not its text, a `ScheduleDefinition` stores a filter + column keys, a `ViewDescriptor` stores only how to project. There is nowhere for a stale drawing to hide. **⚠⚠ ONE FINDING SURFACED, NOT FIXED: `Dimension.anchors` accepts the free `point` anchor** — correctly reserved as *"the escape hatch for annotation that references no geometry… it does NOT survive a model edit, by design."* Right for a text note; **wrong for a dimension, the one annotation a builder reads AS a measurement.** Two paper anchors give a number no model edit will ever update — this rule's own *"drifts and lies"*. Narrowing `Dimension.anchors` to the model-anchored members is **one line while the shape is RC; a three-product amendment after step 6**, by which time the P6 body author will have implemented it.
- **⚠⚠ RULE 8 — DIRTY, SURFACED, AND IT IS THE ONE ITEM THIS SESSION LEAVES ON THE OWNER'S DESK.** The sweep's form for a meta-rule is *the reservations were made on a date; what has been BUILT since, and does any of it foreclose?* (D58–D66 landed 07-21→07-24; D67–D75 and Entry 63 all landed after.) **The find: `BuiltPart.exposedRefs` (D72, 07-27) — the member that answers *"what area do I bill?"* — is TYPE-ONLY knowledge by design, and the D61 family grammar (07-22, freezing at P5) has no slot for it.** `FamilyPart` carries `name`/`materialId`/`discipline`/`base`/`modifiers` and nothing that names a billable face ⇒ **every data-authored family can only ever report the absent-defaulted whole-solid area** — the number D72 measured at **1.07×–3.03× wrong** and called *"a wrong number wearing the `exact` badge"*. **The families north-star (§9, Revit's Family-Editor moat) would ship permanently unable to bill correctly**, and after step 6 the slot is a three-product amendment. ⚠ **NOT fixed here on purpose: how DATA names a face** (role names on a primitive? an index into `parts[]`?) **is a grammar design + an owner ruling, not a mechanical fix**, and inventing one unilaterally four days before a freeze is exactly what this project's method forbids.
- **⚠ THE `format:check` TRAP BIT AGAIN — FIFTH SESSION RUNNING — plus two lint/type failures after it.** All three were caught only by capturing the REAL exit code (`pnpm verify` exited 1 with prettier warnings *after* typecheck and lint had passed). **A local gate whose exit code you do not read is not a gate.**
- **Box:** read/measure/build only; `pnpm verify` ×7 + targeted vitest; **three throwaway probes written and deleted**; nothing installed, no containers touched, no ports bound, no kernel rebuild (every change is TS); `/tmp` 10 MB; both live public sites up throughout.

**NEXT:**
- **Owner:** **the FREEZE (step 6) is still yours and still unblocked** — D76 and D77 moved no frozen byte, bumped no `SCENE_SCHEMA_VERSION`, added no field and no verb. ⚠⚠ **TWO RULINGS ARE NOW OWED, BOTH CHEAP ONLY UNTIL THE FREEZE: (1) rule 8 — does `FamilyDefinition` get a way to declare billable faces?** (without it, D61 families ship unable to answer the question D72 exists for); **(2) rule 17 — should `Dimension.anchors` exclude the free `point` anchor?** (a dimension nothing updates is on the artifact whose job is to be measured). ⚠ Still parked from Entry 62: should `undo`/`redo` become Commands (rule 9)?
- **Zayd:** the schedules body (D58 row Ⓐ — the largest remaining v1.0.0 item; wants a design doc + a ruling round) · the D29 cache bodies (§4j-2 FIRST — it is an identity task, not a serializer task). *(⇒ the schedules body is DONE — Entry 65/D78.)*
- **⚠ THE SWEEP LEDGER IS NOW COMPLETE: 18 rules swept, 9 dirty.** There is no unswept rule left to hide behind — but note what the two clean ones cost: rule 7 was clean *by memory* until this session gave it a test, and rule 17 is clean *by shape* only until a body is written against it. **A rule is not permanently clean; it is clean as of the last thing that was built.**
- **Amer:** unchanged (P4.5, FSA adapter, WebGPU, service worker/PWA, Cloudflare deploy, the optional `codecFor` wiring). ⚠ **Two behaviour changes the UI may see:** `saveBnn` now THROWS if handed `doc.history()` as the journal alongside a revision (the app already passes `changeFeed()`, so nothing to do), and `BNN_CODEC.write` now requires its options rather than inventing them — relevant when the open/save wiring moves onto `codecFor`.

### Entry 65 — 2026-07-28 — Zayd — **THE SCHEDULES BODY SHIPS (D58 row Ⓐ, D78) — AND THE WRONG LOOP IT REPLACES WAS LIVING INSIDE THE RESERVATION'S OWN PASSING TEST. THREE PRE-FREEZE RULINGS TAKEN. 517 GREEN.**
**⚠ PUSHED (owner-authorised, 2026-07-28): `origin/main` `a175d61 → 7b456db`** — Entries 64 AND 65 in one commit, because Entry 64 had been left uncommitted by the previous session and its changes intermingle with Entry 65's in `document.ts` and `current_state.md`; splitting them would have meant hand-reconstructing the handoff log, which is the one artifact not worth risking for tidier history. Both narratives are recorded in full here. **⚠⚠ AMER IS TWO ENTRIES BEHIND — `git pull` before any browser work.** Both prompt files' §1 were also corrected on the way (the `format:check` trap is at SIX sessions, not five; `@bunyan/types` + `@bunyan/sketch-solver` are named as Zayd's, which neither prompt had said).

**Task (owner, `Zayd_Prompt.md` §2):** the schedules body — the largest remaining v1.0.0 item — **design-first**. Pulled first; already at `a175d61` (Entry 63). Baseline `pnpm verify` **503/503**, real exit code captured, matching Entry 64. `P5_step6B_schedules_design.md` written, four questions put to the owner, all four ruled, then built. Final `pnpm verify` **517/517**, real exit code **0** (503 → +14). Nothing committed: commits and pushes are owner-gated.

- **⚠⚠ THE GAP WAS MEASURED BEFORE IT WAS DESIGNED (§1b), AND THE THIRD NUMBER IS THE ONE THAT MATTERS.** Three throwaway probes against real OCCT + the shipped `@bunyan/types`, asking what the body would report if written the obvious way:
  ```
    a curtain-panel schedule    over scene.elements    0 rows     where 6 is correct   (1 authored row, 17 real)
    a no-filter schedule        over scene.elements    THREW      on the PURE COMPOSITE, not the void
    a wall schedule, one non-active design option      2.0000×    over-report (3.84 m³ vs 1.92 m³)
    the same three over modelElements()                6 · 250,320,000 mm³ over 13 rows · 1.0000×
  ```
  - **⚠ THE FIRST ONE'S FAILURE MODE IS AN EMPTY TABLE, NOT A CRASH.** A curtain-panel schedule is the canonical Revit curtain-wall deliverable and the exact case D59 exists to prove; over `scene.elements` it renders zero rows and reports no error — *a schedule of a building that appears to have no panels.* Nothing in a green suite looks at it.
  - **⚠⚠ THE THIRD IS D65's OWN SENTENCE, ARRIVING AT THE CONSUMER IT NAMES FIRST.** D65 wrote *"a schedule double-counts and work packages are published for a scheme nobody builds"* into the frozen contract; D67 fixed the rule's signature, D68 swept it backward onto the room solver and the join resolver. **The schedule was the one consumer that had no body to fix** — so it is the only one where the invariant was satisfied by there being nothing there yet.
- **⇒ THE ONE ARCHITECTURAL DECISION, AND ALL THREE DEFECTS FOLLOW FROM IT: THE BODY HAS NO ENUMERATION LOOP.** It is `modelElements()` → filter → project each element onto columns. The four filters (`P5_step6A` §2) already hold every rule the naive version got wrong, which is what that query was built for and what the plan asked for in its own words (*"make it a command/query, not a loop every consumer rewrites"*). Its third and last consumer has now collected.
- **⚠⚠⚠ AND THE DURABLE LESSON IS *WHERE* THE WRONG LOOP WAS LIVING — this is §1c-7's disease in a form it has not taken before.** The naive evaluator is not hypothetical and was not mine: it is `tests/documentation-anchoring.test.ts`'s `evaluate` helper, **written in Entry 47 to PROVE the reservation**, commented *"this is what the v1.0.x renderer will do,"* and **green from the day it was written** — because its fixture is two plain walls: no children, no options, no composite, nothing unmeasurable. **A reservation's own proof-of-concept is the most likely thing a body author lifts**, and here the misleading artifact was a **passing test**, not prose — which is worse, because the project's own method trusts tests over claims. ⇒ **it is retired onto the real body in the same commit**, asserting exactly what it asserted before, so the repo stops carrying a worked example of the wrong loop. ⚠ **Generalises: when you reserve a shape, a throwaway evaluator written to prove it is a LIABILITY the moment it outlives the proof.** Either delete it with the proof or make it the body.
- **⚠⚠ THREE OWNER RULINGS, ALL FOUND BY WALKING THE RESERVED SHAPE AGAINST A REAL MODEL FOR THE FIRST TIME, ALL CHEAP ONLY UNTIL STEP 6 (D78).**
  - **Q1 — `groupBy` names STABLE COLUMN KEYS, never display headings.** The reserved comment read *"grouping by a column heading/key"* — **two different fields, and only one is an identity.** The heading reading is **D70 (rule 12) verbatim**: rename a heading and every group silently re-keys, two columns given the same title merge, and a column with no heading cannot be grouped at all. ⚠ **Caught on a surface that had no body yet — the cheapest moment this project has ever caught one of these**, and the fix was one doc-comment plus `columnKeyOf` being the single place the grammar lives.
  - **Q2 — `ScheduleDefinition.designOptionIds?` RESERVED.** D65 put the field on `ViewCommon`; a schedule is placed on a sheet through the same `Viewport` and got nothing, so a drawing view could be saved as *"the Option B plan"* while the schedule beside it on the same sheet could not. It forecloses no behaviour (the evaluator takes the selection as an argument) — the reason to do it now is the **ⓥ precedent: the consumer-facing rule is written IN at reserve time**, and its comment carries the exclusion invariant so a P6 author does not re-derive it.
  - **Q3 — `ChildOverride.mark?` RESERVED** (weakly recommended, and it should be read that way). `Element.mark` is AUTHORED and a D59 Model-A child **is not a scene row**, so neither `BuiltChild` (the recipe half) nor `ChildOverride` (the authored half) could carry it ⇒ a curtain-panel Mark column blank for **16 of a curtain wall's 17 rows**. ⚠ Not a lost capability — `BuiltChild.name` exists and its comment already says *"a schedule/tag reads it"*; what was missing is only the user-editable version. A pure reservation: nothing reads `childOverrides` in v1.0.0.
  - **Q4 — the evaluator only.** The schedule CRUD is a separate additive unit (Entry 47 §7: documentation entities are not elements, so a new command is an ordinary registry entry).
- **⚠⚠ TWO DEFECTS IN MY OWN CODE, BOTH CAUGHT BY THE TESTS, AND BOTH ARE THE SAME CONFLATION ONE LEVEL DOWN.** (a) A volume total came back **absent where 250,320,000 mm³ is right**, because I let *"no quantity BY CONSTRUCTION"* (a pure void, a pure composite) poison a sum the way *"could not measure"* does — **D72's `exposedRefs: [] vs absent` by a new road**, and it bites in both directions: conflate one way and every total vanishes the moment a curtain wall is in the model; the other way and a partial sum ships wearing `basis: 'exact'`. ⇒ `ScheduleCell.unknown` marks the genuine unknown, and the totals **mirror `QuantityTotal` exactly** rather than inventing a second semantic three products would then disagree about: volume/area sum what is there with `unmeasured` beside them, **mass is absent rather than partial**. (b) A column whose every cell was unknown got **no total entry at all**, so `totals.get('quantity:mass') === undefined` read as *"there is no such column"* rather than *"the answer is unknown"* — **domain rule 14's shape, silence a consumer reads as a fact** ⇒ numeric-ness is the column's **declared source**, never what the rows happened to produce.
- **⚠ `ModelElement` gained `params` + `mark`** (a query result type, not a frozen shape). A `param` column could not otherwise be answered for a **generated child**, whose params live only on the synthetic `Element` the build carries — and the alternative was a second walk of the geometry tree inside the schedule body, which is the exact duplication `enumerate.ts` exists to prevent. *D74's lesson: add the field where the ONE walk already produces it.*
- **⚠ A schedule with no `quantity` column makes ZERO kernel calls** (asserted by counting requests on a wrapped client) — selection and every `field`/`param`/`count` cell are pure functions of the scene and the built tree. A 400-door schedule of marks and types is free.
- **REVERT-VERIFIED FIVE WAYS, each firing exactly the right tests:** removing the children walk → **4 fail**; removing the option filter → **2 fail**; keying columns by `heading` → **2 fail**; dropping the `unknown` flag → **1 fail, `expected +0 to be undefined`** (the 0 kg wearing the `exact` badge, precisely); deriving numeric-ness from the rows → **1 fail**.
- **⚠ THE `format:check` TRAP BIT A SIXTH SESSION RUNNING**, plus one lint warning — `pnpm verify` exited **1** with prettier warnings and an unused `eslint-disable` *after* typecheck and tests had passed. Caught only by capturing the REAL exit code. **A local gate whose exit code you do not read is not a gate.**
- **Box:** read/measure/build only; `pnpm verify` ×3 + targeted vitest ×12; **one throwaway probe written and deleted**; nothing installed, no containers touched, no ports bound, no kernel rebuild (every change is TS); `/tmp` 11 MB; both live public sites up throughout.

**NEXT:**
- **Owner:** **the FREEZE (step 6) is still yours and still unblocked.** D78 moved no frozen byte and bumped no `SCENE_SCHEMA_VERSION`; its two reservations are optional and absent-defaulted. ⚠⚠ **THE TWO ENTRY-64 RULINGS ARE STILL OWED AND STILL CHEAP ONLY UNTIL THE FREEZE: (1) rule 8 — does `FamilyDefinition` get a way to declare billable faces?** (without it, D61 families ship unable to answer the question D72 exists for); **(2) rule 17 — should `Dimension.anchors` exclude the free `point` anchor?** ⚠ Still parked from Entry 62: should `undo`/`redo` become Commands (rule 9)?
- **Zayd:** the schedule **CRUD** (owner Q4's second unit — `core.createSchedule`/`updateSchedule`/`deleteSchedule`, which promotes `scene.schedules` to a full `SceneCollection` with undo + a dependency edge; additive, not freeze-sensitive, and it is what makes v1.0.0's "one schedule" authorable) · then the remaining D58 minimal-2D bodies (**one plan + one section**, which need `sectionCut` — already reserved in the frozen protocol) · the D29 cache bodies (§4j-2 FIRST — an identity task, not a serializer task).
- **⚠ A NOTE FOR WHOEVER WRITES THE NEXT BODY OVER A RESERVED SHAPE** (the plan/section are next, and Ⓐ reserved them too): **this session found three defects in a reservation that had been green for seven days, and it found all three in the first hour of driving it against a real model.** The reservation was not wrong — it was *unexercised*, and §1c-6 already says a measured finding describes only the shape someone actually cut. **Reserving a shape and building its body are two different verifications, and only the second one meets the model.**
- **Amer: ⚠ THE OWNER CHOSE HIS NEXT TASK (2026-07-28) — P4.5, THE INTERACTION MODEL, DESIGN-FIRST**, over material appearance/transparency, a schedules UI, or a self-serve menu. Recorded here (not only in `Amer_Prompt.md` §2) because this file is where decisions live. The rest of his track is unchanged and explicitly deferred: material appearance + transparency, WebGPU + fallback, the FSA adapter, TSL shading, service worker/PWA + Cloudflare deploy, the optional `codecFor` wiring — plus the Entry-64 `saveBnn`/`BNN_CODEC.write` notes, which still stand.
  - ⚠⚠ **AND THE PROMPT-SYNC PASS FOUND SOMETHING BOTH PROMPTS HAD FLATTENED: `Amer_Prompt.md` said his whole track is *"post-freeze / parallel — none blocks the owner's freeze."* That is right about the FREEZE and wrong about the COST.** Freeze-gate rows **ⓑ** and **ⓘ** are assigned to **P4.5** and are still unrecorded: **no `core.move`/`setPlacement`/`rotate`/`copy`/`array` exists** (re-verified 2026-07-28 — the grep is still empty), and `UndoableEdit.transactionId` is **reserved but unused**. The plan's own instruction is to **drive those arg shapes with a real pointing device before `Command.argsSchema` freezes** — *"do not design `move` in the same phase that freezes it."* ⚠ **Entry 45 judged both freeze-SAFE and that judgement STANDS** (a move verb is additive under D19; `transactionId` is reserved; D52 folds "drag the wall's end" into `setParams` as one edit) — so this is **not** a freeze blocker and must not be reported as one. But Entry 45 also recorded the validation as *"still unrecorded,"* and **after the freeze it is worth nothing.** ⇒ Amer's design doc is asked to surface what a real pointing device teaches about those arg shapes, and to flag it. *A row that is freeze-safe is not the same as a row that is free to skip.*

### Entry 66 — 2026-07-28 — Amer — **P4.5 THE INTERACTION MODEL, DESIGN-FIRST: `P4.5_interaction_model_design.md` DELIVERED. SIX OWNER QUESTIONS PUT (Q1–Q6), TWO OF THEM THE PRE-FREEZE ROWS ⓑ/ⓘ. NO SOURCE TOUCHED — THE DELIVERABLE IS THE DOC. STOPPED FOR THE RULINGS.**
**Task (owner, `Amer_Prompt.md` §2):** P4.5, the interaction model, **design-first** — the largest remaining browser item and the layer D47 found missing (*"the tool/interaction layer is a first-class layer, and it was missing"*). Pulled first: `a175d61 → 525d6a7`, newest Entry = **65**, so Entries 64+65 were new to me (I was on Entry 63) — read both before starting, per the FRESH warning. The design doc is the deliverable; per the standing design-first rule I wrote it, put its open questions to the owner, and stopped there. **Nothing committed (owner-gated); nothing to commit but the new doc.**

- **⚠ THE DESIGN IS GROUNDED AGAINST THE REAL `apps/web`, NOT PROSE (§1b, applied to a design doc).** Before writing a line I read the actual seams the model has to build on, and the doc names them by file so the next author does not re-derive them:
  - **No move verb exists — re-verified this session** (the grep for `core.move`/`setPlacement`/`rotate`/`copy`/`array` in `commands.ts` is still empty; 39 registered commands, all CRUD, `placement` set at `core.createElement` and never changed). This is freeze-gate row ⓑ, still open.
  - **The renderer already retains everything a snap needs.** Each `DrawnPart` in `Viewport.ts:55` holds the full `MeshBuffers` — `positions`, `edgePositions`, `provenance` — keyed by stable `nodeId`; picking (`pick.ts`, `Viewport.pick`) is already a pure triangle→`SubShapeRef` resolution through that provenance. **Snapping is the same substrate one step further** (edge endpoints + face frames instead of hit triangles), which is why the spatial seam needs no new kernel op.
  - **The kernel already has the exact spatial ops** (`distance`/`bounds`/`classifyPoint`/`faceFrame`, live + tested) but **no seam lets the UI reach them** — the three existing seams (agent surface / `RenderGateway` / `GeometryGateway`) each refuse a UI spatial query by design. **That missing read-only seam is the real work of the phase.**
  - **The drag-dispatch discipline already exists** — `createLatestRunner` (`runner.ts`, single-flight trailing-latest) + the kernel's `coalesceKey`/`SUPERSEDED` path. The tool layer schedules previews on it and commits once.
- **⇒ THE DESIGN'S SPINE (all app-layer, below every frozen contract):** (1) **domain rule 17 proposed** — *a tool collects input; only a command changes the model; an in-progress interaction is not model state* (keeps rule 9 intact — a tool is strictly upstream of the one command layer); (2) **the tool state machine** (`activate → collect(n) → preview → commit ONE Command`; `Esc` leaves no trace; a tool is an `apps/web`-only registry entry, never a `scene.json` collection); (3) **the two-tier spatial-query seam** — a **browser-side approximate snap index** from the retained mesh (per-frame, cheap) with the **kernel's exact ops as the commit-only confirming fallback**, and the *"approximate never commits silently"* guard-rail written down because *"the snap that lied"* is a class of bug that is very hard to see; (4) **preview = cheap overlay, NEVER truth** (`dryRun` is ~100 ms/frame — it backs commit-time confirmation, not the rubber band, or someone re-introduces the half-committed state D42 abolished); (5) **numeric entry**; (6) selection/hide/filter as parallel non-gating work.
- **⚠⚠ THE TWO PRE-FREEZE OBLIGATIONS ARE SURFACED WITH PROPOSED SHAPES, AND FLAGGED FREEZE-SAFE-BUT-NOT-FREE (Amer_Prompt §2's explicit ask, Entry 65's ⓑ/ⓘ note).**
  - **ⓑ — reserve the move/placement command shapes.** Proposed arg shapes for `core.setPlacement`/`move`/`rotate`/`copy`/`array` (design §9), reasoned from the gestures. ⚠ **The design tension I most want the owner's eyes on:** a **baseline (D52) wall is moved by `setParams`, not `placement`** — dragging a whole wall translates both endpoints, dragging one end is `setParams` on that endpoint — so the move verbs are for elements whose position lives in `placement` (an Opening's offset, a placed family), and the commonest "move" in the product never calls them. Which elements go which way is exactly what a real pointing device confirms, and it freezes at step 6 (Q4).
  - **ⓘ — confirm the compound edit is ONE undoable unit.** **D52 already discharged the hard half:** under the shipped baseline Wall, *"drag the wall's free end"* is a single `core.setParams` on `end` (length derived) — no compound, one `UndoableEdit`. What remains is the genuinely-compound multi-element case (a corner where 3 walls meet; "add a room"), which needs `UndoableEdit.transactionId` (**reserved but still unused**). Recommend **exercising `transactionId` now** via the corner-drag — a reserved field never driven is Entry 45's own warning about `move` (Q5).
  - ⚠ **I do NOT claim either blocks the freeze** — Entry 45's freeze-safe judgement stands (additive move verb under D19; `transactionId` reserved; D52 folds the drag into `setParams`). They are cheap only until the freeze and worth nothing after it; that is the whole reason to record them now.
- **VERIFICATION: `pnpm verify` NOT RUN, and here is the honest reason** — this session changed **zero source or test code** (one new Markdown design doc at repo root). There is nothing for the suite to verify; running it would only re-confirm Zayd's Entry-65 baseline (517 green, and note `format:check` has exited 1 for six sessions on the dev box). The design-first rule is explicit that the doc is the deliverable and the build waits on the rulings — so there is no code claim to stand behind, and I am not manufacturing one. The moment a ruling arrives and the build starts, `pnpm verify` (real exit code, incl. `apps/web` typecheck) gates it.
- **Environment:** local PC, real browser. Read-only exploration only (Glob/Grep/Read across `apps/web`, `commands.ts`, `mesh.ts`, `review_P4.md`, `v1.0.0_imp_plan.md` P4.5); one file written (`P4.5_interaction_model_design.md`). No dev server started (nothing to preview — the design has no running artifact yet), no install, no build, no kernel touched.

**NEXT:**
- **Owner:** **P4.5 needs six rulings before the build starts — `P4.5_interaction_model_design.md` §12.** The two that are cheap only until the freeze are **Q4 (the move/placement arg shapes, ⓑ)** and **Q5 (exercise `transactionId`, ⓘ)**; the other four (Q1 rule-17 adoption+numbering, Q2 the two-tier snap seam, Q3 snap priority, Q6 phase scope) shape the build but do not touch the freeze. ⚠ The freeze (step 6) is unchanged by this session — nothing here moves a frozen byte. Your Entry-64/65 owed rulings (rule 8 `FamilyDefinition` billable faces; rule 17 `Dimension.anchors` free point; and the parked undo/redo-as-Commands) still stand alongside these.
- **Amer:** **the P4.5 build is blocked on Q1–Q6.** If a ruling arrives in chat, apply it AND record it in `P4.5_interaction_model_design.md` (this file is not where decisions live). Once ruled, build the spine (§2 tool state machine + §4 snap seam + the wall/opening/move tools + numeric entry + the ⓑ reservations); the P4 equivalence test run against a *tool-authored* edit (§11 criterion 2) is the machine proof the tool layer smuggled in no private path. ⚠ **Do not start the wall tool before confirming the D52 baseline Wall's `setParams` shape with the owner (Q4)** — the plan rules it. The rest of the browser track is unchanged and deferred (material appearance/transparency, WebGPU + fallback, FSA adapter, TSL shading, service worker/PWA + Cloudflare deploy, the optional `codecFor` wiring + the Entry-64 `saveBnn`/`BNN_CODEC.write` notes).
- **Zayd:** unchanged by this session — the schedule CRUD (owner Q4's second unit), then the D58 plan/section bodies, then the D29 cache. Nothing in the P4.5 design asks anything of the kernel: the snap seam reuses the already-live `distance`/`classifyPoint`/`faceFrame` ops, and if the build later needs the typed `SUPERSEDED` preserved across the document boundary (`runner.ts:91` stopgap) that is the pre-flagged P4-step-11 item, not new work.

### Entry 67 — 2026-07-28 — Amer — **P4.5 NON-GATING HALF SHIPS: SELECTION HIGHLIGHT + VIEW FILTER (hide / isolate / type / discipline) + THE APP'S FIRST KEYBOARD OWNER. NO FROZEN CONTRACT TOUCHED. ALL FIVE CI GATES GREEN INCLUDING `format:check`. 524 GREEN.**
**⚠ COMMITTED AND PUSHED (owner-authorised, 2026-07-28): `origin/main` `525d6a7 → c8006d3`** — Entries 66 AND 67 in one commit, because their `current_state.md` + prompt-file handoff edits intermingle in the same files and splitting them would mean hand-reconstructing the log (Entry 65's precedent). Both narratives are recorded in full here.
**Task (owner, in chat, 2026-07-28):** *"GO FOR next entry."* Entry 66 delivered the P4.5 design doc and stopped for owner rulings Q1–Q6; the design-first spine (tool state machine + snap seam + move verbs) is BLOCKED on those. So per Entry 66's own "NOT RULED" branch I built **the one part of P4.5 that needs no ruling and touches no frozen contract** (design §7/§8): selection/visibility/filtering. Build → verify → Entry (this is an ordinary feature, not design-first). **Nothing committed (owner-gated).**

- **⚠ WHY THIS WAS SAFE TO BUILD WITHOUT A RULING, AND THE DESIGN DOC SAID SO FIRST.** §7 records selection/hide/filter as *"a UI concern (additive, no contract cost)"* that *"rides the same `nodeId`/element identity the renderer now carries."* It reads only what the model already knows (`typeId`; `discipline` per part, D45) and writes **nothing** to the document — a hidden element is still in the scene, still saved, still built. So it does not depend on Q1–Q6 (which decide the *tool/snap/move* shapes) and cannot foreclose them. ⚠ **I deliberately did NOT pre-build the snap seam or any tool** — their shape is exactly what Q1–Q4 rule, and Entry 66 flagged pre-building them as the thing to avoid.
- **THE ONE ARCHITECTURAL DECISION: THE FILTER IS A PURE PREDICATE OVER THE EXISTING `renderParts` ARRAY, NOT A NEW RENDERER PATH.** `App` already flattens every element's parts into `RenderPart[]` and the viewport diffs on it (`planRedraw`, Entry 55/63). So **hide/isolate/type/discipline is just dropping parts from that array** (the viewport's existing `plan.remove` path removes them) and **selection highlight is just a different `color` for the selected element's parts** (the existing `#recolorPart` instance-colour swap — *never a re-tessellation*, design §5/§8). No change to `Viewport`, `PartBatch`, `pick`, or any seam.
- **WHAT LANDED (all `apps/web`, below every frozen contract):**
  - `apps/web/src/view/viewFilter.ts` — the PURE view-state module: `ViewFilter` (`hidden`/`isolated`/`types`/`disciplines`), `isElementVisible` (type + hide/isolate), `isPartVisible` (adds the per-part discipline gate — a discipline is a property of the PART not the element, D45, so "show only structure" drops a wall's plaster while keeping its blockwork), plus `toggleHidden`/`toggleInSet` (null ⇔ "all"; re-checking every member collapses back to null). ⚠ Logic lives here so it is **headless-verified** per the standing split — GL draws nothing here.
  - `apps/web/src/view/viewFilter.test.ts` — **7 headless tests** (Node): empty-shows-all, hide/show toggle, isolate-overrides-hide-and-type, type filter, the discipline-drops-one-part-keeps-the-sibling case, and the null-collapse of `toggleInSet`.
  - `App.tsx` — `filter` state; `renderParts` now filters through `isPartVisible` and paints the selected element `SELECTION_COLOR` (`0x4aa3ff`); a `present` memo enumerating the scene's actual types + disciplines (the filter's universe); a **View panel** (Hide / Isolate / Show-all + type checkboxes when >1 type + discipline checkboxes when >1 discipline); and **the app's FIRST-EVER `keydown` handler** (design §7: *"there is not one `keydown` handler in the entire app"*) — the single window-level owner: **Esc** clears selection, **Ctrl/Cmd+Z / +Y / +Shift+Z** drive undo/redo, and a key typed into an INPUT/TEXTAREA/SELECT/contentEditable is never hijacked (so the save-name box and param inputs still type normally).
  - `App.css` — `.view-filter` fieldset styling.
- **BROWSER-VERIFIED (real Vite dev server + real OCCT + real GPU, local PC), the GL-only half of the split:** clean boot, **zero console errors** through the whole sequence. Exercised live: unchecking the **architectural** discipline flipped the hint to "Filtered." and the checkbox to `checked:false` (confirmed via JS, not the a11y snapshot which lagged); **Isolate** → "Isolating one element. Un-isolate"; **Show all** reset; **Esc** cleared selection → "No element selected." Each interaction ran a `setScene` with a changed part set / colour and threw nothing.
- **HEADLESS-VERIFIED, the logic half:** the 7 `viewFilter` tests, and the whole suite. **`npm run` for the CI step list** (the root `verify` script chains `pnpm <step>` and `pnpm` is corepack-only / not on this box's PATH — each sub-script is plain tsc/eslint/prettier/vitest/node, so `npm run <step>` runs them identically): **typecheck 0 · lint 0 · format:check 0 · test 0 (70 files, 524 passed — was 517, +7 mine) · reseed:check 0.**
- **⚠⚠ THE `format:check` TRAP IS BROKEN AFTER SIX SESSIONS — BY DOING IT FIRST, NOT BY LUCK.** Entries 60/65 both shipped with `format:check` exiting 1 (caught only by the real exit code). This session ran `prettier --write` on every touched file **before** `verify`; the design doc `P4.5_interaction_model_design.md` (Entry 66's, markdown) was the one file it flagged, fixed, re-checked green. **All five gates are green together for the first time since Entry 59.** ⚠ The lesson is procedural: *format before you verify, not after you're surprised.*
- **Environment:** local PC, real browser. Vite dev server started + stopped; no install, no kernel rebuild (every change is TS/CSS/MD), no other project touched, no ports left bound.

**NEXT:**
- **Owner:** **P4.5's design-first spine is still blocked on Q1–Q6** (`P4.5_interaction_model_design.md` §12) — unchanged by this entry; the freeze-sensitive ones remain **Q4** (move/placement arg shapes, ⓑ) and **Q5** (exercise `transactionId`, ⓘ). This entry deliberately did the ruling-free work so momentum did not wait on the rulings; it forecloses none of them.
- **Amer:** when Q1–Q6 are ruled, build the spine (tool state machine §2 + snap seam §4 + wall/opening/move tools + numeric entry §6 + the ⓑ reservations); the selection/hover infra from this entry is the substrate the Select tool (§8) sits on. ⚠ Two additive follow-ons this entry deliberately left for the spine, not now: **hover highlight** (design §5 — a per-frame recolour of the candidate under the cursor; needs the pointer-move plumbing the tool layer brings) and **multi-select** (this entry is single-select, matching the property panel; a selection SET is a superset the tools will want). Everything else on the browser track is unchanged and deferred (material appearance, WebGPU, FSA adapter, TSL, PWA/deploy, the optional `codecFor` wiring).
- **Zayd:** unchanged — nothing in this entry touches the kernel, the document, or any frozen contract; it is pure `apps/web`.

### Entry 68 — 2026-07-29 — Zayd — **THE SCHEDULE CRUD SHIPS (D58 row Ⓐ's second unit, D79) — `scene.schedules` IS A FIRST-CLASS COLLECTION, AND THE VERBS CARRY THE REFUSAL THE BODY DELIBERATELY WILL NOT. 538 GREEN, ALL FIVE GATES 0.**
**⚠ COMMITTED AND PUSHED (owner-authorised, 2026-07-30): `origin/main` `b53a8bf → 892042a`** — Entry 68 alone, one commit (unlike Entries 64+65 and 66+67, nothing was left uncommitted by the previous session, so there was nothing to intermingle). **⚠ AMER IS ONE ENTRY BEHIND — `git pull` before any browser work**; the entry is `packages/document` only and asks nothing of him.
**Task (owner, `Zayd_Prompt.md` §2):** the schedule CRUD — owner Q4's deliberately-separated second unit (Entry 65 NEXT). Pulled first: `525d6a7 → b53a8bf`, newest Entry = **67**, matching `FRESH`; Entries 66 + 67 are Amer's and touch nothing I own, as `FRESH` said. Baseline `pnpm verify` **524/524, real exit code 0** (all five gates — Entry 67's `format:check` fix holds). Final **538/538, real exit code 0** (+14). Build → verify → Entry, as the task specified (not design-first: Entry 47 §7 already settled the freeze question — documentation entities are not elements, so a new command is an ordinary additive registry entry). **Nothing committed: commits and pushes are owner-gated.**

- **⚠⚠ THE GAP WAS MEASURED BEFORE IT WAS BUILT (§1b), AND THE ONE-LINE STATEMENT OF IT IS: THE RESERVED SHAPE HAD A READER AND NO WRITER.** Entry 65 shipped the evaluator; `scene.schedules` had no authoring verb, so v1.0.0's "one schedule" (D58) could be evaluated but never created, renamed or deleted. Six throwaway probes against real OCCT, all deleted:
  ```
    commands able to author a schedule            0   (of 29 — and 0 documentation verbs of ANY kind)
    the FIRST change to an absent collection      raw TypeError out of the undo machinery
    groupBy naming a column the schedule lacks    2 groups collapse to 1, key [""]
    a quantity key outside the frozen grammar     every cell NaN, the TOTAL NaN -> JSON `null`
    an unknown column `source`                    a raw TypeError out of the evaluator
    two columns sharing one key                   2 headers, ONE total entry — the second merges away
    deleting a schedule a SHEET places            1 dangling viewport, `brokenRefs: []`
  ```
- **⚠⚠ THE ARCHITECTURAL SENTENCE, AND EVERY REFUSAL FOLLOWS FROM IT: THE VERBS CARRY THE REFUSAL THE BODY DELIBERATELY WILL NOT.** `projectSchedule` *degrades* rather than refuses — deliberately, and its own comment says so — because a schedule is a PROJECTION and a projection must never deny a builder his table (rule 17). ⇒ **the authoring door is the only place a malformed definition can be stopped, and until this entry there was no authoring door.** So every defect above was reachable and silent not by oversight but by the body being right about its own job. The validator lives in `schedule.ts` beside `columnKeyOf` — *"the ONE place the key grammar lives"* (owner Q1) — because a validator that re-states the grammar elsewhere is a second copy of it, which is the very drift Q1 was ruled to prevent; `commands.ts` only turns its issues into a typed `CommandFailure`.
- **⚠⚠ THE PROMOTION WAS THE PART WITH DESIGN SURFACE, AND IT LANDED IN TWO STEPS, NOT THE THREE THE DESIGN PREDICTED — THE THIRD WOULD HAVE FALSIFIED ENTRY 47'S OWN RESERVATION TESTS.** Row Ⓐ's design (§6) predicted the CRUD would add *the `SceneCollection` member + an `emptyScene()` entry + the hostile-`.bnn` guard*. Adding the `emptyScene` entry did exactly what it promises — and turned **two green Entry-47 assertions red** (*"a Scene with NONE of the documentation collections is valid"*, *"a `.bnn` carrying no documentation defaults exactly as before — absent, not empty"*). ⚠ **The tempting move was to relax those two tests, and it would have been the wrong one:** they assert the reservation's actual semantics, they are still true, and this project's method is exactly the one that gets defeated by weakening a test to admit a change. **⇒ the collection MATERIALISES ON FIRST AUTHORING instead** (`applyOne` creates it), so a document with no schedules is byte-identical to one written before this entry, all four documentation collections keep ONE rule (absent ⇒ none of it), and Entry 47's tests pass **unmodified**. The guard follows the same logic and is therefore SHAPED differently from the required ones: **absent is legal, present-and-not-an-object is a typed refusal** — guarding it like `elements` would have rejected every `.bnn` ever written.
- **⚠ AND THE MECHANISM ENTRY 33 DESIGNED FIRED EXACTLY AS ADVERTISED:** adding `'schedules'` to `SceneCollection` **failed to compile** until its edge was declared in `dependency.ts` (`error TS2345: '"schedules"' is not assignable to parameter of type 'never'`, verified by deleting the case). The edge is a declared **"nothing"** — and the comment records the edge that would be *wrong* to declare, because it is the plausible one: *"editing a schedule re-stages the elements it lists"* would rebuild 400 solids to change a column heading. The schedule's own freshness needs no invalidation at all, because D78 stores nothing.
- **⚠⚠ THE DELETE GUARD FOUND THE FIRST REFERENCE D51'S LADDER CANNOT CLIMB, AND THE HONEST FIX WAS IN THE TYPE.** A `Sheet.viewports` entry may place a **schedule** (`documentation.ts` says one `viewId` addresses either id space), so deleting one out from under its sheet is an ordinary D51 broken reference — measured: **1 dangling viewport and `brokenRefs: []`**, i.e. nothing in the document recorded that the drawing set had lost a table. But **`redirect` could not be written**: repointing the viewport means writing `scene.sheets`, and `sheets` is still a pure reservation — no CRUD, not a `SceneCollection` — so the change my first draft emitted was one the dependency graph rejects at runtime, *a guard that crashes exactly when a caller takes its advice*. ⇒ **`Referrer.redirect` is now OPTIONAL**, `guardReferences` refuses a `retargetMap` entry it cannot honour with the reason, and the schedule referrer is RESTRICT-or-break (refuse by default, `acknowledge:true` to let it dangle). *D51's ladder is RESTRICT | SET | acknowledged CASCADE, and the SET rung genuinely does not exist for a collection nothing can author yet — it is now missing in the type instead of missing in the behaviour.* The sheet CRUD restores it by supplying a `redirect` and changing nothing else.
- **⚠ ONE CONTRACT-TOUCHING LINE, AND IT IS THE Ⓕ PRECEDENT VERBATIM: `ParamField.refTo` GAINED `'schedule'`.** `updateSchedule`/`deleteSchedule` take a schedule id, and typing it as a bare string leaves the generated picker/tool-list unable to say what the id names — then widening this union after `ParamSchema` freezes at P5 is an amendment across three products. It is additive, **no body switches on it** (the field's own comment says so), and row Ⓕ added `'system'`/`'designOption'` on exactly this reasoning pre-freeze. ⚠⚠ **AND THE SAME EXPOSURE EXISTS FOR `view`, `sheet`, `annotation` AND `family`, WHICH I DELIBERATELY DID NOT ADD — that is an owner call, not a side effect of this unit (see NEXT).**
- **⚠ A TOOLING DEFECT WORTH MORE THAN IT LOOKS, FOUND BY TRIPPING OVER IT: `schedule.ts` WAS INVISIBLE TO `grep`.** Entry 65's group-key separator was written as a **raw NUL byte** inside the string literal (`key.join('\0')` with an actual 0x00 in the file, not the escape). It compiles and runs correctly — and it makes the file **binary to grep**, so `grep -n "evaluateSchedule" packages/document/src/*.ts` silently skipped it and `grep -c ""` returned nothing. ⚠⚠ **This project's method IS grep — §1c-8's backward sweep is literally *"grep every iteration over the collection the rule governs"*, and §1b's second form is *"don't grep — COUNT"*. A source file no sweep can see is a file every future sweep silently under-counts.** Fixed to `' '` (identical behaviour, `schedules-body.test.ts` green unchanged). *A one-byte defect in a comment-free position, invisible to review and to the compiler, that quietly removes a file from the method the project relies on.*
- **⚠ WHAT THE VERBS REFUSE, AND WHY EACH LINE IS DRAWN WHERE IT IS.** An unknown column `source` (refused by the `argsSchema` enum itself, so the generated agent tool-list is the documentation) · a `field`/`quantity` key outside the frozen grammar · **two columns sharing one key** — `checkLayers`' rule one level up (*a structure addressed by a derived key must have unique keys or the addressing is a lie*; every cell lookup resolves to the first, so the second column is unaddressable) · a `groupBy` naming no column of **this** schedule · a zero-column schedule and a blank name (both render as a plausible empty artifact — D78's empty-table failure mode) · an unknown `designOptionId` (NOT_FOUND, never silently dropped). ⚠ **`param` keys are deliberately NOT checked against any Type's schema**: a schedule may legitimately be authored before the elements it schedules exist (that is what a template is), and an empty param cell is legible where a NUMBER (NaN) is not. *The line is drawn where silence stops being legible.*
- **⚠ THE UPDATE VALIDATES THE MERGED DEFINITION, NEVER THE ARGS.** `updateSchedule` replacing `columns` and mentioning no `groupBy` **strands the stored grouping** on columns that no longer exist — each half legal, the result silently degenerate, and invisible to any check that reads only what the caller passed. It is refused; changing both together is accepted.
- **REVERT-VERIFIED TEN WAYS, each firing exactly the tests it should:** `applyOne`'s absent-collection handling → **11 of 14 fail** (with no `emptyScene` entry every create goes through it — the design choice made the mechanism load-bearing) · the groupBy check → **2** · the key-domain checks → **1** · the duplicate-key check → **1** · merged-definition validation on update → **1** · the sheet referrer finder → **1** · the optional-collection `.bnn` guard → **1** · the un-retargetable-referrer refusal → **1** · deleting the dependency case → **a compile error** · and the three verbs' absence is what `tests/schedule-crud.test.ts` §1 asserts directly.
- **⚠ NOT DONE, DELIBERATELY, AND NAMED SO IT IS NOT MISTAKEN FOR DONE:** a hostile or hand-edited `.bnn` can still carry a malformed `ScheduleDefinition` — the CRUD guards the **authoring** door, not the file, and the body still degrades on such a definition exactly as before (that is its correct behaviour). Validating on load is a different call (D43's discipline: a file we do not understand opens and carries the thing verbatim) and I did not take it unasked.
- **⚠ FOR AMER — NO ACTION NEEDED, BUT KNOW IT:** the three verbs appear in the generated ribbon automatically (D21). `columns`/`filter`/`groupBy` render through the existing `JsonControl` (`SchemaForm` maps `array`/`object` to a JSON textarea) and `refTo: 'schedule'` renders as a text input with a `schedule id` placeholder — functional, unlovely, and **nothing in `apps/web` breaks**. A real schedules UI is a browser-track item nobody has scheduled.
- **Box:** read/measure/build only; `pnpm verify` ×4 + targeted vitest ×~20 + a 10-way revert sweep; **six throwaway probes written and deleted**; nothing installed, no containers touched, no ports bound, no kernel rebuild (every change is TS); `/tmp` 6.4 MB at start; both live public sites up throughout (`portfolio-caddy-1`, `beamstack-contact` untouched, as were Planitor's and Chantier's containers).

**NEXT:**
- **Owner:** **the FREEZE (step 6) is still yours and still unblocked** — D79 moved no frozen byte and bumped no `SCENE_SCHEMA_VERSION`. ⚠⚠ **ONE NEW CHEAP-ONLY-UNTIL-THE-FREEZE QUESTION, AND IT IS SMALL: should `ParamField.refTo` ALSO gain `'view'`, `'sheet'`, `'annotation'` and `'family'` now?** Their CRUD is post-freeze; if the union is not widened now, that CRUD must amend a frozen contract to say what its own id args name — the ⓣ trap, and exactly why Ⓕ pre-widened for `'system'`/`'designOption'`. My recommendation: **yes, add all four** (free now, an amendment later, nothing switches on it). I added only `'schedule'`, which this unit needs, so the call stays yours. ⚠ **The three older owed rulings still stand:** rule 8 — does `FamilyDefinition` get a way to declare billable faces? (without it every D61 data-authored family reports the whole-solid area, 1.07×–3.03× wrong) · rule 17 — should `Dimension.anchors` exclude the free `point` anchor? · and parked from Entry 62: should `undo`/`redo` become Commands (rule 9)?
- **Zayd:** the remaining **D58 minimal-2D bodies — one plan + one section** (`sectionCut` is already reserved in the frozen protocol, so the op is additive under D13). ⚠ **Read Entry 65's closing note before starting them, and this entry's promotion story with it: reserving a shape and building its body are two different verifications** — Entry 65 found three defects in the first hour of driving a seven-day-green reservation, and this entry found that even the *design doc's own prediction* of how the promotion would land was wrong in one of its three steps, which only building it could show. Then the D29 cache bodies (§4j-2 FIRST — an identity task, not a serializer task).
- **Amer:** unchanged by this entry — it is `packages/document` only. The three new verbs cost him nothing (they render through the existing generated ribbon; see above). P4.5's spine is still blocked on Q1–Q6.

### Entry 69 — 2026-07-30 — Zayd — **THE PLAN/SECTION DESIGN, DESIGN-FIRST: `P5_step6C_plan_section_design.md` DELIVERED. AND IT FOUND THAT THE FROZEN `SectionCurve.ref` COMMENT IS FALSE ABOUT OCCT — THE CUT CURVES CARRY FULL IDENTITY, THE PROJECTED CURVES CANNOT CARRY ANY. FIVE OWNER QUESTIONS PUT. NO SOURCE TOUCHED.**
**⚠ COMMITTED AND PUSHED (owner-authorised, 2026-07-30): `origin/main` `d596142 → 4bd7473`** — Entry 69 alone, one commit (nothing was left uncommitted by the previous session, so nothing intermingled — Entry 68's situation, not Entries 64+65's or 66+67's). **⚠ AMER IS ONE ENTRY BEHIND — `git pull` before any browser work**; the entry changed no source at all and asks nothing of him.
**Task (owner, `Zayd_Prompt.md` §2):** the remaining D58 minimal-2D bodies — one plan + one section — **design-first**, because a projected 2D view is a new KIND of derived artifact and D58 froze only its ANCHORING shape. Pulled first: already at `d596142`, newest Entry = **68** (my own), matching `FRESH`. Baseline `pnpm verify` **538/538, real exit code 0, all five gates** — matching Entry 68 exactly. Per the standing design-first rule the doc IS the deliverable: written, questions put, stopped. **Nothing committed (owner-gated); nothing to commit but the new doc + this handoff.**

- **⚠⚠ THE GAP WAS MEASURED BEFORE IT WAS DESIGNED (§1b), AGAINST NATIVE OCCT — and the headline is a contradiction inside the FROZEN protocol's own comment.** Seven throwaway probes through the `tools/oracle` measuring instrument (§4b — same kernel as our WASM build, different binding), all deleted:
  ```
    CUT curves, provenance via BRepAlgoAPI_Section.Generated()
      3-layer wall, plan cut z=1200 (×3 layers)     4 cut edges  -> 4 attributed, 0 multi, 0 ORPHAN
      round column (1 cylinder + 2 planar faces)    1            -> 1,            0,       0
      wall WITH A WINDOW, cut THROUGH the opening   8            -> 8,            0,       0
    PROJECTED curves, provenance via HLRBRep
      output edges IsSame() an input edge           0 of 4       -> new geometry, shares no topology
      VCompound(wall)/VCompound(column) partition   4 + 4 == 8, overlap 0  -> per-SOLID, and genuine
      HLRBRep_HLRToShape API surface                every method returns a COMPOUND, per shape
  ```
- **⚠⚠ THE FINDING, AND IT IS A HOLE IN A RESERVATION NOTHING READS (so it is still free):** `SectionCurve.ref`'s frozen comment says provenance is *"absent only where a curve has no single owner (a silhouette of a curved surface has no edge behind it)."* **Measured: that exception is the ENTIRE PROJECTED HALF.** HLR's output is new geometry and its supported provenance granularity is the whole solid — and `SubShapeKind` is `'face' | 'edge' | 'vertex'`, with **no member a solid can occupy**. So a plan's projected half would be **anonymous polylines**, which is the exact outcome the op's own comment calls *"a picture, and pictures go stale."* ⚠ Nothing is broken today: no body reads the field and no `.bnn` carries a projected curve (projections are derived, never stored). **That is why it is cheap now and an amendment across three products after P5.**
- **⚠ I CHECKED THE DEAD END RATHER THAN ASSERTING IT.** `HLRBRep_Algo.DataStructure()` → `HLRBRep_Data` **does** hold the original topology indexed (`EdgeMap`/`FaceMap` — 24 edges, 12 faces for two boxes). So per-edge provenance is **not impossible**; it is a from-scratch re-implementation of `HLRBRep_HLRToShape`'s compound assembly in our own C++. Named in the doc so a future author does not re-derive it, and so the owner's ruling is made against the true cost rather than against *"OCCT cannot."*
- **⚠ THE CUT HALF, BY CONTRAST, IS CHEAP AND D1-CLEAN — AND THE ARGUMENT MATTERS MORE THAN THE CODE.** `sectionCut` is a **query op that MINTS NOTHING** (the `measure`/`bounds`/`faceFrame` family): a cut curve's `ref` is the **owner face's existing token, borrowed** — the face was named when its part was built, and the drawing quotes that name. Reading `Generated()` is OCCT's own operation history, the channel D24 measured and the existing resolver already consumes (`srcOperand`/`srcKind`/`srcIndex`), **not** *"recovering identity by matching geometry after the fact"* — which is the tempting repair for an anonymous projected polyline and is the one thing D1 forbids. The doc says so explicitly, because the likelier failure is that someone does it quietly.
- **⚠ THE REAL PLAN CASE WAS CUT, NOT ASSUMED (§1c-6).** A wall with a window, cut THROUGH the opening: the holed solid has **10 faces, 4 `IsSame()` the original wall's and 6 cut-generated**; the cut yields **two separate wall segments plus the reveals**, all 8 edges attributed. ⇒ **a dimension anchored to a reveal in plan anchors to the OPENING's cut node** (`cutNodeId`), not to the wall — correct, and it falls out of the existing model rather than needing anything.
- **⚠ AND A SCALE NUMBER THE DESIGN TURNS ON: THE TWO HALVES DO NOT SCALE ALIKE.** Native OCCT, per solid: **the cut is FLAT at 1.28–1.31 ms/solid** from 30 to 300 solids; **HLR RISES — 0.55 → 0.91 → 1.59 ms/solid**, so 10× the solids costs **29×** the time (≈ N^1.5). Both measured facts push the same way, which is what makes the recommendation easy rather than a compromise.
- **⚠ ONE CLAIM IN THE FROZEN COMMENT CHECKED OUT, WHICH IS WORTH RECORDING BECAUSE IT USUALLY DOES NOT (§1c-7):** *"TKHLR is one of the 18 toolkits in our OCCT build, and it was chosen for this"* — **true**: `-lTKHLR` is in `link.sh:34` and `libTKHLR.a` is in the install. The projection half needs no build-recipe change, only a body.
- **⚠ WHAT THE DESIGN REUSES RATHER THAN INVENTS.** The `views` promotion is Entry 68's, **including its correction — NO `emptyScene()` entry** (the collection materialises on first authoring, so Entry 47's reservation tests pass unmodified). The verbs carry the refusal the body will not (D79's sentence). The validator lives beside the grammar, never in `commands.ts` (owner Q1's discipline). The body **consumes `modelElements()` and has no enumeration loop of its own** — D78's correctness argument, and ⚠ *a plan that silently omits every curtain-wall panel is the empty-table failure mode with a worse consumer, because a drawing is what gets BUILT FROM.* ⚠ **`Referrer.redirect`'s optionality (Entry 68) is now load-bearing for a SECOND consumer** — the view delete guard — which is the argument that it was the right shape.
- **VERIFICATION: `pnpm verify` RUN AS THE BASELINE ONLY (538/538, real exit code 0, all five gates), and no second run, for the honest reason that this session changed ZERO source or test code** — one new Markdown design doc plus this handoff. There is nothing for the suite to verify and I am not manufacturing a code claim (Entry 66's precedent, and it is the right one). `prettier --write` was run on the new doc **before** anything else, per Entry 67's procedural fix. The moment a ruling arrives and the build starts, `pnpm verify` with the real exit code gates it.
- **Box:** read/measure only; **seven throwaway probes written and deleted**; nothing installed, no containers touched, no ports bound, **no kernel rebuild** (none was needed — the measurement went through the native oracle, not WASM); `/tmp` 6.5 MB; RAM 2.4 GB available throughout; both live public sites up (`portfolio-caddy-1`, `beamstack-contact` untouched, as were Planitor's and Chantier's containers).

**NEXT:**
- **Owner:** **FIVE QUESTIONS, `P5_step6C_plan_section_design.md` §7 — and the build is blocked on them.**
  **(Q1, the one that shapes the unit) What does v1.0.0's plan and section SHOW?** Recommend **`mode:'cut'` only**: every curve then carries full sub-shape identity, so the drawing is annotatable and clickable — the op's stated invariant is *met, not approximated* — and the cost is linear. D58 says MINIMAL 2D. ⚠ **What is given up, plainly: no lines for what lies beyond the plane** (no floor edges below the cut, no door swings, no stair beyond). `cut+projection` lands later as an additive `mode`, which the frozen payload already provides for.
  **(Q2) If projected curves ever carry provenance, WHERE DOES IT GO?** Cheap only until P5, independent of Q1's timing. Recommend **`SectionCurve.nodeId?: string`** — an optional field on a reserved, unimplemented op result, naming exactly the granularity measured, introducing no new vocabulary. The alternative (`SubShapeKind` gains `'solid'`) widens the identity vocabulary **three products bind to** and is written into `scene.json`.
  **(Q3) `ParamField.refTo` — add `'view'`/`'sheet'`/`'annotation'`/`'family'` now?** ⚠⚠ **THIS IS ENTRY 68's OWED QUESTION AND IT IS NOW BLOCKING A UNIT** — `createView` takes a view id. Recommendation unchanged: **add all four.**
  **(Q4) Does v1.0.0 owe a SHEET?** Recommend **no** — D58 names three artifacts and says nothing about paper; a sheet is composition, not projection, and is the natural first Parity-B unit. Recorded so it is a decision rather than a gap.
  **(Q5) The discretisation tolerance** (a projected curve is a polyline approximating an exact edge) — recommend **mine**, documented, since it never reaches a quantity (rule 15) and the exact identity travels beside it in `ref`.
  ⚠ **The three older owed rulings still stand:** rule 8 — does `FamilyDefinition` get a way to declare billable faces? · rule 17 — should `Dimension.anchors` exclude the free `point` anchor? · parked from Entry 62: should `undo`/`redo` become Commands (rule 9)? ⚠ **The FREEZE (step 6) remains yours and remains unblocked** — this session moved no frozen byte, and §6.1's hole is in a reservation nothing reads, with both proposed fixes additive.
- **Zayd:** build §8 once Q1–Q3 are ruled — the `sectionCut` cut-half handler (C++ + adapter; ⚠ a WASM rebuild, ~60 s single-file compile + link per §1c-3, **not** the 2.5 h version bump), the `views` promotion, the three verbs, `view.ts` + `projectView`, `tests/plan-section.test.ts` revert-verified. ⚠ **Read §5's table before writing the fixture: every criterion there has a way to pass while FALSE, and the top one is Entry 47's trap verbatim — a one-plain-wall fixture.** The fixture must carry a curtain wall (children), an opening (cut faces) and a design option. Then the D29 cache bodies (§4j-2 FIRST — an identity task, not a serializer task).
- **Amer:** unchanged by this session — no source touched, and nothing in this design asks anything of the browser. ⚠ When the plan/section body lands it produces a `ViewResult` of 2D polylines with identity, which is a *new* thing for `apps/web` to draw — but that is a later, additive, browser-track item and nothing about it is owed now. P4.5's spine is still blocked on Q1–Q6 (`P4.5_interaction_model_design.md` §12).
