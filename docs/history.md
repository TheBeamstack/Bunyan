# Bunyan — `history.md`

**What this file is.** The **complete entry registry** — every session this project has ever had, one
summarized entry each, oldest first. It is the long tail of `current_state.md`'s handoff log: that file
keeps only the **newest 15 entries in full**, and everything older lives here, compressed to what a future
agent could still need.

**Why it exists.** `current_state.md` is read **in full, every session, by every agent** — it is the one
document the whole loop depends on, so its length is a real cost paid on every run. But an entry's value
does not go to zero when it scrolls off: it records _why_ a decision was taken, _what was measured_, and
_which trap was already paid for_. Deleting them would re-open the failure this project has hit repeatedly
(§1c-7: re-deriving something already settled, or re-doing work already done). So they are **compressed,
not discarded.**

**When to read it.** ⚠ **If you are stuck, or you lack a piece of context that `current_state.md` does not
give you — look here.** Specifically:

- _"Why is this shaped this way?"_ — the entry that shaped it is here, with its measurement.
- _"Has this been tried?"_ — the ✅ CLOSED list in `current_state.md` §5 is binding, and this file is where
  the closed item's reasoning lives.
- _"What did that D-number actually cost to learn?"_ — `current_state.md` §4a has the ruling; this file has
  the session that earned it.
- _"Where did this trap come from?"_ — §1b/§1c name the traps; this file names the entry that paid for them.

⚠ **This file is a POINTER, not the source.** The durable lessons of every entry here were promoted into
`current_state.md` §1–§5 (the method, the traps, the contract status, the decisions, the CLOSED list) —
that promotion is what makes compressing them safe. **The full, uncompressed narrative of every entry is in
git history**, on the commit that wrote it (`git log --follow current_state.md`).

---

## THE ROTATION RULE (binding — this is how the two files stay in balance)

**§7's own budget is the current authority — a BYTE budget, not a count** (`current_state.md` §7's own
header; `BUDGET.maxAbstracts` in `scripts/docs-state.mjs` caps the count side at 10). The "more than 20,
keep 15" numbers this section used to state were superseded when the budget became byte-based and were
never updated here — fixed in place rather than left disagreeing with the file that actually governs it.

**Whenever `current_state.md` §7 is at or over its budget, the agent that notices it compacts:**

1. Keep the newest abstracts §7's budget allows, in full.
2. **Summarize each older entry into this file**, appended in order, keeping: its id (a legacy number, or
   its `T-nnn`/`STEWARD-slug` identity post-D82), date, agent, headline, the measured numbers, the
   decisions it took (with D-numbers), and anything a future agent would otherwise re-derive. Drop only
   the session bookkeeping (verify counts, box notes, commit hashes).
3. Before dropping an entry, **check its durable lessons are already in `current_state.md` §1–§5.** If one
   is not, promote it there first — _the summary here is a pointer, and §1–§5 is where a rule actually
   binds._
4. Leave `current_state.md`'s pointer to this file intact.

_The compaction is maintenance, not work: it does not get an entry of its own._

---

## §A — Entries 1–32 (the original archive: one line each)

These were compressed first (their durable lessons are in `current_state.md` §1–§4, which is where a fresh
agent actually reads them).

| #   | Date     | What happened / the durable lesson (now in `current_state.md` §1–§4)                                                                                                                             |
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

Compressed 2026-07-30 under the rotation rule. All are Zayd's unless marked.

### Entry 33 — 07-16 — **D50 step 0a: the rebuild invalidator becomes a TYPED DEPENDENCY GRAPH.**

`#touched()` was three hard-coded cases and **already wrong for a fourth**: `build.ts` reads
`elevationOf(element.containerId)` but the invalidator did not handle `containers` at all ⇒ the moment
`updateContainer` landed, every wall on a moved level would silently keep its old Z. Built
`dependency.ts` — `dependents(scene, change)` over a switch **exhaustive over `SceneCollection`**, so a new
collection is a **compile error until its edge is declared.** ⚠⚠ **That mechanism is load-bearing and still
fires** (Entries 68/69 both relied on it). Material/section declared an explicit "nothing". 224 green.

### Entry 34 — 07-16 — **D50 step 0b: the model becomes ASSOCIATIVE — design-first reshaped the contract.**

A reanalysis against 9 real Revit/ArchiCAD operations found two freeze-fatal gaps: **`offset` is mandatory**
(a parapet is top+1100, a footing is base−300), and **a constraint is not always `{one element, one string
target}`** ⇒ `Constraint` became a **discriminated union on `kind`** and `ConstraintTarget` a tagged union
(`level`/`grid` live, `element`/`ref` reserved) — the growth path every later member used (sketch 0d, join
0c). `scene.constraints` landed (`SCENE_SCHEMA_VERSION` 1→2, a v1 `.bnn` still loads); `element.gridRefs`
was REMOVED in favour of one mechanism. **Rebind a datum → the solid follows**, tested on the real kernel.

### Entry 35 — 07-17 — **D50 step 0e/0f: the model becomes EDITABLE, and D51's guard is finally BUILT.**

The registries were create-only (a density typo could not be fixed, a Level could not be moved), and D51's
rule had been _written but never enforced_ — `updateStyle` renamed a layer and silently orphaned every
opening hosted on it. Built the update/delete verbs, each passing `rebuilt: []` so the 0a/0b graph derives
the re-stage set. **The refuse-or-retarget guard (row ⓓ, the frozen part):** one shared `guardReferences`

- the two-arg shape **`acknowledge?`/`retargetMap?`** — RESTRICT by default with a typed `REFUSED` naming
  every reference it would break. ⚠ Entry 68 later found the first referrer that **cannot** be retargeted and
  made `redirect` optional. `move`/`setPlacement` deferred to P4.5 (still open as row ⓑ).

### Entry 36 — 07-17 — **Pre-freeze audit round 2 (the Revit-beating lens): six more rows, one a true foreclosure.**

⚠⚠ **ⓙ, verified in the build:** `build.ts` built a hosted element via `buildVoid` ONLY, so a Door/Window
was **a hole with no leaf, frame, sill or mullions** — freezing `BimObjectType` then would have made real
doors impossible. (Resolved Entry 44.) ⓚ–ⓝ (georeference, phasing as two datums, formula params, nesting)
became 0g reservations. No source changed — audit + handoff.

### Entry 37 — 07-17 — **D50 step 0g: the "reserve the shapes" pass + Space extent ruled (D55/D56).**

Design-first, owner-ruled in two rounds. Every reservation landed optional/additive with **no schema bump**:
vertex grammar · phasing as **two** datums · `relevantWhen?` · `formula?` · `ifcMapping?` · `migrateStyle?` ·
`georeference` · `parentElementId?` · `properties?` · `classifications?` · `mark?` · `Grid.geometry?` ·
**Space extent = Option B** (boundary DERIVED from bounding walls, never stored) + `Scene.roomSeparators`.
Hardened the hostile-`.bnn` guard for `constraints`/`roomSeparators` — the guard Entry 68 later extended to
optional collections. ⚠⚠ **D55 pulled a SECOND heavy solver into v1.0.0.**

### Entry 38 — 07-18 — **0g.2, the verb half (ⓣ): reserved metadata gains an authoring path.**

The nouns had no verb — six reserved `Element` fields could not be authored, and `Command.argsSchema`
freezes at step 6. They landed as **optional args on `createElement`** plus the new
**`core.setElementMetadata`**. ⚠⚠ **THE ⓣ LESSON, WHICH HAS BITTEN TWICE SINCE: a reserved field with no
authoring path forecloses being born with it** — row Ⓕ applied it pre-emptively to `refTo`, and Entry 68
applied it again for `'schedule'`.

### Entry 39 — 07-18 — **The HARD GATE closed: both v1.0.0 solvers priced, the cut confirmed, planegcs proven.**

D55 had pulled two solvers into scope **without a number**. Priced: **0d ~4–6 sessions** (de-risked to an
integration — `@salusoft89/planegcs`, FreeCAD's GCS in WASM, **proven headless on this box**, 497 KB,
LGPL-2.1) · **room-bounding ~5–8, the heavier, no drop-in.** ⚠ Neither touches a frozen contract ⇒ the risk
was ship-date, not freeze-correctness. **Owner ruled both ship, serial: 0d → room-bounding → types.** 0d
designed and signed off (sketch geometry on `params`, dedicated verbs, the full constraint set).

### Entry 40 — 07-18 — **0d BUILT: the sketch constraint solver ships (real planegcs, headless).**

`SketchConstraint` became the `Constraint` union's **second member**; the `Sketch` data model lives in
`element.params` (**no schema bump, no `.bnn` migration**). The **`SketchSolver` seam** keeps
`@bunyan/document` pure — the real solver is the separate `@bunyan/sketch-solver` package, injected like the
kernel client. End to end: a rough rectangle + 6 constraints **solves to an exact 3000×2000 and extrudes.**
⚠⚠ **D26 held and was revert-verified:** a dimensional re-solve moves geometry while `lateral.2` stays
**byte-identical**; permuting the segment array breaks naming (5 fails). Over-constrained refuses at build
time (D42); under-constrained solves (`dof > 0`) — CAD-normal, not an error. ⚠ `tangent`/arcs are in the
frozen CONTRACT but not in this adapter build — swappable behind the seam, no freeze risk.

### Entry 41 — 07-18 — **The room-bounding solver ships (D55) — and the estimate inverted again.**

Owner ruled: boundary = **inner finish face** · **document-layer 2D, pure TS** (no kernel op) · a
not-enclosed seed → `{enclosed:false}` with **area UNAVAILABLE, never 0** (D45) · prismatic volume.
⚠⚠ **Priced at 5–8 sessions; the body took ONE** (~380 lines) — the planar-arrangement + face-trace is
standard bounded 2D work, and both hard worries dissolved: the seed makes the finish face free, and
**openings do not leak rooms** (a door cuts the 3D wall, but the Level-plane FOOTPRINT stays continuous —
this resolved Freeze-Gate row ⓞ, revert-verified). `roomMetrics` is a **QUERY — never stored, never
cached.** **No frozen byte moved.** Revert-verified twice (force centreline → 4 fails; flip the turn rule
→ 7 fails). ⚠ **Recorded v1.0.x scope, so nobody re-derives it: curved-wall arc edges** (v1.0.0 walls are
straight), auto-seed when `location` is absent, room islands/holes, sloped-soffit volume, and column
footprints — v1.0.0 bounds with walls + separators (Revit's default set). All additive behind the seam.

### Entry 42 — 07-20 — **0c wall-to-wall joins ship — auto-miter, anti-fuse, the real Wall pulled forward. STEP 0 CLOSED.**

⚠ **Two owner rulings OVERRODE the recommendations** (recorded because a future agent will assume the
recommendation held): joins are **AUTOMATIC ON PROXIMITY**, not an explicit command; and **the real D52
Wall was pulled forward** into a new `@bunyan/types` package rather than a fixture. ⚠⚠ **THE ANTI-FUSE RULE
HELD, STRUCTURALLY AND BY GATE:** the wall builds as an extruded plan polygon in FIXED segment order, so a
join reshapes ONLY the cap segments and window-hosting side faces keep **byte-identical tokens**. The gate
— _a window on a joined wall survives, token-identical_ — is what proves a join is not a fuse. ⚠ Automatic
proximity is **D1-safe** because "do two ends meet?" is decided from the `{start,end}` PARAMS, never from a
built solid. `JoinConstraint` is the union's third member; a stored one is only an OVERRIDE.

### Entry 43 — 07-20 — **Pre-freeze review (`review_P5.md`) + the BIMsync reframe (D57).**

⚠ **Finding #1, the headline: _"step 0 closed" outran the artifacts_** — all of Entry 42 existed only in
the working tree, uncommitted. Resolved by committing. **#2** ⓙ verified still open (a door is a hole).
**#3** the wall-join resolver is **O(N²), measured, undocumented** — ~4.2 s of scan at ~2000 walls,
correcting the "it's all in the renderer" claim (retired in Entry 61). **#4** mid-span/T joins were
inexpressible (became D69). ⚠⚠ **D57, owner:** ⑥ was mis-filed as blocked on an off-box BIMsync spec —
**BIMsync is UNBUILT and its spec ADAPTS to Bunyan** ⇒ the Clean Delta is a design Bunyan owns, shaped for
Planitor + Miqdar. _Never wait on or infer from BIMsync._

### Entry 44 — 07-20 — **The pre-freeze gate closes: ⓙ resolved (a door builds a LEAF), ⑥ designed, #4/⑧/⑨ discharged.**

⚠⚠ **ⓙ, the one true foreclosure, fixed with the frozen-field proof owed by the review:** one new optional
method **`buildLeaf?(VoidBuildContext)`** — a hosted type provides BOTH the hole and the solid — proven by
`tsc` to need **no new `VoidBuildContext`/`BuiltPart`/`hostFace` field.** `buildLeaf`, not `buildGeometry`,
because a door is a solid only when hosted. Each part revert-verified against the real kernel.

### Entry 45 — 07-21 — **Pre-freeze gap-hunt: one real gap — a join silently MOVED a hosted door.**

Composing the two newest surfaces for the first time (the `buildLeaf` door + 0c joins): a centred door
**drifted 50 mm when a NEIGHBOUR wall arrived at the far corner**, with nobody touching the door or its
wall — `offsetU` was anchored to the host face's parametric centre, which an auto-mitre moves. ⚠ Entry 42's
anti-fuse gate never caught it: it checked the host TOKEN and void VOLUME, **not the door's POSITION**, and
drove the legacy fixture opening rather than the shipped one. ⚠ **Not a foreclosure** — the frozen
`VoidBuildContext` already carried the wall's baseline. Owner ruled **Revit's model**: `offsetU` measures
from the wall START along the baseline. Also swept and recorded as freeze-safe: mirror, raked/curved walls,
shafts, and **ⓑ/ⓘ** (no move verb exists; `transactionId` reserved-but-unused — both still open).

### Entry 46 — 07-21 — **STRATEGIC REVIEW ("will Bunyan beat Revit?") — THE FREEZE IS REOPENED. D58–D66.**

⚠⚠ **The headline, verified by build:** the shipped product was **two element types** on an exact kernel,
while the docs measured progress against the _freeze checklist_ and let that read as _≈Revit-competitive_.
**The freeze being ready is not the product being ready.** What is genuinely excellent and rare: the
exact-B-Rep + persistent-naming + parametric-recipe core, the agent-native command layer, the stable-PEI
substrate — _the hard part most challengers never finish._ The gaps: documentation (Revit's actual
product), worksharing, MEP, user families, DWG, the taxonomy, nesting, and 3 of 4 scale axes. Owner
validated **D58–D66**; six add pre-freeze work (rows Ⓐ–Ⓕ + D66) ⇒ **the freeze reopened.** This entry
also wrote `current_state.md` §0a and the parity ledger in the imp_plan.

### Entry 47 — 07-21 — **Row Ⓐ: the DOCUMENTATION ANCHORING contracts are reserved (D58).**

The invariant that makes reserve-now-build-later safe (**rule 17**): a drawing stores a DEFINITION — a cut
plane, an anchor set, a filter + columns — **never the projected geometry**, which is derived like a mesh.
Reserved as four **optional, absent-defaulted, TOP-LEVEL** collections (`views`/`annotations`/`schedules`/
`sheets`) plus `AnnotationAnchor`, `Annotation`, `ScheduleDefinition`, `ViewDescriptor`, `Sheet`. ⚠ §6
designed the future promotion to a full `SceneCollection` as additive — **Entry 68 executed it and found
one of its three predicted steps wrong.** ⚠⚠ **§7 settled the freeze question in advance: documentation
entities are NOT elements, so their CRUD is new commands = ordinary additive registry entries.** ⚠⚠ **And
this entry's own proof-of-concept evaluator became D78's cautionary tale** — a throwaway loop written to
prove a reservation, green for seven days because its fixture was two plain walls, and wrong on the model
in three ways.

### Entry 48 — 07-22 — **Row Ⓑ: element COMPOSITION / NESTING designed, ruled and BUILT (D59).**

Owner ruled **Model A — children are DERIVED, never stored** (`${parentId}:${slot}`), a tree, with the
override patch reserved. Built `buildChildren?` + `BuiltChild` + `ElementGeometry.children?` +
`Element.childOverrides?`, and the real **`core.curtainwall`** (genuinely depth-2: wall → columns → panels

- mullions) validates it. ⚠⚠ **THE FACT THAT HAS BITTEN FOUR TIMES SINCE: a generated child is NOT a scene
  row** — it is invisible to `scene.elements`, which broke enumeration (Entry 58), the style invalidator
  (D77), schedules (D78) and `mark` (D78 Q3).

### Entry 49 — 07-22 — **Row Ⓒ: the CO-AUTHORING concurrency/merge seam reserved (D60).**

Four optional additive fields — `UndoableEdit.origin?`/`lamport?`, `ModelRevision.frontier?`,
`Manifest.documentLineage?` — proven mergeable by a pure commutative `mergeOrdered()`. **No `scene.json`
touch, no schema bump, no verb, no backend.** The §1b method found 3 foreclosures the D44-ULID prose had
missed: the edit id is `seq`-derived, `issued_at_seq` is a scalar cut, and an un-issued `.bnn` has no
document identity. ⚠ **The `frontier` reservation later DEFENDED ITSELF** — D76's scalar-only guard was
refused by this entry's test, four days before the freeze.

### Entry 50 — 07-22 — **Row Ⓓ: the FAMILY-DEFINITION data-format seam reserved (D61).**

Owner overrode the recommendation: **a FULLY-SHAPED grammar now**, not an opaque envelope. `Scene.families?`

- a discriminated-union `FamilyDefinition` (params + box/extrude/revolve + chamfer/fillet + nesting +
  hosting; every scalar a `FamilyValue`; a `formatVersion`). ⚠ **The §1b finding, proven not assumed: a data
  family needs NO new `BimObjectType` field** — it is a `BimObjectType` a loader produces by closing over the
  definition. ⚠ Rule 8's later sweep (Entry 64) found this grammar has **no slot for `exposedRefs`** — still
  an owed owner ruling.

### Entry 51 — 07-23 — **Owner redirect: D64 is gated on building a proper MIQDAR spec first.**

Rows Ⓒ+Ⓓ committed and pushed. The owner ruled that the analytical-anchor question could not be answered
from Bunyan's side alone, and seeded a new `~/projects/Miqdar` project (spec + register + current_state +
decisions) to answer it from evidence. _The pattern worth keeping: a question about a second product is
answered by building that product's spec, not by guessing on its behalf._

### Entry 52 — 07-23 — **Row Ⓔ / D64 ruled FROM EVIDENCE: the PEI-bound side-graph suffices.**

The Miqdar spec's real-frame walk earned the answer: every idealization datum is either already readable
from the frozen contract or **many-valued per physical element** (cracked stiffness is gross _and_ 0.35EI
at once ⇒ not an element property, even in principle) ⇒ **reserve NOTHING analytical on the type/part**;
the anchor is `physicalBinding` on _Miqdar's_ entities, pointing in. **One exception, not an analytical
anchor: `Material.thermal?`** reserved for the energy north-star (M18), revert-verified.

### Entry 53 — 07-24 — **Row Ⓕ done (D62/63/65): three of six items needed NO reservation, and the one nobody billed is the row's real content.**

**Reserved:** `scene.systems?` + `Element.systemId?`/`connectors?` (MEP — ⚠ a connector is **authored
placement in the element's own build frame**, never a `SubShapeRef`, so the naming path is untouched);
`scene.designOptions?` + `Element.designOptionId?` + `ViewCommon.designOptionIds?`; three `createElement`
args + **`refTo` widened to `'system'`/`'designOption'`** (the ⓣ lesson applied before it could bite —
`argsSchema` freezes at the same step; Entry 68 followed this precedent for `'schedule'`). **Nothing owed:**
the MEP sweep op (additive under D13 — `faceFrame` is the precedent), the DWG seam (already exists as
`FormatCodec` — though Entry 60/D71 later found that seam had no _behaviour_), phase filters, area schemes.
⚠⚠ **THE ONE THING HARDER THAN BILLED — the design-option EXCLUSION INVARIANT:** a document with options
deliberately holds mutually-exclusive elements, so every aggregating consumer **must exclude non-active
options** or a schedule double-counts and work packages are published for a scheme nobody builds. Owner
ruled it **into the frozen contract** (`isElementActive`). ⚠ **It then went dirty three separate ways**
(D67 signature, D68 backward sweep, D78 the schedule body) — _the most-corrected single rule in the
project._

---

## §C — Entries 54–88 — the full bodies now live in `handoff/`

⚠ **There is no entry 78.** It was a REVIEW-ONLY session (PR #5) that wrote no abstract of
its own; its findings are in entry 77's `REVIEW:` line above. The gap is real, not a loss.

54–88 is contiguous.

### 88 | 2026-08-08 | Zayd | the habit three sessions kept performing by hand is a gate — and the hard part was the SKIP

- **CHANGED:** **`scripts/prompt-sync.mjs` + `.d.mts` NEW** (the gate: three git questions, no network) ·
  **`tests/prompt-sync.test.ts` NEW (+12)** · `package.json` (`docs:check` runs it — gate six is now three
  files) · `.github/workflows/ci.yml` (`BASE_REF` on the docs step, the same sha the re-seed gate reads) ·
  `eslint.config.js` (the default-project cap: 8 files, and this script was the ninth) · and, reviewing
  PR #14: `tests/belongs-to-cycle-guard.test.ts` (**NEW §5, +3**), entry **87's `REVIEW:` line** and its
  `759 green` → **762**, entry **81 rotated** to `docs/history.md` §C (§C now 54–81).
- **VERIFIED:** **776 green** across 88 files, all six gates, **real exit code 0**. Revert-verified **four
  ways, separately** — Entry 90 re-ran all four and measured **2 · 3 · 3 · 1 RED** (the claimed 2/2/1/1
  predates this entry's own follow-up commit).
- **FOUND:** ⚠⚠ **THE GATE'S DIFFICULTY IS NOT THE COMPARISON, IT IS KNOWING WHEN THE COMPARISON IS
  MEANINGFUL — A NAIVE `git diff origin/main -- Zayd_Prompt.md` IS WRONG IN THREE OF THE FOUR STATES THIS
  REPO HAS BEEN IN.** TASK asked *"the whole file, or only FRESH?"* — **neither: no region of the file is
  always equal.** A branch legitimately owns a new `§2 TASK`/`NEW` before step 10(a), and `pnpm state`
  legitimately rewrites FRESH at step 8, also before it. **The invariant is a MOMENT, not a region.** ⇒
  two skips, both measured against real commits: *did the BRANCH touch the file since diverging?* (spares
  Amer) and *did MAIN?* — ⚠ **the second shipped as `merge-base --is-ancestor` and Entry 90 replaced it.**
  ⚠ **Q2 (can `docs:check` see `origin/main`?) is SIDESTEPPED** — CI reads the base SHA it already passes
  the re-seed gate. (`origin/main` does exist in CI; measured after the fact. `git show` costs 1.85 ms.)
  ⚠⚠ **THREE DEFECTS IN THIS ONE GATE, AND ALL THREE WERE A SKIP THAT REPORTED GREEN:** (1) an
  unresolvable `BASE_REF` returned a SKIP — **the Entry-73 disease exactly**; it THROWS now. (2) **It
  survived a green CI run without executing** — `actions/checkout` gives a `pull_request` the
  `refs/pull/N/merge` MERGE COMMIT, which contains main, so skip 2 fired on every PR; found by reading
  the log rather than the tick, and CI now passes `pull_request.head.sha`. (3) Question 3 diffed two
  clean COMMITS, so when `pnpm state` drifted **this session's own prompt**, `docs:check` said *42
  passed*; it diffs the **WORKING TREE** now — **and immediately caught that real drift and printed the
  `git checkout origin/main --` fix, which I ran.** ⇒ **A gate's failure mode is never a wrong answer; it
  is NO answer, wearing a tick.** ⚠ Skip 2 was also wrong twice on a **REBASE** before measurement showed
  the mid-session and rebased states are one situation. ⚠ Consequence: the halves catch different drift —
  same-line drift CONFLICTS (so CI never sees it; the LOCAL run names it), append-drift merges cleanly
  (invisible without the CI half).
- **OWES:** Owner: **nothing new** — `RISK: additive`, so the next session merges this. **Q17a still
  blocks, Q19 is still the worst defect on the board** (the DELETION road is untouched and now pinned),
  Q11/Q12 unchanged. Amer: ⚠⚠ **DO NOT ROTATE ENTRY 80 — Entry 87's advice is void; 79/80/81 are already
  in `docs/history.md`. ROTATE ENTRY 82 INSTEAD, and only because THIS entry exists.** Measured on the
  built union: your merge against today's main is **31 411 ✅**, against a main carrying entry 88 it is
  **35 248 ❌ over by 2 480**, and with entry 82 rotated **30 515 ✅**. Entry 88 is `additive` so it
  merges first — plan on the rotation. ⚠ **I was on both sides of this gate in one session.**
  ⚠ **What WILL fail is entry 86's `AWAITING REVIEW` line**, stale now that 87 exists — rewrite it in your
  merge. ⚠ **`Amer_Prompt.md` is deliberately NOT in `GATED`**; adding it is one line and it is your call.
  **Q18 and Q20 are yours.**
- **RISK:** additive
- **FULL:** `handoff/zayd/2026-08-08-e88-prompt-sync-gate.md`
- **REVIEW:** **Entry 90 (Zayd) — reviewed, AMENDED, MERGED.** ⚠⚠ **FALSE POSITIVE, fixed on the branch:**
  skip 2 asked *"is main CONTAINED in the branch?"* — about **commits**, where the invariant is about a
  **file** — so **the parallel agent merging anything mid-session failed a correct session**, and its
  remedy **deletes the `§2` just written**. Now `git diff <merge-base> <main> -- <file>`. **+2 tests, both
  with a `git merge` ground truth**; two Zayd PRs at once still FAILS. Full: PR #15.

### 87 | 2026-08-08 | Zayd | a belongs-to CYCLE is authorable by two shipped verbs — and it erases the element silently

- **CHANGED:** `packages/document/src/designoptions.ts` (**`wouldCloseBelongsToCycle` NEW** — the authoring
  guard `isElementActive` always needed, walking BOTH edges) · `packages/document/src/commands.ts`
  (`core.retargetReference` and `core.setElementMetadata` now REFUSE a cycle) ·
  **`tests/belongs-to-cycle-guard.test.ts` NEW (+14, **+3 more from Entry 88's review — §5**)** ·
  `tests/option-cascade-d67.test.ts` (**NEW §8** —
  the differential fuzz, +1) · `open_rulings.md` (Q19 gains its pin) · `tests/frozen-surface.snapshot.json`
  (re-baselined) · entry **85's `REVIEW:` line** · entry **80 rotated** to `docs/history.md` §C · and,
  reviewing PR #12 and PR #13: `current_state.md`, `docs/history.md`.
- **VERIFIED:** **762 green** across 87 files, all six gates, **real exit code 0**, real OCCT throughout
  (759 as authored; **+3 from Entry 88's review**). Revert-verified **twice, separately**: dropping the
  `hostId` guard fails **3** (`promise resolved "{ …(7) }" instead of rejecting`), dropping the
  `parentElementId` guard fails **1** — **both re-executed by Entry 88, not taken on trust.**
- **FOUND:** ⚠⚠ **`core.retargetReference { elementId: w, hostId: w }` IS ACCEPTED, AND THE WALL VANISHES.**
  Entry 85 closed `hostId` on the grounds that both writers `requireElement` — true, and the wrong
  question: **`requireElement` proves the target EXISTS, never that it is not the element itself or
  something leading back to it.** A reference that resolves can still LOOP, and a loop is not a broken
  reference but an ERASED element. Measured through shipped verbs, no design options, no `.bnn`:
  `scene.elements` **1**, `modelElements()` **0**, `brokenRefs()` **[]**, `unbuildable()` **[]**. ⚠ The
  same hole on `parentElementId` via `core.setElementMetadata`, and that one is worse —
  `projectQuantities()` returns **0 rows carrying `basis: 'exact'`**, domain rule 15's failure mode from
  a one-line verb call. ⚠ **A `hostId`-only guard would not have closed it**: `A.hostId=B` then
  `B.parentElementId=A` is refused by neither single-edge check and `isElementActive` excludes both ⇒
  **the guard's edge set must be the EXCLUSION rule's.** ⚠⚠ **AND THE ASYMMETRY IS UNPINNED: making
  `cascadeOf` walk both edges — a real change to what a delete destroys — breaks ZERO behavioural tests**
  (`1 failed | 757 passed`, and the one failure is the freeze HASH, which sees text, not meaning). A Q19
  ruling could land, change `core.deleteElement`, and go green. **Pinned now, and the pin is designed to
  fail when Q19 lands.** ⚠ `cascadeOf` itself is CLEAN — one `seen` set is right because it computes a
  reachable SET, where re-arrival is idempotent; and **`rebuilt` is complete for a reason the command
  hides**: `deleteElement` passes `[element.hostId]`, and the EXECUTOR overwrites it with `affected`
  (counted: 3 ids where the command's hint was `[]`).
- **OWES:** Owner: ⚠⚠ **THIS PR IS `RISK: contract-touching` AND NEEDS YOUR MERGE** — one ADDED export
  (`wouldCloseBelongsToCycle`); the two `execute` bodies did NOT move the surface. **Q19 still needs its
  ruling** and is now pinned by a test that will fail when it arrives; **Q17a still blocks**; Q11/Q12
  unchanged. Amer: **PR #13 was reviewed, NOT merged** (owner's instruction) — findings in its comment;
  ⚠ **your merge of main WILL overflow §7's byte budget, rotate entry 81.** **Q18 and Q20 are yours.**
- **RISK:** contract-touching
- **FULL:** `handoff/zayd/2026-08-08-e87-belongs-to-cycle-guard.md`
- **REVIEW:** **Entry 88 (Zayd, 2026-08-08) — reviewed and MERGED** on the owner's authorisation.
  Item 1 re-executed **both** ways (3 RED, 1 RED). ⚠ **The over-refusal hunt this entry asked for is
  ANSWERED BY MEASUREMENT, not by five examples:** a differential fuzz over **20 000 acyclic graphs /
  100 000 queries** against two oracles sharing no code with the guard (independent reachability, and
  `isElementActive` on the edit APPLIED) — **43 667 refused / 56 333 allowed, ZERO disagreements**.
  **No legitimate authoring act is refused.** Shipped as §5, with the sibling case §3 lacked. ⚠ COST
  answered too: **0.17 µs/call** on a 10 000-element flat model, 1.7 ms on a 10 000-DEEP chain no
  building has. ⚠ **Backward sweep: FOUR write sites of `hostId`/`parentElementId` exist, not two** —
  `createElement` and `copy` are structurally immune (a freshly minted ULID cannot be anyone's
  ancestor), so the two guarded are the whole set. ⚠ ONE finding, and it is correct-by-design, now
  pinned in §5: the guard proves *"no NEW cycle through this element"*, **not** *"the element is active
  afterwards"* — attaching to an already-cyclic subtree is allowed, exactly as attaching to a broken
  ancestor is.

### 86 | 2026-08-07 | Amer | the corner-drag, and the wrapper that was eating D23's transaction

- **CHANGED:** `apps/web` only. **`tool/drag.ts` NEW** (`dragPlans` · `cornerDragPlan` ·
  `cornerPeerCount`; PURE, no `DocumentContext`) · **`tool/drag.test.ts` NEW (+13)** ·
  `edit/agentRefresh.ts` (**the fix**) · `edit/agentRefresh.test.ts` (**+2**) · `App.tsx`
  (`RIBBON_WITHHELD` — `core.array` refuses by design, so its generated button is a control that cannot
  work) · `current_state.md` · `docs/history.md` §C · `open_rulings.md` (Q8 answered, Q20 NEW).
  **No frozen byte, no verb, no schema bump, no `packages/` file.**
- **VERIFIED:** **753 green** across 87 files, six gates, real exit code 0. Revert-verified on the fix
  (drop `options` again ⇒ RED, `expected undefined to deeply equal { transactionId: 'gesture-7' }`).
  ⚠⚠ **AND IN THE BROWSER, BEFORE AND AFTER, ON THE REAL DEMO SCENE:** two `core.setParams` under ONE
  `transactionId`, then one undo — **before:** `w1.end=[4500,500]` `w2.start=[4000,0]` (two undos
  needed); **after:** both back, and one redo restores both. Control: the same edits with NO
  `transactionId` behaved IDENTICALLY to the broken case, which is what proved it was the wrapper.
- **FOUND:** ⚠⚠ **`withUiRefresh` WAS DROPPING `ExecuteOptions` — `execute` was declared
  `(command, args)`, so `transactionId` never reached the document and D23's corner-drag undid ONE EDIT
  AT A TIME.** Nothing failed: every edit applied, geometry right, both diagnostics `[]`. The casualty
  was undo GRANULARITY — and the half-undone state of a corner-drag is a corner left **OPEN**, a model
  the user never authored that the join resolver will faithfully resolve. **The document layer is
  clean** — `agent.ts:178` forwards, `document.ts:396` stamps, `:416` pushes, `takeUndoGroup` groups
  (pinned headlessly); it was four missing characters in `apps/web`. ⇒ **The four existing tests were
  good tests that all asserted what the wrapper ADDS and none what it must not TAKE AWAY. For a
  wrapper, assert the ARGUMENTS ARRIVE — the variadic tail is where things vanish silently.**
  ⚠⚠ **Q8 ANSWERED: the refusal is RIGHT and must not be relaxed** (a placement beside a D52 baseline
  moves the solid and leaves the join resolver, room solver and billed length at the old baseline —
  a silent wrong schedule), **but the demo scene contains NOTHING `core.move` accepts** — both walls
  REFUSED. ⇒ the hostility is in rendering a refusing verb as a generic ribbon button, not in the rule
  (⇒ **Q20**). ⚠ **Measured correction to the dry run's reputation:** a REFUSED probe costs **1.6 ms
  then 0.2 ms**, not ~100 ms — `checkPositioning` refuses BEFORE any geometry is staged; an ACCEPTED
  one costs 28.5 ms. That is what makes probe-and-route affordable. ⚠ The planner therefore **does not
  classify**: duplicating `positioningOf` in the app would be a second copy of the engine's own
  `baselineOf` test, and it would drift silently.
- **OWES:** Owner: **Q20 NEW** (which verbs deserve a generated ribbon button, given some refuse by
  design) · **Q8 is answered above — strike or confirm**. Q11/Q12/Q13/Q17a/Q17b/Q17c/Q18/Q19 stand.
  Zayd: ⚠ **the D23 transaction was never actually reaching the document through `window.bunyan`** —
  any agent-side work that assumed grouping worked was running without it.
- **RISK:** additive
- **FULL:** `handoff/amer/2026-08-07-move-tool-corner-drag.md`
- **REVIEW:** Reviewed by **Entry 87 + Entry 88** (Zayd) and **MERGED by Entry 89** (Amer, a later
  session). Item 1 re-executed **three times** (Zayd twice, Amer once) — RED at
  `expected undefined to deeply equal { transactionId: 'gesture-7' }`. **THREE defects found and all
  three FIXED on the branch before merge:** ⚠⚠ **(1) `cornerDragPlan` matched peers on the 2D corner
  ALONE — a D52 baseline is 2D in the LEVEL plane, so the wall directly upstairs shares x and y exactly
  and was silently re-authored** (Entry 89; `DragTarget.containerId` is the missing third coordinate;
  RED at `expected ['g1','g2','u1','u2'] to deeply equal ['g1','g2']`); **(2) the ABSENT-options test
  was WEAK GREEN** — `toBeUndefined()` cannot separate *forwarded `undefined`* from *never passed*, and
  it passed under the reverted wrapper; **ARITY is the observable** (Zayd wrote it, Amer pasted it);
  **(3) `hostedPlan`'s `Math.hypot` is UNSIGNED** — two opposite drags propose an identical `offsetU`,
  so the docblock's *"over-estimate"* mis-described a **wrong-direction** error. ⚠ And one CLAIM vs CODE
  correction: **`positioningOf` IS exported from `@bunyan/document`** (since Entry 72), so the prompt's
  *"not exported"* premise was false — the design survives on the sharper reason, that the app would
  still have to re-encode the refusal GRAPH. ⚠ **The GL gizmo did NOT ship** — the planner, the
  corner-drag grouping and the transaction did; Entry 89 built the handles on top.

### 85 | 2026-08-06 | Zayd | the `hostId` edge, swept — the ancestry is a DAG and the walk called it a cycle

- **CHANGED:** `packages/document/src/designoptions.ts` (**`isElementActive`'s traversal** — the conflated
  `seen` set replaced by DFS colours; the docblock records why) · `tests/option-cascade-d67.test.ts`
  (**NEW §7, +6**) · `open_rulings.md` (**Q19 extended to the `hostId` edge**) · and, reviewing PR #10:
  `scripts/frozen-surface.mjs` + `.d.mts` (`baselineSnapshot`'s `today` → `at`) · `scripts/state.mjs` ·
  `tests/state-risk-e2e.test.ts` (**+1**) · `tests/freeze-boundary.test.ts` · entry 83's `REVIEW:` line ·
  `tests/frozen-surface.snapshot.json` (re-baselined) · entry **77 rotated** to `docs/history.md` §C.
- **VERIFIED:** **729 green** across 85 files, all six gates, **real exit code 0**, real OCCT throughout.
  Revert-verified twice: restoring the single `seen` set fails **4 of the 6 new tests**, the verb-driven
  one at `modelElements()` **3 where 4 is correct**; restoring the clock-stamped date fails
  `state-risk-e2e` at `expected '2026-08-06' to be '2026-08-05'`.
- **FOUND:** ⚠⚠ **`isElementActive` MISREAD A SHARED ANCESTOR AS A CYCLE.** Two edges out of one node make
  the ancestry a **DAG**, so the two routes upward can MEET — and one `seen` set was doing two jobs,
  *"already judged"* (global) and *"on the current path"* (path-scoped). The second route in refused.
  **Measured through four shipped verbs on a document with NO design options at all: `scene.elements` 4,
  `modelElements()` 3, the opening absent from all SIX consumers, `brokenRefs()` and `unbuildable()` both
  empty** — control with the routes pointed at different ancestors: 5 of 5. §5's both-edges test existed
  but its two ancestors shared nothing, **so the shape that mattered was never built.** ⚠ **`hostId`
  cannot dangle through the verbs** (`createElement`/`retargetReference` both `requireElement`; D39
  cascades the hosted with the host) — **but a `.bnn` can, and it is silent**: 5 elements, `modelElements()`
  3, both diagnostics `[]`. `brokenRefs` walks `hostedBy` from each ROOT, so an element whose host does not
  exist is never anyone's child and is never examined ⇒ **Q19 needs a reconciliation covering BOTH edges.**
  ⚠ **Six consumers, not five** — `joins.ts` has three. ⚠ **And reviewing PR #10: Entry 84's cross-field
  date check was sound while the WRITER fed it two sources** — the entry from the §7 parse, the date from
  `new Date()` — so any rebaseline outside the entry's own calendar day wrote a baseline its own gate
  rejects. `state-risk-e2e`'s own fixture reproduced it every day but one, and nothing had looked.
- **OWES:** Owner: ⚠⚠ **THIS PR IS `RISK: contract-touching` AND NEEDS YOUR MERGE** — one declaration moved
  (`designoptions.ts :: function isElementActive`), baseline re-generated in-PR at entry 85. **Q19 still
  needs its ruling and now spans both edges; Q17a still blocks; Q11/Q12 unchanged.** Amer: **PR #11 is
  yours to review and merge** — left untouched on the owner's instruction. **Q18 is still yours.**
- **RISK:** contract-touching
- **FULL:** `handoff/zayd/2026-08-06-e85-hostid-sweep.md`
- **REVIEW:** Reviewed by **Entry 86** (Amer, a later session); full record in PR #12's comment.
  **APPROVED, NOT MERGED — `contract-touching`, so it is the owner's.** Item 1(a) reproduced to the
  number (**4 RED**, the verb-driven one at `[…(3)]` where 4 is correct). ⚠⚠ **Item 1(b), the cycle hunt
  this entry asked for, came back EMPTY across ten shapes** — a cycle entered from outside, self-loops on
  either edge and both, a diamond whose shared ancestor is itself in a cycle (short and long), **the
  cycle reachable only down the edge explored SECOND (both orders)**, and a 5000-deep chain. All refuse
  and all terminate. The structural reason the colours hold: **a node on a cycle can never be blackened**,
  because reaching it always re-enters it while still grey. Item 2: `cascadeOf` re-derived and **sound —
  for a different reason than "the same code done right"**: it computes a reachable SET, where a re-visit
  is idempotent, so one meaning is all `seen` needs; the conflation is only possible when a visited-set
  decides a boolean about the current walk. Item 4: the `hostId` writer count **taken independently from
  `argsSchema` — exactly two verbs**, `core.createElement` and `core.retargetReference`, both
  `requireElement` the host. **No defect found.** ⇒ **Re-reviewed and MERGED by Entry 87** on the owner's
  explicit authorisation (PR #12's comment). Item 1(a) reproduced a third time; **1(b) answered by a
  DIFFERENTIAL FUZZ rather than a shape list** — an independent closure/Kahn reference vs the colours
  over **20 000 random graphs, ~90 000 queries, zero disagreements**, and revert-verified to fail on the
  old code within ~200 trials. ⚠⚠ **Every disagreement the old code produces is `got false, want true`:
  the defect could only ever OVER-refuse, which is the strongest available answer to *"what does it now
  accept that it should not?"* — nothing.** ⚠ The merge cost a forced §7 rotation: 85 and 84 were each
  under the byte budget and their MERGE was 35 981/32 768 (entry 79 rotated out).

### 84 | 2026-08-06 | Amer | alignment guides ship — and the guide is the first candidate that owns NOTHING

- **CHANGED:** `apps/web` only. **`tool/align.ts` NEW** (`alignmentGuides` · `guideCandidates` ·
  `referencePoints` · `GUIDE_SNAP_KIND`; PURE, projection injected) · `render/Viewport.ts`
  (**`guidesAt`** + **`setGuideLines`** + a dashed `LineSegments` inside `#preview`, so a guide can
  never be picked or snapped to) · `render/ViewportCanvas.tsx` (guides computed BEFORE the snap and fed
  through the same `live` array the face candidate uses) · `tool/useToolController.ts`
  (**`ToolController.authoring`**) · `App.tsx` · **`tool/align.test.ts` NEW (+13)** ·
  `current_state.md` (this abstract; §5 rows; **Entry 77 rotated out** — see OWES for why 77 and not
  76; **and Entry 82's stale `AWAITING REVIEW` line**, which only PR #10 had rewritten, so `docs:check`
  failed the moment this entry landed — copied VERBATIM from PR #10 so the two merge without a
  conflict) · `docs/history.md` §C. **No new `SnapKind`, `SNAP_PRIORITY` UNTOUCHED, no frozen byte, no
  verb, no schema bump, no `packages/` file.**
- **VERIFIED:** **728 green** across 85 files, six gates, real exit code 0. Revert-verified **3 ways
  headless, each watched RED** (drop `referencePoints`' kind filter ⇒ 2 red; let `guideCandidates`
  inherit the reference's `ref`/`elementId` ⇒ 2 red; remove the `minSpanMm` degeneracy guard ⇒ 2 red).
  ⚠⚠ **AND IN THE BROWSER BY REVERT, NOT BY PICTURE:** same document, same pixels, wall anchored at
  `[-5000, 4000]` — guides ON `end = [0, 5780.276509297827]`, guides OFF
  `end = [115.71171400965068, 5780.276509297827]`. **The y is byte-identical and only the aligned
  component moved**, 115.7 mm taken from a reference at x=0 — a grid snap would have made both
  components round, an endpoint snap would have replaced both. The opening tool re-run under the guides:
  `state: valid`, leaf 63 999 999.99 mm³ / frame 85 549 999.99 mm³, both diagnostics `[]`, console clean
  on a fresh tab.
- **FOUND:** ⚠⚠ **THE GRID LATTICE IS THE FAILURE MODE THAT LOOKS LIKE SUCCESS.** Feeding every Tier-1
  candidate in as a reference — the obvious implementation — lights **both guides at every cursor
  position, permanently**, because every point on the plane shares its x with some grid intersection and
  its y with another. Measured: a 1000 mm lattice and a cursor on no visible grid line yields `['x','y']`
  admitted and `[]` filtered. `'face'` is excluded for the same reason one step along — a face candidate
  moves WITH the cursor, so it can never be *aligned with* it. ⚠⚠ **A GUIDE CARRIES NO `ref`, NO
  `elementId`, NO `nodeId`** — its point is reached by travelling along an axis FROM a reference, so
  inheriting the reference's identity is Entry 80's defect with a longer lever. A hosted-void tool
  therefore declines a guide, and `snapTo: ['face']` means it never sees one. ⚠ **`snapTo: null` IS
  AMBIGUOUS** — *"every kind"* for a collecting input and *"there is no input"* for Select — so the
  overlay needed `authoring`, or dashes would flicker over the model on every hover. ⚠ `'extension'` is
  the ruled slot (Q3) and no kind was added; the test asserts the guide's PLACE in `SNAP_PRIORITY`, so
  re-ruling Q3 re-rules this. ⚠ `LineDashedMaterial` renders **solid** without `computeLineDistances()`
  and nothing errors.
- **OWES:** Owner: **nothing new** — `RISK: additive`, so the REVIEWING agent merges this. ⚠ **PR #10
  (entry 83) is `contract-touching` and still needs YOUR merge**; it was reviewed this session and one
  defect was fixed **on its branch** (`cba786b`). Q8/Q11/Q12/Q13/Q17a/Q17b/Q17c/Q18/Q19 stand. Zayd:
  ⚠ **this entry rotates 77, not the strictly-oldest 76, because PR #10 rotates 76** — either merge
  order ends with §7 = {84, 83, 82, 81, 80, 79} and both in §C; expect an ordinary §7 conflict.
- **RISK:** additive
- **FULL:** `handoff/amer/2026-08-06-alignment-guides.md`
- **REVIEW:** Reviewed and merged by **Entry 86** (Amer, a later session); full record in PR #11's
  comment. Item 1 re-executed on claim #2 (**2 RED**), and ⚠⚠ **the browser pair was RE-RUN, not taken —
  both halves reproduce BYTE-IDENTICALLY** (ON `[0, 5780.276509297827]`, OFF `[115.71171400965068,
  …]`). ⚠⚠ **ONE DEFECT FOUND AND FIXED ON THE BRANCH, AND IT IS THE KIND A CORRECTNESS MEASUREMENT
  CANNOT SEE: `SnapIndex.near()` probes `(2·reach+1)³` cells whether or not they hold anything, so its
  cost is set by the RADIUS, not the model.** The 15 m guide query (61³ = **226 981 probes**) went on
  the per-frame path beside the 3 m one: measured in the real app, **72.93 ms/pointermove — a 14 fps
  ceiling — vs 0.465 ms after (157×)**. Not scale: 24 candidates cost 16.5 ms, 2400 cost 19.1 ms.
  Fixed by scanning the candidates when the sweep would out-probe them; revert-verified. ⚠ **Second,
  §1c-7: the grid-lattice justification was UNCONDITIONAL and its test proved something weaker than its
  title** — the cursor sat ON both grid lines. The real precondition is a zoom; the exclusion stands,
  comment and test corrected. **730 green, six gates, exit 0.**

### 83 | 2026-08-06 | Zayd | the three reserved reference args, swept — one is dormant, one is a 100% erasure (Q19)

- **CHANGED:** `packages/document/src/designoptions.ts` (**`unresolvedDesignOptions` NEW** — the referential
  half of the rule, expressed once; + two false claims in its own docblock corrected) ·
  `packages/document/src/commands.ts` (`checkDesignOptions` keeps its THROW and loses its lookup; the
  backwards `parentElementId` analogy on `createElement` and the "not quantity-bearing" claim on
  `setElementMetadata` both corrected) · `packages/document/src/view.ts` (its second copy of the lookup
  DELETED; the `REFUSED` throw kept) · **`tests/design-option-refs.test.ts` NEW (+5)** ·
  `tests/plan-section.test.ts` (the third home of the false "shared check" claim) · `open_rulings.md`
  (**Q19 NEW**; Q17b updated — the collapse is built) · `tests/frozen-surface.snapshot.json`
  (**re-baselined**, 213 declarations, entry 83) · `tests/freeze-boundary.test.ts` (⚠ its
  `_baselinedAtEntry` assertion was a THIRD hand-maintained constant — now resolved against the §7 parse) ·
  `current_state.md` (this abstract; **Entry 76 rotated out** to `docs/history.md` §C, byte budget not
  count). ⚠⚠ **`RISK: contract-touching` — the owner merges this.**
- **VERIFIED:** **720 green** across 85 files, six gates, real exit code 0. ⚠ **The collapse is
  behaviour-preserving, so NO test here fails in its absence — and that is stated rather than dressed up.**
  The honest claim for a de-duplication: the 5 new tests pass IDENTICALLY on both trees, **verified by
  stashing the fix and re-running them** (5/5 green either way); what they buy is the future drift. Q19's
  measurement driven through `DocumentContext` + `CORE_COMMANDS` against the real OCCT kernel.
- **FOUND:** ⚠⚠ **THE THREE RESERVED REFS ARE NOT ALIKE, AND THE CODE'S OWN COMMENT GROUPING THEM WAS
  BACKWARDS.** `createElement` said its integrity check would land later *"like `parentElementId`'s"* —
  but `parentElementId` is validated RIGHT THERE, forty lines above, precisely because *"a dangling ref is
  the silent breakage this project refuses."* It is the counter-example, not the precedent. Swept: **`systemId`
  is genuinely DORMANT** — zero readers, nothing excludes/aggregates/publishes on it, so skipping its check
  costs nothing (cheap to establish, and worth closing). **`designOptionId`** is Entry 82's 50%.
  ⚠⚠ **`parentElementId` IS THE WORST OF THE THREE AND NOBODY HAD LOOKED: TWO OWNER-RULED WALKS DISAGREE
  ABOUT WHICH EDGES ARE "BELONGS-TO".** `cascadeOf` (D39) cascades a delete over `hostId` only;
  `isElementActive` (D67) excludes over `hostId` **and** `parentElementId`. ⇒ delete a parent and the child
  survives in `scene.elements` while vanishing from every consumer. Measured: `modelElements()` **0 of 1**, a
  whole-model schedule **0 rows and 0 mm³** with `basis: 'exact'`, `brokenRefs()` `[]`, `unbuildable()` `[]`
  — while `quantities(child)` still returns 3 600 000 000 mm³. **A 100% under-report, and it needs NO
  reserved-arg misuse: `parentElementId` is validated at both doors.** The road in is `core.deleteElement`.
  ⚠⚠ **AND A THIRD SENSE OF "ADDITIVE" BIT, ONE ENTRY AFTER ENTRY 82 NAMED THE FIRST TWO: "NEEDS NO RULING"
  ≠ "AGENT-MERGEABLE".** The collapse needed no ruling and is `RISK: contract-touching` anyway — measured,
  not assumed: **an ADDED export in a watched file trips the gate exactly like a changed one.** ⚠ And
  every additive alternative would have dodged the gate by violating a discipline the code states out loud
  (`commands.ts:2285`) — i.e. by reproducing the defect being fixed. ⚠⚠ **A THIRD HAND-MAINTAINED CONSTANT
  WAS FOUND BY THIS PR'S OWN RE-BASELINE:** `freeze-boundary.test.ts` pinned `_baselinedAtEntry` to the
  literal `77` while its title claims only *"names an entry that exists"* — so it failed on a LEGITIMATE
  re-baseline (`expected 83 to be 77`), having asserted something stronger than and different from its own
  name for two entries. Entry 80's lesson landing on Q15's own fix. ⚠ **And Q15's fix confirmed LIVE:** the
  second, plain `pnpm state` still printed `contract-touching (re-baselined)` — the verdict measured at the
  merge base survived the rewrite, which is the exact regression Entry 82 revert-verified.
- **OWES:** Owner: ⚠⚠ **`Q19` NEW** (the D39-vs-D67 gap — cascade, refuse or surface; recommendation given,
  not chosen for you) · **`Q17a` still 🔴 BLOCKING** · **this PR needs YOUR merge** (contract-touching).
  🟡 OPEN: **Q4–Q13, Q17b, Q17c, Q18, Q19**. ⚠ **`gh pr merge` was refused again** — Entry 82's new
  allow-list rules do NOT defeat the `defaultMode: auto` classifier; **that question is now answered, and
  the remaining lever is the owner's alone.** Amer: **Q18 is still yours.**
- **RISK:** contract-touching
- **FULL:** `handoff/zayd/2026-08-06-e83-reserved-ref-sweep.md`
- **REVIEW:** Reviewed by **Entry 84** (Amer, a later session). Item 1(a) re-executed: `view.ts`'s deleted
  copy restored ⇒ `design-option-refs` **5/5 GREEN either way** — behaviour-preserving, as claimed. Item 4:
  `systemId`'s zero-readers claim **counted independently** — 5 sites in `packages/`, all declaration,
  schema or write; no body reads it. Item 5: Q19 **re-derived from a fresh harness** — 2 rows /
  7 200 000 000 mm³ ⇒ after `core.deleteElement` on the parent, **0 rows / 0 mm³ `basis:'exact'`**,
  `modelElements()` 0, both diagnostics `[]`, child measures 3 600 000 000 mm³ directly. ⚠⚠ **ONE DEFECT
  FOUND AND FIXED ON THE BRANCH — item 1(b), the half this entry asked to be attacked: the replacement
  assertion resolved `_baselinedAtEntry` against §7, which is a ROTATING TEN-ENTRY WINDOW, so it tests
  "has not rotated out" and not "exists" — and the `_README` policy this file enforces GUARANTEES the
  baseline sits still post-freeze, so the gate would go red for obeying the freeze.** Now
  `baselineEntryIssues` in `frozen-surface.mjs`, checked against what does not rot, plus the cross-field
  date check that would have caught Q15 itself; revert-verified (`76 is not in §7`). **APPROVED — and it
  is `contract-touching`.** ⇒ **Re-reviewed by Entry 85** (Zayd, 2026-08-06), since Entry 84's own fix had
  never been read by a second party. Item 1 re-executed both halves (15/15 either way; membership
  restored ⇒ RED). ⚠⚠ **ONE FURTHER DEFECT FIXED: Entry 84's cross-field date check is sound, but the
  writer fed it TWO SOURCES** — the entry from the §7 parse, the date from `new Date()` — **so any
  rebaseline outside the entry's own calendar day wrote a baseline its own gate rejects** (a session
  crossing UTC midnight; Amer's `+0100` box before 01:00). Proven by running the real generator in
  `state-risk-e2e`; fixed by stamping the entry's date. **723 green, exit 0. MERGED on owner authority.**

### 82 | 2026-08-06 | Zayd | the design-options question, walked — the two doors are a 50% silent under-report (Q17)

- **CHANGED:** **`docs/design/P5_step6D_design_options_crud_design.md` NEW** — the Q17 walk: the gap
  measured through the shipped verbs, the promotion's real cost, the CRUD's shape, the dependency edge, an
  8-row test plan each with its weak-green, and §7's three questions · `open_rulings.md` (**Q17 REPLACED by
  Q17a/Q17b/Q17c**, and **Q17a moved to 🔴 BLOCKING**, empty for five sessions) · `current_state.md` (this
  abstract; **Entry 75 rotated out**, already in `docs/history.md` §C) · plus **Entry 81's review, fixed on
  its branch**: `scripts/state.mjs` (the verdict is measured against the baseline **at the merge base**,
  read from git) + **`tests/state-risk-e2e.test.ts` NEW (+6)**. **No code in `packages/`, no frozen byte,
  no verb, no schema bump.**
- **VERIFIED:** **715 green** across 84 files, six gates, real exit code 0. Q17's numbers driven through
  `DocumentContext` + `CORE_COMMANDS` against the real OCCT kernel, not quoted. Entry 81's fix
  **revert-verified**: restore its `state.mjs` and `state-risk-e2e` goes RED (`the verdict was erased by
  re-baselining`) **while `freeze-boundary.test.ts` stays 10/10 green**. Its item 1 re-executed: the
  pre-Q16 gate body ⇒ **3 e2e RED**, unit file 14/14 green.
- **FOUND:** ⚠⚠ **Q17 IS NOT A SYMMETRY COMPLAINT — IT IS A 50.0% SILENT UNDER-REPORT WEARING
  `basis: 'exact'`, ON A DOCUMENT WITH NO DESIGN OPTIONS AT ALL.** 0 of 40 verbs can author an option, so
  `scene.designOptions` is always absent; `core.createElement` accepts a `designOptionId` naming nothing;
  `isElementActive` then excludes that element from every enumerating consumer. Two identical walls, one
  tagged ⇒ `scene.elements` **2**, `modelElements()` **1**, a whole-model schedule **1 row and
  3 600 000 000 mm³ where 7 200 000 000 is correct** — `unmeasured: []`, `brokenRefs()` `[]`,
  `unbuildable()` `[]`. **D65's own named failure mode INVERTED** (it predicted 2.0000× over; what ships is
  0.5000× under) and §1c-8's ledger exactly: the consumer rule landed 07-23, the authoring arg 07-24, and
  nobody swept the door against the rule. ⚠⚠ **AND "IS IT ADDITIVE?" HAS TWO ANSWERS THAT PART COMPANY:**
  data-additive **YES** (D79's trick transfers verbatim — no schema bump, byte-identical documents),
  freeze-additive **NO** — measured, the gate names `scene.ts :: type SceneCollection`, one of 21 watched
  declarations there. Saying "additive" without saying which is how a contract-touching PR gets
  agent-merged. ⚠ The `dependency.ts` edge is **not** the "nothing" `schedules`/`views` declared: an option
  edit changes what the join resolver sees (D68's ambiguity flip) from the authoring side. ⚠ And the Q17
  row was wrong about the code — `checkDesignOptions` is **not** shared with `core.createView`, which has
  its own second copy in `view.ts` (rule 10). **A row in the owner's queue is a claim about the code.**
- **OWES:** Owner: ⚠⚠ **🔴 BLOCKING IS NO LONGER EMPTY — `Q17a`** (promote `designOptions` +
  the CRUD; contract-touching, so the owner also merges it). 🟡 OPEN: **Q4–Q13, Q17b, Q17c, Q18**.
  `Q17b` is the stopgap direction (shut vs open — deliberately not chosen); `Q17c` is the one additive,
  direction-neutral piece (make a dangling `designOptionId` a broken ref, so the number above stops being
  silent). Amer: **Q18 is still yours** — the cut-face half of what a hosted void may host on; Entry 81
  fixed only the edge half.
- **RISK:** additive
- **FULL:** `handoff/zayd/2026-08-06-q17-designoptions.md`
- **REVIEW:** ✅ Reviewed by **Entry 83** (Zayd, 2026-08-06) against all 7 items — **APPROVED, no defect
  found**; merged by the owner (the harness classifier refused `gh pr merge` again — see Entry 83). Item 1
  **executed**: reverting `state.mjs:175` to `const against = workingSnap` drove `state-risk-e2e` RED on
  *"the verdict was erased by re-baselining"* **while `freeze-boundary` stayed 10/10 GREEN** — the gate that
  decides RISK cannot see this defect, only the e2e that EXECUTES the generator. Item 4 the one that
  mattered: §1's numbers were re-derived from a fresh harness after the original was deleted, and **every
  row of §1.4 reproduced exactly**, both failure codes and all four empty diagnostics included. §3.2 and
  §3.3 re-measured too — `CHANGED (1) scene.ts :: type SceneCollection`, one `TS2345` at
  `dependency.ts:177`. ⚠ Item 6 found the one real gap and it is not this PR's to close: **§5 criterion 6 is
  the only thing that would ever hold the 50% measurement down, and it lives inside a unit Q17a blocks** —
  so the defect has no committed test and has now been hand-derived twice.

### 81 | 2026-08-05 | Zayd | the two gates that failed OPEN are closed — and one of them had never run (Q15, Q16)

- **CHANGED:** `scripts/docs-state.mjs` (**`riskVerdict`** — `{risk, label, detail}`; re-baselining is a
  QUALIFIER, never an answer) · `scripts/frozen-surface.mjs` (**`baselineSnapshot`** — every owned field
  COMPUTED) · `scripts/state.mjs` (the diff is measured against the PREVIOUS baseline; the rebaseline
  WRITE moved below the §7 parse so it has an entry number to record) ·
  `tests/frozen-surface.snapshot.json` (`_baselinedAtEntry` **72 → 77**, the entry `git log` says wrote
  it) · **`scripts/reseed-payload.mjs` NEW** (`payloadHash` with `seededAt` excluded, `goldenValuesMoved`,
  the `Re-seed-unchanged: <reason>` trailer) · `scripts/check-reseed.mjs` (compares the golden PAYLOAD
  across `base…head`, read from git) · `tests/freeze-boundary.test.ts` (+7) · `tests/reseed-gate.test.ts`
  (+7) · **`tests/reseed-gate-e2e.test.ts` NEW (+6)** · `open_rulings.md` (Q15 + Q16 **STRUCK**, on Q14's
  precedent — tooling, no contract, reversible in one commit). **No frozen byte, no schema bump.**
  ⚠ **+ THE REVIEW'S FIX (Entry 82's session, on this branch):** `scripts/state.mjs` measures the verdict
  against the baseline **at the merge base**, read from git · **`tests/state-risk-e2e.test.ts` NEW (+6)**.
- **VERIFIED:** **709 green** across 83 files, six gates, real exit code 0 as authored; **715 across 84
  files** after the review's fix. **Revert-verified 5 ways,
  each watched RED**: the old `risk = 'additive'` override (`expected 'additive' to be
  'contract-touching'`); `baselineSnapshot` without the entry (`the stale 72 survived the write`);
  `payloadHash` keeping the clock (2 red); a bare trailer accepted (`expected '' to be null`); and the
  pre-Q16 gate body — **3 e2e tests red**. Plus the committed `72` itself (`expected 72 to be 77`).
- **FOUND:** ⚠⚠ **A SOURCE-TEXT "IS IT WIRED?" ASSERTION PROVES THE CALL IS WRITTEN, NOT THAT IT RUNS.**
  Reverting the gate's body to its pre-Q16 form left the unit tests green **and both grep-the-source
  wiring assertions green**, because the reverted gate still CONTAINED the calls — below an early
  `process.exit(0)`. Only the end-to-end test went red. ⇒ where the artifact can be executed, EXECUTE it:
  `reseed-gate-e2e.test.ts` builds a throwaway git repo, commits the four scenarios and asserts the EXIT
  CODE, which is the only thing CI reads. That path had never run in 73 entries (Entry 73).
  ⚠⚠ **BOTH DEFECTS FAILED OPEN, AND THAT IS WHAT AN UNTESTED GATE DRIFTS TOWARDS** — a gate is written
  by someone who wants their own PR to pass. `--rebaseline`'s label was *technically* true and wrong
  because **the only PR that ever runs it is a PR that moved the frozen surface**: the exception clause
  covered the whole population. ⇒ **ask what a check's population actually is.** ⚠ The confirmation had
  to cost a SENTENCE or it would be the timestamp again — an env var is set once in a workflow and true
  forever; a trailer with a reason lands in the history beside the diff it excuses, and a bare
  `Re-seed-unchanged:` does not match. ⚠ Weak-green caught in my own test: *"a bumped `seededAt` is not a
  re-seed"* also passes if the hash strips TOO MUCH, so both directions are asserted.
- **OWES:** Owner: **nothing new.** 🟡 OPEN is now **Q4–Q13, Q17, Q18** — Q15/Q16 struck as BUILT, and
  the 🔴 BLOCKING table is EMPTY for a fourth session. Amer: the `contract-touching (re-baselined)` label
  has been produced by tests, never yet by a real `--rebaseline` run — **the next contract-touching PR is
  its first live use; read the label it prints.** ⚠ And Entry 80's review is in this session too: PR #7
  merged after one finding was fixed on its branch (the document layer accepted a non-face `hostRef`);
  **Q18 — the cut-face half — is still yours and still open.**
- **RISK:** additive
- **FULL:** `handoff/zayd/2026-08-05-q15-q16.md`
- **REVIEW:** **Reviewed by Zayd (later session, 2026-08-06) — all seven items; MERGED (`additive`,
  `surface` byte-identical to main, six gates green).** Item 1 re-executed: the pre-Q16 gate body put
  back ⇒ **3 e2e RED**, unit file 14/14 green including its wiring grep. ⚠⚠ **ONE REAL DEFECT, PROVEN
  AND FIXED ON THIS BRANCH — Q15's fix held for exactly ONE invocation.** The verdict was measured
  against the working-tree baseline `--rebaseline` had just rewritten, so the next plain `pnpm state`
  printed `RISK: additive` again on the same PR — and that is the run whose output survives into §8 and
  `FRESH`. `state.mjs` now measures against the baseline **at the merge base**, read from git;
  `tests/state-risk-e2e.test.ts` EXECUTES the generator (revert-verified RED, while
  `freeze-boundary.test.ts` stayed 10/10 green — §3a's lesson landing on §3a's own author). ⚠ One of
  those greps asserted the argument list verbatim, so it **failed on the fix and passed on the bug**;
  loosened. ⚠ Number corrected: `reseed-gate.test.ts` is **+7**, not +6. ⚠ One non-blocking opinion in
  the body §7e: the `Re-seed-unchanged:` trailer means *silence is no longer a pass, and any sentence
  is* — `REVIEW.md` item 4 already covers it, no eighth checklist item proposed. Full write-up:
  `handoff/zayd/2026-08-05-q15-q16.md` §7.

### 80 | 2026-08-05 | Amer | the opening tool ships — one click on a face is a hosted door, and `snapTo` was decorative

- **CHANGED:** `apps/web/src/tool/tools.ts` (**`OPENING_TOOL`** — one input, commits `core.createElement`
  with `{hostId, hostRef}`; `offsetU` projected onto the host's AUTHORED baseline, `offsetV` from the face
  centre, both clamped to fit; declines a non-face ref) · `toolMachine.ts` (**`CollectedInput`** — a
  session now carries what a click LANDED ON, not only where it was; **`ToolContext.paramsOf`**) ·
  `snap.ts` (**`faceCandidate`** — per-frame, from the ray hit; **`chooseSnap(…, allow)`**) ·
  `useToolController.ts` (`snapTo` published; ref+element carried from the snap, never from the pick) ·
  `render/pick.ts` (**`PickResult.point`**) · `Viewport.ts` · `ViewportCanvas.tsx` (pick BEFORE snap) ·
  `App.tsx` · `scaffold/seed.ts` · **`scripts/docs-state.mjs` + `state.mjs` + `docs-state.d.mts`** (the
  CRLF fix + **`newestAbstract` refuses an empty parse** + `state` writes back in the file's OWN line
  ending, so step 8 stops undoing step 7) · `tests/docs-budget.test.ts` (+4) ·
  `open_rulings.md` (**Q18 NEW**) · §5 rows 1–2 corrected. **No frozen byte, no schema bump.**
- **VERIFIED:** **688 green** across 82 files, six gates, real exit code 0 — **and gate six had never run here**
  (see FOUND). Revert-verified **6 ways, each watched RED**: baseline projection → x-only (the +y wall
  test); `offsetU` measured from the face centre (3 fail); `hostRef` hand-rebuilt instead of carried;
  `parseAbstracts` back to `split('\n')` (7 fail); and my own no-`\r` test strengthened after it passed
  vacuously under its own revert. **Browser (the split's other half):** one click → `state: 'valid'`,
  `parts: [leaf, frame]`, quantities off the B-Rep (leaf 64 000 000 mm³, frame 85 550 000 mm³, mass "—"),
  console-error-free boot on a fresh tab.
- **FOUND:** ⚠⚠ **`InputSpec.snapTo` WAS DECORATIVE FOR THREE ENTRIES — DECLARED, TYPED, DOCUMENTED, AND
  READ BY NOTHING.** `SNAP_PRIORITY` ranks `endpoint`/`midpoint` ABOVE `face`, and an endpoint candidate
  carries the **EDGE's** ref — so pointing near a corner hosted the door on an edge. `core.createElement`
  ACCEPTS it, the build throws, and the element lands **`state: 'failed'`, `parts: []`, with NO banner, NO
  console error, and `unbuildable()` AND `brokenRefs()` both EMPTY.** Measured: **1 of 2 placements**.
  Found by USING it (§1b), not by reading — the code says `snapTo: ['face']` and looks correct.
  ⚠⚠ **GATE SIX HAS NEVER RUN ON AMER'S BOX SINCE THE 2026-07-31 MIGRATION.** `core.autocrlf=true` ⇒ 920
  CRLF pairs in `current_state.md`; `parseAbstracts` split on `\n`, leaving `\r`, and its heading regex
  ends `\| (.+)$` — JS `.` does not match `\r`. **Zero abstracts, five tests red, CI green.** ⚠ **The
  silent half is worse than the red half:** `pnpm state` took the same `[]` through `reduce(…, null)` and
  would have written **`(none)`** into §8 and **`ENTRY ?`** into the FRESH block that step 10(a) pushes
  STRAIGHT TO MAIN. `.prettierrc` already carries `endOfLine:"auto"` for exactly this box — the parser
  missed that memo. ⚠ **A second opening on the same wall comes back `broken-ref`** (the pick correctly
  hands over a face of the wall AS CUT, `…structure~opening-X/face/cut(…)`) ⇒ **Q18**, not guessed at.
  ⚠ My own test fixture invented the token format (`|` for `/`) and nothing noticed until the new guard
  DECODED it — §1c-9 in miniature. ⚠ `offsetU` must come off the D52 baseline, not the picked face: on a
  straight demo wall the wrong one is indistinguishable, and on the +y wall it is 450 instead of 1200.
- **OWES:** Owner: **Q18 (NEW)** — what may a hosted void host on; Q11/Q12/Q13/Q15/Q16/Q17 stand.
  ⚠ **Q13 is now cheaper than when it was filed: this session ran on its OWN GitHub account**
  (`narutousomaki741`), so branch protection would no longer block every merge. Zayd: nothing owed, but
  two things are yours — `snapTo`'s fix is app-side only, and **Q18's real fix belongs in the document
  layer** (the app can only parse tokens, which it must not).
- **RISK:** additive
- **FULL:** `handoff/amer/2026-08-05-opening-tool.md`
- **REVIEW:** ✅ Zayd, 2026-08-05 (Entry 81's step 3) — reviewed against `REVIEW.md` and MERGED
  (`additive`, freeze-boundary green, CI green). Item 1 executed TWICE: the baseline projection → x-only
  went RED at **450 vs 1200**, and `parseAbstracts` → `split('\n')` went RED — **3 tests here, not the 7
  claimed**, because on an LF box only the synthetic-CRLF trio can fail (the claim holds on a CRLF tree;
  the number is box-dependent and the entry does not say so). ⚠ **ONE FINDING, PROVEN AND FIXED ON THE
  BRANCH — and it is the "yours" this entry named:** the app-side face guard left the DOCUMENT layer
  unguarded, so an opening hosted on an EDGE token (which IS in `part.refs`) still landed `state: failed`
  with `brokenRefs()` AND `unbuildable()` both empty — reproduced headlessly, verbatim. `build.ts` now
  answers a non-face `hostRef` with a **BROKEN REF**, the same visible, retargetable state its missing-face
  sibling has had all along (`document-openings.test.ts`, watched RED). ⚠ Second, free: the phantom sweep
  stopped one file short — `useToolController.ts`'s header still drew `SnapGateway`/`PreviewLayer`, and
  neither has ever existed. **689 green, 82 files, six gates, exit 0.**

### 79 | 2026-08-05 | Zayd | the emsdk image is pinned by digest — and the artifact now names its own compiler (Q14)

- **CHANGED:** `tools/kernel-build/toolchain.json` (**NEW** — one machine-readable pin: OCCT version,
  emsdk image + **digest**, emcc version + commit, derived `buildId`; read by the recipe AND the tests) ·
  `README.md` (all five `emscripten/emsdk:latest` sites → `"$EMSDK"`; "Pinned toolchain" rewritten — it
  claimed a pin it did not have) · `probe.sh` + `current_state.md` §6 (the pasteable commands) ·
  `tools/kernel-build/src/kernel.cpp` (**`toolchainId()`** + `<emscripten/version.h>`,
  `<Standard_Version.hxx>`, the binding) · **the WASM relinked on the pinned digest** (+139 B) + its
  `.d.ts` · `packages/kernel-occt/src/kernel.ts` (**`createOcctKernel` REFUSES a module whose
  `toolchainId()` disagrees with `OCCT_BUILD_ID`**; `artifactBuildId()` on `OcctKernel`) ·
  `scripts/reseed-paths.mjs` (`toolchain.json` gated — it names the COMPILER) ·
  `tests/kernel-build-pin.test.ts` (**NEW, 6 tests**) · `tests/reseed-gate.test.ts` (+1) · goldens
  re-seeded · `open_rulings.md` (**Q14 STRUCK**). No schema bump, no frozen byte.
- **VERIFIED:** **661 green** across 82 files, all six gates, **real exit code 0**, real OCCT throughout.
  **Revert-verified 4 ways, each watched RED:** the pre-Entry-79 artifact → `wasm.toolchainId is not a
  function`; `OCCT_BUILD_ID` set to `…6.0.5` → `[INTERNAL] Kernel artifact mismatch` in two suites;
  `:latest` put back → the guard names the exact code block; the gate path removed → RED.
- **FOUND:** ⚠⚠ **THE TAG HAD ALREADY MOVED — Q14 WAS A LIVE DEFECT, NOT A HYPOTHETICAL.** The artifact
  was linked by `sha256:644883f5…` = **emsdk 6.0.2**; `:latest` today is `sha256:76a44fff…` = **6.0.5**,
  three releases on. Following the README verbatim relinks with a compiler `OCCT_BUILD_ID` does not name
  and **all four tests asserting it stay green**. ⚠ The only reason Entry 77's rebuild was not already
  wrong is that `docker run` does not re-pull a cached tag — a coincidence, not a control. ⚠⚠ **AND
  "READ IT BACK FROM THE ARTIFACT" WAS IMPOSSIBLE, NOT MERELY UNDONE:** the shipped `.wasm` had **11
  sections, ZERO custom sections and not one version string in 14.7 MB** (`-O3` strips `producers`), so
  no test could have caught it even in principle. The id is now composed from `OCC_VERSION_COMPLETE` +
  `__EMSCRIPTEN_*__` — compile-time macros, greppable in the binary. ⚠⚠ **THE PIN IS PROVEN, NOT
  ASSERTED: relinking the unmodified source on the digest reproduced the committed artifact BYTE FOR
  BYTE** (wasm `819ff12c…`, js `fc5b0421…`, `cmp` clean, ~75 s). ⚠ `OCC_VERSION_STRING` is **"7.9"**,
  not "7.9.3" (`OCC_VERSION_COMPLETE` is) — the obvious spelling ships a plausible wrong id. ⚠
  `__EMSCRIPTEN_MAJOR__` is **not predefined** and the lowercase form is `#pragma clang deprecated`. ⚠
  **The re-seed diff is ONE `seededAt` LINE again** — second entry running ⇒ Q16.
- **OWES:** Owner: **nothing — `RISK: additive`, so the REVIEWING agent merges this.** Q15/Q16/Q17 and
  Q11/Q12 stand as recorded; Q16 gained a second worked example. Amer: `createOcctKernel` can now
  **reject at construction** on an artifact/constant mismatch — it fires in the browser too, and only on
  a broken build.
- **RISK:** additive
- **FULL:** `handoff/zayd/2026-08-05-emsdk-digest-pin.md`
- **REVIEW:** **REVIEWED + MERGED 2026-08-05 by the Entry-80 session** (Amer, a later session — the
  protocol holding for a fifth entry); full record in PR #6's comment. Item 1 executed: `OCCT_BUILD_ID` →
  `…6.0.5` went RED in **both** suites with the refusal firing from `createOcctKernel`. Independently
  corroborated the load-bearing claim the entry did not make — the id is **one NUL-terminated literal at
  offset 13,109,054** of the shipped `.wasm`, so nothing on the TypeScript side can have put it there.
  ⚠ **ONE FINDING, PROVEN AND FIXED ON THE BRANCH: the backward sweep stopped one file short of `NOTICE`,**
  whose §1 asserted all four of the things this entry made false (the mutable tag, the non-reproducible
  rebuild, *"not a value read back out of the artifact"*, and *"that pin is open as a ruling"*) — in the
  LGPL 2.1 §6 attribution, the one document here with a reader outside this repo. 4 tests, all watched RED.
  ⚠ Correction: the byte-for-byte relink was against the artifact as committed **before** this entry
  (`819ff12c…` = main's wasm, re-measured); what ships is that source +`toolchainId()`, 14 682 327 →
  14 682 466 B. `NOTICE` now states the two separately.

### 77 | 2026-08-03 | Zayd | the plan/section unit ships — a drawing IS the B-Rep (D58 row Ⓐ, D81)

- **CHANGED:** `tools/kernel-build/src/kernel.cpp` (**`sectionCut`**, `BRepAlgoAPI_Section` + `Generated()`
  attribution) + **the WASM artifact rebuilt** (+69,808 B) · `packages/kernel-occt` (the adapter +
  `SECTION_DEFLECTION` 0.5 mm) · `packages/protocol` (`SectionCurve.nodeId?`; **`sectionCut` off
  `RESERVED_OPS`**; the false `ref` comment corrected) · `packages/document/src/view.ts` (**NEW** — the
  validator, the plane, the pre-filter, every result type) · `scene.ts`/`dependency.ts`/`bnn.ts` (the
  `views` promotion) · `commands.ts` (**`core.createView`/`updateView`/`deleteView`**) · `document.ts`
  (**`projectView`**, the D19 door) · `schema.ts` (`refTo` +4) · `tests/plan-section.test.ts` (**NEW, 8
  tests, one per §5 criterion**) · `docs/decisions.md` **D81** · `open_rulings.md` (Q1–Q3 STRUCK, Q15 new).
  **No `SCENE_SCHEMA_VERSION` bump, no `emptyScene()` entry.**
- **VERIFIED:** **653 green** across 81 files, all six gates, **real exit code 0**, real OCCT throughout.
  Revert-verified: reverting the ref-token attribution goes **RED at "expected length 8 but got 6"**.
- **FOUND:** ⚠⚠ **A REF'S `nodeId` NAMES THE NODE THAT MINTED IT, NOT THE PART THAT CARRIES IT** — the
  design predicted it and I walked in anyway. Measured on a holed wall: **8 cut curves, 8 attributed, but
  spanning TWO nodeIds** (`wall-….wall` and `opening-…`, the reveals belonging to the cut node). Keyed by
  `nodeId` the plan draws **6 curves where 8 is correct and 10 where 20 is**, silently. ⚠⚠ **AND MY OWN
  TEST HAD A WEAK GREEN THAT ONLY REVERT-VERIFICATION EXPOSED:** `toBeGreaterThan(solidCount)` still
  passed on the broken version, because `6 > 4`. Pinned to the exact count. ⚠ **A "fix" of mine was
  nothing at all** — I forwarded the option catalogue into `modelElements` and wrote a comment calling it
  load-bearing; reverted, the suite stayed GREEN, so the line was REMOVED rather than kept with a false
  justification. ⚠ `SectionCurve.closed`'s frozen comment says a cut curve "is closed"; measured, **all 4
  curves of a plain box are `closed=false`** (Section returns EDGES, not loops). ⚠ `designOptionIds` is
  authorable only on a document whose options arrived by another road — **no command can create a design
  option**, while `core.createElement` deliberately skips the same check. ⚠ Hosting on `lateral.0` instead
  of `lateral.1` cuts a face the plan never meets: **volume comes back exactly uncut (1,920,000,000 mm³)**
  and everything reports success. ⚠⚠ **AND THE RE-SEED GATE IS SATISFIED BY A TIMESTAMP** — its first
  fire on a real kernel change; I re-seeded on the pinned oracle and **the whole diff is one line,
  `seededAt`**, every geometry value across 12 fixtures byte-identical (correct — this PR adds an op and
  modifies no existing path). But the gate cannot tell that from a re-seed where the geometry MOVED and
  nobody looked: **the only thing that made compliance safe was reading the diff** (⇒ Q16).
- **OWES:** Owner: **THIS PR IS `RISK: contract-touching` AND NEEDS YOUR MERGE** (§4 — three declarations
  moved, baseline re-based in-PR under D81). **Q15 (NEW)** — `pnpm state --rebaseline` labels exactly
  these PRs `RISK: additive`. Q4/Q5 stand as recorded. Amer: `projectView` returns `ViewCurve[]` with real
  `SubShapeRef`s — the 2D drawing view is unblocked and is his layer.
- **RISK:** contract-touching
- **FULL:** `handoff/zayd/2026-08-03-plan-section-unit.md`
- **REVIEW:** **REVIEWED 2026-08-04 by the Entry-78 session** (Zayd, a later session — the protocol
  holding for a fourth entry); full record in PR #5's review comment. ✅ **MERGED BY THE OWNER
  2026-08-05** (`173da22`) — contract-touching, so it was always theirs to merge, and it was. Item 1 re-executed: reverting the attribution to
  `ref.nodeId` reproduced **`expected length 8 but got 6`** verbatim. **ONE REAL DEFECT, PROVEN AND
  FIXED: `projectView` never called its own pre-filter** — `straddlesPlane`/`withinClip`/`levelScope`
  shipped written, exported and called by NOTHING, so a stored, validated **`clip` was silently ignored
  and a wall 50 m outside it was drawn**. §5's eight-row table has no pre-filter row, so eight green
  tests said nothing about it (row added). Measured at 10 levels × 4 walls: **4 handles into
  `sectionCut` instead of 40, 58.00 → vs 315.45 ms/call, 5.4×, ratio = level count.** ⚠ **§4
  undercounts the frozen surface — FOUR declarations moved** (`RESERVED_OPS` too). **RISK:
  contract-touching, read from the snapshot, not the label.** ⚠ **§3b's deferral rested on a FALSE
  PREMISE and is now fixed:** `frozen-surface.mjs` strips comments before hashing, so correcting
  `SectionCurve.closed` was never a contract edit — re-measured (**4 cut curves, all `closed=false`**),
  corrected, pinned. ⚠ **§3c was never actually filed in `open_rulings.md`** though the entry says it
  was — now **Q17**. Q15 extended: `_baselinedAtEntry` still reads **72**, written by nothing. Two
  comment corrections. **655 green, six gates, exit 0.**

### 76 | 2026-08-02 | Zayd | Entry 74 reviewed late — `NOTICE` said seven shipped dependencies were build-time only

- **CHANGED:** `NOTICE` (§3 rewritten, §4 split out, §5 records the correction) · `licenses/` (+7 MIT
  texts, copied from the installed packages) · `tests/notice-attribution.test.ts` (**the new gate**) ·
  Entry 74's and Entry 75's `REVIEW:` lines · `open_rulings.md` (Q14; and Q11–Q13 turned into actual
  table rows) · and, reviewing PR #3: `scripts/docs-state.mjs` + `.d.mts` (`fieldsFull`) +
  `tests/docs-budget.test.ts`.
- **VERIFIED:** **644 green**, all six gates, **real exit code 0**. **Revert-verified 3 ways on the new
  gate** — drop
  `three`'s citation → RED naming it; delete its licence text → RED twice, independently; add `vitest`
  as a runtime dep → RED naming `vitest@2.1.9`. Reviewing PR #3, item 1 re-run independently on two of
  its three claims. The runtime closure the test walks (**8 packages**) agrees exactly with
  `pnpm licenses list --prod`.
- **FOUND:** ⚠⚠ **`NOTICE` CLAIMED THE REMAINING DEPENDENCIES WERE "BUILD- AND TEST-TIME ONLY … NOT
  REDISTRIBUTED AS PART OF BUNYAN". FALSE — seven MIT packages ship in the browser bundle** (`react`,
  `react-dom`, `scheduler`, `three`, `fflate`, `js-tokens`, `loose-envify`) **and none was attributed**,
  though MIT requires its notice to travel with every copy. The sweep had been reasoned from the two
  deps already in the author's head; the lockfile settles it in half a second. ⚠ Second: the recipe
  does **not** carry "the pinned toolchain version" — `README.md` says `emscripten/emsdk:latest` and
  the build id is a hand-maintained constant asserted only against itself (⇒ Q14). ⚠ And in PR #3:
  **the new `AWAITING REVIEW` guard read only each field's FIRST PHYSICAL LINE**, so a marker that
  wrapped onto line 2 left `docs:check` green — measured. *(⚠ Entry 77: the wrap is HAND-placed, not
  prettier's — `current_state.md` is in `.prettierignore`. Defect and fix stand; the cause named here
  did not.)*
- **OWES:** Owner: **Q14 (NEW)** — pin the emsdk image by digest. **Q1–Q3 still BLOCK plan/section, a
  SEVENTH session.** Q11/Q12/Q13 stand. Amer: the "open source licences" screen now has a real list to
  render (`NOTICE` §3); before, it would have shown two entries and been wrong.
- **RISK:** additive
- **FULL:** `handoff/zayd/2026-08-02-entry74-late-review.md`
- **REVIEW:** Reviewed and merged by **Entry 77** (Zayd, a later session — the protocol holding for a
  second consecutive entry). Item 1 executed independently on the author's own cheapest claim: deleting
  the `` `licenses/three-LICENSE.txt` `` citation from `NOTICE` §3 took the gate **RED naming
  `three@0.171.0`**, and note that the bare word "three" still occurs twice in `NOTICE` at that point —
  so the citation check really is stronger than a name match, as its comment claims. **CHECKED AND
  SOUND:** the `OCCT_BUILD_ID` constant is at `kernel.ts:52` exactly as `NOTICE` §1 states,
  `README.md` does invoke the mutable `emscripten/emsdk:latest` at five sites, no third-party source is
  vendored anywhere under `packages/` or `apps/`, and **all eight** members of the closure declare **zero**
  `optionalDependencies` (the one peer, `react`, is already inside it) — counted, not recalled, so there
  is no second arrival path today.
  ⚠⚠ **ONE DEFECT FOUND AND FIXED ON THE BRANCH, AND IT IS THIS ENTRY'S OWN LESSON TURNED ON ITSELF:
  THE GATE ENUMERATED ITS INPUT SET FROM MEMORY.** `MANIFESTS` was a hand-written array of ten paths
  while `pnpm-workspace.yaml` defines the set by glob (`packages/*`, `apps/*`), so a package added
  later was invisible to all five assertions — and `.filter(existsSync)` made a renamed one drop out
  silently too. **Demonstrated, not argued:** a probe package under `packages/` declaring
  `typescript@5.9.3` as a runtime dependency, laid out exactly as pnpm lays one out, left the gate
  **fully GREEN**; against the fix it goes **RED naming `typescript@5.9.3` twice** (unattributed, and
  no licence text). ⚠ It was load-bearing rather than cosmetic: `runtimeClosure()` deliberately does
  not recurse into `workspace:` siblings, relying on each sibling appearing in that list on its own —
  two hand-maintained facts holding each other up. Fixed by deriving the list from the workspace globs,
  plus a sixth test asserting the discovered set equals what is on disk, so the input set can no longer
  go stale in silence.
  ⚠ **SECOND FINDING, SMALLER BUT IN THE LESSON TEXT ITSELF, WHICH IS WHERE IT DOES THE MOST DAMAGE:
  THE CAUSE THIS ENTRY GAVE FOR THE `fieldsFull` DEFECT IS FALSE.** It wrote — in `scripts/docs-state.mjs`,
  in this entry's `FOUND`, in Entry 75's `REVIEW:` line and in the prompt's `NEW:` — that *"these
  documents are prettier-formatted at `printWidth: 100`, so the line break is placed by sentence
  length, not by the author"*, and that the stale marker *"passed `prettier --check`"*. **`current_state.md`
  is in `.prettierignore`** (line 18), which is the only file `parseAbstracts` ever opens, so prettier
  never touches it; measured with `--ignore-path /dev/null` it does **not** conform and **288 lines
  would change** if prettier owned it. Passing `prettier --check` was therefore vacuous, not evidence.
  The defect and the `fieldsFull` fix are untouched — but the wrapping is HAND-placed, so **no
  formatter maintains those breaks and no gate is watching them**, which makes the rule stricter than
  the entry argued. Corrected at all three in-repo sites. *Note the shape: an entry whose own headline
  lesson is "a claim that quantifies over a set must be counted" shipped an unmeasured claim about a
  tool's behaviour — Entry 74's mistake exactly, three entries later.*
  `pnpm verify` **645 green, real exit code 0, six gates**; `freeze-boundary` green ⇒ additive confirmed.

### 67 | 2026-07-28 | Amer | P4.5's non-gating half — selection, view filter, the first keyboard owner

- **CHANGED:** `apps/web` only — new pure `view/viewFilter.ts` (+7 headless tests), wired into `App.tsx`
  with a View panel. Selection highlight, hide/isolate, type + discipline filters, the app's first-ever
  `keydown` handler (Esc/undo/redo).
- **VERIFIED:** 524 green · **all five gates 0 including `format:check`** · browser-verified (clean boot,
  filter/isolate/Esc exercised live, zero console errors).
- **FOUND:** the whole feature is a **pure predicate over the existing `renderParts` array** — dropping a
  part IS hide, a changed colour IS selection — so `Viewport`/`PartBatch`/`pick` are untouched.
  ⚠⚠ `format:check` passed for the first time since Entry 59 **by formatting BEFORE verify, not by luck.**
- **OWES:** nothing.
- **RISK:** additive
- **FULL:** `handoff/amer/2026-07-28-p45-selection-view-filter.md`
- **REVIEW:** pre-dates the PR flow. ⚠ Not independently reviewed.

**⚠ CHANGED 2026-07-31 (the handoff-system migration).** These entries used to sit in
`current_state.md` §7 in full. They are now **one file each** under `handoff/<agent>/`, and
`current_state.md` §7 carries a fixed-schema **abstract** for the newest ten instead. Nothing was
summarized away in the move — the bodies below are the originals, verbatim.

**Do not summarize an entry into this file until it rotates out of §7's newest ten**, and only after
checking its durable lessons are already in `current_state.md` §1–§5 (that check is what makes
compression safe — see this file's header).

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

**⚠ MOVED HERE 2026-07-31.** This ran as a chronological block at the head of `current_state.md` §5,
where it had grown to roughly thirty kilobytes and duplicated, in narrative form, entries that were
already present in §7 of the same file. §5 now carries **live priorities only**. The narrative is kept
because it records *how the freeze question moved* — which sweep was taken instead of freezing, and why
— and that sequence is not recoverable from the entries alone.

**Nothing here is a work item.** If a line below reads like a task, check `current_state.md` §5 and
`open_rulings.md`; those are the live lists and they win.

> ## ⚠⚠ THE FREEZE IS REOPENED (Entry 46, 2026-07-21) — THE MVP CHECKLIST WAS CLOSED; THE REVIT-PARITY LENS ADDED PRE-FREEZE WORK.
> **Entries 44–45 closed everything the *MVP's own checklist* owed (ⓙ door-leaf, ⑥ Clean Delta, #4, ⑧, ⑨ — 310 green).
> The 2026-07-21 strategic review then measured the product against *"will it beat Revit, with the ecosystem built?"* —
> the §1b method turned on the product itself — and the owner validated nine new decisions (D58–D66). Six add pre-freeze
> work, because the contract they lean on freezes at P5.** ⇒ **NOT ready to freeze.** Land first (imp_plan "🟠 REOPENED"):
> **Ⓐ** documentation anchoring contracts (D58 — ✅ DONE Entry 47) · **Ⓑ** element composition/nesting
> **DESIGNED + BUILT** (D59 — ✅ DONE Entry 48, the real `core.curtainwall`) · **Ⓒ** co-authoring concurrency seam on the journal+`.bnn`
> (D60 — ✅ DONE Entry 49) · **Ⓓ** family-definition data-format seam (D61) · **Ⓔ** reopen gate ⑧'s analytical-anchor (D64) · **Ⓕ** MEP/DWG/
> Design-Option reservations (D62/63/65) · **plus D66** the 4-axis scale measurement (pre-freeze). **THEN the owner-gated
> freeze (step 6).** See Entry 46 + `v1.0.0_imp_plan.md` "🟠 REOPENED" + "Road to Revit parity."
>
> ## ✅✅ ALL REOPENED PRE-FREEZE WORK IS NOW DONE (Ⓐ–Ⓕ + D66's contract half) — AND THE FREEZE IS HELD ON AMER (owner, 2026-07-24).
> **Ⓐ** docs anchors (D58, E47) · **Ⓑ** nesting (D59, E48) · **Ⓒ** merge seam (D60, E49) · **Ⓓ** family seam (D61, E50) ·
> **Ⓔ** analytical anchor ruled from the Miqdar spec (D64, E52 — side-graph suffices, `Material.thermal?` reserved) ·
> **Ⓕ** MEP/systems + Design-Options reservations (D62/63/65, E53) · **D66** the scale measurement (E54 — the
> heap-eviction CONTRACT hook needs nothing, additive by construction; heap FITS at 0.31 GB; cold load ~6.35 min).
> ⚠⚠ **THE OWNER RULED HOLD ON THE FREEZE (E54): it does NOT proceed until ALL FOUR scale axes have a number + the D8
> single-thread verdict is made. The two missing axes (draw calls, edit latency) are AMER'S browser scale page** — so for
> the first time **the last pre-freeze blocker is Amer's, not Zayd's.** The contracts are safe to freeze on scale grounds;
> the owner is holding the *act* until the *measurement* is complete. **⇒ NEXT is AMER's browser measurement, THEN the
> freeze.** See Entry 54 + `P5_step9_D66_scale_design.md` §5.
>
> ## ✅✅ AMER'S TWO AXES ARE NOW MEASURED (Entry 55, 2026-07-25) — THE HOLD CONDITION IS MET. THE FREEZE IS AN OWNER ACT.
> The browser scale page (`apps/web/src/scale/`, imp_plan P4 step 9b) ran on the real kernel + real three.js + a real GPU:
> **(b) ~30,700 draw calls / ~606 ms per frame (1.6 fps)** at the 10k-element target; **(d) incremental edit ~23 ms compute
> (FLAT vs scale — 2b works, only the 3 changed parts re-tessellate) + ~570 ms post-edit render.** BOTH axes collapse to the
> ONE-MESH-PER-PART redraw wall (~30k draw calls), which **multithreading (D8) does not touch** — the fix is renderer
> BATCHING/instancing (Amer's, additive, no contract change; `instantiate` already reserved). **D8 recommendation (RAISED,
> not decided): keep MT v1.0.x — the interactive axes don't need it; cold load is its only candidate and has additive levers.**
> **⇒ all four scale axes have a number + the D8 verdict is surfaced ⇒ the Entry-54 HOLD condition is satisfied; whether to
> FREEZE (step 6) is now the owner's act.** Nothing measured forecloses a contract. See Entry 55.
>
> ## ⚠⚠ THE SWEEP WAS TAKEN INSTEAD OF THE FREEZE — AND IT FOUND ONE (Entry 57, 2026-07-25). D67 FIXED; THE FREEZE IS AGAIN THE OWNER'S ACT.
> Offered FREEZE NOW vs one more adversarial sweep, **the owner chose the sweep** (*"fix it, and keep sweeping"*) and **decided
> D8 — multithreading STAYS v1.0.x.** The sweep found **D67**: D65's exclusion invariant — which D65 had deliberately placed
> *inside the frozen contract* so Bunyan, Planitor and Miqdar would share ONE rule — **read only an element's own option tag and
> was handed no model**, so a consumer counted **4 windows where 1 was correct**, three of them hosted on the wall the same rule
> had just excluded. Pre-freeze because the defect is in the **signature** of a helper three products will call. **Fixed +
> revert-verified** (`expected 4 to be 1`); 387 green. ⚠ **The sweep's second finding is NOT freeze-blocking but is the moat's
> critical path: THE MODEL CANNOT BE ENUMERATED** — `scene.elements` misses generated children (**1 row, 17 real elements**),
> includes non-active options, and includes voids (`quantities()` still throws on the first Opening, as measured 2026-07-14 —
> **§1c-7's disease, third occurrence**). One query serves the roll-up, schedules and the Clean Delta alike. **⇒ no contract
> foreclosure beyond D67; the contracts are safe to freeze, and the freeze is the owner's act.**
>
> ## ✅✅ THE ENUMERATION QUERY + THE CLEAN DELTA EXPORTER ARE BUILT (Entry 58, 2026-07-25) — 412 green. THE FREEZE IS STILL THE OWNER'S ACT.
> Entry 57's second finding is discharged: `modelElements()` / `projectQuantities()` walk the D59 children tree, apply the
> D67 option cascade, skip no-own-parts elements **by construction**, and report the unmeasurable rather than zeroing or
> dropping it (owner Q1). The 42-day-old crashing exit criterion answers — *"how much C25/30 is in this building?"* = **3.18 m³**.
> The **Clean Delta exporter** ships on top (`contract_version 1.1`, `source bunyan`, Planitor v2.2 §4 field-for-field) with
> the journal rewind + bounded prior rebuild (owner Q2) and a **published JSON Schema** (Planitor D11).
> ⚠⚠ **Building it found TWO real defects, and the second is on the moat's load-bearing sentence:** a generated child's Type
> was unrecoverable from the built tree (so a curtain-panel schedule had nothing to group by); and **the journal was not
> recording the associative cascade at all** — 13 commands declare `rebuilt: []`, so *"a Level moved and 400 walls
> re-quantified"* reached a consumer as **`unchanged`**. Both fixed + revert-verified. ⚠ **Nothing frozen moved.**
> **⇒ §1c-7's disease, FOURTH occurrence** — a design doc named a field and nobody read it against the code. See Entry 58.
>
> ## ✅✅ THE ASSERTED-BEHAVIOUR SWEEP RAN (Entry 59, 2026-07-26) — AND IT FOUND TWO MORE. D68. 428 GREEN. THE FREEZE IS STILL THE OWNER'S ACT.
> The owner took Entry 58's raised judgement call over the freeze, and authorised the push (`origin/main` `6ec5139 → 2dd2215`,
> Entries 57+58 — **Amer had been two entries behind**). The sweep asked *"which asserted behaviours have no test that would
> fail without them?"* and answered it **mechanically**: enumerate every site that iterates `scene.elements` (14), ask of each
> *"does this aggregate or publish?"*. **Two consumers had never obeyed the D65 exclusion invariant.** The **room solver**
> reported **10,640,000 mm² where 18,240,000 is correct** (a 42% under-report on a room that is *entirely main-model*); the
> **join resolver** was sharper still because it corrupts the **built B-Rep** — *miter-against-a-ghost*, and the **AMBIGUITY
> FLIP**, where adding a facade variant that reaches an existing corner **silently un-miters a main-model corner nobody
> edited**. ⚠⚠ **THE LESSON GENERALISES PAST OPTIONS: D65 put the rule in the frozen contract and D67 fixed its signature —
> both bind the NEXT consumer and do nothing about the ones already written** (both of these shipped 07-18; the rule landed
> 07-23). **A correctness rule added to a mature codebase must be swept BACKWARD. No rule here had ever had that sweep.**
> Fix is additive (optional selection args defaulting to each set's primary + `optionScopeOf()` so the SCOPE is shared too);
> nothing frozen moved. **⇒ the freeze remains unblocked and is the owner's act.** See Entry 59 + D68.
>
> ## ✅✅ THE REMAINING BACKWARD SWEEPS RAN (Entry 60, 2026-07-27) — AND ALL THREE CAME BACK DIRTY. D69/D70/D71. 440 GREEN. THE FREEZE IS STILL THE OWNER'S ACT.
> Entry 59 listed three rules as still unswept and priced them *"cheap now, a three-product amendment after the
> freeze."* All three were swept and **all three were broken.** **Rule 16** — `partnersAt` matched endpoint-to-endpoint
> only, so a partition landing on a wall's MID-SPAN kept its plain cap and drove its last half-thickness INSIDE the
> through wall: **2.8800 m³ reported where 2.8320 m³ is true**, `basis: 'exact'` — and the over-report is *fixed per
> junction*, so it scales with the NUMBER of partitions. ⚠⚠ **A green test had pinned that exact fixture for a week**
> and asserted only the geometry and the contract-additivity, never the quantity. **Rule 12** — the published Clean
> Delta keyed materials by **display name** (rename ⇒ every work package re-keys; two materials sharing a name merge;
> an unresolvable material emits its id AS the name) while `totalsByMaterial` had always keyed by id. **Rule 5** — a
> count settled it: **51 types · 39 commands · 1 codec (in a test) · 0 views**; `FormatCodec`/`ViewDefinition` carried
> no behaviour and nothing dispatched through either, so **D63 discharged a freeze-gate row on a test that would have
> passed had `FormatCodec` been `{id}`** (its conclusion survives; its evidence did not).
> **Fixed: mid-span auto-butt (D69) · `contract_version` 1.2 with `materialId` required (D70) · `read`/`write` +
> `codecFor` + `BNN_CODEC` (D71).** All additive — no frozen byte, no schema bump, no field or verb. **⚠ OWED
> CROSS-PROJECT: `../Planitor/v2.2_spec.md` §4 must move to 1.2.** See Entry 60 + §1c-8's ledger.
>
> ## ✅✅ RULES 13 AND 15 SWEPT TOO (Entry 60 cont., 2026-07-27) — 13 CLEAN AND NOW MEASURED, 15 DIRTY TWICE. D72. 451 GREEN.
> **Rule 13 is the SECOND rule ever to come back clean** — and, like rule 6, it is now clean *by measurement*: a new
> suite pins that the PEI survives undo→redo, resize, re-issue and save→load→rebuild, and that a D59 child keeps its
> derived PEI across an edit that does not touch its slot. It had been true **by construction and by nothing else** —
> change `redo()` to re-execute instead of re-applying and every downstream binding breaks with no test going red.
> ⚠ One real defect on the way: **seven doc sites** described the derived PEI as `${parentId}/${slot}` where the code
> uses `:`; `/` is a `SubShapeRef` separator that `commands.ts` refuses in a part name, so the documented format could
> not have worked. Corrected, with the fact now exported as `DERIVED_PEI_SEPARATOR` and asserted.
> **Rule 15 was dirty on two roads (D72).** `canonical.length` was reconstructed from a param while `volume` beside it
> was measured — **2.00 m reported for a 1.9 m solid, both under one `basis: 'exact'`**, a package contradicting itself.
> And **`area` was the solid's total enclosing surface: 94.80 m² on a 15 m² paintable face.** ⚠⚠ **THE AREA FIX IS THE
> SESSION'S ONE CONTRACT CHANGE — `BuiltPart.exposedRefs?`, owner-ruled and reserved PRE-FREEZE** because only a Type
> can say which of its faces a trade bills. Openings then fall out for free (30 m² → 26 m², reveals excluded).
> **⇒ SWEEP LEDGER: 6 rules swept, 4 dirty (5, 12, 15, 16 + the D68 option invariant), 2 clean (6, 13).**
>
> ## ✅✅ THE `exposedRefs` DEBT IS PAID AND RULES 1/3/9/10 ARE SWEPT (Entry 62, 2026-07-27) — 1 AND 3 DIRTY (D74), 9 AND 10 THE FIRST CLEAN PAIR. 470 GREEN. THE FREEZE IS STILL THE OWNER'S ACT.
> Entry 61's NEXT list owed the `exposedRefs` declarations for `core.opening`/`core.curtainwall`; measured first, they were out by
> **1.07× (door leaf) · 1.71× (frame) · 2.06× (glass panel) · 3.03× (mullion)**, all wearing `basis: 'exact'` — while the façade
> ROLL-UP was out by only 1.19×, because the panels dominate the sum and were the least wrong. *A plausible total is how a per-part
> defect survives inspection.* The owner ruled **ONE rule for every Type — *exposed = every face that is a surface of the assembled
> thing*** — over the competing QS convention for glass. ⚠⚠ **Building it found `exposedRefs` reached 3 of the 4 `BuiltPart → Part`
> sites: a door leaf could not have carried a billable area even when its Type declared one** (`placeTree` spreads and inherited it;
> the three that enumerate fields did not — §1c-8 inside one commit). **Then rules 1 and 3 came back dirty together (D74): a broken
> reference OUTLIVED the element it named** — deleted elements are never rebuild roots, so the entry survived every rebuild
> *including `rebuildAll`*, was saved into the `.bnn`, and could never be retargeted ⇒ a document permanently and unfixably dirty.
> **Rules 9 and 10 are the first ever swept clean without a fix — and the reason is transferable: a violation of either could not have
> been written silently** (`validateParams` refuses an undeclared arg; `dryRun` and `applyChanges` live in the executor, where a
> command cannot opt out). ⇒ **nothing frozen moved; the freeze remains the owner's act.** See Entry 62 + D74 + §1c-8's ledger.
>
> ## ✅✅✅ THE BACKWARD SWEEP IS COMPLETE — ALL 18 DOMAIN RULES SWEPT (Entry 64, 2026-07-28). THE LAST FIVE: 14 AND 18 DIRTY (D76/D77, FIXED), 8 DIRTY AND SURFACED, 7 AND 17 CLEAN. 503 GREEN. THE FREEZE IS STILL THE OWNER'S ACT.
> **Rule 14 (D76) — the change feed could report SILENCE it had no right to.** Every mechanical half was sound and tested; the
> PRECONDITION was not. `issued_at_seq` names a position in the journal and **nothing checked the journal contained it**, so
> `since()` on a log that cannot see the baseline returns `[]` — identical to *"nothing has happened since I issued it."*
> Measured on a wall grown 6 m → 8 m after the baseline: a `.bnn` carrying its revision but no `history.json` published a valid
> **contract-1.2 package with zero elements and an all-zero summary**; one saved with `doc.history()` (the undo stack) instead
> of the journal **dropped a whole wall built after the baseline** once the 200-cap shifted. Planitor reads absence as
> *unchanged* ⇒ it keeps billing the model it has. ⚠ The detector is structural — **D41 keeps an issued revision off the undo
> stack**, so that log *cannot* contain the anchor. Refused now at all three sites, incl. `saveBnn` refusing to WRITE a file
> whose journal contradicts its own manifest; a scene-only `.bnn` stays legal and is refused only when asked for a delta.
> **Rule 18 (D77) — a style edit did not reach the CHILD elements wearing it.** `BuiltChild.styleId` is a real member and the
> build resolves it exactly as for an authored row, but the style→instance edge answered out of `scene.elements` and **a
> Model-A child is not a scene row**: `updateStyle` reported **`rebuilt: []`** and left the children's solids **3× stale**
> (20,000,000 mm³ where 60,000,000 is right) under `basis: 'exact'` — until an unrelated `rebuildAll` silently cured it, so the
> live session and the saved file disagreed and only the file was right. The section edge inherited it verbatim. ⚠ It was
> dirty against the **INVALIDATOR** while clean against every consumer — the Entry-59 sweep form could not have found it.
> **⚠⚠ RULE 8 — DIRTY AND SURFACED, NOT FIXED (owner ruling owed, cheap only until step 6):** the sweep asked *what has been
> BUILT since the reservations were made* (D58–D66 landed 07-21→07-24; D67–D75 + Entry 63 after) and found that
> **`BuiltPart.exposedRefs` (D72, 07-27) is Type-only knowledge and the D61 FAMILY GRAMMAR has no slot for it** ⇒ every
> data-authored family can only ever report the absent-defaulted whole-solid area, the number D72 measured at 1.07×–3.03×
> wrong. **The families north-star would ship permanently unable to bill correctly.** The fix is a grammar shape (how DATA
> names a face), which is a design ruling, not a mechanical change. **Rules 7 and 17 came back clean** — 7 by counting every
> boundary (and it is now ENFORCED: `tests/units-rule7.test.ts` fails on any numeric field shipped without a unit; it was the
> first rule found clean with nothing protecting it), 17 *by shape* (a `Dimension` has no value field to go stale) with one
> surfaced finding: **`Dimension.anchors` accepts the free `point` anchor**, so a dimension between two paper points — a
> number no model edit will ever update — is expressible on the one annotation a builder reads AS a measurement.
> ⇒ **no frozen byte moved, no `SCENE_SCHEMA_VERSION` bump, no field, no verb** ⇒ the freeze remains the owner's act.
>
> ## ✅✅ THE SCHEDULES BODY SHIPS (Entry 65, 2026-07-28) — D58 row Ⓐ's FIRST BODY, AND THE WRONG LOOP WAS INSIDE THE RESERVATION'S OWN PASSING TEST. D78. 517 GREEN. THE FREEZE IS STILL THE OWNER'S ACT.
> Design-first as the task required (`P5_step6B_schedules_design.md`, four questions, all four ruled). **Measured before designing:**
> a curtain-panel schedule over `scene.elements` returns **0 rows where 6 is correct** (a curtain wall is **1 authored row, 17 real
> elements**) — ⚠ *the failure mode is an EMPTY TABLE, not a crash*; a no-filter schedule **THREW** on the pure composite; and one
> non-active design option produced a **2.0000× over-report** — **D65's own named failure mode, on the consumer its sentence names
> FIRST and the only one that never had a body to fix.** ⇒ **the body consumes `modelElements()` and has no enumeration loop of its
> own, which IS its correctness** — all three close by that one decision. ⚠⚠ **THE DURABLE LESSON IS WHERE THE WRONG LOOP LIVED: it
> is the `evaluate` helper Entry 47 wrote to PROVE the reservation, green from the day it was written because its fixture is two
> plain walls.** §1c-7's disease in a new form — **the misleading artifact was a PASSING TEST, not prose**, which is worse, because
> this project's method trusts tests over claims. Retired onto the real body in the same commit. **Three pre-freeze rulings, all
> found by walking the reserved shape against a real model for the first time:** `groupBy` names **stable column keys** (the heading
> reading is **D70 verbatim**, caught before the shape had a body) · `ScheduleDefinition.designOptionIds?` reserved (`ViewCommon`
> got D65's field and the tabular view did not) · `ChildOverride.mark?` reserved (a D59 child is not a scene row, so nothing could
> carry the label a builder reads). ⚠ **Two defects in my own code, both the same conflation one level down** — a total went absent
> where 250,320,000 mm³ is right because *"no quantity by construction"* was read as *"could not measure"* (**D72's `[] vs absent`
> by a new road**), and a wholly-unknown column got no total entry at all (**rule 14's silence-as-a-fact**). Revert-verified five
> ways. **Nothing frozen moved ⇒ the freeze remains the owner's act.** See Entry 65 + D78.
>
> ## ✅✅ THE SCHEDULE CRUD SHIPS (Entry 68, 2026-07-29) — D58 row Ⓐ's SECOND UNIT. 538 GREEN, ALL FIVE GATES 0. THE FREEZE IS STILL THE OWNER'S ACT.
> The reserved shape had a reader (D78) and **no writer**: **0 of 29 commands could author a schedule**, and no documentation verb of any
> kind existed — so v1.0.0's "one schedule" (D58) could be evaluated but never created, renamed or deleted. `core.createSchedule`/
> `updateSchedule`/`deleteSchedule` land as ordinary additive registry entries (Entry 47 §7 had settled the freeze question in advance),
> and `scene.schedules` is promoted to a full `SceneCollection` — undo + a declared "nothing" dependency edge, the exhaustive switch
> refusing to compile until it was declared (Entry 33's mechanism, verified by deleting the case).
> ⚠⚠ **THE SENTENCE THAT SHAPES THE UNIT: the verbs carry the refusal the body deliberately will not.** `projectSchedule` degrades rather
> than refuses because a projection must never deny a builder his table (rule 17) ⇒ **the authoring door is the only place a malformed
> definition can be stopped, and there was no authoring door.** Measured before it existed: a `groupBy` naming a column the schedule lacks
> **collapses 2 groups into 1 keyed `[""]`** — every subtotal becoming the grand total, which is **Q1's own failure mode arriving through
> the one door Q1 did not cover**; a `quantity` key outside the grammar makes every cell **and the TOTAL NaN**, and NaN JSON-stringifies to
> **`null`**, so it reaches a consumer as *"no value"*; an unknown `source` is a raw **TypeError**; **two columns sharing one key** give 2
> headers and **ONE total** (`checkLayers`' rule one level up).
> ⚠⚠ **AND THE PROMOTION ITSELF TAUGHT SOMETHING THE DESIGN DOC HAD PREDICTED WRONG:** row Ⓐ §6 said the CRUD adds *the collection member +
> an `emptyScene()` entry + the guard*. The `emptyScene` entry turned **two GREEN Entry-47 reservation assertions RED** — and relaxing them
> was the tempting move and the wrong one. ⇒ **the collection materialises on first authoring instead**, Entry 47's tests pass
> **unmodified**, and a document with no schedules is byte-identical to one written before. *Even a design doc's own prediction of how an
> additive promotion lands is a claim that only building it can check.*
> ⚠ **`Referrer.redirect` is now OPTIONAL** (a Sheet's viewport can place a schedule, and `sheets` is a collection nothing authors — so
> D51's SET rung genuinely does not exist for it; the gap is in the type, not in the behaviour). ⚠ **One contract-touching line:
> `ParamField.refTo` gained `'schedule'`** (row Ⓕ's precedent; `view`/`sheet`/`annotation`/`family` deliberately left to the owner).
> ⚠ Also fixed: `schedule.ts` carried a **raw NUL byte** that made the file **invisible to `grep`** — on a project whose method is
> grep-based backward sweeps. Revert-verified ten ways. **Nothing frozen moved ⇒ the freeze remains the owner's act.** See Entry 68 + D79.
>
> ## 🟡 THE PLAN/SECTION DESIGN IS DELIVERED AND THE BUILD IS BLOCKED ON FIVE RULINGS (Entry 69, 2026-07-30, Zayd). NO SOURCE TOUCHED. THE FREEZE IS STILL THE OWNER'S ACT.
> D58 row Ⓐ's last two units, design-first (`P5_step6C_plan_section_design.md`) because a projected 2D view is a new KIND of
> derived artifact and D58 froze only its ANCHORING shape. **Measured first, against native OCCT (seven probes, all deleted) —
> and the headline is a contradiction inside the FROZEN protocol's own comment.** `SectionCurve.ref` says provenance is
> *"absent only where a curve has no single owner (a silhouette of a curved surface)"*; **measured, that exception is the ENTIRE
> PROJECTED HALF.** The CUT curves attribute perfectly — **4/4, 1/1 and 8/8 with zero orphans** on a 3-layer wall, a round column
> (the §1c-6 repeat offender) and a wall cut THROUGH its window — via `BRepAlgoAPI_Section.Generated()`, which is OCCT's own
> history, the channel D24 measured. The PROJECTED curves cannot attribute at all: HLR's output **shares no topology with the
> input (0 of 4 `IsSame()`)** and its finest supported granularity is the whole solid (`VCompound(shape)`, verified a genuine
> partition: 4+4=8, overlap 0) — and **`SubShapeKind` has no `'solid'` member for that to degrade into**, so a plan's projected
> half would be *anonymous polylines*, the exact outcome the op's own comment calls *"a picture, and pictures go stale."*
> ⚠ **Nothing is broken today** — no body reads the field, no `.bnn` carries a projected curve — **which is precisely why it is
> free now and an amendment across three products after P5.** ⚠ The dead end was CHECKED, not asserted: `HLRBRep_Data` does hold
> the original topology (`EdgeMap`/`FaceMap`), so per-edge provenance is a from-scratch re-implementation of an OCCT class in our
> own C++ — real work of unknown size, named so nobody re-derives it. ⚠ **A scale number the design turns on: the cut is FLAT at
> 1.28–1.31 ms/solid; HLR RISES (0.55 → 0.91 → 1.59 ms/solid), so 10× the solids costs 29× the time (≈ N^1.5).** Both measured
> facts point the same way ⇒ **recommend `mode:'cut'` only for v1.0.0**, where every curve carries full identity and the drawing
> is genuinely annotatable. ⚠ **`sectionCut` MINTS NOTHING** — a query op like `measure`/`faceFrame`; a cut curve BORROWS the
> owner face's existing token, so the tempting repair for an anonymous polyline (match it back to a face geometrically) is the
> one thing D1 forbids, and the doc says so because the likelier failure is that someone does it quietly. **Five questions put
> (§7); Q3 is Entry 68's owed `refTo` ruling, now BLOCKING a unit.** Nothing frozen moved ⇒ the freeze remains the owner's act.
>
> ## 🟡 P4.5 THE INTERACTION MODEL — DESIGN DELIVERED, AWAITING SIX OWNER RULINGS (Entry 66, 2026-07-28, Amer). NO SOURCE TOUCHED.
> The owner chose P4.5 (design-first) as Amer's task. `P4.5_interaction_model_design.md` is written and grounded against the
> real `apps/web` seams (it names `Viewport.ts`/`pick.ts`/`mesh.ts`/`runner.ts` by file): **no move verb exists** (re-verified,
> row ⓑ); the renderer already retains the `MeshBuffers` a snap needs; the kernel already has the exact spatial ops but **no
> seam lets the UI reach them** — that read-only two-tier snap seam is the phase's real work. Spine: domain rule 17 (a tool
> collects input, only a command changes the model) · the tool state machine · the two-tier snap seam (browser index + kernel
> confirm) · preview-is-never-truth · numeric entry. **The two pre-freeze rows are surfaced with proposed shapes and flagged
> freeze-SAFE-but-not-free (Entry 45's judgement stands): ⓑ the move/placement arg shapes (Q4) and ⓘ exercising
> `UndoableEdit.transactionId` via the corner-drag (Q5) — D52 already made "drag the wall's end" one `setParams` edit.**
> ⚠ **The design-first spine is BLOCKED on Q1–Q6 (design §12).** Nothing frozen moved ⇒ the freeze remains the owner's act.
> See Entry 66 + D47.
>
> ## ✅ P4.5 NON-GATING HALF SHIPPED — SELECTION + VIEW FILTER + THE FIRST KEYBOARD OWNER (Entry 67, 2026-07-28, Amer). 524 GREEN, ALL 5 CI GATES 0.
> Owner said "go for next entry"; the spine waits on Q1–Q6, so per Entry 66's own "NOT RULED" branch I built the part of P4.5
> that needs no ruling and touches no frozen contract (design §7/§8): **selection highlight · hide/isolate · type + discipline
> view-filter · the app's first-ever `keydown` handler** (Esc/undo/redo). The one decision: it is a **pure predicate over the
> existing `renderParts` array** — dropping a part IS hide (the viewport's `plan.remove`), a changed colour IS selection (the
> existing recolour path) — so `Viewport`/`PartBatch`/`pick`/every seam are untouched. New pure `apps/web/src/view/viewFilter.ts`
> (+7 headless tests); wired into `App.tsx` with a View panel. Browser-verified (clean boot, filter/isolate/Esc exercised live,
> zero console errors) + headless (524 pass). ⚠⚠ **`format:check` PASSES for the first time since Entry 59 — by formatting
> BEFORE verify, not by luck.** Nothing frozen moved ⇒ the freeze remains the owner's act. See Entry 67.
>
> ## ✅✅ P4.5's SIX RULINGS TAKEN AND THE TOOL LAYER SHIPS (Entry 70, 2026-07-30, Amer). 578 GREEN, ALL 5 GATES 0. THE FREEZE IS STILL THE OWNER'S ACT.
> Q1–Q6 all ruled and applied into `P4.5_interaction_model_design.md` §12, which is now the phase's DECISION RECORD rather than
> its open questions. Built, all `apps/web`: **the SPATIAL-QUERY SEAM the plan said was missing** (`tool/QueryGateway.ts` — Tier 2,
> read-only, and its four ops are named as explicit OVERLOADS so *the type signature is the allowlist*: `makeBox` does not
> typecheck there, which is D19 made structural instead of commented) · **Tier-1 snapping** (`tool/snap.ts` — pure, the projection
> INJECTED, so all of it is headless-verified and only the camera lives in GL) · the **tool state machine** + registry · **numeric
> entry** · the **preview layer** · **hover** · **multi-select**. **Domain rule 19** adopted into `core_logic.md` §8.
> ⚠⚠ **NUMBERED 19, NOT 17, AND THE CORRECTION IS THE POINT:** the design doc claimed the only "rule 17" collision was a
> `schedule.ts` code comment and that §8 ran to sixteen rules. **Both halves were false** — §8 already carries a numbered rule 17
> (D58) and 18 (D59), and §1c-8's own ledger says *"ALL EIGHTEEN RULES SWEPT"*. *The claim was written from memory of the rule
> list rather than from the list; the check cost one grep.*
> ⚠⚠ **AND THE §1b FINDING IS WHY THE PHASE WAS BUILDABLE AT ALL: THE APP HAD NEVER REGISTERED THE WALL THIS DESIGN REASONS
> ABOUT.** `bootstrap.ts` was still on the scaffold `core.wall.v1` (`{length,height}`), whose own header has said *"when P5's
> types arrive, register those instead"* since P4 — **P5's D52 baseline `core.wall` landed in Entry 42 and nobody switched**, and
> `apps/web/package.json` did not even depend on `@bunyan/types`. Two clicked points have **nowhere to land** on a wall with no
> baseline ⇒ registering the real types was a PRECONDITION of the wall tool, not a tidy-up. *§1c-7: a phase's exit criteria are a
> specification, and this one silently depended on a swap nobody had made.*
> ⚠⚠ **ONE REAL BUG, FOUND ONLY BY DRIVING THE TOOL IN A REAL BROWSER:** typing `5000` into the numeric field produced **`0`** —
> React batches, so four keystrokes in one tick all read the same stale closed-over value and each overwrote the last. **Slow
> human typing hides it completely**, which is to say it is invisible to exactly the manual test one would perform. Fixed at the
> source (handlers read refs) *and* pinned by extracting `applyNumericKey` as a **pure reducer the suite threads a key SEQUENCE
> through** — *the bug was not in the arithmetic but in who owned the state, so the test that guards it must feed the state in.*
> **MEASURED, not asserted** (browser, real OCCT + real GPU, through the DOM/`window` path — ⚠ a screenshot TIMED OUT on the
> animating canvas exactly as `Amer_Prompt.md` warns): a wall drawn with two clicks committed **exact grid coordinates**; typing
> 5000 gave a baseline of **exactly 5000.000000 mm**; an abandoned gesture left elements and journal **byte-identical** (rule 19);
> and the same edit through `window.bunyan` produced the **same command, changes and params** (§11 criterion 2 — the `rebuilt`
> count differed by one and it was CHECKED: the agent's wall is coincident, so it re-stages the tool's own wall).
> ⚠⚠ **ROWS ⓑ AND ⓘ STAY OPEN AND ARE NOW ZAYD'S:** Q4's five move verbs and Q5's `transactionId` atomicity are
> `packages/document`, and a new verb is a contract change Amer escalates rather than performs. **`transactionId` has ZERO readers
> today** (measured: declared `undo.ts:109`, one comment `document.ts:802`), so a corner-drag would produce three undos however it
> were labelled — **a gesture that LOOKS transactional and is not was deliberately not shipped.** Entry 45's freeze-SAFE
> judgement stands; neither blocks the freeze. Nothing frozen moved. See Entry 70.
>
> ## ✅✅ STEP 0 IS CLOSED — BOTH SOLVERS + 0c JOINS ARE BUILT + GREEN (0d E40, room-bounding E41, 0c E42).
> All of D50 step 0 is done: **0a–0g**, **0d (real planegcs, D26 revert-verified)**, the **room-bounding
> solver (D55, Entry 41)**, and now **0c wall-to-wall joins (Entry 42 — auto-miter, anti-fuse gate green,
> the real D52 Wall pulled forward into `@bunyan/types`).** ⚠⚠ THE ANTI-FUSE RULE HELD (a join reshapes only
> the cap; side faces keep their tokens, D26). The types (steps 4–5) + MVP gates are also DONE (Entries 44–45).

---

## §E — post-D82 turns (`T-nnn` / `STEWARD-slug`, no more sequential numbers) — full bodies in `handoff/`

Entries 1–90 keep their legacy numeric heading (`AGENTS.md` §2); a turn after D82 (2026-08-14, Entry 91) is
titled by its task id instead, so this section's headings are `T-nnn`/`STEWARD-slug`, newest first, the
same as `current_state.md` §7.

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
  step 1 found. See the review entry (rotated alongside this one; both were already in `current_state.md`
  §7) for the record — `T-015 — review: the fix holds, backward sweep and weak-green clean`.

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
- **REVIEW:** n/a — this IS the review turn (`AGENTS.md §1.2`); the verdict is on the build entry,
  rotated alongside this one.

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

### STEWARD-two-step-high-risk-review — `risk: high` takes two review turns, not the owner's merge — 2026-08-15 — seat: brahim

- **CHANGED:** `docs/decisions.md` (**D88** NEW) · `AGENTS.md` §1.2 (the rule) and §5 (`risk: high` named
  as not owner-gated) · `REVIEW.md` (a `Two steps` section; item 7 warns that only step 2 merges) ·
  `docs/prompts/brahim-orchestrator.md` §4c (`contract-touching` still stops the loop, `risk: high` no
  longer does) · `docs/BACKLOG.md` (READY criterion 8; **T-014** NEW). No `packages/`, no `apps/web`, no
  script or test touched.
- **VERIFIED:** `pnpm verify` green. `AGENTS.md` held at its 200-line cap by turning the §1.3 loop
  paragraph and the §2 abstract-heading note into pointers — both already said it in full in
  `docs/prompts/*` and D82.
- **FOUND:** Three files gave three answers about what `risk: high` meant — `agent-finish.mjs` wrote
  `NEXT TURN: REVIEW ONLY`, the orchestrator treated it as owner-gated, and `AGENTS.md §5`, which defines
  owner-gated, never listed it. ⚠ **A cross-account second reviewer does not exist for a box builder PR:**
  `zayd` opens on `davidian-abdo` and `khalihlna` holds that same account, so GitHub refuses its approval
  — the two steps are therefore the same seat in separate sessions, and independence comes from the
  session boundary. The owner declined rearranging seat accounts to buy a second approver.
- **OWES:** `zayd` — **T-014** (`--review` reads the frozen surface and never the task's `risk:`, so it
  stamps a `risk: high` row `done` after step 1; measured on T-008), and the two T-008 review defects,
  which go back to the existing claim on that branch rather than a new row. `hmdnah` — T-008 step 2,
  after the fix. The `## Discovered` entry recording the `--review` defect is on the T-008 branch and is
  closed there, not here.
- **RISK:** additive
- **FULL:** `handoff/brahim/2026-08-15-STEWARD-two-step-high-risk-review.md`
- **REVIEW:** **Reviewed by `hmdnah` (2026-08-15, PR #24) — APPROVED and MERGED**, `RISK: additive`, two
  unswept documents fixed on the branch. The entry above is the record.

### T-007 — a dangling `designOptionId` is a broken reference, derived rather than stored — 2026-08-15 — seat: zayd

- **CHANGED:** `packages/document/src/document.ts` (**`danglingDesignOptionRefs` NEW**; `brokenRefs()`
  returns the stored geometry-derived list plus it) · `packages/document/src/designoptions.ts` (comments
  only — `ownTagActive` and the file header name the body instead of promising it) ·
  `tests/design-option-refs.test.ts` (**§4 NEW, +3**) · `tests/option-cascade-d67.test.ts` and
  `tests/model-enumeration.test.ts` (one fixture assertion each, §6 below) · **Entry 82 rotated** to
  `docs/history.md` §C, which is now contiguous over 54–84. No frozen byte, no verb, no schema bump.
- **VERIFIED:** **836 green** across 94 files, all six gates, real exit code 0, real OCCT throughout;
  `freeze-boundary` green ⇒ the frozen surface has not moved. **Revert-verified**: return `brokenRefs()`
  to `this.#scene.brokenRefs` and `design-option-refs` goes **2 RED** — `expected [] to have a length of
  1 but got +0`, which is the silence itself.
- **FOUND:** ⚠ **It is derived at the query, not staged into `scene.brokenRefs`.** `#stage` re-derives
  that field only for the assemblies it rebuilds, so an entry staged there goes stale on every element
  whose assembly the next partial rebuild does not touch — D74's defect in a population whose subject is
  not even a rebuild root. A dangling tag is a pure fact about `scene.elements`, so reading it is cheaper
  than teaching the staging filter to tell two producers apart, and D74's one-producer invariant on
  `scene.brokenRefs` stays intact. ⚠ `hostId` is the element's own id: the reference is hosted on
  nothing, and widening the watched `interface BrokenReference` would make a diagnostic field
  contract-touching — no consumer reads it. ⚠⚠ **The backward sweep (invariant 7) cost six tests in two
  files, all one shape:** `option-cascade-d67` and `model-enumeration` tag elements and supply the
  catalogue as a consumer OVERRIDE, which is the only road while `scene.designOptions` has no authoring
  verb, and both assert `brokenRefs()` empty to mean *"no window lost its host face"*. Each now filters
  the option ids instead. ⇒ **until the catalogue CRUD lands (D85, T-011), every tagged element on this
  product is a broken reference** — D86 reporting the truth, not a false positive.
- **OWES:** `hmdnah` — this PR; the revert above is the one to re-execute. `amer` — ⚠ `App.tsx`'s
  Problems panel hints *"these elements are hosted on a sub-shape that no longer resolves. Retarget them
  manually"*, which is now wrong for an option entry: it is hosted on nothing and
  `core.retargetReference` cannot heal it. `unverified here: how the panel reads with an option entry in
  it — khalihlna to confirm`. `brahim` — D86's row still reads ✅ RULED and this builds it; T-008's (c)
  half extends this union rather than adding a second surfacing path.
- **RISK:** additive
- **FULL:** `handoff/zayd/2026-08-15-T-007-dangling-design-option-ref.md`
- **REVIEW:** **Reviewed by `hmdnah` (2026-08-15, PR #22) — APPROVED and MERGED**, `RISK: additive`, on
  `narutousomaki741` — the account that did not open it. Item 1 re-executed twice (2 RED both times); the
  six-test sweep re-executed and its filter proven to hide nothing. One contract-doc fix on the branch;
  no defect found in the code. The entry above is the record.

### T-007 — review: the derivation is right, and domain rule 3's text had not been widened to admit it — 2026-08-15 — seat: hmdnah

- **CHANGED:** `docs/contracts/core_logic.md` — domain rule 3 gains the second broken-reference class ·
  **Entry 85 rotated** to `docs/history.md` §C, now contiguous over 54–85. The code is merged as authored.
- **VERIFIED:** `pnpm verify` green, **836 across 94 files**, real exit code 0. Item 1 re-executed twice:
  `brokenRefs()` returned to `this.#scene.brokenRefs` is **2 RED** (`expected [] to have a length of 1 but
  got +0`), restored **8/8 green**. The sweep re-executed: both files' original `toHaveLength(0)` gives
  **6 failed | 25 passed**, and printing the lists shows exactly the two tagged walls per fixture and no
  masked host-face entry. `brokenRefs()` timed on a hand-assembled 10,000-element scene: **3.288 ms/call
  with one tag, 3.822 ms/call with all 10,000** — one call site, in a `useMemo` keyed on document version.
- **FOUND:** ⚠⚠ **The new broken reference is not retargetable by any verb** — `core.createElement` is the
  only writer of `designOptionId` — which is what rule 3's own D74 note forbids (*"a refusal nobody can act
  on … a lie about the model's state"*). It survives that test only because it is **derived and never
  stored**: it enters no `.bnn` and clears the moment the option resolves, so deriving at the query is
  load-bearing for rule 3 and not only for staleness. The contract recorded one class and the code now
  ships two, so rule 3 gained the sentence (`AGENTS.md §3` row 1). ⚠ Staging it instead would have gone
  stale exactly as claimed: `#stage` keeps any entry whose element's assembly is not a rebuild root, so a
  wall's entry would outlive the `core.createDesignOption` that resolves its tag.
- **OWES:** `amer` — the `App.tsx` Problems-panel hint the entry above already names;
  `unverified here: how the panel reads with an option entry in it — khalihlna to confirm`. `brahim` —
  T-008 is now the next box row, and D86's *"build them together"* note means its (c) half extends this
  union rather than opening a second surfacing path.
- **RISK:** additive
- **FULL:** `handoff/hmdnah/2026-08-15-T-007-review.md`
- **REVIEW:** n/a — this IS the review turn (`AGENTS.md §1.2`); the verdict is on the entry above.

### T-004 — review: the flatness result holds, and the harness passed while building nothing — 2026-08-15 — seat: hmdnah

- **CHANGED:** `tests/document-build-cost-scale.test.ts` — the cold load's built solids are counted and
  required to equal the authored count. `scripts/agent-finish.mjs` — `setRowStatus` hoisted, exported and
  **repadded** (+ `scripts/agent-finish.d.mts` NEW, + a case in `tests/protocol/agent-finish.test.ts`).
  `§1a` + the T-004 body — the smallest-model deviation's direction.
- **VERIFIED:** `REVIEW.md` item 1, twice. **(a)** Removing `cold.rebuildAll()` went RED only at
  `expect(fit.slope).toBeGreaterThan(0)` — `-0.0000015`, a coin flip on noise; with the count asserted it
  is RED in 2.9 s naming `scale 1: solids built by the cold load: expected +0 to be 62`, green restored
  in 58.4 s. **(b)** Reverting the repad turned `agent-finish.test.ts` RED on `| T-001 | review   |`, the
  byte CI rejected. Harness re-run twice: **43.45** and **41.93 ms/element**, **7.24** and **6.99 min**
  projected.
- **FOUND:** The verdict stands — flat across 39–273 elements, ~7 min at 10,000 — but two claims under it
  did not. ⚠⚠ **The harness could not tell a cold load that built the whole building from one that built
  nothing:** `geometryOf(id)?.state` is `undefined` for an element never built and `undefined !==
  'failed'`, and `brokenRefs()` returns a **stored scene field** rather than a re-derivation, so both
  passed on an empty measurement. ⚠ `§1a`'s _"smallest model prices ~5% **high**"_ is backwards — 39
  elements price 38.8–39.6 ms/el against 41.8–44.0 at the larger sizes in all four runs, so the marginals
  **fall** with size and the warmup cause predicts the opposite sign. Neither unseats the conclusion.
- **OWES:** ⚠ **every seat — confirm `gh api user` is your own account before approving or merging.** The
  approve step first refused (`Can not approve your own pull request`): the box held only the account
  that opened #20. Owner ruling, same day — a per-turn `GH_TOKEN` from `~/.config/bunyan/hmdnah.token`,
  no global switch — so #20 was approved and merged on `narutousomaki741` after all. GitHub blocks a
  self-approval but **not** a self-merge, which is the half a seat has to check itself. `amer` —
  `unverified here: the same cold load inside a real browser tab`, carried forward untouched. `brahim` —
  the flatness verdict is still **printed, not asserted**; four runs put the marginal spread at
  5.9–16.8%, the number a ratio gate would have to clear.
- **RISK:** additive
- **FULL:** `handoff/hmdnah/2026-08-15-T-004-review.md`
- **REVIEW:** n/a — this IS the review turn (`AGENTS.md §1.2`); the verdict is on the entry below.

### T-004 — per-element build cost is flat from 39 to 273 elements, and 10,000 projects to 7.2 min — 2026-08-15 — seat: zayd

- **CHANGED:** `tests/document-build-cost-scale.test.ts` **NEW (+1)** — four sizes of the reference
  building (1/3/5/7 storeys), each on a fresh OCCT kernel, timing `rebuildAll()` on a context cold-loaded
  from `.bnn`. `current_state.md §1a`'s cold-load row carries the measurement and is **not re-coloured**.
- **VERIFIED:** `pnpm verify` green. Two full runs of the harness: slope **43.81** and **43.24
  ms/element**, 1.3% apart, R² 0.9998 / 0.9996, intercept within ±140 ms of zero on an 11.7 s total. Local
  marginals 41.5–45.6 ms per additional element, spread 5.9% and 9.2%. ⇒ **7.30 / 7.21 min projected at
  10,000 elements, uncached.**
- **FOUND:** Per-element build cost **is** flat across 39–273 elements, so Entry 90's 64.5% deferrable
  figure is worth that same fraction of the cold load at the target — about 4.7 of the projected 7.3 min,
  leaving 2.6 min, which is still not a load time. Two estimators were needed, not one: a least-squares
  line has a slope whether or not the data is a line, so the flatness verdict is read off the local finite
  differences and the fit's R² is only its witness. The 7.2 min uncached reaches D66's 6.35 min from a
  different direction, and at the cache's measured 2.07× it is 3.5 min against the ~3 min `§1a` already
  carried. The one
  systematic deviation is the smallest model pricing ~5–10% **low** per element, which makes the
  marginals fall slightly with size — the opposite direction from superlinearity. Authoring's
  marginal is 43.1 ms/element against the cold load's 43.8, so command
  dispatch is not a measurable share of authoring at this scale.
- **OWES:** `hmdnah` — this PR; there is no fix to revert, so the re-run is the check and the harness
  reproduced to 1.3% here. `amer` — `unverified here: the same cold load inside a real browser tab`; every
  number above is Node on the box, as `§1a`'s existing cold-load numbers already are. `brahim` — a call on
  whether the flatness verdict should become a ratio assertion on the marginal spread, which would be
  immune to absolute machine speed; it is printed and not asserted today, so a later superlinear
  regression would still pass this file. ⚠ The projection is a **37× extrapolation** from 273 elements.
- **RISK:** additive
- **FULL:** `handoff/zayd/2026-08-15-T-004-build-cost-flatness.md`
- **REVIEW:** **Reviewed by `hmdnah` (2026-08-15, PR #20) — APPROVED and MERGED**, `RISK: additive`, two
  defects fixed on the branch, on `narutousomaki741` — the account that did not open it. The entry above
  is the record.

### STEWARD-scaffolding — the five-seat scaffolding, finished — 2026-08-15 — seat: brahim

- **CHANGED:** `scripts/reserved-classes.mjs` + `pr-ready.mjs` NEW (the three owner-gated classes as
  `needs-operator/*` labels; PR title routing + `MERGEABLE`), run by a new `pr-shape` CI job ·
  `tests/protocol/{reserved-classes,pr-ready}.test.ts` NEW (+17) · `seats.mjs` gained
  `PR_TITLE_RE`/`titleRoutes`, called by `agent-finish.mjs` · `docs/RUNBOOK.md` NEW ·
  `docs/BACKLOG.md` decomposed (T-001…T-011) · `AGENTS.md §7` NEW — the owner's writing standard,
  binding on every seat and subagent · `REVIEW.md`, `docs/seats/README.md` and `Brahim_Prompt.md`
  corrected where they still described the pre-D82 model · `open_rulings.md` Q13 rewritten.
  Covers two sessions: `f984e89` built the mechanics on the pc, this one finished them.
- **VERIFIED:** `pnpm verify` green. The new suites execute against real fixture git histories rather
  than grepping the scripts. `pnpm docs:check` measured at 6 files / 69 tests **before** any change,
  which is what proved `tests/protocol/` was already wired into CI.
- **FOUND:** Branch protection is unavailable on this repository — `403 Upgrade to GitHub Pro or make
  this repository public` on both the protection and rulesets APIs, with an `ADMIN` token; Q13's
  account objection is satisfied and a plan objection replaced it (ruled D87). `current_state.md §3`/`§5`
  called the plan/section unit blocked on Q1–Q3 after it shipped in Entry 77. `REVIEW.md` still taught
  the pre-D82 self-review loop, and `docs/seats/README.md` still described the retired `§2 DYNAMIC`
  block under a heading saying it carried no state — both fixed on this branch.
- **OWES:** the owner — rulings on Q17a, Q17c, Q18, Q19, and the public/Pro/neither call on Q13 (later
  ruled D87). `hmdnah` — PR #16. `khalihlna` — PR #17. Beyond T-004 nothing was `ready` for box.
- **RISK:** additive
- **FULL:** `handoff/brahim/2026-08-15-STEWARD-scaffolding-ci-labels-backlog.md`
- **REVIEW:** Reviewed and merged (`STEWARD:` PR, this branch) — the account/PR bookkeeping is not
  preserved here; see the handoff body and `docs/decisions.md` D87 for what it settled.

### T-008 — review: the reconciliation holds, and the surfacing pass double-reports one element — 2026-08-15 — seat: hmdnah

- **CHANGED:** nothing in the diff — a pre-review that edits the branch changes the thing the owner is
  deciding on. `docs/BACKLOG.md` `## Discovered` gains the `agent-finish.mjs --review` finding below, and
  T-008's row is held at `review` against that script's own flip.
- **VERIFIED:** ⚠ **Item 1 re-executed twice, by two sessions, the second not inheriting the first's
  result.** `belongsTo` → `hostedBy` in `cascadeOf` is **6 RED**, and the split reproduces exactly: **2**
  in `belongs-to-cycle-guard.test.ts` (`cascadeOf` terminates on a cycle; `cascadeOf` and
  `isElementActive` walk the same edges) and **4** in `belongs-to-deletion-d83.test.ts`. Dropping
  `danglingAncestorRefs` from `brokenRefs()` is **3 RED**, all `expected [] to have a length of 1 but got
  +0`. Both restored ⇒ **24/24 green** across the two files.
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
  and never the task's `risk:` field, so it stamps a `risk: high` row `done` and prints an approve/merge
  pair; the row is corrected back to `review` here and the finding is in `docs/BACKLOG.md`'s
  `## Discovered` — `T-014` closed it. ⚠ The box's default `gh` identity is `Davidian-Abdo`, so
  `agent-start.mjs`'s own claim comment on #23 was posted from it; `T-013` is the guard.
  `amer`/`khalihlna` —
  `unverified here: the Problems panel's hint text and the duplicate-key row — khalihlna to confirm`.
- **RISK:** additive
- **FULL:** `handoff/hmdnah/2026-08-15-T-008-review.md`
- **REVIEW:** n/a — this IS the review turn (`AGENTS.md §1.2`); the verdict is on T-008's build entry.


