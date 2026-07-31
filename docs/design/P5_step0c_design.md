# P5 · Step 0c — Wall-to-Wall Joins (the anti-fuse corner) — DESIGN

**Author:** Zayd (dev box) · **Date:** 2026-07-20 · **Status:** ✅ rev. 3 — **BUILT + GREEN (Entry 42, 302
tests, +8).** Owner ruled Q1–Q5 and the two follow-ups §9a-A/§9a-B; two rulings (Q3 automatic, Q4
real-Wall-forward) overrode the recommendations and reshaped the frozen contract, reconciled here. The
anti-fuse gate and the bidirectional join edge are both revert-verified. **This closes step 0.** The
frozen shapes it reserved: `JoinConstraint` (a `Constraint` union member), `BuildContext.joins`,
`core.setJoin`/`core.clearJoin` — all additive, no `SCENE_SCHEMA_VERSION` bump, frozen kernel protocol
untouched.

> **What shipped.** The real D52 baseline **Wall** is a new shipped type in a **new `@bunyan/types`
> package** (`core.wall`, §9a-B chosen home — the legacy `length/height` fixture `core.wall.v1` stays for
> existing tests). The join **resolver** is engine-side (`packages/document/src/joins.ts`); the
> **auto-miter + override** model (§3/§6), the **bidirectional dependency edge** (§4), and the
> **delete-cascade of dangling overrides** all landed. Tests: `tests/wall-joins.test.ts` (8, real OCCT).

> ## ✅ OWNER RULINGS — 2026-07-20 (§9)
>
> **Q1 — Join set → BUTT + MITRE** (per-layer priority deferred v1.0.x). **Q2 — Contract → a dedicated
> `JoinConstraint` union member.** **Q3 — Trigger → AUTOMATIC ON PROXIMITY** _(overrode the explicit-command
> recommendation — Revit-faithful; the D1 reconciliation is §0a)._ **Q4 — Plan-order → PULL THE REAL WALL
> FORWARD** _(overrode the fixture recommendation — build the real D52 baseline Wall as the shipped type and
> join on it; this starts P5 step 3 inside 0c)._ **Two follow-ups the rulings leave open — §9a.**

> **Read `current_state.md` §1/§5 and the FREEZE GATE (head of P5) first.** This doc is design-first, the
> way every step-0 item was (0b/0d/0e/0g/room-bounding each had a design doc + owner-ruled framing
> questions **before** a line was built). 0c is different from room-bounding in one load-bearing way:
> **it reserves a frozen byte** — a new `Constraint` union member and a new `Command` — so Q1–Q3 below
> are **freeze decisions**, not just build decisions. A wrong `JoinConstraint` shape costs an amendment
> across three products; that is why it waits on a ruling.

---

## 0. What a join is, and — the whole point — what it is NOT

Two walls meet at a corner. Built naïvely from their `{start,end}` baselines (D52), their solids either
**overlap** (the corner square sits inside BOTH walls → its volume is double-counted, and the two boxes
visibly interpenetrate) or **gap**. A **join** makes the corner read as one clean piece of architecture
and stops the double-count.

> ## ⚠⚠ THE ANTI-FUSE RULE IS THE ENTIRE DESIGN CONSTRAINT (§4h, measured Entry 12).
>
> A join is a **display/quantities cleanup**, and **NEVER a boolean fuse of two elements.** Fusing two
> walls re-owns **4 of the first wall's 6 faces** to the fuse node, so
> `wall-s/…/face/y-min#0` becomes `corner-sw/…/fuse(wall-s.y-min + wall-w.y-min)#0` — and **every window
> hosted on that wall breaks the instant a neighbour is joined, retroactively, on a wall nobody edited.**
> **A constraint is not a boolean.** If 0c is implemented as a fuse, D1 is dead and every downstream
> binding with it. The executable gate (§7): _two walls join, and every window on either still resolves._

**The one-sentence model.** A join adjusts **each wall's OWN end** — and only its end-cap — within that
wall's own recipe, reading the neighbour's baseline the way a base/top constraint reads a Level (0b). The
wall's two long **side faces** (where windows live) are never touched, so their `SubShapeRef` tokens come
back **byte-identical** and every hosted opening survives. Each wall stays one element, one solid, one
recipe. Nothing outside a wall ever re-owns its faces.

## 0a. Reconciling AUTOMATIC joins (Q3) with D1 — the reason the override recommendation was safe to drop

The explicit-command recommendation (rev. 1, Q3) rested on one fear: _an auto-join re-derived each rebuild
puts geometry back into the identity path (D1)._ **The owner ruled automatic, and it is D1-safe — for two
reasons that must be written down, because a future agent will raise exactly this fear again:**

1. **Auto-join is a pure function of the RECIPE, not of kernel geometry.** "Do these two wall ends meet?"
   is decided by comparing their `{start,end}` **params** — which _are_ the truth (`scene.json`), the same
   inputs `footprintOf` and the room solver already read. It is plane arithmetic on authored numbers, never
   a query against a built solid. So it is **deterministic and recipe-is-truth-preserving** — the same
   class of derived query as room-bounding (D55: derived from wall positions, never stored), not the
   geometry-in-the-name that D1 forbids.
2. **A join only ever reshapes CAP segments, never a SIDE face's identity.** By §1's segment order + D26,
   the window-hosting side faces (`lateral.1`/`lateral.3`) are byte-identical **whether or not** the wall
   is joined and **however many** neighbours it gains. The only thing proximity decides is the geometry of
   `lateral.0`/`lateral.2` (the caps), on which no persistent reference is ever bound in a real building.

⇒ **Auto-join derives from params and touches only caps ⇒ D1 holds.** _(This is precisely why the owner
could take the more convenient behaviour without paying for it — the property §1 buys is what makes
proximity-driven joins safe, and it is the same property that would have made explicit ones safe.)_

---

## 1. The invariant that makes it free: build the wall as an EXTRUDED PLAN POLYGON, and only the CAP moves

The current `wallType` fixture is a `makeBox` (`length`×`thickness`×`height`) placed by a rigid motion.
A box cannot express a mitred end. The baseline wall 0c needs — the D52 `{start,end}` shape the
room-bounding `footprintOf` already reads — builds instead as an **`extrude` of a plan polygon**, exactly
as the Slab and the 0d sketch profile already do:

```
        segment 3  (side — window host, lateral.3)
   d ┌───────────────────────────────┐ c
     │                               │
     │  ← baseline start→end →       │   segment 0 = start-cap (lateral.0)
     │                               │   segment 2 = end-cap   (lateral.2)
   a └───────────────────────────────┘ b
        segment 1  (side — window host, lateral.1)
```

The plan footprint is authored in a **fixed segment order**: `start-cap → side → end-cap → side`. By
**D26** (proven in 0d, revert-verified), `lateral.k` names the face swept from **authored segment k** and
**the array is never permuted** — so:

- **The two SIDE segments (1, 3) are the window-hosting faces, and a join never touches them** ⇒
  `lateral.1`/`lateral.3` are stable across any join edit. _This is the anti-fuse property, for free, out
  of a rule the project already has and already tests._
- **A join changes ONLY a cap segment (0 or 2):** a mitre turns the cap into a slanted edge; a butt
  extends or trims it. `lateral.0`/`lateral.2` change (they are geometrically new faces — correct); no
  window is ever hosted on an end-cap in a real building, and even if one were, the change is _local and
  honest_, never a silent re-owning of a side face.

**Layers (D30).** A real wall is blockwork + insulation + plaster. v1.0.0 joins the **whole footprint
uniformly** — every layer's caps take the same mitre/butt at the corner. Each layer is its own extruded
band (offset across the thickness), and the join geometry is computed once for the wall and applied to
each layer's cap. **Per-layer priority joins** (Revit's "the core runs through, the finishes butt") are a
recorded **v1.0.x** extension — they need a layer-priority model that does not exist yet, and nothing
about deferring them foreclosed by this contract (a `JoinConstraint` gains an optional `priority` map
additively). _See Q1._

---

## 2. The two resolutions (Q1)

Both are computed in the Level plane from the two baselines meeting at a shared endpoint `P`, with
directions `dA`, `dB` (pointing away from `P` along each wall) and half-thicknesses `hA`, `hB`.

- **BUTT** — directional: `element` **butts into** `other` (which continues through). `element`'s end-cap
  moves to `other`'s **near face-line** (the offset line `other`'s side presents to the corner), staying
  perpendicular to `element`'s baseline. The wall stays a rectangle — its end just lands on the neighbour's
  face instead of floating. Simplest; obviously not a fuse; the T-junction's natural resolution.
- **MITRE** — symmetric: both end-caps are cut along the **angle bisector** of the corner, so the walls'
  outer face-lines meet at a clean diagonal (an L-corner's default look in every BIM tool). Each wall's
  cap segment becomes the bisector edge; both walls rebuild. Needs the extruded-polygon build of §1 (a box
  cannot do it) — which is exactly why §1 exists.

**Recommendation (Q1): ship BOTH — butt + mitre — with per-layer priority deferred to v1.0.x.** Once the
wall builds via an extruded footprint (§1), mitre costs one more polygon shape, and it is what makes a
corner read as architecture rather than as two overlapping boxes. Butt alone (option A) would leave every
L-corner looking wrong and defer the one gesture that proves the mechanism generalises past a rectangle.

---

## 3. The contract shape — a dedicated `JoinConstraint` union member (Q2), now an OVERRIDE (Q2 × Q3)

Q2 (dedicated member) and Q3 (automatic) intersect: **if joins happen automatically, what is stored?** The
Revit-faithful and D1-clean answer — and the reconciliation this rev. adopts (confirm at §9a-A) — is that
**auto-join is the DERIVED default and a `JoinConstraint` is a stored per-corner OVERRIDE:**

- **No override present ⇒** the corner auto-joins with the **default resolution = MITRE** (symmetric, needs
  no through/butting decision, deterministic — the only default that requires no extra data). The join set
  is a pure function of the baseline params (§0a); nothing is stored.
- **A `JoinConstraint` present ⇒** it _overrides_ that corner: force `butt` (with direction), keep `mitre`
  explicitly, or **`none`** (Revit's "Disallow Join" — the walls stay separate boxes). This is the only
  thing that lands in `scene.json`, and only when the user deviates from the auto-default.

```ts
export type Constraint = DatumConstraint | SketchConstraint | JoinConstraint; // + one member

export interface JoinConstraint {
  readonly id: ConstraintId;
  /** The dependency subject — the wall the override is filed under (the element-self edge, 0a). */
  readonly element: ElementId;
  /** The wall it joins. The pair {element, other} is the corner; order encodes butt direction. */
  readonly other: ElementId;
  readonly kind: 'join';
  /** `butt` ⇒ `element` butts into `other`; `mitre` ⇒ symmetric bisector; `none` ⇒ disallow (stay boxes). */
  readonly resolution: 'butt' | 'mitre' | 'none';
  // FUTURE (additive, v1.0.x): readonly priority?: Readonly<Record<layerName, number>>  // per-layer join
}
```

`isJoinConstraint(c)` narrows it; `isSketchConstraint` (today `!isDatumConstraint`) is tightened so the
three members partition cleanly. **Why a dedicated member and not the reserved `ConstraintTarget
{kind:'element'}`** (entities.ts:301): that reservation was for _"attach a wall top to a roof"_ — a datum
binding to another element's geometry, one-directional, offset-bearing. A join is a **peer-to-peer corner
relationship** with a resolution enum and a bidirectional rebuild edge; overloading `DatumConstraint`'s
`{base|top|grid, target, offset}` shape onto it would be the "one field means five things" trap D53 exists
to refuse.

**Nothing else in `scene.json` changes.** No `SCENE_SCHEMA_VERSION` bump — a v2 file with no override
simply has no `join`-kind rows, and `emptyScene()` already ships `constraints: {}`.

---

## 4. The dependency edge — bidirectional, and it is the subtle part (0a)

A join makes wall A's geometry depend on wall B's baseline+thickness **and vice-versa** (a mitre on A
recomputes when B rotates; a butt on A recomputes when B moves its face). `dependency.ts` must learn two
things (its exhaustive switch will not compile until it does):

1. **`constraints` case:** a `JoinConstraint` change re-stages **both** `element` and `other` (today the
   case returns `[c.element]`; a join returns `[c.element, c.other]`).
2. **`elements` case:** when a wall's params change, **every wall joined to it** must also re-stage — a new
   `elementsJoinedTo(scene, id)` helper walking `scene.constraints` for `join` rows naming `id` on either
   side. This is the element↔element edge; it mirrors the build reading the neighbour's baseline.

**Deletion (CRUD guard, 0e/0f).** A `JoinConstraint` is **not identity-bearing** — it appears in no
`SubShapeRef` token — so the refuse-or-retarget guard (D51/0f) does not apply to it. Deleting a wall
**cascade-deletes any override referencing it** (`element` or `other`) and **re-stages the former
neighbours** — whose proximity scan no longer finds the deleted wall, so their caps auto-revert to plain,
via edge #2 above, in the same undoable edit. Under auto-join this is mostly automatic: the neighbour
simply stops finding a partner. The cascade exists only to clear a stored _override_ that would otherwise
dangle.

---

## 5. The build seam — the Type stays pure (the 0b pattern, exactly)

The engine resolves each join on the element **from the scene** — it scans every other wall for a baseline
endpoint within tol of this wall's ends (the auto-join, §0a), applies any stored `JoinConstraint` override
(§3), computes the neighbour's plane geometry, and hands the Type resolved **scalars** — the Type never
touches `scene`. New `BuildContext` accessor, mirroring `baseElevation`/`gridPoint`:

```ts
interface BuildContext {
  /** The joins on THIS wall, resolved to plane geometry — one per joined end. Empty ⇒ a plain wall. */
  readonly joins?: readonly ResolvedJoin[];
}
interface ResolvedJoin {
  readonly end: 'start' | 'end'; // which of this wall's two baseline ends the join is at
  readonly resolution: 'butt' | 'mitre';
  readonly role: 'through' | 'butting'; // for butt: does THIS wall continue, or trim to the neighbour?
  readonly neighbourDir: readonly [number, number]; // unit direction of the neighbour, away from P
  readonly neighbourHalfThickness: number;
}
```

`scene.ts` gains `joinsOf(scene, elementId)` + the plane-geometry resolver (kept beside `datumElevations`/
`gridPointOf` so build and invalidator read **one** resolver, never two). `build.ts` threads `ctx.joins`
into the wall fixture; the wall computes its mitred/butted plan polygon and extrudes it. **`build.ts`'s
three rules are untouched** — this is still an element cutting only its own recipe; a join adds no boolean
at all, it reshapes one polygon before the extrude.

---

## 6. The commands — joins are AUTOMATIC, so the verbs EDIT the auto-default (Q3, ruled)

There is **no create-a-join command** — a corner joins itself the moment two baselines meet (§0a). The
verbs exist only to **override** a specific corner and to clear the override:

```
core.setJoin   { element, other, resolution: 'butt'|'mitre'|'none' }  → mint/replace the override JoinConstraint
core.clearJoin { joinId }                                             → delete the override → back to auto-mitre
```

`core.setJoin` validates that the two ids are real elements with baselines sharing an endpoint within tol,
and refuses otherwise (a typed failure, D42 — no half-applied override). Both freeze **with their
`argsSchema`** at step 6, which is why the shape is settled now. _(A P4.5/UI "join" gesture, when it lands,
just dispatches `core.setJoin` for a non-default resolution; the default needs no command at all.)_

---

## 7. How it is verified — the executable anti-fuse gate is the headline test

`tests/wall-joins.test.ts` (real OCCT kernel, headless), the load-bearing ones revert-verified:

1. **⚠⚠ THE ANTI-FUSE GATE.** Two walls meet at an L-corner; a window is hosted on wall A's **side** face
   (`lateral.1`). `core.joinWalls(A, B, mitre)` → rebuild → **the window's host token is byte-identical
   and it still resolves.** **Revert to a fuse** (build the corner as `boolean{union}` of A+B) → the
   window's host face is re-owned → **the test goes red.** _If green, the join is not a fuse._
2. **The mitre is clean** — the two walls' outer face-lines meet on the bisector; no overlap volume, no
   gap (measured against the closed-form corner geometry, `bounds`/`measure`).
3. **The butt lands on the face** — the butting wall's end-cap sits on the through wall's near face-line;
   quantities do not double-count the corner (sum of the two walls' volumes = closed form, no overlap).
4. **Associativity** — move wall B's far end (a rotation of B) → A's **mitre recomputes** (the bidirectional
   edge, §4), and A's side-face window still resolves. Revert-verify the `elements`→joined edge (drop it →
   A keeps a stale mitre → red).
5. **Deletion** — delete wall B → its join is gone, A re-stages to a plain cap, A's window survives, undo
   restores the join and the mitre. (D39-style cascade + the 0f guard leaving the join un-guarded because
   it is not identity-bearing.)
6. **Composite wall (D30)** — the joined wall has three layers; the join mitres **every** layer's cap and
   the window still cuts all three. _(A join that mitred only the structural layer would be the same class
   of bug as an opening that pierced only the blockwork.)_
7. **Round-trip** — save→load a joined model from `scene.json` alone → identical geometry and the join
   survives (it is in `constraints`, the recipe is truth).

---

## 8. What lands where

| File                                                | Change                                                                                                                                                                      |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/document/src/entities.ts`                 | `+ JoinConstraint`, `Constraint` union `+`= it, `isJoinConstraint`, tighten `isSketchConstraint`.                                                                           |
| `packages/document/src/scene.ts`                    | `joinsOf()` + the plane-geometry resolver (beside `datumElevations`/`gridPointOf`).                                                                                         |
| `packages/document/src/dependency.ts`               | `constraints` case → both ends of a join; `elements` case → `elementsJoinedTo`.                                                                                             |
| `packages/document/src/types.ts`                    | `BuildContext.joins?` + `ResolvedJoin` (freeze-bearing — `BimObjectType`'s context).                                                                                        |
| `packages/document/src/build.ts`                    | resolve `ctx.joins` from the scene, thread it into `contextFor` (the 0b move).                                                                                              |
| `packages/document/src/commands.ts`                 | `core.setJoin` / `core.clearJoin` (+ their `argsSchema`); wall-delete cascades stored overrides.                                                                            |
| **the real D52 Wall type** (Q4 — location is §9a-B) | The **shipped** baseline `{start,end}` Wall: an extruded plan polygon (§1), layered (D30), reading `ctx.joins`, replacing the `makeBox` fixture. This starts **P5 step 3**. |
| `tests/wall-joins.test.ts`                          | the seven checks in §7 — now against the real Wall, not a fixture.                                                                                                          |

**No frozen kernel-protocol change** — the wall extrudes an authored polygon with existing ops; a join is
pure document-layer plane geometry. The frozen bytes it reserves are all P5-scoped and additive:
`JoinConstraint` (a `Constraint` member), `BuildContext.joins`, the two commands' `argsSchema`.

---

## 9. Framing questions — RULED 2026-07-20

**Q1 → BUTT + MITRE** (per-layer priority a v1.0.x additive `priority?` map). **Q2 → dedicated
`JoinConstraint` union member.** **Q3 → AUTOMATIC ON PROXIMITY** (overrode "explicit"; D1-reconciled §0a).
**Q4 → PULL THE REAL WALL FORWARD** (overrode "fixture"; the baseline Wall becomes the shipped type, §8).
Q4-implied confirming point (the anti-fuse mechanism, old Q4) stands: caps move, side faces don't, never a
fuse — the §7.1 executable gate is the acceptance test.

## 9a. The two points the rulings reshaped — RULED 2026-07-20

**§9a-A → OVERRIDE-ONLY, DEFAULT MITRE.** A plain corner auto-joins as **mitre** and stores nothing; a
`JoinConstraint` is stored ONLY to override a corner (`butt` with direction / explicit `mitre` / **`none`**
= Disallow Join). The frozen `resolution` enum is **`{butt, mitre, none}`** (§3, §6). _Not_ materialised
per-corner.

**§9a-B → MINIMAL.** This session builds just the real D52 baseline `{start,end}` Wall as the shipped type
(extruded footprint, layered per D30, join-aware) and validates joins on it; Opening/Slab and the
door-that-both-cuts-and-builds (ⓙ) stay in the step-5 type phase. **Wall home:** owner said _decide when
building_ — I take the cleanest structural call as the imports fall out and **report the chosen home** in
the entry + `current_state.md`.

---

_On the §9a rulings, Zayd builds §8 per the §7 test plan — real kernel, headless, the anti-fuse gate and
the associativity edge both revert-verified — then `pnpm verify` goes green and the entry is logged.
Commit is owner-gated. **This closes step 0 and opens the type work; the types (steps 4–5) follow.**_
