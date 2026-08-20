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
| task | `T-024` |
| branch | `task/T-024-baselinedatentry-names-a-position-so-a-c` |
| claimed-at | 2026-08-19T00:39:12Z |
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


### T-024 — review (step 2, re-run): F3 is closed, and the branch is standing on the state that proves it — 2026-08-19 — seat: hmdnah

- **CHANGED:** no code byte — the four findings below are documentation and an unreachable boundary, none
  red, so `REVIEW.md`'s table makes them findings rather than a third return.
  `handoff/hmdnah/2026-08-19-T-024-review-step2b-rerun.md` NEW; this abstract; T-020's two abstracts rotated
  to `docs/history.md` §E as a **move**, §7 having stood at 32075 of 32768 bytes with 6 of 10 abstracts.
  ⚠ **`docs/BACKLOG.md`'s T-024 row set back to `review` by hand** — `agent-finish --review --step 2`
  stamped it `done` again and printed `gh pr merge 38 --squash`, so **G5 is reproducible**; the existing
  `## Discovered` row carries the second instance.
  ⚠ **PR #38 APPROVED and NOT MERGED** — `needs-operator/freeze` routes the merge to the owner
  (`AGENTS.md §5.3`), which composes with `risk: high` rather than being replaced by it.
- **VERIFIED:** **Item 1, twice.** (A) the record-resolution removed from `baselineEntryIssues`:
  **4 failed | 38 passed (42)** over `freeze-boundary` + `docs-budget`, restored 50/50 with
  `state-risk-e2e` — the author's `4 failed | 46 passed (50)` on the same three files. (B) **the returned
  shape run against the state this branch is in**: `scripts/{docs-state,frozen-surface}.{mjs,d.mts}` and
  both test files restored from `317c756` while `current_state.md`/`docs/history.md` stay at the head ⇒
  `expect(named).toBeDefined()` **FAILS**, `STEWARD-unblock-pc-and-chrome-boot — 2026-08-18 — brahim names
  no abstract in §7`, **1 failed | 37 passed (38)**; restored green. The authorising key resolves in the
  record and **not** in §7 (measured: §7 6 abstracts, record 57 headings), so the fuse was performed rather
  than simulated and the repair is green on the exact input the old shape reddens. **Counts re-derived:**
  **946** (97 files, 0 failed, 0 pending), `docs:check` **163**, `freeze-boundary` **19**; `it(` titles
  diffed `317c756` → `a555a2f` give **+2/+2 and one rename, nothing removed**, and `protocol` 8 /
  `protocol/*` 17·33·8·9·46 / `state-risk-e2e` 8 are identical to step 1's. **Item 3:** `diffSurface`
  `{added:[],removed:[],changed:[]}` at 214 = 214, the writer mints only from §7 ⊂ record, and **0** of the
  51 archived headings sit inside a code fence. **Item 7 on the exact tip, per job:** local HEAD = origin =
  `headRefOid` = `a555a2f`; `typecheck · lint · geometry harness` SUCCESS 20:03:58→20:13:38Z and
  `PR shape · reserved classes` SUCCESS 20:13:40→20:13:52Z, so the label is a verdict and not a silence.
- **FOUND:** ⚠ **H1 — the legacy half now describes behaviour it no longer has**, because `abstracts`
  changed under it: `frozen-surface.mjs:250` still says a legacy number *"SKIPS once it rotates, which is
  why that half never cries wolf"* and `:314` that the bound *"skips when §7 holds no legacy entry"*, while
  the record carries **13** legacy headings permanently against §7's **0** — so the bound is always live and
  the resolution never skips. Two edges: `:327` emits *"is dated … **in §7**"* for an entry the same test
  asserts is not in §7, and `newestLegacy` is 88 while **entries 89 and 90 happened** (`docs/history.md:460`
  and `:328` cite both) without a `### N |` heading, so a baseline naming either is refused as *"the newest
  entry that exists is 88"*. Unreachable through the writer, which mints keys only — G3's class. The new
  test's title *"a legacy number that has not happened yet"* is false of the input it now picks (89).
  ⚠ **H2 — the collision gate's second assertion is a tautology.** `key === \`${id} — ${date} — ${seat}\``
  for all **44** new-scheme abstracts, so grouping by key partitions exactly by those three fields and the
  three `size === 1` checks cannot fail; **0** legacy collisions exist, where they would not be vacuous. Its
  comment claims it separates *"a pair of distinct turns"* from *"one abstract written twice"* — the record
  holds exactly the second shape (the T-015 duplicate) and the test is green on it. The half that measures,
  `collisions.length > 0`, is sound. **H3 — the corrected uniqueness count is stale by one on the commit
  that wrote it:** `## Discovered` and the abstract say **5 of 51 across 56**, measured now **6 of 51 across
  57**, the sixth being this PR's own two `T-024 — 2026-08-19 — zayd` abstracts; the row's T-015 line
  numbers are stale by exactly the 68 lines the same commit inserted above them (2231+68 = 2299,
  2300+68 = 2368). The code is immune because the test measures. **H4 —** `frozen-surface.d.mts:44`'s
  *"never the §7 parse alone"* is overstated: `state-risk-e2e.test.ts:209`/`:250` do exactly that, legitimately,
  on fixtures with no `docs/history.md` where `recordedAbstracts` throws by design. **Confirmed as reported:**
  the T-015 duplicate is real at `docs/history.md:2299`/`:2368`, written by `71cfc02` and `c18ae8e`, present
  on `origin/main` and so not this branch's to edit; **G1**'s reasoning holds — `agent-finish.mjs:279` finds
  by `id + seat`, and the record carries `T-024 — 2026-08-19 — zayd` **twice**, so `.key` accepts the
  predecessor identically and closing it needs a §7 schema change.
- **OWES:** The **owner** — the merge; `needs-operator/freeze` is unconditional. `brahim` — **H1–H4** as
  `## Discovered` rows, and **Q22** is still unruled: `REVIEW.md`'s two-step table defines no turn for a
  branch returned by *step 2*, so this turn followed `docs/history.md`'s `T-011 — review (step 2, re-run)`
  precedent and re-ran step 2 against the new head rather than invent a rule. **G1**, **G3** and **G5**
  unchanged and unclaimed. Nothing owed to a `pc` seat — every measurement here is headless and was executed
  here.
- **RISK:** additive — a review turn moved no declaration; `pnpm state` re-derives `RISK: additive` at
  214 = 214.
- **FULL:** `handoff/hmdnah/2026-08-19-T-024-review-step2b-rerun.md`
- **REVIEW:** n/a — this IS the review turn (`AGENTS.md §1.2`), D88 step 2 re-run against the new head.
  ✅ **APPROVED, NOT MERGED**: F3 is closed on the state the branch is already in, both reverts reproduce
  here, and the four findings are documentation or unreachable. The owner merges (`AGENTS.md §5.3`).
  ⚠ **The turn was interrupted between this abstract and its push, and item 1 was RE-EXECUTED on
  2026-08-20 before the verdict was signed** — (A) 4 failed, same four titles; (B) `1 failed`,
  `… names no abstract in §7`; both restored to `docs:check` **163**. Body §11.

### T-024 — the defect return: the gate resolves its key in the RECORD, so §7's rotation cannot redden it — 2026-08-19 — seat: zayd

- **CHANGED:** `scripts/docs-state.mjs` (**`recordedAbstracts` NEW** — §7's parse plus every
  `docs/history.md` abstract heading, both schemes; archived new-scheme entries carry `n: null`, never a
  second synthetic series; throws on a zero-heading parse) · `scripts/frozen-surface.mjs`
  (`baselineEntryIssues`'s keyed path now RESOLVES the key in `abstracts`, and `abstracts` is the record
  rather than §7) · `scripts/{docs-state,frozen-surface}.d.mts` · `tests/freeze-boundary.test.ts` (the §7
  resolution test replaced; **+2** — rotation survival, and a fabricated key refused against the real
  record; the Q15-shape and entry-76 tests moved off fixtures onto the record) · `tests/docs-budget.test.ts`
  (**+2** — the key-collision gate; the seven diagnostics print `.key`, not `.id`) ·
  `docs/BACKLOG.md ## Discovered` (the uniqueness row corrected; one new row) · the uniqueness claim
  corrected in all four places, and this PR's step-1 `REVIEW:` line brought up to date. ⚠ **Both
  `STEWARD-unblock-pc-and-chrome-boot` abstracts rotated to `docs/history.md` §E** — §7 stood at 37913 of
  32768 bytes with this abstract prepended — **which moves the baseline's own authorising entry out of the
  window, and the gate stays green**: the returned shape would have gone red on this very commit. No frozen
  byte, no `packages/`, no `apps/web`, no new PR — same branch, same claim, row `review` throughout.
- **VERIFIED:** `pnpm verify` green, all six gates. **Revert-verified twice.** (A) the resolution removed:
  **4 failed | 46 passed (50)**, restored 50/50 and `freeze-boundary` 19/19. (B) **the fuse itself,
  performed rather than simulated** — the authorising abstract rotated out of §7 into `docs/history.md` §E,
  which is what an append forces: `freeze-boundary` **19/19 green** under the repair, while the returned
  shape's `expect(named).toBeDefined()` on §7 alone **FAILS** on that same state. This turn's abstract is
  that append, so the branch as returned would have gone red on the commit that fixes it.
- **FOUND:** ⚠⚠ **F3's defect was the POPULATION, not the assertion.** §7 is a byte budget: **32209 of
  32768 bytes, headroom 559 B** with the authorising abstract at the bottom — smaller than the smallest
  abstract §7 held, so **one** append rotated it out and the test failed rather than skipped. The record is
  §7 **plus** `docs/history.md`, invariant 10 makes it append-only and its headings are verbatim, so the
  same question asked of the union only ever grows an answer. That also closes **F4**: the keyed path read
  no §7 at all, so `T-999 — 2026-01-01 — nobody` and the real key with **both** audit fields hand-moved
  together both returned `[]` — the one edit a cross-field check cannot see. ⚠ **The `⚠ MEASURED`
  uniqueness claim was wrong in scope, count and generator, in four places, and all four are corrected
  here:** **5 colliding keys of 51 distinct** over §7 + `docs/history.md` (4 when step 2 measured; its own
  abstract made the fifth), generated by **any two turns by one seat on one task on one day** — D88's
  review pair *and* `--continue`'s builder pair. The count is now MEASURED by a test rather than stated in
  a comment, because a number in a comment is falsified by the next abstract, which is how this claim died.
  ⚠ That gate found `docs/history.md` §E holds T-015's review abstract **twice** — a rotation that copied
  instead of moving; append-only, so recorded, not edited.
- **OWES:** ⚠ **A reviewer, and `REVIEW.md` does not say which turn this is** — an unreviewed fix landing
  *after* step 2; step 2 recorded the same gap and I have not invented an answer either. Item 1's revert is
  **(B)** above. The **owner** — the merge; `needs-operator/freeze` is unconditional and composes with
  `risk: high`. `brahim` — the corrected uniqueness row, the new T-015 duplicate-archive row, and **G1**
  (`agent-finish.mjs:280` identifies a turn by `id + seat`) which I judged **out of scope**: `.key` does not
  fix it, since this turn and the first pass share one key, so it needs a turn identity the record does not
  carry — a §7 schema change, sized like T-024. **G3** and **G5** stay `hmdnah`'s rows, untouched. Nothing
  is owed to a `pc` seat — every measurement here is headless and was executed here.
- **RISK:** additive — `diffSurface` empty, `_declarationCount` **214 = 214**, `WATCHED` is `packages/`
  only so the two `scripts/` contracts changed here are outside the frozen surface. ⚠ **The owner still
  merges:** the branch moves `_baselinedAtEntry`, which `reserved-classes.mjs` classes `freeze` on a bare
  path match.
- **FULL:** `handoff/zayd/2026-08-19-T-024-return-record-resolution.md`
- **REVIEW:** ✅ **APPROVED, NOT MERGED** — `hmdnah`, D88 step 2 re-run against the new head, on
  `narutousomaki741` (`handoff/hmdnah/2026-08-19-T-024-review-step2b-rerun.md`, tip `a555a2f`). **F3 is
  closed:** the returned shape is RED on the state this branch is already in — the authorising abstract
  has rotated out of §7 and resolves only in the record — while the repair is green there, and removing
  the record-resolution takes four tests RED. Four non-blocking findings (**H1** the legacy half's comment,
  `in §7` message and 88-bound, **H2** the collision gate's tautological second assertion, **H3** the
  uniqueness count stale by one on its own commit, **H4** the `.d.mts`'s *"never §7 alone"*). ⚠ **The owner
  merges this** — `needs-operator/freeze`, both CI jobs SUCCESS on the exact tip.

### T-024 — review (step 2, adversarial): the repaired gate's §7 tie is two appends from red, and this turn is the first — 2026-08-19 — seat: hmdnah

- **CHANGED:** no code byte — F3 is a scoping call on the author's own `done-when:` and both candidate
  repairs change an exported contract in `scripts/frozen-surface.mjs`, which `REVIEW.md`'s ownership rule
  makes a finding rather than a fix. `handoff/hmdnah/2026-08-19-T-024-review-step2.md` NEW; this abstract;
  T-018's two abstracts rotated to `docs/history.md` §E, §7 having stood at 31588 of 32768 bytes with 8 of
  10 abstracts. ⚠ **`docs/BACKLOG.md`'s T-024 row set back to `review` by hand** after
  `agent-finish --review --step 2` stamped it `done` — see **G5**. PR #38 **not approved and not merged**.
- **VERIFIED:** **Item 3 — the writer and the acceptor are closed against each other, quantified over the
  whole record and not over §7:** across `current_state.md` §7 + `docs/history.md`, **42 new-scheme and 13
  legacy headings, 0** keys `abstractKey` can mint that `ENTRY_KEY`/`isSyntheticEntryNumber` refuse — and
  closed by construction, `ENTRY_KEY`'s three alternatives being byte-identical to `NEW_HEADING`'s groups
  1/3/4. The **invalidator** never reads the new field: `diffSurface` re-measured `{added:[],removed:[],
  changed:[]}` at 214 = 214. **Item 7 re-confirmed on the exact merge tip** `5636b8e` (local HEAD =
  origin = `headRefOid`), per job rather than per label, which is the trap the item names: `typecheck ·
  lint · geometry harness` SUCCESS 11:50:10→11:59:44Z and `PR shape · reserved classes` SUCCESS
  11:59:46→11:59:58Z, so `needs-operator/freeze` is a verdict and not a silence; mechanism re-derived at
  `reserved-classes.mjs`'s bare path match on the snapshot file.
- **FOUND:** ⚠⚠ **F3 upheld as a proven defect — the fuse is TWO appends, not six, and this turn is the
  first of them.** Step 1 measured against the 10-abstract cap; the budget that binds is the **byte** cap,
  and §7 sits at **31588 / 32768 with 1180 B of headroom — less than the smallest abstract it holds**.
  Simulating the rotation as it is performed and re-running the new test's own assertion on the result:
  the baseline's key leaves §7 after **2** appends at the median footprint (4056 B) and **3** at the
  smallest, `expect(named).toBeDefined()` FAILING each time while `baselineEntryIssues` returns `[]`. A
  builder turn plus its review is two abstracts, so the next ordinary task reddens `docs:check` for every
  seat having moved no declaration — T-024's own shape, on the gate T-024 built. ⚠⚠ **Re-measured with
  this abstract in place, the fuse is ONE:** rotating T-018's two out left the authorising abstract at
  §7's bottom, so the very next append — any seat, any task — takes it out at all three sample sizes.
  **A recorded follow-up
  cannot work:** claiming and finishing one appends the second abstract itself, and the three exits left
  are the three this entry rejects (falsify a date · `--rebaseline`, owner-gated after the freeze · delete
  the test, which is **F4**, and how Q15 happened). ⇒ back to `zayd` on the existing claim. **Item 6 — the
  PR moved three of four real-file assertions onto fixtures and left the fourth over-strict.** Measured:
  the *"cannot name an entry that has not happened"* bound is **dead against the real file** (§7 holds 0
  legacy abstracts, so `legacy.length > 0` never fires — `5000` and `999999` are refused on `origin/main`
  and accepted here) while its test stays green on a synthetic fixture; the keyed path's `abstracts`
  argument is **inert** (byte-identical output against the real §7 and a junk one-element array), so
  *"catches Q15's own shape"* asserts nothing about `current_state.md`; and *"the gate is repaired, not
  removed"* asserts `toHaveLength(1)` without the message — narrowing `ENTRY_KEY` to drop `STEWARD-`
  leaves it **green** (2 failed | 15 passed elsewhere; restored 17/17). **Item 2 — two sites the sweep
  missed. G1:** `agent-finish.mjs:280` identifies an abstract by `id + seat`, the tuple this PR proves
  collides, which is why step 1's abstract already satisfies step 2's gate. **G2:** the seven
  `docs-budget` messages moved `.n` → `.id`, the one field that is never unique — §7 holds two `T-024`
  abstracts today. **G3:** `isSyntheticEntryNumber` covers `(990, 1000]`, but a turn appends *then*
  rotates, so §7 transiently holds 11 and index 10 mints `990`, which the guard reports as legacy.
  **The `⚠ MEASURED` uniqueness claim:** step 1's correction to *"zero collisions"* is falsified by this
  very turn — step 1's abstract and this one are both `T-024 — 2026-08-19 — hmdnah`, so D88 puts a live
  collision in §7 on the PR that says there is none. Right text: 4 colliding keys of 51 across §7 +
  history, generator "any two turns by one seat on one task on one day" (D88's pair **and** `--continue`'s
  builder pair), conclusion unchanged but for cry-wolf rather than invariant 10. Correcting it needs no
  rewrite of a merged record **because F3 returns the PR** — its author fixes all four copies inside the
  same editable window.
- **OWES:** `zayd` — on the existing claim via `agent-start.mjs --continue T-024`, no new PR: F3/F4 (give
  the §7 resolution the predecessor's skip, wherever it lives), the four copies of the uniqueness claim,
  and optionally G2/G4's fixture-only assertions. `brahim` — the `## Discovered` uniqueness row's scope,
  count and generator; **G1** and **G5** as new rows; T-024 stays `review`. ⚠ **And a ruling: D88 has no
  third step.** This return happens *after* step 2, so whoever reviews the returned branch reviews an
  unreviewed fix; `REVIEW.md`'s two-step table does not say what that turn is and I have not invented one.
  The **owner** — the merge, once a repaired PR is approved; `needs-operator/freeze` composes with `risk:
  high` rather than being replaced by it. Nothing owed to a `pc` seat.
- **RISK:** additive — a review turn moved no declaration; `diffSurface` empty at 214 = 214.
- **FULL:** `handoff/hmdnah/2026-08-19-T-024-review-step2.md`
- **REVIEW:** n/a — this IS the review turn (`AGENTS.md §1.2`), D88 **step 2 of 2**. ⚠ **NOT APPROVED**:
  F3 is upheld and PR #38 returns to its builder on the existing claim. **G5 — `agent-finish.mjs` stamped
  the backlog row `done` on an owner-gated PR**: `reviewFlipsToDone('high', 2, false)` is `true` because
  `contractTouching` reads §8's frozen-surface row, and `AGENTS.md §5`'s freeze and legal-figure classes
  walk past it; `done` is what satisfies a `depends-on:`, so this releases dependents on an unmerged PR.
  T-014's defect, one class over; the 2026-08-18 `## Discovered` row covers only the printed merge
  commands, which a human can decline, and not the row flip, which nobody sees. Row corrected by hand.

### T-024 — review (step 1, mechanical): both reverts reproduce, and the repaired gate loses its tie to §7 six appends out — 2026-08-19 — seat: hmdnah

- **CHANGED:** nothing on the branch — a review turn edits no code, and F3/F4 below are a scoping call on
  the author's own criterion, which `AGENTS.md §1.2` returns to the builder rather than pushes.
  `handoff/hmdnah/2026-08-19-T-024-review-step1.md` NEW; this abstract; the `REVIEW:` line of the entry
  below; T-017's two abstracts rotated to `docs/history.md` §E, §7 having stood at 31578 of 32768 chars
  and 9 of 10 abstracts. PR #38 **not approved and not merged** — `needs-operator/freeze` routes it to the
  owner (`AGENTS.md §5.3`), and no merge command was run at any point.
- **VERIFIED:** **Item 1, both of the author's reverts re-executed by hand.** (A) `abstractKey`
  neutralised to `return a.n` ⇒ **4 failed | 21 passed (25)**, including `expected 1000 to be
  'T-024 — 2026-08-05 — zayd'`; restored 25/25. (B) the pre-fix scheme entire — nine files from
  `origin/main` with this turn's `2026-08-19` abstract present ⇒ **1 failed | 11 passed (12)**,
  `_baselinedAtEntry 1000 is dated 2026-08-19 in §7, but _baselinedAt says 2026-08-18`, on a branch that
  moved 0 of 214 declarations; restored 17/17. ⚠ **The `done-when:`'s *repaired, not removed* half proved
  by CONSTRUCTION, not by the green path:** the committed baseline hand-edited to
  `"STEWARD-unblock-pc-and-chrome-boot — 2026-01-01 — brahim"` with `_baselinedAt` moved to match — **both
  halves together**, so no self-consistency check can see it — goes RED. **Item 5, every figure
  re-derived:** 936 → 942 and `docs:check` 154 → 159 and `freeze-boundary` 12 → 17 from full JSON runs on
  both branches; `diffSurface` ⇒ `{added:[],removed:[],changed:[]}` at 214 = 214; §7 at 32696/32768 and
  10/10 on `origin/main`, exact. **Set-differenced by test name, not by total:** 2 removed are RENAMES of
  tests still present, 8 added, net **+6**, all in `freeze-boundary` (+5) and `state-risk-e2e` (+1);
  `docs-budget` 21 and all six protocol files identical, `pending` 0 both runs — **nothing stopped
  running**. **Item 7:** `pnpm state` ⇒ `RISK: additive`, matching the diff, and the labeller **did
  execute** (`PR shape · reserved classes` pass 14 s), so `needs-operator/freeze` is a verdict and not a
  silence. **The baseline names the right turn:** `git log -S` puts the write at `32c6cac`, whose §7 had
  the `brahim` steward abstract on top, so the key resolves to exactly what `1000` denoted then.
- **FOUND:** the fix is mechanically sound; four findings, none blocking and none red today. **F1 — the
  `⚠ MEASURED` uniqueness claim is falsified by the diff that ships it:** *"not unique across §7 today"*
  is stated in four places, but this same PR rotated both `T-016` abstracts to `docs/history.md` and they
  were §7's only collision — `origin/main` 10 abstracts/1 collision, this branch 9/**0**. **F2 — the
  collision is 4 keys of 41 across §7 + history, not 1**, and `T-011 — 2026-08-17 — zayd` is a *builder*
  pair, so *"D88's two review steps"* under-names the generator (`REVIEW.md`'s own defect-return path is
  the other). The conclusion not to gate holds; the premise given for it does not — a §7-scoped gate would
  be **green** today, so *"red on a merged abstract"* is false at that scope. **F3 — ⚠⚠ the new
  §7-resolution test reintroduces T-024's own shape:** *"the committed baseline records a key, and it
  resolves to a real §7 abstract"* **fails rather than skips** once the authorising abstract rotates out —
  measured **6 appends** away, and executed by deleting that abstract from §7 (`1 failed | 16 passed`)
  while `baselineEntryIssues` itself correctly returned `[]`. The predecessor was built to skip *"which is
  why it never cries wolf"*; this is not, and it lands after the freeze when `--rebaseline` is owner-gated.
  **F4 — `baselineEntryIssues` never consults §7 on the keyed path**, so `T-999 — 2026-01-01 — nobody`
  returns `[]`; defensible, but it leaves the whole §7 tie resting on F3's test, whose obvious repair when
  it reddens is deletion — which is how Q15 happened.
- **OWES:** `hmdnah` — **step 2** (items 2, 3, 6, plus re-confirming `needs-operator/*` immediately before
  the merge), separate session, same claim, row stays `review`; reconcile against this report rather than
  re-run it. The **owner** — the merge, unconditionally (`needs-operator/freeze`). `zayd` — F3/F4 if step 2
  agrees, on the existing claim via `agent-start.mjs --continue T-024`; suggested shape is to move the
  resolution into `baselineEntryIssues` with the predecessor's skip, so the §7 tie returns without a
  rotation fuse. `brahim` — the `## Discovered` uniqueness row names the wrong scope, the wrong count and
  an incomplete mechanism (F1/F2) before it is acted on. Nothing is owed to a `pc` seat — every claim here
  is headless and was executed here.
- **RISK:** additive — a review turn moved no declaration; `diffSurface` empty at 214.
- **FULL:** `handoff/hmdnah/2026-08-19-T-024-review-step1.md`
- **REVIEW:** n/a — this IS the review turn (`AGENTS.md §1.2`), D88 **step 1 of 2**; findings posted to
  PR #38 (`issuecomment-5341466379`, presence verified by read-back), `review/step-1` label applied and
  verified. No approval, no merge.

### T-024 — `_baselinedAtEntry` records an identity, not a §7 position — 2026-08-19 — seat: zayd

- **CHANGED:** `scripts/docs-state.mjs` (`abstractKey` · `ENTRY_KEY` · `SYNTHETIC_ENTRY_BASE` ·
  `isSyntheticEntryNumber`; every parsed abstract carries `.key`) · `scripts/frozen-surface.mjs`
  (`baselineEntryIssues` takes a key or a legacy number and REFUSES a synthetic one) ·
  `scripts/state.mjs` (`--rebaseline` writes `newest.key`) · both `.d.mts` ·
  `tests/frozen-surface.snapshot.json` — `_baselinedAtEntry` `1000` →
  `"STEWARD-unblock-pc-and-chrome-boot — 2026-08-18 — brahim"`, the only byte that moved in it ·
  `tests/freeze-boundary.test.ts` **+5** · `tests/state-risk-e2e.test.ts` **+1** ·
  `tests/docs-budget.test.ts` (seven failure messages render `a.id`, not `a.n`) ·
  `docs/BACKLOG.md` (two `## Discovered` rows) · `handoff/zayd/2026-08-19-T-024-baseline-entry-identity.md`
  NEW; this abstract; T-016's two review abstracts rotated to `docs/history.md` §E, §7 having stood at
  32696 of 32768 chars and 10 of 10 abstracts. No `packages/`, no `apps/web`, no frozen declaration.
- **VERIFIED:** `pnpm verify` green, exit 0. `freeze-boundary` **17/17** (was 12), `docs:check`
  **159 · 8** (was 154). **⚠⚠ Item (C) is this entry itself: it is in §7 dated `2026-08-19` against a
  baseline dated `2026-08-18`, `freeze-boundary` green, 0 of 214 declarations moved, NO re-baseline
  and no falsified date** — the defect's exact input, taken by the turn that fixes it.
  **Revert-verified twice.** (A) `abstractKey` neutralised to `return a.n` — the pre-fix identity —
  leaves **4 failed | 21 passed (25)**, including the end-to-end
  `expected 1000 to be 'T-024 — 2026-08-05 — zayd'`; restored 25/25. (B) the pre-fix scheme entire —
  three scripts, the snapshot and the old test file all restored from `origin/main`, this entry
  present — **1 failed | 11 passed (12)**, `_baselinedAtEntry 1000 is dated 2026-08-19 in §7, but
  _baselinedAt says 2026-08-18`, on a branch that moved 0 of 214 declarations; restored 17/17.
- **FOUND:** **The identity is `<id> — <date> — <seat>`, the three authored fields of the heading**,
  which survive §7's rotation and do not move when a turn prepends an abstract. A key carries its own
  date, so Q15's cross-field check needs no §7 lookup; the legacy numbered branch keeps the old lookup
  and still skips once its entry rotates. ⚠ **And a self-contained key is only half the audit** — it
  proves the two fields agree with each other and nothing about whether the turn they name happened,
  so the gate also resolves the key in **§7 plus `docs/history.md`**, the population invariant 10 makes
  permanent. Asking §7 alone is T-024's own defect: its headroom was one append wide. **The backward
  sweep's other dirty site:** `docs-budget.test.ts` printed `Entry 1000` to a human in seven failure
  messages, against `docs-state.d.mts`'s own *"never render this to a human"* — they print the key now,
  `.id` being the one field that is never unique. **⚠ MEASURED over §7 + `docs/history.md` — the key is
  not unique, and §7 is not the scope that decides:** **5 colliding keys of 51 distinct** across 56
  headings, generated by **any two turns by one seat on one task on one day** — D88's review pair and
  `--continue`'s builder pair. The date is in the key, so a reference resolves to a turn-pair carrying
  one date, which is the half the gate reads. No uniqueness gate: at §7 scope one is green today and red
  on a *correct* turn, which is cry-wolf.
- **OWES:** `hmdnah` — this PR's review, `risk: high` ⇒ **two review turns** (D88). ⚠ Item 1's revert
  is (B) above, and it must reproduce a red on a branch that moved no declaration. The **owner** — the
  merge: `reserved-classes.mjs` classes any `tests/frozen-surface.snapshot.json` diff as `freeze`, so
  a metadata-only fix is labelled `needs-operator/freeze`. `brahim` — two `## Discovered` rows (the
  D88 key collision; the metadata-only `freeze` label). Nothing is owed to a `pc` seat — every claim
  here is headless and was executed here.
- **RISK:** additive — 0 of 214 declarations moved, `_declarationCount` unchanged, no frozen byte.
  ⚠ **Not merged by its author, and owner-gated by label** — see `OWES:`.
- **FULL:** `handoff/zayd/2026-08-19-T-024-baseline-entry-identity.md`
- **REVIEW:** ⚠ **STEP 1 OF 2 COMPLETE — NOT APPROVED, NOT MERGED; step 2 pending** (D88, `risk: high`).
  `hmdnah` step 1 (mechanical, items 1/4/5/7) on `narutousomaki741`, findings at PR #38
  `issuecomment-5341466379`, abstract above, body `handoff/hmdnah/2026-08-19-T-024-review-step1.md`.
  Both reverts re-executed independently — (A) 4 failed | 21 passed (25), (B) the pre-fix scheme entire
  reproducing `_baselinedAtEntry 1000 is dated 2026-08-19 in §7, but _baselinedAt says 2026-08-18` — and
  the *repaired, not removed* criterion proved on a constructed lie rather than the green path. All three
  counts and `0 of 214` re-derived; `RISK: additive` matches the diff. Four findings, none blocking:
  the `⚠ MEASURED` uniqueness claim is falsified by this diff's own rotation (F1), the collision is 4 keys
  of 41 and not only D88's shape (F2), the new §7-resolution test fails rather than skips once the
  authorising abstract rotates — measured 6 appends out (F3), and `baselineEntryIssues` never consults §7
  on the keyed path (F4). ⚠ **The OWNER merges this** — `needs-operator/freeze`, `AGENTS.md §5.3`.
  ⚠ **STEP 2 COMPLETE — NOT APPROVED; returned to `zayd` on the existing claim, row still `review`**
  (`hmdnah`, items 2/3/6 + item 7, `issuecomment-5342185121`, body
  `handoff/hmdnah/2026-08-19-T-024-review-step2.md`). F3 upheld as a proven defect and re-measured at
  **one** append, not six — §7's byte headroom, not its count, is what binds. Fixed on this branch by a
  second `zayd` turn via `agent-start.mjs --continue T-024` (no new claim, no new PR); see the entry
  above. ⚠ **A third review turn is owed on the return** — D88's table does not describe it; recorded
  for `brahim`.

## §8 — Generated


<!-- BEGIN GENERATED — written by `pnpm state`. Never hand-edit. -->

| | |
| --- | --- |
| **newest entry** | **T-024 (hmdnah, 2026-08-19)** |
| branch · tip · tree | `task/T-024-baselinedatentry-names-a-position-so-a-c` · `393eba2` · dirty |
| open PRs | #38 task/T-024-baselinedatentry-names-a-position-so-a-c |
| suite | **946 green** · 97 files · 289 suites |
| protocol | 22 live ops · 2 reserved (of 24 declared) |
| shipped source | 6 `BimObjectType`s in `@bunyan/types` · 43 command ids in `commands.ts` · 1 `FormatCodec` |
| schema | `SCENE_SCHEMA_VERSION` 2 |
| **frozen surface** | **RISK: additive** — unchanged vs baseline |
| diff vs origin/main | 18 files changed, 2529 insertions(+), 430 deletions(-) (18 files) |
| docs budget | current_state 82.9/96.0 KB · §7 30.4/32.0 KB · abstracts 5/10 · bodies 78 |

_Generated 2026-08-20 by `pnpm state`._

<!-- END GENERATED -->
