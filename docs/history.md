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

## §C — Entries 54–73 — the full bodies now live in `handoff/`

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
| 73  | 08-01 | Zayd  | `handoff/zayd/2026-08-01-cached-import-attribution.md`    | The cached-import **attribution**: the "170 embind crossings" were a subtraction residue (**0.9%**, not the cost). The memory view is **cancelled**; the "rule 17" rename was a **phantom**. |

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


