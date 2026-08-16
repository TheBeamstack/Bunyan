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
| seat | `zayd` |
| role | builder |
| machine | box |
| task | `T-013` |
| branch | `task/T-013-the-seat-identity-guard-gh-api-user-must` |
| claimed-at | 2026-08-16T12:35:58Z |
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

### T-013 — the seat identity guard: `gh api user` must match the seat — 2026-08-16 — seat: zayd

- **CHANGED:** `scripts/agent-start.mjs` (**`identityGate` NEW**, exported, pure — refuses on a
  mismatch, naming both accounts, and refuses on an unresolvable identity too, never a skip; wired into
  step 0, before pulling or anything else) · `scripts/agent-start.d.mts` (declared) ·
  `tests/protocol/agent-start.test.ts` (`identityGate` unit suite +3, an end-to-end guard suite +2, and
  a `fakeGhReporting` `PATH` stand-in so the four pre-existing `hmdnah`/`amer` tests still exercise their
  ORIGINAL assertion rather than tripping the new guard on this box's single ambient `gh` identity). No
  frozen byte, no `packages/`, no `apps/web`.
- **VERIFIED:** `pnpm verify` green, exit 0, all six gates — **95 files/888 tests** main suite,
  **134 tests** `docs:check` subset, `tests/freeze-boundary.test.ts` green ⇒ `RISK: additive`.
  **Revert-verified:** commenting out the guard's call site left **2 of 27** tests in
  `tests/protocol/agent-start.test.ts` RED — both new end-to-end tests, failing on "the script proceeded
  past step 0" — restored to **27/27 green**. Manually reproduced both refusal paths against the real
  repo too (wrong account: `hmdnah` under this box's real `davidian-abdo` identity; unresolvable: a
  `PATH` with no `gh` at all) — both exit 1, both name the account(s) the task requires.
- **FOUND:** GitHub's self-approval refusal genuinely does not extend to `gh pr merge` (re-confirmed the
  D87 measurement rather than trusting the prior entry's prose) — this guard really is the only thing
  standing between a forgotten `GH_TOKEN` and a self-approving merge on this private, unprotected repo.
  `docs/RUNBOOK.md`'s "Seat credentials" section already documented the per-seat token file convention
  and its 600 mode in full, written 2026-08-15 in anticipation of this task — needed no edit.
- **OWES:** `hmdnah` — this PR's review. Not covered: file-mode (600) enforcement is documented, not
  checked programmatically (not in this task's `done-when:`); `agent-finish.mjs` carries no identity
  check of its own (relies on `agent-start.mjs --review` having already gated the branch it is on).
- **RISK:** additive — `tests/freeze-boundary.test.ts` green, no frozen byte moved. (`docs/BACKLOG.md`
  classifies the TASK itself `risk: high` — D88's two-step review — because this guard is the only thing
  preventing a self-approving merge while the repo stays private and unprotected, Q13/D87; that is a
  separate axis from the frozen-surface RISK: this field reports.)
- **FULL:** `handoff/zayd/2026-08-16-T-013-identity-guard.md`
- **REVIEW:** pending.

### T-008 — the two step-1 review defects, closed on the existing claim — 2026-08-16 — seat: zayd

- **CHANGED:** `document.ts` (`danglingAncestorRefs` groups both edges by the missing ancestor id, one
  report per element, not per edge; `hostId` now `element.id`, matching T-007's convention) ·
  `commands.ts` (`deleteElement`'s label: `"hosted element(s)"` → `"other element(s)"`) ·
  `tests/belongs-to-deletion-d83.test.ts` (+2, through the shipped verbs).
- **VERIFIED:** `pnpm verify` — **845/95, real OCCT, exit 0**; `freeze-boundary` green, `RISK: additive`
  unmoved. Both fixes **revert-verified separately**, each 1 RED alone, both restored green.
- **FOUND:** both defects reproduce exactly as both `hmdnah` reviews measured. `agent-start.mjs
  --continue T-008` (T-015's first real use) worked as documented — no `gh pr checkout` by hand.
- **OWES:** `hmdnah` — D88 step 2 on PR #23; both defects closed, `hostId` aligned too (free, unread).
  `khalihlna` — the 2026-08-15 Problems-panel `unverified here` note stands; untouched this turn.
- **RISK:** additive
- **FULL:** `handoff/zayd/2026-08-16-T-008-review-defects-fixed.md`
- **REVIEW:** pending — `hmdnah` step 2 (D88), same PR #23.

### T-008 — review: the reconciliation holds, and the surfacing pass double-reports one element — 2026-08-15 — seat: hmdnah

- **CHANGED:** nothing in the diff — a pre-review that edits the branch changes the thing the owner is
  deciding on. `docs/BACKLOG.md` `## Discovered` gains the `agent-finish.mjs --review` finding below, and
  T-008's row is held at `review` against that script's own flip. Entry **86 rotated** to
  `docs/history.md` §C, now contiguous over 54–86.
- **VERIFIED:** ⚠ **Item 1 re-executed twice, by two sessions, the second not inheriting the first's
  result.** `belongsTo` → `hostedBy` in `cascadeOf` is **6 RED**, and the split reproduces exactly: **2**
  in `belongs-to-cycle-guard.test.ts` (`cascadeOf` terminates on a cycle; `cascadeOf` and
  `isElementActive` walk the same edges) and **4** in `belongs-to-deletion-d83.test.ts`. Dropping
  `danglingAncestorRefs` from `brokenRefs()` is **3 RED**, all `expected [] to have a length of 1 but got
  +0`. Both restored ⇒ **24/24 green** across the two files. `pnpm verify` green, **843 across 95 files**,
  real exit code 0. `pr-shape` **ran** (`PR shape · reserved classes` SUCCESS) and applied no
  `needs-operator/*` label.
- **FOUND:** The verdict holds and both defects reproduce, measured rather than read. ⚠⚠
  **`brokenRefs()` emits two entries identical in `elementId` and `ref`** when one element's `hostId` and
  `parentElementId` name the same missing id — `danglingAncestorRefs` checks the edges independently, so
  they differ only in `reason`. Measured through the shipped verbs (a door hosted in a wall, then
  `core.setElementMetadata { parentElementId: <that wall> }`, then the wall dropped): **2 entries, 1
  distinct `` `${b.elementId}:${b.ref}` `` — the key `App.tsx:1096` lists on.** ⚠ **The edit label was not
  swept with the cascade:** deleting a parent whose member is joined by `parentElementId` alone yields
  `"Delete Wall and 1 hosted element(s)"`, and the label is journalled (D40). ⚠ Recorded, not proved
  harmful: `BrokenReference.hostId` is `ancestorId` here against T-007's `element.id` one day earlier, and
  `ancestorId` is by construction absent from `scene.elements`; `agent.ts:218` projects
  `{elementId, ref, reason}` and `App.tsx` reads neither, so no consumer resolves it today. ⚠ `cascadeOf`
  has exactly one production consumer (`deleteElementCommand`) and `brokenRefs()` exactly two
  (`agent.ts`'s projection, `App.tsx`'s Problems panel), and no verb gates on either.
- **OWES:** the owner — **T-008 is `risk: high`, so this is a pre-review: NOT approved, NOT merged.** The
  two defects are the decision. `brahim` — ⚠⚠ `agent-finish.mjs --review` reads the frozen-surface verdict
  and never the task's `risk:` field, so it stamps a `risk: high` row `done` and prints
  `gh pr review 23 --approve && gh pr merge 23 --squash`; the row is corrected back to `review` here and
  the finding is in `docs/BACKLOG.md`'s `## Discovered`. ⚠ The box's default `gh` identity is still
  `Davidian-Abdo` — `agent-start.mjs`'s own claim comment on #23 was posted from it, twice; the findings
  comment used `GH_TOKEN=$(cat ~/.config/bunyan/hmdnah.token)` and resolves to `narutousomaki741`. `T-013`
  is the guard. `amer`/`khalihlna` —
  `unverified here: the Problems panel's hint text and the duplicate-key row — khalihlna to confirm`.
- **RISK:** additive
- **FULL:** `handoff/hmdnah/2026-08-15-T-008-review.md`
- **REVIEW:** n/a — this IS the review turn (`AGENTS.md §1.2`); the verdict is on the entry below.

### T-008 — the cascade and the exclusion rule now walk one belongs-to edge set — 2026-08-15 — seat: zayd

- **CHANGED:** `packages/document/src/commands.ts` (`cascadeOf` walks **`belongsTo` NEW** — both edges;
  `core.deleteElement`'s agent-visible description; two stale comment blocks) ·
  `packages/document/src/document.ts` (**`danglingAncestorRefs` NEW**, unioned into `brokenRefs()` beside
  T-007's) · `packages/document/src/designoptions.ts` (comments only) ·
  **`tests/belongs-to-deletion-d83.test.ts` NEW (+7)** · `tests/belongs-to-cycle-guard.test.ts` (the Q19
  pin replaced by the property it protected; the mixed cycle added) · `docs/contracts/V1.0.0_spec.md`
  (D39 gains `AMENDED BY D83`) · `docs/contracts/core_logic.md` (domain rule 3's third class) ·
  `docs/decisions.md` (D83's BUILT note). No frozen byte, no verb, no schema bump, `argsSchema` unmoved.
- **VERIFIED:** **843 green** across 95 files, all six gates, real exit code 0, real OCCT throughout;
  `freeze-boundary` green ⇒ the frozen surface has not moved. **Revert-verified each half separately**:
  `belongsTo` → `hostedBy` is **6 RED** (`expected [ 'wall-…' ] to deeply equal [ …(2) ]`), dropping
  `danglingAncestorRefs` is **3 RED** (`expected [] to have a length of 1 but got +0`).
- **FOUND:** ⚠⚠ **The whole suite noticed the new cascade in exactly ONE place** — `1 failed | 842
  passed` before the pin was updated, and the failure is the pin D83 wrote to fail. ⚠ `hostedBy` stays
  `hostId`-only because it answers the ASSEMBLY question, and the other four call sites are geometric:
  `core.copy`'s refusal list is the only arguable one and it is right as it stands, because it exists for
  the `hostRef` token a copy would have to rewrite (D51/D1) and a `parentElementId` is not inside a token.
  ⚠ `rebuilt` needed nothing — `dependency.ts` pushes `before.hostId`, so a cascaded member re-cuts the
  surviving wall it was hosted on, measured on the wall's volume rather than assumed. ⚠ On the `hostId`
  edge a dangling ancestor means the element is **not built at all** (`affectedAssemblies` drops a root
  that is not in the scene), so `geometryOf` is `undefined` and `unbuildable()` lists registration
  failures only — the document said nothing whatever about it before. ⚠ `brokenRefs()` on a
  hand-assembled 10,000-element scene: **2.78 → 5.81 ms/call**, and **5.70 ms/call with all 10,000
  broken**, so the added pass is flat in the number of findings.
- **OWES:** `hmdnah` — this PR; the two reverts above are the ones to re-execute. `amer` — ⚠ `App.tsx`'s
  Problems-panel hint (*"hosted on a sub-shape that no longer resolves. Retarget them manually"*) is now
  wrong for two of the three classes: T-007's option entry is hosted on nothing, and an ancestor entry
  names a host that is gone rather than a face that moved. `unverified here: how the panel reads with
  those entries in it — khalihlna to confirm`. `brahim` — D83's (a) half is ruled **on the condition that
  groups stay a v1.0.x reservation**; if group authoring ships, this returns to the owner.
- **RISK:** additive
- **FULL:** `handoff/zayd/2026-08-15-T-008-belongs-to-deletion.md`
- **REVIEW:** `hmdnah`, 2026-08-15, PR #23 — **pre-review only, NOT approved and NOT merged**, because
  `risk: high` is an owner gate independent of the mechanical `RISK: additive`. Both reverts re-executed:
  **6 RED** and **3 RED** as claimed, restored 24/24, full suite **843/843**, `freeze-boundary` green. Two
  non-blocking defects — `brokenRefs()` emits two entries identical in `elementId` and `ref` when one
  element's two edges name the same missing id (the key `App.tsx` lists on), and the edit label still says
  *"N hosted element(s)"* for members. Findings in full: the PR comment.

### T-014 — review (step 2): the mechanism's first live exercise found two real defects and two wrong claims — 2026-08-16 — seat: hmdnah

- **CHANGED:** `scripts/seats.mjs` (**`STEP1_LABEL_DESCRIPTION` fixed** — was 104 characters, GitHub caps a
  label description at 100, so `gh label create` for `review/step-1` died on any repo where the label did
  not already exist, which is every FIRST `risk: high` review; shortened to 79, same meaning) ·
  `scripts/agent-start.mjs` (**`resolveReviewStep` NEW**, extracted — the reviewer branch's pure
  risk+labels → step decision, same reason `findTaskPR` is pulled out) · `scripts/agent-start.d.mts` (the
  new export declared) · `tests/protocol/seats.test.ts` (+1: pins `STEP1_LABEL_DESCRIPTION`'s length) ·
  `tests/protocol/agent-start.test.ts` (+5: `resolveReviewStep`) · `current_state.md`'s own T-014 §7 entry
  and `handoff/zayd/2026-08-16-T-014-two-step-review-gate.md` (the wrong "+19" corrected to the real +14) ·
  `docs/history.md` §E (the oldest §7 abstract, T-004/zayd, rolled off to stay within the 10-abstract cap
  this new entry pushed over — its durable lesson already lives in `§1a`, unchanged by the roll). No
  frozen byte, no `packages/`, no `apps/web`.
- **VERIFIED:** `pnpm verify` green, **874/874** across 94 files, `docs:check` **129/129**. **Revert-
  verified two ways, both against the real defect this turn found, not only a unit assertion:** (1)
  `git show main:tests/protocol/seats.test.ts \| grep -c 'it('` → 23, HEAD → 37, 37−23=**14**, not the
  claimed 19; (2) the label-description bug — `gh label edit review/step-1 --description "<original
  104-char string>"` against the real GitHub API returns `HTTP 422 … description is too long (maximum is
  100 characters)`; the shortened 79-char string succeeds. New regression test pins the length so this
  cannot regress silently (the fixture suite cannot exercise the real `gh` call).
- **FOUND:** Ran the mechanism live (`agent-start.mjs --seat hmdnah --review`) rather than only reading
  code — it reported STEP 1, not step 2, though step 1's report was already posted. Cause: the
  `review/step-1` label was never applied, because `agent-finish.mjs --review --step 1`'s `gh label
  create` call — the only code path that ever creates it — cannot succeed while the description exceeds
  GitHub's 100-character cap. Fixed above; applied the corrected label to PR #28 by hand (same two `gh`
  calls the fixed finish script now makes) since step 1's actual review content was already on record and
  reconciled. **Item 2 (backward sweep):** `reviewFlipsToDone`/`reviewStepFor`/`reviewStepGate` each have
  exactly one production call site; no second, un-migrated `!contractTouching` instance found anywhere
  (`scripts/state.mjs:355`'s reference is an advisory `console.log`, not a flip decision). **Item 3 (new
  kind of thing):** `review/step-1`'s three consumers enumerated (`agent-finish.mjs` creates/reads it,
  `agent-start.mjs` reads it) plus the one real invalidator candidate, `reserved-classes.mjs`'s
  `syncLabels` — confirmed its `owned`/`have`/`want` are filtered to the three `needs-operator/*` labels
  only, so it structurally cannot touch `review/step-1`; no third silent consumer found. **Item 6 (weak
  green):** all new tests, including this turn's, assert exact values or exact spawned output, not loose
  substrings; one honest residual gap noted, not fixed — `resolveReviewStep`'s wiring into `main()`'s
  console output is still not spawn-tested end-to-end (would need a faked `gh` on `PATH`; no such
  infrastructure exists in this test file, judged out of scope for one turn).
- **OWES:** `brahim` — a `T-nnn`-worthy follow-up: nothing detects a mismatch between "step 1 posted its
  report" and "step 1's finish command actually ran and applied the label" except a human (or reviewer)
  re-running `agent-start.mjs --review` and noticing it still says STEP 1 — which is exactly how this
  turn found the bug. `agent-finish.mjs` does `die()` loudly if `gh label create` fails for a reason other
  than "already exists" (that part is not silent), but nothing requires step 1 to run the finish command
  at all, and nothing else ever applies the label. Worth a harder integration check (a faked-`gh` spawn
  test covering the full reviewer-branch wiring, not just `resolveReviewStep`'s pure slice) before the
  next `risk: high` PR relies on this unattended.
- **RISK:** additive
- **FULL:** `handoff/hmdnah/2026-08-16-T-014-review-step2.md`
- **REVIEW:** n/a — this IS step 2 of the review turn (D88, `AGENTS.md §1.2`); the verdict is on the entry
  above.

### T-014 — `--review` must read the task's `risk:`, not only the frozen surface — 2026-08-16 — seat: zayd

- **CHANGED:** `scripts/seats.mjs` (**`STEP1_LABEL`/`STEP1_LABEL_COLOR`/`STEP1_LABEL_DESCRIPTION`,
  `reviewStepFor`, `reviewStepGate`, `reviewFlipsToDone` NEW** — the two-step routing/legality/flip
  decisions, pure) · `scripts/agent-finish.mjs` (**`--step 1|2` NEW**; a pre-`pnpm verify` gate resolving
  a review's `risk:` and validating `--step` against it; step 1 creates-if-absent and applies the
  `review/step-1` label, no row flip, no approve/merge printed; step 2 refuses unless that label is
  confirmed present, then flips via `reviewFlipsToDone`) · `scripts/agent-start.mjs` (the reviewer branch
  resolves `risk:` + the claimed PR's labels via `reviewStepFor`, prints which step and the exact finish
  command with `--step N`, refuses rather than guesses on an unreadable label/risk) ·
  `scripts/seats.d.mts` (the four new exports declared) · `tests/protocol/seats.test.ts` (+14: the three
  pure functions, including a revert-verification pair) · `tests/protocol/agent-finish.test.ts` (+7: the
  new gate). No frozen byte, no `packages/`, no `apps/web`.
- **VERIFIED:** `pnpm verify` green, exit 0 — **868/868** across 94 files, `docs:check`'s own subset
  **123/123** across 8; `freeze-boundary` green ⇒ frozen surface unmoved (confirmed separately:
  `reserved-classes.mjs --base origin/main` → `none — RISK: additive`). **Revert-verified:** `seats.mjs`'s
  `reviewFlipsToDone` reverted to the pre-fix `!contractTouching` formula → `pnpm vitest run
  tests/protocol/seats.test.ts -t reviewFlipsToDone` went **2 RED** (`expected true to be false`,
  reproducing T-008/PR #23's own defect: a `risk: high` step 1 stamps `done`); restored → **5/5 green**.
- **FOUND:** `AGENTS.md §1.2` and `REVIEW.md`'s "Two steps" section already specified this mechanism in
  full before any code existed — this PR implements a written spec, not a design decision. ⚠ The
  `gh`-touching halves (label create, `--add-label`, the label-presence read) are not exercised by the
  fixture suite, same limitation `reserved-classes.mjs`'s own `syncLabels` already accepts: a throwaway
  local bare `origin` has no real PR for `gh` to ask about. The pure decision functions are directly
  tested instead; the plumbing gets its first live exercise on this very PR's own review, since `T-014`
  is itself `risk: high`.
- **OWES:** `hmdnah` — this PR (step 1 first, D88; the live exercise of the label-creation path). Also
  `T-008`/PR #23: its step 1 predates this mechanism and ran by hand, so `review/step-1` needs applying
  to it **manually** before `--review --step 2` will route; detail in the handoff body.
- **RISK:** additive
- **FULL:** `handoff/zayd/2026-08-16-T-014-two-step-review-gate.md`
- **REVIEW:** Reviewed by `hmdnah` (2026-08-16, PR #28, two-step D88) — **APPROVED and MERGED**,
  `RISK: additive`, on `narutousomaki741` — the account that did not open it. Step 1 posted a report (no
  merge); step 2 fixed three defects on the branch (two documentation-accuracy issues step 1 found, plus
  one live-exercise code defect step 2 found: `STEP1_LABEL_DESCRIPTION` exceeded GitHub's 100-character
  label-description limit, so `review/step-1` could never be created on a fresh repo). The entry above is
  the record.

### T-015 — review: the fix holds, backward sweep and weak-green clean — 2026-08-16 — seat: hmdnah

- **CHANGED:** Nothing on this branch — no defect proven. The code is merged as fixed by the second
  `zayd` turn (commit `2798b2c`).
- **VERIFIED:** `pnpm verify` green, **847/847**, exit 0, `tests/freeze-boundary.test.ts` green ⇒ frozen
  surface unmoved. **Reconciled step 1's fix myself rather than trusting the report:** `git diff 902e827
  2798b2c` shows exactly one production line changed
  (`scripts/agent-start.mjs:400`, `seats.builderFor(root, continueTask)` → `..., seat)`) plus one new
  test. Reverted that line by hand and re-ran `tests/protocol/agent-start.test.ts`: **1 failed | 16
  skipped**, `✖ T-001's builder is 'zayd', not 'amer'.` — reproduces step 1's finding exactly. Restored:
  **17/17** in that file.
- **FOUND:** No new blocking finding. **Item 2 (backward sweep):** `builderFor` has one production call
  site, now fixed; every `reviewerFor` call site checked — `agent-finish.mjs:324`/`:475` both pass
  `seat`, `agent-start.mjs:507` passes `undefined` deliberately (the pre-existing reviewer-routing
  *display* loop, not an admission gate, unmodified by this PR) — no second instance of the missing-arg
  shape. **Item 3 (new kind of thing):** the `--continue` door and `builderFor` are the new entity;
  `agent-finish.mjs`'s `existingPR` check does not key on the entry path, so nothing else needed
  enumerating. Two non-blocking opinions recorded in the PR comment (duplicate PR-title regex in the
  display loop; the pre-existing `--limit 10` cap on `gh pr list`). **Item 6 (weak green):** the new
  regression test infers admission success indirectly (failing one gate later, at "No open PR"); checked
  a hypothetical alternate bug (raw `finishingSeat` used as machine instead of `machineOf`) and confirmed
  it would also fail the test's second assertion via a different message — not fooled by that class
  either. Test is not weak.
- **OWES:** nothing new. `brahim` — T-016 (depends-on T-015) is now unblocked.
- **RISK:** additive
- **FULL:** `handoff/hmdnah/2026-08-16-T-015-review.md`
- **REVIEW:** n/a — this IS the review turn (`AGENTS.md §1.2`); the verdict is on the entry above.

### T-015 — `agent-start.mjs --continue <T-nnn>` — the branch returns to its builder — 2026-08-16 — seat: zayd

- **CHANGED:** `scripts/seats.mjs` (**`builderFor` NEW**, symmetric with `reviewerFor` — resolves a
  task's own `machine:` field to its builder seat, never the `§0b` baton; `builder-for` CLI dispatch) ·
  `scripts/agent-start.mjs` (**`--continue <T-nnn>` NEW** — role/seat/open-PR/row-status gates, then a
  fetch+checkout of the PR's own branch, no new claim written; **`findTaskPR` NEW**, exported) ·
  `scripts/agent-finish.mjs` (prints an already-open PR's URL instead of `gh pr create` when finishing a
  `--continue`d branch) · `scripts/{seats,agent-start}.d.mts` (the new exports declared) ·
  `tests/protocol/seats.test.ts` (`builderFor` suite, +4) · `tests/protocol/agent-start.test.ts`
  (`findTaskPR` +2, `--continue` refusals +4). No frozen byte, no `packages/`, no `apps/web`.
- **VERIFIED:** `pnpm verify` green, all six gates, `tests/freeze-boundary.test.ts` green ⇒ the frozen
  surface has not moved. **Revert-verified:** `git stash` on the five source/type files (tests left in
  place) took the new suite **10 RED** of 39 — `builderFor is not a function`, `unknown argument
  '--continue'`, `findTaskPR is not a function` — `git stash pop` restored **39/39 green**.
- **FOUND:** ⚠ Confirms `builderFor` must key on `machine:`: the admitted seat has to be DERIVED from
  the task row, because a `--review` finish rewrites the `§0b` baton to name the REVIEWER — measured
  again here against T-008's live branch (baton reads `hmdnah`/reviewer, its claim commit reads `zayd`).
  ⚠ Confirms the second `done-when:` too: T-008's row on `main` still reads `ready` today, three sessions
  after its `review` flip landed on its own unmerged branch — a gate reading `main` after `git checkout`
  would refuse every real `--continue` call, so the row status is read via `git show
  origin/<branch>:docs/BACKLOG.md` instead.
- **OWES:** `hmdnah` — this PR's step-1 review (`risk: high`, D88's two-step route). ⚠ **The success
  path — checking out a real PR's branch and reading `review` off it, and `agent-finish.mjs`'s new
  `existingPR` branch — is not covered by an automated test.** Both need a `gh`-backed GitHub PR; this
  repo's test fixtures build a throwaway *local* bare `origin`, against which `gh pr list` returns
  nothing — the same limitation the existing suite already accepts for `--review`'s own `gh pr
  checkout`/`gh pr comment` calls. `zayd` — T-008 still additionally waits on T-014 (unbuilt) per D88's
  "T-008 waits for both" — this PR alone does not unblock it.
- **RISK:** additive
- **FULL:** `handoff/zayd/2026-08-16-T-015-continue-mechanism.md`
- **REVIEW:** **Step 1** (`hmdnah`, 2026-08-16) — **approval withheld**, one blocking finding
  (PR comment #5305288044): the `--continue` admission gate called `seats.builderFor(root, continueTask)`
  with no `finishingSeat`, so `machine: any` always resolved to `zayd`/`box`. Fixed on this branch by a
  second `zayd` turn via `agent-start.mjs --continue T-015` (no new claim), commit `2798b2c` — one
  production line, one regression test. **Step 2** (`hmdnah`, 2026-08-16) — **APPROVED and MERGED**,
  `RISK: additive`, on `narutousomaki741`, after independently reverting the fix and reproducing the RED
  step 1 found. See the review entry below for the record.

### STEWARD-step-routing-and-continue — D88 asserted two mechanisms no script implements — 2026-08-15 — seat: brahim

- **CHANGED:** `docs/decisions.md` (**D88 amended**) · `docs/BACKLOG.md` (T-014's second `done-when:`
  moved off the banner onto the label; **T-015** NEW, then fixed twice on review — `builderFor` now
  derives from `machine:`, not `area:`; **T-016**, **T-017**, **T-018**, **T-019** NEW; T-012 reframed
  around recurring `STEWARD:` PRs rather than #16/#17; both original `## Discovered` entries closed) ·
  `REVIEW.md` §"Two steps". PRs **#16** and **#17** closed (owner ruling: stale, real conflicts against
  `main`; their work re-decomposed as T-018/T-019 instead of rebased). `AGENTS.md` untouched — §1.2
  already points at `REVIEW.md`, and it is at its line cap.
- **VERIFIED:** `pnpm verify` green. The banner finding was re-checked before amending: the only two
  `NEXT TURN: REVIEW ONLY` hits on `main` are prose inside §7 abstracts.
- **FOUND:** Reviewing PR #24 proved both of D88's mechanisms absent. ⚠⚠ **The `NEXT TURN: REVIEW ONLY`
  banner has never existed on `main`** — it is written into the task branch and read after
  `git checkout main`, and routing has always come from the PR title via `reviewerFor`. ⚠ **A builder
  cannot re-enter its own branch either:** `agent-start.mjs` refuses a row that is not `ready` and a claim
  already marked finished. Owner ruled a **`review/step-1` label** for the first and **`--continue`** for
  the second, over a fifth status value and over parsing step 1's comment.
- **OWES:** `zayd` — **T-015** first (T-008 is blocked on it by owner ruling), then **T-014**, **T-016**
  (depends-on T-015), **T-018**. `amer` — **T-019**. `hmdnah` — T-008 step 2 after the fix, ⚠ **routed by
  hand**, since its step 1 predates the label.
- **RISK:** additive
- **FULL:** `handoff/brahim/2026-08-15-STEWARD-step-routing-and-continue.md`
- **REVIEW:** `hmdnah`, 2026-08-15 — **approval withheld**, one blocking finding, fixed on this branch
  before re-review. ⚠⚠ **T-015's seat gate had been written against the `§0b` baton, which names the last
  seat to FINISH rather than the builder** — `agent-finish.mjs` rewrites it on the `--review` path too,
  so T-008's reads `hmdnah`/reviewer against a claim commit reading `zayd`. As written it admitted the
  reviewer and refused the builder in every intended invocation. The criterion now derives the seat from
  the task row (`builderFor`, symmetric with `reviewerFor`), and a second criterion that read the row
  status from `main` — where the `review` flip has not landed — now reads it from the PR's branch. The
  baton defect itself is recorded in `## Discovered`; owner ruling took it up as **T-016**.
  **`hmdnah`, 2026-08-15 — APPROVED and MERGED** (`30ca130`), `RISK: additive`, after a second round found
  `builderFor` still keyed on `area:` (fixed) and a misattributed `AGENTS.md §0b` citation (dropped —
  that block is `current_state.md`'s). CI stayed red on both rounds from an unrelated GitHub Actions
  billing failure; merged on green local `pnpm verify` (836+91), per the same precedent as PR #24.

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

---

## §8 — Generated

## NEXT TURN: REVIEW ONLY

`T-013` (built by `zayd`) was flagged **high-risk**. The next session reviews its PR and **claims no new task**.

**reviewer seat: `hmdnah`** — resolved from the task's machine:, because the first item on a review checklist is *revert the fix and paste the red output*.

## NEXT TURN: REVIEW ONLY

`T-013` (built by `zayd`) was flagged **high-risk**. The next session reviews its PR and **claims no new task**.

**reviewer seat: `hmdnah`** — resolved from the task's machine:, because the first item on a review checklist is *revert the fix and paste the red output*.

<!-- BEGIN GENERATED — written by `pnpm state`. Never hand-edit. -->

| | |
| --- | --- |
| **newest entry** | **T-013 (zayd, 2026-08-16)** |
| branch · tip · tree | `task/T-013-the-seat-identity-guard-gh-api-user-must` · `b1ed6fe` · clean |
| open PRs | #29 task/T-013-the-seat-identity-guard-gh-api-user-must |
| suite | **888 green** · 95 files · 277 suites |
| protocol | 22 live ops · 2 reserved (of 24 declared) |
| shipped source | 6 `BimObjectType`s in `@bunyan/types` · 40 command ids in `commands.ts` · 1 `FormatCodec` |
| schema | `SCENE_SCHEMA_VERSION` 2 |
| **frozen surface** | **RISK: additive** — unchanged vs baseline |
| diff vs origin/main | 7 files changed, 438 insertions(+), 57 deletions(-) (7 files) |
| docs budget | current_state 82.1/96.0 KB · §7 29.6/32.0 KB · abstracts 10/10 · bodies 50 |

_Generated 2026-08-16 by `pnpm state`._

<!-- END GENERATED -->
