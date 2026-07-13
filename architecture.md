# Bunyan — Architecture Reference

**Purpose.** This is the full reference for *how Bunyan is built*: the runtime layers, the worker protocol, the five extension registries, the persistent-naming engine mechanics, determinism, data flow, persistence, offline/deploy, security, and the testing architecture. It is the authoritative source for architecture; the **domain meaning** it serves lives in `core_logic.md`, and **version-specific scope/decisions** live in `V1.0.0_spec.md`.

**Version awareness.** The architecture is described at the level that holds across the 1.0.x line and accommodates the `core_logic.md` north-stars. Where a mechanism is v1.0.0-scoped vs. forward-looking, it is marked **[v1.0.0]** or **[future]**.

---

## 1. Architectural principles

1. **Kernel behind a message boundary.** The geometry kernel is never called directly by UI code; it sits behind a flat, versioned, engine-agnostic message protocol. This makes it swappable, upgradable, and relocatable (worker today, server/native later) without touching the UI. *(Backs the headless-kernel north-star.)*
2. **Truth is the recipe; everything else is derived.** The parametric document (`scene.json`) is authoritative; B-Rep is a rebuildable cache; meshes and 2D views are disposable projections. (See `core_logic.md` §2.)
3. **Additive extension via registries.** All growth is registration against five contracts (§4). The core never enumerates concrete types/commands/formats/views.
4. **Identity is derived and deterministic.** Sub-shape identity comes from operation-DAG provenance, normalized to be reproducible across machines and parallel execution (§5).
5. **Fail safe, never partial.** Kernel failures are marshalled as typed results; the document never enters a partial or auto-invented state (§7).
6. **Offline-first, zero-backend [v1.0.0].** Static hosting + service-worker precache + local persistence; no server is required to author.
7. **One command layer for every actor** *(decision D19)*. Humans and AI agents act on the document through **the same Commands**. The UI has **no private path to the kernel**, and neither does an agent. The registries that generate the ribbon and the property panel are the same registries that generate the **agent's tool list** — one source of truth, three consumers (§4.6). *(Backs the agent-operable north-star.)*

---

## 2. Runtime layers & processes

```
        HUMAN (ribbon, panels, viewport)          AGENT (window.bunyan — zero install, §4.6)
                        │                                        │
                        └──────────────┬─────────────────────────┘
                                       ▼   ONE command layer (D19). No actor bypasses it.
┌───────────────────────────────────────────────── Main thread (UI) ─────────────────────────────────────────────┐
│  React app shell        Registries (runtime)          three.js scene (WebGPURenderer / WebGL2 fallback)          │
│  - ribbon (generated)   - BIM Object Type ──┐         - BufferGeometry (mesh + retained provenance map)          │
│  - property panel (gen) - Command / Action ─┴─► also  - camera controls (never blocked on kernel)                │
│  - view tabs            - File Format Codec     generate the AGENT TOOL LIST + capability endpoint (§4.6)        │
│  - agent surface        - View / Representation        Selection / picking → SubShapeRef (via provenance)        │
│                                                        Undo/redo (UndoableEdit state deltas; every cmd returns   │
│                                                        its delta = the diff an actor verifies against)           │
│  Document model (scene graph + dependency DAG + naming token map)   Persistence manager   Service worker         │
└───────────────┬─────────────────────────────────────────────────────────────────────────────────┬─────────────┘
                │ postMessage (flat versioned protocol, transferable ArrayBuffers, correlation ids)  │  Cache Storage
┌───────────────▼──────────── Geometry Worker ───────────────┐          ┌───────── Macro Worker [future] ─────────┐
│  OUR WASM KERNEL = our C++ ops + OCCT 7.9.3 (static link)  │          │  Pyodide (lazy, sandboxed, opt-in)      │
│    single-threaded [v1.0.0]  ·  multi-threaded [v1.0.x]     │          │  registers Types via the same contracts │
│  Command executor        ShapeHandle registry (lifecycle)   │          └─────────────────────────────────────────┘
│  Persistent-naming resolver (functional/generative)         │
│  Canonical re-sort (determinism)   Tessellation + provenance│
│  IFC importer (IfcOpenShell -> exact solids) [v1.0.0]       │
│  Operation-failure marshaller                               │
└─────────────────────────────────────────────────────────────┘
```

- **Main thread** owns UI, the document model (the truth), registries, the three.js scene, persistence, and the service worker. It holds **no raw OCCT pointers** — only opaque `ShapeHandle`s and `SubShapeRef`s.
- **Geometry worker** owns OCCT, the naming resolver, tessellation, IFC **import** [v1.0.0], and failure marshalling. All heavy work happens here so the UI thread stays responsive.
- **Macro worker [future]** runs Pyodide in isolation; it never participates in the interactive hot path and registers its outputs through the ordinary Type contract.
- **The WASM module *is* the kernel [v1.0.0].** JavaScript calls **our C++ op set** (`makeBox`, `measure`, `tessellate`, `releaseShape`, …), **never OCCT's API**. Geometry logic lives in C++ inside the module. This is the single most consequential build decision (spec D14) — see §3.1.
- **Threading [v1.0.0]: SINGLE-THREADED.** Multi-threading is deferred to v1.0.x (spec D8): persistent naming is the #1 risk, and parallel OCCT orders boolean output non-deterministically. The **canonical re-sort** (§5.4) is implemented regardless — it is what makes enabling MT later a non-event for saved files. Consequence: **no cross-origin isolation, no `SharedArrayBuffer`, one WASM artifact** (§8).

---

## 3. The kernel & its protocol (the primary seam)

### 3.1 The WASM module *is* the kernel — JavaScript never touches OCCT *(spec D14)*

This is the decision that determines whether the product can grow to Revit scale, so it is stated before the protocol.

**Our C++ implements the ops** (`makeBox`, `measure`, `tessellate`, `releaseShape`, …) and is **statically linked against OCCT**. JavaScript calls **our op set** — not OCCT's API. The alternative (`opencascade.js`) does the opposite: it exposes *all* of OCCT to JS via ~9,000 generated bindings.

| | `opencascade.js` | **Bunyan** |
|---|---|---|
| What JS calls | all of OCCT's API | **our ~10 ops** |
| Where geometry logic lives | JavaScript | **C++, inside the WASM** |
| JS↔WASM crossings | **one per OCCT call** (thousands per rebuild) | **one per op** |
| Artifact (raw / gzip) | 62.8 MB / 13.1 MB | **3.98 MB / 1.47 MB** |
| Can a second C++ lib link in? | No | **Yes — IfcOpenShell (spec D16)** |

Four consequences that matter architecturally:

1. **The JS binding surface never grows.** Product growth = **writing more C++ ops** (sweeps, HLR drawings, shape healing, IFC import), not exposing more OCCT. The seam stays small and stable however far the product goes.
2. **The linker keeps only the OCCT code our ops reach**, so the download tracks what we *use*, not what OCCT *has*.
3. **A second C++ library can link against the same OCCT** — the *only* route to importing IFC as exact solids (spec D16). A prebuilt kernel forecloses this permanently. ⇒ **Never adopt a kernel path that forecloses linking a second C++ library.**
4. **Mesh buffers cross as zero-copy views, not element-by-element.** Reading an embind `std::vector` costs **one crossing per element** — ~1.8 M crossings for a 200k-vertex model, *every drag frame*, silently reinstating the very cost this design exists to avoid. The kernel hands JS `typed_memory_view`s (one crossing); the TS adapter copies them out **synchronously**. ⚠ **The views are invalidated by the next `tessellate` call** — never hold one across an `await`.

### 3.2 The worker protocol

The protocol is a **flat, versioned, request/response message contract** — the most important architectural *boundary*, because it is what keeps the kernel swappable/relocatable.

- **Envelope:** `{ protocolVersion, correlationId, op, payload }` → `{ correlationId, result | failure }`. Large binary payloads (BREP blobs, mesh buffers) travel as **transferable `ArrayBuffer`s**.
- **Exact measurement is an op, not a mesh calculation** (`measure`, spec D17). Volume/area/edge-length come from OCCT's `BRepGProp`. Deriving them from the tessellation is exact only for planar-faced solids — a tessellated cylinder under-reports its volume by the chord error, so quantities must read the B-Rep.
- **Typed-failure envelope [v1.0.0].** Every response is `Ok(result)` or `Fail(typedError)`. OCCT C++ exceptions (`Standard_Failure`) and invalid-result checks are caught in the worker and returned as `Fail` — they never cross as a thrown exception and never crash the WASM instance. (See §7.)
- **Tessellation provenance channel.** A tessellation response returns mesh buffers (positions/normals/indices) **plus** two maps: per-triangle → face `SubShapeRef` and per-edge-polyline → edge `SubShapeRef`. This is what lets the main thread turn a picked triangle/edge into a stable `SubShapeRef` for authoring references. It is part of the frozen protocol.
- **Edit coalescing & cancellation.** The dispatcher debounces rapid edits and **discards results of superseded operations** (OCCT calls are not interruptible mid-flight; the dispatcher drops stale outputs rather than blocking). Camera/view interaction never round-trips to the kernel.
- **Versioning & freeze.** The protocol carries `protocolVersion`; it is **frozen** at a defined point in the build (see `v1.0.0_imp_plan.md` P3, decision D13) so the two build actors parallelize. Engine-agnostic by construction, so a future native/server kernel implements the same contract.

**Why flat, not an object reference:** an object-reference API would couple the UI to the kernel's process, language, and memory. A flat message contract lets the kernel move to a server or be reimplemented in C++ with zero UI change — the headless-kernel north-star.

---

## 4. The five extension registries

All product growth is a registration against one of these contracts. The core never hard-codes the concrete lists.

| Registry | Contract (essence) | Grows by |
|---|---|---|
| **BIM Object Type** | `typeId`, `defaultParams`, `buildGeometry → BuildResult`, `parameterSchema`, `ifcMapping`, optional `quantities`, `version` | New building elements (Wall→Door→Roof→…) |
| **Command / Action** | `commandId`, **`argsSchema`** *(D21)*, `execute → CommandResult` (UndoableEdit \| typed failure), optional `contributesUI` | New tools (draw/edit/array/retarget→…) |
| **File Format Codec** | `Importer` / `Exporter` against a schema-version abstraction | New formats (IFC import [v1.0.0] → IFC export → STEP/DXF/glTF/IFC5) |
| **View / Representation** | derived projection of the document graph | New views (3D, plan, elevation → schedules, sheets) |
| **Persistent Naming** | resolver binding consuming maker maps; `SubShapeRef` currency | Internal; the substrate all references use |

Cross-cutting properties:
- **UI is generated from registries.** The ribbon is generated from Commands' `contributesUI`; the property panel is generated from a Type's `parameterSchema`. Adding a command/type contributes UI with zero hand-wiring.
- **The agent's tool list is generated from the SAME registries** *(D21, §4.6)*. `argsSchema` is to an agent what `contributesUI` is to the ribbon. Adding a command contributes an agent verb with zero hand-wiring — and, decisively, **with no way to forget**.
- **Undo is registry-agnostic.** It operates on `UndoableEdit` deltas, so new commands never touch the undo system.
- **Migration is per-Type/version.** `manifest.json` records per-type versions; load-time migration functions keep old projects loadable.
- **Contract freeze is split** (decision D13): the message protocol freezes early (P3); `SubShapeRef`/`BimObjectType`/`Command` freeze after two real types (Wall+Opening) validate them (P5). **The agent surface is versioned separately** (D22) so agent ergonomics can improve without amending a frozen contract.

### 4.6 The agent surface — the command layer *is* the API *(decisions D19–D23)*

**What this is, in plain terms.** An AI agent should be able to open Bunyan, ask it what it can do, read the model, act, and check what its action actually did — **with no install, no SDK, and no per-feature API wiring**. This section is how that is true *by construction* rather than by a separate integration effort.

**The rule that makes it work (D19): there is exactly one command layer, and no actor bypasses it.**

```
  human (button/drag)  ─┐
  agent (window.bunyan) ├──►  Command registry  ──►  DocumentContext  ──►  KernelClient ──► OCCT
  MCP bridge [v1.0.x]  ─┘         (the ONLY door)
```

⚠ **The UI must not hold a private line to the kernel.** It is tempting (a "quick path" for a drag preview) and it is corrosive: **every capability reachable only through the UI is a capability the agent can never have**, and nobody discovers the gap until an agent is asked to use it. The kernel's `KernelClient` is reachable **only** from `DocumentContext`, never from a React component. *(This is also why the P4 shell must be built against the Command layer, not against `KernelClient` — see `v1.0.0_imp_plan.md` P4.)*

**⚠ Two layers, and only one of them is the agent's.** They are easy to confuse and the confusion is expensive:

| | **Kernel ops** (`@bunyan/protocol`) | **Document commands** (§4.2) |
|---|---|---|
| Vocabulary | `makeBox`, `tessellate`, `measure` | `createElement`, `setProperty`, `deleteElement` |
| Level | geometry primitives | BIM semantics |
| Freezes | **end of P3** | **P5** (after Wall+Opening) |
| Who may call it | `DocumentContext` **only** | **every actor** |

An agent calling a kernel op directly would create a solid **no entity owns, no undo can remove, and no `SubShapeRef` names.** The kernel is not an API surface; it is an implementation of one.

**Granularity (D20): semantic verbs, primitives as the escape hatch.** The default verb is `createElement(typeId, params)` — *"create a `core.wall.v1`, 4000 mm long"* — not *"draw a rectangle, then extrude it"*. This is free: a **BIM Object Type already *is* the recipe from parameters to geometry** (§4.1), so the parametric type registry makes high-level verbs the natural default. Sketch-level primitives remain, as the **GenericSolid** escape hatch. **Composite verbs** ("add a room") are **[v1.0.x]** — they need transaction grouping (D23) and the contract reserves room for them.

**Discovery (D21): generated, never maintained.** The capability endpoint is a **derived projection of the registries** — the registries are already the *only* place a Type or Command can be declared (§4, "the core never enumerates the concrete lists"), so a generated schema **cannot** drift. A hand-written one certainly would. `Command` therefore gains an **`argsSchema`**, exactly as `BimObjectType` already carries a `parameterSchema`.

**Read/query (D23).** Two tiers, and the split matters:
- **Document-level queries** (`getSceneGraph`, `getElementById`, filter by type/level/property) read the **parametric recipe**, which *is* the truth (§1 principle 2). **They need no kernel op at all.**
- **Geometric queries** (tight bounds, spatial proximity/containment) need the B-Rep, hence kernel ops — added to the protocol **before it freezes at P3**.
- ⚠ **A query API must return *semantics*, not triangles.** A `Float32Array` of 200 k vertices is unreadable to an agent (and to a script, and to a schedule). The agent reads a **semantic Representation** (§4.4, `core_logic.md` §3.10) — ids, types, params, levels, quantities, relationships. The 3D view is the projection for eyes; this is the projection for reasoning. **Both are derived; neither is truth.**

**Verification (D23): every command returns its diff.** The `UndoableEdit` state delta that undo needs in order to *reverse* an action and the answer an actor needs in order to *verify* it are **the same object**, so `execute` **returns** it. Combined with the **exact `measure` op** (D17 — B-Rep truth, never the mesh) and typed failures (§7), an agent gets a **closed verification loop**: act → read the diff → measure the result. Most CAD tools cannot tell a caller what an edit actually did.

**Transactions (D23).** `UndoableEdit` **reserves** a transaction id: edits sharing one undo/redo as a single all-or-nothing unit. **v1.0.0 emits one edit per command** (each its own transaction) — but the field exists now, because retrofitting grouping into a frozen undo contract is invasive and every composite verb will need it.

**⚠ Agent commands must opt OUT of edit-coalescing.** The `KernelClient` supersedes an in-flight request when a newer one shares its `coalesceKey` (§3) — exactly right for a human dragging a slider, and exactly **wrong** for an agent, which issued one deliberate command and would receive a `SUPERSEDED` failure that is meaningless in its context. Coalescing is a property of *interactive* input, not of commands.

**Transport (D22): `window.bunyan` first; MCP [v1.0.x].** See §8a.

---

## 5. Persistent-naming engine (mechanics)

The domain intent is in `core_logic.md` §5; this is the mechanism.

### 5.1 Identity as a derivation path
A `SubShapeRef` is a structured path — `nodeId` (owning object/operation), `role` (semantic slot, e.g. "lateral face k=2"), `occurrence` — through the **operation DAG**. It is assigned when an operation runs and never recovered geometrically.

### 5.2 Propagation via maker maps
Each operation uses OCCT's `BRepBuilderAPI_MakeShape` interface — `Generated()`, `Modified()`, `IsDeleted()` — to label its outputs from its inputs as it builds. No geometric matching on the resolve path.

**Where the work is split (spec D18).** The C++ kernel assigns **roles** — *"which sub-shape is this, structurally?"*:
- a **face's** role comes from the operation's **own semantic accessors** (e.g. `BRepPrimAPI_MakeBox::BackFace()`), never from a coordinate;
- an **edge's** role comes from **topology** — the canonically-ordered pair of the two faces that generate it. Floating-point-free, and a bijection for a box.

TypeScript then assigns **identity** — *"whose is it?"* — binding roles to the owning DAG node and encoding the `SubShapeRef` token (`nodeId` + `role` + `occurrence`). **Geometry enters neither half.**

**The engine refuses what it cannot derive.** A sub-shape whose identity is not structurally derivable (today: an edge not bounded by exactly two named faces) makes the operation **fail loudly** rather than invent a name. A wrong-but-plausible identity is far more expensive than a refusal — it surfaces later as a silently re-targeted opening.

**⚠ Naming from the operation still means *translating* the kernel's vocabulary, and that is a place to be wrong.** OCCT's `LeftFace()` is the **y-min** face; its `FrontFace()` is **x-max**. A first implementation mislabelled **four of a box's six faces** — and every geometric assertion still passed, because the geometry was exact and only the *names* were wrong. The harness therefore re-measures role labels on every run (§11).

### 5.3 Hybrid granularity
- **Coarse (feature)** — user-facing history.
- **Fine (primitive-op)** — the layer references actually resolve against.

### 5.4 Determinism (multi-threaded safe, cross-machine safe)
- Before assigning IDs, each operation's output is passed through a **canonical re-sort** using a **structural tie-break** (order children by the identities of the tool/input entities — pure graph data), so **the kernel's traversal order can never leak into a name**. *(Originally justified by multi-threaded boolean non-determinism. v1.0.0 is single-threaded (spec D8), so that justification does not apply today — but the re-sort **stands**: single-threaded traversal order is still not something identity may depend on, and the re-sort is the precondition for switching MT on in v1.0.x without invalidating saved files.)*
- For a **genuinely symmetric** split where structural data cannot break the tie, the sole exception is a **bounded positional key**: centroid rounded to the mm grid with a fixed rounding mode, lexicographic. The grid is coarse enough that legitimately distinct sub-shapes never collide; a collision is a determinism defect surfaced by the naming suite, not tolerated.
- **Cross-machine reproducibility:** the adjacency hash and structural IDs are floating-point-free by construction; the only FP-sensitive path (the positional key) is pinned by a fixed rounding policy and a pinned seeding environment (see §11 and `V1.0.0_spec.md` §6.5).

### 5.5 Rebuild & load
- The identity **token map** is persisted in `scene.json`.
- On edit: rebuild only the affected subgraph (via the dependency DAG) and re-propagate identities.
- On load: deterministic replay re-binds stored tokens to concrete OCCT entities.
- On unresolvable reference: mark **broken**, surface for **manual retargeting**; never silently reattach.

### 5.6 Residual risk & bound
OCCT history is robust for faces, weakest for **edges/vertices** from boolean section curves, and not uniform across maker classes. The engine only ships reference classes whose history coverage is **verified** by the persistent-naming regression suite; inadequate cases are explicitly reconstructed or deferred, never degraded to geometric guessing. The supported reference set therefore grows with verified coverage.

---

## 6. Data flow

### 6.1 Author an object (happy path)
1. User invokes a Command (e.g. draw+extrude a wall). UI validates the sketch/profile.
2. Command produces params + an `execute` call; the document model creates/updates the object node and marks it `stale`.
3. Worker `buildGeometry(params)` runs OCCT ops, assigns `SubShapeRef`s, returns a `ShapeHandle` (or a typed failure).
4. Worker tessellates → mesh buffers + provenance maps (transferables).
5. Main thread builds/updates the `BufferGeometry`, retains the provenance map, renders. Object → `valid`. An `UndoableEdit` delta is pushed.

### 6.2 Reference an object (Opening on a Wall)
1. User picks a wall face in the viewport → provenance map yields the face's `SubShapeRef`.
2. Opening object stores the host `SubShapeRef` + position + size + anchoring mode.
3. `buildGeometry` boolean-subtracts; identity propagates the result.

### 6.3 Edit the host (the payoff)
1. User changes the wall's length; wall node → `stale`; dependency DAG marks the Opening dependent.
2. Incremental rebuild re-runs the affected subgraph; the Opening's host `SubShapeRef` re-resolves along its derivation path (respecting the anchoring mode for position); geometry re-cuts.
3. If the referenced face no longer exists → Opening → `broken-ref`, surfaced for manual retargeting.

### 6.4 An agent authors an object (the same path, and that is the point)
1. Agent calls `window.bunyan.listCommands()` / `listTypes()` → schemas **generated from the registries** (§4.6). No docs, no SDK.
2. Agent calls `query(...)` → the **semantic projection** of the document (ids, types, params, levels, relationships — not triangles).
3. Agent calls `execute('createElement', { typeId: 'core.wall.v1', params, levelId })`.
4. **From here the path is byte-for-byte the path a button takes** (§6.1): the Command runs against `DocumentContext`, the kernel builds, identities propagate, the mesh re-tessellates, and an `UndoableEdit` is pushed.
5. The command **returns the `UndoableEdit`** — the agent's diff. It may then `measure` the result for exact quantities (D17) and confirm the model matches its intent.
6. On failure: a **typed** failure, **no** `UndoableEdit`, document at last-good (§7). The agent gets a machine-readable reason (`FILLET_RADIUS_TOO_LARGE`), not a stack trace — and can retry or report.

**Nothing in steps 3–6 is agent-specific.** That is the entire architecture of D19: the agent path *is* the human path, so it cannot rot separately, and it cannot fall behind.

### 6.5 Save / load
- **Save:** serialize `scene.json` (recipe + token map), `manifest.json` (incl. OCCT build id + per-type versions), optional `history.json`, `thumbnail.png` into the `.bimproj` zip — **plus `geometry-cache.brep` if and only if D29 lands it (⚠ UNDECIDED and UNBUILT; spec §6).**
- **Load:** read manifest; **rebuild from `scene.json`** — which is the ONLY path that exists today, and must remain a *supported* path forever (the recipe is truth). If a cache ships (D29) and its kernel build id differs, or it is missing/corrupt/untrusted, it is discarded and this same rebuild runs. Then run per-type migrations and deterministically replay tokens.

---

## 7. Failure & resilience architecture

- **Marshalled kernel failures [v1.0.0].** The worker wraps every OCCT call; `Standard_Failure` and invalid-result checks become a **typed `Fail`**. No crash of the WASM instance/tab.
- **Reject + keep last-good.** A failed operation yields **no** `UndoableEdit`; the document stays at its last valid state; the UI shows a typed, dismissible error.
- **No silent geometry.** No auto-repair (`ShapeFix`/tolerance relaxation/retry) in v1.0.0 — **[future]** refinement.
- **Field diagnostics [future].** A downloadable repro bundle (`scene.json` + failing op) is the intended diagnostics channel given there is no backend telemetry.
- **Memory discipline.** The `ShapeHandle` registry frees rebuild intermediates and superseded/cancelled results; heap telemetry drives a soft budget/warning. No rebuild leaves leaked WASM heap.
- **Crash recovery.** Capped-ring autosave (recipe + cache) to OPFS/IndexedDB with `navigator.storage.persist()`; recovery prompt on next boot.

---

## 8. Deployment, offline & performance

- **Static hosting** on Cloudflare Pages. **[v1.0.0] NO `COOP`/`COEP`, no `SharedArrayBuffer`, no capability detection, ONE WASM artifact** — the kernel is single-threaded (spec D8), so none of it is needed. This also *widens* deployability: cross-origin isolation restricts what a page may embed, and `SharedArrayBuffer` is blocked outright in some embedded/enterprise contexts.
- **[v1.0.x] When multi-threading lands**, the `_headers` (COOP `same-origin` + COEP `require-corp`), the CORP-compatibility audit for all cross-origin assets, the second WASM artifact and boot-time capability detection all return. The architecture is designed for that, but v1.0.0 does not pay for it.
- **Offline / PWA [v1.0.0].** A **service worker** precaches app shell + the WASM kernel, **keyed by the kernel build id** (`occt-<version>-emcc-<version>`) so a new release invalidates atomically; a Web App Manifest makes it installable. **One artifact to cache.** This backs "works offline after first load".
- **First-load budget.** The WASM is multi-MB, so an explicit size/time budget is measured in CI on a throttled profile and blocks release on regression; streaming compilation + preload + code-splitting meet it. *Current kernel: **3.98 MB raw / 1.47 MB gzip** — the linker keeps only the OCCT code our ops reach (§3.1).*
- **Scale performance.** GPU-side culling/instancing (compute shaders / TSL) for many repeated elements; incremental rebuild/re-tessellation of only the affected subgraph; large-model budgets for tessellation time, heap ceiling, and save latency.
- **Rendering:** three.js `WebGPURenderer` with automatic WebGL2 fallback; custom shading in **TSL** (compiles to WGSL + GLSL), not raw GLSL, since the legacy `ShaderMaterial`/`EffectComposer` path is unsupported on WebGPU.

---

## 8a. Agent transport *(decision D22)*

**The hard requirement is "no complex setup."** That single constraint decides the order of work.

| | **`window.bunyan` [v1.0.0]** | **MCP bridge [v1.0.x]** |
|---|---|---|
| What it is | the command layer, exposed on the page itself | a small local program relaying an **external** agent (Claude Desktop / Claude Code) into the browser |
| Who it serves | an **in-browser** agent (e.g. Claude in Chrome) | agents outside the browser |
| Install cost | **zero — it ships with the app** | a download, a config file, a running process |
| Backend needed | **none** | a local process (and a port) |

**`window.bunyan` is built first**, because an MCP bridge *is* the complex setup the requirement excludes — and because it would puncture the property that defines v1.0.0: **client-only, zero-backend, designs never leave the device** (§1, spec §1). **MCP is not rejected**; it is deferred, and it costs almost nothing later precisely *because* of D19: an MCP server is **another transport over the same verb set**, not a second API. This is the same move the kernel seam already makes — `Transport` is swappable, and `WorkerTransport`/`InProcessTransport` already prove it.

**Shape of the surface** (illustrative; the schema is *generated*, D21):

```ts
window.bunyan = {
  version:      () => ({ agentApi: 1, protocol: 1, kernelBuildId, app }),
  listCommands: () => CommandDescriptor[],   // generated from the Command registry (argsSchema)
  listTypes:    () => TypeDescriptor[],      // generated from the BIM Object Type registry
  execute:      (commandId, args) => CommandResult,  // UndoableEdit (the diff) | typed failure
  query:        (q) => SemanticView,         // the recipe, not triangles
};
```

**Versioned separately (D22).** The surface carries its own `agentApi` version, independent of `protocolVersion` (kernel) and of the P5 type-contract freeze (D13), so agent ergonomics can improve **without amending a frozen contract**. An agent asks what it is talking to and adapts.

**⚠ Trust boundary.** `window.bunyan` is a **page-global** API: *any* script running in that tab can drive the user's model. In v1.0.0 that is acceptable — there is no backend, no account, no secret, and the tab is the user's own (§10). It becomes a **real** question the moment the page hosts code it did not author: the **Pyodide macro console** [future] and any plugin surface. **⇒ Do not introduce third-party in-page code without revisiting this**; the answer will be a capability grant, not an afterthought.

**⚠ An agent cannot silently save to disk.** The File System Access API requires a **user gesture** to (re-)grant write permission after a page reload (§9, spec §7). An agent can author the whole model; a **human still clicks to save it to a file**. Autosave to OPFS/IndexedDB is unaffected, so agent work is never *lost* — it is just not written to the user's chosen file without them.

---

## 9. Persistence architecture

| Mechanism | Role | Availability |
|---|---|---|
| **File System Access API** | Primary save/open to a real file; stored handle for silent re-save **within a session** (cross-session requires a one-click permission re-grant) | Chromium |
| **Zip download + `<input file>`** | Universal save/open fallback | All browsers |
| **OPFS** | Fast scratch for the geometry cache | All modern |
| **IndexedDB** | Autosave snapshots, undo history, settings, stored handles | All modern |
| **Service Worker Cache Storage** | Offline precache of app + WASM | All modern |

`.bimproj` (zip) = `manifest.json` + `scene.json` + optional `history.json` + `thumbnail.png` **+ `geometry-cache.brep` ⚠ ONLY IF D29 LANDS IT — it is UNBUILT and UNDECIDED** (spec §6; decided at P3 step 4, with the measured rebuild cost). **[v1.0.0] no `export.ifc`** (IFC export deferred; `core_logic.md`/spec D3). The recipe (`scene.json`) is truth; the BREP would be a rebuildable cache; a stale/corrupt cache is never treated as truth.

---

## 10. Security & trust boundaries

All input is untrusted; there is no server to sanitize on.

- **Import hardening.** `.bimproj` zips: decompression size/ratio caps + entry-count limits (zip-bomb defense). IFC: schema validation + parsing inside the worker under a **timeout** so a hostile file cannot hang or OOM the tab.
- **Untrusted BREP cache.** `geometry-cache.brep` from an opened file is treated as untrusted on deserialize; failure falls back to rebuild-from-recipe. ⚠ **This rule is CONDITIONAL on D29** — the cache is unbuilt and may not ship. **Dropping it deletes this attack surface outright**, which is one of the strongest arguments for dropping it; keeping it means owning the hostile-BREP hardening test (spec §9).
- **Untrusted recipe.** `scene.json` (incl. the token map) is validated on load; malformed graphs fail safe rather than driving the naming engine into bad states.
- **Cross-origin isolation [v1.0.x only].** Not used in v1.0.0 (single-threaded — §8). When MT lands, `COEP: require-corp` both enables `SharedArrayBuffer` and constrains embeddable resources — an intentional isolation boundary, and a constraint on what the page may embed.
- **The agent surface is a page-global API [v1.0.0] (D22).** `window.bunyan` can be called by *any* script in the tab. Acceptable in v1.0.0 (no backend, no account, no secret, the user's own tab) and it is **not a privilege escalation** — it exposes exactly what the ribbon already exposes, which is the point of D19. It becomes a **real** boundary the moment the page runs code it did not author (the Pyodide macro console [future], any plugin surface); the answer then is an explicit capability grant, decided **before** that code ships, not after (§8a).
- **Scripting sandbox [future].** The Pyodide macro worker is isolated from the hot path, opt-in, lazy-loaded; its capabilities are an explicit, reviewed surface before it ships. ⚠ Note it will be the **first in-page code Bunyan did not author** — so it is the trigger for the capability-grant decision above, and it must run through the **same Command layer** (D19), never against the kernel directly.
- **Privacy [v1.0.0].** Client-only: designs never leave the device; the trade-off is no server-side telemetry (hence the [future] repro-bundle for diagnostics).

---

## 11. Testing architecture (how correctness is enforced)

Scoped by *what we are actually trying to catch* (spec §9, decision D9 — **rewritten 2026-07-11**):

**We trust OCCT; we verify our own code.** Validating the kernel is out of scope. The harness exists to catch *our* mis-wired parameters, *our* wrong op sequences, *our* broken WASM build, *our* regressions, and *our* measurement mistakes.

- **Reference-build oracle (primary):** gross **volume/area/length** and **solid/face/edge counts**, seeded **offline** from a **native OCCT build** (`cadquery-ocp`) on a **pinned environment**, compared within tolerance in CI against the WASM build. Same kernel, different binding/build/code path ⇒ a disagreement means *our* build or wiring is wrong. It does **not** certify OCCT (nor is it asked to): the earlier "independent kernel" framing was withdrawn because these bindings *are* OCCT.
- **Closed-form sanity check (where a formula exists):** exact analytic values, cross-checked **at seed time**; the seeder aborts on disagreement. Guards the one layer the reference build cannot — *our own measurement/seeding code*. Not required where no closed form exists.
- **Regression snapshots (no-regression only):** **per-sub-shape mass checksums** (over the naming token map) and the **adjacency-graph hash** (topology graph, nodes labelled by structural `SubShapeRef` IDs, canonical serialization, SHA-256). No external tool can produce structural-ID labels, so these are Bunyan-self-snapshots — drift guards that certify nothing on their own.
- **Exactness via the `measure` op (spec D17):** volume/area/edge-length come from OCCT's **`BRepGProp`**, **never** from the mesh — a tessellated cylinder under-reports its volume by the chord error, so quantities must read the B-Rep.
- **Mesh fidelity (planar cases):** the same quantities re-derived **from the triangles**. Independent of the above: a mis-wound, non-watertight or face-missing mesh still yields a *perfect* `measure` result, because `measure` never looks at the mesh. This is the only check that sees the mesh itself is wrong.
- **Bounds:** **tight** `Bnd_Box` vs. an explicit schema. ⚠ OCCT's box is **tolerant, not tight** — `BRepBndLib::Add` enlarges by the shape tolerance, so a box on the origin reports `xMin = -1e-7`; the gap must be cleared (`SetGap(0)`).
- **Naming honesty:** the harness **re-measures the role labels** the kernel assigns (a face named `x-min` must be the face at minimum x). Nothing else can catch a mislabelled face — the geometry stays exact and only the names are wrong (§5.2).
- **WASM-heap leak canary:** the handle registry's live count is asserted against the **WASM module's own independent count**. A registry agreeing with itself proves nothing.
- **Mock/kernel parity:** the mock and the real kernel must emit **identical `SubShapeRef`s** for the same input — the property that makes the mock→kernel swap a no-op for the browser (§12).
- **Persistent-naming regression suite:** "edit host → dependents re-resolve or correctly break"; the gate that validates OCCT edge/vertex history coverage (§5.6) and the **reference-stability corpus** for the kernel-migration gate.
- **Kernel-migration gate:** an OCCT upgrade within 1.0.x replays the reference-stability corpus and fails on any changed re-resolution.
- **Operation-failure tests:** known-failing ops surface typed failures with last-good preserved, no crash/partial state.
- **Command unit tests:** each Command against a mock `DocumentContext`, incl. failure paths.
- **IFC import-fidelity corpus [v1.0.0]:** import (mapped-or-GenericSolid) fidelity against public IFC test models. ⚠ Fidelity means **solids, not pictures** (spec D16): an imported element must be measurable/sectionable/booleanable, so the corpus asserts volume/area — not merely that something rendered. **Export round-trip is a [future] v1.0.x gate**.
- **Visual regression:** both WebGPU and WebGL2 backends.
- **First-load budget check:** throttled-profile CI gate.
- **Re-seed rule:** any new/changed `buildGeometry` must ship re-seeded goldens or CI fails.

CI runs the WASM build only; **the OCCT-native Python oracle (`cadquery-ocp`) is never in CI** — offline seeding only.

**Heavy runs vs. the box.** The dev box also serves the owner's live public sites, so any heavy build/benchmark (notably the OCCT→WASM compile) follows the **box-discipline protocol** in `v1.0.0_imp_plan.md` (Cross-cutting practices): free memory by pausing other projects' **non-production** services; **never** touch the production containers.

---

## 12. Actor topology (build-time architecture)

| Actor | Environment | Owns |
|---|---|---|
| **Architect** (human) | — | Contracts, scope, AEC correctness, merge arbitration |
| **Amer** (agent) | Local PC (real browser) | Browser hot path: rendering, tessellation-consumer + provenance, section-cut views, TSL, React shell, ribbon/property-panel generation, commands/undo, persistence, service worker/PWA |
| **Zayd** (agent) | Hetzner CX23 (headless) | Kernel: the OCCT→WASM build **and the kernel's C++ op set** (`kernel.cpp` — the kernel *is* C++), worker API, naming resolver, regression harness + offline seeding, IFC importer (IfcOpenShell, linked against our OCCT), CI, Cloudflare release pipeline |

The **seven registries** (D33 added Material + Section, 2026-07-13) are the seams between actors. To avoid Amer idling on the Zayd-heavy P1→P2→P3 critical path, Zayd publishes a **protocol-conformant kernel mock** early so the shell is built in parallel. Contract-freeze is split (decision D13): protocol first, type contracts after Wall+Opening validate them.

---

## 13. Architecture ↔ north-star traceability

| North-star (`core_logic.md` §9) | Architectural enabler already present |
|---|---|
| Analysis & quantities | `quantities`/`materials` on the Type contract; View registry hosts schedule representations |
| Real-time co-editing | Stable identity (§5), `UndoableEdit` deltas, explicit dependency DAG, no hidden global mutable geometry |
| Headless / server kernel | Flat engine-agnostic worker protocol (§3); location-independent identity engine |
| Scripting & generative design | Type is a registered contract (macro worker registers Types); sketches accept a future constraint solver; Opening anchoring is the first constraint |
| Interop breadth (STEP/DXF/glTF/IFC5) | Codec registry with schema-version abstraction; mapped-or-GenericSolid import |
| **Agent-operable authoring** (D19–D23) | **One command layer for every actor** (§4.6, principle 7); registries **generate** the agent tool list (`argsSchema`) as they generate the ribbon; every command **returns its state delta** (the verifiable diff); typed failures; sub-shape identity survives rebuilds; `window.bunyan` needs **no install**, and MCP is a later *transport* over the same verbs (§8a) |

---

## 14. Pointers

- **What the app *means*** (entities, identity, rules, states, north-stars): `core_logic.md`.
- **What ships first** (scope, decisions D1–D18, acceptance criteria): `V1.0.0_spec.md`.
- **Live build status** (what is actually built and verified, and by whom): `current_state.md`.
- **Build sequence** (phases, exit criteria): `v1.0.0_imp_plan.md`.
