# Miqdar — Agent-Native Structural Analysis & Design Platform — v1.0.0 Technical Specification (FIRST DRAFT)

**Status:** Second draft — owner-scoped, not yet frozen. Expect revision.
**Version:** **Miqdar v1.0.0** (independent of Bunyan's versioning — see the naming rule below)
**Revision:** 2026-07-13 — review pass. **Four owner rulings applied** (M13 → *closed source*; M11 → authored utilization cap; M8/O-M4 → normative register; Bunyan-side enforcement anchors). Initial draft: 2026-07-12.
**Home:** ⚠ **This document lives in the Bunyan repo deliberately** (owner ruling, M1): it is updated as Bunyan evolves, and it is how Bunyan's build stays *aware of Miqdar* — every Bunyan contract freeze must check this spec first (§3.4). **When Miqdar development starts, Miqdar gets its own repo next to Bunyan's; this spec moves there and a pointer stays here.**
**Companion documents (Bunyan repo):** `core_logic.md`, `architecture.md`, `V1.0.0_spec.md`, `v1.0.0_imp_plan.md`, `current_state.md`. **Miqdar's own:** `Miqdar_normative_register.md` (the code corpus, per jurisdiction — owner-editable; resolves O-M4).
**Name:** *Miqdar* (مقدار) — "measure / quantity / magnitude."

> ⚠ **Naming rule (M17), and it is not pedantry:** **both products are independently versioned, and both will have a "1.0.0".** Every log entry, commit message, `current_state.md` line and release note **must** write **"Bunyan v1.0.0"** or **"Miqdar v1.0.0"** — **never a bare "v1.0.0"**. `current_state.md` exists to stop agents re-deriving state across sessions and machines; a bare version string is exactly the ambiguity it is built to prevent.

> **The one-line division of labour (owner ruling, M1):** **Bunyan is for modelling — everything, structural or architectural — the way Revit/ArchiCAD are. Miqdar is for analysis and design only — the way RSA/ETABS/Midas/SAP2000 are.** They are two products over shared DNA, related the way Revit and Robot Structural Analysis are related — except the link between them is built on stable identity (D1) and one command layer (D19), the two things that make the Revit↔RSA link chronically painful in the incumbents.

---

## 1. Vision & thesis

Structural engineering design is, for the large routine core of building work, **a constrained optimization problem with a fast, deterministic, physics-plus-code verifier**. Today that verifier (the FEA solver + the code checker) exists inside ETABS/RSA/Midas — but it is gated behind GUI workflows, opaque binary files, per-seat desktop licences and human review cadence. Miqdar's thesis:

- **The model is a structured, diffable, version-controlled graph** — analytical members, loads, code rules, design results — never an opaque binary.
- **Code compliance is a structured, queryable result** — `{member, clause, ratio, governing combination, station, pass/fail}` — never a PDF a human re-derives intent from. (The PDF still exists — as a *generated projection* for the humans and institutions that need it, §9.)
- **The solver is a fast, incremental, callable oracle** an agent hits many times per session — not a batch re-run behind a dialog box.
- **Optimization is a first-class operation** — driven against real constraints (the code checks themselves), with an *authored* objective (§7).
- **A licensed human engineer remains in responsible charge, and the product is built to make that review tractable and rigorous** — a structured diff and a clause-traceable compliance report instead of a drawing to re-derive intent from (§9). Miqdar does not try to remove liability; it makes the human's review *better than it is today*, which is the only version of this product that is defensible, insurable, and sellable.

**Non-negotiable principles (each inherits from a proven Bunyan decision):**

1. **The analytical recipe is the source of truth. Analysis results are derived and disposable. Reports are projections.** (M2 — the exact mirror of Bunyan's core invariant: recipe → B-Rep → mesh :: analytical model → results → report.)
2. **Agent-native by construction, not by integration.** One command layer for every actor, human or agent; capability discovery generated from registries; every command returns its diff; typed failures. (M5 — D19–D23 adopted wholesale.)
3. **The idealization is authored, never guessed.** Mapping a physical building to an analytical model is engineering judgment; Miqdar records it as explicit, versioned, first-class state (M3, §4.1).
4. **Code families are registrations, not core code.** v1.0.0 ships three validated jurisdictions (M8); everything after is additive (§5).
5. **We wrote the solver, so we verify the solver.** The inverse of Bunyan's D9 — there is no industrial kernel to trust here (M7, §10).
6. **Browser-native, serverless, offline-first — but CLOSED SOURCE.** Same stack philosophy and the same zero-install promise as Bunyan; **the opposite licence.** Bunyan is open (AGPL-3.0 + commercial); **Miqdar is proprietary** (owner ruling 2026-07-13, M13). The asymmetry is deliberate and it is the business: *Bunyan is the wedge, Miqdar is the moat.* ⚠ **This ruling changes a hard technical constraint — see M13-b and §6.1: the shipped artifact may now link PERMISSIVE code only. LGPL is no longer safe, and Miqdar may never link OCCT.**
7. **Fail loudly, never plausibly.** A check that cannot be computed is a typed refusal, never a guessed ratio — the naming-engine lesson (`core_logic.md` §5), transplanted: **a wrong-but-plausible compliance result is worse than no result.**

---

## 2. What Miqdar is, and is not

**Is:** an analysis & design environment in the RSA/ETABS/Midas/SAP2000 class — analytical modelling, linear static / modal / response-spectrum analysis, code-based member design (RC, steel, prestressed — M9), seismic verification for the shipped jurisdictions, design optimization, and engineer-facing deliverables (compliance reports, *notes de calcul*).

**Is not:**
- **A BIM authoring tool.** Architectural modelling, openings, documentation sheets, IFC authoring — all Bunyan. If a workflow needs "model a thing that is not analytical," the answer is Bunyan.
- **A drawing/detailing tool (v1.0.0).** Rebar detailing drawings, steel shop drawings, connection detailing are out of scope (§12).
- **A performance-based design tool.** Nonlinear time-history, pushover, displacement-based assessment: excluded from the agent loop and from v1.0.0 entirely (§12); some return in 1.0.x as *batch* capabilities, never as the iteration oracle.
- **A stamping robot.** No output is represented as verified engineering work without an explicit engineer sign-off action (M12, §9).

---

## 3. Relationship to Bunyan (the load-bearing section — this is why the spec lives here)

### 3.1 The workflows (owner ruling — bidirectional, standalone-capable)

Miqdar authors its own analytical models — an engineer who never opens Bunyan can use it exactly as they use ETABS today. The Bunyan link is the premium workflow, not a prerequisite. Three canonical paths:

| Path | Flow |
|---|---|
| **Architecture-first** | Architect models in Bunyan → structural elements imported into Miqdar → idealized (authored, §4.1) → analyzed/designed → section/size changes exported back to Bunyan. |
| **Structure-first** *(the owner's atypical-building path)* | Engineer models & designs the structure in Miqdar → **exports the designed structural model to Bunyan as physical BIM types** → architect completes the building around it. |
| **Standalone** | Miqdar alone, ETABS-style. Import from IFC (structural view) when available; export to `.bimproj`/IFC at the end if wanted. |

### 3.2 Interop transport

- **v1.0.0: file-based.** Miqdar reads and writes `.bimproj` (Bunyan's documented package — `scene.json` is semantic truth, which is exactly why this works) and keeps its own `.miqproj` (§6.5). No live link.
- **v1.x: live round-trip via `window.bunyan`.** ⚠ **This is a designed consequence of Bunyan's D19, not a new mechanism:** Miqdar drives Bunyan *as an agent* — `listTypes`, `query`, `execute('setProperty', …)` — through the same command layer the ribbon uses. **The inter-app API is the agent API. There is nothing to build on Bunyan's side.** (M16. MCP, when Bunyan ships it in v1.0.x, is a second transport for the same link.)

### 3.3 The binding contract — identity, not geometry (M4)

Every link between an analytical entity and a physical one is expressed in Bunyan's identity currency:

- **Element binding:** `{ bunyanInstanceId, typeId, typeVersion }` — an analytical column ↔ *that* physical column.
- **Sub-shape binding:** `SubShapeRef` — a support at *the base face of that column*; a line load on *the top edge of that wall*. **Because of Bunyan D1, these bindings survive the host being resized, re-parameterized, and rebuilt from scratch.** This is the single technical property that makes the round-trip trustworthy, and it is the property the Revit↔RSA link famously lacks.
- ⚠ **Miqdar must never bind to meshes, triangle indices, vertex positions or OCCT indices.** A binding that is not an instance id or a `SubShapeRef` is a defect. (The exact analogue of Bunyan's "no positional identity" rule.)
- A binding whose target no longer exists is marked **broken and surfaced for manual retargeting** — never silently reattached (inherited failure semantics, `core_logic.md` §5).

### 3.4 Obligations on Bunyan — deliberately minimal (M15)

**Miqdar imposes no new *build* work on Bunyan v1.0.0** — but ⚠ **it is not free, and the first draft was wrong to call it "zero".** It imposes four prohibitions, a recurring process cost, and one type request:

| # | Obligation | Cost to Bunyan |
|---|---|---|
| 1 | **Do not break identity stability** (instance ids, `SubShapeRef`) — already Bunyan's core invariant. | zero |
| 2 | **Keep `.bimproj`/`scene.json` documented and semantic** — already promised (spec §6). | zero |
| 3 | **Keep the `quantities`/`materials` hooks alive** on `BimObjectType` (`core_logic.md` §3.11) — already reserved for the analysis north-star. | zero |
| 4 | **⚠ NEW — `scene.json` schema version must be readable and migratable by an outside reader.** Miqdar *writes* `.bimproj` (the structure-first path, §3.1), so it must emit valid Bunyan **recipes** — parameters, not B-Rep. That makes Miqdar a **second consumer of Bunyan's schema**, and a silent schema bump breaks it. Bunyan already versions + migrates `scene.json`; the obligation is only that the version be **explicit in the file and the migration documented** — which it is. **Recorded because it is a real coupling the first draft did not name**, not because it needs new work. | zero (but now *stated*) |
| 5 | **⚠ RECURRING PROCESS COST — the P5 freeze checklist item.** Before `BimObjectType` freezes, confirm the existing `version`+migration mechanism suffices for adding *optional analytical-hint fields* later (expected answer: yes ⇒ **no new field is reserved now**). If no, reserve one optional field. Bunyan domain rule 8 ("nothing may foreclose a declared north-star") already mandates the review; this row makes it concrete. ⚠ **And the obligation to check this spec at *every* future contract freeze is a standing cost — small, but not zero, and it recurs until this spec moves to Miqdar's repo.** | **minutes, per freeze, recurring** |
| 6 | **Bunyan 1.0.x type request: `core.beam`.** Bunyan's v1.0.0 MVP types (Wall, Slab, Column, Opening, GenericSolid, Level — `V1.0.0_spec.md` §5.1) contain **no Beam** — but a designed structural model exported from Miqdar is mostly beams and columns. An additive registration, on Bunyan's own schedule. See the fidelity note below. | one Bunyan 1.0.x registration |

> ⚠ **The `core.beam` fallback has a dependency the first draft missed.** "Until `core.beam` exists, beams export as **GenericSolid** (lossy but correct)" assumes GenericSolid *works*. As of Bunyan Entry 9 (`current_state.md` §3): **"No prism/extrusion, no sweep. The GenericSolid escape hatch has no op behind it yet."** GenericSolid is in Bunyan's v1.0.0 scope, so it will exist — but **the beam fallback is gated on Bunyan's extrude op landing**, and that is now a *stated* chain rather than an assumed one (§13, the temporal chain).

**And symmetrically, what Miqdar may never require of Bunyan:** no analysis code inside Bunyan, no second Bunyan API (D19 forbids it anyway), no coupling of release schedules, no Bunyan feature gated on Miqdar.

⚠ **How this obligation is ENFORCED — because a promise in Miqdar's spec is not a mechanism.** A future Bunyan session has no reason to open this file. The first draft relied on convention, which is precisely the failure mode `current_state.md` exists to prevent. The anchors therefore live **inside Bunyan's own documents**:

| Anchor | Where | Says |
|---|---|---|
| **Ruling record** | `current_state.md` **§4g** + **Entry 10** | Miqdar exists, it is ruled, and it constrains contract freezes. |
| **Freeze checklist item** | `v1.0.0_imp_plan.md` **P5** | Before the type contracts freeze, open `Miqdar_v1.0.0_spec.md` §3.4 and clear rows 4–6. |
| **Pointer** | `current_state.md` §0 reading list | The spec is a companion document, not a stray file. |

### 3.5 Shared DNA (adopt, don't re-derive)

| Bunyan decision | Miqdar adoption |
|---|---|
| D14 — the WASM module *is* the kernel | The WASM module *is* the solver (M6, §6) — JS never touches a stiffness matrix |
| D19–D23 — agent-native, one command layer | Adopted wholesale (M5, §8) — `window.miqdar` |
| D8 — single-threaded first, determinism before speed | Same ruling, same reason (M6) |
| D15 — AGPL-3.0 + commercial dual, CLA-first | ⚠ **NOT adopted — INVERTED.** Miqdar is **closed source** (M13, §11). Bunyan's CLA nevertheless remains a **hard prerequisite for Miqdar's business model** — see §11. |
| D9 — verification scoping | **Inverted** (M7, §10): Bunyan trusts OCCT; Miqdar can trust nobody — we wrote the solver |
| D10 — typed failures, reject + keep last-good | Adopted (§6.4) |
| Mock-kernel critical-path pattern | A closed-form **mock solver** ships from day 1 (§10.5) |

---

## 4. Domain model (analytical)

### 4.1 The two-graph principle & the authored idealization (M3)

The **physical model** (Bunyan's, optional) and the **analytical model** (Miqdar's truth) are distinct graphs. The analytical model is **not a projection of the B-Rep** — it is an *idealization*: centerline members, assumed releases, rigid diaphragms, effective stiffnesses, support conditions. Every one of those is an **engineering decision**, and Miqdar records each as explicit, versioned, authored state:

- Importing from Bunyan **proposes** an idealization (centerline extraction, default releases, storey mapping from Levels); the engineer **disposes**. Proposals are marked `proposed` until confirmed; the diff between proposed and confirmed is itself reviewable state.
- Idealization parameters live on analytical entities the way the anchoring parameter lives on Bunyan's Opening — the domain-level down-payment on judgment, made visible.
- ⚠ **The oracle verifies the model, not the building.** A perfect analysis of a wrong idealization is a wrong answer with a green checkmark. This is why the idealization layer is authored, diffable, and part of what the engineer signs (§9).

### 4.2 Entities

| Entity | Essence |
|---|---|
| **Project / AnalyticalModel** | The document. Unit of open/save/undo. Truth = the analytical recipe (`model.json`). |
| **Storey** | Elevation datum; maps 1:1 to Bunyan Levels on import. Drives seismic storey forces, drift checks, mass tabulation. |
| **Grid / Axis** | Named construction axes (file A–F / 1–6); organizational, referenced by members. |
| **Node** | A point with DOFs. Mostly derived from member connectivity; explicit only where authored (supports, point masses). |
| **Member (1D)** | Beam / column / brace / tie. Carries: section ref, material ref, end releases, rigid end offsets, cardinal point, local axes, design group ref, optional physical binding (§3.3). |
| **Wall / Voile & Slab (2D)** | Shell-idealized regions (meshing owned by the solver seam). ⚠ Staging under owner decision O-M1 (§14). |
| **Diaphragm** | Rigid or semi-rigid storey constraint; the default for building floors. |
| **Support / Spring** | Restraints, point/line springs (soil constants as authored input). |
| **Material** | Concrete class (fck…), steel grade (fyk, profiles), prestressing steel (fpk) — code-referenced, per-jurisdiction catalogues. |
| **Section** | Parametric (rect, T, L, circular, generic), steel catalogue profiles (IPE/HEA/HEB/UPN/tubes…), tendon layouts (PC). Versioned catalogues per market. |
| **Load** | Point/line/area/temperature, in a LoadCase; area loads distribute per authored rule (one-way/two-way/tributary). |
| **LoadCase** | Nature-typed: `G`, `Q`, `W`, `S`, `E`, `T`, `P` (prestress). Natures drive combination generation. |
| **LoadCombination** | **Generated from the active code family** (ULS/SLS/accidental/seismic sets), then editable; every generated combo cites the generating clause. |
| **MassSource** | Which cases, which factors (e.g. G + ψ·Q per EC8/RPS/RPA) — authored, code-defaulted. |
| **DesignGroup** | Members designed together (standardization unit, §7). |
| **CheckResult** | `{memberId, clauseId, ratio, governingComboId, station, pass/fail, trace}` — **the atom of the product** (M12). Immutable per analysis run. |
| **DesignResult** | RC: As required/provided per face + stirrups; Steel: profile verdict + governing checks; PC: tendon force/profile verdict. |
| **SignOff** | First-class state object: who, when, **what model hash, what result-set hash, AND what computed them** — solver build id + code-module/corpus versions + parameter packs in force (§9). |

### 4.3 Identity & states

- Instance identity: assigned on creation, never reused (Bunyan §4 rules, verbatim).
- Deterministic derived ids for generated objects (combinations, mesh nodes): derived from generating clause/rule + canonical ordering — **never from iteration order** (the canonical-re-sort lesson, Bunyan §5.4).
- Model state: `draft → analyzed ↔ stale (on any edit) → designed → signed` — with `failed` and `broken-binding` as first-class visible states. **Results are valid only against the model hash they were computed from; a stale result is displayed as stale, never as truth.**

---

## 5. Code-rules architecture

### 5.1 The Code Family registry (the central extension point)

A **code module** is a registration keyed by `(jurisdiction, domain, edition)` — e.g. `(FR, concrete, EC2+NA-FR:2016)`, `(MA, seismic, RPS2000-v2011)`. Each module contributes, against one contract:

- **Combination generator** (ULS/SLS/seismic/accidental sets, ψ factors, clause-cited).
- **Load models** where codified (wind/snow per jurisdiction — see 5.3).
- **Seismic parameters**: zone maps as data, site classes, importance classes, **behavior/ductility factor menus with machine-checkable eligibility conditions** (regularity criteria evaluated from the model where the code defines them numerically; flagged as *judgment-required* where it does not).
- **Member checks**: clause-addressable functions; **every emitted `CheckResult` cites its clause id** (M12).
- **National-annex / interpretation parameter packs as data** (M14): every NA value and every interpretive choice is an explicit, versioned parameter with a documented default — never a buried constant. Two engineers may legitimately configure them differently; the *note de calcul* prints the pack in force.
- **A validation corpus** (§10.4) — a code module without its engineer-signed corpus **does not ship**. This is the gate that makes "add ACI in 1.0.x" a real registration rather than a liability.

⚠ **Copyright rule (M14):** code texts (Eurocodes, DTRs, RPS) are copyrighted documents. Miqdar encodes **parameters, formulas and clause references**, and never reproduces normative text. Clause ids link out; they do not quote.

### 5.2 v1.0.0 validated matrix (owner ruling, M8)

**M8 rules the JURISDICTIONS: France, Morocco, Algeria.** That is the owner's call and it is firm.

⚠ **M8 does NOT rule the editions.** The first draft ratified a matrix whose own cells carried four *(verify)* flags — a decision cannot simultaneously be ratified and rest on unverified inputs. **The editions now live in one owner-editable place:**

> ### → **`Miqdar_normative_register.md`** — the normative register (resolves **O-M4**).
> Per jurisdiction and domain: the document, its edition, the legal instrument that compels it, a **confidence grade**, the source, and an **owner-ruling column**. **Status: PROVISIONAL — agent-compiled from public sources 2026-07-13, not owner-ratified.** It **must be ratified before S3** (§13), because S3 is where the clause libraries are actually built.

**⚠ Three findings from that register that change this spec — read them there in full (§1 of the register):**

| # | Finding | Consequence |
|---|---|---|
| **F1** | **Algeria's seismic code changed.** **RPA 2024** (DTR B.C. 2.48, approved by the CTP 15 May 2024) **abrogates RPA 99/version 2003.** *(Confidence B — corroborated by Algerian professional sources; the JO decree was not read.)* | Miqdar starts after Bunyan v1.0.0 — so by kickoff, **RPA 2024 is the code an Algerian bureau is obliged to use**, and RPA 99/2003 is a *legacy* module. **→ O-M10.** |
| **F2** | **Morocco has no national RC code.** Practice runs on **BAEL 91 (rév. 99)**; IMANOR has published NM EN 1992 as *standards*, but a national RC regulation was still **in study** as of late 2023. | **This inverts O-M5.** BAEL is filed in this spec as a *legacy 1.0.x pack* — but if Moroccan RC design is actually *done* in BAEL, **BAEL is the Morocco RC module**, and a "Morocco" without it is a Morocco no Moroccan bureau can use. **Owner is the authority here; no source can settle it.** |
| **F3** | **The France Eurocodes are being withdrawn.** 2nd-generation Eurocodes + National Annexes due by **30 Sep 2027**; **1st generation withdrawn by 30 Mar 2028.** | A France module built on 1st-gen EC2/EC3/EC8 has a **known short shelf life**, and its tier-4 corpus — the least-automatable work in the product — would be **built twice**. **→ O-M11.** |

- 1.0.x additions are registrations: **ACI/ASCE first** (owner direction), then others; plus the owner-ruled domain expansions (**roads, bridges, tunnels — 1.0.x**, M9), each a *domain* module (new element types, new load models, new code modules) on the same registries.
- ⚠ **Recorded risk (M9), stated once and not re-litigated:** three materials × three jurisdictions at v1.0.0 is the largest cost block in this product — the clause libraries and their signed validation corpora are the least-automatable work in the plan. §13 stages it so the risk is visible per-milestone, with **prestressed concrete deliberately last** and an explicit owner checkpoint. ⚠ **The first draft protected only *one* axis of that risk. §13 now carries a *per-jurisdiction* checkpoint too** — Algeria's corpus is the one flagged uncertain, and there was no pre-built decision point for "ship without Algeria" the way there is for "ship without PC".
- ⚠⚠ **The risk inside the risk — the one neither the spec nor an outside reviewer named.** §10 tier 4 says a code module ships only with a corpus **signed by the Architect**. The Architect is **one human — the owner**. Three jurisdictions × three materials of *hand-computed, personally-signed* member checks is a **single-point-of-failure workload on one person**, and it is the gate on shipping. **The C++ is not the schedule risk; this is.** O-M9 (actor model) must answer *who else can sign*, or the corpora must shrink.

### 5.3 Seismic scope (v1.0.0)

- **Methods:** equivalent lateral force (where the code's regularity conditions — machine-evaluated — permit it) and **modal response spectrum analysis** with code spectra, accidental torsion, directional combination (per code), storey drift checks, and P-Δ sensitivity coefficients.
- **Not in v1.0.0:** pushover, nonlinear time-history, capacity design beyond what the shipped clauses codify prescriptively, performance-based anything (§12).

---

## 6. Solver architecture (M6 — the D14 move, replayed)

### 6.1 The WASM module *is* the solver

Our own C++ implements the ops — `buildModel`, `solveStatic`, `solveModal`, `solveSpectrum`, `getResults`, `designMember`, … — statically linked against **Eigen (MPL-2.0)** for linear algebra. JavaScript calls **our op set**, never a matrix. One boundary crossing per op; large result arrays cross as zero-copy views copied out synchronously (the `typed_memory_view` lesson, Bunyan Entry 7 — the views die on the next call).

⚠⚠ **Dependency rule (M13-b) — TIGHTENED by the closed-source ruling. Re-read this even if you read the first draft.**

The first draft allowed **"permissive/LGPL"** in the shipped artifact. **That was correct only for an open-source product, and Miqdar is not one.** Bunyan may statically link LGPL OCCT *because Bunyan's source is public* — public buildable source automatically satisfies LGPL's relink obligation (`current_state.md` §4e). **Miqdar, being closed, gets no such pass**: statically linking an LGPL library into a proprietary WASM artifact re-triggers exactly the relink/side-module obligation the owner already ruled against once (Bunyan Entry 5, ruling 8 — superseded *there* only because Bunyan went open).

**⇒ The rule for Miqdar's shipped artifact:**

| Licence | Shipped artifact | Why |
|---|---|---|
| **Permissive** (MIT, BSD, Apache-2.0, **MPL-2.0**) | ✅ **Allowed** — this is the whole allowance | Eigen is **MPL-2.0** ✓ — file-level copyleft; static linking into a proprietary product is fine. |
| **LGPL** | ⚠ **NOT safe statically.** Only via a **dynamically-linked / relinkable side-module** — and then only deliberately | The relink obligation. Do not stumble into this. |
| **GPL / AGPL** | ❌ **Never linked, never shipped** | A GPL dep in a closed-source product is a **licence violation**, not merely a foreclosed business model. Stricter than the first draft's framing. |

⚠ **The concrete trap: MIQDAR MUST NEVER LINK OCCT.** OCCT is **LGPL-2.1**. Miqdar has no need of it — its truth is the *analytical* model, it consumes `scene.json` **semantically** (parameters and identity, never B-Rep — M4), and it renders lines/shells, not solids. **This is already the design; it is now a prohibition**, because the first person who wants to *draw an imported column properly* will reach for a geometry kernel, and that reach is a licence violation. If Miqdar ever needs real B-Rep, it **asks Bunyan** (which the owner owns) — it does not link a kernel.

GPL/non-commercial tools (OpenSees, Code_Aster) remain welcome **offline as oracles** (§10.2) — never linked, never shipped. That is unaffected: an offline verification oracle is not a distributed dependency.

### 6.2 Analysis scope (v1.0.0, M10)

- **Elements:** 3D frame elements (Euler + shear deformation), rigid diaphragms, springs, rigid links; **shells for walls/slabs per O-M1** (§14).
- **Analyses:** linear static; **P-Δ** (geometric stiffness iteration); modal (subspace/Lanczos); response spectrum (CQC/SRSS).
- **Single-threaded v1.0.0** — same ruling and same reason as Bunyan D8: determinism and debuggability before speed; result reproducibility is a product feature (§10.6). Multi-threaded assembly/solve in 1.0.x.
- **Incremental re-analysis:** the model graph carries dirty-tracking like Bunyan's dependency DAG; v1.0.0 may legitimately re-solve fully (building-scale linear solves are milliseconds-to-seconds — the thesis depends on *calls being cheap*, not on incrementality tricks); the seam is designed so stiffness reuse and re-analysis of substructures land later without a contract change.

### 6.3 Protocol

Flat, versioned request/response envelope with correlation ids — Bunyan's protocol pattern, its own contract (`miqdar-protocol v1`). Transport-agnostic host (`SolverHost.handle(request) → response`), Worker as a shim ⇒ headless-testable in Node, exactly like Bunyan's kernel — and the same three payoffs (CI without a browser; server-side solver as a `Transport` swap; mock/real interchangeability).

### 6.4 Typed failures

`SINGULAR_STIFFNESS` (mechanism — with the suspected free DOF/member named), `ILL_CONDITIONED`, `NEGATIVE_MASS`, `MODES_NOT_CONVERGED`, `DESIGN_INFEASIBLE` (no candidate section passes — with the governing constraint), `UNCODED_CASE` (the situation falls outside the shipped clause library — **the refusal that keeps results honest**), `BROKEN_BINDING`, … Every failure names the entity, is machine-readable, and leaves the document at last-good (D10 semantics).

### 6.5 `.miqproj` package

```
project.miqproj (zip)
├── manifest.json        # app/schema versions, SOLVER BUILD ID, code-module versions + parameter packs in force
├── model.json           # the analytical recipe — THE TRUTH (entities, idealization, loads, bindings)
├── link.json            # Bunyan bindings: source .bimproj identity, instanceId/SubShapeRef map, sync state
├── results-cache.bin    # derived, disposable; invalidated by model hash or solver build id
├── signoff.json         # sign-off records + model/result hashes (§9)
└── report artifacts     # generated notes de calcul etc. — projections, never truth
```

Results are rebuildable from `model.json`; a corrupt cache loses nothing (M2). The solver build id gates the cache exactly as Bunyan's kernel build id gates the BREP cache.

---

## 7. Optimization — a first-class operation (M11)

- `optimize` is a **Command** like any other: it takes a DesignGroup scope, a candidate set (section catalogues / rebar layouts / authored candidate lists), a constraint set (**the code checks — always all of them**), and an **authored objective**.
- ⚠ **The objective is authored, never hard-coded** — because "minimize tonnage" produces expensive buildings. Objective terms available at v1.0.0: material weight/volume, unit-cost tables (user-supplied), and a **standardization penalty** (distinct-section count per DesignGroup/storey). Firms encode their fabricator's reality; the default is weight + standardization, documented as a default.
- Every iteration is internally a normal analyze/check cycle; the returned artifact is a **convergence report + the model diff** — reviewable and undoable like any other edit. An agent driving its own loop through individual commands and a user clicking "optimize" exercise the same machinery (D19 logic).
- Iteration budgets and determinism: same inputs ⇒ same result (fixed algorithms, no wall-clock cutoffs in v1.0.0).

### 7.1 ⚠ The utilization cap — optimizing against a hard verifier is dangerous, and the code does not say so (owner ruling 2026-07-13)

**The failure mode, stated plainly.** An optimizer whose only constraint is *"every clause ratio ≤ 1.0"* will happily produce a building where **dozens of members sit simultaneously at 0.99** — every individual check passes, the report is a clean sheet of green, and the structure has **no margin against anything the code checks do not explicitly model** (construction tolerance, a load the idealization missed, a clause interaction nobody codified). It is the sharpest form of *"the oracle verifies the model, not the building"* (§4.1) — and it is a **new** danger, because a human engineer designing by hand never lands 40 members on the boundary at once. **The optimizer is the thing that makes this reachable.** It therefore gets an explicit defence:

- **`maxUtilization` is an authored constraint on every DesignGroup — default `0.90`, not `1.0`.** The optimizer treats it as a **hard constraint**, exactly like a code check. The engineer may raise it (to 1.0, deliberately) or lower it, per DesignGroup.
- **It is authored, versioned and printed.** It is a first-class model parameter and it appears **in the *note de calcul*** alongside the parameter packs in force (§9). A reviewer must be able to see, without asking, *"this building was optimized to 0.90, not to the code minimum."* A bureau de contrôle will ask.
- **It is a Miqdar parameter, not a code parameter.** No clause requires it; it is **engineering judgment, made explicit** — the same move as the authored idealization (M3) and the authored objective (§7). It is never silently applied under the name of a code.
- **The report still flags convergence at the ceiling.** Even under a cap, if many members in a group converge on `maxUtilization` simultaneously, the convergence report and the review view **say so** — a cap makes the margin *intentional*, it does not make clustering *invisible*.

*(Rejected alternative, recorded so it is not re-litigated: a soft "robustness term" in the objective. It buys flexibility at the cost of the two things this product sells — explainability to a checker, and a number the engineer authored on purpose.)*

---

## 8. The agent surface (M5 — D19–D23, transplanted)

- **One command layer. No actor bypasses it.** `DocumentContext` (Miqdar's) is the only holder of a `SolverClient`; no UI component and no agent ever calls a solver op. Kernel-ops vs document-commands split preserved: `solveStatic` is an implementation; `runAnalysis` / `setMemberSection` / `queryResults` / `designGroup` / `generateReport` are the API.
- **`window.miqdar`**: `version()` (own `agentApi`, versioned separately), `listCommands()` / `listTypes()` **generated from the registries** (`argsSchema` — one registry, three consumers: ribbon, property panel, agent), `execute()` → **returns the `UndoableEdit` diff or a typed failure**, `query()`.
- **Queries return engineering semantics, never matrices.** `query('checks', {filter: worst})` → clause-cited ratios; `query('drifts')` → storey table; `query('reactions')` → named supports. A `Float64Array` of a global stiffness matrix is not an answer (a bounded raw-diagram op exists for plotting, clearly marked as projection).
- **The closed loop is the product:** act → read the diff → re-run checks → read `{clause, ratio, combo}`. The verification loop Bunyan gives agents for geometry, Miqdar gives for physics and code.
- Agent commands opt out of edit-coalescing; transaction grouping reserved on `UndoableEdit` (same reservations as Bunyan D23).
- Trust boundary: `window.miqdar` is page-global — acceptable under the same v1.0.0 conditions as Bunyan (no backend, no secret, user's own tab); revisit before any in-page third-party code. MCP bridge = v1.0.x transport over the same verbs.

---

## 9. Human review, sign-off & deliverables (M12)

**The review artifact is the product.** The regulatory reality in every target jurisdiction keeps a human in responsible charge — *bureau de contrôle* + *assurance décennale* (France), CTC (Algeria), decennial-liability regimes (Maghreb civil codes), PE stamping later (US, 1.0.x). Miqdar's bet is not to fight that boundary but to make the review **faster and materially more rigorous than today's**:

- **Clause-level traceability, mandatory:** every check result carries member → clause → ratio → governing combination → station, and the parameter pack in force. Nothing is a bare "OK".
- **Diff-based review:** what changed since the last signed state — model diff, idealization diff, results delta — is a first-class view. A reviewer reads the diff, not the whole building, on every iteration.
- **Sign-off is a state machine, not a checkbox:** a `SignOff` binds engineer identity + model hash + result-set hash. Any subsequent edit → `stale`, visibly. **Nothing exports as "verified" without an explicit engineer action.** Agent-authored and human-authored work are indistinguishable to the sign-off gate — both are unsigned until a human signs (this is D19's equivalence, pointed at liability).
- ⚠ **The sign-off also binds WHAT COMPUTED THE RESULT — not just what was computed** *(added 2026-07-13)*. Model hash + result hash answer *"was this the model I reviewed?"* They do **not** answer *"which solver, which clause library, which parameter pack produced that verdict?"* — and a stale solver build or a superseded code corpus is a wrong pass/fail with a valid signature on it. **The manifest already records all three** (§6.5: solver build id, code-module versions, parameter packs); the sign-off now **binds** them and the *note de calcul* **prints** them. Cheap, and it closes the gap between "signed" and "reproducible".
  - *Chain-of-custody note:* an outside reviewer raised the sharper version of this — a **forked** build with a silently altered code corpus producing a wrong "pass" on a real structure. **The closed-source ruling (M13) largely dissolves that**: there is no public source to fork. What survives is the mundane, likelier failure above — *the wrong build of our own software* — and that is what this row defends against. A distribution-level signing/attestation story is **not needed for v1.0.0** and is not specified here.
- **The *note de calcul* is a generated projection** (French + English v1.0.0): hypotheses, parameter packs, load derivations, combination tables, member results, seismic verification — formatted for the bureau de contrôle / CTC interface. Generated, versioned, reproducible from the recipe; never hand-edited truth.
- **Audit trail, recorded honestly:** the session/decision log strengthens a diligent engineer's file and *documents* a negligent one's. That is a feature of the honest version of this product, and it is disclosed, not hidden.
- ⚠ **Positioning rule for all product copy and UI:** Miqdar assists and verifies; it does not certify. The engineer is in responsible charge. Every jurisdiction's onboarding states the local regime plainly. (Open item: legal review per jurisdiction before commercial launch — §14.)

---

## 10. Verification strategy (M7 — the inverse of Bunyan's D9)

Bunyan trusts OCCT and verifies its own wiring. **Miqdar has no industrial kernel to trust: we write the solver and the checkers, so the solver and the checkers are the thing under test.** Tiers:

1. **Closed-form analytic corpus (primary for the solver core).** Beams, frames, plates with textbook solutions; modal frequencies of canonical systems. Exact expectations, tolerance-pinned. Seeded offline, committed, gated in CI — the golden-harness pattern.
2. **Independent reference oracle (offline, never shipped).** The same models run through an established independent solver (candidates: OpenSees, Code_Aster — GPL/non-commercial licences are fine *offline*, M13-b) on a pinned environment; disagreement beyond tolerance fails the seeding, exactly as `cadquery-ocp` gates Bunyan's kernel. ⚠ Unlike Bunyan's case, this oracle IS independent — different codebase, different authors — so it certifies more than wiring.
3. **Published benchmark suites.** Recognized validation examples (solver verification sets, EC8/code worked examples) run in CI.
4. **Engineer-signed code-check goldens.** Every code module ships a corpus of hand-computed member checks **signed off by the Architect** (the AEC-correctness role Bunyan's actor model already defines) — per jurisdiction, per material, including deliberately-failing cases. **A code module without its signed corpus does not ship** (§5.1).
5. **The mock solver** (closed-form, protocol-conformant) ships from day 1 so the UI/agent path is buildable with no WASM — and mock/real parity is asserted in CI (the kernel-mock pattern, which has already paid for itself once in Bunyan).
6. **Determinism & regression:** identical inputs ⇒ identical results on one machine and within pinned tolerance across machines (FP results, unlike naming tokens, are float-valued — comparisons are tolerance-based against a pinned seeding environment, Bunyan §6.5 style); mode-ordering and combination-ordering are FP-free by construction; snapshots guard drift.

**The naming-engine lesson transplanted:** a wrong clause mapping does not look like a solver bug — forces can be exact while the *check* cites the wrong clause or the wrong combination governs. **Checks are verified as checks** (tier 4), not only through force balances.

---

## 11. Licensing — **MIQDAR IS CLOSED SOURCE** (M13 — owner ruling, 2026-07-13)

**The ruling:** **Bunyan is open (AGPL-3.0 + commercial dual). Miqdar is proprietary.** The asymmetry is the business model, not an inconsistency: **Bunyan is the wedge — adoption, trust, "you will never lose access to your models". Miqdar is the moat — the solver, the validated code corpora, and the compliance engine that a competitor cannot clone by reading a repo.** The two licences are pointed at two different jobs.

**Four consequences, and the first two are technical constraints, not paperwork:**

1. **⚠ THE LGPL PROBLEM RETURNS — see §6.1 (M13-b).** Bunyan can statically link LGPL OCCT *only because its source is public*. **Miqdar cannot.** Shipped artifact = **permissive only** (Eigen MPL-2.0 ✓). **LGPL only as a relinkable side-module, and only deliberately. GPL/AGPL never.** **Miqdar must never link OCCT.**

2. **⚠ BUNYAN'S CLA IS NOW A PREREQUISITE FOR *MIQDAR'S* BUSINESS MODEL — and this is the non-obvious one.** Miqdar reads and writes `.bimproj` and (v1.x) drives `window.bunyan`. Arm's-length interop is very likely not a derivative work — but the **safe** posture, and the one the owner should bank on, is that **a closed Miqdar shipping alongside / atop Bunyan is sound because the owner holds 100% of Bunyan's copyright** and can licence it to himself on any terms. **The moment one external PR lands in Bunyan without a signed CLA, that contributor holds copyright on it** (`current_state.md` §4e) — and the owner's freedom to build a proprietary product against his own AGPL codebase gets murky. **The CLA was already a hard prerequisite for Bunyan's commercial licence. It is now *doubly* load-bearing: it protects Miqdar too.**

3. **Closed source ≠ hidden — record this honestly.** A browser app **ships its artifact to every user**: minified JS and a `.wasm` binary, both inspectable and reverse-engineerable. Closed source buys **legal protection (EULA/terms) and the absence of a ready-made fork**, not secrecy. **The real moat is what cannot be copied from an artifact:** the *signed validation corpora*, the jurisdiction expertise behind them, and the hosted layer. Plan the defence there, not in obfuscation.

4. **The trust argument must be re-earned — Miqdar cannot use Bunyan's.** Bunyan's pitch includes *"you can read the code that checked your geometry."* **Miqdar cannot say that, and it is asking for far more trust** — a wrong verdict here is a building, not a picture. **See O-M7 (rewritten): what does a closed compliance engine publish in order to be believed?** Candidate answers — publish the **validation corpora and benchmark results** (the evidence, without the source), commission a **third-party audit**, publish the tier-1/2/3 results. **This is a real product question and it is unresolved.**

**Offline GPL oracles (OpenSees, Code_Aster) remain unrestricted** — never linked, never shipped (§10.2).

---

## 12. Explicit non-goals for v1.0.0

Deferred (1.0.x, additive by design): **ACI/ASCE and further code families** · **roads, bridges, tunnels and other civil domains** (owner ruling M9 — each a domain module) · pushover & nonlinear time-history (batch, never the oracle loop) · performance-based design (indefinite) · staged construction · steel **connection design** · rebar/shop **detailing drawings** · foundations beyond simple spread footings (scope per O-M2) · soil-structure interaction beyond authored springs · multi-threaded solve · MCP transport · live Bunyan link (v1.x) · **MEP (never — if the network-analysis thesis is pursued, it is a third product, not Miqdar scope)**.

---

## 13. MVP definition & internal staging

**The end-to-end Miqdar v1.0.0 acceptance task (human):** model a 5-storey RC frame-and-shear-wall building on a Moroccan site (RPS 2000 v2011 zone, site class, ductility level authored); generate combinations; run modal + RSA; design beams, columns and walls to the Moroccan pack; run `optimize` on the column DesignGroups **under an authored `maxUtilization` (§7.1)**; review the diff; sign off; generate the *note de calcul* (FR); **export the structural model to `.bimproj` and open it in Bunyan**. Then the same building under the Algerian pack, and under the French pack. *(Which editions — per the normative register, §5.2.)*

> ⚠ **Stated limitation of the acceptance demo, not discovered at the demo.** The export step lands beams as **GenericSolid**, not as `core.beam` — Bunyan has no Beam type at its v1.0.0 (§3.4 row 6). **The round-trip is therefore geometrically correct and semantically lossy at Miqdar v1.0.0, and that is ACCEPTED, not a failure of S7.** Full-fidelity beam round-trip lands when Bunyan registers `core.beam` in a Bunyan 1.0.x. An outside reviewer read the first draft as promising fidelity it could not deliver; it is now promised as lossy, on purpose.

**The same task, as an agent** — through `window.miqdar` only: discover verbs, author the model, run, read `{clause, ratio, combo}` results, iterate sections until all checks pass, produce the convergence report — **and stop at the sign-off gate, which it cannot cross.** That last assertion is a test, not a slogan.

**Internal staging (visibility valve for M9's recorded risk — each milestone is releasable-quality, none is released alone):**

| Milestone | Contents |
|---|---|
| **S0** | Protocol + mock solver + verification harness + closed-form corpus. *(The Bunyan P1/P2 pattern.)* |
| **S1** | Frame solver in WASM: static + P-Δ; tiers 1–3 green. |
| **S2** | Modal + RSA + diaphragms; seismic parameter packs (3 jurisdictions) as data. |
| **S3** | RC member checks + combination generators, 3 jurisdictions; tier-4 corpora signed. **⚠ The normative register must be RATIFIED before this milestone starts (O-M4).** ⚠ **PER-JURISDICTION OWNER CHECKPOINT — see below.** |
| **S4** | Shells (walls/slabs) per O-M1; wall design. |
| **S5** | Steel checks (France pack; CCM 97; Morocco practice); catalogues. |
| **S6** | **Prestressed concrete** (scope per O-M3). ⚠ **Owner checkpoint scheduled here by design:** if S6 strains the schedule, the owner decides ship-without-PC (→1.0.1) vs hold — the decision is his and pre-scheduled, not discovered. |
| **S7** | `optimize` (incl. `maxUtilization`, §7.1), agent surface hardening, Bunyan import/export round-trip *(lossy beams — see the acceptance-task note)*. |
| **S8** | *Note de calcul* generation, sign-off machine, release hardening. |

**⚠ The contingency plan was one-dimensional — fixed here.** The first draft pre-scheduled a descope checkpoint for **one material** (PC, at S6) and **none for any jurisdiction** — even though §5.2 calls three-jurisdictions × three-materials *the largest cost block and the least-automatable work in the product*, and even though **Algeria's corpus is the one the register flags as most uncertain** (RPA 2024 is new, its decree unread, and its clause library unwritten by anyone). If Algeria's validation takes three times the estimate, the first draft has no decision point — only a discovery.

> **S3 per-jurisdiction checkpoint (mirrors S6's discipline):** at S3, with the true cost of *one* signed RC corpus finally measured rather than estimated, the owner decides: **all three jurisdictions in Miqdar v1.0.0, or ship two and register the third in 1.0.1.** ⚠ **The owner must name the anchor jurisdiction now** — the one that is never droppable because it is the market Miqdar is *for*. *(Open — O-M12.)*

**⚠ THE TEMPORAL DEPENDENCY CHAIN — three-way, and never stated in the first draft:**

```
   Bunyan v1.0.0 ships
        └──►  Miqdar development STARTS          (prerequisite gate, owner direction: "afterwards")
                   └──►  Miqdar S7 (Bunyan round-trip)
                              ├── needs Bunyan's GenericSolid EXTRUDE op   ── in Bunyan v1.0.0 scope,
                              │                                               NOT YET BUILT (Entry 9)
                              └── wants Bunyan 1.0.x `core.beam`          ── a release LATER than the
                                                                             one that unblocked Miqdar
```

**Read the bottom row twice.** Miqdar's S7 wants a **Bunyan 1.0.x** feature — i.e. a Bunyan release that, at the moment Miqdar reaches S7, **may not exist yet**. That is *fine* (S7 ships lossy, by the ruling above), but it must be **known**, because the alternative is discovering at S7 that the flagship "structure-first" workflow is blocked on another product's roadmap. **Nothing here couples the release schedules** (§3.4 forbids that) — it just makes the ordering visible.

**Prerequisite gate:** Miqdar development **starts after Bunyan v1.0.0 ships** (owner direction — "afterwards"). Until then, this spec + the normative register are the only Miqdar artifacts, maintained in the Bunyan repo (M1), and Bunyan honours §3.4 **through the anchors now planted in its own docs**.

---

## 14. Open questions requiring owner rulings (before or at Miqdar kickoff)

| ID | Question | Draft recommendation |
|---|---|---|
| **O-M1** | **Walls/slabs: shell elements at v1.0.0, or mid-pier/equivalent-frame idealization first?** The Maghreb market is voile-heavy (RPS/RPA push walls), which argues shells are non-optional; shells are also the largest single solver work item (plate elements + meshing). | Shells in v1.0.0 (S4), preceded by mid-pier idealization in S2–S3 so seismic work isn't blocked on meshing. |
| **O-M2** | Foundations at v1.0.0: none, or simple spread-footing design (authored allowable bearing)? | Simple footings in, as an S3 rider — bread-and-butter for the target market; anything more is 1.0.x. |
| **O-M3** | Prestressed scope depth: post-tensioned slabs/beams with simplified losses? Pre-tensioned? Full time-dependent losses? | Post-tensioned beams/slabs, code-simplified losses; time-dependent analysis is 1.0.x. |
| **O-M4** | **Ratify the normative register** (`Miqdar_normative_register.md`) — the documents, editions and legal instruments per jurisdiction. **A first pass is DONE** (agent web research, 2026-07-13) and it surfaced F1/F2/F3 (§5.2). What remains is **the owner's ratification**, which no amount of searching can substitute for. | **Owner reviews and edits the register; it is ratified before S3.** Five rows are graded *"practice, not law"* — those are his to settle. |
| **O-M5** | **RE-OPENED, and it is no longer a "legacy pack" question (F2).** Morocco has **no national RC code**; practice is **BAEL 91-99**. So: **is BAEL the Morocco RC module at Miqdar v1.0.0** — not a 1.0.x nicety? | ⚠ **Owner call, and it is a v1.0.0 scope question.** If a Casablanca bureau designs in BAEL, then "Morocco RC = EC2-based" ships a Morocco nobody can use. |
| **O-M6** | Slab gravity design method: FE-based from shells, coefficient methods (EC2 Annex / BAEL-heritage), or both? | Both — coefficient methods are what checkers expect; FE from shells as the general path. |
| **O-M7** | **REWRITTEN by the closed-source ruling (M13). The old question is dead** ("are the corpora open or commercial?" — they are commercial; Miqdar is closed). **The new question is harder: what does a CLOSED compliance engine publish in order to be BELIEVED?** Bunyan's trust argument — *"read the code that checked your building"* — is **not available to Miqdar**, which asks for more trust and offers less transparency. | Publish the **evidence, not the source**: the tier 1–4 validation corpora and benchmark results, and commission a **third-party audit** before commercial launch. **Unresolved — and it is a product question, not a legal one.** |
| **O-M8** | Jurisdiction-by-jurisdiction legal review of the sign-off/liability posture (§9) before commercial launch. | Budget it; not a Miqdar v1.0.0 build blocker. |
| **O-M9** | Actor model for the Miqdar build (Amer/Zayd/Architect analogue). ⚠ **It must also answer: WHO, besides the owner, may sign a tier-4 validation corpus?** (§5.2 — the single-point-of-failure risk.) | Decide at kickoff; the solver/harness side is dev-box-shaped, the UI side is browser-shaped — the Bunyan topology transfers. **The signing-authority question is the one that actually gates the schedule.** |
| **O-M10** | ⚠ **NEW (F1).** **Algeria seismic: RPA 2024 or RPA 99/2003?** The register finds **RPA 2024 (DTR B.C. 2.48, CTP 15 May 2024) abrogates RPA 99/v2003** — confidence B; the *Journal Officiel* decree was not read. | **RPA 2024 as the v1.0.0 module; RPA 99/2003 as a legacy registration** (existing/ongoing projects still run on it). **Confirm the decree first** — do not build a clause library off a secondary source. |
| **O-M11** | ⚠ **NEW (F3).** **France: 1st-generation or 2nd-generation Eurocodes?** 2nd-gen + NAs due **30 Sep 2027**; 1st gen **withdrawn 30 Mar 2028**. Miqdar's France corpus — the least-automatable work in the product — would otherwise be **built twice**. | **Two editions of one registration**, which is exactly what the `(jurisdiction, domain, edition)` key exists for: ship 1st-gen (what bureaux use at launch), with 2nd-gen as the pre-planned successor pack. **Decide before S3, not after the corpus is signed.** |
| **O-M12** | ⚠ **NEW.** **Which jurisdiction is the ANCHOR — the one that is never descoped?** §13 now carries an S3 per-jurisdiction checkpoint; it needs to know what is not on the table. | Owner names it. *(Morocco is the presumed answer — it is the acceptance task's home market — but presuming is exactly what this spec refuses to do.)* |

---

## 15. Decisions (M-series; Bunyan's D-series is referenced, never duplicated)

| ID | Decision |
|---|---|
| **M1** | **Miqdar is a separate product.** Bunyan models (everything); Miqdar analyzes & designs (only). Revit↔RSA relationship, bidirectional, standalone-capable. Spec lives in the Bunyan repo until Miqdar's repo exists (then it moves; a pointer stays). *(Owner ruling 2026-07-12.)* |
| **M2** | **The analytical recipe is truth; results are derived & disposable; reports are projections.** Mirror of Bunyan's core invariant. |
| **M3** | **The idealization is authored, never derived.** Import proposes; the engineer disposes; idealization state is explicit, versioned, diffable. |
| **M4** | **Bindings are identity, never geometry:** Bunyan instance ids + `SubShapeRef`s only; broken bindings surface for manual retargeting. |
| **M5** | **Agent-native by construction:** D19–D23 adopted wholesale (`window.miqdar`, one command layer, generated discovery, returned diffs, typed failures, semantics-not-matrices). |
| **M6** | **The WASM module is the solver** — our C++ ops + Eigen (MPL-2.0), flat versioned protocol, transport-agnostic host, single-threaded v1.0.0 (determinism first). |
| **M7** | **We wrote the solver ⇒ we verify the solver** (inverse of Bunyan D9): closed-form corpus + genuinely-independent offline oracle + published benchmarks + engineer-signed code-check corpora + mock parity + determinism suite. |
| **M8** | **JURISDICTIONS RULED: France, Morocco, Algeria.** Code families are registrations; ACI first in 1.0.x. *(Owner ruling 2026-07-12.)* ⚠ **EDITIONS ARE NOT RULED BY M8** *(corrected 2026-07-13 — the first draft ratified a matrix whose own cells said "(verify)")*. They live in **`Miqdar_normative_register.md`**, are **provisional**, and are ratified by the owner **before S3** (O-M4). Three findings already move the matrix: **RPA 2024 supersedes RPA 99/2003** (O-M10), **Morocco has no national RC code — practice is BAEL 91-99** (O-M5), **the 1st-gen Eurocodes are withdrawn by 30 Mar 2028** (O-M11). |
| **M9** | **Materials v1.0.0: RC + structural steel + prestressed concrete.** Roads/bridges/tunnels and other civil domains: 1.0.x domain modules. *(Owner ruling 2026-07-12 — breadth risk recorded in §5.2; staged per §13 with a pre-scheduled owner checkpoint at S6.)* |
| **M10** | **Analysis methods v1.0.0:** linear static, P-Δ, modal, response spectrum (+ code torsion/drift). No pushover/NLTH/staged/time-dependent. |
| **M11** | **Optimization is a first-class Command** with an authored objective (weight/cost/standardization); constraints are the code checks; output is a diff + convergence report. **(b) ⚠ `maxUtilization` — an authored hard constraint per DesignGroup, DEFAULT 0.90, NOT 1.0** *(owner ruling 2026-07-13, §7.1)*. Optimizing to the code minimum lands dozens of members on the boundary with a clean green sheet and no margin against what the checks do not model. The cap is **Miqdar's parameter, never a code's**; it is printed in the *note de calcul*; and the report **still flags** convergence at the ceiling. |
| **M12** | **Sign-off is a first-class state; the review artifact is the product.** Clause-level traceability on every result; diff-based review; generated *note de calcul* (FR/EN); nothing exports as verified without an engineer action; agent work cannot cross the sign-off gate. **(b)** The `SignOff` binds **not only what was computed but what computed it** — solver build id + code-module/corpus versions + parameter packs (§9). A stale build is a wrong verdict with a valid signature. |
| **M13** | ⚠ **MIQDAR IS CLOSED SOURCE — proprietary. Bunyan's D15 is INVERTED, not adopted.** *(Owner ruling 2026-07-13.)* **Bunyan is the wedge (open); Miqdar is the moat (closed).** **(b) The dependency rule TIGHTENS as a direct consequence:** shipped artifact = **PERMISSIVE ONLY** (Eigen MPL-2.0 ✓). **LGPL is no longer safe to link statically** — the relink obligation that open-sourcing dissolved for Bunyan **returns for Miqdar** — so **Miqdar MUST NEVER LINK OCCT** (LGPL-2.1); it consumes `scene.json` semantically and asks Bunyan for geometry. **GPL/AGPL: never linked** (a violation, not merely a foreclosed model); offline oracles unaffected. **(c) Bunyan's CLA is now load-bearing for MIQDAR too** — the owner must hold 100% of Bunyan's copyright for a proprietary product to sit safely beside it (§11). |
| **M14** | **Interpretation & NA parameters are explicit, versioned data packs; code texts are never reproduced** (parameters and clause references only). |
| **M15** | **Obligations on Bunyan are minimal and enumerated** (§3.4): four zero-cost prohibitions, **one recurring process cost** (the freeze check — *"minutes, per freeze"*, ⚠ **not "zero"**, as the first draft claimed), one 1.0.x type request (`core.beam`). Miqdar may never require more. **(b) ⚠ The obligation is ENFORCED BY ANCHORS IN BUNYAN'S OWN DOCS** — `current_state.md` §4g + Entry 10, and the `v1.0.0_imp_plan.md` P5 checklist — **not by a promise made inside a file Bunyan never opens.** A convention that only Miqdar's spec remembers is exactly the failure `current_state.md` exists to prevent. |
| **M16** | **Interop transport: file-based v1.0.0 (`.bimproj`/`.miqproj`); live round-trip in v1.x via `window.bunyan`** — Miqdar drives Bunyan as an agent through the one command layer; the inter-app API *is* the agent API (D19's payoff). |
| **M17** | **Always write "Bunyan v1.0.0" / "Miqdar v1.0.0" — never a bare "v1.0.0."** Two independently-versioned products both have one. `current_state.md` exists to disambiguate state across sessions, agents and machines; a bare version string re-introduces exactly the ambiguity it was built to remove. |

---

## 16. Pointers

- **What Bunyan is / how it is built / what it ships:** `core_logic.md` · `architecture.md` · `V1.0.0_spec.md` · `v1.0.0_imp_plan.md`.
- **Live Bunyan build status, and the rulings that created this spec:** `current_state.md` — **§4g** (the Miqdar rulings) and **Entry 10** (the session that wrote them). *(⚠ The first draft cited these before they existed. They exist now — planted deliberately, so a future Bunyan session meets the §3.4 obligation without ever opening this file. See M15-b.)*
- **The code corpus, per jurisdiction:** **`Miqdar_normative_register.md`** — owner-editable, provisional, ratified before S3. Resolves **O-M4**.
- **Miqdar implementation plan:** does not exist yet — written at Miqdar kickoff, in Miqdar's repo, against this spec.

---

## 17. Change log

| Date | Change |
|---|---|
| **2026-07-12** | First draft, from the owner's design discussion (M1–M16). |
| **2026-07-13** | **Review pass** (external review + agent verification against Bunyan's docs). **Four owner rulings:** **M13 — Miqdar is CLOSED SOURCE** (⇒ the LGPL/OCCT prohibition, §6.1/§11, and O-M7 rewritten); **M11-b — `maxUtilization`, default 0.90** (§7.1); **O-M4 — the normative register**, researched and split from M8; **the Bunyan-side enforcement anchors** (§3.4, M15-b). **Corrections:** §3.4 "zero cost" → honest recurring cost; the `scene.json` schema coupling named; the `core.beam` fallback's dependency on Bunyan's unbuilt extrude op named; the acceptance task's lossy export stated up front; a **per-jurisdiction** descope checkpoint added at S3; the three-way **temporal chain** drawn; the **Architect-as-sole-signer** schedule risk named (§5.2, O-M9); **M17** version-string rule. **New open questions:** O-M10 (RPA 2024), O-M11 (Eurocode generation), O-M12 (anchor jurisdiction). |
