# Bunyan — `docs/PHASE_LOG.md`

**What it is, and who reads it when.** The complete entry registry — every session this project has
had, oldest first — read on lookup by any seat that is stuck or missing older context, never as part of
a session briefing.

**Why it exists.** `docs/CURRENT_STATE.md` is read in full on every session, so its length is a cost
paid every run; an entry's value does not go to zero when it scrolls off it. Entries are compressed
here, never discarded. It answers: *why is this shaped this way* · *has this been tried* · *what did
that D-number cost to learn* · *where did this trap come from*.

⚠ **This file is a POINTER, not the source.** Every entry's durable lessons were promoted into
`docs/CURRENT_STATE.md` §1–§5 — that promotion is what makes compression safe — and its full,
uncompressed body is either in `handoff/<seat>/` (named in each entry below) or in git history on the
commit that wrote it.

---

## THE ROTATION RULE (binding — this is how the two files stay in balance)

**§7's budget is the authority: a BYTE budget** (`docs/CURRENT_STATE.md` §7's header;
`BUDGET.maxAbstracts` in `scripts/docs-state.mjs` caps the count at 10). Whenever §7 is at or over it,
the agent that notices compacts:

1. Keep the newest abstracts §7's budget allows, in full.
2. **Summarize each older entry into this file**, in order, keeping its id, date, seat, headline, the
   measured numbers, the decisions it took (with D-numbers), its `handoff/` body path and its review
   status. Drop only session bookkeeping (verify counts, box notes, commit hashes).
3. Before dropping an entry, **check its durable lessons are already in `docs/CURRENT_STATE.md`
   §1–§5**; promote first if not. *The summary here is a pointer; §1–§5 is where a rule binds.*
4. Leave `docs/CURRENT_STATE.md`'s pointer to this file intact.

⚠ **An entry's `###` heading is verbatim and permanent** (invariant 10). `recordedAbstracts` resolves a
durable reference against §7 **plus this file**, reading headings only — so a summarised entry keeps its
identity fields, and compressing a body never moves the population a reference resolves against.

*Compaction is maintenance, not work: it does not get an entry of its own.*

**Rolled 2026-09-05.** §B/§C/§D/§E were compressed to outcomes; the roll line is **2026-08-24**, the
boundary between the P5/harness-hardening phase (everything at or before 2026-08-23 — every row merged
and reviewed, and superseded by the seven-seat roster and the `diwan` unification) and the current
phase, whose entries were moved here in full from §7 on the same day.

---

## §A — Entries 1–32 (the original archive: one line each)

These were compressed first (their durable lessons are in `docs/CURRENT_STATE.md` §1–§4, which is where a fresh
agent actually reads them).

| #   | Date     | What happened / the durable lesson (now in `docs/CURRENT_STATE.md` §1–§4)                                                                                                                             |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 07-11    | P1: pnpm workspace, TS strict, protocol v1, mock, client, golden harness, CI. The kernel is **transport-agnostic**.                                                                              |
| 2   | 07-11    | Verification scope ruled: **we trust OCCT; we verify our own code** (§4b).                                                                                                                       |
| 3   | 07-11/12 | OCCT→WASM to a hard stop: **`opencascade.js` cannot link here (OOM); build upstream OCCT, LTO off** (§1c-1).                                                                                     |
| 4   | 07-12    | Real OCCT geometry in WASM — the spike is green. Links `TKOffset` (wall layers).                                                                                                                 |
| 5   | 07-12    | Rulings: **single-threaded v1.0.0**; the `.wasm` is committed; IFC via IfcOpenShell.                                                                                                             |
| 6   | 07-12    | **BUNYAN IS OPEN SOURCE (AGPL-3.0 + commercial)** (§4e). The LGPL side-module task cancelled; CLA is a hard prereq.                                                                              |
| 7   | 07-12    | Kernel wired in; `measure` lands. **`Left/Right/Front/Back` are not the axes you think** (§1c-4).                                                                                                |
| 8   | 07-12    | **BUNYAN IS AGENT-NATIVE (D19–D23)** (§4f). The agent API _is_ the Command registry.                                                                                                             |
| 9   | 07-12    | **Persistent naming on hard topology — the #1 risk retired.** The literature is wrong about OCCT 7.9.3 (D24).                                                                                    |
| 10  | 07-12/13 | **MIQDAR specified.** The P5 freeze gains a Miqdar gate (§4g).                                                                                                                                   |
| 11  | 07-13    | `transform` lands + exposes a groove-naming hole. **`transform` mints NO identities (D25).**                                                                                                     |
| 12  | 07-13    | The protocol could not build a FLOOR PLATE (`extrude`/`chamfer` unbuilt for a month). **Exit criteria are a spec, not a summary** (§1c-7). **NEVER FUSE** (§4h).                                 |
| 13  | 07-13    | Deep audit: claims vs wiring. The BREP cache had zero code; `measure` couldn't take a `ref`.                                                                                                     |
| 14  | 07-13    | `revolve` lands. **CI was never green — `format:check` runs before tests.** CI's steps are commands; they run on this box.                                                                       |
| 15  | 07-13    | Rulings: the positional key (D28), the freeze's meaning (D13), the BREP cache deferred (D29).                                                                                                    |
| 16  | 07-13    | **THE MODELLING LAYER (D30–D33)** — beams unsupported, "how much plaster?" unanswerable. No code changed (§4h).                                                                                  |
| 17  | 07-13    | **THE ECOSYSTEM (D34–D38)** — Bunyan a third producer of the Clean Delta. Three products converged on one model (§4i).                                                                           |
| 18  | 07-13    | **P3 BUILT: `@bunyan/document`** — every ruling D19–D38 is code; none touched the kernel. D29 measured (7.3 s / 195 elems).                                                                      |
| 19  | 07-13    | **P3 REVIEW: six defects behind a green suite** (the moat didn't work). A green test proves only what it asserts (§1b).                                                                          |
| 20  | 07-13    | **D40–D46 ruled** — the journal, `issueRevision`, all-or-nothing+`dryRun`, verbatim unknown types, ULID, discipline-on-the-part.                                                                 |
| 21  | 07-14    | **P3 CLOSED; the six defects fixed + revert-verified; PROTOCOL FROZEN** (18+5). `BuildContext.discard` landed just in time. D29 ruled SHIP (the identity trap, §4j-2). `-O3` no speed.           |
| 22  | 07-14    | **`apps/web` EXISTS** (Amer) — boots the real OCCT kernel, authors a composite wall through the command layer.                                                                                   |
| 23  | 07-14    | The wall is EDITABLE — ribbon + property panel both generated from the schema (D21 made visible).                                                                                                |
| 24  | 07-14    | **P4 REVIEW: the UI is primitive because the SPEC is (no interaction model)** — D47/D48/D49; P4.5 is new; the gates were blind to `apps/web`; the redraw is 90% waste (§1/§1a).                  |
| 24b | 07-14    | **The model is NOT associative (D50) and a command silently re-identifies (D51).** The largest scope ruling.                                                                                     |
| 25  | 07-14    | P4 step 0 (Amer): the gate now sees `apps/web`; `verify` = the CI step list exactly; CI green again, proven by mutation.                                                                         |
| 26  | 07-14    | P4 2a/2b (Amer): the redraw is INCREMENTAL — an edit re-tessellates only what changed (3 parts, not 6).                                                                                          |
| 27  | 07-14    | P4 2c/2d/4/10/11/12 + the D19 equivalence test (Amer): edges, sub-shape picking, failure-state panels; an agent edit refreshes the view.                                                         |
| 28  | 07-15    | **Gap #10: a hosted void couldn't tell which way is INTO its host** (found by a duct through a beam). `hostFace.inward` added; revert-verified.                                                  |
| 29  | 07-15    | **The WASM heap is priced: ~16 KB/solid ⇒ ~0.3 GB at target. IT FITS.** The one contract-bearing scale axis is unblocked (D48; §1a).                                                             |
| 30  | 07-16    | **Gap #11: a duct through a ROUND COLUMN was bored down its own axis** (a bbox can't describe a curved face). New op `faceFrame` (first post-freeze op, D13); `hostFace.frame`; revert-verified. |
| 31  | 07-16    | **THE PRE-FREEZE AUDIT (Entry 31): seven new points → THE FREEZE GATE** (the authoritative checklist at the head of P5) + five methods.                                                          |
| 32  | 07-16    | **D52–D54 ruled** — baseline Wall `{start,end}`; constraints as a first-class collection; reserve vertex/phase/relevantWhen. The Freeze Gate unblocked.                                          |

---

## §B — Entries 33–53 (D50 step 0, the types, and the reopened pre-freeze rows Ⓐ–Ⓕ)

Compressed 2026-07-30; rolled to one line each 2026-09-05. All are Zayd's unless marked. Full bodies are
in git history on the commit that wrote each entry.

| #   | Date  | What happened / the durable lesson |
| --- | ----- | --- |
| 33  | 07-16 | **D50 0a: the rebuild invalidator becomes a TYPED DEPENDENCY GRAPH.** `dependents(scene, change)` over a switch **exhaustive over `SceneCollection`**, so a new collection is a compile error until its edge is declared — a mechanism still load-bearing (Entries 68/69). |
| 34  | 07-16 | **D50 0b: the model becomes ASSOCIATIVE.** Re-analysis against 9 real Revit/ArchiCAD operations found two freeze-fatal gaps: `offset` is mandatory, and a constraint is not always `{one element, one string target}` ⇒ `Constraint` became a discriminated union on `kind` — the growth path every later member used. |
| 35  | 07-17 | **D50 0e/0f: the model becomes EDITABLE and D51's guard is BUILT.** The registries were create-only, and D51's rule had been written but never enforced (`updateStyle` silently orphaned every opening on a renamed layer). One shared `guardReferences`, RESTRICT by default with a typed `REFUSED`. |
| 36  | 07-17 | **Pre-freeze audit round 2 (the Revit-beating lens).** ⓙ verified in the build: `build.ts` built a hosted element via `buildVoid` ONLY, so a Door was **a hole with no leaf** — freezing `BimObjectType` then would have made real doors impossible. Resolved Entry 44. No source changed. |
| 37  | 07-17 | **D50 0g: the "reserve the shapes" pass; D55/D56 ruled.** Every reservation optional/additive with no schema bump (vertex grammar · phasing as TWO datums · `relevantWhen?` · `formula?` · `ifcMapping?` · `migrateStyle?` · `georeference` · `parentElementId?` · `properties?` · `classifications?` · `mark?` · `Grid.geometry?`). **Space extent = Option B**, boundary DERIVED, never stored. ⚠⚠ D55 pulled a SECOND heavy solver into v1.0.0. |
| 38  | 07-18 | **0g.2, the verb half (ⓣ).** Six reserved `Element` fields had no authoring path; they landed as optional `createElement` args plus `core.setElementMetadata`. ⚠⚠ **THE ⓣ LESSON, WHICH HAS BITTEN TWICE SINCE: a reserved field with no authoring path forecloses being born with it.** |
| 39  | 07-18 | **The HARD GATE closed: both v1.0.0 solvers priced.** 0d ~4–6 sessions (planegcs proven headless here, 497 KB, LGPL-2.1) · room-bounding ~5–8, no drop-in. Neither touches a frozen contract ⇒ the risk was ship-date, not freeze-correctness. Owner ruled both ship, serial. |
| 40  | 07-18 | **0d BUILT: the sketch constraint solver ships (real planegcs, headless).** The `SketchSolver` seam keeps `@bunyan/document` pure. ⚠⚠ **D26 held and was revert-verified:** a dimensional re-solve moves geometry while `lateral.2` stays byte-identical; permuting the segment array breaks naming. |
| 41  | 07-18 | **The room-bounding solver ships (D55) — priced at 5–8 sessions, the body took ONE.** Both hard worries dissolved: the seed makes the finish face free, and **openings do not leak rooms** (the Level-plane footprint stays continuous). `roomMetrics` is a QUERY — never stored, never cached. Recorded as v1.0.x scope so nobody re-derives it: curved-wall arcs, auto-seed, room islands, sloped soffits, column footprints. |
| 42  | 07-20 | **0c wall-to-wall joins ship — auto-miter, anti-fuse. STEP 0 CLOSED.** ⚠ Two owner rulings OVERRODE the recommendations: joins are AUTOMATIC ON PROXIMITY, and the real D52 Wall was pulled forward into `@bunyan/types`. ⚠⚠ **The anti-fuse rule held structurally and by gate** — a window on a joined wall survives, token-identical. Proximity is D1-safe because it is decided from `{start,end}` PARAMS, never from a built solid. |
| 43  | 07-20 | **Pre-freeze review + the BIMsync reframe (D57).** #1 *"step 0 closed" outran the artifacts* — all of Entry 42 was uncommitted. #3 the join resolver is O(N²), ~4.2 s at ~2000 walls (retired Entry 61). #4 mid-span/T joins inexpressible (⇒ D69). ⚠⚠ **D57: BIMsync is UNBUILT and its spec ADAPTS to Bunyan** — never wait on or infer from it. |
| 44  | 07-20 | **The pre-freeze gate closes: ⓙ resolved.** One new optional `buildLeaf?(VoidBuildContext)` — a hosted type provides BOTH hole and solid — proven by `tsc` to need no new frozen field. `buildLeaf`, not `buildGeometry`, because a door is a solid only when hosted. |
| 45  | 07-21 | **Pre-freeze gap-hunt: one real gap — a join silently MOVED a hosted door.** A centred door drifted 50 mm when a NEIGHBOUR wall arrived at the far corner. ⚠ Entry 42's gate never caught it: it checked the host TOKEN and void VOLUME, not the door's POSITION. Not a foreclosure. Owner ruled Revit's model: `offsetU` measures from the wall START along the baseline. |
| 46  | 07-21 | **STRATEGIC REVIEW ("will Bunyan beat Revit?") — THE FREEZE IS REOPENED. D58–D66.** The shipped product was two element types on an exact kernel while the docs measured progress against the freeze checklist. **The freeze being ready is not the product being ready.** Six rulings add pre-freeze work (rows Ⓐ–Ⓕ + D66). Wrote `docs/CURRENT_STATE.md` §0a and the imp_plan's parity ledger. |
| 47  | 07-21 | **Row Ⓐ: the DOCUMENTATION ANCHORING contracts reserved (D58).** Rule 17: a drawing stores a DEFINITION, never projected geometry. Four optional absent-defaulted top-level collections. ⚠⚠ Documentation entities are NOT elements, so their CRUD is ordinary additive registry entries. ⚠⚠ This entry's own proof-of-concept evaluator became D78's cautionary tale — green for seven days because its fixture was two plain walls. |
| 48  | 07-22 | **Row Ⓑ: element COMPOSITION / NESTING designed, ruled and BUILT (D59).** Owner ruled Model A — children are DERIVED, never stored. `core.curtainwall` (depth-2) validates it. ⚠⚠ **The fact that has bitten four times since: a generated child is NOT a scene row** — invisible to `scene.elements`, which broke enumeration, the style invalidator, schedules and `mark`. |
| 49  | 07-22 | **Row Ⓒ: the CO-AUTHORING concurrency/merge seam reserved (D60).** Four optional additive fields proven mergeable by a pure commutative `mergeOrdered()`. No `scene.json` touch, no schema bump, no backend. ⚠ The `frontier` reservation later DEFENDED ITSELF — D76's scalar-only guard was refused by this entry's test, four days before the freeze. |
| 50  | 07-22 | **Row Ⓓ: the FAMILY-DEFINITION data-format seam reserved (D61).** Owner overrode the recommendation: a FULLY-SHAPED grammar now, not an opaque envelope. ⚠ A data family needs NO new `BimObjectType` field. ⚠ Rule 8's later sweep found this grammar has **no slot for `exposedRefs`** — still an owed owner ruling. |
| 51  | 07-23 | **Owner redirect: D64 is gated on building a proper MIQDAR spec first.** *The pattern worth keeping: a question about a second product is answered by building that product's spec, not by guessing on its behalf.* |
| 52  | 07-23 | **Row Ⓔ / D64 ruled FROM EVIDENCE: the PEI-bound side-graph suffices.** Every idealization datum is either already readable from the frozen contract or many-valued per physical element ⇒ **reserve NOTHING analytical on the type/part.** One exception: `Material.thermal?` for the energy north-star (M18), revert-verified. |
| 53  | 07-24 | **Row Ⓕ done (D62/63/65): three of six items needed NO reservation.** Reserved: MEP systems/connectors (a connector is AUTHORED placement, never a `SubShapeRef`), design options, and `refTo` widened. ⚠⚠ **The one thing harder than billed — the design-option EXCLUSION INVARIANT**, ruled into the frozen contract (`isElementActive`); it then went dirty three separate ways (D67, D68, D78) — the most-corrected single rule in the project. |

---

## §C — Entries 54–88 — the full bodies live in `handoff/`

⚠ **There is no entry 78.** It was a REVIEW-ONLY session (PR #5) that wrote no abstract of its own; its
findings are in entry 77's `REVIEW:` line. The gap is real, not a loss. 54–88 is contiguous.

Entries 54–75 are indexed below with their bodies. Entries 67 and 76–88 rotated out of §7 as full
abstracts and were rolled to their outcomes 2026-09-05.


### 88 | 2026-08-08 | Zayd | the habit three sessions kept performing by hand is a gate — and the hard part was the SKIP

Zayd's prompt-sync gate ships (`scripts/prompt-sync.mjs`, +12 tests, `docs:check` gate six). **The hard part is the SKIP, not the comparison** — no region of a prompt file is always equal to `main`'s, so the invariant is a MOMENT: two git-measured skips. Three defects in one gate, all a skip reporting green (unresolvable `BASE_REF` now THROWS; `actions/checkout`'s merge commit made skip 2 fire on every PR; question 3 diffed commits, not the working tree). **A gate's failure mode is never a wrong answer; it is NO answer wearing a tick.** `RISK: additive`. Body `handoff/zayd/2026-08-08-e88-prompt-sync-gate.md`. **REVIEW: Entry 90 — reviewed, AMENDED, MERGED** (PR #15): skip 2 asked about commits where the invariant is about a file, failing correct sessions; now `git diff <merge-base> <main> -- <file>`, +2 tests.


### 87 | 2026-08-08 | Zayd | a belongs-to CYCLE is authorable by two shipped verbs — and it erases the element silently

`core.retargetReference { elementId: w, hostId: w }` is accepted and **the wall vanishes** — `requireElement` proves a target exists, never that it is not the element itself; a reference that resolves can still LOOP, and a loop erases rather than breaks. Same hole on `parentElementId` via `core.setElementMetadata` (`projectQuantities()` → 0 rows at `basis: 'exact'`). **The guard's edge set must be the EXCLUSION rule's**, not one edge. `wouldCloseBelongsToCycle` NEW. `RISK: contract-touching`. Body `handoff/zayd/2026-08-08-e87-belongs-to-cycle-guard.md`. **REVIEW: Entry 88 — reviewed and MERGED** on owner authorisation; over-refusal answered by a differential fuzz (20 000 graphs / 100 000 queries, **zero disagreements**), cost 0.17 µs/call.


### 86 | 2026-08-07 | Amer | the corner-drag, and the wrapper that was eating D23's transaction

`apps/web` corner-drag ships (`tool/drag.ts`, pure). **`withUiRefresh` was dropping `ExecuteOptions`**, so D23's `transactionId` never reached the document and a corner-drag undid one edit at a time — nothing failed; the casualty was undo GRANULARITY, and a half-undone corner is a model the user never authored. ⇒ **for a wrapper, assert the ARGUMENTS ARRIVE** — the variadic tail vanishes silently. Q8 answered (the refusal is right and must not be relaxed ⇒ Q20 NEW); a REFUSED `dryRun` probe costs 1.6 ms, not ~100 ms. `RISK: additive`. Body `handoff/amer/2026-08-07-move-tool-corner-drag.md`. **REVIEW: Entries 87 + 88, MERGED by Entry 89** — three defects fixed on the branch (2D-only corner peer match across storeys; a WEAK-GREEN absent-options test where ARITY is the observable; `hostedPlan`'s unsigned `Math.hypot`).


### 85 | 2026-08-06 | Zayd | the `hostId` edge, swept — the ancestry is a DAG and the walk called it a cycle

`isElementActive` misread a shared ancestor as a cycle: two belongs-to edges make the ancestry a **DAG**, and one `seen` set was doing two jobs ("already judged" vs "on the current path"). Replaced by DFS colours. Measured on a document with **no design options at all** — `scene.elements` 4, `modelElements()` 3, both diagnostics empty. ⚠ A `.bnn` can dangle `hostId` silently ⇒ **Q19 needs a reconciliation over BOTH edges**. `RISK: contract-touching`. Body `handoff/zayd/2026-08-06-e85-hostid-sweep.md`. **REVIEW: Entry 86 — APPROVED, NOT MERGED (owner's); re-reviewed and MERGED by Entry 87** — the cycle hunt came back empty across ten shapes and then across a 20 000-graph differential fuzz; every disagreement the old code produced was an OVER-refusal.


### 84 | 2026-08-06 | Amer | alignment guides ship — and the guide is the first candidate that owns NOTHING

Alignment guides ship (`tool/align.ts` pure; `Viewport.guidesAt`/`setGuideLines`). **The grid lattice is the failure mode that looks like success** — admitting every Tier-1 candidate as a reference lights both guides everywhere, so references are endpoints/midpoints plus the gesture anchor. **A guide carries no `ref`/`elementId`/`nodeId`**, so a hosted-void tool declines it; `'extension'` in the Q3 order, no `SnapKind` added. `RISK: additive`. Body `handoff/amer/2026-08-06-alignment-guides.md`. **REVIEW: Entry 86 — reviewed and MERGED**; browser pair re-run byte-identically, and **one defect fixed: `SnapIndex.near()` probes `(2·reach+1)³` cells regardless of contents**, so a 15 m guide query cost 72.93 ms/pointermove (14 fps) vs 0.465 ms after (157×).


### 83 | 2026-08-06 | Zayd | the three reserved reference args, swept — one is dormant, one is a 100% erasure (Q19)

The three reserved reference args swept: `systemId` DORMANT (zero readers), `designOptionId` is Entry 82's 50%, and **`parentElementId` is the worst — `cascadeOf` (D39) walks `hostId` only while `isElementActive` (D67) walks both**, so deleting a parent leaves a child in `scene.elements` and invisible to every consumer: a **100% under-report** at `basis: 'exact'` (⇒ Q19 NEW). Also: **"needs no ruling" ≠ "agent-mergeable"** — an ADDED export in a watched file trips the freeze gate exactly like a changed one. `RISK: contract-touching`. Body `handoff/zayd/2026-08-06-e83-reserved-ref-sweep.md`. **REVIEW: Entry 84, then re-reviewed by Entry 85 — MERGED on owner authority**; two defects fixed on the branch (`_baselinedAtEntry` resolved against §7, a rotating window, not against what does not rot; and the cross-field date check fed from two sources, so any re-baseline outside the entry's own calendar day wrote a baseline its own gate rejects).


### 82 | 2026-08-06 | Zayd | the design-options question, walked — the two doors are a 50% silent under-report (Q17)

The Q17 walk (`P5_step6D_design_options_crud_design.md` NEW). **Not a symmetry complaint — a 50.0% silent under-report wearing `basis: 'exact'`, on a document with no design options at all**: 0 of 40 verbs can author an option, `core.createElement` accepts a `designOptionId` naming nothing, and `isElementActive` then excludes that element everywhere. **"Is it additive?" has two answers that part company** — data-additive YES, freeze-additive NO. `RISK: additive`. Body `handoff/zayd/2026-08-06-q17-designoptions.md`. **REVIEW: Entry 83 — APPROVED, no defect; merged by the owner.**


### 81 | 2026-08-05 | Zayd | the two gates that failed OPEN are closed — and one of them had never run (Q15, Q16)

Q15 and Q16 closed. **A source-text "is it wired?" assertion proves the call is written, not that it runs** — the reverted gate still contained its calls, below an early `process.exit(0)`, and only the end-to-end test went red. ⇒ where the artifact can be executed, EXECUTE it (`reseed-gate-e2e.test.ts` asserts the EXIT CODE). **Both defects failed OPEN**, which is what an untested gate drifts towards. `RISK: additive`. Body `handoff/zayd/2026-08-05-q15-q16.md`. **REVIEW: Zayd, 2026-08-06 — MERGED**; one real defect fixed on the branch — Q15's fix held for exactly ONE invocation, because the verdict was measured against the baseline `--rebaseline` had just rewritten; `state.mjs` now measures against the baseline at the merge base.


### 80 | 2026-08-05 | Amer | the opening tool ships — one click on a face is a hosted door, and `snapTo` was decorative

The opening tool ships — one click on a wall face is a hosted door. **`InputSpec.snapTo` was decorative for three entries**: declared, typed, documented and read by nothing, so pointing near a corner hosted the door on an EDGE ref — `state: 'failed'`, `parts: []`, no banner, no console error, both diagnostics empty, on 1 of 2 placements. Found by USING it (§1b). ⚠ Gate six had never run on Amer's box since the 2026-07-31 migration (CRLF). `RISK: additive`. Body `handoff/amer/2026-08-05-opening-tool.md`. **REVIEW: Zayd, Entry 81 — MERGED**; one finding fixed on the branch — the app-side face guard left the DOCUMENT layer unguarded.


### 79 | 2026-08-05 | Zayd | the emsdk image is pinned by digest — and the artifact now names its own compiler (Q14)

The emsdk image is pinned by digest and the artifact names its own compiler (Q14). **The tag had already moved** — the shipped artifact was linked by emsdk 6.0.2 while `:latest` was 6.0.5, and following the README verbatim relinks with a compiler `OCCT_BUILD_ID` does not name while all four tests asserting it stay green. ⚠ Reading the version back from the artifact was impossible, not merely undone: `-O3` strips `producers`, so the `.wasm` carried zero custom sections. `RISK: additive`. Body `handoff/zayd/2026-08-05-emsdk-digest-pin.md`. **REVIEW: Entry 80 — REVIEWED + MERGED**; one finding fixed on the branch — the backward sweep stopped one file short of `NOTICE`.


### 77 | 2026-08-03 | Zayd | the plan/section unit ships — a drawing IS the B-Rep (D58 row Ⓐ, D81)

The plan/section unit ships — a drawing IS the B-Rep (D58 row Ⓐ, D81). **A ref's `nodeId` names the node that MINTED it, not the part that carries it**: on a holed wall, 8 cut curves span TWO nodeIds, so a `nodeId`-keyed plan silently draws 6 where 8 is correct. ⚠ Its own test was weak-green until revert-verification exposed it (`toBeGreaterThan(solidCount)` passes on the broken version). `RISK: contract-touching`. Body `handoff/zayd/2026-08-03-plan-section-unit.md`. **REVIEW: Entry 78 session, MERGED BY THE OWNER 2026-08-05** (`173da22`); one real defect fixed — `projectView` never called its own pre-filter, so a stored, validated `clip` was silently ignored.


### 76 | 2026-08-02 | Zayd | Entry 74 reviewed late — `NOTICE` said seven shipped dependencies were build-time only

Entry 74 reviewed late. **`NOTICE` claimed the remaining dependencies were build/test-time only — false: seven MIT packages ship in the browser bundle** (`react`, `react-dom`, `scheduler`, `three`, `fflate`, `js-tokens`, `loose-envify`) and none was attributed, though MIT requires the notice to travel with every copy. The sweep had been reasoned from memory; the lockfile settles it in half a second. Second: the recipe carried no pinned toolchain version ⇒ Q14. `RISK: additive`. Body `handoff/zayd/2026-08-02-entry74-late-review.md`. **REVIEW: Entry 77 — reviewed and merged**; one defect fixed — **the gate enumerated its input set from memory** (`MANIFESTS` hand-written while `pnpm-workspace.yaml` defines the set by glob), demonstrated with a probe package the gate could not see; now derived from the workspace globs. ⚠ Second finding: this entry's own stated cause for the `fieldsFull` defect was false — `docs/CURRENT_STATE.md` is in `.prettierignore`, so passing `prettier --check` was vacuous and its line breaks are hand-placed with no gate watching them.


### 67 | 2026-07-28 | Amer | P4.5's non-gating half — selection, view filter, the first keyboard owner

P4.5's non-gating half — selection highlight, view filter, the app's first `keydown` owner. The whole feature is a **pure predicate over the existing `renderParts` array**, so `Viewport`/`PartBatch`/`pick` are untouched. `RISK: additive`. Body `handoff/amer/2026-07-28-p45-selection-view-filter.md`. **REVIEW: pre-dates the PR flow. ⚠ Not independently reviewed.**


### Entries 54–75 — index

**⚠ CHANGED 2026-07-31 (the handoff-system migration).** These entries used to sit in
`docs/CURRENT_STATE.md` §7 in full. They are now one file each under `handoff/<agent>/`, and §7 carries
a fixed-schema abstract for the newest ten instead. Nothing was summarized away in the move.

| #   | Date  | Agent | Full body                                                | Headline |
| --- | ----- | ----- | -------------------------------------------------------- | -------- |
| 54  | 07-24 | Zayd  | `handoff/zayd/2026-07-24-d66-scale-contract-half.md`      | D66's contract half: the heap-eviction hook needs nothing reserved — additive by construction. |
| 55  | 07-25 | Amer  | `handoff/amer/2026-07-25-d66-browser-scale-axes.md`       | D66 axes (b)+(d) measured in a real browser: ~30,700 draw calls / 606 ms. Both collapse to the one-mesh-per-part redraw. |
| 56  | 07-25 | Amer  | `handoff/amer/2026-07-25-browser-storage-indexeddb.md`    | Browser storage ships — a real IndexedDB `StorageAdapter` + Autosave + Save/Open/Recover. |
| 57  | 07-25 | Zayd  | `handoff/zayd/2026-07-25-prefreeze-sweep-d67.md`          | The pre-freeze adversarial sweep → **D67**: the option invariant did not cascade over hosting (4 windows counted where 1 is correct). |
| 58  | 07-25 | Zayd  | `handoff/zayd/2026-07-25-enumeration-clean-delta.md`      | The **enumeration query** + the **Clean Delta exporter** ship; five defects found, incl. the journal not recording the associative cascade. |
| 59  | 07-26 | Zayd  | `handoff/zayd/2026-07-26-asserted-behaviour-sweep-d68.md` | The asserted-behaviour sweep → **D68**: two consumers never obeyed the option invariant. **The first BACKWARD sweep** (§1c-8). |
| 60  | 07-27 | Zayd  | `handoff/zayd/2026-07-27-backward-sweeps-d69-d70-d71.md`  | Backward sweeps of rules 16/12/5 — **all three dirty** (D69 T-junctions, D70 `materialId`, D71 the codec seam) + rules 13/15 (D72 `exposedRefs`). |
| 61  | 07-27 | Zayd  | `handoff/zayd/2026-07-27-join-resolver-spatial-index-d73.md` | The join resolver's O(N²) scan becomes an O(N) spatial index (**D73**) — 4757.7 ms → 27.2 ms; flat at the 10k target. |
| 62  | 07-27 | Zayd  | `handoff/zayd/2026-07-27-exposedrefs-rules-1-3-9-10-d74.md`  | The owed `exposedRefs` declarations close; rules 1/3 dirty (**D74** — a broken ref outlived its element), 9/10 the first clean pair. |
| 63  | 07-28 | Amer  | `handoff/amer/2026-07-28-renderer-batching.md`            | The renderer batching rewrite: **~30,700 draw calls → 2** at the 10k target (1.6 → ~80 fps). |
| 64  | 07-28 | Zayd  | `handoff/zayd/2026-07-28-backward-sweep-complete-d76-d77.md` | **The backward sweep completes — all 18 rules swept, 9 dirty.** D76 (a delta from a log that cannot see its baseline) + D77 (the style invalidator misses child elements). |
| 65  | 07-28 | Zayd  | `handoff/zayd/2026-07-28-schedules-body-d78.md`           | The **schedules body** ships (**D78**) — and the wrong loop it replaces was living inside the reservation's own passing test. |
| 66  | 07-28 | Amer  | `handoff/amer/2026-07-28-p45-interaction-model-design.md` | P4.5 the interaction model, design-first: the doc is delivered, six owner questions put, no source touched. |
| 67  | 07-28 | Amer  | `handoff/amer/2026-07-28-p45-selection-view-filter.md`    | P4.5's non-gating half: selection highlight + view filter + the app's first keyboard owner. `format:check` green again. |
| 68  | 07-29 | Zayd  | `handoff/zayd/2026-07-29-schedule-crud-d79.md`            | The **schedule CRUD** ships (**D79**) — `scene.schedules` becomes a first-class collection; the verbs carry the refusal the body will not. |
| 69  | 07-30 | Zayd  | `handoff/zayd/2026-07-30-plan-section-design.md`          | The plan/section design, design-first — and the frozen `SectionCurve.ref` comment is **false about the projected half**. Five questions put. |
| 70  | 07-30 | Amer  | `handoff/amer/2026-07-30-p45-tool-layer.md`               | P4.5's six rulings taken and the **tool layer ships** — snap seam, tool state machine, numeric entry, hover, multi-select. **Domain rule 19** adopted. |
| 71  | 07-30 | Zayd  | `handoff/zayd/2026-07-30-d29-cache-bodies.md`             | The **D29 geometry-cache bodies** ship — and the ruled design was wrong in two places. The prize is **2.07×**, not an order of magnitude. |
| 72  | 07-30 | Zayd  | `handoff/zayd/2026-07-30-move-verbs-transactionid.md`     | The **five move verbs** + `transactionId` atomicity (**D80**) — and all three shipped Types turned out to be **params-positioned**. |
| 73  | 08-01 | Zayd  | `handoff/zayd/2026-08-01-cached-import-attribution.md`    | The cached-import **attribution**: the "170 embind crossings" were a subtraction residue (**~1%**, not the cost, and the count is **345**). The memory view is **cancelled**; the "rule 17" rename was a **phantom**. |
| 74  | 08-02 | Zayd  | `handoff/zayd/2026-08-02-going-public-housekeeping.md`    | **The going-public housekeeping** — AGPL-3.0 `LICENSE`, `CLA.md`, and a `NOTICE` that discharges OCCT's *conditional* exception (static link, committed binary) as against planegcs's ordinary attribution (npm dep, nothing redistributed). |
| 75  | 08-02 | Zayd  | `handoff/zayd/2026-08-02-review-protocol-hole.md`         | **The review protocol had a hole and Entry 74 fell through it** — the author merged their own PR. The forbidding ruling lived only in the design doc, never in the prompt. Fixed at three levels + a `docs:check` guard. |

---

## §D — The phase narrative: how the freeze was approached (Entries 46–72)

**⚠ MOVED HERE 2026-07-31, rolled to its sequence 2026-09-05.** Kept because it records *how the freeze
question moved* — which sweep was taken instead of freezing, and why — which the entries alone do not
give. The measurements and reasoning are in §B/§C and in each entry's `handoff/` body.

**Nothing here is a work item.** If a line reads like a task, `docs/CURRENT_STATE.md` §5 and
`open_rulings.md` are the live lists and they win.

| Entry | The step, and what it decided |
| --- | --- |
| 46 (07-21) | ⚠⚠ **THE FREEZE IS REOPENED.** Entries 44–45 closed everything the MVP's own checklist owed; the Revit-parity lens then added rows Ⓐ–Ⓕ + D66 as pre-freeze work. |
| 47–53 (07-21→24) | Rows Ⓐ–Ⓕ landed one at a time (D58 anchors · D59 nesting · D60 merge seam · D61 family seam · D64 analytical anchor ruled from the Miqdar spec · D62/63/65 MEP/DWG/design options). |
| 54 (07-24) | D66's contract half: the heap-eviction hook needs nothing reserved. ⚠⚠ **The owner ruled HOLD on the freeze** until all four scale axes have a number and the D8 single-thread verdict is made — the two missing axes were **Amer's**, so for the first time the last pre-freeze blocker was not Zayd's. |
| 55 (07-25) | **Amer's two axes measured — the hold condition is met.** ~30 700 draw calls / ~606 ms per frame (1.6 fps) at the 10k target; incremental edit ~23 ms compute, flat vs scale. Both collapse to the one-mesh-per-part redraw. ⇒ the freeze became an owner act. |
| 57 (07-25) | ⚠⚠ **The sweep was taken instead of the freeze — and it found one.** D67: the option invariant did not cascade over hosting (4 windows counted where 1 is correct). §1c-7's disease, third occurrence. |
| 58 (07-25) | The enumeration query + the Clean Delta exporter built. Five defects, including the journal not recording the associative cascade. ⇒ §1c-7's disease, FOURTH occurrence — a design doc named a field and nobody read it against the code. |
| 59 (07-26) | **The asserted-behaviour sweep — two more (D68).** Two consumers never obeyed the option invariant; the join resolver's was sharper because it corrupts the built B-Rep (*miter-against-a-ghost*). **The first BACKWARD sweep** (§1c-8). |
| 60 (07-27) | **The remaining backward sweeps — all three dirty.** D69 mid-span auto-butt · D70 `contract_version` 1.2 with `materialId` required · D71 the codec seam gains behaviour. Then rules 13 and 15: 13 clean **by measurement**, 15 dirty on two roads (D72 `exposedRefs`). |
| 61 (07-27) | The join resolver's O(N²) scan becomes an O(N) spatial index (D73): 4757.7 ms → 27.2 ms at 1984 walls, per-wall cost flat 1k→10k. |
| 62 (07-27) | **The `exposedRefs` debt paid; rules 1/3 dirty (D74 — a broken ref outlived its element), 9/10 the first clean PAIR.** The transferable reason 9 and 10 came back clean: a violation of either **could not have been written silently**. |
| 64 (07-28) | ✅✅✅ **THE BACKWARD SWEEP IS COMPLETE — all 18 domain rules swept, 9 dirty.** The last five: 14 and 18 dirty (D76 a delta from a log that cannot see its baseline; D77 the style invalidator misses child elements), **8 dirty and SURFACED, not fixed** (the D61 family grammar has no slot for `exposedRefs` — an owed owner ruling), 7 and 17 clean. |
| 65 (07-28) | **The schedules body ships (D78)** — and the wrong loop it replaces was living inside the reservation's own passing test. |
| 66 (07-28) | P4.5 the interaction model, design-first — delivered, six owner questions put, no source touched. |
| 67 (07-28) | P4.5's non-gating half shipped: selection, view filter, the first keyboard owner. |
| 68 (07-29) | **The schedule CRUD ships** — `scene.schedules` promoted to a first-class `SceneCollection`; the verbs carry the refusals the body will not; a document with no schedules stays byte-identical. |
| 69 (07-30) | The plan/section design delivered and **blocked on five rulings**; the frozen `SectionCurve.ref` comment is false about the projected half. No source touched. |
| 70 (07-30) | **P4.5's six rulings taken and the tool layer ships** — snap seam, tool state machine, numeric entry, hover, multi-select. Domain rule 19 adopted. Measured in the browser through the real DOM/`window` path. |
| 71–72 (07-30) | The D29 geometry-cache bodies (the ruled design was wrong in two places; the prize is **2.07×**) and the five move verbs + `transactionId` atomicity (D80). |
| — | ✅✅ **STEP 0 IS CLOSED** — both solvers plus 0c joins built and green (0d E40, room-bounding E41, 0c E42). |

---

## §E — post-D82 turns (`T-nnn` / `STEWARD-slug`, no more sequential numbers)

Newest first. Full bodies in `handoff/`. Entries dated **2026-08-24 and later** are carried in full;
everything at or before **2026-08-23** was rolled to its outcome on 2026-09-05 (see the rotation rule).


### STEWARD-decompose-harness-defects — review: the rows are ready, and the reason given for the one split is not measured — 2026-08-23 — seat: hmdnah

Five measured defects decomposed into rows; a steward turn, no code. **F1 — the T-026/T-025 split is right, its stated reason is not measured.** `RISK: additive`. Body `handoff/hmdnah/2026-08-23-STEWARD-decompose-harness-defects-review.md`. **REVIEW: this IS the review turn — ✅ APPROVED and MERGED** on `narutousomaki741`. ⚠ Unverified here: branch protection (`gh api …/protection` 404 on a push-level token).


### STEWARD-decompose-harness-defects — the box ran out of work with five measured defects unclaimed — 2026-08-23 — seat: brahim

The box ran out of work with five measured defects unclaimed. **The three stranded finishes had never been recorded** — `agent-finish.mjs` runs a multi-minute `pnpm verify`, and a session ending inside it leaves the branch committed-but-unpushed or written-but-uncommitted, after which `agent-start.mjs` refuses at its own `git checkout main` (⇒ T-028). `RISK: additive`. Body `handoff/brahim/2026-08-23-STEWARD-decompose-harness-defects.md`. **REVIEW: ✅ APPROVED and MERGED** by `hmdnah`.


### T-005 — review: the sweep's lens was narrower than the rule it swept for — 2026-08-22 — seat: hmdnah

**§3c binds an aggregate the sweep's lens could not see** — the sweep enumerated readers of `ModelElement.state`/`.failure`; §3c binds every aggregate that quantifies over the model, and the two sets differ by `agent.query` (`QueryFilter.discipline`/`.materialId` are PART-scoped, so they read `partsOf()`, empty on a deferred element). `RISK: additive`. Body `handoff/hmdnah/2026-08-22-T-005-review.md`. **REVIEW: this IS the review turn.**


### T-022 — the glue decoded from a view of growable memory, at BOTH of its two decode sites — 2026-08-21 — seat: zayd

**The task named one site and there are two** — counting the set rather than reading the reported member (§1c-8) gives 2 `.decode(` sites: `UTF8ArrayToString` **and** `UTF16ToString`; fixing only the reported one ships a kernel that still hangs on the first UTF-16 crossing. `RISK: additive`. Body `handoff/zayd/2026-08-21-T-022-glue-growable-decode.md`. **REVIEW: ✅ `hmdnah`, D88 both steps — APPROVED and MERGED**; one review fix on the branch (`c4c0e9f`, F4) and the emsdk pin re-linked byte-for-byte. Chrome boot deferred to `khalihlna`, T-023.


### T-024 — review (step 2, re-run): F3 is closed, and the branch is standing on the state that proves it — 2026-08-19 — seat: hmdnah

**H1 — the legacy half now describes behaviour it no longer has**: the record carries 13 legacy headings against §7's 0, so `frozen-surface.mjs`'s "skips once it rotates" bound is always live. `RISK: additive`. Body `handoff/hmdnah/2026-08-19-T-024-review-step2b-rerun.md`. **REVIEW: this IS the review turn (D88 step 2 re-run) — ✅ APPROVED, NOT MERGED; the owner merges** (`AGENTS.md §5.3`). ⚠ The turn was interrupted between this abstract and its push; item 1 was re-executed 2026-08-20 before the verdict was posted.


### T-024 — the defect return: the gate resolves its key in the RECORD, so §7's rotation cannot redden it — 2026-08-19 — seat: zayd

**F3's defect was the POPULATION, not the assertion** — §7 stood at 32209 of 32768 bytes with 559 B of headroom, smaller than the smallest abstract it held, so ONE append rotated the authorising abstract out and the test failed rather than skipped. The record is §7 **plus** this file, which invariant 10 makes append-only, so the same question asked of the record cannot rot. `RISK: additive` (0 of 214 declarations moved; the owner still merges — the branch moves `_baselinedAtEntry`, which `reserved-classes.mjs` classes `freeze`). Body `handoff/zayd/2026-08-19-T-024-return-record-resolution.md`. **REVIEW: ✅ APPROVED, NOT MERGED** — `hmdnah`, step 2 re-run.


### T-024 — review (step 2, adversarial): the repaired gate's §7 tie is two appends from red, and this turn is the first — 2026-08-19 — seat: hmdnah

**F3 upheld as a proven defect — the fuse is TWO appends, not six, and this turn is the first.** Step 1 measured against the 10-abstract cap; the budget that binds is the BYTE cap. `RISK: additive`. Body `handoff/hmdnah/2026-08-19-T-024-review-step2.md`. **REVIEW: this IS the review turn (D88 step 2) — ⚠ NOT APPROVED**; PR #38 returns to its builder on the existing claim. **G5 — `agent-finish.mjs` stamped the backlog row `done` on an owner-gated PR** (⇒ T-025).


### T-024 — review (step 1, mechanical): both reverts reproduce, and the repaired gate loses its tie to §7 six appends out — 2026-08-19 — seat: hmdnah

Four findings, none blocking. **F1 — the `⚠ MEASURED` uniqueness claim is falsified by the diff that ships it**; **F2 — the collision is 4 keys of 51, not 5**, and the count moves with the review protocol that generates it. `RISK: additive`. Body `handoff/hmdnah/2026-08-19-T-024-review-step1.md`. **REVIEW: this IS the review turn (D88 step 1)**; findings on PR #38, `review/step-1` label applied and verified. No approval, no merge.


### T-024 — `_baselinedAtEntry` records an identity, not a §7 position — 2026-08-19 — seat: zayd

**The identity is `<id> — <date> — <seat>`**, the three authored heading fields, which survive §7's rotation and do not move when a turn prepends an abstract. `RISK: additive` — 0 of 214 declarations moved; owner-gated by label. Body `handoff/zayd/2026-08-19-T-024-baseline-entry-identity.md`. **REVIEW: ⚠ STEP 1 OF 2 COMPLETE — NOT APPROVED, NOT MERGED**; both reverts re-executed independently.


### T-020 — review (step 1, mechanical): the bump collects the identical 936 tests, and vitest 2 was not enforcing the default timeout — 2026-08-18 — seat: hmdnah

**The author's mechanism is correct, and a probe isolates it from the cost** — same commit, same file: 2.1.9 passes at 18 855 ms, 4.1.10 times out at 5000 ms after 19 001 ms; a kernel-free two-case probe reproduces it. `RISK: additive`. Body `handoff/hmdnah/2026-08-18-T-020-review-step1.md`. **REVIEW: this IS the review turn (D88 step 1)**; findings on PR #37.


### T-020 — the runner moves 2.1.9 → 4.1.10, and vitest 2 was not enforcing test timeouts — 2026-08-18 — seat: zayd

**vitest 2 never applied the 5 000 ms default timeout to a test whose awaits are microtask-only**, and one test had been 3.7× over it. A/B on the same commit prices it at 18 549 ms passing under 2.1.9 and 18 397 ms timed out under 4.1.10 — the cost moved 0.8%, the enforcement moved. `RISK: additive`. Body `handoff/zayd/2026-08-18-T-020-vitest-2-to-4.md`. **REVIEW: ✅ APPROVED AND MERGED** — `hmdnah`, D88 both steps; the identical 936 tests re-measured, and step 2's abstract is archived here rather than in §7 (it ran past midnight UTC).


### STEWARD-unblock-pc-and-chrome-boot — review: the splits are honest, and T-024 named a fixture that measures green — 2026-08-18 — seat: hmdnah

**One defect, fixed on the branch** — T-024's `done-when:` named T-011 as the turn that hit the gate, but run against T-011's own merged tree `baselineEntryIssues` returns `[]`; a criterion pointing at a green fixture is not checkable. `RISK: additive`. Body `handoff/hmdnah/2026-08-18-STEWARD-unblock-pc-and-chrome-boot-review.md`. **REVIEW: this IS the review turn**; findings on PR #36. Not merged — owner-gated.


### STEWARD-unblock-pc-and-chrome-boot — the two defects that block a whole machine, decomposed — 2026-08-18 — seat: brahim

Two defects that block a whole machine, decomposed — both are box work, and the blocked machine is the pc: `pnpm verify` cannot reach green there for any task, so `agent-finish.mjs` refuses every `amer`/`khalihlna` turn while five `ready` `pc` rows queue behind it. `RISK: additive (re-baselined)` — 0 declarations moved, only `_baselinedAt`; it still labels the PR `needs-operator/freeze`, the cry-wolf cost T-024 ends. Body `handoff/brahim/2026-08-18-STEWARD-unblock-pc-and-chrome-boot.md`. **REVIEW: ✅ approved by `hmdnah`; the owner merges.**


### T-020 — review (step 2, adversarial): the identical 936 tests also execute the identical 5047 assertions, and the hook deadline is the gate the sweep missed — 2026-08-19 — seat: hmdnah

Nothing blocking; approved and merged. **The backward sweep covers tests and not hooks, and vitest 4 switches on two deadlines** — `hookTimeout` resolves to 10 000 ms independently of `testTimeout`, every kernel suite's `beforeAll` boots OCCT, and `queueMicrotask` suppresses a hook's deadline exactly as it suppresses a test's. `RISK: additive`. Body `handoff/hmdnah/2026-08-19-T-020-review-step2.md`. **REVIEW: this IS step 2; it approved and merged PR #37.**


### T-011 — review (step 2, re-run): both returned defects closed; the oracle claim is false — 2026-08-17 — seat: hmdnah

**The entry below's oracle measurement is false for `area`** — across the miter flip `volume`, face/edge counts and the `refs` list (18 entries, not 17) are identical, but `area` moves 39 848 528.137 → 39 600 000 mm² and `edgeLength` 36 965.685 → 36 800 mm. `RISK: additive`. Body `handoff/hmdnah/2026-08-17-T-011-review-step2b-rerun.md`. **REVIEW: this IS the review turn**; findings on PR #32.


### T-011 — the D88 defect return: the option edge reaches the join neighbour, and seeds from the change — 2026-08-17 — seat: zayd

**Volume and area cannot see defect 1, and a test built on either would be weak green** — a 45° miter adds on one lateral face exactly what it removes on the other. The shape moves, and the kernel's `bounds` on the live handle is what says so. `RISK: contract-touching` (0 declarations moved by this turn). Body `handoff/zayd/2026-08-17-T-011-return-join-neighbour-and-undo-seed.md`. **REVIEW: APPROVED — `hmdnah`, D88 step 2 re-run; the owner merges #32.** ⚠ One measured claim above is false: `area` is NOT byte-identical across the flip (see the entry above).


### T-011 — review (step 2 of 2): the invalidator under-names, and reproduces D68 from the authoring side — 2026-08-17 — seat: hmdnah

**Two defects, both in the new dependency edge — NOT APPROVED.** (1) The edge seeds tagged elements and belongs-to descendants but never expands over `wallsJoinedTo`, so `core.updateDesignOption {isPrimary:true}` moves `resolveJoins(mainWall)` from `['end']` to `[]` while `#affected` names only the option wall. `RISK: additive`. Body `handoff/hmdnah/2026-08-17-T-011-review-step2.md`. **REVIEW: this IS the review turn**; findings on PR #32.


### T-011 — the "no authoring verb" comments, swept; and `§8`'s suite line measures the wrong branch — 2026-08-17 — seat: zayd

Seven files still said `scene.designOptions` was RESERVED with no authoring verb, inside the diff that gives it three; two were false before this PR. **And `§8`'s suite line measures the wrong branch** — `pnpm state` reads `.vitest-summary.json`, untracked and branch-agnostic. `RISK: contract-touching (re-baselined)` — 0 declarations moved by this turn. Body `handoff/zayd/2026-08-17-T-011-reserved-comment-sweep.md`. **REVIEW: step 2 (adversarial) — NOT approved**, two defects proven; returned to `zayd` on the existing claim.


### T-018 — D66's lazy build: 89.8% of a cold load is deferrable, and a deferred join partner is safe — 2026-08-17 — seat: zayd

**The safety condition holds and it holds ACROSS A JOIN** — `rebuildAll()` vs `rebuildOnly(9 of 88)` agree on part names, `nodeId`, `refs` and quantities, and the built south wall keeps the miter made by a west wall the partial document never builds. 89.8% of a cold load is deferrable. `RISK: additive`. Body `handoff/zayd/2026-08-17-T-018-d66-lazy-build.md`. **REVIEW: approved and merged by `hmdnah`**, green CI, no defect.


### T-018 — review: the deferral numbers reproduce, and the tripwire has teeth — 2026-08-17 — seat: hmdnah

No defect; all four `done-when:` items box-executable and executed, every item-4 claim held against code. `RISK: additive`. Body `handoff/hmdnah/2026-08-17-T-018-review-d66-lazy-build.md`. **REVIEW: this IS the review turn**; findings on PR #35.


### T-017 — review: the new gate has teeth on the real file, not only on its fixture — 2026-08-17 — seat: hmdnah

No defect; all three `done-when:` items executed. **The fixture alone would not have settled item 6** — it proves the helper and stays green if the real-file assertion is deleted, which is why the gate was re-proved against `docs/CURRENT_STATE.md`. `RISK: additive`. Body `handoff/hmdnah/2026-08-17-T-017-review.md`. **REVIEW: this IS the review.**


### T-017 — §7's newest-first gate now reads the authored date, not the positional key — 2026-08-17 — seat: zayd

Measured the defect before writing the fix: on a two-entry fixture with the OLDER entry on top the positional key is `1000, 999` — descending — so the old assertion was green on the exact input it exists to refuse. The gate now reads each entry's authored `date:`. `RISK: additive`. Body `handoff/zayd/2026-08-17-T-017-newest-first-by-date.md`. **REVIEW: `hmdnah`, one step — approved and merged**; item 6 re-proved against the real file.


### T-016 — review (step 2, adversarial): the field is correct and its wiring is untested — 2026-08-17 — seat: hmdnah

No defect. **The wiring is uncovered** — three `resolveBuilder` cases assert a pure function and nothing asserts it is called, so the `done-when:` bullets rest on re-execution; proven instead on this branch's own history. `RISK: additive`. Body `handoff/hmdnah/2026-08-17-T-016-review-step2.md`. **REVIEW: this IS step 2 of the review.**


### T-016 — review (step 1, mechanical): the revert holds, and the fixture the `done-when:` names is reachable — 2026-08-17 — seat: hmdnah

Nothing blocking; three claims that do not hold as written (the baton write IS reachable by a fixture, so no committed test covers it). `RISK: additive`. Body `handoff/hmdnah/2026-08-17-T-016-review-step1.md`. **REVIEW: this IS step 1; step 2 approves and merges.**


### T-016 — `§0b`'s baton carries the builder separately from the current holder — 2026-08-16 — seat: zayd

Confirms the gap exactly: before this fix `agent-finish.mjs`'s baton rewrite re-rendered the whole claim with `seat` set to the finishing seat unconditionally, so a `--review` finish left the builder's identity nowhere in `docs/CURRENT_STATE.md` — only in the claim commit message. `RISK: additive`. Body `handoff/zayd/2026-08-16-T-016-baton-builder-field.md`. **REVIEW: both D88 steps complete, `hmdnah` — no defect; approved and merged.**


### T-011 — review (step 1 of 2): the CRUD closes the measured defect exactly as claimed — 2026-08-16 — seat: hmdnah

No defect; every item-4 claim held against code. `RISK: additive`. Body `handoff/hmdnah/2026-08-16-T-011-review-step1.md`. **REVIEW: this IS the review turn**; findings on PR #32.


### T-011 — Q17a — `scene.designOptions` becomes a `SceneCollection`, and its CRUD ships — 2026-08-16 — seat: zayd

The measured 50% defect closes exactly as the design doc predicted — two identical walls, one tagged, now both count (`modelElements()` 2 of 2; schedule 7 200 000 000 mm³, was 3 600 000 000). **New kind of thing:** promoting an option to primary must atomically demote its sibling. `RISK: contract-touching (re-baselined)` — 1 declaration moved, `scene.ts :: type SceneCollection`, predicted and owner-ruled in advance (D85). Body `handoff/zayd/2026-08-16-T-011-design-option-crud.md`. **REVIEW: D88 two-step — step 1 clean, step 2 NOT approved** (two defects in `dependency.ts`'s new edge); returned to `zayd`.


### T-009 — review (step 1, mechanical): the revert holds, and the fix's structural claims check out — 2026-08-16 — seat: hmdnah

Nothing blocking; every structural claim the fix rests on read against the code. `RISK: additive`. Body `handoff/hmdnah/2026-08-16-T-009-review-step1.md`. **REVIEW: this IS step 1; step 2 approves and merges.**


### T-009 — Q18: a hosted void may only host on its host's own base part — 2026-08-16 — seat: zayd

Measured the actual trigger headlessly before writing the fix: an interior hole passes the host face's own token through UNCHANGED and does not reproduce the defect; a void COINCIDENT with an existing one earns OCCT's "Modified" verdict and mints a genuinely derived face token. `RISK: additive`. Body `handoff/zayd/2026-08-16-T-009-hosted-void-base-part.md`. **REVIEW: step 1 complete, nothing blocking; step 2 approves and merges.**


### T-012 — review (step 2): the fallback quantifies over the registry, and `reviewerForBranch` genuinely reuses `reviewerFor` — 2026-08-16 — seat: hmdnah

Items 2/3/6 clean. **Backward sweep:** every other PR-title→reviewer consumer in the tree checked — none exposed to this gap. `RISK: additive`. Body `handoff/hmdnah/2026-08-16-T-012-review-step2.md`. **REVIEW: this IS the review turn — approved and merged** on `narutousomaki741`.


### T-012 — `--review` routes a PR whose title carries no `T-nnn` — 2026-08-16 — seat: zayd

Closes a gap T-015's handoff had flagged and left open — `gh pr checkout`/`gh pr comment` were untested against a real PR; the new `fakeGhForReview` stub makes them hermetic. `RISK: additive`. Body `handoff/zayd/2026-08-16-T-012-titleless-pr-routing.md`. **REVIEW: two-step review complete (D88) — approved and merged** by `hmdnah`.


### T-013 — review (step 2): the guard held, and CI's own failure-then-fix cycle proved the hermeticity fix genuine — 2026-08-16 — seat: hmdnah

Items 2/3/6 clean. **Backward sweep:** no other pre-existing test file spawns `agent-start.mjs` as a subprocess and nothing else calls `identityGate` — no other site newly exposed. `RISK: additive`. Body `handoff/hmdnah/2026-08-16-T-013-review-step2.md`. **REVIEW: this IS the review turn — approved and merged.**


### T-013 — the seat identity guard: `gh api user` must match the seat — 2026-08-16 — seat: zayd

**GitHub's self-approval refusal genuinely does not extend to `gh pr merge`** (D87's measurement re-confirmed rather than trusted), so this guard is the only thing between a forgotten `GH_TOKEN` and a self-approving merge on a private, unprotected repo. `RISK: additive` — no frozen byte; the TASK is `risk: high` (D88's two-step review), a separate axis from the frozen-surface RISK. Body `handoff/zayd/2026-08-16-T-013-identity-guard.md`. **REVIEW: both steps complete — approved and merged**; step 1's "not a CI risk" call was wrong (CI genuinely failed, run `31949354336`), fixed on the branch before merge.


### T-008 — the two step-1 review defects, closed on the existing claim — 2026-08-16 — seat: zayd

Both defects reproduce exactly as both `hmdnah` reviews measured; `agent-start.mjs --continue T-008` (T-015's first real use) worked as documented. `RISK: additive`. Body `handoff/zayd/2026-08-16-T-008-review-defects-fixed.md`. **REVIEW: pending — `hmdnah` step 2 (D88), same PR #23.**


### T-008 — review: the reconciliation holds, and the surfacing pass double-reports one element — 2026-08-15 — seat: hmdnah

The verdict holds and both defects reproduce, measured rather than read. **`brokenRefs()` emits two entries identical in `elementId` and `ref`** when one element's `hostId` and `parentElementId` name the same missing id — the edges are checked independently and differ only in `reason`. `RISK: additive`. Body `handoff/hmdnah/2026-08-15-T-008-review.md`. **REVIEW: this IS the review turn**; the verdict is on the entry below.


### T-008 — the cascade and the exclusion rule now walk one belongs-to edge set — 2026-08-15 — seat: zayd

**The whole suite noticed the new cascade in exactly ONE place** — `1 failed | 842 passed` before the pin was updated, and that failure is the pin D83 wrote to fail. `hostedBy` stays `hostId`-only because it answers the ASSEMBLY question. `RISK: additive`. Body `handoff/zayd/2026-08-15-T-008-belongs-to-deletion.md`. **REVIEW: `hmdnah`, PR #23 — pre-review only, NOT approved and NOT merged**, because `risk: high` is an owner gate independent of the mechanical `RISK: additive`; both reverts re-executed (6 RED, 3 RED), two non-blocking defects found.


### T-014 — review (step 2): the mechanism's first live exercise found two real defects and two wrong claims — 2026-08-16 — seat: hmdnah

**Ran the mechanism live rather than only reading code** — it reported STEP 1, not step 2, because the `review/step-1` label was never applied: `gh label create` cannot succeed while the description exceeds GitHub's 100-character cap. Fixed. `RISK: additive`. Body `handoff/hmdnah/2026-08-16-T-014-review-step2.md`. **REVIEW: this IS step 2**; the verdict is on the entry above.


### T-014 — `--review` must read the task's `risk:`, not only the frozen surface — 2026-08-16 — seat: zayd

`AGENTS.md §1.2` and `REVIEW.md` already specified this mechanism in full before any code existed — this PR implements a written spec, not a design decision. ⚠ The `gh`-touching halves are not exercised by the fixture suite. `RISK: additive`. Body `handoff/zayd/2026-08-16-T-014-two-step-review-gate.md`. **REVIEW: `hmdnah`, PR #28, two-step D88 — APPROVED and MERGED**; step 2 fixed three defects on the branch.


### T-015 — review: the fix holds, backward sweep and weak-green clean — 2026-08-16 — seat: hmdnah

No new blocking finding. **Backward sweep:** `builderFor` has one production call site, now fixed; every `reviewerFor` call site checked — no second instance of the missing-arg shape. `RISK: additive`. Body `handoff/hmdnah/2026-08-16-T-015-review.md`. **REVIEW: this IS the review turn**; the verdict is on the build entry below.


### T-015 — `agent-start.mjs --continue <T-nnn>` — the branch returns to its builder — 2026-08-16 — seat: zayd

**Confirms `builderFor` must key on `machine:`** — the admitted seat has to be derived from the task row, because a `--review` finish rewrites the `§0b` baton to name the REVIEWER (measured against T-008's live branch: baton `hmdnah`/reviewer, claim commit `zayd`). `RISK: additive`. Body `handoff/zayd/2026-08-16-T-015-continue-mechanism.md`. **REVIEW: Step 1 — approval withheld, one blocking finding** (the admission gate called `builderFor` with no finishing seat, so `machine: any` always resolved to `zayd`/`box`); fixed on the branch by a second `zayd` turn via `--continue` (`2798b2c`).


### T-015 — review: the fix holds, backward sweep and weak-green clean — 2026-08-16 — seat: hmdnah

⚠ **Duplicate heading, kept deliberately.** This abstract exists twice in this file — a rotation that copied instead of moving, across two compactions; invariant 10 makes the archive append-only, so neither copy is deleted. It is the one colliding key in the record that is not a turn-pair, and it is why the collision gate asserts one task/seat/day rather than distinct headlines (`docs/BACKLOG.md` `## Discovered`, 2026-08-19). Content as above.


### STEWARD-step-routing-and-continue — D88 asserted two mechanisms no script implements — 2026-08-15 — seat: brahim

**Reviewing PR #24 proved both of D88's mechanisms absent.** The `NEXT TURN: REVIEW ONLY` banner has never existed on `main` — it is written on the task branch and read after `git checkout main` — and a builder cannot re-enter its own branch either. `RISK: additive`. Body `handoff/brahim/2026-08-15-STEWARD-step-routing-and-continue.md`. **REVIEW: `hmdnah` — approval withheld, one blocking finding, fixed on the branch before re-review**: T-015's seat gate had been written against the `§0b` baton, which names the last seat to FINISH.


### STEWARD-two-step-high-risk-review — review: D88 is sound, and two orchestrator files still called `risk: high` owner-gated — 2026-08-15 — seat: hmdnah

Two steps D88 describes that the scripts refuse — a builder cannot re-enter a row left at `review`, and the banner cannot route step 2. Neither is covered by T-014. `RISK: additive`. Body `handoff/hmdnah/2026-08-15-STEWARD-two-step-high-risk-review-review.md`. **REVIEW: this is the review — APPROVED and MERGED.**


### STEWARD-two-step-high-risk-review — `risk: high` takes two review turns, not the owner's merge — 2026-08-15 — seat: brahim

**Three files gave three answers about what `risk: high` meant** — `agent-finish.mjs` wrote `NEXT TURN: REVIEW ONLY`, the orchestrator treated it as owner-gated, and `AGENTS.md §5`, which defines owner-gated, never listed it. ⚠ A cross-account second reviewer does not exist for a box builder PR, so the two steps are two turns by one reviewer seat. `RISK: additive`. Body `handoff/brahim/2026-08-15-STEWARD-two-step-high-risk-review.md`. **REVIEW: `hmdnah`, PR #24 — APPROVED and MERGED.**


### T-007 — a dangling `designOptionId` is a broken reference, derived rather than stored — 2026-08-15 — seat: zayd

**It is derived at the query, not staged into `scene.brokenRefs`** — `#stage` re-derives that field only for the assemblies it rebuilds, so a staged entry goes stale on every element the next partial rebuild does not touch. `RISK: additive`. Body `handoff/zayd/2026-08-15-T-007-dangling-design-option-ref.md`. **REVIEW: `hmdnah`, PR #22 — APPROVED and MERGED**; item 1 re-executed twice, one contract-doc fix on the branch, no defect in the code.


### T-007 — review: the derivation is right, and domain rule 3's text had not been widened to admit it — 2026-08-15 — seat: hmdnah

**The new broken reference is not retargetable by any verb**, which rule 3's own D74 note forbids — it survives that test only because it is derived and never stored, so deriving at the query is load-bearing for rule 3, not a shortcut. `RISK: additive`. Body `handoff/hmdnah/2026-08-15-T-007-review.md`. **REVIEW: this IS the review turn**; the verdict is on the entry above.


### T-004 — review: the flatness result holds, and the harness passed while building nothing — 2026-08-15 — seat: hmdnah

The verdict stands — flat across 39–273 elements, ~7 min at 10 000 — but two claims under it did not. **The harness could not tell a cold load that built the whole building from one that built nothing:** `geometryOf(id)?.state` is `undefined` for an element never built, and `brokenRefs()` returns a stored scene field rather than a re-derivation, so both passed on an empty measurement. `RISK: additive`. Body `handoff/hmdnah/2026-08-15-T-004-review.md`. **REVIEW: this IS the review turn**; the verdict is on the entry below.


### T-004 — per-element build cost is flat from 39 to 273 elements, and 10,000 projects to 7.2 min — 2026-08-15 — seat: zayd

Per-element build cost **is** flat across 39–273 elements (ordinary least squares over four sizes, R² ≥ 0.9988). **Two estimators were needed, not one** — a least-squares line has a slope whether or not the data is a line, so the flatness verdict is read off the local finite differences. `RISK: additive`. Body `handoff/zayd/2026-08-15-T-004-build-cost-flatness.md`. **REVIEW: `hmdnah`, PR #20 — APPROVED and MERGED**, two defects fixed on the branch.


### STEWARD-scaffolding — the five-seat scaffolding, finished — 2026-08-15 — seat: brahim

The five-seat scaffolding, finished. **Branch protection is unavailable on this repository** — `403 Upgrade to GitHub Pro or make this repository public` on both the protection and rulesets APIs with an ADMIN token; Q13's account objection is satisfied and a plan objection replaced it (⇒ D87). `RISK: additive`. Body `handoff/brahim/2026-08-15-STEWARD-scaffolding-ci-labels-backlog.md`. **REVIEW: reviewed and merged** (`STEWARD:` PR); see the body and `docs/decisions.md` D87.


### T-005 — D66 §3c: DECLARE was never available to an enumerating aggregate, so all four FORCE — 2026-08-22 — seat: zayd

**The choice was not a choice — DECLARE was never available to an enumerating aggregate.** A declaration can only name what it can see, and a deferred parent's D59 children are not enumerated at all (an unbuilt curtain wall yields 0 panel rows against a full document's 6), so all four aggregates FORCE. `RISK: additive`. Body `handoff/zayd/2026-08-22-T-005-force-on-measure.md`. **REVIEW: ✅ APPROVED and MERGED** by `hmdnah` (PR #40); two of five reverts re-executed independently. One completeness gap filed as `open_rulings.md` Q23.


### T-022 — review (step 1, mechanical): the revert reproduces, and 949 of 951 tests pass on the defective glue — 2026-08-21 — seat: hmdnah

Three findings, none blocking, none code. **F1 — the suite's 951 green is not evidence for this fix**: with the pre-patch glue in the tree, 2 failed | 949 passed, and all 40 goldens pass on the defective glue. `RISK: additive`. Body `handoff/hmdnah/2026-08-21-T-022-review-step1.md`. **REVIEW: step 1 of 2 — NOT approved, NOT merged**; row stays `review`, report on PR #39.


### T-022 — review (step 2, adversarial): the pin re-linked here byte-for-byte, and the branch's own new gate entry had no test — 2026-08-21 — seat: hmdnah

**F4 — the branch's own new rule had no enforcement, and it is FIXED here**: `postlink.mjs` joined `GEOMETRY_PATHS` correctly, but `tests/reseed-gate.test.ts`, the file that exists to pin that list, was not touched. `RISK: additive`. Body `handoff/hmdnah/2026-08-21-T-022-review-step2.md`. **REVIEW: step 2 of 2 — APPROVED and MERGED** by `hmdnah`; report on PR #39.


### Rotated out of §7 on 2026-09-05 — carried in full

### T-003 — review: the screen renders, byte-identical, console-error-free — re-executed in the real browser — 2026-08-31 — seat: khalihlna

- **CHANGED:** nothing on the branch beyond this review's own record —
  `handoff/khalihlna/2026-08-31-T-003-review.md` NEW; this abstract; the build entry's `REVIEW:` line
  below.
- **VERIFIED:** Item 1, both halves, re-executed here. **Headless:** stubbed `licenseTexts.ts`'s
  `NOTICE_TEXT` export ⇒ `licenseTexts.test.ts` **1 failed | 2 passed (3)**,
  `expected 'REVERT-VERIFICATION STUB…' to be '…the real NOTICE text'`; restored ⇒ **3 passed (3)**,
  `git status` clean. **Browser, for real (this seat carries no `unverified here:` exception):**
  `playwright-core` installed into a scratch dir, real dev server (`vite --port 5300`, bound on `[::1]`
  not `127.0.0.1` — worth carrying forward), `BUNYAN_BROWSER_CMD`'s Chromium. Booted the app, waited for
  `Kernel:` (real OCCT boot), clicked "Licences": dialog renders the `NOTICE` heading + full text
  (mentions OCCT), all 10 `.license-section` headings present and byte-identical in name to
  `ls licenses/` on disk, console errors identical before/after (the one pre-existing 404, no new one),
  Close dismisses it. `pnpm verify` re-run in full, locally — **exit 0, 100 files / 987 tests**,
  `docs:check` **8 files / 166 tests** — matches the build entry's quoted figures exactly.
- **FOUND:** nothing red. Cross-checked the build entry's claim that PR #45 (T-002) was
  "APPROVED and MERGED by khalihlna on Davidian-Abdo" against `gh pr view 45` — `MERGED`,
  `mergedBy: Davidian-Abdo`, real. The "8 files" vs working-tree "9 files" figures reconcile: `fe9f5db`
  (code+docs, 8 files) vs `9d81ab7` (`agent-finish.mjs`'s own status-flip commit) — no discrepancy.
- **OWES:** nothing new to a `pc` seat — every claim here, browser included, is executed on this exact
  machine. `brahim`/`zayd` — `BUNYAN_PNPM_CMD` documentation, but that landed on `main` directly
  (`af8613f`) ahead of this review, so already discharged.
- **RISK:** additive — confirmed independently: `tests/freeze-boundary.test.ts` 19/19 green,
  CI's `PR shape · reserved classes` SUCCESS with zero labels, no `needs-operator/*`.
- **FULL:** `handoff/khalihlna/2026-08-31-T-003-review.md`
- **REVIEW:** n/a — this IS the review turn. **APPROVED and MERGED** by `khalihlna` on `Davidian-Abdo`
  (PR #46, merge commit `ec21a92`).

### T-003 — the in-app open-source licences screen — 2026-08-31 — seat: amer

- **CHANGED:** `apps/web/src/ui/LicensesScreen.tsx` NEW — a modal (`Ribbon`'s `CommandDialog` shape),
  reachable from a new "Licences" header button in `App.tsx`. Renders `NOTICE` in full, then every
  `licenses/*.txt`, none summarised. `apps/web/src/ui/licenseTexts.ts` NEW — sources both via Vite's
  `?raw` import and `import.meta.glob` directly off the repo-root `NOTICE`/`licenses/` files, so nothing
  here is hand-copied or can drift from what `tests/notice-attribution.test.ts` already keeps honest.
  3 new headless tests (`licenseTexts.test.ts`): byte-identical to the on-disk `NOTICE`, exactly the
  on-disk `licenses/` set (none missing/stale/extra), and a non-vacuous-glob guard.
- **VERIFIED:** `pnpm verify` exit 0 — 100 files / 987 tests green, docs:check 8 files / 166 tests green,
  `freeze-boundary` 19/19 (no `SnapKind`/contract surface touched — this is UI only). Browser-verified for
  real (Playwright driving `BUNYAN_BROWSER_CMD`'s Chromium against the dev server on port 5300): booted
  the app, clicked "Licences", confirmed the dialog renders the `NOTICE` heading, both OCCT license texts
  (`OCCT_LGPL_EXCEPTION.txt`, `OCCT-LICENSE_LGPL_21.txt`) and all 10 `licenses/*.txt` files present on
  disk. Console errors identical before/after opening the screen — one pre-existing `Failed to load
  resource: 404` already documented branch-unrelated in T-002's own review; no new error.
- **FOUND:** ⚠ **`BUNYAN_PNPM_CMD` recurred a third time** (T-001 Entry 2026-08-28 first documented it,
  never fixed in `Amer_Prompt.md`/`RUNBOOK.md` as that entry's own OWES asked). This turn's
  `agent-finish.mjs` failed step 1 outright (`execFileSync('pnpm', …)` with no shell ENOENTs on this
  machine's shebang-only `pnpm`) until set to T-021's documented value. **Consequence, not just
  recurrence:** `khalihlna`'s T-002 review turn hit the identical gap, merged PR #45 on GitHub, then could
  not complete its own `agent-finish.mjs --review` — leaving T-002's `REVIEW:` line stale until corrected
  above.
- **OWES:** **`brahim`/`zayd`** — add `BUNYAN_PNPM_CMD` to `Amer_Prompt.md`/`Khalihlna_Prompt.md`/
  `docs/RUNBOOK.md` for real this time; a third recurrence is the cost of the second one's OWES going
  unactioned. `CLA.md` untouched — Q11/Q12 remain owner-only.
- **RISK:** additive — no contract surface, no `SnapKind`, no frozen byte moved.
- **FULL:** `handoff/amer/2026-08-31-T-003-in-app-licences-screen.md`
- **REVIEW:** **APPROVED and MERGED** by `khalihlna` on `Davidian-Abdo` (PR #46, 2026-08-31) —
  `RISK: additive`, green CI, no `needs-operator/*`. Item 1 re-executed, both halves, in the review's own
  session — see the review's own abstract above.

### T-002 — the two-candidate-line intersection snap — 2026-08-31 — seat: amer

- **CHANGED:** `apps/web/src/tool/align.ts` gained `lineIntersections`/`lineIntersectionCandidates` (+
  internal `closestPointsBetweenLines`) — the third P4.5 §4.3 derived snap kind, `'intersection'`, built
  from pairs of `referenceEdges` lines, not clamped to either segment, guarded against zero-length,
  near-parallel (`minAngleDeg`) and genuinely-skew (`maxGapMm`) pairs. Wired into
  `apps/web/src/render/Viewport.ts` (`intersectionsAt`, gathered around the cursor, no anchor needed) and
  `apps/web/src/render/ViewportCanvas.tsx`'s pointer-move pipeline. 12 new tests in
  `apps/web/src/tool/align.test.ts`. `handoff/amer/2026-08-31-T-002-two-candidate-line-intersection-snap.md`
  NEW; this abstract.
- **VERIFIED:** `pnpm verify` **exit 0** — 99 files / 984 tests green (385.99s), `docs:check` 8 files / 166
  tests green (92.21s), `tests/freeze-boundary.test.ts` 19/19 (no frozen byte moved — `'intersection'` was
  already a declared `SnapKind`). **Browser-verified for real** (real OCCT kernel, real tessellated mesh,
  real pointer events, `playwright-core` driving `BUNYAN_BROWSER_CMD`'s own Chromium against the dev
  server on port 5300, outside Windows' excluded 5121–5220 range): seeded two walls whose centrelines
  cross, extended, at a world point that is ALSO an exact grid point — a real, present, lower-ranked
  competitor at the identical pixel. ON: `kind: 'intersection'`. OFF (`intersectionsAt` stubbed to `[]`,
  T-001's own verification pattern): the same pixel resolves `kind: 'grid'` instead — confirming Q3's
  ranked order, not geometry, decides. Re-confirmed after `git stash`/`git stash pop` restored the code,
  byte-identical diff before and after.
- **FOUND:** one `Failed to load resource: 404` on every boot — reproduced identically on clean `main`
  (`git stash`), URL never surfaced through Playwright's page-level network events (almost certainly a
  kernel-Worker request, which those events don't observe). Pre-existing, branch-unrelated; not chased.
- **OWES:** nothing new. P4.5 §4.3's Tier-1 candidate set now has a producer for every declared `SnapKind`
  except `'vertex'`, which the design itself defers until the kernel exports vertices.
- **RISK:** additive — no `SnapKind`/contract surface added, only a producer for an already-declared one.
- **FULL:** `handoff/amer/2026-08-31-T-002-two-candidate-line-intersection-snap.md`
- **REVIEW:** **APPROVED and MERGED** by `khalihlna` on `Davidian-Abdo` (PR #45, 2026-08-31) —
  `RISK: additive`, green CI, no `needs-operator/*`. Item 1 re-executed with a fresh Playwright driver:
  revert → `kind: 'grid'`, restore → `kind: 'intersection'` at `[1947.5, 1052.5, 0]`, twice. ⚠ This line
  was stale (still carried the pending-review marker) because the reviewing session merged on GitHub but
  never completed its own `agent-finish.mjs --review` run — corrected here, from the review's own PR
  comment, rather than backfilled as a separate dated entry (invariant 10). Root cause likely the same
  `BUNYAN_PNPM_CMD` gap this turn (T-003) also hit and documents below.

### STEWARD-blf-open-alignment — review: the re-seed gate's trailer had no bypass for a zero-golden diff, and CI proved it — 2026-08-31 — seat: khalihlna

- **CHANGED:** reverted the SPDX header on the 14 files `scripts/reseed-paths.mjs`'s `GEOMETRY_PATHS`
  watches (verified zero diff vs `main` for each); prettier fix for `docs/BACKLOG.md`; a `docs/
  BACKLOG.md` Discovered entry; this abstract; `handoff/khalihlna/2026-08-31-STEWARD-blf-open-alignment-review.md`
  NEW.
- **VERIFIED:** item 1 re-executed — reverted `NOTICE`'s brand block, confirmed
  `tests/notice-attribution.test.ts` unaffected either way, restored. The load-bearing finding: CI run
  `33335482669` was genuinely RED (`re-seed gate FAILED`, naming exactly the 14 files above); CI run
  `33376138958` (after this turn's fix, commit `0016690`) is GREEN, both jobs, `10m16s` main job.
  `pnpm verify` run twice locally, 974/974 both times.
- **FOUND:** `check-reseed.mjs`'s `Re-seed-unchanged:` trailer is only read in its SECOND failure
  branch (a golden touched but its payload unchanged) — the FIRST branch
  (`touchedGoldens.length === 0`) exits before ever reading a trailer, so a comment-only header on a
  watched path has no sanctioned way to pass short of actually re-seeding. `gh auth status` on this
  pc reports `narutousomaki741` active, not `Davidian-Abdo` as `RUNBOOK.md`'s table states — worked
  around via `GH_TOKEN=$(gh auth token --user Davidian-Abdo)` (D87 forbids `gh auth switch`), not
  fixed. A seat-identity slip mid-review — this PR's `brahim/…` branch prefix mechanically routes to
  `hmdnah` (box), corrected by the owner to `khalihlna` (this session ran on pc); the `hmdnah` attempt
  took no write action before stopping.
- **OWES:** `zayd` — the 14 excluded files still need SPDX headers, alongside a real re-seed on the
  pinned native-OCCT environment. `brahim` — the re-seed-gate trailer gap (Discovered, 2026-08-30) and
  the `RUNBOOK.md`/`gh auth status` discrepancy both want a look.
- **RISK:** additive — `tests/freeze-boundary.test.ts` green (19/19) every run, no `needs-operator/*`.
- **FULL:** `handoff/khalihlna/2026-08-31-STEWARD-blf-open-alignment-review.md`
- **REVIEW:** step of one (D88 does not apply — `risk: normal`) — **APPROVED and MERGED** by
  `khalihlna` on `Davidian-Abdo`, PR #44.

### STEWARD-blf-open-alignment — Bunyan is formally BLF-Open; SPDX/NOTICE/TRADEMARKS/CONTRIBUTING aligned, no licence text changed — 2026-08-30 — seat: brahim

- **CHANGED:** SPDX headers added to 202 of 216 tracked source files (`SPDX-FileCopyrightText: 2026
  Beamstack <https://beam-stack.com>` + `SPDX-License-Identifier: AGPL-3.0-only`), mechanical, then
  `prettier --write .` (no further changes — already matched house style). The remaining 14 —
  `scripts/reseed-paths.mjs`'s `GEOMETRY_PATHS` exactly — excluded this pass (`khalihlna` review
  finding, `docs/decisions.md` D90). `NOTICE` gained a
  Beamstack copyright/brand block at its head; every existing OCCT/planegcs/MIT section below
  untouched. `TRADEMARKS.md`, `CONTRIBUTING.md`, `README.md` NEW. `CLA.md` gained one cross-reference
  note; substance unchanged. `docs/decisions.md` D90; this abstract.
  `handoff/brahim/2026-08-30-STEWARD-blf-open-alignment.md` NEW.
- **VERIFIED:** `pnpm verify` — see this turn's commit for the run this abstract was written against.
  `tests/notice-attribution.test.ts` reads `NOTICE` for dependency names present, not a fixed
  structure — unaffected by the added header block.
- **FOUND:** the owner's own Beamstack License Framework (BLF-D2/BLF-D6, decided the same day)
  independently reaches the conclusion this turn's research already had: BCL is explicitly not OSI
  open source, and Bunyan's D15 makes that label the point, so Bunyan is BLF-Open — AGPL-3.0-only,
  unmodified — never BLF-Community.
- **OWES:** nothing new — `T-003` (the in-app licences screen) stays `ready`, unaffected; incorporation
  remains the trigger for `CLA.md`'s `<LEGAL ENTITY>` fill-in and `open_rulings.md` Q11/Q12, both
  untouched this turn per the owner's explicit instruction.
- **RISK:** additive — no `packages/` source touched beyond header comments; `LICENSE` and every
  manifest's `license` field were already `AGPL-3.0-only` and needed no edit.
- **FULL:** `handoff/brahim/2026-08-30-STEWARD-blf-open-alignment.md`
- **REVIEW:** **APPROVED and MERGED** by `khalihlna` on `Davidian-Abdo` (PR #44, 2026-08-31) — one
  fix commit landed first (the re-seed-gate finding above); see the review's own abstract above.

### T-001 — review: the browser claim was inherited, not re-executed, until now — 2026-08-30 — seat: khalihlna

- **CHANGED:** nothing on the branch — this review's finding was a gap in verification, not in code.
  `handoff/khalihlna/2026-08-30-T-001-review.md` NEW; this abstract; the build entry's `REVIEW:` line
  below, and T-021's (a missed record from this seat's prior turn).
- **VERIFIED:** Item 1, re-executed for real. No browser-driving tool was preinstalled in this session;
  installed `playwright-core` into a scratch dir, launched the dev server (Windows reserves TCP
  5121–5220, `netsh interface ipv4 show excludedportrange`, so port 5999), computed the exact camera
  projection from `Viewport.ts`'s hardcoded params (no `three` dependency needed), and replayed the
  perpendicular-foot gesture against the real demo scene. RED (feature reverted via `git checkout main
  --`): committed wall `end.y≈0` — the coincident `'extension'` guide, the only mechanism left. GREEN
  (restored, run twice): `end.y=52.5` both times, byte-identical — a real, edge-derived value no guide
  mechanism can produce, decisive because `SNAP_PRIORITY` ranks `perpendicular` strictly above
  `extension`. Full method in the handoff body.
- **FOUND:** `pnpm verify`'s first run hit a confirmed flake (`agent-start.test.ts`'s clone-resume case,
  30000ms timeout under full-suite contention, 14.3s clean alone) — the documented class
  `vitest.config.ts` already names for this file, not a regression. Second run: 974/974 clean.
- **OWES:** `brahim` — T-021's own review (PR #42) never got a `khalihlna` §7 abstract/handoff body;
  missed at the time, not backfilled with a fabricated date (invariant 10), its stale `REVIEW: pending`
  line corrected below instead.
- **RISK:** additive — confirmed via `pnpm state`, `tests/freeze-boundary.test.ts` green (19/19), no
  `needs-operator/*` label.
- **FULL:** `handoff/khalihlna/2026-08-30-T-001-review.md`
- **REVIEW:** step of one (D88 does not apply — `risk: normal`) — **APPROVED and MERGED** by `khalihlna`
  on `Davidian-Abdo`, PR #43.

### T-001 — the perpendicular-foot snap candidate — 2026-08-28 — seat: amer

- **CHANGED:** nothing new this turn beyond the merge itself — the feature (`apps/web/src/tool/align.ts`'s
  `referenceEdges`/`perpendicularFeet`/`perpendicularCandidates`, wired into `Viewport.ts`/
  `ViewportCanvas.tsx`) was built and browser-verified in the 2026-08-17 session (`415b1c7`), which could
  not close because 5 `tests/protocol/*.test.ts` files failed to collect on this Windows pc. **Merged
  `origin/main` into this branch** (`5e1afbf`) to pick up T-020/T-021's fix for exactly that (PR #42): one
  conflict, in `docs/CURRENT_STATE.md §0b`'s claim baton — resolved keeping HEAD's own live T-001 claim over
  `main`'s stale, already-closed T-021 baton. `handoff/amer/2026-08-28-T-001-perpendicular-foot-snap-candidate.md`
  NEW; this abstract.
- **VERIFIED:** `pnpm verify` **exit 0** on this pc, post-merge — typecheck/lint/format:check green, full
  **99 files / 974 tests** green (343.91s), `reseed:check` skipped (not a PR), `docs:check` (8 files/166
  tests) green (166.85s). `tests/freeze-boundary.test.ts` stayed green inside the run (19/19). Browser
  verification unchanged from the 2026-08-17 session (real OCCT kernel, real pointer events, Playwright
  against Chromium 148) — not re-run this turn, no browser-affecting code changed.
- **FOUND:** T-021's own `pnpm verify` fix (`seats.pnpmSpawn`, honoring `BUNYAN_PNPM_CMD`) still ENOENTs
  from `agent-finish.mjs` on this pc unless `BUNYAN_PNPM_CMD` is set for the session — this machine's only
  bare `pnpm` on `PATH` is a POSIX shebang script, unusable by `execFileSync` with no shell. Set it to
  T-021's own documented value (`["C:/Program Files/nodejs/node.exe", ".../corepack/dist/pnpm.js"]`); no
  code defect, a session-environment gap. Also saw `tests/protocol/agent-start.test.ts` and
  `seats.test.ts` each drop one test to a 30000ms timeout on a standalone `docs:check` run — both passed
  clean (166/166) on an immediate rerun and inside the full `verify` run: real subprocess latency under
  full-suite contention, exactly as `vitest.config.ts`'s own header already documents, not a regression.
- **OWES:** `brahim`/`zayd` — `agent-finish.mjs` needs `BUNYAN_PNPM_CMD` set by hand on this pc; worth a
  line in `Amer_Prompt.md` or `docs/RUNBOOK.md` so a fresh session doesn't rediscover it. Not fixed here
  per invariant 10, only recorded. Nothing owed to `khalihlna` beyond the standing PR review — every claim
  is executed and measured on this exact machine, no `unverified here:` marker.
- **RISK:** additive — `SnapKind` already declared `'perpendicular'`, so no frozen byte moved;
  `tests/freeze-boundary.test.ts` green (19/19).
- **FULL:** `handoff/amer/2026-08-28-T-001-perpendicular-foot-snap-candidate.md`
- **REVIEW:** **APPROVED and MERGED** by `khalihlna` on `Davidian-Abdo` (PR #43, 2026-08-30) —
  `RISK: additive`, green CI, no `needs-operator/*`. Item 1 re-executed with a Playwright driver built
  for this turn — see the review's own abstract above.

### T-021 — `pnpm verify` reaches green on the pc, confirmed there — 2026-08-24 — seat: amer

- **CHANGED:** `tests/protocol/agent-start.test.ts` — the "an UNRESOLVABLE identity" test's `gh`-less
  PATH fixture symlinked a bare `node` (no extension); Windows PATH/PATHEXT search never matches an
  extension-less name even though the symlink is created successfully (direct repro), the same fact
  the file's header already documents for the `gh` stand-in — target renamed `node.exe` on `win32`.
  `vitest.config.ts` — `testTimeout: 30000`, `pool: 'forks'`, `maxWorkers: 2` (vitest 4 top-level;
  `poolOptions.forks.maxForks` is a DEPRECATED no-op under 4.1.10). ⚠ **Second defect, found only by
  actually running `agent-finish.mjs`:** its `execFileSync('pnpm', ['verify'], …)` cannot spawn `pnpm`
  on a machine whose only install is a `.cmd` shim — the identical `ghSpawn` class (`9a046e5`), one
  call site over. `scripts/seats.mjs` — **`pnpmSpawn` NEW**, mirroring `ghSpawn`, honoring
  `BUNYAN_PNPM_CMD` (plain path or `[nodeExePath, scriptPath]`); `scripts/seats.d.mts` gets its
  signature (the first named import of a spawn helper from a `.ts` file — `ghSpawn` never needed one);
  three unit tests in `tests/protocol/seats.test.ts`. `agent-finish.mjs`'s verify step now calls it.
  `handoff/amer/2026-08-24-T-021-pnpm-verify-green-on-pc.md` NEW; this abstract. No `packages/`, no
  `WATCHED` byte.
- **VERIFIED:** `pnpm verify` **exit 0** on this pc — typecheck/lint/format:check green, full **99
  files / 959 tests** green, `reseed:check` skipped (not a PR), `docs:check` (8 files/163 tests)
  green. The five `tests/protocol/*.test.ts` files collect and pass standalone (113 tests) and inside
  the full run. Measured before/after: default config left **18/33** of `agent-start.test.ts` alone
  timing out (real subprocess latency — no other file was running, so not cross-file contention);
  `--pool=forks --maxWorkers=2` alone (still 5000ms) matches the prior session's **4/33**; adding
  `testTimeout: 30000` reached **0/33**, twice.
- **FOUND:** ⚠ **T-021's `done-when:` revert-verification bullet, inherited from T-020, names the
  wrong target.** *"Restoring `^2.1.8` reproduces the `SyntaxError`"* does **not** hold: reverting only
  the vitest pin (shebang/gh-spawn fixes `2a79036`/`9a046e5` still in place) relinked to `2.1.9` and
  all 121 `tests/protocol` tests still passed — the vitest major was never the fix (2026-08-23 entry).
  What DOES reproduce it: reintroducing the shebang into `agent-start.mjs` on `2.1.9` — 1 file failed
  at collection, exit 1, identical error. Reverted immediately; pin restored to `^4.1.10`/`4.1.10`
  (`--frozen-lockfile`, confirmed via `npx vitest --version`) before the VERIFIED run. A spec defect in
  the task's own prose (`AGENTS.md §3`), recorded here rather than reworded into the published task
  text (invariant 10).
- **OWES:** `brahim` — T-021's revert-verification bullet still names the falsified target; not fixed
  here. Nothing owed to `khalihlna` — every claim was executed and measured on this exact machine.
- **RISK:** additive — none of the changed files is `WATCHED`, `tests/freeze-boundary.test.ts` stayed
  green (19/19) inside the full verify run, no `needs-operator/*`.
- **FULL:** `handoff/amer/2026-08-24-T-021-pnpm-verify-green-on-pc.md`
- **REVIEW:** **APPROVED and MERGED** by `khalihlna` on `Davidian-Abdo` (PR #42, 2026-08-28) —
  `RISK: additive`, green CI. ⚠ This turn never wrote its own §7 abstract/handoff body — corrected in
  T-001's review entry's `OWES:` field (2026-08-30) rather than backfilled here with a fabricated date.

