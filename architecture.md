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

---

## 2. Runtime layers & processes

```
┌───────────────────────────────────────────────── Main thread (UI) ─────────────────────────────────────────────┐
│  React app shell        Registries (runtime)          three.js scene (WebGPURenderer / WebGL2 fallback)          │
│  - ribbon (generated)   - BIM Object Type             - BufferGeometry (mesh + retained provenance map)          │
│  - property panel (gen) - Command / Action            - camera controls (never blocked on kernel)                │
│  - view tabs            - File Format Codec           Selection / picking → SubShapeRef (via provenance)         │
│                         - View / Representation        Undo/redo (UndoableEdit state deltas)                      │
│  Document model (scene graph + dependency DAG + naming token map)   Persistence manager   Service worker         │
└───────────────┬─────────────────────────────────────────────────────────────────────────────────┬─────────────┘
                │ postMessage (flat versioned protocol, transferable ArrayBuffers, correlation ids)  │  Cache Storage
┌───────────────▼──────────── Geometry Worker ───────────────┐          ┌───────── Macro Worker [future] ─────────┐
│  OpenCascade.js (OCCT WASM: multi-threaded | single-thread)│          │  Pyodide (lazy, sandboxed, opt-in)      │
│  Command executor        ShapeHandle registry (lifecycle)   │          │  registers Types via the same contracts │
│  Persistent-naming resolver (functional/generative)         │          └─────────────────────────────────────────┘
│  Canonical re-sort (determinism)   Tessellation + provenance│
│  IFC importer (web-ifc) [v1.0.0]   Operation-failure marshaller
└─────────────────────────────────────────────────────────────┘
```

- **Main thread** owns UI, the document model (the truth), registries, the three.js scene, persistence, and the service worker. It holds **no raw OCCT pointers** — only opaque `ShapeHandle`s and `SubShapeRef`s.
- **Geometry worker** owns OCCT, the naming resolver, tessellation, IFC **import** [v1.0.0], and failure marshalling. All heavy work happens here so the UI thread stays responsive.
- **Macro worker [future]** runs Pyodide in isolation; it never participates in the interactive hot path and registers its outputs through the ordinary Type contract.
- **Threading:** OCCT runs multi-threaded when cross-origin isolation is available, else single-threaded (§8). Parallel boolean execution makes ordering non-deterministic, which the canonical re-sort normalizes (§5.4).

---

## 3. Kernel worker protocol (the primary seam)

The protocol is a **flat, versioned, request/response message contract** — the single most important architectural boundary, because it is what keeps the kernel swappable/relocatable.

- **Envelope:** `{ protocolVersion, correlationId, op, payload }` → `{ correlationId, result | failure }`. Large binary payloads (BREP blobs, mesh buffers) travel as **transferable `ArrayBuffer`s**.
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
| **Command / Action** | `commandId`, `execute → CommandResult` (UndoableEdit \| typed failure), optional `contributesUI` | New tools (draw/edit/array/retarget→…) |
| **File Format Codec** | `Importer` / `Exporter` against a schema-version abstraction | New formats (IFC import [v1.0.0] → IFC export → STEP/DXF/glTF/IFC5) |
| **View / Representation** | derived projection of the document graph | New views (3D, plan, elevation → schedules, sheets) |
| **Persistent Naming** | resolver binding consuming maker maps; `SubShapeRef` currency | Internal; the substrate all references use |

Cross-cutting properties:
- **UI is generated from registries.** The ribbon is generated from Commands' `contributesUI`; the property panel is generated from a Type's `parameterSchema`. Adding a command/type contributes UI with zero hand-wiring.
- **Undo is registry-agnostic.** It operates on `UndoableEdit` deltas, so new commands never touch the undo system.
- **Migration is per-Type/version.** `manifest.json` records per-type versions; load-time migration functions keep old projects loadable.
- **Contract freeze is split** (decision D13): the message protocol freezes early (P3); `SubShapeRef`/`BimObjectType`/`Command` freeze after two real types (Wall+Opening) validate them (P5).

---

## 5. Persistent-naming engine (mechanics)

The domain intent is in `core_logic.md` §5; this is the mechanism.

### 5.1 Identity as a derivation path
A `SubShapeRef` is a structured path — `nodeId` (owning object/operation), `role` (semantic slot, e.g. "lateral face k=2"), `occurrence` — through the **operation DAG**. It is assigned when an operation runs and never recovered geometrically.

### 5.2 Propagation via maker maps
Each operation uses OCCT's `BRepBuilderAPI_MakeShape` interface — `Generated()`, `Modified()`, `IsDeleted()` — to label its outputs from its inputs as it builds. No geometric matching on the resolve path.

### 5.3 Hybrid granularity
- **Coarse (feature)** — user-facing history.
- **Fine (primitive-op)** — the layer references actually resolve against.

### 5.4 Determinism (multi-threaded safe, cross-machine safe)
- OCCT boolean parallelism makes `Generated`/`Modified` **ordering** non-deterministic. Before assigning IDs, each operation's output is passed through a **canonical re-sort** using a **structural tie-break** (order children by the identities of the tool/input entities — pure graph data).
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

### 6.4 Save / load
- **Save:** serialize `scene.json` (recipe + token map), write `geometry-cache.brep`, `manifest.json` (incl. OCCT build id + per-type versions), optional `history.json`, `thumbnail.png` into the `.bimproj` zip.
- **Load:** read manifest; if kernel build id differs or cache missing/corrupt/untrusted → discard cache and rebuild from `scene.json`; run per-type migrations; deterministically replay tokens.

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

- **Static hosting** on Cloudflare Pages; `_headers` sets `COOP: same-origin` + `COEP: require-corp` to unlock `SharedArrayBuffer` for the multi-threaded WASM. All cross-origin assets must be CORP-compatible or same-origin.
- **Two WASM artifacts:** multi-threaded (cross-origin-isolated contexts) and single-threaded fallback (with a "reduced performance" notice). Capability detection at boot selects one.
- **Offline / PWA [v1.0.0].** A **service worker** precaches app shell + the WASM kernel, **keyed by the OCCT/OpenCascade.js build id** so a new release invalidates atomically; a Web App Manifest makes it installable. Both artifacts are cache-covered (or the chosen one is fetched-and-cached on first successful boot). This backs "works offline after first load".
- **First-load budget.** Because the WASM is multi-MB, an explicit size/time budget is measured in CI on a throttled profile and blocks release on regression; streaming compilation + preload + code-splitting meet it.
- **Scale performance.** GPU-side culling/instancing (compute shaders / TSL) for many repeated elements; incremental rebuild/re-tessellation of only the affected subgraph; large-model budgets for tessellation time, heap ceiling, and save latency.
- **Rendering:** three.js `WebGPURenderer` with automatic WebGL2 fallback; custom shading in **TSL** (compiles to WGSL + GLSL), not raw GLSL, since the legacy `ShaderMaterial`/`EffectComposer` path is unsupported on WebGPU.

---

## 9. Persistence architecture

| Mechanism | Role | Availability |
|---|---|---|
| **File System Access API** | Primary save/open to a real file; stored handle for silent re-save **within a session** (cross-session requires a one-click permission re-grant) | Chromium |
| **Zip download + `<input file>`** | Universal save/open fallback | All browsers |
| **OPFS** | Fast scratch for the geometry cache | All modern |
| **IndexedDB** | Autosave snapshots, undo history, settings, stored handles | All modern |
| **Service Worker Cache Storage** | Offline precache of app + WASM | All modern |

`.bimproj` (zip) = `manifest.json` + `scene.json` + `geometry-cache.brep` + optional `history.json` + `thumbnail.png`. **[v1.0.0] no `export.ifc`** (IFC export deferred; `core_logic.md`/spec D3). The recipe (`scene.json`) is truth; the BREP is a rebuildable cache; a stale/corrupt cache is never treated as truth.

---

## 10. Security & trust boundaries

All input is untrusted; there is no server to sanitize on.

- **Import hardening.** `.bimproj` zips: decompression size/ratio caps + entry-count limits (zip-bomb defense). IFC: schema validation + parsing inside the worker under a **timeout** so a hostile file cannot hang or OOM the tab.
- **Untrusted BREP cache.** `geometry-cache.brep` from an opened file is treated as untrusted on deserialize; failure falls back to rebuild-from-recipe.
- **Untrusted recipe.** `scene.json` (incl. the token map) is validated on load; malformed graphs fail safe rather than driving the naming engine into bad states.
- **Cross-origin isolation.** `COEP: require-corp` both enables `SharedArrayBuffer` and constrains embeddable resources — an intentional isolation boundary.
- **Scripting sandbox [future].** The Pyodide macro worker is isolated from the hot path, opt-in, lazy-loaded; its capabilities are an explicit, reviewed surface before it ships.
- **Privacy [v1.0.0].** Client-only: designs never leave the device; the trade-off is no server-side telemetry (hence the [future] repro-bundle for diagnostics).

---

## 11. Testing architecture (how correctness is enforced)

Split by *what a check can actually certify* (spec §9, decision D9):

- **Independent oracle (first-correctness):** gross **volume/area/length** and **solid/face/edge counts**, seeded **offline** from pythonocc-core/FreeCAD on a **pinned environment**, compared within tolerance in CI against the WASM build. Independent kernel ⇒ certifies geometry is actually right.
- **Regression snapshots (no-regression only):** **per-sub-shape mass checksums** (over the naming token map) and the **adjacency-graph hash** (topology graph, nodes labelled by structural `SubShapeRef` IDs, canonical serialization, SHA-256). pythonocc cannot produce structural-ID labels, so these are Bunyan-self-snapshots — honestly documented as regression guards, with first-correctness coming from the oracle + manual seed review.
- **Bounds:** tight `Bnd_Box` (`BRepBndLib::AddOptimal`) vs. an explicit schema.
- **Persistent-naming regression suite:** "edit host → dependents re-resolve or correctly break"; the gate that validates OCCT edge/vertex history coverage (§5.6) and the **reference-stability corpus** for the kernel-migration gate.
- **Kernel-migration gate:** an OCCT upgrade within 1.0.x replays the reference-stability corpus and fails on any changed re-resolution.
- **Operation-failure tests:** known-failing ops surface typed failures with last-good preserved, no crash/partial state.
- **Command unit tests:** each Command against a mock `DocumentContext`, incl. failure paths.
- **IFC import-fidelity corpus [v1.0.0]:** import (mapped-or-GenericSolid) fidelity vs. web-ifc public test models; **export round-trip is a [future] v1.0.x gate**.
- **Visual regression:** both WebGPU and WebGL2 backends.
- **First-load budget check:** throttled-profile CI gate.
- **Re-seed rule:** any new/changed `buildGeometry` must ship re-seeded goldens or CI fails.

CI runs the WASM build only; **pythonocc is never in CI** (offline seeding only).

---

## 12. Actor topology (build-time architecture)

| Actor | Environment | Owns |
|---|---|---|
| **Architect** (human) | — | Contracts, scope, AEC correctness, merge arbitration |
| **Amer** (agent) | Local PC (real browser) | Browser hot path: rendering, tessellation-consumer + provenance, section-cut views, TSL, React shell, ribbon/property-panel generation, commands/undo, persistence, service worker/PWA |
| **Zayd** (agent) | Hetzner CX23 (headless) | Kernel: OCCT WASM builds (MT+ST), worker API, naming resolver, regression harness + offline seeding, IFC importer, CI, Cloudflare release pipeline |

The **five registries** are the seams between actors. To avoid Amer idling on the Zayd-heavy P1→P2→P3 critical path, Zayd publishes a **protocol-conformant kernel mock** early so the shell is built in parallel. Contract-freeze is split (decision D13): protocol first, type contracts after Wall+Opening validate them.

---

## 13. Architecture ↔ north-star traceability

| North-star (`core_logic.md` §9) | Architectural enabler already present |
|---|---|
| Analysis & quantities | `quantities`/`materials` on the Type contract; View registry hosts schedule representations |
| Real-time co-editing | Stable identity (§5), `UndoableEdit` deltas, explicit dependency DAG, no hidden global mutable geometry |
| Headless / server kernel | Flat engine-agnostic worker protocol (§3); location-independent identity engine |
| Scripting & generative design | Type is a registered contract (macro worker registers Types); sketches accept a future constraint solver; Opening anchoring is the first constraint |
| Interop breadth (STEP/DXF/glTF/IFC5) | Codec registry with schema-version abstraction; mapped-or-GenericSolid import |

---

## 14. Pointers

- **What the app *means*** (entities, identity, rules, states, north-stars): `core_logic.md`.
- **What ships first** (scope, decisions D1–D13, acceptance criteria): `V1.0.0_spec.md`.
- **Build sequence** (phases, exit criteria): `v1.0.0_imp_plan.md`.
