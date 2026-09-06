# Bunyan — `docs/CURRENT_STATE.md`, reference tier

The sections of `docs/CURRENT_STATE.md` that are **reference**, not status: read on lookup, not
in full every session (`AGENTS.md §2`). Split out 2026-09-06 because the state document was 579
lines against the protocol's 200-line cap. **Every line here is the byte-identical text that stood
in `docs/CURRENT_STATE.md`; nothing was summarised or dropped.** A fact that becomes live status
again moves back, it is not copied.

<!-- moved from docs/CURRENT_STATE.md, 2026-09-06: Reading order — the contract documents -->

**Document reading order** (they are the contract; this file is the status): **1.**
`docs/contracts/core_logic.md` (what the app means) · **2.** `docs/contracts/architecture.md` (how it is
built) · **3.** `docs/contracts/V1.0.0_spec.md` (what ships first) · **4.**
`docs/contracts/v1.0.0_imp_plan.md` (phases, exit criteria, **THE FREEZE GATE**). Design docs are
`docs/design/`; `docs/reviews/review_prompt.md` is the standing phase-level adversarial brief, a
different instrument from `REVIEW.md`'s per-PR checklist. ⚠ `docs/PHASE_LOG.md` is **not** in the
reading order — it is a reference, opened when you are stuck.


---

<!-- moved from docs/CURRENT_STATE.md, 2026-09-06: The MIQDAR gate, version strings, and the actor table -->

**⚠ The MIQDAR gate.** Miqdar is the second product and its spec is not optional reading before a
contract freeze (`docs/decisions.md` §4g); **P5 has a gate pointing at it.** ⚠⚠ The live spec is
`~/projects/Miqdar/Miqdar_v1.0.0_spec.md` (M22); the superseded Bunyan copies stay in `docs/archive/`
only so that gate still resolves. Miqdar is **not** a Bunyan work item — it starts after v1.0.0 ships.

⚠ **Version strings: always "Bunyan v1.0.0" or "Miqdar v1.0.0" — never a bare "v1.0.0"** (M17).

**Actors.** Seven seats, org-wide — a seat *is* a role, and its `machine:` is an **autonomy class**
(`box` unattended, `pc` attended), not a host. Registry: `docs/seats/README.md`. Adopted from
`TheBeamstack/diwan` `docs/adr/0002-two-box-topology-and-the-capability-model.md` §2.2, ratified
2026-09-04, superseding the five-seat roster D82.

| Seat | Role | Machine | GitHub account | Owns |
| --- | --- | --- | --- | --- |
| **Architect** (the owner/human) | — | — | — | Contracts, scope, AEC correctness, merge arbitration. **All contract changes are owner-gated**, and the owner merges any PR whose `RISK` is `contract-touching`. |
| **brahim** (agent) | steward/orchestrator | box | `davidian-abdo` | Backlog readiness, sequencing, spec integrity, `docs/decisions.md`, closing the loop between turns. **Never builds.** |
| **Amer** (agent) | builder | pc, **real browser** | `narutousomaki741` | Browser hot path: three.js/WebGPU, tessellation consumer + picking, React shell, ribbon/property panels, persistence adapters, service worker/PWA, `window.bunyan` wiring. |
| **khalihlna** (agent) | reviewer | pc, **real browser** | `davidian-abdo` | Review of anything only a browser can verify — `apps/web` PRs, re-executed, not merely read. |
| **Zayd** (agent) | builder | box, **headless** | `davidian-abdo` | Kernel: OCCT WASM builds, worker API, naming resolver, regression harness + offline golden seeding, IFC importer, CI, release pipeline. **And the document model — `@bunyan/document`, `@bunyan/types`, `@bunyan/sketch-solver`.** |
| **hmdnah** (agent) | reviewer | box, **headless** | `narutousomaki741` | Adversarial review of box-verifiable claims — kernel, document model, CI. |
| **mahjob** (agent) | manager | box | `narutousomaki741` | Org-wide: cross-repo sequencing (`diwan` `CROSS.md`), infrastructure, cost — here, `bunyan-oracle-runner`. **Never builds**, never merges its own PR. |
| **hamadi** (agent) | custodian | box | `narutousomaki741` | The public surface — releases, advisories, Dependabot triage. **Never builds**, never merges its own PR. |

Also read the box-local `../cross_projects_policy.md` and `../last_session_work.md` **if you are on the
dev box** (they are not in this repo and do not travel).

---

<!-- moved from docs/CURRENT_STATE.md, 2026-09-06: §0a — DISTANCE TO FREEZE ≠ DISTANCE TO REVIT -->

### §0a — DISTANCE TO FREEZE ≠ DISTANCE TO REVIT (read this before you feel "almost done")

**The freeze checklist being ~closed says nothing about competitiveness with Revit.** They are different
axes, years apart, and reading "step 0 closed" as "nearly a Revit competitor" is §1's own failure mode —
measuring against the checklist instead of the ambition.

**Ground truth, verified by build:** three element types (`core.wall`, `core.opening`,
`core.curtainwall`) on an exact kernel. The exact-B-Rep + persistent-naming + parametric-recipe core,
the agent-native single command layer and the stable-PEI substrate are the hard, rare part most Revit
challengers never finish — **and they are a foundation, not a competitor.** Not yet: a documentation
tool (Revit's actual product — D58 is the largest parity item), multi-user (D60), MEP (D62),
user-authored families (D61), DWG (D63); the taxonomy is almost entirely unbuilt
(`docs/contracts/core_logic.md` §9a).

**⇒ THE STANDING METHOD: measure the product against the Revit-parity ledger
(`docs/contracts/v1.0.0_imp_plan.md` "Road to Revit parity"), NOT against the phase's exit criteria.**


---

<!-- moved from docs/CURRENT_STATE.md, 2026-09-06: §1a–§1d — the scale numbers, the method, and the traps -->

### §1a — THE SCALE NUMBERS (D48: the interactive target is 10,000+ elements, BINDING)

All four axes have a number. Two are closed; two remain open and are named.

| Axis | Status |
| --- | --- |
| **WASM heap** | ✅ **FITS** — 16.2 KB/live-solid, dead-linear ⇒ **0.31 GB at 10k**, inside a tab (Entry 29, re-measured Entry 54). |
| **Draw calls / frame time** | ✅ **CLOSED (Entry 63)** — renderer batching: **~30,700 draw calls → 2** at the 10k target (606 ms → ~10–14 ms; 1.6 → ~80 fps). |
| **Edit latency** | ✅ incremental edit ~23 ms compute, **FLAT vs scale**; the ~570 ms post-edit render went with the batching rewrite. |
| **Cold load** | ⚠ **OPEN — ~3 min at the 10k target, STILL UNUSABLE.** The D29 cache buys **2.07×** (24.86 → 12.00 ms/solid), not an order of magnitude. ⚠⚠ **PER-ELEMENT BUILD COST IS FLAT, MEASURED (T-004, `tests/document-build-cost-scale.test.ts`): 41.9–43.8 ms/element marginal, ordinary least squares of cold-load ms on element count over four sizes (39/117/195/273 elements), R² ≥ 0.9988, intercept within ±140 ms of zero, four runs — two by `zayd`, two re-run by `hmdnah` in review — spanning 4.5%.** The local marginals run 39.6–46.3 ms per additional element, a spread of 5.9–16.8% across the runs, and the only systematic deviation is the smallest model pricing ~5–10% **low** per element (38.8–39.6 ms/el at 39 elements against 41.8–44.0 ms/el at the three larger sizes, in all four runs). That lifts the first local marginal above the other two, so the marginals **fall** slightly with size — the opposite direction from superlinearity. Its cause is not measured. ⇒ **~7.2–7.3 min uncached at 10,000 elements**, the same order as D66's 6.35 min and, divided by the cache's measured 2.07×, **3.5 min** against the ~3 min this row already carries. ⚠ The range measured is 39–273 elements and the target is 10,000, so the projection is a 37× extrapolation that the flat marginals entitle rather than prove. The levers that could close it are `instantiate` (RESERVED), lazy build/eviction (D66 — additive) and MT (D8, ruled v1.0.x). |
| **Join resolution** | ✅ **CLOSED (D73)** — the O(N²) scan is an O(N) spatial index: **4757.7 ms → 27.2 ms at 1984 walls**, per-wall cost FLAT (14–17 µs) from 1k to 10k. |

⚠⚠ **Verification is most of a cached load's cost, measured rather than asserted (Entry 73):** of a
cached import, `shapeSignature`'s own `GProp` work is **7.9 ms** while all **345** embind boundary
crossings together are **0.073–0.133 ms (~1%)**. The boundary is not the cost and never was. ⇒ **the
remaining cold-load levers are only `instantiate` (RESERVED), lazy build/eviction (D66) and MT (D8)** —
no serializer or marshalling win is hiding here.

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
| the ecosystem joint (D34–D38) | reading the product **against its neighbours** |
| the STYLE-EDIT PERF CLIFF | building a real 195-element building and **timing** it |
| the six P3 defects | driving the document API at its **FAILURE** boundaries |
| the `BuildContext` HEAP-LEAK | the first fixture that ran **two** kernel ops per part |
| the VOID INWARD-DIRECTION gap | cutting a duct through a **beam** |
| the CURVED-FACE HOSTING gap | a duct through a **round column** |

**⇒ Keep cutting shapes nobody has cut.** The kernel-level gaps are nearly mined out; the next
foreclosure is likelier in a **type's contract** than in the kernel.

**⚠ SECOND METHOD: a green test proves only what it ASSERTS.** For every exit criterion, read the test
that discharges it and ask what it would take for that test to pass while the criterion is FALSE. And:
**a fix without a test that fails in its absence is an assertion** — revert every fix and watch its test
fail.

**⚠ THIRD: when a decision is framed as a trade-off, check what it costs the INVARIANT, not the
schedule.** *"Ship the BREP cache"* read as a perf call; it dragged in a persisted name→shape index —
the "token map" D1 forbids. The perf question was an afternoon; the identity question could have
repealed D1.

### §1c — NINE THINGS A FRESH AGENT MUST NOT REDISCOVER THE HARD WAY

1. **`opencascade.js` CANNOT be linked on this box, and we do not use it.** Its `-flto` whole-program
   link OOMs at 2 GB even for a 6-symbol build. We build **upstream OCCT 7.9.3, LTO off**
   (`tools/kernel-build/`).
2. **`/tmp` is a tmpfs — it costs RAM, not disk.** `du -sh /tmp` before invoking §6a; our own
   scratchpads are usually the hog.
3. **A kernel C++ change is a ~60–74 s single-file compile + link**, not a 2.5 h rebuild — OCCT's static
   libs are prebuilt at `~/occt-wasm-spike/install`. Only an OCCT *version* bump costs 2.5 h.
4. **OCCT's `Left/Right/Front/Back` do not mean what they sound like.** `BackFace()`=x-min,
   `FrontFace()`=x-max, `LeftFace()`=y-min, `RightFace()`=y-max. Guessing mislabels four faces and
   nothing fails — geometry perfect, names wrong. `occt-kernel.test.ts` re-measures it.
5. **The naming literature is WRONG about OCCT 7.9.3, and we MEASURED it (D24).** Boolean history is
   complete (zero orphans); the weak spot is the fillet; `Modified()` reports only *splits*, so an
   untouched face appears in **no** history list — that silence means *unchanged*, not *unknown*.
   Re-run `tools/kernel-build/probe.cpp` (~60 s) before trusting naming on a new shape class.
6. **⚠⚠ THE PROBE ONLY MEASURES THE SHAPES YOU THINK TO CUT.** Even a measured, written-down finding
   describes only the shape someone actually cut. Before trusting naming on a shape class nobody has
   cut, **cut it.**
7. **⚠⚠ A PHASE'S EXIT CRITERIA ARE A SPECIFICATION, NOT A SUMMARY OF WHAT GOT DONE.**
   `extrude`/`chamfer` sat unbuilt while P2 was declared complete twice, because every test built walls
   out of boxes. **Read a phase's step list against the code before declaring it done.** *(Four
   recurrences; its worst form is a PASSING TEST as the misleading artifact — Entry 65.)*
8. **⚠⚠ A NEW RULE BINDS THE NEXT CONSUMER AND NOTHING ELSE — SWEEP IT *BACKWARD*.** A rule written into
   the contract does nothing whatever about code written before it. **⇒ When you add a correctness rule
   to a mature codebase, enumerate every existing site that could violate it and check each one.** Two
   mechanical forms: **grep** every iteration over the collection the rule governs and ask *"does this
   aggregate or publish?"*; and, when a rule quantifies over a SET, **COUNT the set** rather than reading
   the code that implements one member.
9. **⚠ MEASURE THE ARTIFACT, NOT THE MANUAL.** OCCT's `BRepTools::Write` doc comment disagrees with what
   the code beside it emits, so a guard written from the documentation **refused every file the exporter
   beside it produces.** Before writing a check against an external format, dump what the code on the
   other side actually emits.

> **⚠⚠ THE SWEEP LEDGER — ALL EIGHTEEN DOMAIN RULES SWEPT, NINE DIRTY.** Dirty: 1, 3, 4, 5, 8, 12, 14,
> 15, 16, 18 (+ the D68 option invariant), counting 8 as SURFACED rather than fixed. Clean: 2, 6, 7, 9,
> 10, 11, 13, 17. **THE BASE RATE IS 1-IN-2.** The transferable finding: **the rules that came back clean
> are the ones a violation could not have been written silently.** *A clean rule with no enforcement is a
> dirty rule that has not happened yet.* Per-rule detail: `docs/contracts/core_logic.md` §8 and
> `docs/PHASE_LOG.md`.

### §1d — Tooling/process traps

- **A gate's hard part is the SKIP, not the check.** A check that disables itself on a broken input
  reports green, which is worse than no gate. For every skip branch, ask which broken state also takes
  it, and grep the run log for the gate's own name — a green tick means the job exited 0, not that your
  step ran.
- **Ask what a validator PROVES, not what it is FOR.** *"Both writers require the host"* proves the
  target exists, never that it is not the element itself — a reference that resolves can still loop.
- **Vite HMR hands you a stale pointer listener, and it looks exactly like a broken feature.** A
  `useEffect` with a narrow dependency array does not re-run on a hot update. Hard-reload after any edit
  to viewport/interaction code before trusting a browser result.
- **React batches; a handler that closes over state reads a stale value.** Read live values from a ref
  in anything that fires across a render boundary.
- **Never re-introduce a sweep whose cost is set by query VOLUME rather than by what an index holds** —
  `SnapIndex.near()` (apps/web) and the join spatial index (D73, kernel side) were the same defect,
  found independently, twice.
- **A measurement is pinned to a commit; a follow-up commit un-measures it.** Re-run the numbers before
  quoting them again — a stale figure that was honest when written is a live defect once anything
  downstream has changed.


---

<!-- moved from docs/CURRENT_STATE.md, 2026-09-06: §2 — Contract status -->

## §2 — Contract status (get this wrong and you break the build model)

The **split contract-freeze** (D13) is what lets Amer and Zayd work in parallel: *adding* an op is
additive and permitted; *changing an existing op's envelope* needs Architect sign-off.

⚠ **THIS IS MACHINE-CHECKED.** `tests/freeze-boundary.test.ts` holds a snapshot of every frozen surface;
any change fails the build and marks the PR `RISK: contract-touching`, routing the merge to the owner.
**The table is the summary; the test is the authority.**

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

<!-- moved from docs/CURRENT_STATE.md, 2026-09-06: §3 — What exists, and how it was verified -->

## §3 — What exists, and how it was verified

```
packages/
  protocol/       flat versioned message contract, zero deps. 21 ops + 3 reserved.
  kernel-core/    KernelHost (dispatch + failure marshalling) + ShapeRegistry
  kernel-mock/    protocol-conformant fake kernel — NO booleans, and says so in `capabilities`
  kernel-occt/  ★ THE REAL KERNEL — OCCT 7.9.3 in WASM + Worker entry. `src/naming.ts` ★ THE RESOLVER
                  (D1/D24): 4 relations, no geometry, ever. `src/cache.ts` ★ D29's VERIFICATION half —
                  ONE file on purpose: the only place a wrong answer produces a PLAUSIBLE wrong
                  building. `wasm/` the COMMITTED artifact (~14.6 MB / 4.19 MB gzip, -O3).
  kernel-client/  KernelClient + WorkerTransport / InProcessTransport
  sketch-solver/  the 2D sketch solver — the ONLY package importing @salusoft89/planegcs
  types/        ★ the shipped `BimObjectType`s: `core.wall` (D52 baseline, join-aware), `core.opening`
                  (buildVoid+buildLeaf), `core.curtainwall` (depth-2 composite)
  document/     ★ THE PARAMETRIC TRUTH LAYER. `scene.ts` ★ this object IS scene.json · `schema.ts`
                  ParamSchema, ONE language with THREE consumers (panel, ribbon, AGENT TOOLS) ·
                  `ulid.ts` ★ D44, the PEI is a prefixed monotonic ULID, no counter ever ·
                  `commands.ts` the Command layer, THE agent API (D19), 44 verbs ·
                  `dependency.ts` ★ the TYPED dependency graph, exhaustive over `SceneCollection` ·
                  `enumerate.ts` ★ the ONE model walk three consumers share · `schedule.ts` ★ the
                  schedules body, whose correctness IS having no enumeration loop of its own ·
                  `cleandelta.ts` ★ journal + revN → CleanDeltaPackage · `build.ts` ★ base parts →
                  resolve hostRef → cut EVERY layer → PLACE LAST · `document.ts` ★ DocumentContext,
                  THE ONLY DOOR (D19), staged all-or-nothing rebuild + universal dryRun (D42) ·
                  `undo.ts` STATE DELTAS + THE JOURNAL + the transaction unit (D80) · `placement.ts` ★
                  D80's rigid-motion algebra, pure · `bnn.ts` the .bnn codec + StorageAdapter +
                  Autosave · `geometry.ts` ★ GeometryGateway, the seam that makes D19 STRUCTURAL ·
                  `designoptions.ts` ★ the exclusion INVARIANT as code (D65/D67/D68) · `joins.ts` ★ the
                  wall-join resolver, auto-miter + butt, O(N) spatial index (D73)
apps/web/       ★ Vite/React shell — WebGL2 three.js viewport with BatchedMesh, generated ribbon +
                  property panel, sub-shape picking, tool/ (snap · QueryGateway · toolMachine · numeric)
tests/            613 tests — all document tests run against the REAL OCCT kernel, never the mock
tools/kernel-build/  the OCCT→WASM recipe + src/probe.cpp (THE NAMING PROBE, ~60 s)
tools/oracle/     Python (uv): offline golden seeding — also a MEASURING instrument
```

**The architectural decision that shapes everything: the kernel is transport-agnostic.**
`KernelHost.handle(request) → response` is a pure function knowing nothing about Workers/`postMessage`/
DOM ⇒ the whole seam is testable headlessly in Node, and mock and real kernel are the same interface.

**⚠ FOUR SILENT OCCT TRAPS, all OUR misuse, all caught by the harness** (plus §1c-4): (1)
`BRepBndLib::Add` is TOLERANT not tight ⇒ `box.SetGap(0.0)`. (2) `LinearProperties` on a solid sums each
edge once per adjoining face. (3) `Add` bounds a curve by its CONTROL POLYGON ⇒ use `AddOptimal`. (4) a
full 360° revolve has NO caps and cap accessors do not return null.

**Verified — the kernel** (headless): protocol v1 (envelope, 15 typed failure codes) · typed failures
never throw · **persistent naming (D1) on real topology** · **mock and real emit BYTE-IDENTICAL refs** ·
`measure` exact (`BRepGProp`, not the mesh) · no WASM heap leak · D28 the bounded positional key ·
`bounds`/`distance`/`classifyPoint`/`faceFrame`.

**Verified — the document model** (headless, vs REAL OCCT): D30 an element IS its ordered PARTS · D31 a
style edit rebuilds every instance · an opening cuts EVERY layer · a window through a wall rotated 30°
(host token byte-identical) · D39 cascade delete in ONE undoable edit · the broken-reference state
(marked, visible, never auto-healed) · reject+keep-last-good · save→reload → identical parametric state
AND geometry from `scene.json` alone · **D19 is a MACHINE check** · a 2D profile is solved (real
planegcs) and extruded.

### NOT verified / NOT built (do not assume otherwise)

- **`geometry-cache.brep` — HALF BUILT, AND THE HALVES MUST NOT BE CONFLATED.** ✅ The op bodies are
  built and green. ❌ **No `geometry-cache.brep` exists inside a `.bnn` and no document loads from one.**
  That half is owner-gated with real design surface (what INVALIDATES a cache), and the measured payoff
  is **2.07×, not an order of magnitude** — recommendation on the desk: do not wire it for v1.0.0
  (`open_rulings.md` Q6).
- **No IFC import** (P6; the op is reserved).
- **Q11 (`CLA.md`'s `<LEGAL ENTITY>`) and Q12 (a lawyer's read)** are owner-only and block the first
  EXTERNAL PR, not publication.
- No service worker/PWA/Cloudflare deploy; no WebGPU (WebGL2 ships); no File System Access adapter.
- No sweep-along-path, no loft (out of scope).


---

<!-- moved from docs/CURRENT_STATE.md, 2026-09-06: §4 — Decision index -->

## §4 — Decision index

**⚠ ONE LINE EACH. THE FULL TEXT OF EVERY RULING IS `docs/decisions.md`** — including the five big
rulings (4e–4i), the verification-scope rule (4b) and the open items (4j). If the index and the ruling
disagree, **the ruling wins and the index is the bug.**

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
| D90 | **Bunyan is formally BLF-Open** under the Beamstack License Framework (BLF-D6) — AGPL-3.0-only + commercial, unchanged; the sibling Beamstack Community License was evaluated and declined for Bunyan specifically. SPDX headers, `NOTICE`, `TRADEMARKS.md`, `CONTRIBUTING.md`, `README.md` aligned to the framework; `CLA.md` unchanged in substance. | | |


---

<!-- moved from docs/CURRENT_STATE.md, 2026-09-06: §5 — Per-seat standing facts, killed items, later work, and what is closed -->

### Zayd (kernel / document / headless)

Open rows are `docs/BACKLOG.md`. ⚠⚠ **DO NOT START THE D29 DOCUMENT HALF UNASKED** — it is
`open_rulings.md` Q6, and the measurement is why: 2.07×, **6.64 ms/solid on every save**, **~61 MB at
the 16k-solid target**, against a cold load that stays ~3 min either way.

### Amer (browser hot path)

Open rows are `docs/BACKLOG.md`. ⚠⚠ **READ THE SPLIT BEFORE BUILDING THE GIZMO — IT IS ENFORCED, NOT
MERELY DOCUMENTED: `core.move` REFUSES a wall** (drag both endpoints with `core.setParams`) **and
REFUSES a door** (`setParams` on `offsetU`), naming the road that works. The move verbs are for
GenericSolid-shaped elements. `core.array` refuses by design — keep it out of the ribbon. A corner-drag
gets its atomicity from `doc.execute(id, args, { transactionId })`.

**Standing API facts that have bitten before:** `planDelete()` is gone (use `dryRun`) · `discipline`
lives on the part · ids are opaque ULIDs (never parse or render them — use `element.name`) · `mass` may
be absent (render "—", never "0 kg") · a snap hit's field is **`SnapHit.elementId`, never
`hostElementId`** · **`InputSpec.snapTo` is READ** (`chooseSnap`'s `allow`) · a derived snap candidate
(guide, perpendicular foot, intersection) carries **no `ref`/`elementId`**, so a hosted-void tool
declines it · on save persist `saveBnn(scene, { journal: doc.changeFeed(), revision: doc.revision })` —
`doc.history()` there is the moat-losing bug, and it is now **refused** rather than silently written.

### ⚠⚠ TWO ITEMS KILLED BY MEASUREMENT (Entry 73) — DO NOT RE-ADD EITHER

- **The `shapeSignature` memory view — CANCELLED.** A crossing costs 0.21–0.39 µs, so all **345** cost
  ~1% of the signature call against its own 7.9 ms of `GProp` work. A memory view buys ~0.1 ms/solid and
  would put a *"valid until the next call"* global buffer in the one file where a wrong answer builds a
  plausible wrong building. Tripwire: `tests/geometry-cache-d29.test.ts` → **THE ATTRIBUTION**.
- **`schedule.ts`'s "rule 17" rename — A PHANTOM.** Both citations are correct uses of the real numbered
  domain rule 17; the collision was already resolved by numbering the interaction rule **19**. Renaming
  would have INTRODUCED the error.

### Later (post-freeze / v1.0.x)

The D29 `.bnn` half (owner call) · `instantiate` · lazy build + heap eviction (D66) · multithreading
(D8) · a File System Access `StorageAdapter` · WebGPU + WebGL2 fallback · service worker/PWA +
Cloudflare deploy · material appearance + transparency · the optional `codecFor` wiring (D71) · then the
**"Road to Revit parity"** phase map. *That is the actual distance to beating Revit; v1.0.0 is its
foundation.*

### ✅ CLOSED — DO NOT REDO

The op set (`transform`/`extrude`/`chamfer`/`revolve`/`faceFrame`) · `measure(ref)` + derived
`capabilities` · the positional key (D28) · the protocol freeze · CI · the document model + agent
surface + `.bnn` + undo + broken-ref state + cascade delete · all six P3 defects + D40–D46 · `-O3`/LTO
(**MEASURED — no speed; do not re-run**) · the heap ceiling · **all of D50 step 0** (0a–0g, the sketch
solver, the room solver, 0c joins) · **all eighteen backward sweeps** (D67–D77) · the enumeration query
+ Clean Delta exporter · the schedules body (D78) + its CRUD (D79) · the renderer batching rewrite ·
P4.5's tool layer · the D29 op bodies · **the five move verbs + `transactionId` (D80)** · P4.5's
alignment guides, perpendicular foot and two-line intersection · browser storage · the join spatial
index (D73) · the cached-import cost attribution (Entry 73) · the plan/section unit (D81, Entry 77) ·
the going-public housekeeping and the in-app licences screen (Entry 74, T-003) · **the toolchain pin
(Q14, Entry 79) — the emsdk digest is in `tools/kernel-build/toolchain.json`, the build id is composed
by the compiler and checked at kernel construction, and the pin is PROVEN (relinking reproduced the
committed artifact byte for byte). A VERSION BUMP is a different question.**


---

<!-- moved from docs/CURRENT_STATE.md, 2026-09-06: §6 — Environment & commands (dev box), and §6a box discipline -->

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
- ⚠ On the pc, **export `BUNYAN_PNPM_CMD` before every `agent-finish.mjs` run** — see `docs/RUNBOOK.md`.
- ⚠⚠ **`.prettierignore` LISTS PATHS.** A stale entry does not error — it silently stops exempting a
  file, and `format:check` is CI step 3, which failed silently for six sessions once already. **Move a
  prose doc, move its line, same commit.**

### §6a — BOX DISCIPLINE (owner ruling — binding)

**Full text: box-local `cross_projects_policy.md` §6/§6a.** The dev box is small (~3.7 GiB RAM + 2 GiB
swap) **and it is the production host for two live public sites — an OOM here can take the owner's
public sites offline.**

1. **Never run anything that would overload the box.** Constrain at the source (cap Docker memory, cap
   `-j`). If a run cannot be made safe, **escalate with the numbers.**
2. **PRE-AUTHORIZED to pause** (graceful `docker stop` only; never `kill`/`rm`/remove a volume; check
   that project's `docs/CURRENT_STATE.md` for active work; restore + verify after): **Planitor**,
   **Chantier_Manager** (`restart=no` — they will not come back on their own), **Portique_Designer**,
   **SmartBar**.
3. **⚠⚠ HARD LIMIT — NEVER, including under box strain:** `portfolio-caddy-1` (live `beam-stack.com` +
   `daoudi.beam-stack.com`) and `beamstack-contact` (real inbound leads). This box is their production
   box.
4. **Before pausing anything, `du -sh /tmp`** — it is tmpfs (RAM), and our own dead scratchpads are
   usually the hog.
5. **Record any pause + restore** in the box-local `last_session_work.md`.


---
