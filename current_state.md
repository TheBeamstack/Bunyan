# Bunyan — `current_state.md`

**What this file is.** The **cross-session, cross-seat, cross-machine handoff log** for Bunyan. It lives
in the repo and travels with the code between the local PC (`amer`, `khalihlna`) and the Hetzner dev box
(`zayd`, `hmdnah`, `brahim`), per `cross_projects_policy.md` §9.

**Why it exists.** So the next seat does **not** re-derive context, does **not** make false assumptions
about what is built, and does **not** redo verified work.

**⚠ IT IS READ IN FULL, BY EVERY SEAT, ON EVERY SESSION — so its length is a cost paid on every run.**
That is why it is now a **router with a hot core** rather than an archive. It carries what you need to act
accurately; everything else is one hop away and named below.

| If you need… | Go to |
| --- | --- |
| the full text of a ruling (D1–D82) | **`docs/decisions.md`** |
| who am I, and what may I claim? | **`AGENTS.md`** + `docs/seats/README.md` + `<Seat>_Prompt.md` |
| what is ready to claim, and what depends on what | **`docs/BACKLOG.md`** |
| the session that earned a ruling — with its measurements | **`handoff/<seat>/`** (newest 10) or **`docs/history.md`** (older) |
| *"why is this shaped this way?"* · *"has this been tried?"* | **`docs/history.md`** |
| what the domain MEANS | **`docs/contracts/core_logic.md`** |
| how it is BUILT (layers, protocol, registries) | **`docs/contracts/architecture.md`** |
| what SHIPS first (scope, D1–D66) | **`docs/contracts/V1.0.0_spec.md`** |
| the phases, exit criteria, and **THE FREEZE GATE** | **`docs/contracts/v1.0.0_imp_plan.md`** |
| what the owner still owes a decision on | **`open_rulings.md`** |
| how to review a PR | **`REVIEW.md`** |
| how this handoff system works and why | **`docs/design/handoff_system_design.md`** |

**How to use it.**

- **Read this file in full before touching anything.** Reach for `docs/history.md` the moment you are
  missing something older.
- **Append an abstract to §7** when you finish a unit of work, and write the full body to
  `handoff/<agent>/<date>-<slug>.md`. The eight fields in §7 are mandatory and gate-enforced.
- **Record who validated what, and on which engine/environment.** A claim without a verification method
  is not done.
- Keep §2 (contract status), §3 (what exists) and §4 (the decision index) **current** — those are the
  three things a new agent gets wrong most easily. ⚠ **They are also what makes compression safe: a rule
  binds because it is in §1–§5, never because an old entry mentioned it.**
- **Never hand-edit §8.** It is written by `pnpm state`.

---

## §0 — Orientation (read this first)

**What Bunyan is:** a browser-native, serverless, parametric BIM/CAD authoring platform. An exact B-Rep
kernel (OpenCascade/OCCT compiled to WebAssembly) computes geometry; the design is stored as a
*parametric recipe*, and meshes/2D views are disposable projections of it.

**Document reading order** (they are the contract; this file is the status):
**1.** `docs/contracts/core_logic.md` — the domain model. *What the app means.* · **2.**
`docs/contracts/architecture.md` — layers, worker protocol, registries. *How it is built.* · **3.**
`docs/contracts/V1.0.0_spec.md` — scope, decisions **D1–D39**. *What ships first.* · **4.**
`docs/contracts/v1.0.0_imp_plan.md` — the phases, exit criteria, and **THE FREEZE GATE** at the head of P5.

**⚠ `docs/history.md` is NOT in the reading order, because it is a REFERENCE, not a briefing.** Open it
when you are stuck or missing older context — not at the start of every session.

**⚠ The MIQDAR gate.** Miqdar is **the second product**, and its spec is **not optional reading before a
contract freeze** (`docs/decisions.md` §4g). **P5 has a gate pointing at it.** ⚠⚠ **THE LIVE SPEC IS
`~/projects/Miqdar/Miqdar_v1.0.0_spec.md`** (owner ruling M22, 2026-07-23); the superseded Bunyan copies
are retained in `docs/archive/` **only** so the freeze gate still resolves. It is **not** a Bunyan work
item — Miqdar starts only after **Bunyan v1.0.0** ships.

**Design docs** — the design-first record, all in `docs/design/`. **Reviews** — `docs/reviews/`, including
**`review_prompt.md`**, the standing brief for a phase-level adversarial review (the seven hunts). That is
a different instrument from `REVIEW.md`, which is the per-PR checklist.

⚠ **Version strings: always "Bunyan v1.0.0" or "Miqdar v1.0.0" — never a bare "v1.0.0."** Two
independently-versioned products both have one. *(Miqdar M17.)*

**The one non-negotiable invariant:** B-Rep is the source of truth; the parametric recipe is the source of
truth for the B-Rep; meshes and 2D views are disposable. Everything else follows from it.

**The hardest idea (and the schedule risk):** persistent sub-shape naming (D1). Sub-shape identity is
*derived* from the operation DAG — a `SubShapeRef` is a derivation path (`nodeId` + `role` + `occurrence`),
**never a geometric index.** It is assigned when an op runs and propagated forward, never recovered by
matching geometry afterwards.

**Actors** — roles are by *environment*, not seniority. **Adopted 2026-08-14 (D82):** the two agents became
five seats, with review moved onto an account the matching builder does not hold — see `AGENTS.md`.

| Seat | Role | Where | GitHub account | Owns |
| --- | --- | --- | --- | --- |
| **Architect** (the owner/human) | — | — | — | Contracts, scope, AEC correctness, merge arbitration. **All contract changes are owner-gated**, and the owner merges any PR whose `RISK` is `contract-touching`. |
| **brahim** (agent) | steward/orchestrator | Hetzner dev box | `davidian-abdo` | Backlog readiness, sequencing, spec integrity, `docs/decisions.md`, closing the loop between turns. **Never builds.** |
| **Amer** (agent) | builder | Local PC, **real browser** | `narutousomaki741` | Browser hot path: three.js/WebGPU, tessellation consumer + picking, React shell, ribbon/property panels, persistence adapters, service worker/PWA, `window.bunyan` wiring. |
| **khalihlna** (agent) | reviewer | Local PC, **real browser** | `davidian-abdo` | Review of anything only a browser can verify — `apps/web` PRs, re-executed, not merely read. |
| **Zayd** (agent) | builder | Hetzner dev box, **headless** | `davidian-abdo` | Kernel: OCCT WASM builds, worker API, naming resolver, regression harness + offline golden seeding, IFC importer, CI, release pipeline. **And the document model — `@bunyan/document`, `@bunyan/types`, `@bunyan/sketch-solver`.** |
| **hmdnah** (agent) | reviewer | Hetzner dev box, **headless** | `narutousomaki741` | Adversarial review of box-verifiable claims — kernel, document model, CI. |

Also read the box-local `../cross_projects_policy.md` and `../last_session_work.md` **if you are on the dev
box** (they are not in this repo and do not travel).

### §0b — Live claim (this branch) — NEW at Entry 91

**The claim is pushed before work begins**, ported from mdo's ADR-0007 Δ8. Before Entry 91 there was no
claim mechanism at all — two builders coordinated purely through `TASK`/`FRESH` prose and an ordinary git
conflict on §7 if they ever collided. With five seats and two machines that is no longer good enough: an
unpushed claim is invisible across machines, and two sessions can start the same `T-nnn`.

This block is the claim on **this branch only**; the full picture across every live branch is

```
git ls-remote --heads origin 'refs/heads/task/*'
```

which `scripts/agent-start.mjs` prints and reads (each branch's own `current_state.md` carries its own
copy of this block) before deciding what a builder may claim. `scripts/agent-finish.mjs` writes the final
`status` line and pushes it as the last act of a turn.

<!-- BEGIN BATON — written by agent-start.mjs; pushed before work begins -->

| Field | Value |
|---|---|
| seat | `hmdnah` |
| builder | `zayd` |
| role | reviewer |
| machine | box |
| task | `T-020` |
| branch | `task/T-020-the-pinned-vitest-cannot-collect-tests-p` |
| claimed-at | 2026-08-18T19:51:18Z |
| status | finished — PR open, awaiting review |

<!-- END BATON -->

## BLOCKED

*(none)*

<!-- Judged with HTML comments and blank lines REMOVED, so a note explaining this gate cannot itself
     trip it (the mdo lesson, ported rather than rediscovered). Prose counts: write `*(none)*` and
     nothing else, or record a real block. A `## BLOCKED` entry stops BOTH orchestrator loops — the
     mechanism this is for, not a general-purpose notes field. -->

### §0a — DISTANCE TO FREEZE ≠ DISTANCE TO REVIT (read this before you feel "almost done")

**The freeze checklist being ~closed says NOTHING about competitiveness with Revit. They are different
axes, years apart, and the docs used to conflate them.** A fresh agent reads "step 0 closed, gates
discharged, ready to freeze" and absorbs "nearly a Revit competitor." That is the exact failure mode of
§1's own history (*"P2 declared done twice"*, *"the whole modelling layer was missing"*) — measuring
against the checklist, never against the ambition.

**Ground truth (verified by build, not prose):** the shipped product is **three element types**
(`@bunyan/types`: `core.wall`, `core.opening`, `core.curtainwall`) on an exact kernel. What is genuinely
excellent — the exact-B-Rep + persistent-naming + parametric-recipe core, the agent-native single command
layer, the stable-PEI ecosystem substrate — is *the hard, rare part most Revit challengers never finish*,
which is why it comes first. **But it is a foundation, not a Revit competitor.** What Bunyan is NOT yet: a
documentation tool (Revit's actual product — one plan/section/schedule ships in v1.0.0, the rest is the
largest parity item, D58), multi-user (D60), MEP (D62), families-by-users (D61), DWG-interoperable (D63);
and its taxonomy is almost entirely unbuilt (`docs/contracts/core_logic.md` §9a).

**⇒ THE STANDING METHOD: measure the product against the Revit-parity ledger
(`docs/contracts/v1.0.0_imp_plan.md` "Road to Revit parity"), NOT against the phase's exit criteria.**

---

## §1 — Where the build is right now

**Phases P1–P3 CLOSED; the kernel protocol is FROZEN (21 live ops + 3 reserved).** P4 + P4.5 (the
interaction model) and P5 (types) are the open work. **THE PROJECT IS IN THE PRE-FREEZE WINDOW:**
`SubShapeRef` / `BimObjectType` / `Command` / `scene.json` / `ParamSchema` / `UndoableEdit` are
**release-candidate** and freeze at **P5 step 6**. That freeze is the one irreversible act — after it a
wrong contract costs an amendment across three products (`.bnn` in the field, Miqdar, Planitor).

**P5 STEP 0 (the D50 constraint model) is COMPLETE**, and so is every reopened pre-freeze row Ⓐ–Ⓕ plus
D66's contract half. **The freeze is unblocked and is the owner's act.** The full narrative of how it got
there — which sweep was taken instead of freezing, and why — is `docs/history.md` §D.

> **⚠⚠ THE P4 REVIEW HEADLINE (Entry 24) — STILL THE FRAME:** there was **no interaction model in any
> contract document** — only *"button/drag → Command"*, which is how an action *reaches* the model, not how
> a human *authors a building*. ⇒ new phase **P4.5**, which lands before the freeze. And the second sweep
> found the deeper one: **Bunyan had exactly ONE associative relationship (`opening → host face`);
> everything else was absolute.** **D50 moved the full constraint model into v1.0.0.**

### §1a — THE SCALE NUMBERS (D48: the interactive target is 10,000+ elements, BINDING)

All four axes now have a number. **Two are closed; two remain open and are named.**

| Axis | Status |
| --- | --- |
| **WASM heap** | ✅ **FITS** — 16.2 KB/live-solid, dead-linear ⇒ **0.31 GB at 10k**, inside a tab (Entry 29, re-measured Entry 54). |
| **Draw calls / frame time** | ✅ **CLOSED (Entry 63)** — renderer batching: **~30,700 draw calls → 2** at the 10k target (606 ms → ~10–14 ms; 1.6 → ~80 fps). |
| **Edit latency** | ✅ incremental edit ~23 ms compute, **FLAT vs scale**; the ~570 ms post-edit render went with the batching rewrite. |
| **Cold load** | ⚠ **OPEN — ~3 min at the 10k target, STILL UNUSABLE.** The D29 cache buys **2.07×** (24.86 → 12.00 ms/solid), not an order of magnitude. ⚠⚠ **PER-ELEMENT BUILD COST IS FLAT, MEASURED (T-004, `tests/document-build-cost-scale.test.ts`): 41.9–43.8 ms/element marginal, ordinary least squares of cold-load ms on element count over four sizes (39/117/195/273 elements), R² ≥ 0.9988, intercept within ±140 ms of zero, four runs — two by `zayd`, two re-run by `hmdnah` in review — spanning 4.5%.** The local marginals run 39.6–46.3 ms per additional element, a spread of 5.9–16.8% across the runs, and the only systematic deviation is the smallest model pricing ~5–10% **low** per element (38.8–39.6 ms/el at 39 elements against 41.8–44.0 ms/el at the three larger sizes, in all four runs). That lifts the first local marginal above the other two, so the marginals **fall** slightly with size — the opposite direction from superlinearity. Its cause is not measured. ⇒ **~7.2–7.3 min uncached at 10,000 elements**, the same order as D66's 6.35 min and, divided by the cache's measured 2.07×, **3.5 min** against the ~3 min this row already carries. ⚠ The range measured is 39–273 elements and the target is 10,000, so the projection is a 37× extrapolation that the flat marginals entitle rather than prove. The levers that could close it are `instantiate` (RESERVED), lazy build/eviction (D66 — additive) and MT (D8, ruled v1.0.x). |
| **Join resolution** | ✅ **CLOSED (D73)** — the O(N²) scan is an O(N) spatial index: **4757.7 ms → 27.2 ms at 1984 walls**, per-wall cost FLAT (14–17 µs) from 1k to 10k. |

⚠ *Verification is most of a cached load's cost — re-measuring every sub-shape to prove the tokens belong
to the shape is the price of shipping identity in a file — so no amount of serializer tuning changes this.*
⚠⚠ **NOW MEASURED RATHER THAN ASSERTED (Entry 73), and it closes off the tempting lever:** of a cached
import, `shapeSignature`'s own `GProp` work is **7.9 ms** and **all 345 embind boundary crossings together
are 0.073–0.133 ms (0.21–0.39 µs each, ~1%)**. The boundary is not the cost and never was; the
**verification** is. ⇒ **the remaining cold-load levers are still only `instantiate` (RESERVED), lazy
build/eviction (D66) and MT (D8)** — there is no serializer or marshalling win hiding here.

### §1b — THE METHOD THAT HAS FOUND EVERY GAP — it is not reading; it is USING the API

**Keep modelling real buildings against the real kernel, and measure.** It has found **twelve** gaps; no
other method ever has. A written finding describes only the shape someone actually cut.

| Gap | Found by |
| --- | --- |
| `at` (placement) | a boolean could otherwise only bite a *corner* off a wall |
| the split-face naming bug | cutting a **groove** across a wall |
| `extrude` / `chamfer` | trying to model a **floor plate** (a Slab is not a rectangle) |
| the SYMMETRIC-TIE hole (D28) | cutting a duct through a **round column** — five sessions missed it; every boolean tested had cut a BOX |
| our `bounds` LOOSE on curves | gating that column vs the native-OCCT oracle |
| the modelling layer (D30–D33) | reading the product **against its own ambition** |
| the ecosystem joint (D34–D38) | reading the product **against its neighbours** (Planitor, BIMsync) |
| the STYLE-EDIT PERF CLIFF | building a real 195-element building and **timing** it |
| the six P3 defects | driving the document API at its **FAILURE** boundaries — every happy path was already green |
| the `BuildContext` HEAP-LEAK | writing the first fixture that ran **two** kernel ops per part |
| the VOID INWARD-DIRECTION gap | cutting a duct through a **beam** |
| the CURVED-FACE HOSTING gap | a duct through a **round column** |

**⇒ Keep cutting shapes nobody has cut.** The kernel-level gaps are nearly mined out; the next foreclosure
is likelier in a **type's contract** than in the kernel.

**⚠ AND THE SECOND METHOD:** a green test proves only what it ASSERTS — two of P3's asserted something
weaker than their own title. ⇒ **For every exit criterion, read the test that discharges it and ask what
it would take for that test to pass while the criterion is FALSE.** And the standing rule: **a fix without
a test that fails in its absence is an assertion** — revert every fix and watch its test fail.

**⚠ THE THIRD:** when a decision is framed as a trade-off, check what it costs the **INVARIANT**, not just
the schedule. *"Ship the BREP cache"* read as a perf call; it dragged in a persisted name→shape index —
the "token map" D1 forbids. The perf question was an afternoon; the identity question it hid could have
repealed D1.

### §1c — NINE THINGS A FRESH AGENT MUST NOT REDISCOVER THE HARD WAY

1. **`opencascade.js` CANNOT be linked on this box — and we do not use it.** Its `-flto` whole-program
   link OOMs at a 2 GB cap even for a 6-symbol build. Do not retry it. We build **upstream OCCT 7.9.3,
   LTO off** — recipe in `tools/kernel-build/`; it builds here.
2. **`/tmp` is a tmpfs — it costs RAM, not disk.** Before invoking §6a to pause another project's
   containers, run `du -sh /tmp` — our own scratchpads are usually the hog.
3. **You do NOT need a 2.5 h rebuild to change the kernel's C++.** OCCT's static libs are prebuilt at
   `~/occt-wasm-spike/install`. Changing `src/kernel.cpp` is a **~60–74 s single-file compile + link**
   (§6). Only an *OCCT version bump* costs 2.5 h.
4. **OCCT's `Left/Right/Front/Back` do NOT mean what they sound like.** `BackFace()`=x-min,
   `FrontFace()`=x-max, `LeftFace()`=y-min, `RightFace()`=y-max. Guessing mislabels four faces and nothing
   fails (geometry perfect, names wrong). `occt-kernel.test.ts` re-measures it.
5. **The naming literature is WRONG about OCCT 7.9.3, and we MEASURED it (D24).** Boolean history is
   complete (zero orphans); the weak spot is the fillet; and `Modified()` reports only *splits*, so an
   untouched face appears in **no** history list — that silence means *"unchanged"*, not *"unknown"*.
   Re-run the probe (`tools/kernel-build/probe.cpp`, ~60 s) before trusting naming on a new shape class.
6. **⚠⚠ THE PROBE ONLY MEASURES THE SHAPES YOU THINK TO CUT — this has cost us repeatedly.** Even a
   measured, written-down finding describes only the shape someone actually cut. Before trusting naming on
   a shape class nobody has cut, **cut it.**
7. **⚠⚠ A PHASE'S EXIT CRITERIA ARE A SPECIFICATION, NOT A SUMMARY OF WHAT GOT DONE.**
   `extrude`/`chamfer` sat unbuilt in P2's step list while P2 was declared "complete" twice, because every
   test built walls out of boxes. **Read a phase's own step list against the code before declaring it
   done.** *(This disease has recurred four times. Its worst form: the misleading artifact was a PASSING
   TEST, not prose — Entry 65.)*
8. **⚠⚠ A NEW RULE BINDS THE NEXT CONSUMER AND NOTHING ELSE — SWEEP IT *BACKWARD*.** The inverse of trap
   7, and it has cost real defects repeatedly. A rule written into the contract guarantees that code
   written **after** it obeys, and does **nothing whatever** about code written before. **⇒ When you add a
   correctness rule to a mature codebase, enumerate every existing site that could violate it and check
   each one.** Two mechanical forms work: **grep** every iteration over the collection the rule governs,
   then ask of each *"does this aggregate or publish?"*; and — when a rule quantifies over a SET —
   **COUNT the set** rather than reading the code that implements one member of it.
9. **⚠ MEASURE THE ARTIFACT, NOT THE MANUAL.** OCCT's `BRepTools::Write` doc comment disagrees with what
   the code beside it actually emits, and its file and stream overloads differ — so a validity guard
   written from the format's documentation **refused every file the exporter beside it produces.** Both
   errors were caught in minutes by printing the actual bytes. *Before writing a check against an external
   format, dump what the code on the other side of the check actually emits.*

> **⚠⚠ THE SWEEP LEDGER — ALL EIGHTEEN DOMAIN RULES SWEPT, NINE DIRTY.** Dirty: 1, 3, 4, 5, 8, 12, 14, 15,
> 16, 18 (+ the D68 option invariant), counting 8 as a SURFACED foreclosure rather than a fix. Clean: 2, 6,
> 7, 9, 10, 11, 13, 17. **THE BASE RATE IS 1-IN-2.** The transferable finding: **the rules that came back
> clean are the ones a violation could not have been written silently** (`validateParams` refuses an
> undeclared arg; `dryRun` lives in the executor where a command cannot opt out). *A clean rule with no
> enforcement is a dirty rule that has not happened yet* — which is why rule 7 was given
> `tests/units-rule7.test.ts`. Full per-rule detail: `docs/contracts/core_logic.md` §8 (each rule carries
> its own sweep note) and `docs/history.md`.

### §1d — Tooling/process traps, carried forward from the retired §2 DYNAMIC blocks (Entry 91)

Every prompt file lost its `NEW` section at Entry 91 (D82: prompts are now fully stateless — see
`AGENTS.md`). Nothing in it was deleted from the record: the full original text is permanently in
`handoff/zayd/` and `handoff/amer/`'s existing bodies, exactly as any other entry's detail already is.
What follows is the small subset that was genuinely a **general, durable** lesson rather than a note
about code at one commit — the same "hot core vs. archive" split this file already applies everywhere.

- **A gate's hard part is the SKIP, not the check** — a check that disables itself on a broken input
  reports green, which is worse than no gate. For every skip branch, ask which broken state also takes
  it, and grep the run log for the gate's own name — a green tick means the job exited 0, not that your
  step ran.
- **Ask what a validator PROVES, not what it is FOR.** *"Both writers require the host"* proves the
  target exists, never that it is not the element itself — a reference that resolves can still loop.
- **Vite HMR hands you a stale pointer listener, and it looks exactly like a broken feature.** A
  `useEffect` with a narrow dependency array does not re-run on a hot update, so a closure can keep
  referencing a previous component instance's refs. Hard-reload after any edit to viewport/interaction
  code before trusting a browser result — a hot update is not a fresh app.
- **React batches; a handler that closes over state reads a stale value.** Read live values from a ref,
  not from a closed-over variable, in anything that fires across a render boundary.
- **Never re-introduce a sweep whose cost is set by query VOLUME rather than by what an index holds** —
  the same shape on both sides of the D19 boundary: `SnapIndex.near()` (apps/web) and the join spatial
  index (D73, kernel side) were the same defect, found independently, twice.
- **A measurement is pinned to a commit; a follow-up commit un-measures it.** Re-run the numbers in a
  PR body after any follow-up commit before quoting them again — a stale figure that was honest when
  written is a live defect once anything downstream of it has changed.

---

## §2 — Contract status (get this wrong and you break the build model)

The **split contract-freeze** (D13) is what lets Amer and Zayd work in parallel: *adding* an op is
additive and permitted; *changing an existing op's envelope* needs Architect sign-off.

⚠ **THIS IS NOW MACHINE-CHECKED.** `tests/freeze-boundary.test.ts` holds a snapshot of every frozen
surface. Any change to it fails the build and marks the PR `RISK: contract-touching`, which routes the
merge to the owner. **The status table below is the summary; the test is the authority.**

| Contract | Status | Freezes |
| --- | --- | --- |
| **Kernel message protocol** (`@bunyan/protocol`) | **✅ FROZEN, v1** — **21 live ops + 3 RESERVED** + `CACHE_STALE`. Reserved: `sectionCut` · `importIfc` (P6) · `instantiate`. ⚠ `faceFrame` is the first post-freeze op, explicitly permitted under D13. ⚠ `exportBrep`+`importBrep` left `RESERVED_OPS` on 2026-07-30 — the D29 cache bodies are built, so the real kernel advertises them because it *implements* them (`capabilities` is generated from the handler map). **The MOCK implements neither, and that is correct rather than incomplete.** | **✅ FROZEN.** |
| **`SubShapeRef`** | RC — exercised by the real kernel + the document model (a window survives save→load→rebuild + a 30° rotation). ⚠ `kind:'vertex'` **reserved** (D54a). | **P5** |
| **`BimObjectType`** | ✅ WRITTEN + extended. Carries `parameterSchema`, `styleSchema`, `defaultClassification`, `defaultDiscipline`, `buildGeometry→Part[]` (D30), `buildVoid`, `buildLeaf?`, `buildChildren?` (D59), `migrate`, `ifcMapping?`/`migrateStyle?`. ⚠ `BuiltPart.exposedRefs?` RESERVED (D72) and **every shipped Type now declares** (D74). ⚠⚠ `BuildContext.discard(handle)` — a Type running two ops per part MUST declare its intermediate or it leaks. | **P5** |
| **`Command`** | ✅ WRITTEN — `argsSchema` + `execute` returns its `UndoableEdit`. **The agent API.** CRUD carries the D51 refuse-or-retarget args. ⚠⚠ **The five move verbs landed 2026-07-30 (D80)**: `core.setPlacement`/`move`/`rotate`/`copy` live, `core.array` a registered shape that REFUSES. **They are GUARDED** — a placement verb refuses an element whose position the recipe already derives (host / D52 baseline / datum, per-axis), and `core.createElement` carries the same refusal. | **P5** (with its `argsSchema`) |
| **`scene.json` + entities** | ✅ WRITTEN (`packages/document/src/scene.ts`). `SCENE_SCHEMA_VERSION` **2**. Constraints are a first-class collection (D53) with three union members (base/top, sketch, join). Optional absent-defaulted reservations: `views`/`annotations`/`schedules`/`sheets` (D58), `families` (D61), `systems` (D62), `designOptions` (D65), `georeference`, `roomSeparators`. ⚠ **`scene.schedules` is promoted to a full `SceneCollection`** (D79) — it materialises on first authoring, so a document with no schedules stays byte-identical. | **P5** |
| **`UndoableEdit`** | ✅ WRITTEN — **STATE DELTAS, never replay** + the append-only JOURNAL (D40). ⚠ **`transactionId` has its first READER (D80)**: one `Ctrl+Z` reverses a multi-element gesture, stamped by the executor, ONE stage and ONE commit for the whole unit. | **P5** |
| **Agent surface** (`window.bunyan`) | ✅ WRITTEN — `createAgentSurface`, versioned separately (`agentApi: 1`, D22); does **not** inherit the P5 freeze. | evolves on its own clock |
| **`.bnn`** | ✅ WRITTEN + FINISHED. Zip of `manifest.json` + `scene.json` + `history.json` (the JOURNAL) + optional `thumbnail.png`. Ids are prefixed ULIDs (D44); unknown/future-typed elements round-trip VERBATIM (D43). ⚠ **D60 merge seam reserved** (four optional fields, absent in v1.0.0). ⚠ `geometry-cache.brep` is **not** in the format and is an open owner call. | **P5** |

---

## §3 — What exists, and how it was verified

```
packages/
  protocol/       @bunyan/protocol      flat versioned message contract (zero deps). 21 ops + 3 reserved.
  kernel-core/    @bunyan/kernel-core   KernelHost (dispatch + failure marshalling) + ShapeRegistry
  kernel-mock/    @bunyan/kernel-mock   protocol-conformant fake kernel (NO booleans — says so in
                                          `capabilities` rather than faking one)
  kernel-occt/    @bunyan/kernel-occt   ★ THE REAL KERNEL — OCCT 7.9.3 in WASM + Worker entry
                    src/kernel.ts         adapter: C++ STRUCTURE -> Bunyan IDENTITIES
                    src/naming.ts       ★ THE RESOLVER (D1/D24): 4 relations, no geometry, ever
                    src/cache.ts        ★ D29 — the geometry cache's VERIFICATION half. C++ measures;
                                          this DIGESTS, COMPARES and REFUSES. ⚠ ONE file on purpose — the
                                          only place a wrong answer produces a PLAUSIBLE wrong building.
                    wasm/bunyan-kernel.*  the COMMITTED artifact (~14.6 MB / 4.19 MB gzip, -O3)
  kernel-client/  @bunyan/kernel-client KernelClient + WorkerTransport / InProcessTransport
  sketch-solver/  @bunyan/sketch-solver THE 2D SKETCH SOLVER — planegcs behind the SketchSolver seam.
                                          The ONLY package that imports @salusoft89/planegcs.
  types/        ★ @bunyan/types         THE SHIPPED MVP BimObjectTypes — D52 baseline join-aware Wall
                                          (`core.wall`), the Door (`core.opening`, buildVoid+buildLeaf),
                                          and the composite Curtain Wall (`core.curtainwall`, depth-2).
  document/     ★ @bunyan/document      THE PARAMETRIC TRUTH LAYER
                    entities.ts    Element/Part/ElementStyle/Material/Section/spatial tree/Grid/Constraint
                    scene.ts       ★ THIS OBJECT *IS* scene.json. + SceneChange + constraints resolver
                    schema.ts      ParamSchema — ONE language, THREE consumers: panel, ribbon, AGENT TOOLS
                    registries.ts  the SIX registries + the GENERATED capability projection
                    types.ts       BimObjectType (+BuildContext.discard, grid/datum accessors)
                    ulid.ts      ★ D44 — the PEI is a prefixed, monotonic ULID. No counter, ever.
                    revision.ts  ★ ModelRevision + issued_at_seq. Minted ONLY by the command.
                    commands.ts    the Command layer — THE agent API (D19). 44 verbs.
                    dependency.ts  ★ the TYPED dependency graph (exhaustive over SceneCollection)
                    enumerate.ts ★ THE MODEL ENUMERATION QUERY. The ONE walk three consumers share.
                    schedule.ts  ★ the SCHEDULES body + the authoring grammar. ⚠ NO enumeration loop of
                                     its own — that IS its correctness.
                    cleandelta.ts ★ THE CLEAN DELTA EXPORTER — journal + revN -> CleanDeltaPackage
                    build.ts       ★ base parts -> resolve hostRef -> cut EVERY layer -> PLACE LAST
                    document.ts    ★ DocumentContext — THE ONLY DOOR (D19). STAGED, all-or-nothing
                                     rebuild + universal dryRun (D42)
                    undo.ts        UndoableEdit (STATE DELTAS) + THE JOURNAL + the TRANSACTION unit (D80)
                    placement.ts ★ D80 — the rigid-motion ALGEBRA and the ONE rule the move verbs turn on:
                                     WHERE THE RECIPE ALREADY DECIDES THE POSITION. Pure.
                    agent.ts       createAgentSurface() — agentApi:1, thin shim, no browser
                    bnn.ts         the .bnn codec + migration + StorageAdapter + Autosave
                    geometry.ts  ★ GeometryGateway — the narrow seam that makes D19 STRUCTURAL
                    sketch.ts    ★ the SketchSolver SEAM + solver-neutral IR + the D26 guard
                    designoptions.ts ★ the exclusion INVARIANT as code (D65/D67/D68)
                    joins.ts     ★ the WALL-JOIN resolver — auto-miter + butt, O(N) spatial index (D73)
apps/web/        ★ Amer's Vite/React shell — bootstrap (the one KernelClient holder), WebGL2 three.js
                    viewport with BatchedMesh, generated ribbon + property panel, sub-shape picking,
                    tool/ (snap · QueryGateway · toolMachine · numeric · useToolController)
tests/            613 tests (all document tests run against the REAL OCCT kernel, never the mock)
tools/kernel-build/ the OCCT->WASM recipe + src/probe.cpp (THE NAMING PROBE, ~60 s)
tools/oracle/     Python (uv): offline golden seeding — also a MEASURING instrument
```

**The architectural decision that shapes everything: the kernel is transport-agnostic.**
`KernelHost.handle(request) → response` is a pure function knowing nothing about Workers/`postMessage`/DOM.
⇒ the whole seam is testable headlessly in Node (why the suite runs on a browserless box), and mock and
real kernel are the same interface.

**⚠ FOUR SILENT OCCT TRAPS, all caught by the harness (plus §1c trap 4) — all OUR misuse, never an OCCT
defect:** (1) `BRepBndLib::Add` is TOLERANT not tight ⇒ `box.SetGap(0.0)`. (2) `LinearProperties` on a
solid sums each edge once per adjoining face (double-counts). (3) `Add` bounds a curve by its CONTROL
POLYGON ⇒ use `AddOptimal`. (4) a full 360° revolve has NO caps and cap accessors don't return null.

**Verified — the kernel** (Zayd, dev box, headless): protocol v1 (envelope, 15 typed failure codes) ·
typed failures never throw · **persistent naming (D1) on real topology** · **mock and real emit
BYTE-IDENTICAL refs** · `measure` exact (`BRepGProp`, not the mesh) · **no WASM heap leak** · **D28 the
bounded positional key** · query ops `bounds`/`distance`/`classifyPoint`/`faceFrame`.

**Verified — the document model** (Zayd, headless, vs REAL OCCT): D30 an element IS its ordered PARTS ·
D31 a style edit rebuilds every instance · an opening cuts EVERY layer · a window through a wall ROTATED
30° (host token byte-identical) · D39 cascade delete in ONE undoable edit · **the broken-reference state**
(marked, visible, never auto-healed) · reject+keep-last-good · save→reload → identical parametric state
AND geometry from `scene.json` alone · **D19 is a MACHINE check** · the model is **associative**,
**editable** and **guarded** · a 2D profile is **solved** (real planegcs) and extruded.

### NOT verified / NOT built (do not assume otherwise)

- **`geometry-cache.brep` — HALF BUILT, AND THE HALVES MUST NOT BE CONFLATED.** ✅ The OP BODIES are built
  and green. ❌ **There is still NO `geometry-cache.brep` inside a `.bnn` and NO document loads from one.**
  That second half is a separate, owner-gated unit with real design surface (what INVALIDATES a cache).
  ⚠⚠ **The measured payoff is 2.07×, not an order of magnitude** — recommendation on the desk: **do not
  wire it for v1.0.0** (`open_rulings.md` Q6).
- ✅ **2D views SHIP — the plan/section unit landed in Entry 77** (D81, PR #5;
  `tests/plan-section.test.ts`, `views` in `scene.ts`).
- **No IFC import** (P6; the op is reserved).
- ✅ **`LICENSE`/CLA/attribution — DONE (Entry 74), and going public is no longer blocked BY THE REPO.**
  AGPL-3.0 verbatim · `NOTICE` (OCCT's exception is CONDITIONAL on a prominent notice, and we ship its
  binary; planegcs is an npm dep we do not redistribute) · `licenses/` · `CLA.md` · all ten manifests.
  ⚠ **Two owner items remain inside `CLA.md` — Q11 `<LEGAL ENTITY>`, Q12 a lawyer's read.** They block
  the first EXTERNAL PR, not publication.
- No service worker/PWA/Cloudflare deploy; no WebGPU (WebGL2 ships); no File System Access adapter.
- No sweep-along-path, no loft (out of scope).

---

## §4 — Decision index

**⚠ ONE LINE EACH. THE FULL TEXT OF EVERY RULING IS `docs/decisions.md`** — including the five big rulings
(4e–4i), the verification-scope rule (4b) and the open items (4j). If the index and the ruling disagree,
**the ruling wins and the index is the bug.**

| # | Ruling (one line) | # | Ruling (one line) |
| --- | --- | --- | --- |
| D1 | **Persistent naming**: identity is a derivation path, never a geometric index. The #1 risk. | D44 | The PEI is a **PREFIXED ULID**. No allocator; id-reuse impossible by construction. |
| D3 | IFC **import** only in v1.0.0; export v1.0.x. | D45 | **`discipline` lives on the PART.** An unmeasurable quantity is omitted, never zeroed. |
| D8 | Canonical re-sort before identities are assigned. **MT stays v1.0.x.** | D46 | One physical thing = one element, one PEI. The MEP-vs-structure clash question is OPEN. |
| D9 | **We trust OCCT; we verify our own code.** | D47 | **The tool/interaction layer is a first-class layer, and it was missing.** ⇒ P4.5. |
| D10 | Typed-failure contract: the kernel never throws; a failed op yields no edit. | D48 | **The interactive target is 10,000+ elements. BINDING.** |
| D11 | Offline-first; the service worker caches the kernel once. | D49 | 2D documentation stays v1.0.x; its anchoring contracts are RESERVED pre-freeze. |
| D12 | Anchoring/validation of a hosted opening. | D50 | **✅ THE FULL CONSTRAINT MODEL IS IN v1.0.0** — the largest scope ruling. ⚠⚠ **THE ANTI-FUSE RULE STILL BINDS.** |
| D13 | **The freeze's meaning**: *adding* an op is additive; *changing* an envelope needs sign-off. | D51 | **A command may never silently re-identify.** Refuse-or-retarget, generalised to every reference. |
| D14 | The WASM module *is* the kernel; `opencascade.js` rejected. | D52 | **A WALL IS A BASELINE `{start,end}`**; length + height are DERIVED. |
| D15 | **Bunyan is open source: AGPL-3.0 + commercial.** ⚠ The CLA is a hard prerequisite before the first external PR. | D53 | Constraints live in a first-class `scene.json` collection, orthogonal to `params`. |
| D16 | IFC import via **IfcOpenShell** → exact B-Rep. `web-ifc` (mesh-only) rejected. | D54 | Reserve `SubShapeRef kind:'vertex'` · `Element.phase` · `ParamField.relevantWhen`. |
| D19–D23 | **Bunyan is agent-native.** One command layer; `argsSchema` ⇒ the agent's tool list is **generated, never maintained**. | D55 | **Space extent = room-bounding**, DERIVED from bounding walls, never stored. |
| D24 | Measured OCCT history (boolean complete; fillet weak; **silence = unchanged**). | D56 | The pre-freeze reservation set (phasing = TWO datums, `ifcMapping`, `formula`, …). |
| D25 | **`transform` mints NO identities** — a rigid motion is a topological isomorphism. Load-bearing. | D57 | **The Clean Delta is designed on BUNYAN's terms; BIMsync is UNBUILT and adapts.** |
| D26 | `extrude`/`revolve` name `lateral.k` after the **authored** segment; **never permute the array**. | D58 | **Documentation is a live projection of the B-Rep.** v1.0.0 ships MINIMAL 2D (1 plan + 1 section + 1 schedule). |
| D27 | `revolve` — GenericSolid's other half. | D59 | **An element may own child ELEMENTS, not only Parts.** Children are DERIVED, never stored. |
| D28 | **The bounded positional key** — orders two structurally-tied sub-shapes, never identifies. | D60 | Multi-user co-authoring is Bunyan's. **Seam RESERVED**; no backend in v1.0.0. |
| D29 | **✅ THE BREP CACHE SHIPS** — an IDENTITY task. **Op bodies BUILT; the `.bnn` half is an OWNER CALL at the measured 2.07×.** | D61 | Data-driven family authoring. **Grammar RESERVED.** ⚠ rule 8 found it has no slot for `exposedRefs`. |
| D30–D33 | **The modelling layer**: element owns ordered PARTS · ElementStyle · LinearMember+Grid · Material/Section are REGISTRIES. | D62 | MEP systems & connectors RESERVED. A connector is AUTHORED placement, never a `SubShapeRef`. |
| D34–D38 | **The ecosystem**: Bunyan is a third producer of the Clean Delta · spatial tree · loadBearing · **no backend** · `.bnn`. | D63 | The DWG seam **already exists** (`FormatCodec` + `registries.codecs`). |
| D39 | Cascade delete in ONE undoable edit; warn-first is `dryRun`. | D64 | **The PEI-bound side-graph suffices** — reserve NOTHING analytical. One exception: `Material.thermal?`. |
| D40 | **The change feed is an APPEND-ONLY JOURNAL.** Delta = read, not inferred. | D65 | Design Options RESERVED — **and the EXCLUSION INVARIANT is in the frozen contract.** |
| D41 | **`core.issueRevision` is a Command.** | D66 | The 4-axis scale measurement. The heap-eviction hook needs **nothing reserved** — additive by construction. |
| D42 | Rule 4 is ALL-OR-NOTHING + a universal `dryRun`; `planDelete()` DELETED. | D67–D77 | **The backward-sweep rulings** — nine dirty rules found and fixed. Each is a separate ruling; see `docs/decisions.md`. |
| D43 | An unknown OR FUTURE type: the document OPENS, the element is `failed`+visible+PRESERVED VERBATIM. | D78–D80 | The schedules body · the schedule CRUD · **the five move verbs + `transactionId` atomicity.** |
| D81 | The plan/section unit ships `mode:'cut'` only; `SectionCurve.nodeId?` and `ParamField.refTo`'s four members are reserved. | D82 | **THE BUILD MODEL BECOMES FIVE SEATS** — `brahim`/`zayd`/`hmdnah`/`amer`/`khalihlna`, crossed GitHub accounts, `T-nnn` succeeds `Entry N` going forward. See `AGENTS.md`. |
| D83–D88 | Q19 cascade+surface · Q18 host-face rule · Q17a designOptions CRUD (contract-touching) · Q17c broken ref · seat credentials env-scoped (D87) · `risk: high` two-step review (D88). One-line index not yet backfilled per-row; full text in `docs/decisions.md`. | D89 | **CI runs on a self-hosted runner** (`bunyan-oracle-runner`) while the repo stays private — GitHub-hosted minutes exhausted, going public blocked on Q11. |

---

## §5 — Live priorities

**⚠ THIS SECTION IS LIVE WORK ONLY.** The chronological narrative of how the freeze was approached is
`docs/history.md` §D. The owner's open questions are `open_rulings.md`. Neither is a task list.

### The freeze

**All reopened pre-freeze work is DONE (rows Ⓐ–Ⓕ + D66's contract half), nothing measured forecloses a
contract, and every subsequent entry has moved no frozen byte. ⇒ THE FREEZE (P5 step 6) IS THE OWNER'S
ACT.** ⚠ It is now also **mechanically available**: `tests/freeze-boundary.test.ts` holds the frozen
surface, so freezing is the policy change *"the baseline may no longer be updated without an owner
ruling"* — with a machine holding the line afterwards.

### Zayd (kernel / document / headless)

1. ✅ **DONE (Entry 77) — THE PLAN + SECTION UNIT** (`docs/design/P5_step6C_plan_section_design.md`, D81).
   Ships `mode:'cut'` only; `SectionCurve.nodeId?` and `ParamField.refTo`'s four members are reserved.
   ⚠ Its fixture carries a curtain wall, an opening and a design option — §5's test table names, per
   criterion, how a one-plain-wall fixture passes while the criterion is false. Open work is now
   `docs/BACKLOG.md`.
2. ✅ **DONE (Entry 74) — the going-public housekeeping.** `LICENSE` AGPL-3.0, `CLA.md`, `NOTICE` +
   `licenses/`, and the `license` field in all ten manifests. What is left is not repo work: **Q11
   (`<LEGAL ENTITY>`) and Q12 (a lawyer's read of the CLA)**, both owner-only, both blocking the first
   external PR rather than publication. An in-app "open source licences" screen is unbuilt — Amer's.

⚠ **TWO ITEMS THAT STOOD HERE ARE GONE, BOTH KILLED BY READING THEM AGAINST THE ARTIFACT (Entry 73).
DO NOT RE-ADD EITHER.**

- **The `shapeSignature` memory view — CANCELLED, MEASURED NOT WORTH IT.** *"170 embind crossings per
  solid … most of what makes a cached import cost 12 ms"* was a **subtraction residue**, never measured.
  A crossing costs **0.21–0.39 µs**, so all **345** cost **0.073–0.133 ms — ~1% of the signature call**,
  against `shapeSignature`'s own **7.9 ms** of `GProp` work. A memory view removes ~0.1 ms/solid and no
  more, and would put a *"valid until the next call"* global buffer in the one file where a wrong answer
  builds a plausible wrong building. `tessellate`'s payoff is ~1.8M crossings **per frame**; this is 345
  **per solid, once**. Now a permanent tripwire: `geometry-cache-d29.test.ts` **THE ATTRIBUTION**.
  ⚠ **345, not the "170" Entry 71 quoted** — the self-review COUNTED it instead of deriving it, and a
  drain is **2N+1** crossings (`drainDoubles` re-calls `size()` in the loop condition), not N+1. It
  halves the per-crossing figure and leaves the total — the number the cancellation rests on — unmoved.
- **`schedule.ts`'s "rule 17" rename — A PHANTOM. There is no collision.** Both citations in
  `schedule.ts` are correct uses of the real numbered domain rule 17 (*a drawing is a projection*, D58,
  which names schedules explicitly). The collision was already resolved by numbering the interaction
  rule **19**, and `core_logic.md:376` records that the *"`schedule.ts` code-comment convention"* belief
  **was itself wrong.** Renaming would have INTRODUCED the error.

⚠⚠ **DO NOT START THE D29 DOCUMENT HALF UNASKED** — it is `open_rulings.md` Q6, and the measurement is
why: 2.07×, **6.64 ms/solid on every save**, **~61 MB at the 16k-solid target**, against a cold load that
stays ~3 min either way.

### Amer (browser hot path)

1. ✅ **DONE (Entry 80) — THE OPENING TOOL, and P4.5 EXIT CRITERION 3 WITH IT.** One click on a wall face
   places a `core.opening` carrying `{hostId, hostRef}`, verified in the real browser: `state: 'valid'`,
   `parts: [leaf, frame]`, quantities measured off the B-Rep, console-error-free boot. ⚠ **The field is
   `SnapHit.elementId`, never `hostElementId`** — this row said otherwise for three entries and no such
   field has ever existed. ⚠ **`InputSpec.snapTo` is now READ** (`chooseSnap`'s `allow`); it was
   decorative before, which is the defect Entry 80 found. **What is still open is the SECOND opening on
   the same wall — `open_rulings.md` Q18.**
2. ✅ **DONE (Entry 84) — ALIGNMENT GUIDES** (design §4.3). `tool/align.ts` is the pure half;
   `Viewport.guidesAt`/`setGuideLines` draw a dashed `LineSegments` in `#preview`. Browser-proven by
   revert (guides on ⇒ the aligned component comes from the reference; off ⇒ the raw ground point).
   ⚠ **A guide carries NO `ref`/`elementId`** — a point reached along an axis FROM a reference is on no
   sub-shape, so a hosted-void tool declines it. ⚠ **References are endpoints and midpoints only, plus
   the gesture anchor**: the world grid is a LATTICE, and admitting it lights both guides everywhere.
   ⚠ It is `'extension'` in the Q3-ruled order — **no `SnapKind` was added.** What is still open from
   §4.3's list: the **perpendicular foot** and the **intersection of two candidate lines** — same shape,
   same module, same identity rule.
3. **THE MOVE TOOL + GIZMO and THE CORNER-DRAG are now UNBLOCKED (D80).** ⚠⚠ **READ THE SPLIT BEFORE THE
   GIZMO — IT IS ENFORCED, NOT MERELY DOCUMENTED: `core.move` REFUSES a wall** (drag both endpoints with
   `core.setParams`) **and REFUSES a door** (`setParams` on `offsetU`), naming the road that works. The
   move verbs are for GenericSolid-shaped elements. `core.array` refuses by design — keep it out of the
   ribbon. The corner-drag has its atomicity via `doc.execute(id, args, { transactionId })`.

**Standing API facts that have bitten before:** `planDelete()` is gone (use `dryRun`) · `discipline` lives
on the part · ids are opaque ULIDs (never parse or render them — use `element.name`) · `mass` may be absent
(render "—", never "0 kg") · on save persist
`saveBnn(scene, { journal: doc.changeFeed(), revision: doc.revision })` — `doc.history()` there is the
moat-losing bug, and it is now **refused** rather than silently written.

### Later (post-freeze / v1.0.x)

The D29 `.bnn` half (owner call) · `instantiate` · lazy build + heap eviction (D66) · multithreading (D8) ·
a File System Access `StorageAdapter` · WebGPU + WebGL2 fallback · service worker/PWA + Cloudflare deploy ·
material appearance + transparency · the optional `codecFor` open/save wiring (D71) · then the **"Road to
Revit parity"** phase map. *That is the actual distance to beating Revit; v1.0.0 is its foundation.*

### ✅ CLOSED — DO NOT REDO

The op set (`transform`/`extrude`/`chamfer`/`revolve`/`faceFrame`) · `measure(ref)` + derived
`capabilities` · the positional key (D28) · the protocol freeze · CI · the document model + agent surface +
`.bnn` + undo + broken-ref state + cascade delete · all six P3 defects + D40–D46 · `-O3`/LTO (**MEASURED —
no speed; do not re-run**) · the heap ceiling · **all of D50 step 0** (0a–0g, the sketch solver, the room
solver, 0c joins) · **all eighteen backward sweeps** (D67–D77) · the enumeration query + Clean Delta
exporter · the schedules body (D78) + its CRUD (D79) · the renderer batching rewrite · P4.5's tool layer ·
the D29 op bodies · **the five move verbs + `transactionId` (D80)** · **P4.5's alignment guides (Entry
84) — the axis-alignment kind only; the perpendicular foot and the two-line intersection are not built**
· browser storage · the join spatial
index (D73) · **the cached-import cost attribution — the embind crossings are 0.9%, the memory view is
cancelled and the "rule 17" rename is a phantom (Entry 73)** · the plan/section unit (D81, Entry 77) ·
**the toolchain pin (Q14, Entry 79) — the emsdk digest is in `tools/kernel-build/toolchain.json`, the
build id is composed by the compiler and checked at kernel construction, and the pin is PROVEN (relinking
on it reproduced the committed artifact byte for byte). A VERSION BUMP is a different question.**

---

## §6 — Environment & commands (dev box)

```bash
# ⚠ pnpm is corepack-only — NOT on PATH. Drop a shim for the session:
mkdir -p ~/bin && printf '#!/bin/sh\nexec corepack pnpm "$@"\n' > ~/bin/pnpm && chmod +x ~/bin/pnpm
export PATH="$HOME/bin:$PATH"        # ⚠ this also puts `gh` on PATH (installed 2026-07-31)

pnpm install
pnpm verify          # THE CI STEP LIST EXACTLY: typecheck (incl. apps/web) + lint + format:check
                     #                           + test + reseed:check + docs:check
pnpm state           # regenerate §8 and YOUR OWN prompt's FRESH. Never hand-edit §8.
pnpm docs:check      # the doc gates alone (budget · abstract schema · §8 freshness)

# Change the kernel's C++ and re-test: ~60-74 s (OCCT's static libs are prebuilt). A VERSION bump = 2.5 h.
# ⚠ THE IMAGE IS PINNED BY DIGEST (Q14, Entry 79). `:latest` moved 6.0.2 -> 6.0.5 under this recipe.
SPIKE=$HOME/occt-wasm-spike;  REPO=$HOME/projects/Bunyan/tools/kernel-build
EMSDK=$(node -p "require('$REPO/toolchain.json').emsdk.image + '@' + require('$REPO/toolchain.json').emsdk.digest")
docker run --rm --memory=2g --cpus=2 --user "$(id -u):$(id -g)" \
  -v "$REPO:/work" -v "$SPIKE/install:/install:ro" \
  "$EMSDK" bash /work/link.sh
cp $REPO/dist/bunyan-kernel.{js,wasm} $HOME/projects/Bunyan/packages/kernel-occt/wasm/ && pnpm verify

# Offline golden seeding (NEVER in CI): cd tools/oracle && VIRTUAL_ENV=$PWD/.venv uv run seed-goldens ../../tests/goldens
```

- **Node** 20.20.2, **pnpm** 10.34.5 (corepack only), **uv** 0.11.20, **gh** 2.97.0 (`~/bin/gh`).
  **`libgl1`** installed (OCP → VTK). No system pip/venv — always `uv`.
- ⚠ **`verify` = the CI step list, EXACTLY**: a local gate that is a strict SUBSET of CI is a
  false-negative generator. `.prettierrc` has `endOfLine:"auto"` so `format:check` is green on both
  Windows (CRLF) and CI (LF).
- ⚠⚠ **`.prettierignore` LISTS PATHS, AND THE PROSE DOCS MOVED.** A stale entry there does not error — it
  silently stops exempting a file, and `format:check` is CI step 3, which failed silently for six sessions
  once already. **Move a prose doc, move its line, same commit.**

### §6a — BOX DISCIPLINE (owner ruling — binding)

**Full text: box-local `cross_projects_policy.md` §6/§6a.** The dev box is small (~3.7 GiB RAM + 2 GiB
swap) AND it is the production host for two live public sites — **an OOM here can take the owner's public
sites offline.**

1. **Never run anything that would overload the box.** Constrain at the source (cap Docker memory, cap
   `-j`). If a run can't be made safe, **escalate** with the numbers.
2. **PRE-AUTHORIZED to pause** (graceful `docker stop` only; never `kill`/`rm`/remove a volume; check that
   project's `current_state.md` for active work; restore + verify after): **Planitor**, **Chantier_Manager**
   (`restart=no` — they won't come back on their own), **Portique_Designer**, **SmartBar**.
3. **⚠⚠ HARD LIMIT — NEVER, including box strain:** `portfolio-caddy-1` (live `beam-stack.com` +
   `daoudi.beam-stack.com`) and `beamstack-contact` (real inbound leads). This box is their production box.
4. **Before pausing anything, `du -sh /tmp`** — it is tmpfs (RAM); our own dead scratchpads are usually the
   hog.
5. **Record any pause + restore** in the box-local `last_session_work.md`.

---

## §7 — Entry abstracts (newest 10)

**⚠ THE FULL BODIES ARE IN `handoff/<agent>/`, ONE FILE EACH. Nothing was summarized away.** Older entries
are indexed in `docs/history.md` §C with their paths, and entries 1–53 are summarized there.

**The eight fields are MANDATORY and gate-enforced** (`tests/docs-budget.test.ts`). Write the abstract
first, then the body. **Open a full body only when an abstract line touches your task.**

**⚠ THE ROTATION RULE — it is a BYTE BUDGET, not a count.** `pnpm docs:check` fails when this file or §7
exceeds budget. When it does: move the oldest abstracts' summaries into `docs/history.md`, **after
checking their durable lessons are already in §1–§5.** The bodies stay in `handoff/` forever. **Compaction
is maintenance and does NOT get an entry of its own.**


### T-020 — review (step 1, mechanical): the bump collects the identical 936 tests, and vitest 2 was not enforcing the default timeout — 2026-08-18 — seat: hmdnah

- **CHANGED:** nothing on the branch — a review turn edits no code.
  `handoff/hmdnah/2026-08-18-T-020-review-step1.md` NEW; this abstract; the `REVIEW:` line of the entry
  below; T-011's step-2 re-run abstract rotated to `docs/history.md` §E to hold §7 inside its budget.
- **VERIFIED:** **Item 1 re-executed by hand**, the added `120_000` reverted under the branch's runner:
  RED, `Test timed out in 5000ms` at 19 001 ms, `1 failed | 8 passed (9)`; restored 9/9. **Both full runs
  re-measured here**, each runner installed in turn from its own lockfile — `vitest@2.1.9` **936 · 97 files
  · 287 suites** (274.63 s) and `vitest@4.1.10` **936 · 97 · 287** (271.46 s), `docs:check` **154 · 8**
  under both. ⚠ **Stronger than the count:** diffing the two json summaries by `(file, test title)` gives an
  **empty symmetric difference**, so the runners collected the *identical* 936 tests, which is what the
  `done-when:`'s ⚠ is actually asking. **Item 7:** `reserved-classes.mjs --base <main>` → `none —
  RISK: additive`; both CI jobs now `success` on `82e1c60`.
- **FOUND:** **The author's mechanism is correct, and a probe isolates it from the cost.** Same commit,
  same reverted file: 2.1.9 passes the clean-delta test at 18 855 ms, 4.1.10 times it out at 5000 ms after
  19 001 ms. A two-case probe with no kernel in it — a microtask-only chain busy ~8000 ms, and a
  `setTimeout` of 8000 ms, neither carrying an explicit timeout — passes A and fails B under 2.1.9 while
  failing both under 4.1.10, so vitest 2's default deadline is a timer that a chain resolving through
  `queueMicrotask` (`transport.ts:63`) never lets reach the timer phase. **⚠ CI's labeller had not run:**
  `pr-shape` was red in `Set up job` on a `429` fetching `actions/checkout@v4`, which is item 7's *"no label
  and no labeller look identical"* case; re-run, now green. Sweep and API figures reproduce — three of 936
  tests over 5000 ms with next-slowest 1878 ms (author 1980 ms, same test), 131 numeric `}, N)` sites and
  **zero** options-object sites, `.toThrow` 58 / `.toEqual` 394 exact. One nit: the `vi.*` enumeration is
  complete but counted five where the tree has six call sites of four methods.
- **OWES:** `hmdnah` — **step 2** (items 2, 3, 6 plus the pre-merge `needs-operator/*` re-check), separate
  session, same claim, row stays `review`. The **pc seats** — `unverified here: the five protocol files
  collect on Windows — the pc seats to confirm`; this box parses all five under **both** runners, so **T-021**
  closes it and the criterion is not ticked here.
- **RISK:** additive — a review turn moved no declaration; `reserved-classes.mjs` returns `none`.
- **FULL:** `handoff/hmdnah/2026-08-18-T-020-review-step1.md`
- **REVIEW:** n/a — this IS the review turn (`AGENTS.md §1.2`), D88 step 1 of 2; findings posted to PR #37
  (`issuecomment-5333851516`, presence verified).

### T-020 — the runner moves 2.1.9 → 4.1.10, and vitest 2 was not enforcing test timeouts — 2026-08-18 — seat: zayd

- **CHANGED:** `package.json` (`vitest` `^2.1.8` → `^4.1.10`) and `pnpm-lock.yaml` (`vitest@2.1.9` →
  `4.1.10`, `vite@5.4.21` dropped — apps/web's `6.4.3` now serves the runner too) ·
  `tests/document-persistence.test.ts` — one explicit `120_000` timeout on the clean-delta test, the one
  test the bump exposed. `handoff/zayd/2026-08-18-T-020-vitest-2-to-4.md` NEW; this abstract; T-011's
  D88-return abstract rotated to `docs/history.md` §E, §7 having stood at 32756 of 32768 bytes. No
  `packages/`, no `scripts/`, no `vitest.config.ts` byte, no snapshot byte.
- **VERIFIED:** `pnpm verify` green, exit 0, 6 m 23 s. **The suite count is a fresh full run on both sides,
  never `§8`'s cached line:** `vitest@2.1.9` → **936 passed · 97 files · 287 suites** (270.68 s);
  `vitest@4.1.10` → **936 passed · 97 files · 287 suites** (268.77 s). Unchanged, so nothing stopped
  collecting. `docs:check`, which collects `tests/protocol` on its own, **154 · 8**. `numTotalTests` /
  `numTotalTestSuites` / `testResults.length` all still present in the json reporter's output, which is
  what `state.mjs:120-126` reads. `freeze-boundary` 12/12 unmoved, no re-baseline.
- **FOUND:** **⚠⚠ vitest 2 never applied the 5 000 ms default timeout to a test whose awaits are
  microtask-only, and one test had been 3.7× over it.** The bump's single failure was
  `document-persistence.test.ts`'s clean-delta test; A/B on the same commit, each runner installed in
  turn, prices it at **18 549 ms under 2.1.9 (passing)** and **18 397 ms under 4.1.10 (timed out at
  5 000 ms)** — the cost moved 0.8%, the enforcement moved. `InProcessTransport` resolves every kernel
  response through `queueMicrotask` (`transport.ts:63`), so 250 real kernel edits are one uninterrupted
  microtask chain and the event loop never reaches the timer phase a `setTimeout` deadline lives in.
  Invariant 8 exactly: the test was green because nothing was checking. **Backward sweep over the
  newly-enforced rule, by measured duration rather than by source, because only a run answers "how long":**
  exactly three of 936 tests exceed 5 000 ms — 58 571 ms and 16 256 ms, both already carrying explicit
  timeouts, and this one. The next-slowest is 1 980 ms, a 2.5× margin. **The API sweep is an enumeration,
  not a sample:** the suite imports eight names from `vitest` and calls five `vi.*` sites, and each of the
  22 documented 2→3/3→4 breaking changes is checked against its call sites in the body — the numeric
  `}, 120_000)` third argument used at 130 sites is **not** the options-object form vitest 4 removed.
- **OWES:** `hmdnah` — this PR's review, `risk: high` ⇒ **two review turns** (D88). ⚠ Item 1's revert is
  the added timeout, and reverting it should reproduce *Test timed out in 5000ms* rather than a fix
  regressing. The **pc seats** — `unverified here: the five protocol files collect on Windows — the pc
  seats to confirm`; the box parses those files under **both** runners, so it can neither reproduce the
  failure nor witness the repair, and **T-021** is the turn that closes it. `brahim` — T-021 becomes
  claimable once this merges, and with it the five `ready` `pc` rows behind it.
- **RISK:** additive — no declaration moved, no frozen byte; `reserved-classes.mjs` returns `none`.
- **FULL:** `handoff/zayd/2026-08-18-T-020-vitest-2-to-4.md`
- **REVIEW:** ✅ **APPROVED AND MERGED** — `hmdnah`, D88 both steps, on `narutousomaki741`. Step 1 (mechanical, `82e1c60`): item 1 re-executed RED, both suite counts re-measured at 936 · 97 · 287 and shown to be the identical 936 tests, the microtask-timeout mechanism reproduced by a kernel-free probe. Step 2 (adversarial, `c203a67`, abstract in `docs/history.md` §E, body `handoff/hmdnah/2026-08-19-T-020-review-step2.md`): the same tests also execute the same **5047** `expect()` calls, collection matches the 97 files on disk exactly, and the margins are green at `--testTimeout=2500` and `--hookTimeout=1200` — the hook deadline being the second gate the bump switches on and the sweep did not cover. Both CI jobs SUCCESS on the merged tip; `needs-operator/*` empty and informative. ⚠ Step 2 is archived rather than in §7 because it ran past midnight UTC, and a §7 abstract dated 2026-08-19 reddens `freeze-boundary` through **T-024** having moved no declaration. ⚠ `unverified here: the five protocol files collect on Windows` is **not** ticked; T-021 closes it.

### STEWARD-unblock-pc-and-chrome-boot — review: the splits are honest, and T-024 named a fixture that measures green — 2026-08-18 — seat: hmdnah

- **CHANGED:** `docs/BACKLOG.md` — T-024's `done-when:` corrected to name the one turn that reproduces
  the defect, plus one `## Discovered` row; `handoff/hmdnah/2026-08-18-STEWARD-unblock-pc-and-chrome-boot-review.md`
  NEW; this abstract and the `REVIEW:` line above. No `packages/`, no `scripts/`, no snapshot byte.
- **VERIFIED:** **Item 1 re-executed in its docs-only form — two mutations, since the diff reverts no fix.**
  (A) restoring `_baselinedAt` to `2026-08-17` takes `freeze-boundary` **1 of 12 RED**
  (`_baselinedAtEntry 1000 is dated 2026-08-18 in §7, but _baselinedAt says 2026-08-17`); restored,
  **12/12 green**. (B) flipping T-022 to `machine: **pc**` moves `reviewer-for` `hmdnah` → `khalihlna` and
  `can-claim zayd` `yes` → `REFUSED`; restored. **The claim T-022 rests on, re-measured here rather than
  taken:** Node 20.20.2 decodes a resizable-backed view without throwing, and
  `WebAssembly.Memory(...).buffer.resizable` is **`false`** here — the box cannot construct Chrome's
  shape, let alone reproduce its refusal. The call site matches the diagnosis:
  `UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr))` over `HEAPU8`, one UTF-8 decoder in the glue.
- **FOUND:** **One defect, fixed on the branch.** T-024's `done-when:` named _"the two turns that hit it
  (T-011, `STEWARD-…`)"_; run against T-011's own merged tree (`c18ae8e`), `baselineEntryIssues` returns
  **`[]`** — its dates agreed on the day and its re-baseline was earned by a real declaration moving
  (`scene.ts :: type SceneCollection`). A criterion pointing at a green fixture is not checkable (READY
  criterion 4), so it now names the one turn that does reproduce. **Everything else checked out:** all
  three box rows' `done-when:` items are box-executable, each carries an explicit `unverified here:`
  naming its pc successor, and `seats.mjs` routes and refuses the five rows accordingly; both corrections
  hold against the code (`Part.node` exists nowhere, `saveBnn` takes a `Scene`); T-011's rotated abstract
  is byte-identical.
- **OWES:** The **owner** — the merge; `needs-operator/freeze` is applied and CI's `PR shape` job ran.
  `brahim` — the `--review` merge-command routing defect now in `## Discovered`, and an owner line on
  `AGENTS.md §7.3` vs. invariant 10 for an in-place correction in a planning file.
- **RISK:** additive — no snapshot byte, no declaration, no code. **Not merged: owner-gated.**
- **FULL:** `handoff/hmdnah/2026-08-18-STEWARD-unblock-pc-and-chrome-boot-review.md`
- **REVIEW:** n/a — this IS the review turn (`AGENTS.md §1.2`); full findings posted to PR #36.

### STEWARD-unblock-pc-and-chrome-boot — the two defects that block a whole machine, decomposed — 2026-08-18 — seat: brahim

- **CHANGED:** `docs/BACKLOG.md` — **T-020**/**T-021** (the pinned vitest cannot collect
  `tests/protocol/*` on Windows; box fix, pc confirmation) and **T-022**/**T-023** (`kernel-occt`'s glue
  decodes from growable WASM memory; box fix, pc confirmation) NEW · T-018's `done-when:` corrected from
  `Part.node`, a field that has never existed, to `Part.nodeId` · T-005's first bullet marked discharged
  by T-018's measurement · **T-024** NEW (`_baselinedAtEntry` names a position, so a cross-day §7 append
  goes red), decomposed because this turn tripped it rather than because the row was old · T-011's
  step-2-of-2 review abstract rotated to `docs/history.md` §E, §7 being over its byte budget at 33235.
  No `packages/`, no `apps/web`, no `scripts/`; the only frozen-surface byte is `_baselinedAt` (see RISK).
- **VERIFIED:** `pnpm verify` green, exit 0. Four facts measured before writing the rows rather than
  assumed: **Node 20.20.2 decodes a resizable-backed view without complaint**, so the box cannot
  reproduce Chrome's refusal and T-022 carries no browser criterion; `bunyan-kernel.js` is minified
  emscripten glue with one `TextDecoder` on the UTF-8 path, so the fix is the toolchain or the recipe,
  never a hand edit; all five protocol test files carry em-dashes (5–37 each); `Part.node` does not exist
  (`entities.ts:683`).
- **FOUND:** Both defects block a whole machine and both are box work — the machine that is not blocked.
  `pnpm verify` cannot reach green on the pc for **any** task, so `agent-finish.mjs` refuses every
  `amer`/`khalihlna` turn and five `ready` `pc` rows sit behind it with T-001's browser-verified work
  unmerged. The kernel not booting on Chrome 149+ is a v1.0.0 shipping defect, not a dev-box one; the
  pc's `BUNYAN_BROWSER_CMD` pin fixes one machine and nothing users get. Both split box/pc under this
  file's own rule — *a `done-when:` that mixes machines needs splitting* — so each box row carries an
  explicit `unverified here:` and each pc row is the turn that may tick it.
- **OWES:** `zayd` — **T-020**, **T-022** and **T-024**, all `ready`, all `risk: high` ⇒ two review turns
  each (D88). ⚠ **T-024 before the P5 freeze**, for the reason in its own row: after the freeze the
  baseline may not be rewritten without an owner ruling, so today's only remedy stops existing and the
  gate has no green path. The pc seats — **T-021** and **T-023** once their box halves merge; T-023 also
  unsets the `BUNYAN_BROWSER_CMD` workaround so it cannot outlive its fix. `brahim` (a later turn) — the
  `--review` wrong-PR claim, three occurrences and still undecomposed.
- **RISK:** additive (re-baselined) — **0 declarations moved**, all 214 byte-identical; the only change
  to the snapshot is `_baselinedAt`, demanded by the very defect T-024 decomposes. ⚠ It still labels the
  PR `needs-operator/freeze`, so the owner merges a docs-only turn — the cry-wolf cost that row ends.
- **FULL:** `handoff/brahim/2026-08-18-STEWARD-unblock-pc-and-chrome-boot.md`
- **REVIEW:** ✅ approved by `hmdnah` 2026-08-18 — one defect found and fixed on the branch (T-024 named
  T-011 as a fixture that measures green). ⚠ **Owner merges** — `needs-operator/freeze`.

### T-018 — D66's lazy build: 89.8% of a cold load is deferrable, and a deferred join partner is safe — 2026-08-17 — seat: zayd

- **CHANGED:** `docs/design/P5_step9_D66_lazy_build_design.md` **NEW** (§3a keep-live set · §3b first
  paint · §3c force-vs-declare · §3d eviction ruled out — the section numbers T-005/T-006 already cite) ·
  `tests/d66-lazy-build-measure.test.ts` **NEW** (+8, the instrument every number is printed by) ·
  `docs/BACKLOG.md` (one `## Discovered` row) · `current_state.md` (this abstract; **T-011's step-1
  review abstract rotated** to `docs/history.md` §E to stay inside the 10-abstract cap) ·
  `docs/history.md` §E. **Nothing ported from closed PR #16**, and no `packages/`, no `apps/web`, no
  `scripts/`, no frozen byte.
- **VERIFIED:** `pnpm verify` green, foreground, real OCCT kernel, exit 0 — main suite **936 green · 97
  files · 287 suites**, `docs:check` **154 · 8 files**; `tests/freeze-boundary.test.ts` 12/12,
  unmoved ⇒ `RISK: additive`. **Revert-verified on the tripwire the row names:** changing
  `identitiesOf` from `parts.flatMap(p => [...p.refs])` to `parts.map(p => p.nodeId)` left **1 of 8
  RED** — `the identity signature must carry more than the recipe-derived node ids: expected 12 to be
  greater than 12`; restored 8/8. ⚠ **The element-for-element identity comparison stays GREEN through
  that revert, which is the point:** `partNodeId` is `${elementId}.${partName}`, computed with no kernel
  call, so it agrees whatever the geometry did. ⚠ **The row names `Part.node`, a field that has never
  existed** — it is `Part.nodeId` (`entities.ts:695`).
- **FOUND:** **The safety condition holds and it holds ACROSS A JOIN.** Two cold documents from the same
  `.bnn`, `rebuildAll()` vs `rebuildOnly(9 of 88)`: part names, `nodeId`, `refs` and `quantities` all
  identical, `brokenRefs()` empty in both — and the built south wall keeps the miter made by a west wall
  the partial document **never builds** (`resolveJoins` = `['start','end']` in both; bounds
  `[-100,-100,0 … 8100,100,3000]` in both, the `-100` being the miter). Measured on `bounds`, not
  `refs`, because T-011 measured that `refs` cannot see a miter. **Deferral:** 89.8% of elements / 89.3%
  of solids deferred removes **85.8%** of a 2443 ms cold load; a 4-point `rebuildOnly` sweep
  (22/44/66/88 el → 707/1231/1869/2567 ms) fits **28.3 ms/element, intercept 39 ms = 1.6%, R² 0.9961**,
  so the element fraction and the wall-clock fraction agree to ~4 points. `rebuildOnly(everything)` costs
  2567 ms against `rebuildAll()`'s 2443 ms ⇒ **the build half needs no new API.** ⚠⚠ **§3c's real
  defect:** `projectQuantities` DECLARES the 79 deferred elements rather than under-reporting — but
  `enumerate.ts:215` gives every one of them `failure: 'unbuildable'`, so a consumer cannot tell *"not
  built yet"* from *"cannot be built"*. **Two measurement defects found by the harness failing:** a sweep
  on cold kernels priced an element at **−0.76 ms** (each later load warmer than the last), and with all
  the doors on one storey the fit came back **R² 0.2539**; fixed by a per-kernel warm-up and by spreading
  the doors.
- **OWES:** `hmdnah` — this PR's review, `risk: normal`, the ordinary one-step route. `khalihlna` —
  *unverified here: lazy first paint improves time-to-first-pixel*; every number is headless and the
  browser half is T-006's. `brahim` — three non-blocking items: the `## Discovered` join level-scoping
  row wants a decision on becoming a `T-nnn`; **T-005's first `done-when:` bullet is discharged** (`save`
  reads no built state — the two scenes are byte-identical JSON and `saveBnn` takes a `Scene`, never a
  `DocumentContext`), so its wording now describes a measurement that exists; and T-018's own
  `done-when:` names `Part.node`.
- **RISK:** additive
- **FULL:** `handoff/zayd/2026-08-17-T-018-d66-lazy-build.md`
- **REVIEW:** approved and merged by `hmdnah` on `narutousomaki741`, green CI, no defect. Item 1
  re-executed independently; findings in the `hmdnah` entry above and on PR #35.

### T-018 — review: the deferral numbers reproduce, and the tripwire has teeth — 2026-08-17 — seat: hmdnah

- **CHANGED:** no product or test byte — no defect to fix. This abstract, and `T-011`'s comment-sweep
  abstract rotated to `docs/history.md` §E to hold §7 inside its 32 KB budget once a tenth abstract
  lands (`docs-budget.test.ts`'s own remedy). Merged PR #35 on `narutousomaki741`.
- **VERIFIED:** **Item 1 re-executed.** `identitiesOf` reverted from `p.refs` to `p.nodeId` ⇒ **1 of 8
  RED** — `the identity signature must carry more than the recipe-derived node ids: expected 12 to be
  greater than 12`; restored, tree clean, **8/8 green**. ⚠ The row's `Part.node` **has never existed** —
  judged against `Part.nodeId` (`entities.ts:695`), which the tripwire was built against. **Item 5
  re-measured twice:** 89.8 %/89.3 % deferred both runs, slope **27.82** and **28.04 ms** against the
  doc's 28.3, R² 0.9968/0.9983, bounds and take-off identical; the intercept is the noisy term
  (39 → 67 → 90 ms) but stays under 4 % of a cold load, so what it carries survives the spread. **Item
  7:** `RISK: additive — unchanged vs baseline`, `freeze-boundary` green, no `packages/` byte, and
  `PR shape · reserved classes` confirmed to have RUN with no `needs-operator/*` label.
- **FOUND:** no defect; all four `done-when:` items are box-executable and were executed. Every item-4
  claim held against code — `partNodeId` (`geometry.ts:60`), `rebuildOnly`'s assembly closure
  (`document.ts:553`), `saveBnn(scene, …)` (`bnn.ts:103`), `enumerate.ts:215`'s `'unbuildable'`,
  `baselineOf`'s early return (`joins.ts:103`), `partnersAt`'s unscoped 2D match (`joins.ts:205`).
  **"Nothing ported from #16" holds:** that instrument has no `warmUp`, sweep or `fitLine` and reported
  a different measurement (3 storeys, "~35 % forced"). One correction: `CHANGED:` names **one** rotated
  abstract where the commit rotates **two** (T-016, T-011), both intact in `history.md` §E — the second
  is what keeps §7 in budget, so the act is right and its description short by a row.
- **OWES:** `brahim` — T-018's `done-when:` names `Part.node`, to correct post-merge; and `main`'s §8
  disagreed with the measured tree at turn start (T-011's branch-shaped block), regenerated with
  `pnpm state` and committed so the turn could begin. `khalihlna` — *unverified here: lazy first paint
  improves time-to-first-pixel*, already written as such in the doc, T-006's and not ticked.
- **RISK:** additive
- **FULL:** `handoff/hmdnah/2026-08-17-T-018-review-d66-lazy-build.md`
- **REVIEW:** n/a — this IS the review turn (`AGENTS.md §1.2`); full findings posted to PR #35.

### T-017 — review: the new gate has teeth on the real file, not only on its fixture — 2026-08-17 — seat: hmdnah

- **CHANGED:** nothing in the diff — no defect to fix, and the one correction below is a number in the
  author's own entry, which `AGENTS.md §4.10` keeps rather than rewrites. Merged PR #34 on
  `narutousomaki741`.
- **VERIFIED:** Item 1 re-executed here: the author's neutralisation
  (`return above && above.date < below.date` → `return false && …`) leaves **1 of 21** RED in
  `tests/docs-budget.test.ts`, `expected [] to deeply equal [ Array(1) ]` on the fixture case;
  restored **21/21 green**. Item 6 by mutating the REAL file rather than a fixture — §7's last
  abstract re-dated `2026-08-16` → `2026-08-18`, which makes `current_state.md` itself genuinely
  out of order: the new gate goes RED naming the pair, and the check it replaced stays **GREEN** on
  that same input (`ns` = `1000 … 991`). Old blind, new red, one real file. Item 2: every
  `.n`/`parseAbstracts` reader re-enumerated independently — the author's five-row table is complete.
  Item 7: `detectReservedClasses` run here against `origin/main` ⇒ `classes: []`, and both CI jobs
  SUCCESS on the tip with no `needs-operator/*` label. `freeze-boundary` **12/12**.
- **FOUND:** no defect; all three `done-when:` items are box-executable and all three were executed.
  The fixture alone would not have settled item 6 — it proves the helper, and stays green if the
  real-file assertion is deleted — which is why the gate was re-proved against `current_state.md`.
  One correction (item 4): the entry's *"§7 holds eight abstracts dated `2026-08-16`"* is `origin/main`'s
  histogram (8/2, measured); on this PR's own tip it is **7 and 3**, since the same commit adds an
  `08-17` abstract and rotates an `08-16` one out. The ceiling argument it supports is unaffected —
  but the observable scope today is one day boundary, so the gate binds the next mis-rotation, not §7
  as it stands. The `date:` is authored and nothing checks it against the day of the turn
  (`agent-finish.mjs:284` only suggests it), a second ceiling the entry does not name.
- **OWES:** `brahim` — two non-blocking follow-ups, neither in this task's `done-when:`:
  `docs-state.mjs`'s "SYNTHETIC SORT KEYS" comment now cites a gate that is true only to day
  granularity, which it does not say; and `frozen-surface.mjs:269` resolves `_baselinedAtEntry` through
  `.n`, a position rather than an identity for a new-scheme entry, so `1000` always finds whatever is
  on top of §7 (pre-existing, guarded by the date cross-check beside it).
- **RISK:** additive
- **FULL:** `handoff/hmdnah/2026-08-17-T-017-review.md`
- **REVIEW:** n/a — this IS the review.

### T-017 — §7's newest-first gate now reads the authored date, not the positional key — 2026-08-17 — seat: zayd

- **CHANGED:** `tests/docs-budget.test.ts` (**`outOfDateOrder` NEW**, module-local and pure — the
  offending adjacent pairs, empty ⇒ §7 descends by date; the old "numbers entries uniquely and
  monotonically" case SPLIT, its duplicate-number half kept verbatim and its order half replaced by a
  date comparison; +2 fixture cases — the teeth, and same-date entries in either order) ·
  `tests/freeze-boundary.test.ts` (one comment: *"nothing enforces it"* was true when written and is
  false as of this PR) · `current_state.md` (this abstract; **T-008's second abstract rotated** to
  `docs/history.md` §E to stay inside the 10-abstract cap — its durable lesson is already in §5's
  CLOSED list) · `docs/history.md` §E. No `scripts/`, no `packages/`, no `apps/web`, no frozen byte.
- **VERIFIED:** `pnpm verify` green, exit 0, all six gates — **95 files/910 tests** main suite,
  **8 files/154 tests** `docs:check` subset, `tests/freeze-boundary.test.ts` **12/12** ⇒
  `RISK: additive`.
  **Revert-verified:** neutralising the date comparison to the old blind behaviour
  (`return above && above.date < below.date` → `return false && …`) left **1 of 21**
  RED in `tests/docs-budget.test.ts` — the fixture case, `expected [] to deeply equal [ Array(1) ]`;
  restored **21/21 green**. The same test's positional-key assertion stayed green through the revert,
  which is deliberate: it is the half that records what the old signal could see.
- **FOUND:** measured the defect before writing the fix rather than reading it off the BACKLOG row —
  on a two-entry fixture with the OLDER entry on top (`T-002`/`2026-01-01` above `T-001`/`2026-01-02`)
  the positional key is `1000, 999`, descending, and the old assertion is green on the exact input it
  exists to refuse. What made it worth gating at all: `newestAbstract` returns the MAX `.n`, which for
  a new-scheme entry IS its position, so §7's written order decides §8's "newest entry" row and
  `--rebaseline`'s `_baselinedAtEntry`/`_baselinedAt` — and the existing "§8 agrees with §7" case
  cannot catch a mislabel, both its sides coming from that same call. ⚠ **Day granularity is the
  honest ceiling, not an oversight:** §7 holds eight abstracts dated `2026-08-16`, so a swap within a
  day is invisible and is accepted by design. **Backward sweep, all five order-readers enumerated:**
  `newestAbstract` (the reason the gate exists), `state.mjs:229`/`:240` and the `AWAITING REVIEW` guard
  (covered transitively), `frozen-surface.mjs`'s `baselineEntryIssues` (treats `.n` as an identity, not
  a sequence — unaffected), and `agent-finish.mjs:280`, whose `find(a => a.id === task && a.seat ===
  seat)` does take the topmost of a same-id/same-seat pair (§7 holds one today) — not a defect, the
  matched object is never read past the `die()` beside it.
- **OWES:** `hmdnah` — this PR's review; `risk: normal` per the BACKLOG row, so the ordinary one-step
  route. Not covered: two entries written on the same day are unordered by this gate, which would need
  a finer-grained authored field in §7's heading — a schema change, out of scope here. `brahim` — the
  two T-016 follow-ups reassigned in that entry's step-2 `OWES:` are untouched by this turn.
- **RISK:** additive
- **FULL:** `handoff/zayd/2026-08-17-T-017-newest-first-by-date.md`
- **REVIEW:** reviewed by `hmdnah` (one step, `risk: normal`) — item 1 re-executed, and item 6 re-proved
  against the real `current_state.md` rather than the fixture. No defect; one number corrected in the
  review entry above. Approved and merged on `narutousomaki741` with green CI.

### T-016 — review (step 2, adversarial): the field is correct and its wiring is untested — 2026-08-17 — seat: hmdnah

- **CHANGED:** nothing in the diff — the two findings below are comment-level and unprovable by test,
  and step 2 is the step nobody reviews. Merged PR #33 on `narutousomaki741`.
- **VERIFIED:** Item 1 re-executed independently of step 1: `resolveBuilder` → `return seat;` leaves
  **1 of 50 RED**, `expected 'hmdnah' to be 'zayd'`; restored, whole `tests/protocol/` tree
  **113/113 green**. Item 2: every baton site enumerated (two writers, two readers, one fixture) —
  no consumer dirty. Item 3: `liveClaims` is what quantifies over every baton, feeding two claim
  refusals, and both correctly still key on `seat` — a collision gate asks who holds the branch, not
  who built it. Item 6 by mutation: deleting the `builder` key from `agent-finish.mjs`'s `claim`
  object restores the pre-T-016 defect at the call site and leaves **113/113 green**. Item 7
  re-confirmed on the tip: `review/step-1` only, no `needs-operator/*`, both CI jobs pass.
- **FOUND:** no defect. (1) **The wiring is uncovered** — the three `resolveBuilder` cases assert a
  pure function, nothing asserts it is called, so `done-when:` bullets 2 and 3 rest on re-execution;
  it is proven instead on this branch's own history, where `153c957` (plain finish) wrote
  `builder: zayd` and `c9ac027` (`--review` finish) carried it forward under `seat: hmdnah` —
  `zayd`'s `OWES:` discharged. (2) **One rationale, four copies, all four now stale** — the reason
  `--continue` derives the admitted seat from `machine:` is written out at `agent-start.mjs` `~48`
  and `~499`, `seats.builderFor` (`seats.mjs` `~459`) and `tests/protocol/seats.test.ts` `~306`, and
  each says a gate on the baton "would admit the reviewer", true of `seat` and false of `builder`;
  step 1 flagged the first two. Measured scope limit, quantified: **1 of 8** live batons carries a
  `builder` row, so the next `--review` finish on the other seven stamps `builder: hmdnah` by the
  documented fallback — a false positive where there was a silence.
- **OWES:** `brahim` — two follow-ups, neither in this task's `done-when:`: an end-to-end test of
  `agent-finish.mjs`'s baton write (step 1 measured that one `package.json` with a no-op `verify`
  crosses `agent-finish.test.ts`'s stated fixture boundary, so it is closable, but it is a change to
  `zayd`'s harness with a 113-test blast radius); and the four stale rationale copies, which want one
  copy and three pointers per `AGENTS.md §7.2` rather than a fourth rewrite.
- **RISK:** additive
- **FULL:** `handoff/hmdnah/2026-08-17-T-016-review-step2.md`
- **REVIEW:** n/a — this IS step 2 of the review.

### T-016 — review (step 1, mechanical): the revert holds, and the fixture the `done-when:` names is reachable — 2026-08-17 — seat: hmdnah

- **CHANGED:** nothing in the diff — a step-1 review that edits the branch changes the thing step 2
  reviews. Findings posted as a PR comment on #33.
- **VERIFIED:** Item 1, twice. **Unit:** `resolveBuilder` → `return seat;`, both protocol suites
  re-run — **1 of 50 RED**, `expected 'hmdnah' to be 'zayd'` on "a review finish carries the PRIOR
  builder forward"; restored **50/50 green**. **Fixture, end to end** — the reproduction `done-when:`
  bullet 4 names: a real `--review` finish driven through to the baton write on a `makeFixture` repo
  (one added `package.json` with a no-op `verify` script clears step 1) writes **`builder: hmdnah`**
  with the fix reverted and **`builder: zayd`** with it in place, `seat: hmdnah` either way. Numbers
  re-measured, all matching: **95 files/907 tests**, `docs:check` **8 files/151 tests**,
  `freeze-boundary` **12/12**.
- **FOUND:** nothing that blocks. Three claims that do not hold as written (item 4): (1)
  `resolveBuilder`'s doc-comment and handoff §2/§5 say the baton write is "past what this repo's
  fixtures can reach" — it is reachable, so no committed test covers `agent-finish.mjs`'s baton write
  and bullet 4 rests on this review's re-execution alone; (2) `scripts/agent-start.mjs`'s file header
  and its `--continue` gate comment still justify deriving the builder by saying a `--review` finish
  rewrites the baton to name the reviewer — the condition this PR removes; (3) handoff §2's "renders
  identically to before" — a pre-T-016 baton gains a `builder` row, which the new test asserts.
  Measured scope limit: on a baton written before this merges there is no `builder` row, so the
  fallback names the reviewer — the field is trustworthy only on branches claimed after the merge.
  Item 7: no `needs-operator/*` label **and** the labeller ran (both CI jobs SUCCESS on the tip).
- **OWES:** `hmdnah` (a later session) — D88 step 2 on PR #33: items 2, 3, 6, reconciled against this
  report, and re-confirming CI and the `needs-operator/*` check before merging.
- **RISK:** additive
- **FULL:** `handoff/hmdnah/2026-08-17-T-016-review-step1.md`
- **REVIEW:** n/a — this IS step 1 of the review; step 2 (`hmdnah`, a separate session) approves and
  merges.

## §8 — Generated


<!-- BEGIN GENERATED — written by `pnpm state`. Never hand-edit. -->

| | |
| --- | --- |
| **newest entry** | **T-020 (hmdnah, 2026-08-18)** |
| branch · tip · tree | `main` · `4e4aadd` · clean |
| open PRs | none — main is the tip of the work |
| suite | **936 green** · 97 files · 287 suites |
| protocol | 22 live ops · 2 reserved (of 24 declared) |
| shipped source | 6 `BimObjectType`s in `@bunyan/types` · 43 command ids in `commands.ts` · 1 `FormatCodec` |
| schema | `SCENE_SCHEMA_VERSION` 2 |
| **frozen surface** | **RISK: additive** — unchanged vs baseline |
| diff vs origin/main | 1 file changed, 18 insertions(+), 1 deletion(-) (1 files) |
| docs budget | current_state 84.3/96.0 KB · §7 31.9/32.0 KB · abstracts 10/10 · bodies 73 |

_Generated 2026-08-19 by `pnpm state`._

<!-- END GENERATED -->
