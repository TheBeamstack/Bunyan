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

**Whenever `current_state.md` holds MORE THAN 20 entries, the agent that notices it compacts:**

1. Keep the **newest 15** entries in `current_state.md` §7, in full.
2. **Summarize each older entry into this file**, appended in order, keeping: its number, date, agent,
   headline, the measured numbers, the decisions it took (with D-numbers), and anything a future agent
   would otherwise re-derive. Drop only the session bookkeeping (verify counts, box notes, commit hashes).
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

## §C — Entries 54–68 (still in `current_state.md` §7, in full)

Listed here so this file is a complete index. **Do not summarize these until they rotate out.**

| #   | Date  | Agent | Headline                                                                                                                                                                   |
| --- | ----- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 54  | 07-24 | Zayd  | D66's contract half: the heap-eviction hook needs nothing reserved — additive by construction.                                                                             |
| 55  | 07-25 | Amer  | D66 axes (b)+(d) measured in a real browser: ~30,700 draw calls / 606 ms. Both collapse to the one-mesh-per-part redraw.                                                   |
| 56  | 07-25 | Amer  | Browser storage ships — a real IndexedDB `StorageAdapter` + Autosave + Save/Open/Recover.                                                                                  |
| 57  | 07-25 | Zayd  | The pre-freeze adversarial sweep → **D67**: the option invariant did not cascade over hosting (4 windows counted where 1 is correct).                                      |
| 58  | 07-25 | Zayd  | The **enumeration query** + the **Clean Delta exporter** ship; five defects found, incl. the journal not recording the associative cascade.                                |
| 59  | 07-26 | Zayd  | The asserted-behaviour sweep → **D68**: two consumers never obeyed the option invariant. **The first BACKWARD sweep** (§1c-8).                                             |
| 60  | 07-27 | Zayd  | Backward sweeps of rules 16/12/5 — **all three dirty** (D69 T-junctions, D70 `materialId`, D71 the codec seam) + rules 13/15 (D72 `exposedRefs`).                          |
| 61  | 07-27 | Zayd  | The join resolver's O(N²) scan becomes an O(N) spatial index (**D73**) — 4757.7 ms → 27.2 ms; flat at the 10k target.                                                      |
| 62  | 07-27 | Zayd  | The owed `exposedRefs` declarations close; rules 1/3 dirty (**D74** — a broken ref outlived its element), 9/10 the first clean pair.                                       |
| 63  | 07-28 | Amer  | The renderer batching rewrite: **~30,700 draw calls → 2** at the 10k target (1.6 → ~80 fps).                                                                               |
| 64  | 07-28 | Zayd  | **The backward sweep completes — all 18 rules swept, 9 dirty.** D76 (a delta from a log that cannot see its baseline) + D77 (the style invalidator misses child elements). |
| 65  | 07-28 | Zayd  | The **schedules body** ships (**D78**) — and the wrong loop it replaces was living inside the reservation's own passing test.                                              |
| 66  | 07-28 | Amer  | P4.5 the interaction model, design-first: the doc is delivered, six owner questions put, no source touched.                                                                |
| 67  | 07-28 | Amer  | P4.5's non-gating half: selection highlight + view filter + the app's first keyboard owner. `format:check` green again.                                                    |
| 68  | 07-29 | Zayd  | The **schedule CRUD** ships (**D79**) — `scene.schedules` becomes a first-class collection; the verbs carry the refusal the body will not.                                 |
