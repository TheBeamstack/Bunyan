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
| seat | `amer` |
| builder | `amer` |
| role | builder |
| machine | pc |
| task | `T-001` |
| branch | `task/T-001-the-perpendicular-foot-snap-candidate` |
| claimed-at | 2026-08-28T18:46:25Z |
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


### T-001 — the perpendicular-foot snap candidate — 2026-08-28 — seat: amer

- **CHANGED:** nothing new this turn beyond the merge itself — the feature (`apps/web/src/tool/align.ts`'s
  `referenceEdges`/`perpendicularFeet`/`perpendicularCandidates`, wired into `Viewport.ts`/
  `ViewportCanvas.tsx`) was built and browser-verified in the 2026-08-17 session (`415b1c7`), which could
  not close because 5 `tests/protocol/*.test.ts` files failed to collect on this Windows pc. **Merged
  `origin/main` into this branch** (`5e1afbf`) to pick up T-020/T-021's fix for exactly that (PR #42): one
  conflict, in `current_state.md §0b`'s claim baton — resolved keeping HEAD's own live T-001 claim over
  `main`'s stale, already-closed T-021 baton. `handoff/amer/2026-08-28-T-001-perpendicular-foot-snap-candidate.md`
  NEW; this abstract.
- **VERIFIED:** `pnpm verify` **exit 0** on this pc, post-merge — typecheck/lint/format:check green, full
  **99 files / 974 tests** green (343.91s), `reseed:check` skipped (not a PR), `docs:check` (8 files/166
  tests) green (166.85s). `tests/freeze-boundary.test.ts` stayed green inside the run (19/19). Browser
  verification unchanged from the 2026-08-17 session (real OCCT kernel, real pointer events, Playwright
  against Chromium 148) — not re-run this turn, no browser-affecting code changed.
- **FOUND:** T-021's own `pnpm verify` fix (`seats.pnpmSpawn`, honoring `BUNYAN_PNPM_CMD`) still ENOENTs
  from `agent-finish.mjs` on this pc unless `BUNYAN_PNPM_CMD` is set for the session — this machine's only
  bare `pnpm` on `PATH` is a POSIX shebang script, unusable by `execFileSync` with no shell. Set it to
  T-021's own documented value (`["C:/Program Files/nodejs/node.exe", ".../corepack/dist/pnpm.js"]`); no
  code defect, a session-environment gap. Also saw `tests/protocol/agent-start.test.ts` and
  `seats.test.ts` each drop one test to a 30000ms timeout on a standalone `docs:check` run — both passed
  clean (166/166) on an immediate rerun and inside the full `verify` run: real subprocess latency under
  full-suite contention, exactly as `vitest.config.ts`'s own header already documents, not a regression.
- **OWES:** `brahim`/`zayd` — `agent-finish.mjs` needs `BUNYAN_PNPM_CMD` set by hand on this pc; worth a
  line in `Amer_Prompt.md` or `docs/RUNBOOK.md` so a fresh session doesn't rediscover it. Not fixed here
  per invariant 10, only recorded. Nothing owed to `khalihlna` beyond the standing PR review — every claim
  is executed and measured on this exact machine, no `unverified here:` marker.
- **RISK:** additive — `SnapKind` already declared `'perpendicular'`, so no frozen byte moved;
  `tests/freeze-boundary.test.ts` green (19/19).
- **FULL:** `handoff/amer/2026-08-28-T-001-perpendicular-foot-snap-candidate.md`
- **REVIEW:** ⚠ **AWAITING REVIEW — this is the open PR.**

### T-021 — `pnpm verify` reaches green on the pc, confirmed there — 2026-08-24 — seat: amer

- **CHANGED:** `tests/protocol/agent-start.test.ts` — the "an UNRESOLVABLE identity" test's `gh`-less
  PATH fixture symlinked a bare `node` (no extension); Windows PATH/PATHEXT search never matches an
  extension-less name even though the symlink is created successfully (direct repro), the same fact
  the file's header already documents for the `gh` stand-in — target renamed `node.exe` on `win32`.
  `vitest.config.ts` — `testTimeout: 30000`, `pool: 'forks'`, `maxWorkers: 2` (vitest 4 top-level;
  `poolOptions.forks.maxForks` is a DEPRECATED no-op under 4.1.10). ⚠ **Second defect, found only by
  actually running `agent-finish.mjs`:** its `execFileSync('pnpm', ['verify'], …)` cannot spawn `pnpm`
  on a machine whose only install is a `.cmd` shim — the identical `ghSpawn` class (`9a046e5`), one
  call site over. `scripts/seats.mjs` — **`pnpmSpawn` NEW**, mirroring `ghSpawn`, honoring
  `BUNYAN_PNPM_CMD` (plain path or `[nodeExePath, scriptPath]`); `scripts/seats.d.mts` gets its
  signature (the first named import of a spawn helper from a `.ts` file — `ghSpawn` never needed one);
  three unit tests in `tests/protocol/seats.test.ts`. `agent-finish.mjs`'s verify step now calls it.
  `handoff/amer/2026-08-24-T-021-pnpm-verify-green-on-pc.md` NEW; this abstract. No `packages/`, no
  `WATCHED` byte.
- **VERIFIED:** `pnpm verify` **exit 0** on this pc — typecheck/lint/format:check green, full **99
  files / 959 tests** green, `reseed:check` skipped (not a PR), `docs:check` (8 files/163 tests)
  green. The five `tests/protocol/*.test.ts` files collect and pass standalone (113 tests) and inside
  the full run. Measured before/after: default config left **18/33** of `agent-start.test.ts` alone
  timing out (real subprocess latency — no other file was running, so not cross-file contention);
  `--pool=forks --maxWorkers=2` alone (still 5000ms) matches the prior session's **4/33**; adding
  `testTimeout: 30000` reached **0/33**, twice.
- **FOUND:** ⚠ **T-021's `done-when:` revert-verification bullet, inherited from T-020, names the
  wrong target.** *"Restoring `^2.1.8` reproduces the `SyntaxError`"* does **not** hold: reverting only
  the vitest pin (shebang/gh-spawn fixes `2a79036`/`9a046e5` still in place) relinked to `2.1.9` and
  all 121 `tests/protocol` tests still passed — the vitest major was never the fix (2026-08-23 entry).
  What DOES reproduce it: reintroducing the shebang into `agent-start.mjs` on `2.1.9` — 1 file failed
  at collection, exit 1, identical error. Reverted immediately; pin restored to `^4.1.10`/`4.1.10`
  (`--frozen-lockfile`, confirmed via `npx vitest --version`) before the VERIFIED run. A spec defect in
  the task's own prose (`AGENTS.md §3`), recorded here rather than reworded into the published task
  text (invariant 10).
- **OWES:** `brahim` — T-021's revert-verification bullet still names the falsified target; not fixed
  here. Nothing owed to `khalihlna` — every claim was executed and measured on this exact machine.
- **RISK:** additive — none of the changed files is `WATCHED`, `tests/freeze-boundary.test.ts` stayed
  green (19/19) inside the full verify run, no `needs-operator/*`.
- **FULL:** `handoff/amer/2026-08-24-T-021-pnpm-verify-green-on-pc.md`
- **REVIEW:** pending — `khalihlna` (pc task, `AGENTS.md §1.2`).

### STEWARD-decompose-harness-defects — review: the rows are ready, and the reason given for the one split is not measured — 2026-08-23 — seat: hmdnah

- **CHANGED:** no row's status, machine, risk or `done-when:` — the decomposition is accepted as written.
  On the branch: **`origin/main` merged in** (the PR was 2 commits behind and protection is `strict`),
  picking up `2a79036` (shebang/import-hoist collection fix) and `76e4aa1` (T-021 falsified); the one
  conflict — both sides append a 2026-08-23 `## Discovered` row — resolved by **keeping both**. **F4's
  one-line fix** to T-025's `implements:`. **The two oldest abstracts rotated to `docs/history.md` §E**
  as a move (`T-024 — 2026-08-19 — hmdnah`, then `T-022 — 2026-08-21 — zayd`) — §7 stood at **32320 of
  32768** characters with 448 free and this abstract does not fit; one rotation left only 2 characters
  spare, which is not a margin. Now **28836**, 6 abstracts. `handoff/hmdnah/2026-08-23-STEWARD-decompose-harness-defects-review.md`
  NEW; this abstract; the reviewed entry's `REVIEW:` line rewritten. No `packages/`, no `scripts/`, no
  snapshot byte.
- **VERIFIED:** **Item 1, twice, docs-only form** — the diff moves no code. (A) `machine: **box**` removed
  from the new T-026 entry ⇒ `tests/protocol/seats.test.ts` **2 failed | 44 passed (46)**, both naming
  T-026 by id — `:407` *"has no machine:"* (`.toMatch()` got `undefined`) and `:401` *"T-026 is ready but
  no seat can claim it"*; restored **46/46**. (B) this diff's §7 abstract re-dated `2026-08-23` →
  `2026-08-21`, below the newer T-005 ⇒ `tests/docs-budget.test.ts` **1 failed | 22 passed (23)** at
  `:165`, *"T-005 (2026-08-22) is below STEWARD-decompose-harness-defects (2026-08-21)"*; restored
  **23/23**. **Both VERIFIED claims reproduce:** `docs:check` **163 passed** (8 files), and again **163**
  after my merge and fix; `seats.mjs ready-for zayd` → **`T-026 T-025 T-028 T-027`**, that order, exit 0.
  **Evidence audited, all real:** PR #38 carries `needs-operator/freeze` + `review/step-1` and two
  `narutousomaki741` reviews (the twice); PR #39's author is `Davidian-Abdo`, which *is* the box `gh`
  default, so T-026's premise holds; the three stranded finishes have artifacts
  (`2026-08-19-T-024-review-step2b-rerun.md`, `2026-08-21-T-022-review-step{1,2}.md`). **28** `### T-nnn`
  sections = **28** table rows, no duplicate id, T-025–T-028 fresh above T-024. **Item 7 on the tip:**
  `reserved-classes.mjs` → *"none — RISK: additive"*, no `needs-operator/*`, and the labeller **ran** —
  `PR shape · reserved classes` SUCCESS `11:15:39Z`, `typecheck · lint · geometry harness` SUCCESS
  `11:15:24Z` on `0f66aac`, re-confirmed on the merged tip.
- **FOUND:** **F1 — the T-026/T-025 split is right; its stated reason is not measured.** Both the abstract
  and the body assert *"one row carrying both cannot reach green in a turn"* as fact. Measured:
  `reviewFlipsToDone` (`seats.mjs:286`) is **four lines**; `identityGate` (`agent-start.mjs:155`) **already
  exists and is already exported**, so T-026 wires an existing function into a second call site rather than
  authoring a gate; and **both fixes land in the same `if`/`else` block, `agent-finish.mjs:572–592`**, with
  the `reserved-classes.mjs` import (absent today) shared rather than doubled. Two `risk: high` rows also
  buy **four** review turns where one buys two, in a batch that just lost three to stranded finishes.
  Not blocking — splitting when unsure is the direction `AGENTS.md §6` prefers and I cannot prove a combined row
  *would* go green without building it. **F2 — T-027's `verify:` cannot discharge its own `done-when:`.**
  `grep -rn "memory=2g" tests/ scripts/` is **empty**, so `pnpm verify` is green before the edit, after it,
  and if it writes the wrong number; T-027 is also the only row of the four with **no `revert-verified:`
  item**, so its reviewer arrives with no claim to re-execute under a mandatory `REVIEW.md` item 1. **F3 —
  T-028's `revert-verified:` needs a seam the row does not name.** `agent-finish.mjs:211` hardcodes
  `execFileSync('pnpm', ['verify'])`; the fixture's `` verify: `echo ok` `` is not what step 1 runs; **all
  17** `agent-finish.test.ts` tests assert refusals that fire *before* step 1, so step 1 has zero coverage
  and "kill a fixture mid-verify" is not expressible until an injection seam exists. Criterion 9 went
  unanalysed on the one row that needed it. **F4 — fixed on the branch:** T-025's `implements:` cited a
  `## Discovered` entry of **2026-08-21** that does not exist (all seven rows of that date are other
  defects); the second firing is **2026-08-20**, a ⚠ amendment inside the 2026-08-19 row. **`AGENTS.md §3`
  is not violated:** the rule binds *claiming*, `ready` is by definition unclaimed, the steward never
  builds, and decomposition **inserts** the independent party the rule wants rather than bypassing it —
  this review is that party, and F2/F3 are its output. **The `ready`-vs-*"no builder starts"* tension is
  not a defect either:** `docs/prompts/brahim-orchestrator.md` §4b binds the **orchestrator's subagents**,
  not the row status, and the loop is stopped.
- **OWES:** `brahim` — **F1, F2, F3** as `## Discovered` rows or as edits to the three rows before a
  builder claims them; and the **five-versus-four** count (the headline says five measured defects, four
  rows landed, one of them from a row written this turn, so three of the five became tasks — which two were
  left, and why, is unstated, and the ledger holds more than five undecomposed harness defects). Whoever
  claims **T-028** — expect to add the verify-command seam first (F3). Whoever claims **T-027** — decide
  what discharges item 1 there (F2). Nothing owed to a `pc` seat: every measurement in this review is
  headless and was executed here, so there is no `unverified here:` for `khalihlna`.
- **RISK:** additive — a review turn moved no declaration; `pnpm state` re-derives `RISK: additive`,
  frozen surface unchanged vs baseline.
- **FULL:** `handoff/hmdnah/2026-08-23-STEWARD-decompose-harness-defects-review.md`
- **REVIEW:** n/a — this IS the review turn (`AGENTS.md §1.2`), one turn because a steward PR carries no
  `risk: high` row. ✅ **APPROVED and MERGED** on `narutousomaki741`, which is not `davidian-abdo` that
  opened it. ⚠ Could not verify here: `gh api …/branches/main/protection` returns **404** on this seat's
  token (push-level, no admin read), so `docs/RUNBOOK.md`'s protection block is unconfirmed from this seat;
  the branch was merged up to `main` regardless, so `strict` is satisfied either way.

### STEWARD-decompose-harness-defects — the box ran out of work with five measured defects unclaimed — 2026-08-23 — seat: brahim

- **CHANGED:** `docs/BACKLOG.md` — **T-025 to T-028 NEW** (four `ready` `infra`/`box` rows), T-006
  promoted `blocked` → `ready` in the same sweep that closed T-005, and one `## Discovered` row for the
  stranded-finish defect T-028 implements. `handoff/brahim/2026-08-23-STEWARD-decompose-harness-defects.md`
  NEW; this abstract. No `packages/`, no `scripts/`, no snapshot byte, no code.
- **VERIFIED:** `docs:check` **163 passed** (8 files) after the decomposition, so every new row satisfies
  the protocol tests that read this file. `seats.mjs ready-for zayd` → **`T-026 T-025 T-028 T-027`**,
  which is both the intended sequence and proof the rows are claimable by the box builder. Every `box`
  row in the table read `done` before this turn and all eight `ready` rows were `pc` — the condition
  that made the box idle.
- **FOUND:** **The three stranded finishes had never been recorded.** `agent-finish.mjs` runs `pnpm verify`
  in full, and a session ending inside it leaves the branch committed-but-unpushed or the tree
  written-but-uncommitted, after which `agent-start.mjs` refuses at its own `git checkout main` with only
  *"pull failed — resolve by hand"*. Three in one batch — T-024 step 2, T-022 step 1 (where the absent
  `review/step-1` label would have made the next session re-run step 1, since that label is what
  `resolveReviewStep` reads), and T-022 step 2. Each was repaired conversationally and would have left no
  trace. ⚠ **T-026 and T-025 are one failure at two altitudes and are deliberately separate rows:** T-025
  is a class-resolution bug inside `reviewFlipsToDone`, T-026 adds a gate where none exists, and one row
  carrying both cannot reach green in a turn (READY criterion 9).
- **OWES:** The **owner** — this PR's merge decision, and **Q22**/**Q23**, both still unruled and neither
  invented here. ⚠ **No builder starts on T-025–T-028 until the owner says so** (the orchestrator's
  phase-boundary rule). The **pc machine** — eight `ready` rows including **T-023**, which is the only
  place T-022's fix can be proven to fix anything; `light_brahim` is not running.
- **RISK:** additive — no declaration moved, no code, no snapshot byte.
- **FULL:** `handoff/brahim/2026-08-23-STEWARD-decompose-harness-defects.md`
- **REVIEW:** ✅ `hmdnah`, one turn (a steward PR is not `risk: high`) — **APPROVED and MERGED** on
  `narutousomaki741`. Item 1 re-executed twice in the docs-only form: T-026's `machine:` removed ⇒
  `seats.test.ts` **2 failed | 44 passed**, both naming T-026; this abstract's heading re-dated to
  2026-08-21 ⇒ `docs-budget.test.ts` **1 failed | 22 passed** on newest-first; both restored green.
  Both VERIFIED claims reproduce (`docs:check` **163**, `ready-for zayd` → `T-026 T-025 T-028 T-027`).
  Four findings, none red — **F4 fixed on the branch** (T-025 cited a `## Discovered` entry of
  2026-08-21 that does not exist; the second firing is 2026-08-20, inside the 2026-08-19 row).

### T-005 — review: the sweep's lens was narrower than the rule it swept for — 2026-08-22 — seat: hmdnah

- **CHANGED:** one test fix and two documentation files on the branch, **no product code**:
  `tests/d66-lazy-build-measure.test.ts` — an explicit **`120_000`** timeout on the §3c case, which this
  PR turned into a whole-model build while leaving it on the 5 s default; `open_rulings.md` — **Q23 NEW**
  (does `agent.query`'s part-scoped filter FORCE, DECLARE, or stay recipe-only?), with a recommendation and
  a price; `docs/design/P5_step9_D66_lazy_build_design.md` §3c — one paragraph recording that the ruling
  table is **not the whole set**, pointing at Q23, because the doc otherwise reads *"§3c is BUILT"* and
  **T-006 is built next against it**. `handoff/hmdnah/2026-08-22-T-005-review.md` NEW; `zayd`'s `REVIEW:`
  line above. **PR #40 APPROVED and MERGED** on `narutousomaki741`.
- **VERIFIED:** ⚠⚠ **TWO OF THE FIVE REVERTS RE-EXECUTED HERE, not inherited.** Baseline
  `tests/d66-force-declare.test.ts` **8 passed**. `enumerate.ts` back to `'failed'`/`'unbuildable'` ⇒
  **1 failed | 7 passed**, `expected 'failed' to be 'stale'`; FORCE out of `projectQuantities` ⇒
  **2 failed | 6 passed**, `expected [ …(2) ] to deeply equal []` on the deferred set. Both reproduce the
  entry's counts and messages exactly; restored, green. **Sweep re-enumerated independently** over
  `packages`+`apps` — the seven `.state`/`.failure` readers are real and there is no eighth, and
  **`apps/web` holds no consumer of `modelElements` or of the four aggregates**, so the "no browser debt"
  claim is checked, not taken. `rebuildOnly` passes `rejectOnFailure = false` ⇒ **FORCE cannot turn a
  read-only aggregate into a D42 rejection**, the one failure mode that would have made every take-off
  throw. `WATCHED` holds none of the four changed files; `PR shape · reserved classes` **ran and passed**
  with **zero** labels, which is what separates *"no label"* from *"the labeller never executed"*.
  ⚠⚠ **AND `pnpm verify` GREEN ON THE BOX WAS NOT GREEN CI — THIS PR IS WHERE THE TWO DISAGREED.** The
  first push went red on the self-hosted runner: `d66-lazy-build-measure.test.ts`'s §3c case
  **`Test timed out in 5000ms`**, `1 failed | 958 passed`. Cause is this PR's own change — the turn
  rewrote that case (its §8) so it calls `projectQuantities()`, which after this same PR **FORCES a
  whole-model rebuild**, turning a pure read into real OCCT work on the 5 s default while the file's own
  `beforeAll` already carries `900_000`. **Measured both sides: 3892 ms on this box, over 5000 ms on the
  runner** — a one-second margin, so the machine decided the verdict and the author could not have seen
  it. Fixed on the branch with an explicit `120_000` and a comment saying it builds. ⚠ The PR's own new
  `tests/d66-force-declare.test.ts` is unaffected — small fixture, passed on the runner in the same job.
- **FOUND:** ⚠⚠ **§3c BINDS AN AGGREGATE THE SWEEP'S LENS COULD NOT SEE.** The sweep enumerated readers of
  `ModelElement.state`/`.failure`; §3c binds *every aggregate that quantifies over the model*, and the two
  sets differ by `agent.query`. `QueryFilter.discipline`/`.materialId` are **PART-scoped (D45)**, so they
  read `partsOf()` — empty on a deferred element. Measured on a one-wall document:
  `query({discipline:'structural'})` returns **1 row built, 0 rows deferred**, while the same element is
  present in an unfiltered `query()` wearing `state: 'stale'`. Same shortfall this PR fixes for the other
  five, on the consumer least able to notice it — but **not a regression**, identical before and after, so
  it is filed (Q23) and not blocked. ⚠ Left unfixed deliberately: FORCE inverts the surface's documented
  *"reads the RECIPE — no kernel op"* cost contract and a declaration channel changes an `AgentSurface`
  shape, both design calls on a layer the reviewer does not own. ⚠ **One claim narrower than stated:**
  *"`saveBnn` reaches no built state"* holds of its signature, but `scene.brokenRefs` **is** a build output
  `#commit` writes into the Scene and `saveBnn` persists — so a partial document saves a shorter
  `brokenRefs`. `NEITHER` stays the right ruling; the argument for it is *"the one built field it reaches
  is re-derived on load by `rebuildAll`"*, not *"it reaches none"*.
- **OWES:** **owner** — `open_rulings.md` **Q23**, unblocking nothing but freezing with `AgentSurface` at
  P5. **`brahim`** — `zayd`'s two `## Discovered` rows are unchanged and still unclaimed. **Nothing to a
  `pc` seat:** every claim here is document-layer and headless, so this review inherits and creates no
  `unverified here:` debt.
- **RISK:** additive — `pnpm state` verdict matches the diff, `freeze-boundary` green,
  `tests/frozen-surface.snapshot.json` untouched, `SCENE_SCHEMA_VERSION` 2, no `needs-operator/*` ⇒ the
  reviewer merges (`AGENTS.md §5`).
- **FULL:** `handoff/hmdnah/2026-08-22-T-005-review.md`
- **REVIEW:** n/a — this IS the review turn.

### T-005 — D66 §3c: DECLARE was never available to an enumerating aggregate, so all four FORCE — 2026-08-22 — seat: zayd

- **CHANGED:** `packages/document/src/enumerate.ts` — a never-built element is **`stale` with no
  `failure`**, not `failed`/`unbuildable`; **`deferredElements(scene, geometryOf, ids?)` NEW** (the FORCE
  set, one function so four call sites cannot each derive it differently); `ModelElement.state` widens by
  the one member `ElementGeometry['state']` structurally cannot carry. `document.ts` — private
  `#forceBuild()`, called by `projectQuantities`, `evaluateSchedule` and `projectView`. `cleandelta.ts` —
  the same force **bounded to the delta**, via the public `rebuildOnly`, so **no public API was added**.
  `bnn.ts` — one sentence recording that `saveBnn` needs neither. `tests/d66-force-declare.test.ts` **NEW**
  (**+8**); `tests/d66-lazy-build-measure.test.ts`'s §3c case rewritten and moved last, since it asserted
  the behaviour this turn removes; `docs/design/P5_step9_D66_lazy_build_design.md` §3c carries the ruling;
  two `## Discovered` rows. No frozen byte — none of the four files is in `WATCHED`, `SCENE_SCHEMA_VERSION`
  stays 2.
- **VERIFIED:** `pnpm verify` green, all six gates; suite **959 green · 99 files**. **Revert-verified five
  times, one per changed line, each restored:** `enumerate.ts` back to `'unbuildable'` ⇒ **1 failed | 7
  passed** (`expected 'failed' to be 'stale'`); FORCE out of `projectQuantities` ⇒ **2 failed | 6 passed**
  (`row for row: expected 3 to be 16`); out of `evaluateSchedule` ⇒ **1 failed** (`[] vs [ …(6) ]`); out of
  `projectView` ⇒ **1 failed** (`[ …(2) ] vs [ …(8) ]`); out of the Clean Delta ⇒ **1 failed**
  (`[ Array(1) ] vs [ …(17) ]`); restored **8 passed**. ⚠ The `enumerate.ts` revert bites because §1 puts a
  deferred element and a genuinely refused one (D43's unknown type) in **one document**, so the revert
  collapses them onto each other rather than changing a string. **FORCE is a build, not an edit** (rule
  17): journal, undo stack and `revision` all unchanged after a take-off — asserted.
- **FOUND:** ⚠⚠ **THE CHOICE WAS NOT A CHOICE — DECLARE WAS NEVER AVAILABLE TO AN ENUMERATING AGGREGATE.**
  A declaration can only name what it can see, and a **deferred parent's D59 children are not enumerated
  at all**: deriving children IS the build, so an unbuilt curtain wall yields **0 panel rows against a
  full document's 6**, with nothing left to declare them by. The design doc offered FORCE and DECLARE as
  two live options per aggregate; measured, only `save` — which reaches no built state — has a second
  option. ⇒ `projectQuantities`/`evaluateSchedule`/`projectView` FORCE the whole model, the Clean Delta
  FORCEs bounded to the delta (owner ruling Q2's scope, symmetric with its prior rebuild), `saveBnn`
  neither. ⚠ **The two roads into the document already disagreed:** `agent.ts:151` answered `'stale'` for
  the same element `enumerate.ts` called `unbuildable`, and the enumeration was the wrong one. ⚠ **The
  backward sweep counted rather than sampled** — seven readers of `.state`/`.failure`, five now FORCE,
  `unbuildable()` reads the geometry map and was already right, `QueryGateway` is unrelated; nothing
  switches on the union, so widening it breaks no exhaustive check. ⚠ **One site swept and NOT fixed:**
  `ModelElement.hasParts` is `false` on a `stale` element for the same reason it is on a pure void, so the
  field alone cannot separate *"nothing to measure"* from *"not measured yet"* — unreachable today because
  every consumer reads `state` first, which is a convention and not a guarantee (`§1c-8`). Documented on
  the field and filed.
- **OWES:** **`brahim`** — two `## Discovered` rows, unclaimed: `hasParts` needing `state` read first, and
  that FORCE is whole-model where only the composite parents need it (pure optimisation, unmeasured, named
  in the design doc as not built). **T-006** (D66 §3a/§3b, `machine: pc`) is what this unblocks — its
  `depends-on: T-005` is now satisfiable. **Nothing is owed to a `pc` seat**: every aggregate here is
  document-layer, every measurement is headless and was executed here, so this turn creates no
  `unverified here:` debt.
- **RISK:** additive — `freeze-boundary` green, none of `enumerate.ts`/`document.ts`/`cleandelta.ts`/
  `bnn.ts` is in `WATCHED`, `tests/frozen-surface.snapshot.json` untouched ⇒ no `needs-operator/*`.
- **FULL:** `handoff/zayd/2026-08-22-T-005-force-on-measure.md`
- **REVIEW:** **APPROVED and MERGED** by `hmdnah` on `narutousomaki741` (PR #40, 2026-08-22) — `RISK: additive`, `PR shape` green with no `needs-operator/*` label. Two of the five reverts re-executed independently, both reproducing the quoted red. ⚠ One completeness gap filed rather than blocked: `open_rulings.md` **Q23**.

### T-022 — review (step 2, adversarial): the pin re-linked here byte-for-byte, and the branch's own new gate entry had no test — 2026-08-21 — seat: hmdnah

- **CHANGED:** one commit on the branch, `c4c0e9f` — `tests/reseed-gate.test.ts` gains
  `expect(geometry('tools/kernel-build/postlink.mjs')).toBe(true)`; `handoff/hmdnah/2026-08-21-T-022-review-step2.md` NEW; this abstract; `zayd`'s `REVIEW:` line below.
  ⚠ **T-024's step-2 adversarial abstract rotated to `docs/history.md` §E as a move, body left in
  `handoff/`** — §7 stood at 32755 of 32768 bytes once this abstract landed, 13 bytes of headroom; 25841
  after. **PR #39 APPROVED and MERGED** on `narutousomaki741` — `risk: high` is not owner-gated
  (`AGENTS.md §5`), so step 2 merges.
- **VERIFIED:** ⚠⚠ **THE PIN WAS RE-EXECUTED HERE, which step 1 could not do.** Step 1 deferred the relink
  on `--memory=2g` against 1024 MB free; the box is quiet (load 0.46) and the run was **made safe instead of
  skipped** — a hard **1 GB** cgroup cap, container swap off, so the cgroup kills before the host OOM killer
  can reach §6a's live sites. **It fitted: 78 s, exit 0**, and `cmp` says the freshly linked
  `bunyan-kernel.wasm` (`f34fef31…`) and glue (`4e5508df…`) are **byte-identical to the committed pair**.
  Applying `postlink.mjs`'s inverse to the *freshly linked* glue gives **`044baac6…`** ⇒ **the linker
  really does emit it**, which step 1 explicitly could not conclude. Host: available 1482→1460 MB, nothing
  paused. ⚠ **The recipe's 2 GB cap is measured too high — the link fits in 1 GB**, the difference between a
  run a box seat can take and one it defers. **Item 6:** the three text assertions attacked, not read —
  a shared view written **without the token `subarray`** (`decode(new Uint8Array(heapOrArray.buffer,…))`)
  is still caught, because assertion 3 demands an affirmative `.slice(` and the emitted trailing text has
  none; `postlink.mjs` re-applied printed `found 0` and **exited 1**. `slice` read against both call sites:
  the four TTY callers pass a plain `Array`, and emscripten's own `heapOrArray.buffer` guard makes the copy
  path unreachable from there. **Item 3:** the invalidator is clean **and checked** (D77) — `toolchainId()`
  is compiled into an unchanged `.wasm`, and cached B-Rep text does cross the patched decode, but `slice`
  copies the bytes `subarray` viewed, so no cached geometry can shift; bumping `OCCT_BUILD_ID` would
  wrongly invalidate every `.bnn` in the field. Re-seed gate `OK`, goldens diff **one line**.
- **FOUND:** **F4 — the branch's own new rule had no enforcement, and it is FIXED here.** `postlink.mjs`
  joined `GEOMETRY_PATHS` correctly, but `tests/reseed-gate.test.ts` — the file that exists to pin that
  list, naming `kernel.cpp`/`configure.sh`/`link.sh`/`toolchain.json` true and `verify.mjs`/`probe-history.mjs`
  false — was not touched. A **fifth recipe member with no assertion**, sitting on the exact `.mjs`
  boundary Entry 74 bought. Revert-verified: delete the `GEOMETRY_PATHS` line and the new assertion is the
  **only** failure (`1 failed | 13 passed`) — nothing was watching it. `§1c`: *a clean rule with no
  enforcement is a dirty rule that has not happened yet.* **Item 2 otherwise clean, swept not accepted:**
  `crypto.getRandomValues` traced to `new Uint8Array(1024)`, the 9 `subarray` sites all MEMFS-internal,
  **one** glue tracked and the test reads the file `kernel.ts` imports, and every artifact-claiming site
  (`README`/`NOTICE`/`toolchain.json`/`link.sh`) consistent with the committed hashes.
  ⚠ **F1 does NOT leave a criterion unexecuted:** the `done-when:` list asserts against **the artifact** and
  its own sixth item disclaims a browser boot, so all seven are discharged on box. F1 changes what **T-023**
  is worth, not what T-022 owed.
- **OWES:** **`khalihlna`/`amer` (T-023)** — `unverified here: the kernel boots on Chrome 151 with this
  artifact`, correctly recorded in `zayd`'s §9/OWES and the only thing that will ever observe the bug gone.
  **`brahim`** — flip T-023 to `ready`; a `## Discovered` row that the shipped artifact now has a patch
  step, and that `§6`'s relink cap is measured at 1 GB rather than 2 GB. ⚠ **F1's documentation ask is
  discharged by the record and must not be discharged any other way** — invariant 10 forbids editing
  `zayd`'s handoff §7, and step 1's abstract is the correction.
- **RISK:** additive — `freeze-boundary` 19, `SCENE_SCHEMA_VERSION` still 2; no `needs-operator/*` and the
  labeller demonstrably ran.
- **FULL:** `handoff/hmdnah/2026-08-21-T-022-review-step2.md`
- **REVIEW:** step 2 of 2 (D88) — **APPROVED and MERGED** by `hmdnah` on `narutousomaki741`. Report on PR #39.

## §8 — Generated


<!-- BEGIN GENERATED — written by `pnpm state`. Never hand-edit. -->

| | |
| --- | --- |
| **newest entry** | **T-001 (amer, 2026-08-28)** |
| branch · tip · tree | `task/T-001-the-perpendicular-foot-snap-candidate` · `29e5aca` · clean |
| open PRs | none — main is the tip of the work |
| suite | **974 green** · 99 files · 297 suites |
| protocol | 22 live ops · 2 reserved (of 24 declared) |
| shipped source | 6 `BimObjectType`s in `@bunyan/types` · 43 command ids in `commands.ts` · 1 `FormatCodec` |
| schema | `SCENE_SCHEMA_VERSION` 2 |
| **frozen surface** | **RISK: additive** — unchanged vs baseline |
| diff vs origin/main | 7 files changed, 522 insertions(+), 53 deletions(-) (7 files) |
| docs budget | current_state 82.8/96.0 KB · §7 30.5/32.0 KB · abstracts 7/10 · bodies 87 |

_Generated 2026-08-29 by `pnpm state`._

<!-- END GENERATED -->
