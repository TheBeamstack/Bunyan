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

**Phase: P1 (Foundations & Toolchain) — partially complete.** The protocol seam, the kernel host,
the mock kernel, the client dispatcher, the geometry harness, the goldens and the CI definition all
exist and are green. **The OCCT WASM build does not exist yet** — that is the single largest
remaining P1 item and the next major task. **Before touching it, read §6a (box discipline): it is the
heaviest run in the project and this box also serves the owner's live public websites.**

**Nothing is committed.** The working tree holds all of the work below on top of `f658ad8`
("first commit", which contains only the four design documents). Commit/push is owner-gated.

**Green as of Entry 1**, on the dev box, headless:

```
pnpm verify   →  typecheck (strict) ✓   eslint ✓   41/41 tests ✓   prettier ✓
```

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

### 4b — STILL OPEN (needs an owner call before the next big move)

**(A) Kernel build sequencing — the next task depends on this.** The OCCT→WASM build has not been
started (it is the heaviest run in the project; see §6a). Two orders are defensible:
- **Prebuilt single-threaded first** *(my recommendation)*: drop in the ready-made `opencascade.js`
  (~66 MB, single-threaded) so **real geometry** is behind the protocol within about a session — which
  unblocks **persistent naming**, explicitly the hardest item and the #1 schedule risk. Standard
  practice is to attack the riskiest unknown earliest. The custom multi-threaded build (decision D8)
  then follows as a separate task. *This changes the **order** of D8, not its **scope**.*
- **Custom build first** (as the plan literally reads): pins the OCCT build id early (it is stamped
  into every saved file and controls cache invalidation) and lets us strip OCCT down, which is the real
  fix for the download-size budget. But it delays the riskiest item.
- With ruling (3) in place, either can now be run *safely* on the box.

**(B) Commit & push — time-sensitive.** Nothing is committed; that gate is the owner's. **Amer cannot
start until this is on GitHub** — the mock kernel exists precisely so he can build the browser side in
parallel rather than idling behind the kernel for weeks. Every day unpushed is a day of parallel work
lost. Pushing also proves the CI workflow, which has never actually run.

**(C) A `measure` op, before the protocol freezes.** The harness currently derives volume/area/length
from the **tessellation**, which is exact only for **planar-faced** solids — so the circular Column
cannot be gated this way (a tessellated cylinder under-reports its volume by the chord error). P2 needs
a `measure` op backed by OCCT's `BRepGProp`. **The protocol freezes at the end of P3**, so adding it is
free now and expensive later. I did not add it speculatively because its shape should be driven by the
real kernel, not guessed. *Recommendation: add it in P2, as soon as the kernel exists.*

**(D) Awareness, not a decision yet.** Multi-threading (D8) drags real complexity behind it: COOP/COEP
headers, `SharedArrayBuffer` (blocked outright in some contexts), and non-deterministic boolean
ordering that the canonical re-sort must neutralise. If the MT build proves flaky, **shipping v1.0.0
single-threaded and adding MT in v1.0.x is a legitimate scope call.** Flagged now so it isn't discovered
under release pressure.

---

## §5 — Next actions (in priority order)

**For Zayd (kernel/headless):**

1. **Get a real OCCT kernel behind the protocol** — the critical path. **⚠ Sequencing is an open owner
   call (§4b A):** prebuilt single-threaded first (recommended — fastest route to real geometry, and it
   unblocks persistent naming, the #1 risk), or the custom multi-threaded build first (as the plan
   literally reads). Either way the shape of the work is the same: `packages/kernel-occt` implementing
   `KernelImplementation` (the mock is the reference; `makeBox` + `tessellate` are the first two ops).
   **Any WASM build MUST follow §6a — it is the heaviest run in the project and the box hosts live
   public sites.** The instant the kernel answers, `tests/golden-box.test.ts` starts certifying real
   geometry with **zero test changes** — that is the payoff of the transport-agnostic design. The custom
   MT build must also confirm `BOPAlgo` parallelism is genuinely active, not silently single-threaded.
2. **P2 step 4 — verify OCCT history coverage empirically *before* building the general resolver.**
   The spec (§4.5) is explicit that `Generated`/`Modified`/`IsDeleted` is robust for faces but weakest
   for **edges/vertices from boolean section curves**, and the hardest case is a fillet on an edge
   produced by a boolean. Find out what OCCT actually gives us before designing around it.
3. Add the `measure` op (§4 item 4) while the protocol is still unfrozen.
4. Push once, to prove CI actually goes green (owner-gated).

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
