# Bunyan — `current_state.md`

**What this file is.** The **cross-session, cross-agent, cross-machine handoff log** for Bunyan. It
lives in the repo and travels with the code between the local PC (Amer) and the Hetzner dev box
(Zayd), per `cross_projects_policy.md` §9.

**Why it exists.** So the next agent does **not** have to re-derive context from scratch, does
**not** make false assumptions about what is built, and does **not** redo work that has already been
verified. If you are a fresh session: read §0 → §1 → §2 → the latest Entry, then work.

**How to use it.**
- **Read** §0–§4 and the newest Entry before touching anything.
- **Append** a new Entry when you finish a phase or a meaningful unit of work. Never rewrite history.
- **Record who validated what, and on which engine/environment.** A claim without a verification
  method is not done.
- Keep §2 (contract status), §3 (what exists) and §4 (open decisions) **current** — those are the
  three things a new agent gets wrong most easily.

---

## §0 — Orientation (read this first)

**What Bunyan is:** a browser-native, serverless, parametric BIM/CAD authoring platform. An exact
B-Rep kernel (OpenCascade/OCCT compiled to WebAssembly) computes geometry; the design is stored as a
*parametric recipe*, and meshes/2D views are disposable projections of it.

**Document reading order** (all in the repo root; they are the contract, this file is the status):

1. `core_logic.md` — the domain model. *What the app means.*
2. `architecture.md` — layers, worker protocol, registries, determinism. *How it is built.*
3. `V1.0.0_spec.md` — scope, decisions **D1–D18**, acceptance criteria. *What ships first.*
4. `v1.0.0_imp_plan.md` — the 7 phases and their exit criteria. *The build sequence.*

**Also in this repo, and NOT optional reading before a contract freeze:**

5. **`Miqdar_v1.0.0_spec.md`** (+ `Miqdar_normative_register.md`) — **the second product** (structural analysis & design; owner-ruled 2026-07-12/13, **§4g**). ⚠ **It lives here for exactly one reason: Bunyan's contract freezes must not foreclose it.** **P5 has a gate that points at its §3.4** (`v1.0.0_imp_plan.md` step 6a). It is **not** a Bunyan work item — Miqdar starts only after **Bunyan v1.0.0** ships.

⚠ **Version strings: always write "Bunyan v1.0.0" or "Miqdar v1.0.0" — never a bare "v1.0.0."** Two independently-versioned products now both have one, and this file exists to *remove* that kind of ambiguity, not create it. *(Miqdar M17.)*

**The one non-negotiable invariant:** B-Rep is the source of truth; the parametric recipe is the
source of truth for the B-Rep; meshes and 2D views are disposable. Everything else follows from it.

**The hardest idea (and the schedule risk):** persistent sub-shape naming (D1). Sub-shape identity is
*derived* from the operation DAG — a `SubShapeRef` is a derivation path (`nodeId` + `role` +
`occurrence`), never a geometric index. It is assigned when an op runs and propagated forward, never
recovered by matching geometry afterwards.

**Actors** (spec §12) — roles are by *environment*, not seniority:

| Actor | Where | Owns |
|---|---|---|
| **Architect** (the owner/human) | — | Contracts, scope, AEC correctness, merge arbitration. **All contract changes and all commits/pushes are owner-gated.** |
| **Amer** (agent) | Local PC, **real browser** | Browser hot path: three.js/WebGPU, tessellation consumer + picking, React shell, ribbon/property panels, commands/undo, persistence, service worker/PWA. |
| **Zayd** (agent) | Hetzner dev box, **headless** | Kernel: OCCT WASM builds, worker API, naming resolver, regression harness + offline golden seeding, IFC importer, CI, release pipeline. |

Also read the box-local `../cross_projects_policy.md` and `../last_session_work.md` **if you are on
the dev box** (they are not in this repo and do not travel).

---

## §1 — Where the build is right now

**Phase: P2 is CLOSED — the op set is complete AND the pre-freeze debt is now ZERO (Entry 15).** P3 is next, and the protocol freezes at its end.
The protocol seam, the kernel host, the mock, the client dispatcher, the harness, the goldens and the CI
definition all exist and are green; **Entry 7** made the OCCT WebAssembly kernel a first-class package
(`@bunyan/kernel-occt`); **Entry 9** made it a *modeller* (cylinder, boolean, fillet); **Entry 11** added
**`transform`**; **Entry 12** added **`extrude`** and **`chamfer`**; and **Entry 14** added **`revolve`**,
closed the three contract holes Entry 13's audit found, and **fixed the reason CI could never go green.**

```
pnpm verify  →  typecheck (strict) ✓   eslint ✓   139/139 tests ✓   prettier ✓      (was 136/136)
                └─ goldens run TWICE (mock + REAL OCCT 7.9.3); the hard shapes — a cylinder, a window
                   cut clean through a wall, a fillet, a rotated wall, a mirrored wall, an L-shaped
                   slab, a slab with a CURVED EDGE, a revolved column, a hollow tube, a HEMISPHERE and
                   a DUCT DRILLED THROUGH A ROUND COLUMN — are checked against a NATIVE OCCT reference
                   *and* an independent closed form.
```

**✅ THE THREE RULINGS ENTRY 14 WAS BLOCKED ON ARE MADE, AND BUILT (Entry 15):**
- **D28 — the BOUNDED POSITIONAL KEY is IN.** A duct now cuts **clean through a round column**. The key
  **orders** two sub-shapes that structure has already proven interchangeable, by their **mm-rounded
  centroid**; it **never identifies** one. It is the **only place geometry touches the identity path**, and a
  collision on the grid is still **refused**. ⚠ Its residual risk is bounded by a structural fact: `transform`
  mints no identities, so the key runs in the element's **own build frame** — **moving a column in the world
  cannot re-rank anything.**
- **D13 — what "frozen" forbids is now WRITTEN DOWN:** *adding* an op is additive and permitted; *changing an
  existing op's envelope* needs sign-off. **And `sectionCut` + `importIfc` are RESERVED** (declared, typed,
  deliberately unimplemented) — so **P6 no longer opens by amending a frozen contract.**
- **D29 — the BREP cache is DEFERRED to P3 step 4, on purpose**, to be decided **with the measured rebuild
  cost**. Every doc that promised the unbuilt file now marks it conditional.

**✅ COMMITTED AND PUSHED — `origin/main` @ `ee241df`.** Entries **11–14** had never left this box; Amer was
building against a kernel four generations old. He can now build against **real geometry**:
`@bunyan/kernel-occt/worker`.

**⚠ SEVEN THINGS A FRESH AGENT MUST NOT REDISCOVER THE HARD WAY:**

1. **`opencascade.js` CANNOT be linked on this box — and we do not use it.** Its `-flto` object cache
   forces a whole-program-optimisation link that is **OOM-killed at a 2 GB cap even for a 6-symbol
   build** (Entry 3). **Do not retry it. Do not fork it.** We build **upstream OCCT 7.9.3** with **LTO
   off** — recipe in **`tools/kernel-build/`**, and it builds *here*, on this box.
2. **`/tmp` is a tmpfs — it costs RAM, not disk.** A dead session's scratchpad was holding **1.1 GB of
   RAM** hostage. Before invoking §6a to pause another project's containers, run `du -sh /tmp` — our own
   tooling is usually the hog. (All other projects' containers **combined** use ~77 MB.)
3. **You do NOT need a 2.5 h rebuild to change the kernel's C++.** OCCT's static libs are already built
   at `/home/devuser/occt-wasm-spike/install` (18 libs, 119 MB). Changing `src/kernel.cpp` is a
   **single-file compile + link — about 60 seconds** (`link.sh`, step 3 of the README). Only an *OCCT
   version bump* costs 2.5 h. Entry 7 rebuilt the kernel four times in one session.
4. **OCCT's `Left/Right/Front/Back` do NOT mean what they sound like** — see the ⚠ in §3. Guessing that
   table mislabels four of a box's six faces, and **nothing fails**: the geometry is perfect and only
   the *names* are wrong.
5. **The naming literature is WRONG about OCCT 7.9.3, and we MEASURED it (Entry 9, D24).** Boolean
   history is **complete** — zero orphans. The weak spot is the **fillet**. And the relation everyone
   misses is **identity**: `Modified()` reports only *splits*, so an untouched face appears in **no
   history list at all** — that silence means *"unchanged"*, not *"unknown"*. **Do not re-derive this
   from the docs; re-run the probe** (`tools/kernel-build/probe.cpp`, ~60 s).
6. **⚠ "THE #1 RISK IS RETIRED" WAS TRUE OF THE CASES WE HAD MEASURED — AND THAT IS NOT THE SAME THING.**
   Entry 9 declared naming done. **Entry 11 cut a groove across a wall — a chase, an utterly ordinary
   BIM operation — and the kernel REFUSED IT**, because a groove splits one face into two with an
   identical derivation and *faces had no tie-break* (the edges had one; the faces were simply never
   given it). It was found by accident, by a `transform` test that used the API the way a building
   would. **The lesson is not "the resolver is fragile" — it is fine, and the fix was structural and
   additive. The lesson is that the probe only measures the shapes you think to cut.** Before trusting
   naming on a shape class nobody has cut yet, **cut it.**

6b. **⚠ AND THE FOURTH TIME (Entry 15): THE DOCS DESCRIBED A SHAPE NOBODY HAD ACTUALLY CUT.** Entry 14 and
   spec §4.5 both said the symmetric tie was *"the duct's two rims"*. **It is — but only if the duct misses
   the cylinder's SEAM.** OCCT puts the seam on the **+X meridian**, so a duct driven along **X** exits
   through it, splits the entry rim in two, and yields **three** rim edges. Entry 14's test cut along X, so
   the pair it pinned was the **split seam**, not the rims. Along **Y** you get the clean case. **The fix is
   not the point; the pattern is: even a measured, written-down finding describes only the shape someone
   actually cut.**

7. **⚠⚠ A PHASE'S EXIT CRITERIA ARE A SPECIFICATION, NOT A SUMMARY OF WHAT GOT DONE.** P2 step 1 says, in
   writing: *"make box/cylinder/**prism**, **extrude a profile**, **revolve**, boolean, **fillet/chamfer**"*.
   **`extrude`, `chamfer` and `revolve` were never built** — and P2 was declared complete **twice**, by two
   sessions, with a green suite each time. Nothing caught it because **every test built its walls out of
   boxes**, and a box needs no `extrude`. It surfaced only when Entry 12 sat down to **model an actual
   building** and could not build the **floor plate** — a Slab is *"planar boundary + thickness"* (spec §5)
   and a real plate is L-shaped, or five-sided, or curved. ⇒ **Before declaring a phase done, read its own
   step list against the code.** It takes a minute. This one went unread for a month.

**✅ THE CI MYSTERY IS SOLVED — AND IT WAS NEVER GREEN, BECAUSE IT *COULD NOT BE* (Entry 14).**
Fifteen entries assumed the only way to know was the Actions tab (no `gh`, no token, private repo ⇒ the
API 404s anonymously). **Wrong: CI's steps are just commands, and they run here.** Run in order, step 3
— **`pnpm format:check`, which runs BEFORE `pnpm test`** — **failed on the committed tree**: Entry 7 moved
the kernel into `packages/kernel-occt/wasm/` and never added emscripten's **generated glue** to
`.prettierignore`. **Every push since has failed at that step.** One line fixed it, and **all five CI steps
now pass on this box.** *(A human should still glance at the Actions tab once — but "unproven" was the
wrong word all along: it was disproven, and nobody ran the check.)*

---

## §2 — Contract status (get this wrong and you break the build model)

The **split contract-freeze** (decision D13) is the rule that lets Amer and Zayd work in parallel.

| Contract | Status | Freezes |
|---|---|---|
| **Kernel message protocol** (`@bunyan/protocol`: envelope, typed failures, provenance channel) | **Release-candidate, v1** — implemented, tested, *not yet frozen*. **18 live ops + 2 RESERVED** (`sectionCut`, `importIfc` — declared and typed, deliberately unimplemented, so P6 does not have to amend a frozen contract; D13, Entry 15).** Entry 7 added `measure`; Entry 9 added `makeCylinder`, `boolean`, `fillet`, the D23 query ops (`bounds`, `distance`, `classifyPoint`) and PLACEMENT (`at`); Entry 11 added `transform`; Entry 12 added `extrude` + `chamfer` (D26); **Entry 14 added `revolve` (D27) and gave `measure` its optional `ref`.** ✅ **The op set of P2 step 1 is COMPLETE, and the pre-freeze debt is ZERO (Entry 15).** The P6-vs-freeze contradiction is **settled**: D13 is re-worded (*adding* an op is permitted; *changing* an existing envelope needs sign-off) **and** the two ops P6 needs are **reserved**. | **End of P3.** After that, changing an existing op's envelope needs Architect sign-off; **adding a new op is additive and permitted (D13, as re-worded Entry 15).** |
| **`SubShapeRef`** | **Release-candidate** — now exercised by the REAL kernel, not just the mock | **P5**, after Wall + Opening exercise it. |
| **`BimObjectType`** | Not yet written | P5 |
| **`Command`** | Not yet written. ⚠ **Its shape is now RULED (D19–D23):** it carries an **`argsSchema`** and `execute` **returns** its `UndoableEdit`. It is **the agent API** — see §4f. | P5 (**with** its `argsSchema`) |
| **Agent surface** (`window.bunyan`) | Not yet written. **Versioned separately** (`agentApi: 1`) — does **not** inherit the P5 freeze (D22). | Never frozen with the type contracts; evolves on its own clock. |

**Practical consequence:** the protocol is *changeable today*, and after P3 only **additively**. The OpMap has
**18 live ops + 2 reserved**, and **nothing is missing any more**: both rulings that were owed — the P6
contradiction and the symmetric-tie/positional key — **were made and built in Entry 15 (D13, D28)**. ⚠ **What
is left before the freeze is P3's own work, not a debt from P2.**

⚠ **ENTRY 12 IS THE PROOF THAT THIS SECTION'S OLD CLAIM — "nothing is now known to be missing" — WAS
WRONG, AND THAT THE METHOD FOR FINDING OUT IS NOT READING.** That sentence was written after Entry 11
and it was false *when it was written*: `extrude` and `chamfer` had been sitting in P2 step 1's own
step list, unbuilt, the whole time. **Three sessions read `ops.ts` and saw nothing wrong. One session
tried to build a floor plate and found it in ten minutes.**

Every protocol gap this project has ever found was found **by using the API to build something**, never
by reading it:

| Gap | Found by |
|---|---|
| **`at`** (placement) | a boolean could otherwise only bite a *corner* off a wall — a window in the middle was unreachable |
| **the split-face naming bug** | a test that cut a **groove** across a wall, because that is what buildings have |
| **`extrude` / `chamfer`** | trying to model a **floor plate**, and finding a Slab cannot be a rectangle |
| **the SYMMETRIC-TIE hole** (a duct through a **round column**) — ✅ *fixed by D28, Entry 15* | building `revolve`, then cutting a **round** column the way a building would. Reachable since Entry 9; five sessions never hit it, because **every boolean ever tested cut a BOX** |
| **our own `bounds` was LOOSE on curved geometry** (`Add` bounds a spline by its CONTROL POLYGON) — ✅ *fixed, Entry 15* | gating the round column's geometry against the native-OCCT oracle. **Invisible for seven entries**: on a box, a cylinder or any plane, `Add` and `AddOptimal` agree exactly. The duct's rims are the suite's **first spline edges** |

**⇒ The way to de-risk the freeze is to keep modelling real buildings with the protocol until P3 ends.**
If it reveals another shape the protocol cannot express, **fix it now**, not after.

---

## §3 — What exists, and how it was verified

Repo layout (all new this session):

```
packages/
  protocol/       @bunyan/protocol      the flat versioned message contract (zero deps). 17 ops.
  kernel-core/    @bunyan/kernel-core   KernelHost (dispatch + failure marshalling) + ShapeRegistry
  kernel-mock/    @bunyan/kernel-mock   protocol-conformant fake kernel + Worker entry
                    ⚠ NO booleans — it says so in `capabilities` rather than faking one. It DOES answer
                    the geometric queries (closed-form for a box), so the agent path needs no wasm.
  kernel-occt/    @bunyan/kernel-occt   ★ THE REAL KERNEL — OCCT 7.9.3 in WASM + Worker entry
                    src/kernel.ts         the adapter: C++ STRUCTURE -> Bunyan IDENTITIES
                    src/naming.ts       ★ THE RESOLVER (D1/D24): 4 relations, no geometry, ever
                    wasm/bunyan-kernel.*  the COMMITTED artifact (14.19 MB / 4.13 MB gzip) + its .d.ts
  kernel-client/  @bunyan/kernel-client KernelClient + WorkerTransport / InProcessTransport
tests/            136 tests + tests/goldens/geometry.golden.json (14 cases) + tests/harness/measure.ts
                    golden-box.test.ts        every assertion runs against BOTH kernels
                    golden-hard-geometry.ts   cylinder / window-through-wall / fillet vs NATIVE OCCT
                    golden-extrude.test.ts  ★ L-shaped + CURVED-EDGE slab, chamfer — vs NATIVE OCCT *and*
                                              a closed form. The closed form is not decoration here: the
                                              oracle and the kernel get the SAME profile, so only a tier
                                              that works from the VERTICES can catch a wrong boundary.
                    naming-hard-topology.ts ★ identity, not millimetres. The wall-two-windows-resize test.
                    naming-extrude.test.ts  ★ `lateral.k` IS authored segment k — drag a slab's corner,
                                              every ref comes back byte-identical
                    golden-revolve.test.ts  ★ a revolved rectangle MEASURES IDENTICALLY to the makeCylinder
                                              primitive; a hollow tube (the history-less annuli); a
                                              HEMISPHERE from an arc (2/3 pi r^3); a 90-degree control WITH caps
                    naming-revolve.test.ts  ★ a column re-authored fatter+taller keeps every ref. AND pins
                                              the KNOWN REFUSAL: a duct through a round column (§5 task 1)
                    quantities-and-contract.test.ts  ★ measure(ref) = the paint area of a wall face;
                                              capabilities DERIVED from the handlers; INVALID_RESULT.
                    geometry-queries.test.ts  the D23 query ops, on BOTH kernels
                    occt-kernel.test.ts       the checks only the real kernel can fail
tools/kernel-build/ the OCCT->WASM recipe (README + configure.sh + src/kernel.cpp + link.sh + verify.mjs)
                    src/probe.cpp + probe.sh + probe-history.mjs  ★ THE NAMING PROBE (a measurement
                    instrument, NOT the kernel). Re-run it before changing any naming rule — ~60 s.
tools/oracle/     Python (uv): offline golden seeding — analytic + OCCT cross-check (now also
                  cylinder / boolean / fillet)
scripts/          check-reseed.mjs (the re-seed CI gate)
.github/workflows/ci.yml
```

### Where the kernel's `.wasm` lives (moved in Entry 7)

`packages/kernel-occt/wasm/` — **not** `tools/kernel-build/wasm/`. Owner ruling 10 ("commit the
`.wasm`") stands; only the location changed, so that **the package that ships the artifact owns it**
and a bundler can resolve it from inside the package root. `tools/kernel-build/` remains the recipe,
and `link.sh` still writes to a gitignored `dist/` that you copy across (README step 3).

### The architectural decision that shapes everything below

**The kernel is transport-agnostic.** `KernelHost.handle(request) → response` is a pure function that
knows nothing about Workers, `postMessage` or the DOM. The Worker file is a ~10-line transport shim.

Three payoffs, all real:
1. The entire kernel seam is **testable headlessly in Node** — which is why 41 tests run on a box
   with no browser, and why CI needs no browser either.
2. It is the **headless/server-side kernel north-star** made concrete rather than promised: moving
   the kernel to a server is a change of `Transport`, nothing else.
3. The mock and the real OCCT kernel are the **same interface**, so the harness written today runs
   unchanged against the WASM kernel in P2.

### Verified (Zayd, dev box, headless — 2026-07-11)

- **Protocol v1** (`packages/protocol`): envelope (`{protocolVersion, correlationId, op, payload}` →
  `ok|failure`), 15 typed failure codes, `SubShapeRef` encode/decode/compare, mesh + provenance
  channel, op map. *Verified:* 8 tests — token round-trip, hostile-token rejection (a malformed
  `scene.json` cannot yield a valid ref), deterministic ordering that is **not** locale-sensitive.
- **Typed-failure contract** (spec §6.4, D10): `handle()` **never throws**. *Verified:* 7 tests —
  malformed message, unknown op, version skew, invalid geometry params, and a **non-Error throw**
  (OCCT/Emscripten throws bare integers, not `Error`s — that test exists because the naive
  `catch (e: Error)` would have dropped it).
- **Kernel mock** (P2 step 0, the critical-path mitigation): emits an **analytically exact** box with
  a **complete provenance map** — 6 faces named by canonical slot, 12 edges each named by *the pair of
  faces that generate it* (a structural, FP-free, bijective naming). *Verified:* 6 provenance tests,
  incl. picked-triangle → correct face `SubShapeRef`, and no identity collision across objects.
- **Client dispatcher**: correlation ids, edit coalescing, cancellation, timeouts. *Verified:* 8
  tests, including **the superseded-result leak**: when a drag supersedes an in-flight rebuild, the
  client releases the orphaned `ShapeHandle` so the worker does not accumulate one dead solid per
  frame (spec §6.2).
- **Golden/invariant harness** (`tests/harness/measure.ts` + `tests/golden-box.test.ts`): the
  reference-build oracle + the closed-form sanity check + the regression snapshot + bounds + topology
  counts, scoped per §4a(2). *Verified:* 12 tests green against the mock.
- **Goldens** (`tests/goldens/geometry.golden.json`): 2 cases (a 3000×200×2500 mm wall box; a 100 m
  large-extent box per spec §6.5), seeded offline on the pinned env. **The native-OCCT reference and
  the closed form agree exactly** on both.
- **Re-seed gate** (`scripts/check-reseed.mjs`): *Verified by simulation both ways* — exits 1 when
  geometry changes without re-seeded goldens, exits 0 when both change.
- **Toolchain**: pnpm workspace, TypeScript strict (`noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `verbatimModuleSyntax`), eslint `strictTypeChecked`, prettier,
  vitest. `pnpm verify` runs the lot.

### Verified (Zayd, dev box, headless — 2026-07-12, Entry 7) — REAL GEOMETRY

- **`@bunyan/kernel-occt`**: OCCT 7.9.3 in WASM behind `KernelImplementation`. Ops: `makeBox`,
  **`measure`**, `tessellate`, `releaseShape`, `echo`, `demoFailure`. *Verified:* the **same golden
  assertions that gate the mock now gate it** — volume/area/edgeLength/counts/bounds **exact** against
  the native-OCCT goldens on both cases, with **zero changes to the assertions themselves**.
- **The `measure` op** (protocol + mock + OCCT): exact properties from **`BRepGProp`**, not from the
  mesh. *Verified:* exact on both goldens; a regression test pins `edgeLength` at 22,800 mm and
  explicitly asserts it is **not** 45,600 (the `LinearProperties` double-count, §4a(2)).
- **Persistent naming (D1) — the real thing, on real topology.** Faces are named from the **operation's
  own semantic accessors** (`BRepPrimAPI_MakeBox::BackFace()` …), never from coordinates. Edges are
  named **structurally**, as the canonical pair of the two faces that generate them — FP-free and a
  bijection for a box. Sub-shapes are **canonically re-sorted before identities are assigned** (D8), so
  OCCT's traversal order cannot leak into a name. *Verified:* 6 faces + 12 edges named, refs stable
  across rebuilds, and the snapshot is invariant to the box's dimensions.
- **⚠ The mock and the real kernel emit BYTE-IDENTICAL refs** for the same box, and identical
  structural snapshots. *Verified by a dedicated test.* This is what makes the mock→OCCT swap a
  one-line change for Amer: every `SubShapeRef` he stored against the mock still resolves.
- **The wireframe is real**: `tessellate` returns edge polylines read from the **same triangulation** as
  the shaded mesh (`BRep_Tool::PolygonOnTriangulation`), each carrying its edge's identity — so edges
  are drawable *and* pickable. *Verified:* 12 polylines, total length exactly 22,800 mm.
- **The WASM heap does not leak.** `releaseShape` frees the OCCT solid; the test asserts the registry's
  count against **`wasmLiveHandles()` — the WASM side's own independent count** (a registry agreeing
  with itself proves nothing). P2 exit criterion, discharged early.
- **Typed-failure contract on the REAL kernel** (D10): invalid params, a released handle, an OCCT
  `Standard_Failure` — all come back as typed `Fail`s, and the kernel stays usable afterwards. The C++
  now emits the protocol's own failure-code vocabulary, so the mapping is a lookup, not a guess.
- **One JS↔WASM crossing per op, not per element.** `tessellate` hands JS **`typed_memory_view`s**
  (zero-copy windows onto the mesh buffers) instead of embind `std::vector`s, which cost **one boundary
  crossing per element read** — ~1.8 M crossings per tessellation on a 200k-vertex model, every drag
  frame. ⚠ The views die on the next `tessellate` call; the adapter copies them out synchronously.

### ⚠ TWO OCCT TRAPS THIS SESSION FELL INTO — BOTH SILENT, BOTH CAUGHT BY THE HARNESS

1. **OCCT's `Left/Right/Front/Back` are NOT the axes you think.** Measured, not remembered:
   **`BackFace()` = x-min, `FrontFace()` = x-max, `LeftFace()` = y-min, `RightFace()` = y-max**
   (bottom/top are z-min/z-max as expected). The first version mapped **four of six faces to the wrong
   role** — and **nothing failed**: the geometry was perfect, only the *names* were lies. It would have
   surfaced much later as a window hosted on the wrong wall. `occt-kernel.test.ts` now re-measures this
   on every run ("role labels are honest").
2. **OCCT's bounding box is TOLERANT, not tight.** `BRepBndLib::Add` enlarges by the shape tolerance,
   so a box on the origin reports `xMin = -1e-7`. The spec wants the tight box ⇒ `box.SetGap(0.0)`.
   Caught by the goldens.

Both are *our* misreadings of an OCCT API — precisely the class of bug §9.0 says the harness exists for,
and precisely the class that a "we trust OCCT" scope would otherwise leave undefended.

### NOT verified / NOT built (do not assume otherwise)

- **No browser app.** `apps/web` does not exist. Deliberate: the browser hot path is Amer's, and I
  cannot verify browser code headlessly — shipping unverified rendering code into his territory would
  be worse than leaving it clean. The integration point he needs is in §5.
- **✅ DONE (Entry 9): the kernel is a MODELLER.** `makeBox`, `makeCylinder`, `boolean` (cut/fuse/common)
  and `fillet` — with **persistent naming verified on hard topology**, including the spec's designated
  hardest case (a fillet on an edge a boolean created). The resolver is `kernel-occt/src/naming.ts`.
- **✅ DONE (Entry 11): `transform`** — rotate / mirror / translate, applied in order. **It creates NO
  identities:** a rigid motion is a topological isomorphism, so the result's refs ARE the operand's refs,
  token for token. **A rotated wall is the same wall**, and the window hosted on it survives the
  rotation. It is the only shape-producing op with **no `nodeId`** — there is nothing for a node to own,
  and `composeTransformRefs` has no node in scope, so it *cannot* mint a ref even by accident.
  ⚠ **The mirror did NOT force the positional key** (spec §4.5). It was measured to be a clean
  isomorphism. **What nearly did was the split face** — and that was solved structurally. See Entry 11.
- **✅ DONE (Entry 12): `extrude` + `chamfer`** — an authored **`Profile`** (closed loop of line/arc
  segments, validated closed and non-self-intersecting) swept into a solid. **This is what makes the
  Slab, the Column and GenericSolid buildable at all** (spec §5); `makeBox` could express none of them.
  Faces are named **`lateral.k` after the AUTHORED segment index**, so dragging a slab's corner
  re-targets nothing (D26).
- **✅ DONE (Entry 14): `revolve`** — GenericSolid's other half, and the last op P2 step 1 named (D27).
  **It is NOT the prism with a rotation, and the probe is what said so** (cases 12-15): a full 360° turn has
  **no caps** — and OCCT's `FirstShape()`/`LastShape()` do **not** return null for one, they return a face
  **that is not in the result**, so a prism-style check refuses every column; each lateral face carries a
  **seam**, which here is **free** (it IS the authored profile edge, by identity — unlike the cylinder, which
  needed an accessor); and **⚠ a segment PERPENDICULAR to the axis reports NO HISTORY AT ALL while its face
  sits in the result** — the flat bottom of every column, the base of every dome. Those faces are named from
  **the circles their segment's endpoint vertices sweep**. Four goldens gate it against native OCCT *and* an
  independent closed form. **A revolved rectangle measures identically to the `makeCylinder` primitive.**
- **✅ DONE (Entry 14): the three Entry-13 contract holes.** `measure` takes an optional **`ref`** (the paint
  area of a wall face — quantities, P5's `quantities` hook, Miqdar's input); **`capabilities` is DERIVED**
  from the handler map in both kernels (it had drifted for two sessions) and tested; and **`INVALID_RESULT`
  is emitted at last** — `BRepCheck_Analyzer` gates the *output* of boolean, fillet, chamfer and revolve.
- **✅ DONE (Entry 15): D28 — THE BOUNDED POSITIONAL KEY. A duct now cuts CLEAN THROUGH A ROUND COLUMN.**
  A round column's lateral face **wraps all the way around**, so the duct enters and leaves through **the same
  face**, and the two rims are **genuinely topologically symmetric** (same derivation, same bounding faces,
  same endpoint signature). No structural rule reaches them. The owner ruled the key in; it **orders** the two
  rims by their **mm-rounded centroid** and **never identifies** either. It is the **third** sort term — after
  derivation and structural signature have both tied — and it is **the only place geometry touches the
  identity path** (`kernel.cpp`, `centroidKey`; `naming.ts` still reads no coordinate). A **collision on the
  grid is still refused** (spec §6.5). ⚠ **Accepted risk:** re-authoring the duct to the other side of the
  column swaps the two rims. ⚠ **Bounded by a structural fact:** `transform` mints no identities, so the key
  runs in the element's **own build frame** — **moving/rotating a column in the world cannot re-rank a tie.**
  Both pinned by tests.
- **✅ DONE (Entry 15): `sectionCut` + `importIfc` are RESERVED (D13).** Declared in `OpMap`/`OP_NAMES` with
  full payload types, **deliberately unimplemented** (no handler ⇒ absent from `capabilities`, answers
  `UNKNOWN_OP`). So **P6 no longer opens by amending a frozen contract.** `RESERVED_OPS`, pinned by a test.
- **⚠ DEFERRED BY RULING, NOT BY SILENCE (Entry 15): `geometry-cache.brep` (D29).** Still **zero code**. The
  ship/drop call is **P3 step 4, to be made WITH the measured rebuild cost** — the only thing it buys is load
  time, and that number cannot exist until the document model does. Every doc that promised the file now marks
  it **conditional**.
- **✅ FIXED (Entry 15): our `bounds` was LOOSE on curved geometry.** `BRepBndLib::Add` bounds a curve by its
  **control polygon**, and a spline's control points lie *outside* the curve — so a column of radius 400
  reported `x-min = -400.0071`. Invisible for seven entries because `Add` and `AddOptimal` agree **exactly** on
  boxes, cylinders and planes; the duct's rims are the suite's **first spline edges**. Now `AddOptimal`, which
  the oracle had used all along. *(Caught by the golden harness — our misuse of an OCCT API, never an OCCT
  defect. The pattern is now four-for-four.)*
- **No sweep along a path, no loft.** Not in v1.0.0 scope.
- **✅ CI: the mystery is solved, and the answer was "it could not have been green" (Entry 14).** Step 3,
  **`pnpm format:check`**, runs **before** `pnpm test` and **failed on the committed tree** — Entry 7 moved the
  kernel into `packages/kernel-occt/wasm/` and never added emscripten's **generated glue** to
  `.prettierignore`. One line. **All five CI steps now pass here.** *(Nobody needed the Actions tab: CI's steps
  are commands, and they run on this box. Fifteen entries said "someone must look" instead of looking.)*
- **No service worker / PWA, no Cloudflare Pages deploy, no COOP/COEP headers** (P1 steps 6–7).
- **No `.bimproj`, no document model, no registries** (P3).
- **No LICENSE / CLA / OCCT attribution file yet** (§4e — must land before the repo goes public).

---

## §4 — Decisions: what the owner has ruled, and what is still open

### 4a — RULED by the owner, 2026-07-11 (do not re-litigate; the docs now reflect these)

**(1) Golden-seeding toolchain: `cadquery-ocp`, not `pythonocc-core`. APPROVED.**
`pythonocc-core` is **not installable from PyPI** (abandoned `0.16` placeholder; real 7.9.x releases
are conda-only, and the box toolchain is `uv`). `cadquery-ocp==7.9.3.1.1` wraps the same OCCT 7.9,
installs cleanly, and is verified working headlessly (needs the `libgl1` system package).
*Applied to:* spec §2, §10, §12, D6; plan P1 step 2; `tools/oracle/`.

**(2) Verification scope: WE TRUST OCCT; WE VERIFY OUR OWN CODE. RULED.**
This is the important one, and it *narrows* the job rather than widening it. Validating OpenCascade
is **out of scope** — it is an industrial kernel, and auditing it would need a second independent
geometry engine we are not going to adopt. The harness exists solely to catch **our** bugs: a
mis-wired parameter, a wrong op or op order, a broken WASM build, a regression, a mistake in our own
measurement code. The prior spec's "independent kernel ⇒ certifies first-correctness" claim is
**withdrawn** (it was never true — OCP and our WASM build are the same OCCT).

The harness is therefore:
- **Reference-build oracle (primary)** — committed values from a **native OCCT build** (`cadquery-ocp`),
  seeded offline. Same kernel, *different binding, build and code path*, so a disagreement means
  **our** code is wrong. This is now the main gate.
- **Closed-form sanity check** — retained, but **demoted and re-purposed**. It is not there to audit
  OCCT. It guards the one layer the oracle above cannot: **our own measurement/seeding code**, which
  can ask the kernel the wrong question and get a confidently wrong answer. It has already earned
  this: on its first run it caught us reading OCCT's `LinearProperties` off a *solid* (which sums each
  edge once per adjoining face), reporting 45,600 mm of edge for a box whose edges total 22,800 mm.
  **Our** API misuse — exactly the target class. Without it, 45,600 would have been committed as the
  trusted golden and a *correct* implementation would later have failed CI against it. Where no closed
  form exists (a fillet on a boolean edge), this check simply does not apply and the oracle stands
  alone — explicitly acceptable.
- **Regression snapshots** — drift only, as before.

*Applied to:* spec **§9.0 (new) + §9.1**, D9 (rewritten); architecture §11; plan cross-cutting
practices; `tools/oracle/`; `tests/harness/measure.ts`.

**(3) Box discipline for heavy runs. RULED — and it is binding, see §6a.**
Never run anything that would overload the box. Pausing other projects' **non-production** services is
**pre-authorized**; the **live production containers are untouchable**. Full protocol in §6a and in
`v1.0.0_imp_plan.md` → Cross-cutting practices → *Box-discipline protocol*.

### 4e — THE BIG ONE: BUNYAN WILL BE OPEN SOURCE. RULED 2026-07-12.

**Licence: AGPL-3.0, dual-licensed with a commercial option.** Source public; anyone may use, study and
fork it; a commercial licence is sold to those who need to stay closed.

**Why AGPL and not GPL:** AGPL closes the *SaaS loophole*. Under plain GPL, a rival could take Bunyan,
improve it, and run it as a **hosted service** without publishing a line. AGPL forces them to publish.
**The moat was never the client code — it is hosted collaboration**, and AGPL is the licence that
protects precisely that. (Grafana / Mattermost model.)

**Three consequences, all large:**

1. **⚠ THE LGPL PROBLEM IS GONE. THE SIDE-MODULE TASK IS CANCELLED.** LGPL's relink obligation exists
   to guarantee a user can rebuild against their own OCCT — **public, buildable source satisfies that
   automatically** (clone the repo, rebuild). **⇒ The static link STANDS. We keep the 3.94 MB / 1.46 MB
   gzip artifact.** Do **not** build the side-module; do **not** ship object files. *(Ruling 8 of
   Entry 5, which mandated a side-module, is hereby **superseded** — it was made when Bunyan was
   assumed proprietary.)*
2. **Licence compatibility VERIFIED, not assumed.** OCCT is LGPL-2.1, and **LGPL-2.1 §3** expressly
   permits converting a copy of the library to the ordinary GPL — and states that if a newer GPL than
   v2 exists "you can specify that version instead." **⇒ OCCT is compatible with AGPL-3.0.** The
   combination is sound. *(LGPL still requires **prominent notice** that the product uses OCCT — put it
   in the README and the app's About screen.)*
3. **Public repo ⇒ CI budget problem also disappears.** Public GitHub repos get **unlimited Actions
   minutes** and the **4-vCPU / 16 GB** runners (the private-repo runner is 2 vCPU / 7 GB on 2,000
   min/month — see Entry 3 §5). This retires the "don't iterate the build recipe in CI" constraint,
   *once the repo goes public*.

**Timing: the repo goes public LATER, at a milestone** (working geometry + editor) — **not now.** Until
then it stays private and the 2,000-minute CI budget still applies.

**⚠ CLA IS A HARD PREREQUISITE — and it is easy to get wrong by waiting.** Dual-licensing only works if
the owner holds the rights to **every line**. The moment an external contribution is merged **without a
signed CLA**, that contributor holds copyright on it and it can **never** be included in a commercial
licence without their permission. **⇒ The CLA (contributors grant the owner a licence including the
right to relicense commercially) MUST be in place BEFORE the first external pull request.** Chosen
model: **CLA**, not DCO — a DCO certifies authorship but grants **no relicensing right**, which would
foreclose the commercial licence entirely.

**Not yet done (no rush, but do it before the repo is public):** add `LICENSE` (AGPL-3.0), the CLA,
AGPL headers, an OCCT attribution notice, and a `NOTICE`/third-party section. **None of this blocks the
kernel work.**

### 4f — THE SECOND BIG ONE: BUNYAN IS AGENT-NATIVE. RULED 2026-07-12 (Entry 8). **D19–D23.**

**The ruling in one line: there is ONE command layer, and humans and AI agents both act through it. There is no second API, and no actor bypasses it.**

**Why this was cheap, and why it stops being cheap soon.** The document model, the registries, the command layer and the undo stack **have not been written yet** (P3/P5). This was therefore a **greenfield decision on the one unbuilt layer** — not a retrofit. **It gets expensive the moment P4 lands**, because by then the UI's wiring is the app's architecture.

| # | Ruling | What it means in practice |
|---|---|---|
| **D19** | **One command layer for every actor** | Every action — a button, a drag, an agent verb — is a `Command`. **`DocumentContext` is the only holder of a `KernelClient`.** No React component, no agent, ever calls a kernel op. ⚠ *Every capability reachable only through the UI is a capability an agent can never have.* **Promoted to a north-star** (`core_logic.md` §9) and a **guiding principle** (spec §1). |
| **D20** | **Type-driven verbs; primitives are the escape hatch** | `createElement('core.wall.v1', {...})`, **not** "draw a rectangle then extrude it". **Free**, because a BIM Object Type already *is* the recipe from params to geometry. Composite verbs ("add a room") → **v1.0.x**. |
| **D21** | **Capability discovery is GENERATED from the registries** | `Command` gains an **`argsSchema`** (as `BimObjectType` has a `parameterSchema`). **One registry, three consumers:** ribbon, property panel, **agent tool list**. A hand-written agent doc would drift within weeks; a generated one *cannot*. **An agent needs no external documentation — it asks the app.** |
| **D22** | **`window.bunyan` first; MCP deferred to v1.0.x** | *"No complex setup" is a hard requirement, and an MCP bridge **is** that setup* (a download, a config file, a local process) — and it would puncture the client-only/zero-backend promise. `window.bunyan` **ships with the app: zero install.** MCP stays cheap later **because of D19** — it is another *transport* over the same verbs, not a second API. Surface **versioned separately** (`agentApi`). |
| **D23** | **Explore → act → verify** | Document queries read the **recipe** (no kernel op). **Geometric** queries are kernel ops and **must land before the P3 protocol freeze**. ⚠ **Queries return semantics, never triangles.** **Every command returns its `UndoableEdit`** — the diff undo needs and the diff an agent verifies with are the same object. **Transaction grouping is reserved**, not built. ⚠ **Agent commands opt out of edit-coalescing** (`SUPERSEDED` is meaningless to an agent). |

**⚠ THE ONE THING A FRESH AGENT MUST NOT GET WRONG HERE — two layers exist, and only one is the agent's:**

| | **Kernel ops** (`@bunyan/protocol`) | **Document commands** (P3) |
|---|---|---|
| Vocabulary | `makeBox`, `tessellate`, `measure` | `createElement`, `setProperty`, `queryElements` |
| Freezes | **end of P3** | **P5** |
| Who may call it | **`DocumentContext` only** | **every actor, human or agent** |

An agent calling `makeBox` directly would create a solid **no entity owns, no undo can remove, and no `SubShapeRef` names.** *The kernel is not an API surface; it is an implementation of one.*

**Why it is strategically load-bearing, not a nice-to-have.** It is the **same wedge as open source** (§4e): *"you will never lose access to your models, you can verify what the geometry engine does — **and an agent can drive it out of the box, because there is one public API and it is the same one the buttons use.**"* Revit cannot say that, and cannot cheaply start.

### 4d — RULED by the owner, 2026-07-12 (Entry 5)

**(8) LICENSING — ~~OCCT as a SWAPPABLE SIDE-MODULE~~. SUPERSEDED by §4e (open source).** Kept here
only so the reasoning is not re-derived: OCCT is **LGPL 2.1**, its "exception" covers only *header*
material (**not** general static linking), and a statically-linked proprietary `.wasm` would have
triggered a relink obligation. **Open-sourcing dissolves it.** **Do not build the side-module.**

**(9) THREADING — v1.0.0 SHIPS SINGLE-THREADED. RULED.** Multi-threading lands in v1.0.x. *Why:*
persistent naming (D1) is the #1 risk, and multi-threaded OCCT has **non-deterministic operation
ordering** that makes naming bugs far harder to reproduce. **Nail correctness on one core, then chase
speed.** Also avoids COOP/COEP cross-origin-isolation headers for now. This formally settles §4b(D).
*(D8 is therefore deferred, not cancelled — the canonical re-sort is still required when MT lands.)*

**(10) THE KERNEL `.wasm` IS COMMITTED. RULED.** `tools/kernel-build/wasm/` — ~4 MB, pinned by the
OCCT build id so it changes rarely. Amer and CI get **real geometry with no toolchain and no 2.5 h
build**. `.gitignore` now un-ignores exactly that path.

**(11) IFC IMPORT — EXACT SOLIDS via IfcOpenShell. RULED (direction, not a task yet).** Imported IFC
must become **true B-Rep solids**, not triangles — so imported walls can be measured, sectioned,
booleaned and edited parametrically. `web-ifc` (mesh-only) is **rejected**: it would break the core
invariant that B-Rep is the source of truth. **This is only possible because we own the OCCT build** —
IfcOpenShell is C++ and must link against *our* OCCT. **⇒ Do not adopt any kernel path that forecloses
linking a second C++ library.**

### 4c — RULED by the owner, 2026-07-11/12 (Entry 3)

**(4) Kernel build sequencing: CUSTOM BUILD FIRST.** Not the prebuilt `opencascade.js` drop-in. Ruled
against the Entry-2 recommendation, deliberately. *(This ruling stands, but the **means** changed — see
Entry 3: the custom build must now be an **upstream OCCT** build, not an `opencascade.js` one.)*

**(5) Commit & push: APPROVED and DONE.** `origin/main` @ `e5ff2fc`. **Amer is unblocked.**

**(6) The `measure` op: APPROVED** for P2, before the protocol freezes at the end of P3. Not yet
implemented (see §5).

**(7) The 1.1 GB `/tmp` reclamation: APPROVED.** See Entry 3 — `/tmp` is a **tmpfs (RAM-backed)** on
this box, and a dead session's throwaway venv was holding 1.1 GB of RAM hostage. Deleted. **This is a
standing box fact worth remembering: anything written to `/tmp` here consumes RAM, not disk.**

### 4g — THE THIRD BIG ONE: **MIQDAR — A SECOND PRODUCT.** RULED 2026-07-12/13 (Entry 10).

**In one line: Bunyan MODELS (everything, structural and architectural). Miqdar ANALYSES & DESIGNS (only).** Two products over shared DNA — the Revit ↔ Robot Structural Analysis relationship, except the link is built on **stable identity (D1)** and **one command layer (D19)**, the two things that make the incumbents' link chronically painful.

**⚠ Its spec lives IN THIS REPO on purpose:** **`Miqdar_v1.0.0_spec.md`** (+ **`Miqdar_normative_register.md`**). Not because Miqdar is built here — **Miqdar development starts only after Bunyan v1.0.0 ships** — but because **Bunyan's contract freezes must not foreclose it.** When Miqdar's repo exists, the spec moves and a pointer stays.

**The five rulings so far (full reasoning in the spec's §15 M-series):**

| # | Ruling |
|---|---|
| **M1** | Miqdar is a **separate product**: analysis & design only. Bidirectional, standalone-capable. *(2026-07-12)* |
| **M8** | **Jurisdictions: France, Morocco, Algeria** — the *editions* are NOT ruled; they live in the owner-editable **normative register** and are ratified before Miqdar's S3. *(2026-07-12; corrected 2026-07-13)* |
| **M9** | **Materials: RC + steel + prestressed.** Roads/bridges/tunnels → Miqdar 1.0.x domain modules. *(2026-07-12)* |
| **M11-b** | **Optimizer `maxUtilization`, default 0.90 — not 1.0.** Optimizing to the code minimum puts dozens of members on the boundary with a clean green sheet and no margin. *(2026-07-13)* |
| **M13** | ⚠ **MIQDAR IS CLOSED SOURCE.** **Bunyan open (AGPL) = the wedge; Miqdar proprietary = the moat.** *(2026-07-13)* |

**⚠⚠ TWO CONSEQUENCES THAT LAND ON *BUNYAN*, AND A FRESH AGENT MUST NOT MISS THEM:**

1. **THE P5 CONTRACT-FREEZE NOW HAS A MIQDAR GATE — `v1.0.0_imp_plan.md` P5 step 6a.** Before `BimObjectType`/`SubShapeRef`/`Command` freeze, open `Miqdar_v1.0.0_spec.md` **§3.4** and clear its rows. **The one that matters:** confirm `BimObjectType`'s **version+migration** mechanism suffices to add *optional analytical-hint fields* later (expected: **yes ⇒ reserve nothing**). If **no**, reserve one optional field **before the freeze**. *Domain rule 8 mandates this anyway — analysis & quantities is a declared north-star.* **Cost: minutes. Cost of skipping: a frozen contract that forecloses the north-star.**
   ⚠ **This is a RECURRING cost, and the first draft of Miqdar's spec was wrong to call it "zero"** — every future Bunyan contract freeze carries it, until the spec moves to Miqdar's repo.

2. **⚠ THE CLA IS NOW DOUBLY LOAD-BEARING — it protects MIQDAR, not just Bunyan's commercial licence.** A **closed** Miqdar sitting beside an **AGPL** Bunyan is safe **because the owner holds 100% of Bunyan's copyright** and can licence it to himself on any terms. **The moment one external PR merges without a signed CLA**, that contributor owns copyright on those lines (§4e) — and the owner's freedom to build a proprietary product against his own AGPL codebase gets murky. **§4e's CLA rule was already hard. It is now hard for two products.**

**What Miqdar may NEVER require of Bunyan** (so no future session negotiates it away): no analysis code inside Bunyan · no second Bunyan API (D19 forbids it) · **no coupling of release schedules** · no Bunyan feature gated on Miqdar. Miqdar wants a **`core.beam`** type — that is an **additive Bunyan 1.0.x** registration **on Bunyan's own schedule**. ⚠ **Do not add Beam to Bunyan v1.0.0 scope on Miqdar's account.**

**Bunyan is not slowed down by any of this.** The v1.0.0 plan is unchanged; the only new obligation is *minutes of review at P5*.

### 4b — STILL OPEN (needs an owner call before the next big move)

**(A) ~~Kernel build sequencing~~ — RULED (see 4c-4): custom build first.** Superseded by **(E)** and
**(F)** below, which are the *new* open questions that the custom-build ruling exposed.

**(B) ~~Commit & push~~ — DONE.** `origin/main` @ `e5ff2fc` (Entry 3).

**(C) A `measure` op — APPROVED (4c-6), NOT YET BUILT.** The harness currently derives
volume/area/length from the **tessellation**, which is exact only for **planar-faced** solids — so the
circular Column cannot be gated this way (a tessellated cylinder under-reports its volume by the chord
error). P2 needs a `measure` op backed by OCCT's `BRepGProp`. **The protocol freezes at the end of P3.**
Adding an op is a one-line change to the `OpMap` in `packages/protocol/src/ops.ts` (the single source of
truth — dispatcher, client and mock all derive from it), so this is cheap *now* and expensive later.

**(D) Awareness, not a decision yet.** Multi-threading (D8) drags real complexity behind it: COOP/COEP
headers, `SharedArrayBuffer` (blocked outright in some contexts), and non-deterministic boolean
ordering that the canonical re-sort must neutralise. If the MT build proves flaky, **shipping v1.0.0
single-threaded and adding MT in v1.0.x is a legitimate scope call.** Flagged now so it isn't discovered
under release pressure.

**(E) WHERE does the OCCT→WASM build run? — this is now the gating question.**
**This dev box cannot link an OCCT WASM build via `opencascade.js` — proven, not assumed** (Entry 3:
OOM-killed at a 2 GB cap even for a *minimal 6-symbol* build). The candidates, cheapest first:
- **This box, with an upstream-OCCT CMake build, LTO OFF, modelling modules only** — *untested, but now
  plausible*, because the OOM came from `opencascade.js`'s mandatory whole-program-optimisation (LTO)
  link over its prebuilt LTO-bitcode object cache. An upstream build lets us choose the flags. **Free
  if it works — test this first.**
- **A temporary Hetzner box** (4 vCPU / 8 GB, a few hours, pennies; the owner already uses Hetzner).
  Zero CI minutes, zero risk to the live sites, full speed. Build once, take the artifact, destroy it.
- **Amer's local PC**, if it has ≥8 GB free.
- **GitHub Actions** — see the corrected budget in **(F2)**. Best as the *final, rare, reproducible*
  build; **a bad place to iterate on the recipe.**

**(F) HOW do we build and bind it? — the fork question, answered.**
1. **Do NOT fork `opencascade.js`. Use upstream OCCT's OWN official WASM build.** The owner asked for a
   deep study of forking `opencascade.js` and swapping OCCT 7.6.2 → 7.9.3. Entry 3 did that study and
   found the fork **technically viable but unnecessary**: **OCCT 7.9.3 ships first-class emscripten
   support upstream** (`adm/scripts/wasm_build.sh`, `wasm_custom.sh.template`, `EMSCRIPTEN` handling
   throughout its CMake). Building from upstream gives everything the fork would have — **exact OCCT
   7.9.3, matching the oracle exactly** — *without* inheriting a project that has been **dormant since
   March 2023** (76 open issues, emscripten pinned at 3.1.14/2022), and *with* control of the compile
   flags, which is what unblocks **(E)**.
2. **GitHub Actions budget — CORRECTED.** Bunyan is a **private** repo, so `ubuntu-latest` is
   **2 vCPU / 7 GB** (the 4-vCPU/16 GB runner is **public** repos only) on **2,000 free minutes/month**.
   A full OCCT compile is **1–3 h ⇒ 60–180 min ⇒ 3–9% of the monthly budget per build.** *Mitigating
   fact:* the WASM kernel is **not a per-commit build** — the OCCT build id is stamped into every saved
   `.bimproj`, so it changes only on an OCCT version change. This is **a handful of builds ever**, not a
   treadmill. Ordinary CI (typecheck/lint/41 tests) is ~1–2 min/push and is irrelevant to the budget.
3. **Bindings: hand-written `embind` over the upstream build** *(recommendation)* — ~500–1000 lines of
   C++ exposing only Bunyan's ~10 ops. The alternative (`opencascade.js`'s libclang auto-generator)
   binds essentially *all* of OCCT: 8,975 binding objects, the bulk of its 3.6 GB object cache, and the
   reason the stock artifact is ~66 MB. Hand-binding is the direct lever on the **first-load size
   budget** (spec §8) and it needs **no OCCT patches at all**. **Owner asked to discuss before ruling.**
4. **Compile OCCT *out*, not just in.** OCCT's CMake `BUILD_MODULE_*` switches let us drop
   Visualization, DataExchange (STEP/IGES), OCAF and Draw wholesale — Bunyan renders with three.js and
   uses no OCAF (D1 is our own naming). Measured: **2,070 of 5,805 OCCT `.cxx` files are excludable**,
   leaving ~3,735 for the modelling core. Smaller build, less memory, smaller download.

---

## §5 — Next actions (in priority order)

**For Zayd (kernel/headless):**

> **✅ The old task 1 ("wire the kernel into `packages/kernel-occt`") is DONE — Entry 7.** The package
> exists, `measure` is in the protocol, and the golden harness gates real geometry.
> **⚠ The task before that ("measure the side-module cost") remains CANCELLED — see §4e.**

> **✅ Task 1 (persistent naming on hard topology) and task 1a (the geometric query ops) are BOTH DONE
> — Entry 9.** The kernel does cylinders, booleans and fillets; identities survive two windows and a
> resize; the query ops are in the protocol and in both kernels. **The #1 risk in the project is
> retired.** Do not redo it — and **do not re-derive OCCT's history behaviour from the docs: re-run the
> probe** (`tools/kernel-build/probe.cpp`, ~60 s), which is committed for exactly that reason.

> **✅ Task 1 (`transform`) is DONE — Entry 11.** Rotate/mirror/translate, in the protocol and the real
> kernel, with naming proven. **The mirror did not force the positional key** — it is a clean
> isomorphism. **A groove did force something else**, and that hole is now closed too. Do not redo this.

> **✅ `extrude` and `chamfer` are DONE — Entry 12.** A Slab can now be L-shaped, five-sided or curved;
> `lateral.k` names the face swept from **authored segment k**, so dragging a slab's corner re-targets
> nothing. Goldens seeded (analytic == native OCCT, including the arc). Do not redo this.

> ## ⚠⚠ READ THIS FIRST — **THE OPS ARE DONE, THE RULINGS ARE MADE, AND THE PRE-FREEZE DEBT IS ZERO.**
> Entry 14 built `revolve` and closed Entry 13's contract holes. **Entry 15 landed the three rulings that were
> owed** — the **positional key (D28)**, the **freeze's meaning (D13)**, and the **BREP cache deferral (D29)** —
> and **pushed Entries 11–14**, which had never left this box. **What is left before the protocol freezes is
> P3's own work.** Do not go looking for a missing op; there isn't one. **Go cut a shape nobody has cut.**

1. **⚠⚠ P3 — THE DOCUMENT MODEL. This is the work. The protocol freezes at its end.**
   The scene graph, the five registries, `.bimproj`, undo/redo as `UndoableEdit` deltas, and **the agent
   surface** (D19–D23 — there is no separate "agent phase", and there must never be one: the agent API *is*
   the Command registry).

   **⚠ THREE THINGS THE MEASUREMENTS ALREADY BOUGHT YOU — carry them in, do not rediscover them:**
   - **ONE SOLID PER ELEMENT. NEVER FUSE TWO ELEMENTS** *(measured, Entry 12)*. Fusing two walls at a corner
     re-owns **4 of the first wall's 6 faces** to the fuse node ⇒ **every window hosted on that wall breaks the
     moment a neighbour is joined to it**, retroactively, on a wall nobody edited. A boolean is an
     **intra**-element op (an L-shaped slab as a fuse of two boxes is fine — one element, one recipe). Corner
     joins are a **quantities/display** problem, and **v1.0.x**.
   - **⚠ THE BROKEN-REFERENCE STATE DOES NOT EXIST** *(Entry 13 §3b — the plan misfiles it under P2 step 7)*.
     `core_logic` **domain rule 3** is unambiguous: a reference is `resolved ↔ **broken**`, and a broken one is
     *"a first-class, visible state awaiting **manual retargeting**, never auto-healed."* **No such state
     exists anywhere in the codebase.** Today an unresolvable ref throws `UNRESOLVED_SUBSHAPE_REF` and **the
     whole operation fails** ⇒ **deleting a wall that hosts a window has no defined behaviour.** The promise
     *"predictable breakage beats silent wrongness"* is **half-kept**: the breakage is loud, but **a document
     cannot survive carrying one broken dependent.** **P5's Opening depends on this.**
   - **`DocumentContext` is the ONLY holder of a `KernelClient`** *(D19)* — enforce it with a lint rule or a
     package boundary, **not a comment**. Every capability the UI reaches by calling the kernel directly is a
     capability **an agent can never have**, and nobody finds out for a year.

2. **⚠ D29 IS DECIDED AT P3 STEP 4 — WITH THE NUMBER, WHICH IS THE WHOLE POINT OF THE DEFERRAL.**
   `geometry-cache.brep` has **zero code** and never had any. Build a realistic document (a few hundred
   elements), **time a cold load that rebuilds every solid from `scene.json`**, and rule on the measurement.
   - **Fast enough to hide behind a splash ⇒ DROP IT** — that deletes the serializer, the staleness path **and
     an entire attack surface** (a `.bimproj` is a file a user can be *sent*; the `.brep` is the one part fed
     as binary to OCCT's deserializer). Then `.bimproj`, `architecture.md` and the security rule **must stop
     claiming the file** — that edit is part of the decision.
   - **Not fast enough ⇒ BUILD IT** (`BRepTools::Write`/`Read`) and own the hostile-BREP hardening test.
   - It is **purely additive to a zip** either way, so v1.0.x can add it without breaking a saved file.
   **Record the number in this file.**

3. **⚠⚠ AND THE ONE THAT HAS PAID FOR ITSELF FOUR TIMES: KEEP MODELLING REAL BUILDINGS WITH THE PROTOCOL.**
   **Every** protocol and naming gap this project has ever found was found by *using* the API to build
   something a building actually has — **never by reading the code.** The score:

   | Gap | Found by |
   |---|---|
   | **`at`** (placement) | a boolean could otherwise only bite a *corner* off a wall |
   | **the split-face naming bug** | cutting a **groove** across a wall, because that is what buildings have |
   | **`extrude` / `chamfer`** | trying to model a **floor plate**, and finding a Slab cannot be a rectangle |
   | **the symmetric tie (D28)** | cutting a duct through a **round column** — five sessions missed it because **every boolean ever tested cut a BOX** |
   | **our loose `bounds`** | gating that round column's geometry — the suite's **first spline edges**, after seven entries of boxes and planes |

   **Walls that meet. A chase. A rotated wing. A window in a rotated wall. A stair. A roof. A duct through a
   beam.** **The fifth gap is out there.** *(⚠ The P5 Miqdar gate — §4g / plan step 6a — is a separate, later
   obligation. Do not confuse them.)*

4. **⚠ THE KERNEL IS 4.24 MB GZIP (was 1.47) — an owner call is due before P4, not before P3.**
   That is the price of the boolean/fillet code; `transform` + `extrude` + `chamfer` + `revolve` + D28
   together added **~0.11 MB**, which is noise, and it is mostly irreducible (`-Os` saves 1.5%). The levers,
   cheapest first: **(a)** accept it — the service worker caches it once and the app is offline-first
   thereafter (D11); **(b)** lazy-load the kernel behind the app shell so the UI paints first; **(c)** split
   it into core + booleans/fillet modules. Full reasoning in spec §8 and Entry 9 §5.

5. **Housekeeping, when convenient:** `LICENSE` (AGPL-3.0), the CLA, and the **OCCT attribution notice**
   LGPL requires (§4e). None of it blocks kernel work, all of it blocks going public.

> **✅ CLOSED, DO NOT REDO** — `revolve` (Entry 14, D27) · `measure(ref)` + derived `capabilities` +
> `INVALID_RESULT` (Entry 14) · **the positional key** (Entry 15, D28) · **the freeze's meaning + reserved
> ops** (Entry 15, D13) · **CI** — it was never green because it *could not* be, and one line fixed it
> (Entry 14; all five steps pass here). **`geometry-cache.brep` is not "open" — it is DEFERRED BY RULING to
> P3 step 4 (D29), and it needs a MEASUREMENT, not an opinion.**

**For Amer (browser hot path) — you can now render REAL GEOMETRY. The mock is no longer the only option.**

> ## ⚠⚠ READ THIS BEFORE THE CODE SAMPLE — IT CHANGED IN ENTRY 8 (owner ruling D19, §4f)
>
> **The sample below drives the kernel DIRECTLY. That is now correct ONLY as a kernel-integration proof — and WRONG as the shape of the app.**
>
> **In the app, no React component may hold a `KernelClient`.** Every UI action dispatches a **Command**; `DocumentContext` is the **only** module that talks to the kernel:
>
> ```
>   button / drag ─┐
>   agent verb ────┼──►  Command registry ──► DocumentContext ──► KernelClient ──► OCCT
>   MCP [v1.0.x] ──┘         the only door
> ```
>
> **Why (and it is not stylistic):** humans and AI agents act through the **same** command layer (D19). **Every capability you reach by calling the kernel directly from the UI is a capability an agent can never have** — and nobody discovers the gap until an agent is asked to use it, a year later. If the UI can do it, a Command must express it.
>
> **What this means for your sequence:** the Command layer is **P3**, and P3 comes *before* P4 in the plan. Build the shell against **Commands**, not against `KernelClient` — even if the first Command is a stub that wraps `makeBox`. ⚠ **P4's exit criteria now include a machine check that `KernelClient` is imported by `DocumentContext` and nothing else**, plus an **equivalence test**: *the same edit, performed by a human through the UI and by an agent through `window.bunyan`, must produce the same document state and the same `UndoableEdit`.*
>
> **Use the sample below to understand the kernel. Do not use it as the architecture.**

```ts
// ⚠ KERNEL-INTEGRATION PROOF — NOT the app's wiring (see the box above; D19).
//    In the app this lives INSIDE DocumentContext, behind the Command layer.
import { KernelClient, WorkerTransport } from '@bunyan/kernel-client';
import { faceRefForTriangle, decodeSubShapeRef } from '@bunyan/protocol';

// THE REAL OCCT KERNEL. (Swap for '@bunyan/kernel-mock/worker' to run without the 4 MB wasm —
// the two are interchangeable and emit IDENTICAL refs, which is asserted by a test.)
const worker = new Worker(new URL('@bunyan/kernel-occt/worker', import.meta.url), { type: 'module' });
const kernel = new KernelClient(new WorkerTransport(worker));

await kernel.handshake();                                   // → { name: 'occt', kernelVersion: '7.9.3' }
const shape = await kernel.request('makeBox', { nodeId: 'wall-1', dx: 3000, dy: 200, dz: 2500 });
const mesh  = await kernel.request('tessellate', { handle: shape.handle, deflection: 0.1 });
const qty   = await kernel.request('measure',    { handle: shape.handle });   // EXACT — for schedules

// mesh.positions / normals / indices  → three.js BufferGeometry
// mesh.edgePositions + provenance.edges → the WIREFRAME, and each polyline is PICKABLE
// mesh.provenance                     → RETAIN IT: this is what makes picking authorable
// on click: faceRefForTriangle(mesh, hit.faceIndex, decodeSubShapeRef) → a stable SubShapeRef
```

**Three things worth knowing:**
- **`measure` is exact, `mesh` is not.** Quantities/schedules must come from `measure` (it reads the
  B-Rep via `BRepGProp`). Measuring the triangles under-reports any curved solid by its chord error.
- **Booting the real kernel is async** — it instantiates a 4 MB `.wasm`. The worker queues messages
  during boot, so you can post immediately; just don't expect a synchronous first reply.
- Use `coalesceKey` on parameter edits (e.g. `{ coalesceKey: 'rebuild:wall-1' }`) — the client
  supersedes stale rebuilds and **releases the orphaned shape handles for you**, which on the real
  kernel is what stops a drag leaking one dead OCCT solid per frame.

Amer still owns: `apps/web` scaffold (Vite/React), the service worker + PWA (D11), and the
Cloudflare Pages deploy (P1 steps 6–7) — all still to do. *(No COOP/COEP `_headers` — v1.0.0 is
single-threaded, D8.)* **He now also owns the agent surface** — `window.bunyan` (D22), which is a
**thin shim over the Command registry**: if it needs logic of its own beyond marshalling, D19 has
been violated somewhere upstream.

---

## §6a — BOX DISCIPLINE (owner ruling, 2026-07-11 — binding, read before any heavy run)

**The fact that makes this non-negotiable:** the dev box is small (**~3.7 GiB RAM + 2 GiB swap**) **and
it is simultaneously the production host for two live public websites.** An out-of-memory event here
does not merely fail a build — **it can take the owner's public sites offline.** The OCCT→WASM build
(Docker + emscripten) is the heaviest thing this project will ever run.

**The rule: never run anything that would overload the box.**

1. **Check headroom** (`free -h`) and **constrain the run** — cap Docker memory, cap compiler
   parallelism (`-j`). A build that cannot balloon cannot take the box down.
2. **Free memory by pausing other projects' NON-production services — pre-authorized by the owner**
   for projects he is not actively using: **Planitor** (`planitor-pg`), **Chantier_Manager**
   (`chantier_test_pg`, `chantier_test_redis`), **Portique_Designer** (no containers), **SmartBar**.
   Graceful `docker stop` only — **never** `kill`, **never** `rm`, **never** remove a volume. Check that
   project's `current_state.md`/handoff for active work first.
3. **NEVER touch production. Not pause targets under any circumstance, including box strain:**

   | Container | What it is | Why it is untouchable |
   |---|---|---|
   | `portfolio-caddy-1` | Caddy, ports **80/443** | Serves the **live** `beam-stack.com` and `daoudi.beam-stack.com`. Stopping it takes both public sites offline. |
   | `beamstack-contact` | Lead-capture service | Handles **real inbound leads** and sends visitor-facing email. Stopping it drops real business enquiries. |

   These are light apps that use the dev box **as their production box** — cheap to leave running,
   expensive to interrupt. That is the opposite of the trade-off that justifies pausing anything else.
4. **Restore what you paused** as soon as the heavy run ends and verify it is healthy.
   ⚠ `chantier_test_pg` / `chantier_test_redis` are `restart=no` — they will **not** come back on their own.
5. **Record the pause + restore** in the box-local `last_session_work.md`.
6. **If a run cannot be made safe by the above, do not run it — escalate to the owner** with the memory
   numbers and the options.

Full box rules: box-local `cross_projects_policy.md` §3, §5, §6 (this ruling refines §6 for Bunyan).

---

## §6 — Environment & commands (dev box)

```bash
# Node toolchain — pnpm is installed at ~/.npm-global/bin (NOT on PATH by default):
export PATH="$HOME/.npm-global/bin:$PATH"
pnpm install
pnpm verify          # typecheck + lint + test  (the one command that must stay green)
pnpm test            # 62 tests, headless Node, ~2s — INCLUDING the real OCCT kernel

# Change the kernel's C++ and re-test: ~60 SECONDS, not 2.5 h. OCCT's static libs are already built.
SPIKE=$HOME/occt-wasm-spike   # box-local; holds occt/ source + build/ + install/ (18 libs, 119 MB)
REPO=$HOME/projects/Bunyan/tools/kernel-build
docker run --rm --memory=2g --cpus=2 --user "$(id -u):$(id -g)" \
  -v "$REPO:/work" -v "$SPIKE/install:/install:ro" \
  emscripten/emsdk:latest bash /work/link.sh          # compiles src/kernel.cpp + links
cp $REPO/dist/bunyan-kernel.{js,wasm} $HOME/projects/Bunyan/packages/kernel-occt/wasm/
pnpm verify                                            # the real gate

# Offline golden seeding (NEVER in CI) — needs uv at ~/.local/bin/uv:
cd tools/oracle
VIRTUAL_ENV=$PWD/.venv uv run seed-goldens ../../tests/goldens
```

⚠ **Only an OCCT *version bump* costs 2.5 h** (a full `cmake --build`, README step 2). Editing our own
`src/kernel.cpp` never does.

- **Node** 20.20.2, **pnpm** 10.34.5 (`~/.npm-global/bin/pnpm`), **uv** 0.11.20 (`~/.local/bin/uv`).
- **`libgl1` was installed on the box** (apt) — OCP pulls in VTK, which links `libGL.so.1`; without
  it `import OCP` fails on a headless box.
- No ports bound, no containers created, no other project touched by this work.
- Python: **no system pip/venv on this box** — always `uv` (`cross_projects_policy.md` §8).

---

## Entry 1 — 2026-07-11 — Zayd (dev box) — P1 ground work

**Task:** validate the plan, then build the P1 ground work; establish this handoff file.

**Plan verdict: endorsed.** The architecture is sound — the kernel behind a flat versioned protocol,
persistent naming as a day-1 subsystem, the split contract-freeze (D13), and the kernel-mock
critical-path mitigation are all well-judged. Three findings recorded in §4; one of them (the
`pythonocc-core` dependency) is a factual error in the plan that blocks P1 step 2 as written.

**Built** (all in §3, all verified headless): the `@bunyan/protocol` seam; the transport-agnostic
`KernelHost` with the never-throws failure contract; the `ShapeRegistry` handle lifecycle; the
protocol-conformant kernel **mock** with exact box geometry and a complete provenance map; the
`KernelClient` with coalescing, cancellation and superseded-handle release; the three-tier
golden/invariant harness; the offline oracle tooling (`uv` + `cadquery-ocp`); the seeded goldens; the
re-seed CI gate; the CI workflow; strict TS + lint + format.

**Verification:** `pnpm verify` green — strict typecheck, eslint `strictTypeChecked`, **41/41 tests**,
prettier clean. Goldens seeded on the pinned env (OCP 7.9.3.1.1 / Python 3.12); **tier 0 analytic and
tier 1 OCCT agree exactly** on both cases. Re-seed gate simulated in both directions. All on the dev
box, headless, Node 20 — **no browser was involved, and no claim here depends on one.**

**Notable:** the seed-time tier-0-vs-tier-1 cross-check caught a genuine measurement bug on its first
run (OCCT double-counting shared edges in `LinearProperties`), which is exactly the class of error the
spec's oracle tier is supposed to catch — and which a pythonocc-only oracle would have baked into the
goldens as truth. Fixed in `tools/oracle/src/bunyan_oracle/occt.py`.

**Not done / deliberately not started:** the OCCT WASM build (§4 item 3 — needs a timeboxed spike,
and it is the next critical-path task); `apps/web` (Amer's, and unverifiable headlessly); the service
worker/PWA and Cloudflare deploy (P1 steps 6–7).

**State:** working tree, **uncommitted** on `main` (commit/push owner-gated). Box: `libgl1` installed,
pnpm installed to `~/.npm-global`; no ports bound, no containers touched, no other project disturbed.

---

## Entry 2 — 2026-07-11 — Zayd (dev box) — owner rulings applied to the docs

**Task:** the owner ruled on the three findings from Entry 1; propagate the rulings into the spec, the
plan, the architecture doc, the tooling and this file, so no future agent works from the old framing.

**Rulings received (now recorded in §4a):**
1. **`cadquery-ocp` approved** as the golden-seeding oracle, replacing `pythonocc-core`.
2. **"No need to validate the kernel — we trust OCCT. We only need to validate our code."** This is a
   *narrowing* of scope and it settles the Entry-1 finding cleanly: the "independent oracle" ambition
   is dropped, the native-OCCT reference build becomes the **primary** oracle (it is precisely the
   right tool for catching *our* build/wiring errors), and the closed-form check is **kept but demoted**
   to guarding *our own measurement code* — a role it has already justified by catching our misuse of
   OCCT's `LinearProperties` (our bug, not OCCT's).
3. **Box discipline:** never overload the box; other projects' non-production services may be paused
   (Planitor / Chantier_Manager / Portique_Designer / SmartBar); the **live production containers**
   (`portfolio-caddy-1`, `beamstack-contact`) are **untouchable** — they serve the owner's public sites
   and real leads from this same box.

**Docs updated:**
- `V1.0.0_spec.md` — revision line + preamble; §2 tech-stack row; **new §9.0 "Scope of verification"**
  + rewritten §9.1 (with the `LinearProperties` worked example); §10; §12; **D6 and D9 rewritten** in §14.
- `architecture.md` — §11 testing architecture re-scoped; heavy-run/box note added.
- `v1.0.0_imp_plan.md` — revision line + pointer to this file; P1 step 2 corrected (with the `libgl1`
  system dependency); P1 step 3 flagged as the heaviest run; P1 step 8 + P1/P2 exit criteria re-worded;
  **new "Box-discipline protocol for heavy runs"** in Cross-cutting practices.
- `tools/oracle/` (README, `pyproject.toml`, `analytic.py`, `occt.py`, `seed.py`), `tests/harness/measure.ts`,
  `tests/golden-box.test.ts` — re-scoped and re-labelled to match.
- This file — §4 (rulings + what is still open), **new §6a (box discipline)**, §3/§5 updated.

**Verification:** goldens re-seeded on the pinned env (native OCCT and closed form still agree exactly on
both cases); `pnpm verify` green — strict typecheck, eslint, **41/41 tests**, prettier. `core_logic.md`
needed no change (it carries no verification/toolchain claims).

**Still open — needs an owner call (§4b):** **(A)** kernel build sequencing (prebuilt single-threaded
first vs. custom multi-threaded build first) — this gates the next task; **(B)** commit & push, which is
**blocking Amer** from starting the browser work in parallel; **(C)** the `measure` op before the
protocol freezes; **(D)** awareness that shipping v1.0.0 single-threaded is a legitimate fallback.

**State:** still **uncommitted** on `main`. No heavy runs performed; no containers stopped or started;
no ports bound; box untouched this session.

---

## Entry 3 — 2026-07-12 — Zayd (dev box) — pushed to GitHub; the OCCT→WASM build investigated to a hard stop

**Task:** act on the owner's rulings (custom build first; commit+push; add `measure`), then start the
OCCT→WASM build. The build did **not** happen — it was proven **impossible on this box**, and the
investigation the owner then asked for changed *what we should build in the first place*.

### 1. Owner rulings received and acted on

| Ruling | Status |
|---|---|
| **Custom build first** (not the prebuilt `opencascade.js` drop-in) | Stands — but the **means** changed, see §3 |
| **Commit + push** | **DONE** — `origin/main` @ **`e5ff2fc`**. **Amer is unblocked.** |
| **Add the `measure` op** in P2, before the P3 freeze | Approved; **not yet built** (§5 item 3) |
| **Delete the 1.1 GB stale `/tmp` scratchpad** | **DONE** — see §2 |

**Pushed** (`f658ad8..e5ff2fc`): the 4 packages, the harness, the goldens, the oracle tooling, the
re-seed gate, the CI workflow, the doc updates. One commit, git identity set **repo-locally** to match
the existing history (`narutousomaki741@example.com`) rather than box-wide.

### 2. A box fact worth more than it sounds: **`/tmp` is a tmpfs — it costs RAM, not disk**

Pre-flight for the heavy run found only **552 MB free RAM**, and — importantly — the other projects'
containers were **not** the cause: `planitor-pg` + both `chantier_test_*` + the two production
containers together used **~77 MB**. Pausing them (which §6a pre-authorises) would have bought
**almost nothing**.

The actual hog was **1.1 GB in `/tmp/claude-1000/…`** — a **dead Claude session's throwaway `.ocptest`
venv** (VTK + OCP wheels). `/tmp` on this box is a **tmpfs**, i.e. **RAM-backed**, so those files were
sitting in memory doing nothing. The real oracle venv lives on disk at `tools/oracle/.venv` (verified
importing OCP fine), so the `/tmp` copy was pure waste. **Owner approved deletion → available RAM went
1.4 GB → 2.4 GB.** Fourteen times what pausing every other project would have yielded, and it disturbed
nobody.

**Standing lesson for every future agent on this box:** *before* pausing another project under §6a,
check `du -sh /tmp` — our own tooling may be the thing eating the RAM. Shrinking your own footprint is
step 1 of the ladder for a reason.

### 3. THE HARD RESULT: **this box cannot link an OCCT WASM build via `opencascade.js`**

Not "it was slow" — **it is not possible**, and it is not a memory-cap tuning problem:

- Pulled `donalffons/opencascade.js:2.0.0-beta.b5ff984-multi-threaded` (**8.62 GB image**).
- Ran a **custom build** for Bunyan's real op set (box/cylinder/prism, boolean, fillet, mesh, GProp,
  bounds, topology traversal), Docker capped at **2 GB, no swap** → **OOM-killed (exit 137)** in the
  link step.
- Cut it to a **minimal 6-symbol build** (box + mesh + the bare topology needed to read it) →
  **OOM-killed again (exit 137).**

**Why:** `opencascade.js` compiles its whole prebuilt object cache with **`-flto`** (whole-program
optimisation). Its cache is **3.6 GB / 14,362 LLVM-bitcode objects** (5,805 OCCT sources + **8,975
auto-generated bindings**), so *any* link — however few symbols you ask for — is an **LTO link over
bitcode**, whose memory floor is above what this 3.7 GB box can spare while hosting live sites. The
symbol count is not the lever. **Do not retry this.**

*The memory cap did its job:* it killed the container, **not the box.** A monitor watched
`portfolio-caddy-1` and `beamstack-contact` throughout — **both stayed up the entire session**, RAM
never went critical, and **no other project's containers were stopped** (they weren't worth stopping —
see §2).

### 4. The fork study the owner asked for — and why the answer is "don't fork"

The owner asked: *fork `opencascade.js`, swap its internal OCCT 7.6.2 for 7.9.3, study it deeply.*
Done. **The fork is technically viable — every gate passes:**

1. **Layout compatible.** OCCT 7.9.3 keeps the per-package `src/` dirs (478 vs 448) and the `FILES`
   manifests the build system walks. `compileSources.py` just walks `/occt/src` — a path change.
2. **OCCT 7.9.3 compiles with the image's 2022 toolchain.** Tested emscripten 3.1.14 / clang 15 on 5
   representative files (`BRepPrimAPI_MakeBox`, `BRepAlgoAPI_Cut`, `BRepFilletAPI_MakeFillet`,
   `BRepGProp`, `BRepMesh_IncrementalMesh`) → **5/5 clean, ~2 s each.** clang 15 defaults to C++17,
   which is what OCCT 7.9 needs. **No C++ incompatibility.**
3. **The libclang binding generator parses 7.9.3 headers** — 167–407 classes resolved per header,
   **including `BRepTools_History`**, the class persistent naming (D1) depends on.
4. **The OCCT patches are nearly irrelevant.** There are only 2. They *fail* to apply to 7.9.3
   (upstream changed those files) — but they are **not needed to compile** (the compile test above used
   *unpatched* 7.9.3), and **5 of the 7 files they touch are visualisation classes** (`AIS`, `V3d`,
   `Graphic3d`) that **Bunyan never uses** (we render with three.js).

**…and yet forking is the wrong move, because chasing it found something better:**

> **OCCT 7.9.3 has first-class, official emscripten/WASM support upstream** — `adm/scripts/wasm_build.sh`,
> `wasm_custom.sh.template`, and `EMSCRIPTEN` handling throughout its `CMakeLists.txt`. **Verified.**

So we can build **upstream OCCT 7.9.3 → WASM with OCCT's own maintained build script** and get
*everything the fork would have given us* — **exact OCCT 7.9.3, which matches our `cadquery-ocp` oracle
exactly (7.9.3 ⟷ 7.9.3, zero version skew)** — **without** adopting a project that has been **dormant
since March 2023** (last commit 2023-03-27, 76 open issues, emscripten pinned at 3.1.14/2022), and
**with control of the compile flags — which is precisely what unblocks the OOM in §3** (turn LTO off).

It also lets us **compile OCCT *out***: CMake `BUILD_MODULE_*` switches drop Visualization,
DataExchange (STEP/IGES), OCAF and Draw wholesale. Measured: **2,070 of 5,805 OCCT `.cxx` files are
excludable**, leaving ~3,735 for the modelling core → smaller build, less memory, smaller download.

### 5. A correction I owe the record: the GitHub Actions numbers

I told the owner CI runners have **16 GB**. **That was wrong** — I asserted it from memory instead of
checking, and he was right to challenge it. **Bunyan is a private repo** (the API 404s anonymously), so:
- `ubuntu-latest` = **2 vCPU / 7 GB** (the 4-vCPU/16 GB runner is **public** repos only).
- **2,000 free Actions minutes/month.** A full OCCT compile (1–3 h) is **60–180 min ⇒ 3–9% of the
  monthly budget *per build***. Iterating a build recipe in CI would eat the month.
- **7 GB still clears the 2 GB wall** — CI *can* do what the box cannot.
- **The reframe that defuses the budget worry:** the WASM kernel is **not a per-commit build.** The
  OCCT build id is stamped into every saved `.bimproj`, so it changes only when OCCT changes — **a
  handful of builds ever, not a treadmill.** Ordinary CI (typecheck/lint/41 tests) is ~1–2 min/push.
  ⇒ **Iterate the recipe somewhere cheap; let CI do the rare, reproducible, final build.**

### 6. Verification

`pnpm verify` green — strict typecheck, eslint, **41/41 tests**, prettier. **Unchanged from Entry 2: no
production code was written this session.** Everything above is investigation, plus the push.

**⚠ CI has still never been observed green.** The push landed, but there is **no `gh` CLI and no GitHub
token on this box**, and the repo is private → the Actions API 404s anonymously. **A human must look at
the Actions tab** (or put a token on the box). Until then, CI remains *unproven* — exactly as it was in
Entry 1, and it is now the cheapest open item.

### 7. State / box hygiene

- **Committed + pushed:** `origin/main` @ `e5ff2fc`. Nothing uncommitted except this file's Entry-3 edits.
- **Docker image left on disk:** `donalffons/opencascade.js` (**8.62 GB**, disk 13 GB free). **Likely
  dead weight** if the owner takes the upstream-OCCT route (§4) — `docker rmi` it then. Kept for now
  only because the decision is open.
- **No containers stopped or started. No other project touched. No ports bound.** Live sites up
  throughout (monitored).
- Scratchpad OCCT source (294 MB) deleted from the RAM-backed `/tmp` — box left at **2.7 GB available**.

**Open for the owner (§4b):** **(E)** where the build runs — *test the lean upstream build on this box
first (free, plausible)*, else a temporary Hetzner box (pennies, zero CI minutes), Amer's PC, or CI;
**(F3)** hand-written `embind` vs the auto-generator — **the owner asked to discuss this rather than
have it ruled**; **(C)** the `measure` op, still unbuilt and still cheap until the P3 freeze.

*(Entry 4 answers (E) and (F): the build runs **here**, and the binding question dissolved.)*

---

## Entry 4 — 2026-07-12 — Zayd (dev box) — REAL OCCT GEOMETRY IN WASM. Spike green.

**The headline:** **upstream OCCT 7.9.3 now compiles, links and runs as WebAssembly on this box**, and
its geometry **matches the native-OCCT goldens exactly**. The kernel is real. Every blocker in Entry 3
is resolved, and it cost **zero CI minutes, zero rented machines, and zero risk to the live sites.**

```
Goldens seeded from: cadquery-ocp (native OCCT) 7.9.3.1.1
WASM kernel:         upstream OCCT 7.9.3 (this build)

box-wall-3000x200x2500      volume/area/edgeLength/counts .... ALL EXACT
box-large-extent-100m       volume/area/edgeLength/counts .... ALL EXACT
provenance                  12 triangles, 12 face tags ....... PASS
handle lifecycle            liveHandles -> 0 ................. PASS
failure contract            invalid params, no throw ......... PASS
✅ ALL CHECKS PASSED
```

### The architecture — the thing this spike actually proves

**JavaScript never touches OCCT.** The WASM module *is* the kernel: our C++ implements the ops
(`makeBox`, `measure`, `tessellate`, `releaseShape`), statically linked against OCCT. JS calls **our**
op set, not OCCT's API.

This is the opposite of `opencascade.js`, and the difference is not cosmetic:

| | `opencascade.js` | **Bunyan (this build)** |
|---|---|---|
| What JS calls | **all of OCCT's API** | **our ~10 ops** |
| Where geometry logic lives | JavaScript | **C++, inside the WASM** |
| JS↔WASM boundary crossings | **one per OCCT call** (thousands/rebuild) | **one per op** |
| Artifact (raw / gzip) | 62.8 MB / **13.1 MB** | **3.94 MB / 1.46 MB** |
| OCCT version | 7.6.2 (2022) | **7.9.3 — matches the oracle exactly** |
| Links on this box? | **No — OOM, even at 6 symbols** | **Yes** |
| Can IfcOpenShell link against it? | No | **Yes** |

**⇒ 9× smaller over the wire, and it grows by C++ ops rather than by binding surface.** The linker
keeps only OCCT code our ops actually reach, so the artifact tracks what we *use*, not what OCCT *has*.

**This dissolves §4b(F3).** "Hand-written bindings vs auto-generated" was the wrong question: we bind
**our protocol seam**, not OCCT. The JS surface stays small and stable no matter how far the product
grows. Growth to Revit parity = **more C++ ops** (sweeps, HLR drawings, shape healing, IFC import).

### The build recipe (reproducible; lives at `/home/devuser/occt-wasm-spike/`)

- **Toolchain:** `emscripten/emsdk:latest` — **emcc 6.0.2**, cmake 3.28 *(vs opencascade.js's 2022 emcc 3.1.14)*.
- **Source:** upstream OCCT **7.9.3** (`V7_9_3`), unpatched. *(The 2 patches opencascade.js needs are
  irrelevant here — they were generator hints, mostly for visualisation classes we don't build.)*
- **`configure.sh`** — the two load-bearing choices:
  1. **NO LTO.** Whole-program optimisation over LLVM bitcode is exactly what OOM-killed every
     `opencascade.js` link (Entry 3). Plain `-O2` links in a fraction of the memory. **This is the
     single change that made the box viable.**
  2. **Modelling toolkits only** — `BUILD_MODULE_Visualization/ApplicationFramework/DataExchange/Draw=OFF`,
     `USE_FREETYPE/TK/TCL/OPENGL/VTK/RAPIDJSON=OFF`. 18 toolkits, 93 MB of static libs:
     `TKernel TKMath TKG2d TKG3d TKGeomBase TKGeomAlgo TKBRep TKTopAlgo TKPrim TKBO TKBool TKFillet
     TKOffset TKShHealing TKMesh TKHLR TKFeat TKXMesh`
     **Note `TKHLR`** — hidden-line removal, i.e. **plans/sections/elevations**. **`TKOffset`** — wall
     layers/shelling. **`TKShHealing`** — repairing imported geometry. The Revit-competitor set is in.
- **Cost:** ~2.5 h compile, 2 cores, **capped at 2 GB** — memory never exceeded ~1.4 GB in use.
  Link: **seconds**, well inside the cap.
- **`kernel.cpp`** — our ops + the embind surface. **`verify.mjs`** — judges the build against
  `tests/goldens/geometry.golden.json`.

### The `measure` op is real (§4b C is now buildable, not theoretical)

Implemented via **`BRepGProp`** — exact volume/area, *not* derived from the tessellation. So a circular
column will be measured exactly instead of under-reported by its chord error. **Edge length is summed
over UNIQUE edges** (`TopExp::MapShapes`), deliberately: `BRepGProp::LinearProperties` on a *solid*
counts each edge once per adjoining face and reports 45,600 mm for a box whose edges total 22,800 mm —
the exact bug the closed-form tier caught at seeding time (§4a(2)). It is **our** API misuse, not an
OCCT defect, and the new kernel does not repeat it: **edgeLength came back 22,800. Exact.**

### ⚠ NEW — LICENSING. Needs an owner decision, and it is not a technicality.

**OCCT is LGPL 2.1.** Its "OCCT exception" is **narrower than it sounds** — I read the text: it only
permits *header* material to appear in your object code. It is **not** a general static-linking
exemption.

A WASM app is **one statically-linked binary** — OCCT is baked into our `.wasm`. Under LGPL 2.1,
shipping proprietary software with the library statically linked obliges you to let users **relink
against their own modified OCCT**. Options:
1. **Ship our kernel's object files** alongside the app (compiled objects, **not** our source), so a
   user *could* relink. Standard, well-trodden; keeps our source proprietary. A release chore.
2. **Buy a commercial licence** from Open Cascade (they sell exactly this exemption). Costs money.
3. **Load OCCT as a separate swappable WASM side-module.** Cleanest legally; more complex; costs some
   performance. **⚠ Would change the build architecture — so decide before we harden it.**
4. **Open-source Bunyan** under a compatible licence.

**This applies to every path** — `opencascade.js`, a fork, or this build. It is OCCT's licence, not a
consequence of the architecture. Spec §11 already schedules a licensing review at release; **pull it
forward.** *(Not legal advice — this needs a real call, possibly a lawyer.)*

### An honest correction

I earlier let "**66 MB**" carry an argument. The real number is **62.8 MB raw but ~13.1 MB gzipped** —
what a browser actually downloads. The size case was **weaker than I implied**; the architectural case
(boundary crossings, IfcOpenShell linkage, 3-years-stale booleans) is what actually wins. Our build
still beats it **9× over the wire** — but that is the *result*, not the argument.

### State

- **Not yet wired into the repo.** `packages/kernel-occt` does **not** exist yet; the spike lives at
  `/home/devuser/occt-wasm-spike/` (box-local, **not** in git). `pnpm verify` still **41/41 green,
  unchanged** — no production code was touched this session.
- **Next:** wire the artifact in as `packages/kernel-occt` behind `KernelImplementation`, and
  `tests/golden-box.test.ts` starts certifying **real geometry with zero test changes**.
- **`donalffons/opencascade.js` image DELETED** (8.62 GB reclaimed) — we are not using it.
- Live sites up throughout (monitored). No other project touched. No ports bound. Disk 18 GB free.

---

## Entry 5 — 2026-07-12 — Zayd (dev box) — four owner rulings; kernel + recipe committed

**Task:** put the Entry-4 kernel on a durable footing and take the design decisions the spike exposed.

### The kernel and its recipe are now IN THE REPO — `origin/main` @ `d54ae02`

`tools/kernel-build/` — `README.md` (the full build recipe + the architecture rationale),
`configure.sh`, `src/kernel.cpp`, `link.sh`, `verify.mjs`, and the **committed artifact**
`wasm/bunyan-kernel.{js,wasm}`. Previously the work existed **only** on this box
(`/home/devuser/occt-wasm-spike/`, still there as the working tree) and a box wipe would have lost it.
**`pnpm verify` unchanged: 41/41 green** — the build lives under `tools/`, which is not a pnpm workspace
glob, so nothing in the toolchain moved.

### Four rulings (full text in §4d — READ IT)

| # | Ruling | Status |
|---|---|---|
| **8** | **Licensing: OCCT as a swappable SIDE-MODULE** | ⚠ **Ruled, NOT built — MEASURE FIRST** |
| **9** | **v1.0.0 ships SINGLE-THREADED**; MT in v1.0.x | Ruled. Matches the current build. Settles §4b(D). |
| **10** | **Commit the kernel `.wasm`** | **Done** (`tools/kernel-build/wasm/`, `.gitignore` updated) |
| **11** | **IFC import = EXACT SOLIDS via IfcOpenShell** | Ruled as *direction*. `web-ifc` (mesh-only) **rejected.** |

### ⚠ The one thing the next session must not get wrong

**Ruling 8 (side-module) has a cost the owner was explicitly warned about, and it is not yet
quantified.** The static link is 3.94 MB **because the linker discarded every part of OCCT our ops
never touch.** A *swappable* module must keep whatever a caller *might* call — that is what makes it
swappable — so **it cannot be dead-stripped the same way.** The artifact could plausibly go from
**3.94 MB → tens of MB**, plus a boundary performance cost.

**⇒ Task 1 in §5 is: prototype the side-module split, MEASURE size + op latency, and report the
numbers.** If the cost is mild, adopt it. **If it is brutal, take the numbers back to the owner** and
weigh them against **option 1 (ship our compiled object files)** — which achieves the same legal end
(the LGPL relink obligation) at **zero size cost**; it is a *promise* of relinkability rather than a
*demonstration* of it. **Do not silently absorb a 10× regression on the owner's behalf, and do not
quietly ignore his ruling either — bring him data.**

### Why single-threaded is the right call (ruling 9), recorded so it isn't re-litigated

Multi-threaded OCCT has **non-deterministic operation ordering**. Persistent naming (D1) is the **#1
risk in the project**, and debugging naming on top of a non-deterministic kernel is strictly harder.
**Get correctness right on one core; then chase speed.** It also defers the COOP/COEP cross-origin
isolation headers, which restrict what the page may embed. D8 is **deferred, not cancelled** — the
canonical re-sort is still required when MT lands.

### Why IfcOpenShell, not web-ifc (ruling 11)

`web-ifc` returns **triangles**. Triangles cannot be reliably measured, sectioned, booleaned or
parametrically edited — so an imported model would be a *backdrop*, not a *building*, and it would
break the core invariant that **B-Rep is the source of truth**. IfcOpenShell returns **exact solids**,
and it is C++ that **must link against our OCCT build** — possible **only because we own the build**.
**⇒ Never adopt a kernel path that forecloses linking a second C++ library.** (This retroactively
justifies rejecting both `opencascade.js` and the fork: neither could have absorbed IfcOpenShell.)

### State

- **`origin/main` @ `d54ae02`.** Working tree clean apart from this file.
- **Kernel NOT yet wired into `packages/kernel-occt`** (that package still does not exist) — §5 task 2.
- **CI still never observed green** (no `gh`, no token, private repo) — §5 task 4.
- Box: live sites up throughout, no other project touched, no ports bound, disk 18 GB free,
  RAM ~2.7 GB available. Build tree kept at `/home/devuser/occt-wasm-spike/` (box-local; the repo now
  carries everything needed to rebuild it from scratch).

---

## Entry 6 — 2026-07-12 — Owner ruling — **BUNYAN WILL BE OPEN SOURCE (AGPL-3.0 + commercial)**

**This is a strategy ruling, and it supersedes a technical one made hours earlier.** Full text in
**§4e**; this entry records the reasoning so it is never re-derived.

### The ruling

**AGPL-3.0, dual-licensed with a commercial option.** Source public; a commercial licence is sold to
anyone who needs to stay closed. **Repo goes public LATER, at a milestone** (working geometry +
editor) — not now. **A CLA (not a DCO) is mandatory** before the first external contribution.

### Why it matters far beyond licensing

**1. It CANCELS the side-module work (Entry 5, ruling 8).** That ruling was made under the assumption
that Bunyan would be proprietary. LGPL 2.1's relink obligation exists so a user can rebuild the app
against their own OCCT — and **public, buildable source satisfies that automatically.** So:
**the static link stands, and we keep the 3.94 MB / 1.46 MB-gzip artifact.** The predicted regression
(a side module cannot be dead-stripped, so the artifact could have ballooned to tens of MB) **never
has to be paid.** *Do not build a side-module. Do not ship object files.*

**2. Licence compatibility was VERIFIED, not assumed.** OCCT is **LGPL-2.1**. Its **§3** expressly
permits converting a copy of the library to the ordinary GPL, and adds that if a GPL newer than v2
exists, "you can specify that version instead." **⇒ OCCT composes legally with AGPL-3.0.** *(LGPL still
demands **prominent notice** that the product uses OCCT — README + the app's About screen.)*

**3. It retires the CI-budget constraint.** Public repos get **unlimited Actions minutes** and the
**4-vCPU / 16 GB** runners — versus 2 vCPU / 7 GB on 2,000 min/month for a private repo (Entry 3 §5).
The "never iterate a build recipe in CI" rule expires **when the repo goes public**, not before.

### Why AGPL rather than GPL

AGPL closes the **SaaS loophole**. Under plain GPL a rival could take Bunyan, improve it, and run it as
a **hosted service** while publishing nothing. AGPL compels them to publish. **The moat was never the
client code — it is hosted collaboration**, and AGPL is the licence that defends exactly that.

### ⚠ The CLA trap — the one thing that can silently kill the commercial licence

Dual-licensing requires the owner to hold rights to **every line**. The instant an external
contribution is merged **without a signed CLA**, that contributor owns the copyright to their patch and
it can **never** be sold under a commercial licence without their consent. **⇒ The CLA must exist
BEFORE the first external pull request.** A **DCO would not do** — it certifies authorship but grants
**no relicensing right**, which would foreclose the business model. Chosen: **CLA**.

### The strategic reasoning (recorded so it is not re-litigated)

We cannot out-feature Revit — Autodesk has 30 years, thousands of engineers and a content ecosystem.
**We win where Revit is hated:** lock-in, subscription pricing, an opaque format, a heavy Windows
install. Browser-native + IFC-native + no install is the wedge — and **openness is not a footnote to
that wedge, it IS the wedge** ("you will never lose access to your models, and you can verify what the
geometry engine does"). It also buys the one thing a small team cannot build alone: **an ecosystem** —
content, plugins, national standards. AEC already has a strong open-source culture (IFC itself,
IfcOpenShell — which is LGPL and which we have already committed to using). The gap is real: today's
open-source BIM is Blender-based desktop; the browser-native BIM startups are all proprietary.

### Not yet done (does NOT block kernel work; must land before the repo goes public)

`LICENSE` (AGPL-3.0) · the CLA · AGPL file headers · **OCCT attribution notice** (LGPL requires it) ·
a `NOTICE` / third-party licence section.

---

## Entry 7 — 2026-07-12 — Zayd (dev box) — THE KERNEL IS WIRED IN. Real geometry is now gated by the test suite.

**Task:** §5 task 1 — wire the OCCT WASM kernel into `packages/kernel-occt` behind
`KernelImplementation`, add the owner-approved `measure` op before the P3 freeze, and make the golden
harness certify real geometry.

**Done, and then some.** The promise Entry 4 made — *"the instant it answers, `golden-box.test.ts`
certifies real geometry with ZERO test changes"* — **was kept, and it paid out twice: the harness
immediately caught two real bugs in our own code.**

```
pnpm verify  →  typecheck ✓  eslint ✓  62/62 tests ✓  prettier ✓     (was 41/41, mock-only)
                every golden assertion now runs TWICE — once on the mock, once on REAL OCCT 7.9.3
```

### 1. What was built

- **`@bunyan/kernel-occt`** — the real kernel as a first-class package: the WASM adapter, a `worker.ts`
  transport shim (so Amer changes a URL and nothing else), hand-written types for the entire JS↔WASM
  surface, and the committed artifact.
- **The `measure` op** — in the protocol (`OpMap` is now 7 ops), in the mock (closed-form), and in the
  OCCT kernel (**`BRepGProp`** — exact, *not* read off the triangles). **§4b(C) is closed.** This is
  what will let a circular column be gated at all: its tessellation under-reports its volume by the
  chord error, so a quantity schedule built on the mesh would under-bill every column in the project.
- **Persistent naming (D1) on real OCCT topology** — see §3. Faces named from the **operation's own
  accessors**; edges named **structurally** as the canonical pair of generating faces; a **canonical
  re-sort before identities are assigned** (D8), so OCCT's traversal order cannot leak into a name.
- **The wireframe** — `tessellate` now returns edge polylines from the *same* triangulation as the
  shaded mesh, each carrying its edge's identity. Edges are drawable **and** pickable. (The protocol
  always demanded this; the C++ was not yet supplying it, so the real kernel could not have satisfied
  the existing goldens at all — `edgeLength` would have been 0.)
- **`tests/occt-kernel.test.ts`** — the checks only the real kernel can fail: role honesty, provenance
  coverage, the WASM-heap leak canary, the typed-failure contract, `measure` exactness. Ported from
  `verify.mjs`, which only ever ran when someone remembered to run it. **These now run on every push.**

### 2. ⚠ THE TWO BUGS THE HARNESS CAUGHT — both silent, both OURS, both in the naming path

**(a) OCCT's `Left/Right/Front/Back` are not the axes they sound like.** I mapped them from the API's
names. **Four of the six faces were wrong.** Measured truth: **`BackFace()` = x-min, `FrontFace()` =
x-max, `LeftFace()` = y-min, `RightFace()` = y-max.**

**Nothing failed.** Every number was exact — volume, area, edge length, counts, bounds. The geometry
was perfect and **only the NAMES were lies.** It would have surfaced weeks later as a window hosted on
the wrong wall, or an opening that jumped when a wall was resized, and it would have been *very* hard
to trace back to a translation table in `kernel.cpp`.

The fix is a label table, not a rule change: **identity is still derived from the operation** (we ask
`BRepPrimAPI_MakeBox` which face is which), never from coordinates. `occt-kernel.test.ts` now
**re-measures the labels on every run** and fails if a name lies. *Checking a label against geometry is
not deriving identity from geometry* — and it is exactly the kind of check §9.0 exists to justify.

**(b) OCCT's bounding box is TOLERANT, not tight.** `BRepBndLib::Add` enlarges by the shape tolerance,
so a box on the origin reports `xMin = -1e-7`. The goldens caught it; `box.SetGap(0.0)` fixes it.

**Both are *our* misreadings of an OCCT API — not OCCT defects.** That is the entire thesis of the
owner's §9.0 ruling ("we trust OCCT; we verify our own code"), and this session is the third time it
has been vindicated (after `LinearProperties` at seed time). **The ruling is earning its keep.**

### 3. The property that makes the mock worth having kept

**The mock and the real kernel emit BYTE-IDENTICAL refs for the same box**, and identical structural
snapshots. There is a test that asserts it.

This is not a curiosity — it is the whole return on the critical-path mitigation (spec §12). Amer built
against the mock; every `SubShapeRef` he stored, every pick handler he wrote, keeps working unchanged
against real OCCT. Had the two disagreed, every file authored against the mock would have silently
re-targeted the day the real kernel shipped.

### 4. One architectural correction I made rather than inherit

The obvious way to return a mesh over embind is a `std::vector`. **Reading one costs a JS↔WASM crossing
per element** — a 200k-vertex model would pay ~1.8 M crossings per tessellation, on every drag frame.
That would have quietly reintroduced the exact per-element boundary cost this architecture's whole
pitch is about avoiding (Entry 4's table brags "one crossing per op" — it would have been a lie).

`tessellate` now returns **`typed_memory_view`s** — zero-copy windows onto the mesh buffers, one
crossing total. ⚠ **They are valid only until the next `tessellate` call**; the TS adapter copies them
out synchronously. Documented at both ends.

### 5. Two fixes to the committed recipe

- **`link.sh` pointed at `/work/kernel.cpp`; the file is at `/work/src/kernel.cpp`.** A fresh clone
  following the README would have failed at step 3. Fixed.
- **The README still mandated the OCCT side-module** that Entry 6 cancelled. Rewritten to say the static
  link stands. (A stale instruction in a build recipe is worse than no instruction.)

### 6. The artifact moved: `packages/kernel-occt/wasm/`

Owner ruling 10 (**commit the `.wasm`**) stands — only the location changed, so the package that ships
the artifact owns it and a bundler can resolve it from inside the package root. `tools/kernel-build/`
remains the recipe. **3.98 MB raw / 1.47 MB gzip** (+40 KB for naming + wireframe).

### 7. Cost, and box hygiene

**A kernel C++ change is a ~60-second rebuild, not 2.5 hours** — OCCT's static libs were already built
and are still on the box (`~/occt-wasm-spike/install`, 18 libs, 119 MB). I rebuilt **four times** this
session. Only an OCCT *version* bump costs 2.5 h. **This is the single most useful operational fact in
this entry** and it was not obvious from Entry 4/5.

- Docker capped at **2 GB** for every run (§6a). Box never dropped below ~2.2 GB available.
- **Live sites up throughout.** `portfolio-caddy-1` and `beamstack-contact` untouched. **No other
  project's containers stopped** — none needed stopping. No ports bound. Disk 17 GB free.

### 8. State

- **UNCOMMITTED** on `main` (commit/push is owner-gated). `origin/main` still @ `7630185`.
- **`pnpm verify` green: 62/62.** CI **still never observed green** (no `gh`, no token, private repo).
- **Next:** §5 task 1 — **persistent naming on hard topology** (cylinder + boolean + fillet). What
  exists today is naming on the *easy* case; the kernel currently *refuses* to name an edge that isn't
  bounded by exactly two named faces, which is the right failure mode and also a wall you hit the moment
  a boolean runs.

### 9. Addendum — the four contract docs are now IN SYNC with every ruling (2026-07-12)

`V1.0.0_spec.md`, `architecture.md`, `core_logic.md` and `v1.0.0_imp_plan.md` had drifted badly: they still
described `opencascade.js`, `web-ifc`, a multi-threaded build behind COOP/COEP headers with a dual-artifact
fallback, and a licensing rule that said **"do not build on AGPL-3.0"** — the exact opposite of what the owner
ruled. A fresh agent reading them would have built the wrong thing. They are now current.

**Five new decisions were written into the spec (§14), because they were rulings with no home in the contract:**

| ID | Decision |
|---|---|
| **D14** | **The kernel is our own upstream-OCCT 7.9.3 build + our C++ op set.** `opencascade.js` rejected on four independent grounds — chiefly that it **forecloses linking IfcOpenShell** (D16). *"JavaScript never touches OCCT"* is now stated as the architectural rule it is. |
| **D15** | **Bunyan is open source: AGPL-3.0 + commercial dual-licence.** Spec §11 fully rewritten (it had said the opposite). Includes the CLA trap and the verified LGPL-2.1 §3 compatibility. |
| **D16** | **IFC import = exact B-Rep solids via IfcOpenShell.** `web-ifc` rejected — triangles break the core invariant. |
| **D17** | **The `measure` op** — exact quantities from `BRepGProp`, never off the mesh. |
| **D18** | **Identity is assigned in two halves:** C++ assigns *roles* (structural), TS assigns *identity* (whose). |

**D8 was REVERSED in place** (multi-threaded → single-threaded), which let **spec §8 and the deployment story
shrink**: no COOP/COEP, no `SharedArrayBuffer`, no capability detection, one artifact — and *wider*
deployability, since cross-origin isolation restricts what a page may embed.

**The naming lesson was promoted into the domain doc**, not just the changelog: `core_logic.md` §5 now records
that **a naming bug does not look like a geometry bug** — it cannot be caught by measuring volumes, and it
surfaces only later as a reference pointing at the wrong thing. **Naming must be verified *as naming*.** That is
a durable rule about what the model guarantees, which is why it belongs there and not only in an entry.

`pnpm verify` re-run after the doc pass: **62/62 still green.**

---

## Entry 8 — 2026-07-12 — Zayd (dev box) — **BUNYAN IS AGENT-NATIVE (D19–D23).** Design pass; four docs re-aligned.

**Task:** the owner asked for a deep analysis pass — *"can an AI agent explore, understand and operate
this app through instructions, with no complex setup?"* — an explicit **design discussion, not an
implementation**. Analysis done, **eight decisions taken by the owner**, and the four contract docs
folded to match. **No production code was written this session.**

### 1. The finding that reframed the whole question

**The premise was off by one phase — and that was the best possible news.**

The brief asked me to trace how a wall-drag flows from UI event → state mutation → re-render, find where
the model and the view are entangled, and describe the existing undo system. **None of those exist.**
There is no renderer, no scene graph, no state store, no undo stack, no entities, **no `apps/web` at
all** — `package.json` has no React and no three.js. What exists is a geometry kernel behind a message
contract, and nothing above it.

⇒ **This was never a retrofit question. It was a greenfield decision on the ONE layer nobody has written
yet** — the document model, the registries, the command layer and undo (P3/P5). Every piece of the
"agent-friendly" architecture the owner described lives in exactly that unwritten layer.

**And that is why it was affordable.** It stops being affordable the moment P4 lands, because by then the
UI's wiring *is* the app's architecture.

### 2. ⚠ The live hazard this session found — and fixed in the docs

**`current_state.md` §5 was teaching Amer to call the geometry kernel DIRECTLY from the browser.** The
handoff sample (`kernel.request('makeBox', …)`) is correct as a *kernel-integration proof* and **fatal as
an app architecture**: had he built the React shell that way, the command layer would have become a
retrofit rather than a free by-product — and every capability wired straight to the kernel would have
been **permanently unreachable to an agent.**

**Fixed.** §5 now leads with the D19 wiring rule, and the sample is explicitly labelled *"kernel-integration
proof, NOT the app's wiring."* **This was the single time-sensitive item in the analysis.**

### 3. The eight rulings (full text in §4f; decisions D19–D23 in the spec)

| Ruling | Decision |
|---|---|
| **Granularity** | **Type-driven verbs** (`createElement('core.wall.v1', {...})`), primitives as the GenericSolid escape hatch. Composites ("add a room") → v1.0.x. → **D20** |
| **Schema source** | **Generated from the registries.** `Command` gains an **`argsSchema`**. No hand-maintained agent doc — it would drift within weeks. → **D21** |
| **Transport** | **`window.bunyan` first (zero install)**; MCP bridge deferred to v1.0.x. → **D22** |
| **Status** | **A product principle / north-star**, not an implementation detail. → `core_logic.md` §9 + spec §1 |
| **UI routing** | **100% through Commands, no exceptions.** `DocumentContext` is the only holder of a `KernelClient`. → **D19** |
| **Query ops** | **Add the geometric query ops BEFORE the P3 protocol freeze.** → **D23**, §5 task 1a |
| **Agent freeze** | **Versioned separately** (`agentApi`) — does not inherit the P5 type-contract freeze. → **D22** |
| **Transactions** | **Reserve grouping in `UndoableEdit`, do not build it.** v1.0.0 = one edit per command. → **D23** |

### 4. Why this cost so little — four things were ALREADY in place

The design did not have to be invented; it had to be **pointed at the agent**:

1. **The renderer was already decoupled.** `KernelHost.handle(request) → response` is a pure function that
   knows nothing of the DOM — which is *why* 62 tests run headlessly on a box with no browser. There was
   no model/view entanglement to unwind, because **there is no view yet.**
2. **Registries were already the only way to add a type or a command**, and were already required to
   *generate* the ribbon and the property panel. **Generating an agent tool list is the same mechanism,
   aimed one step further.** One registry, three consumers.
3. **`UndoableEdit` was already a state delta, not a command replay** (D-fold). **A delta *is* a diff** —
   so "every command returns something the agent can verify against" was already paid for; it just had to
   be *returned* instead of swallowed.
4. **Identity was already stable BELOW the entity level** (`SubShapeRef`, D1 — real, tested, on real OCCT
   topology). ⇒ An agent can say *"a window on the south face of that wall"* and the reference **survives
   the wall being resized.** **That is the thing most CAD tools cannot promise**, and it is what makes an
   agent-authored *parametric* edit trustworthy rather than merely possible.

### 5. ⚠ The distinction a fresh agent must not blur

**Two layers exist; only one is the agent's.** Kernel ops (`makeBox`, `tessellate` — frozen at P3) are an
**implementation**. Document commands (`createElement`, `setProperty` — frozen at P5) are the **API**.
An agent handed a kernel op would create a solid **no entity owns, no undo can remove, and no
`SubShapeRef` names.** *The kernel is not an API surface; it is an implementation of one.*

### 6. Docs updated (all four contract docs + this file)

- **`core_logic.md`** — §3.12 rewritten (the delta *is* the diff; transactions reserved); **new §3.13
  "Actor (human or agent) — the one command layer"**; §3.10 (a projection need not be visual — the
  *semantic* projection is a Representation); **§8 domain rules 9 + 10 (new)**; **§9 new north-star:
  agent-operable authoring.**
- **`architecture.md`** — **principle 7** (one command layer); §2 layer diagram now shows the agent
  entering through the same door; §4 Command contract gains `argsSchema`; **new §4.6 "The agent surface —
  the command layer *is* the API"**; **new §6.4 data flow "an agent authors an object"** (identical to the
  human path — *that is the point*); **new §8a agent transport**; §10 trust boundary; §13 traceability.
- **`V1.0.0_spec.md`** — revision **2026-07-12b**; §1 principle "agent-native by construction"; §2 tech
  stack row; §4.2 Command contract (`argsSchema`, returns the diff, no component holds a `KernelClient`);
  **new §4.6 (the long one — D19–D23 in full, incl. the trust boundary and the "an agent cannot silently
  save" constraint)**; §5.2; §6.1 undo; §13 roadmap; **§14 D19–D23.**
- **`v1.0.0_imp_plan.md`** — revision **2026-07-12b**; **P2 step 10** (query ops before the freeze); **P3
  step 3a** (the agent surface — with testable exit criteria incl. a **machine check** that only
  `DocumentContext` imports `KernelClient`); **P4's wiring rule + equivalence test** (same edit by human
  and by agent ⇒ same state, same `UndoableEdit`); P5 freeze note; P7 step 7a; cross-cutting practice
  "one command layer".
- **This file** — §2 contract table, **new §4f**, §5 tasks 1a + the corrected Amer handoff.

### 7. Verification & state

- **`pnpm verify` green: 62/62, unchanged.** *(Expected: this session touched only markdown. The
  contracts D19–D23 describe code that does not exist yet — P3/P5 — so there is nothing to test yet, and
  I am not claiming otherwise.)*
- **Entry 7's kernel work is STILL UNCOMMITTED** (`packages/kernel-occt/`, the protocol/mock changes) —
  commit is owner-gated. `origin/main` still @ `7630185`. **These doc changes sit on top of it.**
- **CI still never observed green** (no `gh` CLI, no token, private repo).
- **Box:** no heavy runs, no containers started or stopped, no ports bound, no other project touched.
  Live sites (`portfolio-caddy-1`, `beamstack-contact`) untouched throughout — this was a reading and
  writing session.

### 8. Next

Unchanged in priority: **§5 task 1 — persistent naming on hard topology** (cylinder + boolean + fillet)
is still the #1 risk and still the critical path. **Task 1a (the query ops) rides along with it**, because
both are `OpMap` work and **the protocol freezes at the end of P3.** The agent surface itself is **P3
work and needs no separate phase** — it *is* the registries + commands + undo, built correctly.

---

## Entry 9 — 2026-07-12 — Zayd (dev box) — **PERSISTENT NAMING ON HARD TOPOLOGY. The #1 risk is retired.** Plus the D23 query ops.

**Task:** §5 task 1 — persistent naming on cylinder + boolean + fillet, **measured empirically before designing the resolver** — then §5 task 1a, the geometric query ops, before the protocol freezes.

```
pnpm verify  →  typecheck ✓  eslint ✓  95/95 tests ✓  prettier ✓      (was 62/62)
```

### 1. ⚠ THE HEADLINE: WE MEASURED OCCT'S HISTORY, AND THE SPEC WAS WRONG ABOUT WHERE IT IS WEAK

Spec §4.5 carried a warning, sourced from the OCCT docs and the FreeCAD topological-naming literature:
*history is "robust for faces but weakest for **edges and vertices generated by boolean section
curves**", and the hardest case is a fillet on a boolean-made edge.* **That was a citation, not a
measurement.** The owner's instruction was to find the truth first. So I built
**`tools/kernel-build/probe.cpp`** — a separate WASM module that runs six cases and prints exactly what
OCCT 7.9.3's `Generated`/`Modified`/`IsDeleted` reports. It is **committed and re-runnable in ~60 s**
(`probe.sh` + `node probe-history.mjs`), so nobody has to trust this entry either.

| What the probe found | |
|---|---|
| **Boolean history is COMPLETE** | A window cut through a wall, a circular duct penetration, two walls fused at a corner: **every** output face, edge **and vertex** traces back to an input. **Zero orphans.** Section edges come back in `Generated()` of **both** intersecting faces; section vertices in `Generated()` of the edges. **The literature's warning does not hold on 7.9.3.** |
| **The relation everyone misses is IDENTITY** | `Modified()` returns only the **splits** of a shape. A sub-shape the operation never touched is passed through as the **same object** and appears in **no history list at all**. Read naively, that silence looks like *"unknown"*; it means *"unchanged"*. My first run reported 4 "orphan" faces on a simple cut — **every one was just an untouched wall face.** A resolver built on that misreading would refuse to name faces it already knows perfectly well. |
| **The real weak spot is the FILLET** | `BRepFilletAPI_MakeFillet` reports its new face as `Generated` from the edge it rounds (exactly what naming needs) — but **rebuilds the surrounding edges and vertices as brand-new objects with no history**: 4 edges + 4 vertices lost on a box, 6 + 4 on the boolean case. |
| **The spec's "hardest case"** | A fillet on an edge a boolean created: **23/29 edges from history, 4 from the face pair, 2 from the endpoint tie-break, 0 refused.** |
| **The sanctioned geometric fallback** | **NOT NEEDED in any of the six cases.** No coordinate ever entered the identity path. |
| **⚠ The first wall was the CYLINDER, before any boolean** | A full cylinder's lateral face closes on itself, so its **seam edge is bounded by one face twice** — there is no face *pair*. The old kernel's rule refused it, so **`makeCylinder` would have failed outright.** Only the operation can name a seam, and now it does (`lateral.seam`). |

### 2. The resolver those numbers imply — four relations, tried in order

Implemented in `tools/kernel-build/src/kernel.cpp` (structure) + `packages/kernel-occt/src/naming.ts`
(identity). The C++/TS split of **D18** is unchanged and now carries real weight: **C++ says where a
sub-shape came from, as pure integers — no node ids, no tokens, no coordinates. TS says whose it is.**

| | |
|---|---|
| **PRIMITIVE** | The operation names it from its **own accessors** (`MakeBox::BackFace()`, `BRepPrim_Cylinder::LateralFace()`). |
| **INHERIT** | One ancestor **of the same kind**, and this is its only output ⇒ **it IS that sub-shape still, and keeps its token verbatim.** |
| **DERIVE** | Ancestors, but it is none of them — a split, a coplanar merge, a section edge, a fillet's face. Named as *the op applied to its canonically-sorted ancestors* + an occurrence index. |
| **ADJACENT** | No history and not a pass-through (the fillet). An edge is named by **the pair of faces bounding it**; ties broken by its **endpoint vertices**. Still structural, still FP-free. |
| **else** | **REFUSE**, loudly, as `UNRESOLVED_SUBSHAPE_REF`. It never guesses. |

**⚠ INHERIT is the one that makes BIM work, and it is worth understanding before touching any of this.**
When a window is cut, OCCT reports the wall's front face as `Modified` — but it is still **one** face, so
it is still **that** face, and it keeps `wall-1/face/y-min#0`. A second window does not re-target the
first one's host. The same rule rescues the fillet: the edges it rebuilds with no history are
re-derived from the two faces bounding them, and because both faces still belong to the wall, **the edge
comes back with the wall's own token — byte for byte the one it had before the fillet existed.**

**The positional key (spec §4.5's sanctioned last resort) is deliberately NOT implemented.** Nothing
measured has needed it, and an untested geometric rule sitting on the identity path is a liability that
would fire by accident on a case nobody looked at. If a genuinely symmetric tie ever appears, the
refusal is the signal to build it **on purpose**.

### 3. ⚠⚠ THE TEST THAT MATTERS. If only one test in this repo survives, keep this one.

`tests/naming-hard-topology.test.ts` — *"a wall survives two windows AND a resize"*. It is the actual
life of a wall, in six calls: build it → cut a window → **cut a second window into the result** → then go
back, **resize the wall and both openings**, and rebuild the whole recipe from scratch.

**Every ref comes back identical.** Not "mostly", not "resolvable by nearest-match" — **identical**.
That is what *"the parametric recipe is the source of truth"* actually means: the model is re-derived on
every parameter change, and if identity were recovered by matching geometry afterwards, that last step
would silently re-target references across the entire building. It is the failure that has plagued
parametric CAD for thirty years, and it is the one thing we cannot ship without.

### 4. Built this session

- **Three geometry ops** — `makeCylinder`, `boolean` (cut/fuse/common), `fillet`. **The fillet addresses
  its edge BY ITS IDENTITY** (a `SubShapeRef` token), not by an index — which is the whole point of D1,
  and the reason this op could not have existed before the naming did.
- **Three geometric query ops (D23 / new D25)** — **`bounds`** (of a whole shape **or of one named
  sub-shape** — *"where exactly is the south face of that wall?"*, a question only naming makes
  askable), **`distance`** (minimum separation + the two witness points; **zero doubles as the clash
  primitive**), **`classifyPoint`** (`inside`/`outside`/**`on`** — the boundary is its own answer,
  because a wall's surface is exactly where things get hosted). **`OpMap` is now 14 ops.**
  ⚠ **They read the B-Rep, never the mesh, and return millimetres and identities — never triangles.**
  **Implemented in BOTH kernels**: the mock answers them in closed form for a box, so Amer can build the
  agent/query path with no 14 MB wasm.
- **⚠ PLACEMENT (`at`) on the primitives — a protocol gap I found by using my own API.** Without it both
  solids sit at the origin, so a boolean can only ever bite a **corner** off a wall: *a window in the
  middle — the one operation this product exists to perform — was unreachable.* Added pre-freeze
  (`at` on `makeBox`/`makeCylinder`, plus `axis` on the cylinder, because a column stands up and a duct
  penetration goes sideways). **Rotation is deliberately NOT in it** — that needs a real `transform` op
  with its own naming rules, and half-inventing one under time pressure is how contracts rot.
- **Goldens for the hard shapes** (`tools/oracle` extended; `tests/golden-hard-geometry.test.ts`). A
  **wrong boolean is the one bug in this session's work that WOULD look like a geometry bug**, and would
  therefore slip past every naming test in the repo. So the cylinder, the through-wall window and the
  fillet are now each measured by our WASM kernel and compared to a **native OCCT** reference seeded
  offline. The window case is **flush** (opening exactly as thick as the wall — coplanar faces, the
  degenerate case booleans are worst at), and the closed form, native OCCT and our WASM build **all
  three agree**, down to the vertex count. *(A fillet carries **no** analytic tier — no closed form
  exists, and inventing an approximate one would be worse than having none.)*

### 5. ⚠ THE COST, AND IT NEEDS AN OWNER CALL BEFORE P4 (not before P3)

**The kernel artifact went from 3.98 MB / 1.47 MB gzip → 14.19 MB raw / 4.13 MB gzip.** That is the
price of reaching OCCT's boolean, fillet, extrema and classifier code (`TKBO`/`TKBool`/`TKFillet`), and
it is **mostly irreducible**: I measured `-Os`, which saves **1.5%** gzip (4.07 MB) and costs runtime
speed, so the build stays on `-O2`. It is still **3× smaller over the wire than `opencascade.js`**.

**4.13 MB gzip is a real first-load cost on a slow connection.** Levers, cheapest first: **(a)** accept
it — the service worker caches it once and the app is offline-first thereafter (D11), so it is paid on
first visit only; **(b)** lazy-load the kernel behind the app shell so the UI paints first; **(c)** split
the kernel into core + booleans/fillet modules. **Nothing about P2/P3 is blocked by this** — recorded in
spec §8 so it is not discovered under release pressure.

### 6. Two fixes to committed tooling (a stale recipe is worse than no recipe — Entry 7's lesson)

- **`verify.mjs` read the goldens from an absolute `/goldens/...` path** — it could only ever have
  resolved inside a container mount, i.e. **it could not be run as its own README documented.** Now
  resolved relative to the file; runs from anywhere; passes.
- Its `getRoles` call is gone (the C++ no longer knows what anything is *called* — see D18); it now reads
  the structural `getNaming` report.

### 7. Verification & box hygiene

- **`pnpm verify` green: 95/95** — 9 test files. New: `naming-hard-topology` (14), `geometry-queries`
  (16, **every one run against BOTH kernels**), `golden-hard-geometry` (3, WASM vs native OCCT).
- Every naming test asserts **identity, not millimetres** — per `core_logic.md` §5, *a naming bug does
  not look like a geometry bug*, and the four-mislabelled-faces incident (Entry 7) is what that rule is
  made of.
- Docker capped at **2 GB** on every build (§6a); the box never dropped below ~2.2 GB available. Kernel
  rebuilt **4 times**, the probe twice — all ~60 s each. **Live sites up throughout**
  (`portfolio-caddy-1`, `beamstack-contact` untouched). No other project's containers stopped, no ports
  bound.

### 8. State

- **COMMITTED AND PUSHED — the owner approved it at the end of this session.** `origin/main` @
  **`1f0dcc6`** (`7630185..1f0dcc6`), carrying Entries **7, 8 and 9** in one commit: they touch the same
  files (Entry 9 rewrote Entry 7's `kernel.cpp` and the protocol), so an intermediate split would not
  have built. Working tree clean.
- **CI still never observed green** (no `gh`, no token, private repo). ⚠ Note for whoever commits: the
  **re-seed gate will pass** — the goldens were re-seeded this session, as it requires.
- **`pnpm verify` is the gate, and it is green.**

### 9. Next

1. **The naming work is DONE for the shapes v1.0.0 ships.** What is *not* done and is now the honest
   next question: **`transform`** (rotation/mirror). A rotated wall is P3's problem, it is a **new op,
   not a new field**, and it needs its own naming rules — a mirror is precisely the "genuinely symmetric
   split" that the positional key was reserved for, so it is the case most likely to force that
   decision.
2. **P3.** The protocol freezes at its end. The known gaps are closed (`measure`, the query ops,
   placement); if P3 finds another, **fix it now, not after.**
3. **CI, still unproven** (§5 task 2) — unchanged, and cheap for the owner to settle by eye.

---

## Entry 10 — 2026-07-12/13 — Zayd (dev box) — **MIQDAR: the second product is specified, and Bunyan now KNOWS about it.**

**No code changed. No Bunyan scope changed. `pnpm verify` untouched and still green (95/95).** This entry is
docs-only — but it plants the anchors that make a **future** Bunyan freeze safe, and it records **two owner
rulings that reach back into Bunyan.**

### 1. What Miqdar is (and why its spec is in *this* repo)

**Bunyan MODELS. Miqdar ANALYSES & DESIGNS.** Revit ↔ Robot Structural Analysis — except the link is built
on **D1 (stable identity)** and **D19 (one command layer)**, which is precisely what the incumbents' link
lacks. Full text in **§4g**; the spec is **`Miqdar_v1.0.0_spec.md`**, with the code corpus split out into
**`Miqdar_normative_register.md`** (owner-editable).

**The spec lives here for ONE reason: Bunyan's contract freezes must not foreclose it.** Miqdar development
**starts only after Bunyan v1.0.0 ships.** Nothing about Bunyan's plan changes.

### 2. ⚠ THE REAL WORK OF THIS SESSION: the obligation had NO enforcement mechanism

The first draft (2026-07-12) said *"every Bunyan contract freeze must check this spec first"* — and then
relied on **convention** to make that happen. It also cited *"`current_state.md` §4g, Entry 10"* as its
anchor. **Neither existed.** A grep for "Miqdar" across every Bunyan doc returned hits **only inside
Miqdar's own spec**: a promise, in a file no Bunyan session had any reason to open.

**That is exactly the failure mode this file exists to prevent.** So the anchors are now planted **inside
Bunyan's own documents**, where a freezing agent will actually meet them:

| Anchor | Where | Does what |
|---|---|---|
| **§4g** | this file | Records the ruling + the two consequences that land on Bunyan. |
| **Reading list** | this file, §0 | Makes the spec non-optional reading before a freeze. |
| **P5 step 6a** | `v1.0.0_imp_plan.md` | ⚠ **The gate.** Before the type contracts freeze, clear Miqdar spec §3.4. |
| **P5 exit criterion** | `v1.0.0_imp_plan.md` | The check must be **done and its answers recorded**. |

**What P5 must actually confirm** (minutes of work): that `BimObjectType`'s **version+migration** mechanism
suffices for adding *optional analytical-hint fields* **after** the freeze — expected **yes ⇒ reserve
nothing now**; if **no**, reserve one optional field **before** freezing. **Domain rule 8 mandates this
review anyway** (analysis & quantities is a declared north-star, `core_logic.md` §9). This just makes it
concrete, and *scheduled*.

**Honest correction to the Miqdar spec, made in the same pass:** it claimed the cost to Bunyan was **"zero"**.
It is not — the freeze check is **minutes, recurring, at every future freeze**. Small, but it is a cost, and
it is now named as one.

### 3. ⚠⚠ THE OWNER RULING THAT CHANGES THINGS: **MIQDAR IS CLOSED SOURCE** (2026-07-13)

**Bunyan is open (AGPL-3.0 + commercial). Miqdar is proprietary.** Deliberate asymmetry: **Bunyan is the
wedge, Miqdar is the moat.** Two consequences matter *here*, not just there:

1. **THE LGPL PROBLEM RETURNS — for Miqdar, not for Bunyan.** Bunyan may statically link **LGPL-2.1 OCCT**
   *only because Bunyan's source is public* — public buildable source auto-satisfies the relink obligation
   (§4e, consequence 1). **A closed Miqdar gets no such pass.** So Miqdar's shipped artifact is
   **permissive-only** (Eigen MPL-2.0 ✓), and **⚠ MIQDAR MUST NEVER LINK OCCT.** *(It doesn't need to: it
   consumes `scene.json` **semantically** — parameters and identity, never B-Rep. But the first person who
   wants to "draw an imported column properly" will reach for a kernel, and that reach is a licence
   violation. It is now an explicit prohibition in Miqdar's spec §6.1.)*
2. **⚠ THE CLA IS NOW DOUBLY LOAD-BEARING.** §4e already made it hard: dual-licensing needs the owner to own
   **every line**. It is now **also what makes a closed Miqdar safe beside an AGPL Bunyan** — that safety
   rests on the owner holding **100% of Bunyan's copyright**. **One external PR merged without a signed CLA
   compromises both products, not one.**

### 4. The other owner ruling: the optimizer gets a **utilization cap** (Miqdar M11-b)

An optimizer constrained only by *"every code ratio ≤ 1.0"* will land **dozens of members at 0.99** — every
check green, **zero margin** against anything the code checks do not model. A human designing by hand never
does this; **the optimizer is what makes it reachable.** Ruling: **`maxUtilization` is an authored hard
constraint per DesignGroup, default `0.90`** — Miqdar's parameter, never a code's, printed in the *note de
calcul*. *(Recorded here because it is the clearest instance of the principle both products share: **a
wrong-but-plausible result is worse than no result**.)*

### 5. The code corpus: researched, and it moved (`Miqdar_normative_register.md`)

M8's original matrix was **ratified while its own cells said "(verify)"** — a decision resting on unverified
inputs. The editions are now split into an **owner-editable register**, graded by confidence, **ratified
before Miqdar's S3**. The web pass (2026-07-13) found **three things that change the spec**:

- **RPA 2024 (DTR B.C. 2.48, CTP 15 May 2024) ABROGATES RPA 99/2003** — the Algerian seismic code Miqdar
  was going to ship. *(Confidence B — the JO decree was not read. **Confirm it.**)*
- **Morocco has NO national RC code** — practice is **BAEL 91-99**. This **inverts** the spec's plan to file
  BAEL as a 1.0.x "legacy pack": it may be the **Morocco RC module**.
- **The 1st-generation Eurocodes are withdrawn by 30 March 2028** (2nd gen + NAs due 30 Sep 2027) — so a
  France corpus, *the least-automatable work in the product*, risks being **built twice**.

**These are for the owner to rule (O-M10/O-M11/O-M5), not for an agent to assume.**

### 6. Verification & state

- **Docs only.** No source file, no test, no contract touched. **`pnpm verify` still green (95/95)** — it was
  not re-run for this entry because nothing it gates was modified. *(Said plainly, per the rule that a claim
  without a method is not done: **this entry verified nothing about the code, and claims nothing about it.**)*
- **NOT committed.** Working tree carries: `Miqdar_v1.0.0_spec.md` (rewritten), `Miqdar_normative_register.md`
  (new), `v1.0.0_imp_plan.md` (P5 step 6a + exit criterion), `current_state.md` (§0, §4g, this entry).
  **Commits are owner-gated.**
- **Bunyan's next action is unchanged:** `transform` (P3), then the P3 protocol freeze. **CI still never
  observed green** (§5 task 2).

### 7. Next

1. **Owner:** ratify the normative register, and rule **O-M5 / O-M10 / O-M11 / O-M12** (Miqdar spec §14).
   None of it blocks Bunyan.
2. **Bunyan:** unchanged — `transform`, then P3. **At P5, step 6a is now waiting.**

---

## Entry 11 — 2026-07-13 — Zayd (dev box) — **`transform` LANDS — and it exposed a naming hole Entry 9 shipped: a wall with a groove could not be modelled.**

**Task:** §5 task 1 — `transform` (rotation/mirror), the last named protocol gap, before the P3 freeze.

```
pnpm verify  →  typecheck ✓  eslint ✓  110/110 tests ✓  prettier ✓      (was 95/95)
```

### 1. ⚠ THE HEADLINE, AND IT IS NOT THE ONE I EXPECTED

I was sent to build `transform` with a specific warning: *a mirror is precisely the "genuinely symmetric
split" for which spec §4.5 reserves a bounded positional key — if a real case forces it, implement it on
purpose.*

**The mirror was acquitted. Something else was guilty.**

| | |
|---|---|
| **The mirror does NOT force the positional key** | MEASURED (probe cases 7-10): a rigid transform — rotation, **mirror**, and a rotation of a wall that *already has an opening cut through it* — is a **topological ISOMORPHISM**. 100% of output faces and edges accounted for through history, **1:1, zero orphans**, in both copy modes. A mirror is a clean bijection. It has no ambiguity to resolve. ⇒ `transform` is **pure INHERIT**. |
| **⚠⚠ A GROOVE DOES — and the kernel REFUSED IT OUTRIGHT** | Cutting a **groove across a wall** — a chase, a rebate, a shadow gap — **splits the wall's front face into two.** Both halves have an *identical derivation*. Entry 9 gave **edges** a structural tie-break and gave **faces none**, so `nameDerived` bailed out: `UNRESOLVED_SUBSHAPE_REF`. **A wall with a chase in it was unmodellable.** Entry 9's probe never cut a groove, so nothing caught it. |
| **How it was found** | **By accident** — a `transform` test that cut a groove because that is what buildings have. Not by reading the resolver. |
| **The fix, and it is structural, not geometric** | The halves are **not** indistinguishable: **they touch different faces.** MEASURED (probe case 6b, the new `touches` field): the half below the groove meets the wall's `z-min` face, the half above meets `z-max`. Faces now get **exactly the tie-break the edges always had** — sort by derivation, then by a structural signature (the *derivations of the neighbouring faces*), assign the occurrence index in that order, and refuse **only** when derivation AND signature are both identical. **No coordinate. No tolerance.** |
| **⚠ It is not even a new rule** | Spec §4.5 already said *"children are ordered by a structural tie-break"*. **It had simply never been implemented for faces.** The spec was right and the code was incomplete. |
| **What still refuses** | Two faces with **the same parent AND the same neighbours** — the *genuinely* symmetric split. **That** is what the positional key was always for, and it is **still deliberately not implemented.** We now know precisely which case would force it, instead of guessing that it was the mirror. |

**⇒ The `#1 risk is retired` claim from Entry 9 was true of the shapes we had measured — and that is not
the same thing.** The resolver is sound; the *probe* was incomplete. **The probe only measures the shapes
you think to cut.** That is the lesson, and it is now §1 item 6.

### 2. `transform` — the op that creates NO identities

**The design, in one line: a rotated wall is the SAME WALL.** Its refs are the operand's refs, token for
token, in the same order. The window hosted on its `y-min` face is still hosted there after the wall is
rotated into place — which is the only reason the op is usable in a BIM tool at all. If identity were
re-derived on placement, angling a wall would silently re-target every reference in the building pointing
at it.

- **It is the only shape-producing op with NO `nodeId`**, and that absence is the contract: it owns
  nothing, so there is nothing for a node to own. `composeTransformRefs` (naming.ts) is a separate,
  ~20-line function **with no `nodeId` in scope** — so it *cannot* call `encodeSubShapeRef` and *cannot*
  mint an identity, even if OCCT surprised us. Any relation other than INHERIT is **refused, loudly**.
  That is a tripwire, not an expected path.
- **Motions** (`translate` / `rotate` / `mirror`) apply **in order**, angles in **degrees** (90/45/30 are
  exact in degrees and irrational in radians; authors think in degrees).
- **⚠ NO SCALE, deliberately.** A BIM element is not resized by scaling its solid — it is resized by
  changing its **parameters** and re-running the recipe. A scale op would be a second, non-parametric way
  to change a size, and the two would disagree the moment anything rebuilt. Non-uniform scale would also
  turn a column's circle into an ellipse that no `makeCylinder` recipe can reproduce.
- **⚠ A MIRRORED COPY IS A NEW ELEMENT, NOT A MIRRORED SHAPE.** Fusing a shape with a transform **of
  itself** hands two different faces the same token, and the kernel **refuses** (`UNRESOLVED_SUBSHAPE_REF`).
  That refusal is *correct*: it asks for one wall to be in two places inside one solid. The document
  layer's answer (P3) is a **second element with its own `nodeId`** — and with distinct nodeIds the same
  symmetric solid fuses cleanly. **Both halves of that are tested.**

### 3. ⚠ THE MEASURE OP CANNOT GATE A TRANSFORM — and that trap is worth carrying forward

**Volume, area, edge length and topology counts are ALL INVARIANT under a rigid motion.** A transform that
rotated by the wrong angle, about the wrong axis, in radians where degrees were meant — or that *silently
did nothing at all* — would reproduce **every one of them exactly**. The measures that gate every other
shape in this repo are, here, **blind**.

- **`bounds` is the only measure that moves**, so it is the one doing the work. Gated against a **native
  OCCT reference** *and* a **closed form**.
- The closed-form tier earns its keep here more than anywhere: if *we* passed OCCT the wrong angle, our
  WASM kernel and the native-OCCT oracle would go through the **same** wrong angle and agree with each
  other perfectly. Only a tier that computes the answer **independently from the angle** catches that —
  `analytic.py` rotates the four base corners itself.
- **A mirror's tell is the SIGN OF THE VOLUME.** A mishandled negative transform returns an inside-out
  solid of **negative** volume — while its area, edge length, counts and even its bounding box stay
  perfect. Measured: **positive**, 1.5e9 mm³. Asserted explicitly.

### 4. Built this session

- **`transform` in the protocol** (`OpMap` → **15 ops**), in the C++ kernel (`transformShape`, reusing
  the *same* `nameDerived` resolver as the boolean and the fillet — no special case), and in the TS
  adapter. **Not in the mock** — see below.
- **The face tie-break** in `nameDerived` (kernel.cpp) — the groove fix. **Purely additive: it fires only
  where the kernel previously REFUSED, so not one existing ref changed.** The 95 pre-existing tests pass
  **unchanged**, which is the proof.
- **Probe cases 6b and 7-11** (`probe.cpp`), incl. a new **`touches`** field (each output face's
  neighbouring faces) — the measurement the face tie-break rests on. Re-runnable in ~60 s.
- **Goldens: 7 cases** (was 5) — `wall-rotated-30deg` and `wall-mirrored-yz`, both with **analytic ==
  OCCT** agreement at seed time.
- **Tests +15**: `naming-transform.test.ts` (12) and `golden-transform.test.ts` (2), plus **the split-face
  persistence test** in `naming-hard-topology.test.ts` — a groove, then a **rebuild with a taller wall and
  the groove at a different height**, demanding the identities come back byte for byte. ⚠ That last test
  also asserts the **lower half is still the lower half**: if the occurrence index flipped, every other
  assertion would still pass while whatever was hosted on the lower half silently moved to the upper one.
- **⚠ The mock does NOT implement `transform`, on purpose.** A rigid motion of a box is exactly
  representable — but the mock's whole value is that its answers are **exact**, and one op stops being
  exact the moment a box rotates: **`distance` is closed-form for two AXIS-ALIGNED boxes and has no closed
  form for two rotated ones** (it becomes a convex-separation problem). A mock supporting `transform`
  would have to either lie about `distance` or support it only sometimes — and a **partially**-honest mock
  is worse than one that refuses, because the lie surfaces downstream, in Amer's code, weeks later. It
  says so in `capabilities`, the same rule it applies to booleans.

### 5. Verification & box hygiene

- **`pnpm verify` green: 110/110**, 11 test files. Every naming assertion is about **identity, not
  millimetres**; every geometric one is gated against a **native OCCT reference**.
- Kernel rebuilt **twice** (~60 s each), probe **twice**. Docker capped at **2 GB** every run (§6a); box
  never below ~2.2 GB available. **Live sites up throughout** (`portfolio-caddy-1`, `beamstack-contact`
  untouched). No other project's containers stopped, no ports bound. `/tmp` checked: 85 MB.
- **Kernel artifact: 4.16 MB gzip** (was 4.13). `transform` + the tie-break cost ~0.03 MB. Negligible.

### 6. State

- **⚠ UNCOMMITTED — the owner has not been asked.** `origin/main` still @ **`ec46e89`** (Entry 10).
- **⚠ TWO THINGS THE OWNER SHOULD LOOK AT, because I made judgement calls inside my brief:**
  1. **I changed the naming resolver** — the #1-risk subsystem he was told was retired. I judged it in
     scope: it is a **defect in delivered work**, not new scope; the fix is what **spec §4.5 already
     required**; it is **structural, not geometric** (so it is not the "loosening" the brief forbade); and
     it is **additive** (no existing ref changed — 95/95 pre-existing tests prove it). **But he should know
     the resolver moved, and that the probe that certified it was incomplete.**
  2. **`transform` takes no `nodeId`** — a deliberate asymmetry with every other shape-producing op.
- **CI still never observed green** (no `gh`, no token, private repo). The re-seed gate **will pass** —
  the goldens were re-seeded this session, as it requires.

### 7. Next

1. **P3** — document model, registries, `.bimproj`; **the protocol freezes at its end.** ⚠ **Spend it
   modelling a real building with the protocol.** Every gap ever found was found by *using* the API
   (`at`; the groove). Re-reading `ops.ts` will not find the next one.
2. **CI, still unproven** (§5 task 2) — cheap for the owner to settle by eye.
3. **At P5: the Miqdar gate** (§4g, plan step 6a) is waiting.

---

## Entry 12 — 2026-07-13 — Zayd (dev box) — **THE PROTOCOL COULD NOT BUILD A FLOOR PLATE. `extrude` + `chamfer` were in P2's scope and had never been built.**

**Task:** P3 — and per §5, *"the way to spend it is to build a building with the protocol."* I did that
first, before writing any document model. It took ten minutes to find a hole that three sessions of
reading `ops.ts` had missed.

```
pnpm verify  →  typecheck ✓  eslint ✓  119/119 tests ✓  prettier ✓      (was 110/110)
```

### 1. ⚠ THE HEADLINE: P2 WAS DECLARED COMPLETE TWICE, AND TWO OF ITS OPS DID NOT EXIST

**P2 step 1, in writing, since the plan was authored:** *"make box/cylinder/**prism**, **extrude a
profile**, **revolve**, boolean union/subtract/intersect, **fillet/chamfer** on an edge."*

**`extrude`, `chamfer` and `revolve` were never built.** Entry 9 declared P2 complete. Entry 11 declared
it complete again. `pnpm verify` was green both times. **Nothing caught it, because every test in the
repo built its walls out of boxes** — and a box needs no `extrude`.

It surfaced the moment I tried to model an actual building and reached for the **floor plate**:

> A **Slab** is *"planar boundary + thickness"* (spec §5). **A boundary is a polygon.** A real floor
> plate is L-shaped, or five-sided, or has a curved edge. **`makeBox` cannot express any of them.**

And it is not just the Slab. **Three of the five MVP object types were unbuildable:**

| MVP type | Spec §5 says | Could the kernel do it? |
|---|---|---|
| **Slab / Floor** | "planar boundary + thickness **extrude**" | ❌ rectangles only |
| **Column** | "simple profile (rect/circular) **extrude**" | ❌ box or cylinder only |
| **GenericSolid** | "free sketch + **extrude/revolve**" — *the escape hatch, and the import target for every unmapped IFC entity (D16)* | ❌ **no op behind it at all** |

**⇒ §1 item 7 is the lesson, and it is worth more than the ops: a phase's exit criteria are a
SPECIFICATION, not a summary of what got done. Read the step list against the code before declaring a
phase complete.** It takes a minute. This went unread for a month.

### 2. What was built

- **`extrude`** (protocol + C++ + TS adapter) — sweep an authored **`Profile`** into a solid. **`OpMap`
  is now 17 ops.**
- **`chamfer`** — the fillet's flat sibling. Same contract (**the edge is addressed by its identity**,
  not an index), same `nameDerived` resolver, no special case. P5 step 7 ships "fillet/**chamfer**".
- **The `Profile` contract (D26)** — a closed loop of **authored segments**: a `line`, or a **three-point
  `arc`**. ⚠ *Three points define exactly one arc*, so there is **no handedness flag to get backwards and
  no radius too small for its chord** — the centre+radius+sweep parameterisation has two failure modes a
  sketching UI would have to defend against, and this one has none.
- **Profile validation** (spec §5.2) — **closed** and **non-self-intersecting**, checked before the
  profile reaches a solid op, returning a typed **`INVALID_PROFILE`**. *A figure-eight boundary is closed
  and planar and still nonsense.*
- **Goldens: 10 cases** (was 7) — an **L-shaped slab**, a **slab with a curved edge**, a chamfered box.

### 3. ⚠ THE NAMING RULE, AND IT IS A CONTRACT (D26)

> **The face swept from segment `k` is named `lateral.k` — where `k` is the index in the array THE AUTHOR
> DREW.** Never OCCT's traversal of the wire.

That distinction is invisible on a rectangle and decisive on everything else. It is what lets a user
**drag a slab's inner corner** — moving the boundary, changing every coordinate of two faces — **without
re-targeting a single reference into it.** Tested: an L-plate's corner dragged 1.5 m, every ref byte-
identical; a wall rebuilt longer *and* taller with a window hosted on `lateral.0`, every ref byte-identical.

**⚠ The consequence a document command must respect: reordering the segment array re-targets every
reference into the shape**, exactly as renaming a wall would. **Editing a vertex is safe. Permuting the
list is not.** It says so in `ops.ts`, in the type.

### 4. ⚠ THE BUG THAT WOULD HAVE SHIPPED SILENTLY, AND WHAT CAUGHT IT

**`BRepBuilderAPI_MakeWire` hands back a COPY of an edge** when it has to reverse one to close a loop
(its own docs say so, quietly). My first version kept the `TopoDS_Edge` I built and asked the prism what
it `Generated()` from *that* — so **every profile with more than three sides failed to resolve.** The fix
is `wire.Edge()` (the edge *as it went into the wire*), and it is the **fifth** vindication of §9.0's
*"we trust OCCT; we verify our own code"*: another misuse of an OCCT API, not an OCCT defect.

**And the one that did NOT announce itself.** `failFromKernel` mapped the kernel's error prefix to a
typed code from a **hand-written subset** of the protocol's vocabulary — and it had drifted:
**`INVALID_PROFILE` existed in the protocol, the C++ emitted it, and the adapter silently downgraded it
to `INTERNAL`.** A precise, actionable *"your slab boundary is self-intersecting"* was arriving in the UI
as *"something went wrong."* It now **derives from `KERNEL_FAILURE_CODES`** rather than restating it —
generated, not maintained, which is the rule the rest of the project already holds itself to (D21).

### 5. ⚠⚠ THE OTHER FINDING, AND IT LANDS ON P3, NOT ON THE KERNEL: **NEVER FUSE TWO ELEMENTS**

I fused two walls at a corner, because that is what a naive "join walls" implementation does. **Measured:
only 2 of the first wall's 6 faces kept their identity.** The rest were re-owned by the fuse:

```
   wall-s/face/y-min#0   ->   corner-sw/face/fuse(wall-s.face.y-min~0+wall-w.face.y-min~0)#0
```

The kernel is **right** — a merged coplanar face genuinely *is* a new face derived from two parents. But
at the document level it is **catastrophic**: **every window hosted on that wall breaks the moment a
neighbour is joined to it** — retroactively, on a wall nobody edited.

**⇒ The rule, now written into plan P3 step 1: ONE SOLID PER ELEMENT. A boolean is an *intra*-element
operation** (an element's own recipe: its base solid, minus the openings hosted on it). **An L-shaped slab
built as a fuse of two boxes is fine** — one element, one `nodeId`, one recipe. **Wall + wall is not.**
Corner joins, wall cleanup and double-counted corner volume are a **quantities/display** concern and are
**v1.0.x**. *Do not reach for a fuse to solve them.*

### 6. Verification — and why the closed form is doing the real work here

**⚠ THE PRIMARY ORACLE IS STRUCTURALLY BLIND TO THE MOST LIKELY BUG IN THIS OP.** `occt.py` (native OCCT)
and our WASM kernel are handed **the same profile**. If *we* build that boundary wrongly — a dropped
vertex, a transposed coordinate, a loop that closes the long way round — **both sweep the same wrong
polygon, produce the same wrong solid, and agree to the last digit.** It is the identical trap `transform`
set with its angle (Entry 11).

So `analytic.py` gained the only tier that computes the answer **from the vertices**: the **shoelace** area
for a polygon, and the **circular-segment** area for an arc. The seeder cross-checks and **aborts** on
disagreement.

- **L-shaped slab:** volume **3,200,000,000 mm³** — analytic == native OCCT == our WASM, exactly.
- **Curved-edge slab:** the arc through (6000,0), (7000,2000), (6000,4000) lies on a circle of centre
  (4500,2000), R = 2500; its circular segment adds `R²·acos(0.6) − 1500·2000` = **2,795,595.1125 mm²**.
  ⇒ volume **5,359,119,022.5 mm³**. **Hand-derivation == analytic == native OCCT == our WASM
  (5,359,119,022.502015).** The op is analytically exact, not merely self-consistent.
- **Chamfer:** removes exactly the triangular prism it should — `d²/2 × L` = 5,000,000 mm³ on a 1 m cube.
- **119/119**, 13 test files. **The 110 pre-existing tests pass UNCHANGED** — which is the proof that both
  ops are purely additive and not one existing ref moved.

### 7. Box hygiene

Kernel rebuilt **3×** (~60 s each), Docker capped at **2 GB** every run (§6a); box never below ~2.3 GB
available. **Live sites up throughout** (`portfolio-caddy-1`, `beamstack-contact` untouched). No other
project's containers stopped, no ports bound. `/tmp` = 85 MB. **Artifact: 14.53 MB raw / 4.22 MB gzip**
(was 4.16) — `extrude` + `chamfer` cost **~0.06 MB gzip**. Negligible.

### 8. State

- **⚠ UNCOMMITTED.** `origin/main` still @ **`ec46e89`** (Entry 10). The tree now carries **Entries 11 AND
  12**. Commits are owner-gated.
- **CI still never observed green** (no `gh`, no token, private repo). The re-seed gate **will pass** —
  the goldens were re-seeded this session, as it requires.
- **⚠ ONE THING THE OWNER SHOULD KNOW I JUDGED:** I was sent to do **P3** and spent the session on the
  **kernel** instead. I judged it in scope and would again: §5 explicitly said to spend P3 modelling a
  building with the protocol and to **"fix a gap now, not after"**; the gap I found makes **three of the
  five MVP types unbuildable**; and the protocol **freezes at the end of P3**, after which this is a
  contract amendment. **Building the document model on a protocol that cannot express a floor plate would
  have been the more expensive mistake.** But the document model has **not been started**, and that is the
  honest state.

### 9. Next

1. **`revolve`** — the last known protocol gap; **GenericSolid cannot ship without it** and it is the
   unmapped-IFC import target. ⚠ **Probe the full-360° seam FIRST** — see §5 task 1 for the design and the
   precise unknown. Do not derive it from the docs.
2. **P3** — document model, registries, `.bimproj`; the protocol freezes at its end. **Keep modelling real
   buildings.** ⚠ Carry the **one-solid-per-element** rule (§5 above / plan P3 step 1).
3. **CI, still unproven** (§5 task 3) — cheap for the owner to settle by eye.
4. **At P5: the Miqdar gate** (§4g, plan step 6a) is waiting.

---

## Entry 13 — 2026-07-13 — Zayd (dev box) — **DEEP AUDIT: what the entries CLAIM vs what is actually wired. Six gaps, three serious.**

**Task:** audit the code against the plan, the spec and Entries 1–12 — hunting for features claimed but not
wired, and for work the whole build has simply never considered.

**No code changed. `pnpm verify` untouched and still green (119/119).** This entry claims nothing about the
code; it *reports* on it. Every finding below was **checked against the source**, not inferred from an entry.

### 1. ⚠⚠ THE BIG ONE NOBODY HAS NOTICED IN 12 ENTRIES: **THE P3 PROTOCOL FREEZE FORECLOSES P6**

- **P6 step 1** requires a **section-cut kernel op** — *"cut the actual B-Rep at a plane, extract profile
  curves"*. The 2D plan + elevation are a **headline v1.0.0 deliverable**, and the *proof* that the kernel is
  the single source of truth (spec §5.2, `core_logic.md` §3.10).
- **P6 step 3** requires **IFC-import ops** — IfcOpenShell linked against our OCCT, exposed as **new C++ ops**
  (D16). That is new protocol surface by construction.
- **The protocol freezes at the END OF P3** (D13). **Neither op exists, and neither is planned before the
  freeze.**

⇒ **As written, P6 begins by amending a frozen contract on day one — which makes the freeze theatre.**
**This needs an Architect call, and it is cheap now and expensive later:**
- **(a)** Land or *reserve the op shapes* (`sectionCut`, the IFC ops) **before** the freeze — even as typed
  stubs that return `UNKNOWN_OP`. The payload shape is the thing that is expensive to change, not the body.
- **(b)** Or **redefine the freeze explicitly** as *"additive new ops are permitted; changing an existing
  op's envelope or payload needs sign-off."* That is probably what was always meant — **but it is not what
  D13 says**, and an unstated intent is exactly what a freeze exists to eliminate.
**Do not let P3 end without settling this.**

### 2. ⚠ `measure` CANNOT ANSWER A QUANTITY QUESTION — and quantities are a declared north-star

`bounds` takes an optional **`ref`** (*"where is the south face of that wall?"*). **`measure` does not** — it
answers only for a whole shape.

So **"what is the AREA of that wall face?"** — the paint area, the formwork area, the cladding take-off — **is
not askable.** Nor is the volume of one sub-part. That is:
- **`core_logic.md` §3.11 + §9** — *analysis & quantities* is a **declared north-star**, and **domain rule 8**
  says nothing in the current version may foreclose one;
- **Miqdar's entire input** (§4g);
- and **P5's `quantities` hook** on `BimObjectType`, which has nothing to call.

**⇒ `measure` should take the same optional `ref` that `bounds` already takes.** It is **one line in `OpMap`
and a `BRepGProp` call on a sub-shape** today, and a **contract amendment** after P3. **The asymmetry is an
oversight, not a design** — `bounds` got a `ref` in Entry 9 and `measure` (Entry 7) predates it.

### 3. ⚠ TWO P2 STEPS WERE NEVER BUILT, AND NO ENTRY EVER SAID SO *(the Entry-12 disease again — §1 item 7)*

**(a) P2 step 2 — the BREP (de)serializer / `geometry-cache.brep`. ZERO CODE EXISTS.** Grep it: the string
appears **only in comments**. Yet it is named in **`.bimproj`** (P3 step 4), in the **cache-staleness /
kernel-build-id** path (P3 step 5), and in the **untrusted-BREP** security rule (architecture §10 — *"treat
inbound BREP as untrusted on load"*).
⚠ **It may be legitimately DROPPABLE — the recipe is truth (§2 invariant), so the BREP cache is a pure
optimisation and a document can always rebuild.** But that is **an owner decision, not a silence**: if it is
dropped, `.bimproj` must stop claiming the file and the P3/P6 exit criteria must change. **Decide it; do not
inherit it.**

**(b) P2 step 7 — the rebuild engine, and with it BROKEN REFERENCES. DOES NOT EXIST.**
`core_logic.md` **domain rule 3** and **§7** are unambiguous: a reference is `resolved ↔ **broken**`, a broken
one is *"a first-class, visible state awaiting **manual retargeting**, never auto-healed."*
**There is no such state anywhere in the codebase.** Today, when a ref cannot be resolved, the kernel throws
`UNRESOLVED_SUBSHAPE_REF` and **the whole operation fails**.
⇒ The promise *"predictable breakage beats silent wrongness"* is **half-kept**: the breakage is loud (good),
but **a document cannot survive carrying one broken dependent**, and there is no retarget path. **Deleting a
wall that a window is hosted on currently has no defined behaviour.** This is **P3 document-model work** (the
plan misfiles it under P2), and it is on the critical path for P5's Opening.

### 4. ⚠ CONTRACT-DRIFT HAZARDS — mechanical, cheap, and one has already bitten

- **`capabilities` is a HAND-WRITTEN list, separate from the handler map — and it already drifted.**
  `transform` was implemented in Entry 11 and **left out of `OCCT_KERNEL_INFO.capabilities` for two
  sessions** (Entry 12 caught it by accident). Worse, **`OpHandlers` is `Partial`**, so an op in `OpMap` with
  **no handler is not a compile error** — it silently becomes `UNKNOWN_OP` at runtime. *(That optionality is
  deliberate and correct — it is how the mock honestly refuses — but it means nothing checks the REAL kernel
  for completeness.)*
  **⇒ Fix: derive `capabilities` from `Object.keys(handlers)`, and add a test asserting they agree.** A
  one-liner that closes a whole bug class, and it is the same *"generated, never maintained"* rule D21 already
  imposes on the agent's tool list.
- **`wasm/bunyan-kernel.d.ts` is hand-written** and, in its own words, kept in step with the
  `EMSCRIPTEN_BINDINGS` block **by hand**. A drift here is a **type that lies about the WASM boundary** — and
  TypeScript will believe it. Low frequency, high blast radius.
- **`INVALID_RESULT` is declared in the protocol and NEVER EMITTED.** Nothing runs `BRepCheck_Analyzer` on a
  boolean's or a fillet's output — so an OCCT op that "succeeds" while producing an **invalid solid** is
  accepted and stored. `extrude` validates its *input* profile; nothing validates any op's *output*. Cheap to
  add, and it is the code the protocol already reserves for exactly this.

### 5. Things that checked out (so nobody re-audits them)

- **Tessellation IS exercised on a curved solid** (a cylinder, in both `naming-hard-topology` and
  `golden-hard-geometry`) — provenance on curved faces is not an unverified claim.
- **The WASM-heap leak canary is real** — it asserts against `wasmLiveHandles()`, the module's own count.
- **`EMPTY_BOOLEAN_RESULT` is genuinely emitted** by the C++ (a cut that removes everything).
- **The worker export map is correct** (`@bunyan/kernel-occt/worker` resolves).

### 6. Next — REVISED PRIORITY (the §5 list is updated to match)

**Everything below is cheap NOW and a contract amendment AFTER P3. That is the whole point of this entry.**

1. **`measure` gains an optional `ref`** (§2 above). One line. Unblocks the quantities north-star and Miqdar.
2. **`revolve`** — the last named op gap; GenericSolid cannot ship without it (Entry 12 §9).
3. **Settle the P6-vs-freeze question** (§1 above) — Architect call. Reserve `sectionCut` + the IFC ops, or
   redefine the freeze in D13's own words.
4. **Derive `capabilities` from the handlers + test it** (§4). One-liner, closes a bug class.
5. **Owner decision: is `geometry-cache.brep` in v1.0.0 or not?** (§3a).
6. **P3: the broken-reference state + retarget path** (§3b) — it is document-model work and P5's Opening
   depends on it.

---

## Entry 14 — 2026-07-13 — Zayd (dev box) — **`revolve` LANDS (P2's op set is finally complete) — and cutting a ROUND column found the naming hole the spec reserved the positional key for.**

**Task:** the §5 pre-freeze list from Entry 13's audit — `measure(ref)`, `revolve`, derived `capabilities`,
`INVALID_RESULT`. All four are done. **But the session's real finding is the one nobody was looking for**,
and it is an owner decision.

```
pnpm verify  →  typecheck ✓  eslint ✓  136/136 tests ✓  prettier ✓        (was 119/119)
CI's own five steps, run in order on this box:  ALL PASS  (one of them could NOT have, before today)
```

### 1. ⚠⚠ THE HEADLINE, AND IT IS NOT `revolve`: **A DUCT CANNOT BE DRILLED THROUGH A ROUND COLUMN**

A service penetration through a circular column. Utterly ordinary. **The resolver refuses it** —
`UNRESOLVED_SUBSHAPE_REF`, loudly and correctly, with no wrong name ever assigned.

**Why, measured** (`probe.cpp`, new case `cut_round_column_by_duct`): a round column has **ONE lateral face
that wraps all the way around**, so the duct **enters and leaves through the same face**. The two rims:

| | rim A | rim B |
|---|---|---|
| derivation | `Generated` by (column.lateral × duct.lateral) | **the same** |
| bounding faces | {column.lateral, hole-wall} | **the same** |
| endpoint signature | {column.lateral, hole-wall} | **the same** |

**They are topologically indistinguishable.** Entry 11's groove was saved because its two halves touched
*different* faces (`z-min` vs `z-max`); here **nothing differs**. No adjacency, endpoint or neighbour rule
reaches it.

**⇒ This is the case spec §4.5 reserved the BOUNDED POSITIONAL KEY for**, and whose own words are: *"If a
real model ever hits a genuinely symmetric tie, that refusal is the signal to implement the key
**deliberately**."* **A duct through a column is that real model. The ruling is owed — §5 task 1.**

**⚠ IT IS NOT A `revolve` BUG AND IT PREDATES `revolve`.** The identical failure occurs on a plain
`makeCylinder` column and has been reachable since **Entry 9**. Five sessions never hit it because
**every boolean this project has ever tested cut a BOX** — where a duct enters `y-min` and leaves `y-max`,
two faces, two derivations, no tie to break. It surfaced only because `revolve` gave me a round column and I
cut it the way a building would. **Third time this lesson has landed** (Entry 11's groove; Entry 12's floor
plate): *the probe only measures the shapes you think to cut.*

**I did not fix it, deliberately.** The fix puts **geometry on the identity path** — the single invariant the
product rests on (D1/D18) — and that is an Architect decision, not an agent's initiative at the end of a long
session. **A test pins the refusal** (`naming-revolve.test.ts`, *"KNOWN LIMITATION"*) so it is visible in CI
rather than folklore, and it flips the day it is ruled on. Options + costs: **§5 task 1.**

### 2. ⚠ `revolve` (D27) — AND WHY COPYING THE PRISM WOULD HAVE SHIPPED A KERNEL THAT REFUSES EVERY COLUMN

The last op P2 step 1 named. **The probe went first** (Entry 9's rule), and it earned its 60 seconds: a full
360° turn is **not the partial one with a bigger number**, and *none* of the three differences is in the docs.

| # | What the design note in §5 predicted | ⚠ What OCCT 7.9.3 ACTUALLY does |
|---|---|---|
| 1 | *"a full revolve has no caps"* | **True — but `FirstShape()`/`LastShape()` DO NOT RETURN NULL for it.** They return a face **that is not in the result**. The prism calls both unconditionally and refuses the build if either fails to resolve ⇒ **a copy-paste of `extrude` refuses every column and every dome.** The test is *"is it in the result"*, never *"is it null"*. |
| 2 | *"the seam is the risk — measure it first"* | **The seam is FREE.** Each lateral face closes on itself, and its seam edge **IS the authored profile edge**, handed back by *identity*. Unlike the cylinder (which needed `BRepPrim_Cylinder::StartEdge()` to seed its seam), the revolve's seam costs nothing: `lateral.k.seam`. **The predicted risk was the easy part.** |
| 3 | *"a segment ON the axis generates a degenerate face or none"* | True, and harmless — no face exists for it. **⚠ BUT THE ONE NOBODY PREDICTED: a segment PERPENDICULAR to the axis reports NO HISTORY AT ALL** — `Generated()` empty, `IsDeleted()` **true** — **while its face sits right there in the result.** That face is **the flat bottom of every column, the base of every dome, the annulus of every tube.** Trusting history would ship solids with unnamed faces; the prism's "refuse if unnamed" guard would refuse the shapes instead. |

**The rescue for (3) is structural and exact:** every profile **vertex** sweeps into a circle, and OCCT
reports *that* faithfully. **The face swept from segment `k` is bounded by exactly the circles swept from
segment `k`'s two endpoint vertices** — verified against the raw topology on a tube, a cone and a dome. And
the same relation tells a *radial* segment from an *on-axis* one: a vertex on the axis sweeps **no** circle,
so an on-axis segment expects zero circles and correctly has no face. **No coordinates. No tolerance.**

**Naming is the prism's** (D26): **`lateral.k` after the AUTHORED segment**, so re-authoring a column's
profile — fatter, taller, a bowed moulding — re-targets **nothing**. Tested: every ref byte-identical.

### 3. The three Entry-13 contract holes — closed

- **`measure` takes an optional `ref`.** *"What is the AREA of that wall face?"* — the paint area, the
  formwork, the cladding take-off — **is now askable**. A face reports area + perimeter and **zero volume**
  (a face encloses nothing, and `VolumeProperties` on an open shell returns a plausible, meaningless number a
  quantity schedule would happily bill). Unblocks **quantities** (domain rule 8), **P5's `quantities` hook**,
  and **Miqdar's input**.
- **`capabilities` is DERIVED** (`capabilitiesOf(handlers)`, in the protocol) in **both** kernels, and tested.
  It had drifted for two sessions. Generated, never maintained — the same rule D21 imposes on the agent's
  tool list.
- **`INVALID_RESULT` is emitted at last.** `BRepCheck_Analyzer` gates the **output** of boolean, fillet,
  chamfer and revolve. An OCCT op that "succeeds" while handing back an invalid solid is now refused, not
  stored. *(The protocol reserved that code in v1 and had never once used it.)*

### 4. ⚠ CI WAS NEVER GREEN — AND IT **COULD NOT** HAVE BEEN. NOBODY EVER NEEDED THE ACTIONS TAB.

Fifteen entries said *"CI has never been observed green; no `gh`, no token, private repo ⇒ someone must look
at the Actions tab."* **That framing was the bug.** CI's steps are just commands, and they run on this box.
Run in order, **step 3 — `pnpm format:check`, which runs BEFORE `pnpm test` — fails on the committed tree.**

**Entry 7 moved the kernel to `packages/kernel-occt/wasm/` and never added emscripten's generated glue to
`.prettierignore`.** Every push since has failed there. **One line.** All five steps now pass here.

*(A human glance at the Actions tab is still worth a minute — but "unproven" was the wrong word. It was
**disproven**, and nobody ran the check.)*

### 5. ⚠ The harness caught one of MY bugs — and then I closed the gap that let it through

The closed-form tier exists to catch **our** errors, and it caught one: my analytic bounding box for the
90° revolve was the **full tube's** (`-outer`), when a 90° sector lives in the first quadrant. The kernel was
right and the golden was wrong.

**But it was caught LATE — by the TS suite, not by the seeder** — because `seed.py` cross-checked
volume/area/edgeLength/counts and **not `bounds`**. That is the gate whose entire job is to make a wrong
golden *uncommittable*, and a wrong golden sailed through it. **The seeder now cross-checks bounds too**, and
all 14 cases pass it (so no pre-existing golden had a bad box either).

### 6. Verification

- **136/136 tests** (was 119). The 119 pre-existing ones pass **unchanged** — the proof this is additive.
- **Goldens: 14 cases** (was 10). Four new revolve cases, each gated against **native OCCT** *and* an
  **independent closed form**, with the seeder aborting on disagreement:
  - **revolved column** = π·150²·3000 — and it **measures identically to the `makeCylinder` primitive**, which
    is two entirely different OCCT code paths landing on the same solid;
  - **hollow tube** = π(1000²−500²)·3000 — **the orphan-face case**: its two annuli are exactly the faces OCCT
    reports no history for;
  - **hemisphere** = ⅔·π·1000³ from an arc, with a degenerate pole;
  - **90° tube** — the control that **has caps**, so conflating full and partial fails exactly one of the two.
- **Artifact: 15.36 MB raw / 4.24 MB gzip** (was 14.53 / 4.22) — `revolve` + `measure(ref)` + the
  `BRepCheck` guards cost **~0.02 MB gzip**. Negligible.

### 7. Box hygiene

Kernel linked **1×**, probe linked **2×** (~60 s each), Docker capped at **2 GB** every run (§6a); box never
below ~2.3 GB available. **Live sites up throughout** (`portfolio-caddy-1`, `beamstack-contact` untouched).
No other project's containers stopped, no ports bound. `/tmp` = 86 MB.

### 8. State

- **⚠ UNCOMMITTED.** `origin/main` still @ **`ec46e89`** (Entry 10). The tree now carries Entries **11, 12, 13
  and 14**. Commits are owner-gated.
- **P2's op set is complete** — the first time this phase's own step list matches the code.

### 9. Next

1. **⚠⚠ THE POSITIONAL-KEY RULING (§5 task 1)** — a real model has hit the genuinely symmetric tie, and the
   spec says that refusal is the signal. **Owner call.** Everything else can proceed without it; a
   through-penetration of a round column cannot.
2. **The P6-vs-freeze contradiction (§5 task 2)** — `sectionCut` and the IFC ops are needed by P6 and do not
   exist; the protocol freezes at the end of P3. **Owner call**, and it is minutes.
3. **`geometry-cache.brep`: in v1.0.0 or not? (§5 task 5)** — still an owner call, still never made.
4. **P3 — the document model.** ⚠ Carry the **one-solid-per-element** rule (Entry 12), and **keep modelling
   real buildings**: every protocol gap this project has found was found by *using* the API, and the newest
   one (§1 above) was found by cutting a shape nobody had cut. **Cut the next one.**

---

## Entry 15 — 2026-07-13 — Zayd (dev box) — **THREE OWNER RULINGS LAND: the POSITIONAL KEY (D28), the FREEZE's meaning (D13), the BREP cache DEFERRED (D29). And Entries 11–14 are PUSHED at last.**

**Task:** resume where Entry 14 stopped. It stopped on purpose: **three of its four "next" items were owner
calls, not agent work** — and one of them puts geometry on the identity path. I put all three to the owner
with their costs, he ruled on all three, and I built them.

```
pnpm verify  →  typecheck ✓  eslint ✓  139/139 tests ✓  prettier ✓        (was 136/136)
origin/main  →  ee241df  (was ec46e89 — FOUR entries of work had never left this box)
```

### 1. ✅ PUSHED — and the first push in eight entries that CAN go green

Entries **11, 12, 13 and 14** were all sitting uncommitted. `origin/main` was at `ec46e89` (Entry 10), so
**Amer had been building the browser layer against a kernel four generations behind what existed** — no
`transform`, no `extrude`, no `chamfer`, no `revolve`. Committed as `ee241df` and pushed.

⚠ **It is also the first push whose `format:check` step can pass** — Entry 14 found that CI step 3 had been
failing on the committed tree since Entry 7 (emscripten's generated glue was never added to
`.prettierignore`). All five CI steps run green here now, in order.

### 2. ⚠⚠ D28 — THE BOUNDED POSITIONAL KEY IS IN. A DUCT NOW GOES CLEAN THROUGH A ROUND COLUMN.

**The owner ruled it in.** Spec §4.5 had reserved the key for exactly this and said a genuinely symmetric tie
*"is the signal to implement the key **deliberately**."* Entry 14 measured the tie; this entry built the key.

**What it is — and the three properties that keep it bounded** (`kernel.cpp`, `centroidKey`):

| | |
|---|---|
| **It ORDERS, it never IDENTIFIES** | It is the **third** sort term, consulted only after the derivation **and** the structural signature have *both* tied. If structure can separate two sub-shapes, the key never runs. It breaks a tie between two things the kernel has already proven interchangeable. |
| **It is FP-free at the point of comparison** | The centroid is rounded to the **mm grid** — the unit everything is authored in — with a **fixed rounding mode** (`llround`). The key is an **integer triple**, compared exactly. No epsilon, no tolerance. |
| **A COLLISION IS A DEFECT, NOT A FALLBACK** | Two distinct sub-shapes on one mm-grid centroid ⇒ the grid is too coarse for the model, and spec §6.5 says surface it. The kernel **refuses**, exactly as it did before the key existed. |

**⚠ THE RISK THE OWNER ACCEPTED, AND I AM WRITING IT DOWN RATHER THAN LETTING IT BE REDISCOVERED:**
re-authoring a recipe so the duct crosses to the **other side** of the column would swap which rim sorts
first, and a ref into one rim would resolve to the other. That is inherent to any positional key.

**⚠⚠ BUT IT IS MUCH SMALLER THAN IT LOOKS, AND FOR A STRUCTURAL REASON NOBODY HAD NOTICED:** `transform` is
**pure INHERIT** and mints no identities (D25) ⇒ **the key is computed in the element's OWN BUILD FRAME.**
**Moving or rotating a column anywhere in the world cannot re-rank a tie** — the key never even runs. Only an
edit to the duct's placement *within* the column can flip it. **Both halves are pinned by a test.**

### 3. ⚠ THE TIE IS NOT WHERE THE DOCS SAID IT WAS — and it took cutting the shape to see it

Entry 14 (and spec §4.5) describe the tied pair as *"the two rims"*. **Measured with the key in place, that is
only true if the duct AVOIDS THE SEAM.** OCCT puts a cylinder's seam on the **+X meridian**, so a duct driven
along **X** — which is what Entry 14's test did — **exits straight through the seam**, which splits the entry
rim in half and yields **three** rim edges, not two. The pair my first test grabbed was the **split seam**, not
the rims at all.

Driving the duct along **Y** misses the seam and gives the clean case: **exactly two rims, one derivation, two
occurrences** — which is the case the ruling is actually about. **Both build.** Only one isolates the tie, and
the tests and the golden now use it. *(Fourth time this project has learned it: the probe only measures the
shapes you think to cut — and the docs only describe the shape someone actually cut.)*

### 4. ⚠ THE GOLDEN CAUGHT A REAL BUG IN OUR BOUNDS — SEVEN ENTRIES OLD, AND INVISIBLE UNTIL NOW

Gating the new shape's geometry against native OCCT failed immediately: our WASM said `x-min = -400.0071`
where the oracle said `-400.0000001`. **The oracle was right and we were wrong** (spec §9.0: a disagreement
means *our* code is wrong).

**`BRepBndLib::Add` bounds a curve by its CONTROL POLYGON**, and a B-spline's control points lie **outside**
the curve they define. On a box, a cylinder, or any planar/analytic face, `Add` and `AddOptimal` agree
**exactly** — which is why this stood since Entry 7 with every golden passing. **The duct's rims are the first
spline edges in the entire suite**, so this is the first case that could ever have caught it. Fixed:
`BRepBndLib::AddOptimal` (which the oracle had used all along).

**Third time the harness has caught this same class of bug, and it is always the same class: OUR misuse of an
OCCT API, never an OCCT defect.** It is also the fourth vindication of the owner's §9.0 ruling.

### 5. ✅ D13 — WHAT "FROZEN" FORBIDS IS NOW WRITTEN DOWN. The owner took BOTH halves.

The freeze, as written, forbade *everything* — which **foreclosed P6** (it needs `sectionCut` and the IFC
ops, neither of which existed). Twelve entries missed it; Entry 13's audit found it.

- **D13 is re-worded:** *"adding a NEW op is additive and permitted; changing an EXISTING op's envelope or
  payload needs Architect sign-off."* Very likely what was always meant — **but not what D13 said.**
- **AND the shapes are reserved anyway:** `sectionCut` and `importIfc` are **declared in `OpMap`/`OP_NAMES`
  with full payload types**, and **deliberately unimplemented** — no handler, so they are absent from
  `capabilities` (which is *derived*) and answer `UNKNOWN_OP`. `RESERVED_OPS`, pinned by a test.
- **Why both:** the re-wording removes the contradiction; the reservation is because **the expensive thing to
  get wrong is the payload SHAPE, not the body**, and a payload agreed while the protocol is soft costs
  nothing. **Reserved ≠ missing.**

⚠ **When P6 writes a body, `capabilities` picks the op up with no other edit** — and the reserved-ops test
**fails on purpose**, so a human removes it from `RESERVED_OPS` knowingly rather than by accident.

**What `sectionCut` reserves, and why it is shaped that way:** it returns **curves carrying a `ref`**, not
anonymous polylines — because a plan must be *annotatable*. A dimension anchored to a wall's face in plan is
anchored to that face's `SubShapeRef`, so it survives the wall being edited. **A section that returned
anonymous geometry would be a picture, and pictures go stale.**

### 6. ✅ D29 — THE BREP CACHE: DEFERRED, DELIBERATELY, AND THE DOCS NO LONGER LIE ABOUT IT

`geometry-cache.brep` was **never built** (zero code; the string lived only in comments) and was nonetheless
**promised in five places** — `.bimproj`, both of `architecture.md`'s save/load paths, the autosave snapshot,
the cache-staleness rule, and the **untrusted-BREP security rule**.

**The owner deferred the ship/drop call to P3 step 4 — on purpose, and it is the right call:** the only thing
the cache buys is **load time on a real building**, and **that number does not exist**, because there is no
document model to measure it with. Ruling on principle today would either add a feature nobody needs or delete
one everybody does.

**What the deferral required NOW, and what I did:** every one of those five claims is marked **conditional on
D29** (I did not delete them — deleting would pre-empt the very decision he deferred), and P3 step 4 now
carries the **measurement protocol** and both branches, including the doc edits each branch owes. ⚠ **The
argument that will probably decide it:** dropping the cache **deletes an entire attack surface** — a
`.bimproj` is a file a user can be *sent*, and the `.brep` is the one part fed as binary to OCCT's
deserializer.

### 7. Verification

- **139/139** (was 136). ⚠ **The 135 tests unrelated to the tie pass BYTE-UNCHANGED** — that is the proof D28
  is purely additive: the key fires *only* where the kernel previously refused, so it cannot re-target an
  existing reference. (Same property Entry 11's face tie-break had, and for the same reason.)
- **The refusal test FLIPPED** — `naming-revolve.test.ts` used to pin `UNRESOLVED_SUBSHAPE_REF`; it now pins
  the two rims coming back as `#0` and `#1`, plus the stability property (§2 above).
- **A new golden**, `column-through-duct-r400-d80`, gates the *solid* — because the naming tests assert
  identities, not millimetres, and **a positional key shipped alongside a boolean that quietly cut the wrong
  material would have passed every one of them.**
  - Against **native OCCT** for area/edge-length/counts/bounds.
  - Against an **exact closed form for the VOLUME**: the removed volume of two crossing cylinders is an
    elliptic integral, `4r²∫cos²t·√(R²−r²sin²t)dt`, computed from the **authored radii** (never from the
    B-Rep) — so it is a genuinely independent tier. It agrees with OCCT to **6e-7 relative**.
  - ⚠ **No full `analytic` tier, deliberately:** the *area* and *counts* of two intersecting cylinders are
    elliptic integrals tangled with a seam, and spec §9.0 is explicit that an approximate closed form is
    **worse than none** — it produces a golden that is confidently, quietly wrong. **A partial closed form is
    a legitimate tier**, and the seeder now supports one (`volumeClosedForm`) and aborts on disagreement.
- **Artifact: 15.37 MB raw / 4.24 MB gzip** — D28 + `AddOptimal` cost **~0.00 MB**. It is a sort comparator.

### 8. Box hygiene

Kernel linked **2×** (~60 s each), Docker capped at **2 GB** every run (§6a); box never below ~2.3 GB
available. **Live sites up throughout** (`portfolio-caddy-1`, `beamstack-contact` untouched). No other
project's containers stopped, no ports bound. `/tmp` = 86 MB.

### 9. State

- **✅ COMMITTED AND PUSHED — `origin/main` @ `ee241df`** (Entries 11–14), with Entry 15 on top.
- **The pre-freeze debt from P2 is now ZERO.** All four of Entry 13's items are discharged, and the two
  rulings Entry 14 was blocked on are made. **What is left before the freeze is P3's own work.**

### 10. Next

1. **P3 — THE DOCUMENT MODEL.** The protocol freezes at its end, and the debt list is finally empty.
   ⚠ Carry the two rules the measurements bought: **ONE SOLID PER ELEMENT — never fuse two elements**
   (Entry 12), and **the broken-reference state does not exist yet** (Entry 13 §3b — `core_logic` domain rule
   3 mandates `resolved ↔ broken` with manual retargeting; today an unresolvable ref fails the whole op, so
   **deleting a wall that hosts a window has no defined behaviour**). P5's Opening depends on it.
2. **D29 gets decided at P3 step 4, WITH the number.** Build a realistic document, time a cold rebuild-from-
   recipe, then rule. The protocol and the doc edits for both branches are already written.
3. **⚠ AND KEEP CUTTING SHAPES NOBODY HAS CUT.** Every single protocol and naming gap this project has found
   was found by *using* the API to build something real — never by reading it. The score is now four: `at`,
   the groove, the floor plate, the round column. **The fifth is out there. Go find it.**
