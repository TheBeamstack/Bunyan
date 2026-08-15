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
| seat | `brahim` |
| role | steward |
| machine | box |
| task | `STEWARD-two-step-high-risk-review` |
| branch | `brahim/2026-08-15-two-step-high-risk-review` |
| claimed-at | 2026-08-15T09:38:01Z |
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

### STEWARD-two-step-high-risk-review — review: D88 is sound, and two orchestrator files still called `risk: high` owner-gated — 2026-08-15 — seat: hmdnah

- **CHANGED:** `docs/prompts/light-brahim-orchestrator.md` §4 and `## Never` — the pc twin of the §4c
  this PR rewrote, unswept, still sending every `risk: high` PR to the operator ·
  `docs/prompts/brahim-orchestrator.md`'s header, which contradicted its own §4c · `docs/BACKLOG.md`
  `## Discovered` (two findings) · §7 order (the new abstract was not prepended, so §8's `newest entry`
  named `T-007`).
- **VERIFIED:** `pnpm verify` green. `scripts/reserved-classes.mjs` labels the three owner-gated classes
  and never reads a task's `risk:`, so `AGENTS.md §5`'s new sentence matches the labeller; `pr-shape`
  ran here and applied no `needs-operator/*` label.
- **FOUND:** Two steps D88 describes that the scripts refuse — a builder cannot re-enter a row left at
  `review` (`agent-start.mjs` takes `ready` rows only, and a `finished` claim is not resumable), and the
  `NEXT TURN: REVIEW ONLY` banner cannot route step 2 because it is written on the branch and read from
  `main`. ⚠ Neither is covered by `T-014`, whose `done-when:` items are all on the `--review` path.
- **OWES:** `brahim` — the two `## Discovered` findings, and `T-014`'s second `done-when:`, whose premise
  is false. `hmdnah` — T-008 step 2, once its fix lands.
- **RISK:** additive
- **FULL:** `handoff/hmdnah/2026-08-15-STEWARD-two-step-high-risk-review-review.md`
- **REVIEW:** this is the review — **APPROVED and MERGED**, `RISK: additive`, on `narutousomaki741`.

### STEWARD-two-step-high-risk-review — `risk: high` takes two review turns, not the owner's merge — 2026-08-15 — seat: brahim

- **CHANGED:** `docs/decisions.md` (**D88** NEW) · `AGENTS.md` §1.2 (the rule) and §5 (`risk: high` named
  as not owner-gated) · `REVIEW.md` (a `Two steps` section; item 7 warns that only step 2 merges) ·
  `docs/prompts/brahim-orchestrator.md` §4c (`contract-touching` still stops the loop, `risk: high` no
  longer does) · `docs/BACKLOG.md` (READY criterion 8; **T-014** NEW). No `packages/`, no `apps/web`, no
  script or test touched.
- **VERIFIED:** `pnpm verify` green. `AGENTS.md` held at its 200-line cap by turning the §1.3 loop
  paragraph and the §2 abstract-heading note into pointers — both already said it in full in
  `docs/prompts/*` and D82.
- **FOUND:** Three files gave three answers about what `risk: high` meant — `agent-finish.mjs` wrote
  `NEXT TURN: REVIEW ONLY`, the orchestrator treated it as owner-gated, and `AGENTS.md §5`, which defines
  owner-gated, never listed it. ⚠ **A cross-account second reviewer does not exist for a box builder PR:**
  `zayd` opens on `davidian-abdo` and `khalihlna` holds that same account, so GitHub refuses its approval
  — the two steps are therefore the same seat in separate sessions, and independence comes from the
  session boundary. The owner declined rearranging seat accounts to buy a second approver.
- **OWES:** `zayd` — **T-014** (`--review` reads the frozen surface and never the task's `risk:`, so it
  stamps a `risk: high` row `done` after step 1; measured on T-008), and the two T-008 review defects,
  which go back to the existing claim on that branch rather than a new row. `hmdnah` — T-008 step 2,
  after the fix. The `## Discovered` entry recording the `--review` defect is on the T-008 branch and is
  closed there, not here.
- **RISK:** additive
- **FULL:** `handoff/brahim/2026-08-15-STEWARD-two-step-high-risk-review.md`
- **REVIEW:** **Reviewed by `hmdnah` (2026-08-15, PR #24) — APPROVED and MERGED**, `RISK: additive`, two
  unswept documents fixed on the branch. The entry above is the record.

### T-007 — a dangling `designOptionId` is a broken reference, derived rather than stored — 2026-08-15 — seat: zayd

- **CHANGED:** `packages/document/src/document.ts` (**`danglingDesignOptionRefs` NEW**; `brokenRefs()`
  returns the stored geometry-derived list plus it) · `packages/document/src/designoptions.ts` (comments
  only — `ownTagActive` and the file header name the body instead of promising it) ·
  `tests/design-option-refs.test.ts` (**§4 NEW, +3**) · `tests/option-cascade-d67.test.ts` and
  `tests/model-enumeration.test.ts` (one fixture assertion each, §6 below) · **Entry 82 rotated** to
  `docs/history.md` §C, which is now contiguous over 54–84. No frozen byte, no verb, no schema bump.
- **VERIFIED:** **836 green** across 94 files, all six gates, real exit code 0, real OCCT throughout;
  `freeze-boundary` green ⇒ the frozen surface has not moved. **Revert-verified**: return `brokenRefs()`
  to `this.#scene.brokenRefs` and `design-option-refs` goes **2 RED** — `expected [] to have a length of
  1 but got +0`, which is the silence itself.
- **FOUND:** ⚠ **It is derived at the query, not staged into `scene.brokenRefs`.** `#stage` re-derives
  that field only for the assemblies it rebuilds, so an entry staged there goes stale on every element
  whose assembly the next partial rebuild does not touch — D74's defect in a population whose subject is
  not even a rebuild root. A dangling tag is a pure fact about `scene.elements`, so reading it is cheaper
  than teaching the staging filter to tell two producers apart, and D74's one-producer invariant on
  `scene.brokenRefs` stays intact. ⚠ `hostId` is the element's own id: the reference is hosted on
  nothing, and widening the watched `interface BrokenReference` would make a diagnostic field
  contract-touching — no consumer reads it. ⚠⚠ **The backward sweep (invariant 7) cost six tests in two
  files, all one shape:** `option-cascade-d67` and `model-enumeration` tag elements and supply the
  catalogue as a consumer OVERRIDE, which is the only road while `scene.designOptions` has no authoring
  verb, and both assert `brokenRefs()` empty to mean *"no window lost its host face"*. Each now filters
  the option ids instead. ⇒ **until the catalogue CRUD lands (D85, T-011), every tagged element on this
  product is a broken reference** — D86 reporting the truth, not a false positive.
- **OWES:** `hmdnah` — this PR; the revert above is the one to re-execute. `amer` — ⚠ `App.tsx`'s
  Problems panel hints *"these elements are hosted on a sub-shape that no longer resolves. Retarget them
  manually"*, which is now wrong for an option entry: it is hosted on nothing and
  `core.retargetReference` cannot heal it. `unverified here: how the panel reads with an option entry in
  it — khalihlna to confirm`. `brahim` — D86's row still reads ✅ RULED and this builds it; T-008's (c)
  half extends this union rather than adding a second surfacing path.
- **RISK:** additive
- **FULL:** `handoff/zayd/2026-08-15-T-007-dangling-design-option-ref.md`
- **REVIEW:** **Reviewed by `hmdnah` (2026-08-15, PR #22) — APPROVED and MERGED**, `RISK: additive`, on
  `narutousomaki741` — the account that did not open it. Item 1 re-executed twice (2 RED both times); the
  six-test sweep re-executed and its filter proven to hide nothing. One contract-doc fix on the branch;
  no defect found in the code. The entry above is the record.

### T-007 — review: the derivation is right, and domain rule 3's text had not been widened to admit it — 2026-08-15 — seat: hmdnah

- **CHANGED:** `docs/contracts/core_logic.md` — domain rule 3 gains the second broken-reference class ·
  **Entry 85 rotated** to `docs/history.md` §C, now contiguous over 54–85. The code is merged as authored.
- **VERIFIED:** `pnpm verify` green, **836 across 94 files**, real exit code 0. Item 1 re-executed twice:
  `brokenRefs()` returned to `this.#scene.brokenRefs` is **2 RED** (`expected [] to have a length of 1 but
  got +0`), restored **8/8 green**. The sweep re-executed: both files' original `toHaveLength(0)` gives
  **6 failed | 25 passed**, and printing the lists shows exactly the two tagged walls per fixture and no
  masked host-face entry. `brokenRefs()` timed on a hand-assembled 10,000-element scene: **3.288 ms/call
  with one tag, 3.822 ms/call with all 10,000** — one call site, in a `useMemo` keyed on document version.
- **FOUND:** ⚠⚠ **The new broken reference is not retargetable by any verb** — `core.createElement` is the
  only writer of `designOptionId` — which is what rule 3's own D74 note forbids (*"a refusal nobody can act
  on … a lie about the model's state"*). It survives that test only because it is **derived and never
  stored**: it enters no `.bnn` and clears the moment the option resolves, so deriving at the query is
  load-bearing for rule 3 and not only for staleness. The contract recorded one class and the code now
  ships two, so rule 3 gained the sentence (`AGENTS.md §3` row 1). ⚠ Staging it instead would have gone
  stale exactly as claimed: `#stage` keeps any entry whose element's assembly is not a rebuild root, so a
  wall's entry would outlive the `core.createDesignOption` that resolves its tag.
- **OWES:** `amer` — the `App.tsx` Problems-panel hint the entry above already names;
  `unverified here: how the panel reads with an option entry in it — khalihlna to confirm`. `brahim` —
  T-008 is now the next box row, and D86's *"build them together"* note means its (c) half extends this
  union rather than opening a second surfacing path.
- **RISK:** additive
- **FULL:** `handoff/hmdnah/2026-08-15-T-007-review.md`
- **REVIEW:** n/a — this IS the review turn (`AGENTS.md §1.2`); the verdict is on the entry above.

### T-004 — review: the flatness result holds, and the harness passed while building nothing — 2026-08-15 — seat: hmdnah

- **CHANGED:** `tests/document-build-cost-scale.test.ts` — the cold load's built solids are counted and
  required to equal the authored count. `scripts/agent-finish.mjs` — `setRowStatus` hoisted, exported and
  **repadded** (+ `scripts/agent-finish.d.mts` NEW, + a case in `tests/protocol/agent-finish.test.ts`).
  `§1a` + the T-004 body — the smallest-model deviation's direction.
- **VERIFIED:** `REVIEW.md` item 1, twice. **(a)** Removing `cold.rebuildAll()` went RED only at
  `expect(fit.slope).toBeGreaterThan(0)` — `-0.0000015`, a coin flip on noise; with the count asserted it
  is RED in 2.9 s naming `scale 1: solids built by the cold load: expected +0 to be 62`, green restored
  in 58.4 s. **(b)** Reverting the repad turned `agent-finish.test.ts` RED on `| T-001 | review   |`, the
  byte CI rejected. Harness re-run twice: **43.45** and **41.93 ms/element**, **7.24** and **6.99 min**
  projected.
- **FOUND:** The verdict stands — flat across 39–273 elements, ~7 min at 10,000 — but two claims under it
  did not. ⚠⚠ **The harness could not tell a cold load that built the whole building from one that built
  nothing:** `geometryOf(id)?.state` is `undefined` for an element never built and `undefined !==
  'failed'`, and `brokenRefs()` returns a **stored scene field** rather than a re-derivation, so both
  passed on an empty measurement. ⚠ `§1a`'s _"smallest model prices ~5% **high**"_ is backwards — 39
  elements price 38.8–39.6 ms/el against 41.8–44.0 at the larger sizes in all four runs, so the marginals
  **fall** with size and the warmup cause predicts the opposite sign. Neither unseats the conclusion.
- **OWES:** ⚠ **every seat — confirm `gh api user` is your own account before approving or merging.** The
  approve step first refused (`Can not approve your own pull request`): the box held only the account
  that opened #20. Owner ruling, same day — a per-turn `GH_TOKEN` from `~/.config/bunyan/hmdnah.token`,
  no global switch — so #20 was approved and merged on `narutousomaki741` after all. GitHub blocks a
  self-approval but **not** a self-merge, which is the half a seat has to check itself. `amer` —
  `unverified here: the same cold load inside a real browser tab`, carried forward untouched. `brahim` —
  the flatness verdict is still **printed, not asserted**; four runs put the marginal spread at
  5.9–16.8%, the number a ratio gate would have to clear.
- **RISK:** additive
- **FULL:** `handoff/hmdnah/2026-08-15-T-004-review.md`
- **REVIEW:** n/a — this IS the review turn (`AGENTS.md §1.2`); the verdict is on the entry below.

### T-004 — per-element build cost is flat from 39 to 273 elements, and 10,000 projects to 7.2 min — 2026-08-15 — seat: zayd

- **CHANGED:** `tests/document-build-cost-scale.test.ts` **NEW (+1)** — four sizes of the reference
  building (1/3/5/7 storeys), each on a fresh OCCT kernel, timing `rebuildAll()` on a context cold-loaded
  from `.bnn`. `current_state.md §1a`'s cold-load row carries the measurement and is **not re-coloured**.
- **VERIFIED:** `pnpm verify` green. Two full runs of the harness: slope **43.81** and **43.24
  ms/element**, 1.3% apart, R² 0.9998 / 0.9996, intercept within ±140 ms of zero on an 11.7 s total. Local
  marginals 41.5–45.6 ms per additional element, spread 5.9% and 9.2%. ⇒ **7.30 / 7.21 min projected at
  10,000 elements, uncached.**
- **FOUND:** Per-element build cost **is** flat across 39–273 elements, so Entry 90's 64.5% deferrable
  figure is worth that same fraction of the cold load at the target — about 4.7 of the projected 7.3 min,
  leaving 2.6 min, which is still not a load time. Two estimators were needed, not one: a least-squares
  line has a slope whether or not the data is a line, so the flatness verdict is read off the local finite
  differences and the fit's R² is only its witness. The 7.2 min uncached reaches D66's 6.35 min from a
  different direction, and at the cache's measured 2.07× it is 3.5 min against the ~3 min `§1a` already
  carried. The one
  systematic deviation is the smallest model pricing ~5–10% **low** per element, which makes the
  marginals fall slightly with size — the opposite direction from superlinearity. Authoring's
  marginal is 43.1 ms/element against the cold load's 43.8, so command
  dispatch is not a measurable share of authoring at this scale.
- **OWES:** `hmdnah` — this PR; there is no fix to revert, so the re-run is the check and the harness
  reproduced to 1.3% here. `amer` — `unverified here: the same cold load inside a real browser tab`; every
  number above is Node on the box, as `§1a`'s existing cold-load numbers already are. `brahim` — a call on
  whether the flatness verdict should become a ratio assertion on the marginal spread, which would be
  immune to absolute machine speed; it is printed and not asserted today, so a later superlinear
  regression would still pass this file. ⚠ The projection is a **37× extrapolation** from 273 elements.
- **RISK:** additive
- **FULL:** `handoff/zayd/2026-08-15-T-004-build-cost-flatness.md`
- **REVIEW:** **Reviewed by `hmdnah` (2026-08-15, PR #20) — APPROVED and MERGED**, `RISK: additive`, two
  defects fixed on the branch, on `narutousomaki741` — the account that did not open it. The entry above
  is the record.

### STEWARD-scaffolding — the five-seat scaffolding, finished — 2026-08-15 — seat: brahim

- **CHANGED:** `scripts/reserved-classes.mjs` + `pr-ready.mjs` NEW (the three owner-gated classes as
  `needs-operator/*` labels; PR title routing + `MERGEABLE`), run by a new `pr-shape` CI job ·
  `tests/protocol/{reserved-classes,pr-ready}.test.ts` NEW (+17) · `seats.mjs` gained
  `PR_TITLE_RE`/`titleRoutes`, called by `agent-finish.mjs` · `docs/RUNBOOK.md` NEW ·
  `docs/BACKLOG.md` decomposed (T-001…T-011) · `AGENTS.md §7` NEW — the owner's writing standard,
  binding on every seat and subagent · `REVIEW.md`, `docs/seats/README.md` and `Brahim_Prompt.md`
  corrected where they still described the pre-D82 model · `open_rulings.md` Q13 rewritten.
  Covers two sessions: `f984e89` built the mechanics on the pc, this one finished them.
- **VERIFIED:** `pnpm verify` green. The new suites execute against real fixture git histories rather
  than grepping the scripts. `pnpm docs:check` measured at 6 files / 69 tests **before** any change,
  which is what proved `tests/protocol/` was already wired into CI.
- **FOUND:** Branch protection is unavailable on this repository — `403 Upgrade to GitHub Pro or make
  this repository public` on both the protection and rulesets APIs, with an `ADMIN` token; Q13's
  account objection is satisfied and a plan objection replaced it. `current_state.md §3`/`§5` called
  the plan/section unit blocked on Q1–Q3 after it shipped in Entry 77. `REVIEW.md` still taught the
  pre-D82 self-review loop, and `docs/seats/README.md` still described the retired `§2 DYNAMIC` block
  under a heading saying it carried no state.
- **OWES:** the owner — rulings on Q17a, Q17c, Q18, Q19, and the public/Pro/neither call on Q13.
  `hmdnah` — PR #16. `khalihlna` — PR #17. Beyond T-004 nothing is `ready` for box.
- **RISK:** additive
- **FULL:** `handoff/brahim/2026-08-15-STEWARD-scaffolding-ci-labels-backlog.md`
- **REVIEW:** pending — `STEWARD:` PR, this branch.

### 88 | 2026-08-08 | Zayd | the habit three sessions kept performing by hand is a gate — and the hard part was the SKIP

- **CHANGED:** **`scripts/prompt-sync.mjs` + `.d.mts` NEW** (the gate: three git questions, no network) ·
  **`tests/prompt-sync.test.ts` NEW (+12)** · `package.json` (`docs:check` runs it — gate six is now three
  files) · `.github/workflows/ci.yml` (`BASE_REF` on the docs step, the same sha the re-seed gate reads) ·
  `eslint.config.js` (the default-project cap: 8 files, and this script was the ninth) · and, reviewing
  PR #14: `tests/belongs-to-cycle-guard.test.ts` (**NEW §5, +3**), entry **87's `REVIEW:` line** and its
  `759 green` → **762**, entry **81 rotated** to `docs/history.md` §C (§C now 54–81).
- **VERIFIED:** **776 green** across 88 files, all six gates, **real exit code 0**. Revert-verified **four
  ways, separately** — Entry 90 re-ran all four and measured **2 · 3 · 3 · 1 RED** (the claimed 2/2/1/1
  predates this entry's own follow-up commit).
- **FOUND:** ⚠⚠ **THE GATE'S DIFFICULTY IS NOT THE COMPARISON, IT IS KNOWING WHEN THE COMPARISON IS
  MEANINGFUL — A NAIVE `git diff origin/main -- Zayd_Prompt.md` IS WRONG IN THREE OF THE FOUR STATES THIS
  REPO HAS BEEN IN.** TASK asked *"the whole file, or only FRESH?"* — **neither: no region of the file is
  always equal.** A branch legitimately owns a new `§2 TASK`/`NEW` before step 10(a), and `pnpm state`
  legitimately rewrites FRESH at step 8, also before it. **The invariant is a MOMENT, not a region.** ⇒
  two skips, both measured against real commits: *did the BRANCH touch the file since diverging?* (spares
  Amer) and *did MAIN?* — ⚠ **the second shipped as `merge-base --is-ancestor` and Entry 90 replaced it.**
  ⚠ **Q2 (can `docs:check` see `origin/main`?) is SIDESTEPPED** — CI reads the base SHA it already passes
  the re-seed gate. (`origin/main` does exist in CI; measured after the fact. `git show` costs 1.85 ms.)
  ⚠⚠ **THREE DEFECTS IN THIS ONE GATE, AND ALL THREE WERE A SKIP THAT REPORTED GREEN:** (1) an
  unresolvable `BASE_REF` returned a SKIP — **the Entry-73 disease exactly**; it THROWS now. (2) **It
  survived a green CI run without executing** — `actions/checkout` gives a `pull_request` the
  `refs/pull/N/merge` MERGE COMMIT, which contains main, so skip 2 fired on every PR; found by reading
  the log rather than the tick, and CI now passes `pull_request.head.sha`. (3) Question 3 diffed two
  clean COMMITS, so when `pnpm state` drifted **this session's own prompt**, `docs:check` said *42
  passed*; it diffs the **WORKING TREE** now — **and immediately caught that real drift and printed the
  `git checkout origin/main --` fix, which I ran.** ⇒ **A gate's failure mode is never a wrong answer; it
  is NO answer, wearing a tick.** ⚠ Skip 2 was also wrong twice on a **REBASE** before measurement showed
  the mid-session and rebased states are one situation. ⚠ Consequence: the halves catch different drift —
  same-line drift CONFLICTS (so CI never sees it; the LOCAL run names it), append-drift merges cleanly
  (invisible without the CI half).
- **OWES:** Owner: **nothing new** — `RISK: additive`, so the next session merges this. **Q17a still
  blocks, Q19 is still the worst defect on the board** (the DELETION road is untouched and now pinned),
  Q11/Q12 unchanged. Amer: ⚠⚠ **DO NOT ROTATE ENTRY 80 — Entry 87's advice is void; 79/80/81 are already
  in `docs/history.md`. ROTATE ENTRY 82 INSTEAD, and only because THIS entry exists.** Measured on the
  built union: your merge against today's main is **31 411 ✅**, against a main carrying entry 88 it is
  **35 248 ❌ over by 2 480**, and with entry 82 rotated **30 515 ✅**. Entry 88 is `additive` so it
  merges first — plan on the rotation. ⚠ **I was on both sides of this gate in one session.**
  ⚠ **What WILL fail is entry 86's `AWAITING REVIEW` line**, stale now that 87 exists — rewrite it in your
  merge. ⚠ **`Amer_Prompt.md` is deliberately NOT in `GATED`**; adding it is one line and it is your call.
  **Q18 and Q20 are yours.**
- **RISK:** additive
- **FULL:** `handoff/zayd/2026-08-08-e88-prompt-sync-gate.md`
- **REVIEW:** **Entry 90 (Zayd) — reviewed, AMENDED, MERGED.** ⚠⚠ **FALSE POSITIVE, fixed on the branch:**
  skip 2 asked *"is main CONTAINED in the branch?"* — about **commits**, where the invariant is about a
  **file** — so **the parallel agent merging anything mid-session failed a correct session**, and its
  remedy **deletes the `§2` just written**. Now `git diff <merge-base> <main> -- <file>`. **+2 tests, both
  with a `git merge` ground truth**; two Zayd PRs at once still FAILS. Full: PR #15.

### 87 | 2026-08-08 | Zayd | a belongs-to CYCLE is authorable by two shipped verbs — and it erases the element silently

- **CHANGED:** `packages/document/src/designoptions.ts` (**`wouldCloseBelongsToCycle` NEW** — the authoring
  guard `isElementActive` always needed, walking BOTH edges) · `packages/document/src/commands.ts`
  (`core.retargetReference` and `core.setElementMetadata` now REFUSE a cycle) ·
  **`tests/belongs-to-cycle-guard.test.ts` NEW (+14, **+3 more from Entry 88's review — §5**)** ·
  `tests/option-cascade-d67.test.ts` (**NEW §8** —
  the differential fuzz, +1) · `open_rulings.md` (Q19 gains its pin) · `tests/frozen-surface.snapshot.json`
  (re-baselined) · entry **85's `REVIEW:` line** · entry **80 rotated** to `docs/history.md` §C · and,
  reviewing PR #12 and PR #13: `current_state.md`, `docs/history.md`.
- **VERIFIED:** **762 green** across 87 files, all six gates, **real exit code 0**, real OCCT throughout
  (759 as authored; **+3 from Entry 88's review**). Revert-verified **twice, separately**: dropping the
  `hostId` guard fails **3** (`promise resolved "{ …(7) }" instead of rejecting`), dropping the
  `parentElementId` guard fails **1** — **both re-executed by Entry 88, not taken on trust.**
- **FOUND:** ⚠⚠ **`core.retargetReference { elementId: w, hostId: w }` IS ACCEPTED, AND THE WALL VANISHES.**
  Entry 85 closed `hostId` on the grounds that both writers `requireElement` — true, and the wrong
  question: **`requireElement` proves the target EXISTS, never that it is not the element itself or
  something leading back to it.** A reference that resolves can still LOOP, and a loop is not a broken
  reference but an ERASED element. Measured through shipped verbs, no design options, no `.bnn`:
  `scene.elements` **1**, `modelElements()` **0**, `brokenRefs()` **[]**, `unbuildable()` **[]**. ⚠ The
  same hole on `parentElementId` via `core.setElementMetadata`, and that one is worse —
  `projectQuantities()` returns **0 rows carrying `basis: 'exact'`**, domain rule 15's failure mode from
  a one-line verb call. ⚠ **A `hostId`-only guard would not have closed it**: `A.hostId=B` then
  `B.parentElementId=A` is refused by neither single-edge check and `isElementActive` excludes both ⇒
  **the guard's edge set must be the EXCLUSION rule's.** ⚠⚠ **AND THE ASYMMETRY IS UNPINNED: making
  `cascadeOf` walk both edges — a real change to what a delete destroys — breaks ZERO behavioural tests**
  (`1 failed | 757 passed`, and the one failure is the freeze HASH, which sees text, not meaning). A Q19
  ruling could land, change `core.deleteElement`, and go green. **Pinned now, and the pin is designed to
  fail when Q19 lands.** ⚠ `cascadeOf` itself is CLEAN — one `seen` set is right because it computes a
  reachable SET, where re-arrival is idempotent; and **`rebuilt` is complete for a reason the command
  hides**: `deleteElement` passes `[element.hostId]`, and the EXECUTOR overwrites it with `affected`
  (counted: 3 ids where the command's hint was `[]`).
- **OWES:** Owner: ⚠⚠ **THIS PR IS `RISK: contract-touching` AND NEEDS YOUR MERGE** — one ADDED export
  (`wouldCloseBelongsToCycle`); the two `execute` bodies did NOT move the surface. **Q19 still needs its
  ruling** and is now pinned by a test that will fail when it arrives; **Q17a still blocks**; Q11/Q12
  unchanged. Amer: **PR #13 was reviewed, NOT merged** (owner's instruction) — findings in its comment;
  ⚠ **your merge of main WILL overflow §7's byte budget, rotate entry 81.** **Q18 and Q20 are yours.**
- **RISK:** contract-touching
- **FULL:** `handoff/zayd/2026-08-08-e87-belongs-to-cycle-guard.md`
- **REVIEW:** **Entry 88 (Zayd, 2026-08-08) — reviewed and MERGED** on the owner's authorisation.
  Item 1 re-executed **both** ways (3 RED, 1 RED). ⚠ **The over-refusal hunt this entry asked for is
  ANSWERED BY MEASUREMENT, not by five examples:** a differential fuzz over **20 000 acyclic graphs /
  100 000 queries** against two oracles sharing no code with the guard (independent reachability, and
  `isElementActive` on the edit APPLIED) — **43 667 refused / 56 333 allowed, ZERO disagreements**.
  **No legitimate authoring act is refused.** Shipped as §5, with the sibling case §3 lacked. ⚠ COST
  answered too: **0.17 µs/call** on a 10 000-element flat model, 1.7 ms on a 10 000-DEEP chain no
  building has. ⚠ **Backward sweep: FOUR write sites of `hostId`/`parentElementId` exist, not two** —
  `createElement` and `copy` are structurally immune (a freshly minted ULID cannot be anyone's
  ancestor), so the two guarded are the whole set. ⚠ ONE finding, and it is correct-by-design, now
  pinned in §5: the guard proves *"no NEW cycle through this element"*, **not** *"the element is active
  afterwards"* — attaching to an already-cyclic subtree is allowed, exactly as attaching to a broken
  ancestor is.

### 86 | 2026-08-07 | Amer | the corner-drag, and the wrapper that was eating D23's transaction

- **CHANGED:** `apps/web` only. **`tool/drag.ts` NEW** (`dragPlans` · `cornerDragPlan` ·
  `cornerPeerCount`; PURE, no `DocumentContext`) · **`tool/drag.test.ts` NEW (+13)** ·
  `edit/agentRefresh.ts` (**the fix**) · `edit/agentRefresh.test.ts` (**+2**) · `App.tsx`
  (`RIBBON_WITHHELD` — `core.array` refuses by design, so its generated button is a control that cannot
  work) · `current_state.md` · `docs/history.md` §C · `open_rulings.md` (Q8 answered, Q20 NEW).
  **No frozen byte, no verb, no schema bump, no `packages/` file.**
- **VERIFIED:** **753 green** across 87 files, six gates, real exit code 0. Revert-verified on the fix
  (drop `options` again ⇒ RED, `expected undefined to deeply equal { transactionId: 'gesture-7' }`).
  ⚠⚠ **AND IN THE BROWSER, BEFORE AND AFTER, ON THE REAL DEMO SCENE:** two `core.setParams` under ONE
  `transactionId`, then one undo — **before:** `w1.end=[4500,500]` `w2.start=[4000,0]` (two undos
  needed); **after:** both back, and one redo restores both. Control: the same edits with NO
  `transactionId` behaved IDENTICALLY to the broken case, which is what proved it was the wrapper.
- **FOUND:** ⚠⚠ **`withUiRefresh` WAS DROPPING `ExecuteOptions` — `execute` was declared
  `(command, args)`, so `transactionId` never reached the document and D23's corner-drag undid ONE EDIT
  AT A TIME.** Nothing failed: every edit applied, geometry right, both diagnostics `[]`. The casualty
  was undo GRANULARITY — and the half-undone state of a corner-drag is a corner left **OPEN**, a model
  the user never authored that the join resolver will faithfully resolve. **The document layer is
  clean** — `agent.ts:178` forwards, `document.ts:396` stamps, `:416` pushes, `takeUndoGroup` groups
  (pinned headlessly); it was four missing characters in `apps/web`. ⇒ **The four existing tests were
  good tests that all asserted what the wrapper ADDS and none what it must not TAKE AWAY. For a
  wrapper, assert the ARGUMENTS ARRIVE — the variadic tail is where things vanish silently.**
  ⚠⚠ **Q8 ANSWERED: the refusal is RIGHT and must not be relaxed** (a placement beside a D52 baseline
  moves the solid and leaves the join resolver, room solver and billed length at the old baseline —
  a silent wrong schedule), **but the demo scene contains NOTHING `core.move` accepts** — both walls
  REFUSED. ⇒ the hostility is in rendering a refusing verb as a generic ribbon button, not in the rule
  (⇒ **Q20**). ⚠ **Measured correction to the dry run's reputation:** a REFUSED probe costs **1.6 ms
  then 0.2 ms**, not ~100 ms — `checkPositioning` refuses BEFORE any geometry is staged; an ACCEPTED
  one costs 28.5 ms. That is what makes probe-and-route affordable. ⚠ The planner therefore **does not
  classify**: duplicating `positioningOf` in the app would be a second copy of the engine's own
  `baselineOf` test, and it would drift silently.
- **OWES:** Owner: **Q20 NEW** (which verbs deserve a generated ribbon button, given some refuse by
  design) · **Q8 is answered above — strike or confirm**. Q11/Q12/Q13/Q17a/Q17b/Q17c/Q18/Q19 stand.
  Zayd: ⚠ **the D23 transaction was never actually reaching the document through `window.bunyan`** —
  any agent-side work that assumed grouping worked was running without it.
- **RISK:** additive
- **FULL:** `handoff/amer/2026-08-07-move-tool-corner-drag.md`
- **REVIEW:** Reviewed by **Entry 87 + Entry 88** (Zayd) and **MERGED by Entry 89** (Amer, a later
  session). Item 1 re-executed **three times** (Zayd twice, Amer once) — RED at
  `expected undefined to deeply equal { transactionId: 'gesture-7' }`. **THREE defects found and all
  three FIXED on the branch before merge:** ⚠⚠ **(1) `cornerDragPlan` matched peers on the 2D corner
  ALONE — a D52 baseline is 2D in the LEVEL plane, so the wall directly upstairs shares x and y exactly
  and was silently re-authored** (Entry 89; `DragTarget.containerId` is the missing third coordinate;
  RED at `expected ['g1','g2','u1','u2'] to deeply equal ['g1','g2']`); **(2) the ABSENT-options test
  was WEAK GREEN** — `toBeUndefined()` cannot separate *forwarded `undefined`* from *never passed*, and
  it passed under the reverted wrapper; **ARITY is the observable** (Zayd wrote it, Amer pasted it);
  **(3) `hostedPlan`'s `Math.hypot` is UNSIGNED** — two opposite drags propose an identical `offsetU`,
  so the docblock's *"over-estimate"* mis-described a **wrong-direction** error. ⚠ And one CLAIM vs CODE
  correction: **`positioningOf` IS exported from `@bunyan/document`** (since Entry 72), so the prompt's
  *"not exported"* premise was false — the design survives on the sharper reason, that the app would
  still have to re-encode the refusal GRAPH. ⚠ **The GL gizmo did NOT ship** — the planner, the
  corner-drag grouping and the transaction did; Entry 89 built the handles on top.

---

## §8 — Generated

<!-- BEGIN GENERATED — written by `pnpm state`. Never hand-edit. -->

| | |
| --- | --- |
| **newest entry** | **STEWARD-two-step-high-risk-review (hmdnah, 2026-08-15)** |
| branch · tip · tree | `brahim/2026-08-15-two-step-high-risk-review` · `206b9fa` · dirty |
| open PRs | #24 brahim/2026-08-15-two-step-high-risk-review · #23 task/T-008-q19-the-belongs-to-deletion-reconciliati · #17 amer/2026-08-08-e89-drag-handles · #16 zayd/2026-08-08-e90-d66-lazy-build |
| suite | ⚠⚠ 835/836 passing — **1 FAILING** |
| protocol | 22 live ops · 2 reserved (of 24 declared) |
| shipped source | 6 `BimObjectType`s in `@bunyan/types` · 40 command ids in `commands.ts` · 1 `FormatCodec` |
| schema | `SCENE_SCHEMA_VERSION` 2 |
| **frozen surface** | **RISK: additive** — unchanged vs baseline |
| diff vs origin/main | 8 files changed, 237 insertions(+), 54 deletions(-) (8 files) |
| docs budget | current_state 83.3/96.0 KB · §7 31.3/32.0 KB · abstracts 10/10 · bodies 41 |

_Generated 2026-08-15 by `pnpm state`._

<!-- END GENERATED -->
