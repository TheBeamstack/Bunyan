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
3. `V1.0.0_spec.md` — scope, decisions D1–D13, acceptance criteria. *What ships first.*
4. `v1.0.0_imp_plan.md` — the 7 phases and their exit criteria. *The build sequence.*

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

**Phase: P1 → P2. THE KERNEL IS REAL.** The protocol seam, the kernel host, the mock kernel, the
client dispatcher, the geometry harness, the goldens and the CI definition all exist and are green —
**and as of Entry 4 there is a working OCCT WebAssembly kernel whose geometry matches the native-OCCT
goldens exactly.** The single largest P1 item is **done**.

```
pnpm verify   →  typecheck (strict) ✓   eslint ✓   41/41 tests ✓   prettier ✓
kernel spike  →  upstream OCCT 7.9.3 → WASM, volume/area/edgeLength/counts ALL EXACT ✓
```

**Committed and pushed:** `origin/main` @ **`d54ae02`**. Amer is unblocked and can now build against
**real geometry** (`tools/kernel-build/wasm/`), not just the mock.

**⚠ THREE THINGS A FRESH AGENT MUST NOT REDISCOVER THE HARD WAY:**

1. **`opencascade.js` CANNOT be linked on this box — and we do not use it.** Its `-flto` object cache
   forces a whole-program-optimisation link that is **OOM-killed at a 2 GB cap even for a 6-symbol
   build** (Entry 3). **Do not retry it. Do not fork it.** We build **upstream OCCT 7.9.3** with **LTO
   off** — recipe in **`tools/kernel-build/`**, and it builds *here*, on this box.
2. **`/tmp` is a tmpfs — it costs RAM, not disk.** A dead session's scratchpad was holding **1.1 GB of
   RAM** hostage. Before invoking §6a to pause another project's containers, run `du -sh /tmp` — our own
   tooling is usually the hog. (All other projects' containers **combined** use ~77 MB.)
3. **The kernel is NOT yet wired into `packages/kernel-occt`** — that package does not exist. The
   working `.wasm` is committed at `tools/kernel-build/wasm/`, and `pnpm verify` is still the same
   41/41 (mock-based). **Wiring it in is the next task — see §5.**

**⚠ CI has still never been observed green** — pushes have landed, but there is **no `gh` CLI and no
GitHub token on this box**, so the Actions result cannot be read (the API 404s to anonymous callers
because the repo is private). **Someone must confirm the first run by eye.** See §5.

---

## §2 — Contract status (get this wrong and you break the build model)

The **split contract-freeze** (decision D13) is the rule that lets Amer and Zayd work in parallel.

| Contract | Status | Freezes |
|---|---|---|
| **Kernel message protocol** (`@bunyan/protocol`: envelope, typed failures, provenance channel) | **Release-candidate, v1** — implemented, tested, *not yet frozen* | **End of P3.** After that, changes need Architect sign-off. |
| **`SubShapeRef`** | **Release-candidate** | **P5**, after Wall + Opening exercise it. |
| **`BimObjectType`** | Not yet written | P5 |
| **`Command`** | Not yet written | P5 |

**Practical consequence:** the protocol is *changeable today* and will not be after P3. If P2 reveals
that OCCT needs a shape the protocol cannot express, **now is the time to fix it** — see the known
gap in §4 (a `measure` op).

---

## §3 — What exists, and how it was verified

Repo layout (all new this session):

```
packages/
  protocol/       @bunyan/protocol      the flat versioned message contract (zero deps)
  kernel-core/    @bunyan/kernel-core   KernelHost (dispatch + failure marshalling) + ShapeRegistry
  kernel-mock/    @bunyan/kernel-mock   protocol-conformant fake kernel + Worker entry
  kernel-client/  @bunyan/kernel-client KernelClient + WorkerTransport / InProcessTransport
tests/            41 tests + tests/goldens/geometry.golden.json + tests/harness/measure.ts
tools/oracle/     Python (uv): offline golden seeding — analytic + OCCT cross-check
scripts/          check-reseed.mjs (the re-seed CI gate)
.github/workflows/ci.yml
```

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

### NOT verified / NOT built (do not assume otherwise)

- **No OCCT. No WASM. No real geometry.** The mock is a mock. Every green geometry test today proves
  the *harness and the protocol*, not the kernel. This is stated loudly at the top of
  `tests/golden-box.test.ts` so nobody over-reads a green tick.
- **CI has never run.** `.github/workflows/ci.yml` is written but nothing has been pushed, so GitHub
  Actions has never executed it. Treat it as unproven until it goes green once.
- **No browser app.** `apps/web` does not exist. Deliberate: the browser hot path is Amer's, and I
  cannot verify browser code headlessly — shipping unverified rendering code into his territory would
  be worse than leaving it clean. The integration point he needs is in §5.
- **No service worker / PWA, no Cloudflare Pages deploy, no COOP/COEP headers** (P1 steps 6–7).
- **No `.bimproj`, no document model, no registries** (P3).

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

### 4d — RULED by the owner, 2026-07-12 (Entry 5) — READ THESE FIRST

**(8) LICENSING — OCCT as a SWAPPABLE SIDE-MODULE. RULED, NOT YET IMPLEMENTED, MUST BE MEASURED.**
OCCT is **LGPL 2.1**; its "exception" covers only *header* material in object code, **not** general
static linking. Our kernel **statically links** OCCT into one `.wasm`, which triggers LGPL's obligation
to let a user **relink against their own modified OCCT**. The owner ruled for the **side-module** route
(OCCT as a separate, replaceable `.wasm`) — the most clearly compliant option.

⚠ **The consequence he was told, and which the next session must quantify before building on it:** a
side module **cannot be dead-stripped** the way the static link is — it must keep whatever a caller
*might* use. **That will likely cost much of the 9× size win** (3.94 MB → possibly tens of MB), plus a
boundary performance cost and real build complexity. **⇒ FIRST TASK: prototype the side-module split
and report real size/speed numbers.** If the cost is mild, take it. If it is brutal, bring the owner
the numbers so he can weigh it against **shipping our object files** (option 1 — same legal end, a
*promise* of relinkability rather than a *demonstration*, and it costs nothing). **Do not silently
absorb a 10× regression on his behalf.**

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

**The kernel exists. The next four tasks are, in order:**

1. **⚠ FIRST — measure the LGPL side-module cost (§4d-8). Do this BEFORE building anything on top of
   the static kernel.** The owner ruled for OCCT-as-a-swappable-side-module, and he was told it will
   **probably cost much of the 9× size win** (a side module can't be dead-stripped — it must keep what
   a caller *might* use). **Prototype the split, measure the real artifact size and op latency, and
   report.** If mild → adopt it. If brutal → bring him the numbers so he can weigh it against **shipping
   our object files** (same legal end, zero cost). **Do not silently absorb a 10× size regression.**
   *This is first because it may change the build, and everything downstream inherits that choice.*

2. **Wire the kernel into `packages/kernel-occt`** — the payoff task. Create the package implementing
   `KernelImplementation` (the mock in `packages/kernel-mock` is the reference; `KernelHost` supplies
   dispatch and failure marshalling, so the package is a thin adapter over
   `tools/kernel-build/wasm/bunyan-kernel.js`). Map the C++ ops to the protocol:
   `makeBox → makeBox`, `tessellate → tessellate`, `releaseShape → releaseShape`, and **`measure` → a
   NEW op in the `OpMap`** (§4c-6 — the protocol freezes at the end of P3, so add it now; the C++ side
   already implements it via `BRepGProp`).
   **The instant it answers, `tests/golden-box.test.ts` certifies real geometry with ZERO test
   changes** — that is the whole payoff of the transport-agnostic design. Also port
   `tools/kernel-build/verify.mjs`'s assertions into the vitest suite so CI gates the real kernel.
   ⚠ **Provenance:** the C++ returns a per-triangle **face index**; the naming layer must map that to a
   `SubShapeRef`. The mock names faces by canonical slot — the OCCT kernel must produce **stable**
   identities derived from the op that made them, **never** from geometric position (spec §4.5, D1).

3. **P2 — persistent naming (D1), the #1 risk.** Verify OCCT history coverage **empirically first**
   (spec §4.5): `Generated`/`Modified`/`IsDeleted` is robust for faces but weakest for **edges/vertices
   from boolean section curves**, and the hardest case is **a fillet on an edge produced by a boolean**.
   Find out what OCCT actually gives us **before** designing the resolver. *(`TKHLR`, `TKOffset`,
   `TKShHealing` and `BRepTools_History` are all already in the build.)*
   *Single-threaded is now a ruling (§4d-9) — do this hard correctness work on a deterministic kernel.*

4. **Confirm CI is actually green — cheap, and STILL unproven.** Pushes have landed (`d54ae02`) but
   nobody has *seen* the workflow pass. There is **no `gh` CLI and no GitHub token on this box**, and
   the repo is private, so the Actions API 404s anonymously. Either the owner looks at the Actions tab,
   or he installs `gh` / drops a token so an agent can. **Treat CI as unproven until then.**
   *(Note: CI runs `pnpm test`, which is still mock-based — once step 2 lands, CI gates real geometry.)*

**For Amer (browser hot path) — unblocked *now*, do not wait for the kernel:**

The mock exists precisely so P4 can start in parallel (spec §12's critical-path mitigation). To
render and pick against a real protocol-conformant kernel today:

```ts
import { KernelClient, WorkerTransport } from '@bunyan/kernel-client';
import { faceRefForTriangle, decodeSubShapeRef } from '@bunyan/protocol';

const worker = new Worker(new URL('@bunyan/kernel-mock/worker', import.meta.url), { type: 'module' });
const kernel = new KernelClient(new WorkerTransport(worker));

await kernel.handshake();
const shape = await kernel.request('makeBox', { nodeId: 'wall-1', dx: 3000, dy: 200, dz: 2500 });
const mesh  = await kernel.request('tessellate', { handle: shape.handle, deflection: 0.1 });

// mesh.positions / normals / indices  → three.js BufferGeometry
// mesh.provenance                     → RETAIN IT: this is what makes picking authorable
// on click: faceRefForTriangle(mesh, hit.faceIndex, decodeSubShapeRef) → a stable SubShapeRef
```

Use `coalesceKey` on parameter edits (e.g. `{ coalesceKey: 'rebuild:wall-1' }`) — the client will
supersede stale rebuilds and free their geometry for you. When the OCCT kernel lands, **only the
Worker URL changes.**

Amer also owns: `apps/web` scaffold (Vite/React), the service worker + PWA (D11), and the
COOP/COEP `_headers` for Cloudflare Pages (P1 steps 6–7) — all still to do.

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
pnpm test            # 41 tests, headless Node, ~1.4s

# Offline golden seeding (NEVER in CI) — needs uv at ~/.local/bin/uv:
cd tools/oracle
VIRTUAL_ENV=$PWD/.venv uv run seed-goldens ../../tests/goldens
```

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
