# P5 · Step 1 — The Room-Bounding Solver (Space extent, Option B) — DESIGN

**Author:** Zayd (dev box) · **Date:** 2026-07-18 · **Status:** ✅ rev. 3 — owner ruled all five framing questions; **BUILT + GREEN (Entry 41, 294 tests).** `packages/document/src/room.ts` + `DocumentContext.roomMetrics` + `tests/room-bounding.test.ts` (19). Both load-bearing claims revert-verified (inner-finish-face → 4 fails; the face-trace turn rule → 7 fails).

> ## ✅ OWNER RULINGS — 2026-07-18 (§9)
>
> **Q1 — Boundary rule → INNER FINISH FACE.** The honest usable floor area; the seed disambiguates the room side, so feeding the wall face-lines yields it for free.
> **Q2 — Solver home → DOCUMENT-LAYER 2D, pure TS** (no new kernel op; headless-testable; behind a `RoomSolver` seam). Settles §8.4.
> **Q3 — Plan-order → the `footprintOf` PROVIDER SEAM.** Build+test the solver now against `BoundarySegment[]` fixtures + a minimal baseline-Wall footprint; the real D52 Wall wires into `footprintOf` later with zero solver changes. Keeps the ruled close-order.
> **Q4 — Not-enclosed → typed `{ enclosed: false }`; area/volume UNAVAILABLE, never `0`** (D45). **Q5 — Volume → PRISMATIC** for v1.0.0 (sloped-soffit rooms are a recorded v1.0.x extension).
> **Depends on:** ✅ 0a (dependency graph) · ✅ 0b (constraints/datums) · ✅ 0g (the reserved Space identity inputs + `RoomSeparator` — all frozen shapes already landed) · ✅ 0d (the SketchSolver seam — the D19 precedent this reuses).
> **Executes:** D55 (Space extent = Option B, room-bounding, ships in v1.0.0) · Freeze-Gate rows ⓖ/ⓞ (now built, not merely reserved).
> **Owned by:** plan step 1 (`v1.0.0_imp_plan.md` — "Step 1 now carries the room-bounding SOLVER").

> ## WHY THIS GETS A DESIGN AND NOT JUST A COMMIT
>
> Per Entry 39 the two v1.0.0 solvers were **priced** and the owner **ruled the cut with the number** (0d ~4–6 sessions, room-bounding **~5–8 sessions, the heavier of the two — NO drop-in exists**). 0d was de-risked to an integration of `planegcs`; **this one is not** — there is no off-the-shelf room-bounding library that fits, so the algorithm is ours to write, and its shape is worth an owner ruling before 5–8 sessions are spent. **Crucially, unlike every step-0 item, this reserves NO frozen bytes** (0g already froze every Space input; `dependency.ts` already declared the room-area a query). ⇒ **every decision below is a BUILD decision, not a freeze decision** — a wrong call costs schedule and rework, never a contract amendment. That is the good news and the reason the framing questions are answerable now without foreclosing anything.

---

## 0. What this solver is, and what it is NOT

**It is:** the body behind D55. A `Space` (`SpatialContainer` kind `space`) carries a **seed point** (`location`, frozen 0g) that says _which enclosed region on a Level this room is_. The solver takes that seed, the **bounding walls** on the Level, and any **room-separation lines** (`Scene.roomSeparators`, frozen 0g), and computes the room's **boundary polygon → floor area → volume** — Revit's model. _"Floor area is architecture's most-scheduled quantity"_ (paint, ceilings, screed); this is what finally makes `SpatialContainer`'s standing promise — _"area/volume MEASURED from geometry, never stored"_ (`entities.ts:182`) — true, automatically and in sync as walls move.

**It is NOT** a stored boundary. Recipe-is-truth (spec §6): the boundary is a **derived projection** of the walls, exactly like a Part or a mesh, so — like them — it is **computed on demand and never written into `scene.json`.** No new `scene.json` field. No `SCENE_SCHEMA_VERSION` bump. No frozen-contract change of any kind (0g already did all the freezing this feature needs).

**It is NOT** a boolean or a fuse. The **anti-fuse rule (D50/§4h) still binds** — the solver never modifies a wall's solid, never fuses two walls. It only _reads_ footprints and _reports_ an area. A room boundary is a query result, orthogonal to every element's B-Rep.

---

## 1. The invariant that shapes everything: the room is a QUERY, not an element

This is already settled in the codebase and it is the load-bearing structural fact:

- `dependency.ts:96` — the `roomSeparators` edge is a **declared "nothing"**: _"A separator re-bounds a SPACE (a query the room-bounding solver recomputes on demand), never an element's SOLID … the room-area invalidation lives with the solver, not in the rebuild graph."_
- ⇒ **The solver is NOT wired into the staged rebuild.** It is not invoked when a wall moves. It is invoked when someone **asks** for a room's area (a new `DocumentContext` query), and it reads the **live scene** at that moment — so it is _always_ fresh, with **no cache and no invalidation to get wrong.** (The one thing 0a's exhaustive-switch guard buys us here: a future `spaces`/`walls` collection can never silently skip this, because there is no rebuild edge to forget.)

This is the room-bounding analogue of `quantities()` (`document.ts:387`): a measured, derived number computed from the current model on request, reported `exact` or omitted — **never stored, never stale.**

---

## 2. The pipeline, end to end

```
roomMetrics(spaceId):
  1. Resolve the Space → its Level (parentId), its seed point (location), its vertical extent.
  2. ASSEMBLE the 2D input on that Level's plane:
       - for every wall on the Level  → its FOOTPRINT segments (the two face-lines)   ── §4 (footprint provider)
       - every RoomSeparator on the Level → its polyline segments
  3. SOLVE (the hard part, §3): from the seed point, trace the smallest enclosing
       loop in the planar arrangement of those segments.
       → { boundary: polygon }  OR  { enclosed: false }
  4. DERIVE the numbers:  area = polygon area · perimeter = polygon length
                          height = topElevation − baseElevation   (§5)
                          volume = area × height       (prismatic, v1.0.0)
  5. RETURN { area, perimeter, volume, boundary }  OR  { enclosed: false }.  Nothing stored.
```

Steps 1, 4, 5 are plumbing. Step 3 is the subsystem. Step 2 is the plan-order knot (§4, Q3).

---

## 3. The core algorithm — planar face location around a seed

**The problem, precisely:** given a set of 2D line segments in a plane and a point known to be inside a room, find the boundary of the **smallest region (face) of the planar subdivision that contains the point.** This is a well-understood computational-geometry problem (planar arrangement + point location + face tracing); there is no drop-in library that also speaks "wall footprint," which is why the plan prices it at 5–8 sessions.

**The approach (document-layer 2D, pure TypeScript):**

1. **Build the arrangement.** Split every input segment at every intersection with every other segment, producing a set of non-crossing sub-segments (edges) that meet only at endpoints (vertices). This is the O(n²) segment-intersection pass (n = wall-faces + separator-edges on one Level — tens, not thousands, so O(n²) is fine; we are never solving a whole building at once, only one room's Level).
2. **Locate the seed's face by boundary-walking.** From the seed, cast a ray (+x) to find the **nearest edge** it hits; that edge is on the room's boundary. Walk the face: at each vertex, take the **next edge by smallest clockwise turn** (the standard "always turn most-right" face-tracing rule), until the walk returns to the start. The closed chain is the room boundary.
3. **Reject the unbounded case.** If the walk turns _left_ (encloses the exterior) or escapes — i.e. the seed is not enclosed (a gap in the walls with no separator closing it) — return **`{ enclosed: false }`**. Revit's "room not enclosed"; our D45 discipline: _an unmeasurable quantity is omitted, never zeroed._

**What this handles correctly, by construction:**

- **Non-convex rooms** (L-shaped, U-shaped) — face-tracing handles any simple polygon; no convexity assumption.
- **Openings (doors/windows) do NOT leak the room** — and this resolves Freeze-Gate row ⓞ. A door is a _hosted void that cuts the wall solid_ (`buildVoid`); it removes material from the 3D wall but the wall's **footprint in the Level plane is continuous** — the solver feeds on footprints, so a doorway is invisible to it and the boundary stays closed. This is Revit-consistent (a door never breaks a room) and it means the ⓞ worry — _"room-bounding needs to know doors are openings in the bounds"_ — dissolves: they are not boundary events at all. Genuinely-open boundaries (a lobby flowing into a corridor) are the job of `roomSeparators`, which is exactly why that reservation exists.

**What is explicitly v1.0.x (recorded, not built):** curved walls contributing arc edges to the arrangement (v1.0.0 walls are straight — the D52 baseline is `{start,end}`); auto-detecting the seed when `location` is absent (v1.0.0 requires the seed — it _is_ the room's identity anchor); islands/holes inside a room (a core in an open-plan floor). None of these touches a frozen byte; each is an additive extension behind the same seam.

---

## 4. The seam, and the plan-order knot (Q3 — the one real scheduling decision)

**The seam (the D19 / `GeometryGateway` / `SketchSolver` precedent, applied a third time):**

```ts
// solver-neutral input — pure 2D, no scene types, no kernel:
interface RoomBoundingInput {
  readonly seed: readonly [number, number];
  readonly segments: readonly BoundarySegment[]; // wall face-lines + separator edges, in the Level plane
}
interface BoundarySegment {
  readonly a: readonly [number, number];
  readonly b: readonly [number, number];
}

type RoomBoundingResult =
  | { readonly enclosed: true; readonly boundary: readonly (readonly [number, number])[] }
  | { readonly enclosed: false };

interface RoomSolver {
  solve(input: RoomBoundingInput): RoomBoundingResult;
}
```

- `RoomSolver` + a `MockRoomSolver` live in **`@bunyan/document`** (pure — no kernel, no external dep); the real 2D solver is the body of §3. Because the whole thing is planar TS, it may simply live in `@bunyan/document` too (no second package needed — unlike planegcs, there is no third-party WASM to quarantine). Injected at construction like `sketchSolver`, defaulting to the real one.
- **This is the answer to §8.4** (the doc left "kernel-OCCT vs document-layer 2D" open): **document-layer 2D.** Rationale: room bounding is planar polygon work; keeping it in TS means (a) **no new kernel op** — we do not touch the frozen protocol even additively, (b) it is **headless-testable without OCCT**, (c) **no per-room WASM round-trip**, (d) a trivial `MockRoomSolver` for the seam. The kernel alternative (a section + planar-face-finding op) is heavier and buys nothing. _(Recommendation — see Q2.)_

**The knot (Q3):** the solver's `segments` input is **wall footprints in the Level plane** — but the **real D52 baseline Wall (`{start,end}`) is not built yet.** Today `core.wall.v1` is a `length`/`height` fixture placed by a `placement`, with no plane-space baseline; the real baseline Wall lands with the **types (steps 1–5) / 0c joins — which come AFTER this solver in the ruled close-order.** So the solver has nothing real to bound.

The seam above is precisely what decouples us from that: the solver consumes **`BoundarySegment[]`**, not walls. A thin, separate **footprint provider** — `footprintOf(element, scene) → BoundarySegment[]` — extracts those segments, and _it_ is the only piece that needs to know what a Wall is:

- For the **D52 baseline Wall**: offset the `{start,end}` centerline by ±(total thickness)/2 → its two face-lines. Trivial, ~10 lines.
- For arbitrary/legacy elements (v1.0.x): project the solid's vertical faces to the plane via the kernel. Not needed for v1.0.0.

⇒ **We can build and fully test the whole solver NOW**, against synthetic `BoundarySegment[]` fixtures and a minimal baseline-Wall footprint, exactly as the plan intends (room-bounding _before_ the types), and the real Wall plugs into `footprintOf` with **zero solver changes** when it lands. This mirrors how 0d was built against a `sketchProfile` fixture without every real type existing. **The alternative** (pull the D52 baseline Wall forward, ahead of the solver) is also coherent but re-orders the plan. This is the framing call in Q3.

---

## 5. Vertical extent → volume (§5, from the 0g-frozen inputs)

Height is **derived**, never stored (D52's rule, which 0g already applied to the Space):

- **base** = the Space's own Level (`parentId`) elevation + `baseOffset` (default 0).
- **top** = `upperLevelId`'s elevation + `limitOffset`, or — absent `upperLevelId` — the **next Level up** in the container tree (the common case, per `entities.ts:202`).
- **volume** = area × (top − base). **Prismatic** for v1.0.0 (flat floor, flat ceiling). A sloped soffit / roof-bounded room is v1.0.x (needs the 3D bounding surfaces, not just a 2D loop) — recorded, not built, no frozen-byte cost.

---

## 6. The query surface (what consumes it)

A new read-only method on `DocumentContext`, the sibling of `quantities()`:

```ts
async roomMetrics(spaceId: ContainerId): Promise<RoomMetrics>;

type RoomMetrics =
  | { readonly enclosed: true; readonly area: number; readonly perimeter: number;
      readonly volume: number; readonly boundary: readonly (readonly [number, number])[]; }
  | { readonly enclosed: false };
```

- Computed on demand from the live scene; **no storage, no rebuild-graph entry** (§1). `enclosed: false` reports _unavailable_, never `area: 0` (D45 — _omitted, never zeroed_).
- It joins the ecosystem quantity surface: floor area is the schedule key Planitor's finishing trades bill against, and — like every Bunyan quantity — it is `basis: "exact"`, measured from the model, not a fallback estimate.
- **No new Command / no `argsSchema` change:** `roomMetrics` is a _query_, not an authoring verb (the Space itself, its seed, and separators are authored through paths that land with step 1's CRUD; the solver only reads). The frozen `Command`/`argsSchema` set is untouched.

---

## 7. How it is verified (the method that has found every gap: USE it on real rooms)

Per §1b — _keep modelling real buildings against the real kernel and measure._ The room-bounding tests must **cut rooms nobody has cut:**

1. **A rectangular room** — four walls around a seed → area = the honest inner rectangle; cross-checked against a closed-form hand number.
2. **An L-shaped (non-convex) room** — proves the face-trace, not just a bounding box.
3. **A door in a wall does NOT change the area** (row ⓞ, revert-verified): add an `opening` cutting a bounding wall → the room boundary and area are **byte-identical** (openings are not boundary events).
4. **A not-enclosed seed** (a wall removed / a gap) → `{ enclosed: false }`, area **omitted, not zero** (D45).
5. **A room separator closes an open boundary** — an open-plan area with a `roomSeparator` polyline → a bounded area that the same scene _without_ the separator reports as `enclosed: false`. (Revert-verified: the separator is genuinely load-bearing.)
6. **Associativity** — move a bounding wall (via the existing CRUD) and re-query → the area follows, with **no rebuild and no cache** (proves §1's query model).
7. **The oracle cross-check** where a closed form exists (rectangle, L) — area from the solver vs area computed analytically, to guard our own polygon-area code (the `LinearProperties` double-count lesson, §4b).

⚠ These are **document-layer 2D tests** — mostly pure (fast, headless, no OCCT), except the few that also stand up real walls to prove the footprint provider and the openings-don't-leak claim end-to-end against the real kernel. The full suite (275) must stay green with **zero edits to existing tests** — this only ADDS.

---

## 8. What lands where

| Piece                | File                                           | Change                                                                                                  |
| -------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| The seam + IR + mock | `packages/document/src/room.ts` (new)          | `RoomSolver`, `RoomBoundingInput`, `RoomBoundingResult`, `MockRoomSolver`                               |
| The 2D solver body   | `packages/document/src/room.ts` (or a sibling) | the §3 arrangement + face-trace (pure TS)                                                               |
| Footprint provider   | `packages/document/src/room.ts`                | `footprintOf(element, scene)` — baseline Wall + separators                                              |
| The query            | `packages/document/src/document.ts`            | `roomMetrics(spaceId)` + `RoomMetrics` type; inject `roomSolver` into `DocumentOptions` (defaults real) |
| Tests                | `tests/room-bounding.test.ts` (new)            | the §7 set                                                                                              |

**No `scene.json` change, no `SCENE_SCHEMA_VERSION` bump, no `Command`/`argsSchema` change, no kernel-protocol change, no frozen-byte change of any kind.** 0g already reserved every shape; this pass writes the _body_ behind those shapes.

---

## 9. Framing questions for the owner (before implementation)

Every one of these is a **build decision, not a freeze decision** (§0) — a wrong call costs schedule, never a contract amendment. Zayd's recommendation leads each.

**Q1 — The boundary-location rule (the one that changes the area NUMBER).** Where exactly does the room boundary run relative to a wall? Revit offers centerline / finish-face / core-face. It matters because _floor area is the most-scheduled quantity_ and the choice moves the number by half a wall thickness all around.

- **(A · recommended) Wall inner FINISH FACE** — the honest usable floor area (what a screed/paint/ceiling estimate actually needs). Tractable because the seed already tells us which side the room is on, and we feed the wall's _face-lines_ (not the centerline) into the arrangement, so the inner face falls out for free. Needs wall thickness (from the style layers — we have it).
- (B) Wall CENTERLINE — cheaper (needs only the baseline, not the thickness/orientation) but **over-reports** floor area by counting half of every bounding wall into the room. Revit's non-default.
- Recommendation: **(A)** — the whole point of the feature is an honest, schedulable number; (B) ships a number that is knowingly wrong. The rule can become a per-project option additively later.

**Q2 — Kernel-OCCT vs document-layer 2D** (the decision §8.4 deferred to build time). Recommendation: **document-layer 2D, pure TypeScript, behind a `RoomSolver` seam** — no new kernel op, headless-testable, no per-room WASM round-trip, a trivial mock. (Kernel-side would need a section + planar-face op and buys nothing.)

**Q3 — The plan-order knot (§4): how do we feed the solver walls before the real Wall exists?**

- **(A · recommended) Build the solver now behind a `footprintOf` provider seam** — test it against synthetic `BoundarySegment[]` fixtures + a minimal baseline-Wall footprint; wire the real D52 Wall into `footprintOf` (zero solver changes) when the types/0c land. Keeps the ruled close-order (room-bounding _before_ the types), mirrors how 0d built against a `sketchProfile` fixture.
- (B) Pull the **D52 baseline Wall forward** (build it first, then the solver against the real thing). Coherent, but re-orders the plan and front-loads type work the freeze-order put later.
- Recommendation: **(A)** — the solver's hard part is independent of the Wall type; the seam is the clean cut, and it is the same move that de-risked 0d.

**Q4 — The not-enclosed contract.** Recommendation: **a typed `{ enclosed: false }` result; the Space reports area/volume UNAVAILABLE, never `0`** (D45 — _omitted, never zeroed_). (Confirming, not really open — flagged so the owner sees the failure mode explicitly.)

**Q5 — Volume model for v1.0.0.** Recommendation: **prismatic** (area × derived height from the 0g vertical-extent inputs); sloped-soffit / roof-bounded rooms are a recorded v1.0.x extension (no frozen-byte cost).

---

_Nothing here freezes a byte. On the owner's rulings (Q1–Q5), Zayd builds §8 per the §7 test plan — real 2D solver, headless, revert-verified (openings-don't-leak, separator-is-load-bearing, associativity-with-no-cache) — then the suite goes green and the entry is logged. Commit is owner-gated._
