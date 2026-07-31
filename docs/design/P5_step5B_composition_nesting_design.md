# P5 · Step 5 Ⓑ — Element Composition / Nesting — DESIGN (D59, Freeze-Gate row Ⓑ)

**Status:** design + owner-ruling gate (framing questions in §9). **Author:** Zayd (dev box, headless).
**Date:** 2026-07-22.
**Companion evidence (planned):** a built nested type end-to-end vs the real OCCT kernel + `tests/composition-*.test.ts`.
**Reopened-freeze context:** `current_state.md` §0a + Entry 46/47; `v1.0.0_imp_plan.md` "🟠 REOPENED" row Ⓑ.

---

## 0. What this row is — and why the owner ruled DESIGN **and BUILD**, not merely reserve

**D59 (owner-validated 2026-07-21, `core_logic.md` rule 18):** an element may own child **elements**, not
only Parts. A **curtain wall** is panels + mullions on a grid; a **stair** is treads + stringers + railings;
a **group/assembly** is elements-of-elements. Each child is _"a first-class element with its own PEI, hosted
by its parent."_ Hosting is therefore **not one level deep** (opening→host is only the first case).

**⇒ Unlike row Ⓐ (a pure reservation), the owner ruled this row is DESIGNED in full AND one nested type is
BUILT end-to-end against the real kernel** (imp_plan row Ⓑ). The reason is in §2: the field the freeze
already reserved (`Element.parentElementId`) encodes an _assumption_ about how composition works, and that
assumption may be wrong. A reservation of the wrong shape is worse than none — it looks discharged. Building
one real nested type is the only way to find out whether the frozen contract actually carries a curtain wall,
the same way "model a real building against the real kernel" found all eleven prior gaps (§1b).

**The anti-fuse rule (rule 11 / §4h, measured Entry 12) binds absolutely here too:** composing elements
**never fuses their solids.** A curtain wall's panels and mullions are separate solids sitting next to each
other; a nested element's `SubShapeRef`s survive its siblings changing. Composition is **spatial adjacency +
identity ownership, never a boolean.**

---

## 1. What exists today (verified against the code, 2026-07-22)

- **Hosting is exactly ONE level.** `build.ts::assemblyRoot(scene, id)` returns `element.hostId ?? id`. An
  "assembly" is a root element **plus the openings whose `hostId` is that root** (`hostedBy`). The build is
  two-stage: base parts → cut each hosted void through every part → place last. `affectedAssemblies` collapses
  any changed element to its (single) root.
- **`Element.parentElementId?` is RESERVED and UNREAD.** Its doc comment (entities.ts:539–545) says it names
  _"the element this one is NESTED IN — a curtain wall's panels/mullions, an assembly's members"_ and that
  _"flat named `groups` are a separate, additive v1.0.x scene collection, not this field."_ **No body reads it.**
- **`ⓙ` already broke the "one element = own parts" symmetry once:** a hosted `core.opening` now contributes
  BOTH a void AND `buildLeaf` parts that become the **opening element's own** parts (build.ts:307–314,
  document.ts:629–637 supersedes the void's parts on rebuild). So the engine _already_ carries a second
  element's geometry inside an assembly rebuild — but that element (the door) is **authored** (a real
  `scene.elements` row with `hostId`), not **generated**.
- **A child element's identity has a precedent staring at us:** a Part's `nodeId` is `${elementId}.${partName}`
  and a sub-shape face is `lateral.k` by **authored index** (D26). Identity in Bunyan is _derived from a stable
  slot_, never stored and never matched-by-geometry. A curtain-wall panel is the same story, one level up.

---

## 2. THE CENTRAL TENSION — rule 18's "each child a first-class PEI" vs recipe-is-truth (D30)

Two of Bunyan's load-bearing invariants pull in opposite directions here, and **which way they resolve is the
freeze-critical decision this whole row exists to make:**

- **Rule 18 (D59):** a curtain-wall panel is _"a first-class element with its own PEI"_ — selectable,
  taggable, schedulable, quantity-bearing, addressable by a downstream product.
- **Rule 11 / D30 (recipe-is-truth):** what is DERIVED from the recipe is **not stored** — Parts, meshes, room
  boundaries are all regenerated, never persisted. A wall's `structure` part is not a `scene` row; it is
  rebuilt each time from `params + style`.

A curtain wall's 3×4 grid of panels is **derived from the parent's recipe** (its extent + grid params). If the
architect changes the grid to 4×5, the panels must **regenerate** — they are a projection of the recipe, like
Parts. Yet each must have a **stable PEI** so a tag on "panel R2C3" survives an unrelated edit. **A derived
thing that must carry a persistent, downstream-bindable identity** — this is _exactly_ the `SubShapeRef`
problem (D1), and Bunyan already solved it once: **derive the identity from a stable slot; regenerate the
thing; never store it; a vanished slot becomes a broken-ref.**

**The reserved `parentElementId` field currently assumes the OPPOSITE** — that panels are **stored**
`scene.elements` rows that _point up_ at their parent. That is the model this design must confirm or replace.

---

## 3. The three models (and what each costs at the freeze)

### Model A — **Generated / derived children** (recipe-is-truth, my recommendation)

The parent is **one authored `scene.elements` row** (the curtain wall; its params = the grid definition).
At build time its Type **generates** its children; each child's PEI is **derived deterministically** from
`parentId` + a stable slot key:

```
curtainwall-01J8…                     ← authored scene row (params: {origin,width,height,rows,cols,…})
  ├─ curtainwall-01J8…/panel.r0c0     ← DERIVED child PEI (not stored) — one glass part
  ├─ curtainwall-01J8…/panel.r0c1
  ├─ curtainwall-01J8…/mullion.v1     ← DERIVED child PEI — one aluminium part
  └─ …
```

- **Identity** = `${parentId}/${slotKey}` — the same derivation discipline as `nodeId` and `lateral.k`. Stable
  across rebuild while the slot exists; a shrunk grid drops the slot → any tag on it becomes a **broken-ref**
  (the D1 story, one level up). Nothing is matched by geometry, ever.
- **Storage** = none. Children are regenerated each rebuild, exactly like Parts. `scene.elements` holds one row.
- **Downstream binding** — a tag / schedule / quantity addresses a child by its derived PEI. `quantities()`
  rolls the tree up (a curtain wall's glass m² + aluminium kg fall out per child, per part, per material).
- **Anti-fuse** — trivially held: each panel/mullion is its own solid; no boolean between siblings, ever.
- **Cost at the freeze:** a **build-shape** contract for how a parent emits children (a `buildChildren?` method
  on `BimObjectType`, returning child descriptors the engine builds recursively) + the derived-PEI addressing
  convention. `parentElementId` is then NOT the carrier for generated children — it is freed to mean the
  **group** case (§5), which the reservation must be re-pinned to.
- **The price** (honest): a **per-panel user override** ("swap panel R2C3 for a door", "pin this mullion") is
  not a free-standing scene row in Model A — it is a **sparse patch keyed by slot** the parent reads. v1.0.0
  need not ship overrides; the question is only whether to **reserve** the patch shape now (§9 Q4).

### Model B — **Authored / persisted children** (Revit-literal)

Each child is a real `scene.elements` row with its own ULID PEI and `parentElementId` pointing up; the
create-curtain-wall command **expands** the grid into N panel rows + M mullion rows at author time.

- **Matches Revit literally** — every panel is individually selectable and overridable with no special "patch"
  concept; per-panel edits are ordinary element edits + undo.
- **Violates recipe-is-truth** — a rebuild cannot regenerate children without re-authoring scene rows (a
  journal/undo authoring puzzle: does regeneration emit `SceneChange`s? are they undoable? who owns them?).
  Changing the grid 3×4 → 4×5 becomes **scene surgery** (delete 12 rows, author 20), not a rebuild.
- **Cost at the freeze:** `parentElementId` stays as-is (its current premise). But the far larger cost is that
  the **rebuild model itself** (staged, all-or-nothing, recipe→solids) would have to admit "a rebuild mutates
  the element set" — a change to D42/D19 semantics, not an additive field. **This is the expensive foreclosure,
  and it is why I do not recommend B.**

### Model C — **Hybrid: derived children + optional promotion**

Model A by default; a child the user _explicitly_ overrides is **promoted** to a stored row (a sparse
exception), reconciled by slot key on rebuild. Best of both, but the reconciliation rule (a stored override vs
a regenerated slot that moved/vanished) is the hardest thing here and is **not v1.0.0**. **Recommendation:
ship Model A; reserve the promotion/override patch shape (Q4) so Model C is additive later.**

---

## 4. Recommended model + the frozen-shape it needs

**Recommend Model A** — it is the _only_ one of the three consistent with recipe-is-truth, persistent-naming-
by-derivation, and the staged all-or-nothing rebuild (D42) simultaneously. It treats a child element as
_"a Part that is itself an element"_ — which is precisely what rule 18 describes once you strip the Revit
implementation assumption out of it.

**Frozen surface it needs (all additive; nothing existing changes shape):**

1. **`BimObjectType.buildChildren?(ctx: BuildContext) => Promise<readonly BuiltChild[]>`** — a NEW optional
   method (the sibling of `buildGeometry`/`buildVoid`/`buildLeaf`). A `BuiltChild` carries: a stable `slot`
   string (→ derived PEI), a `typeId` + `params` + optional `styleId`/`classification` (the child _is_ an
   element), and the engine builds each child recursively (its own parts, its own hosted voids). Absent ⇒ a
   flat element (today's only case). **A composite parent may have EITHER `buildGeometry` (its own frame
   parts) OR `buildChildren` OR both** (a curtain wall might have a perimeter frame + generated panels).
2. **A derived child ElementId convention** — `${parentId}/${slot}` — with a documented separator (`/`, absent
   from ULIDs) so a child PEI is unambiguously parseable back to `(parentId, slot)`. This is the `nodeId`
   precedent promoted to the element level.
3. **`ElementGeometry.children?: readonly ElementGeometry[]`** — the build result becomes a **tree**; a child's
   `elementId` is its derived PEI. `quantities()`/tags/schedules walk it. (Alternative: keep the geometry map
   FLAT and register children by derived PEI — decided in §9 Q3.)
4. **`parentElementId` re-pinned** (no shape change, only meaning): it is the carrier for **manual composition
   / groups** (§5) — an independently-authored element deliberately nested under another — **not** for
   generated children (those are derived, never scene rows). The reserved field's doc comment is corrected.

**What does NOT change:** `SubShapeRef`, `Element`'s existing fields, `Part`, `BuiltPart`, `VoidBuildContext`,
`scene.json`'s existing collections, the kernel protocol, `SCENE_SCHEMA_VERSION`. `buildChildren` and
`ElementGeometry.children` are optional/additive; a scene with no composite types is byte-identical.

---

## 5. Generative composition vs GROUPS — two mechanisms, deliberately separate

Rule 18 names two things the reader is tempted to unify; they are **not the same** and must not share a shape:

- **Generative composition** (curtain wall, stair): children are **generated and owned** by the parent's
  recipe (Model A). Deleting the parent deletes them; a grid change regenerates them. **Carrier:**
  `buildChildren` + derived PEIs.
- **Groups / assemblies:** a user selects several **independently-authored** top-level elements (a table +
  four chairs; a wall + its trim) and bundles them so they move/copy/delete together — **without** any element
  losing its own authored identity. **Carrier:** either `Element.parentElementId` (a manual parent link) OR a
  flat `groups` scene collection `{ id, memberElementIds }`. **v1.0.x, additive** — this design only proves it
  is additive over the frozen contract, it does not build it.

**Freeze obligation:** show a `groups` collection is a purely-additive future `SceneCollection` (the
documentation-collection precedent, Ⓐ) and that `parentElementId` carries a manual nest. **No build owed for
groups in v1.0.0** — only the generative-composition build (the curtain-wall probe).

---

## 6. The build engine under composition (Model A)

- **`assemblyRoot` walks to the top authored element.** Today: `hostId ?? id`. Under nesting a generated child
  is not a scene row, so it never enters `affectedAssemblies` directly; only the **authored parent** is an
  assembly root, and it rebuilds the **whole subtree** as one unit. (This mirrors "a wall + its openings
  rebuild as one unit" — a curtain wall + its panels/mullions is one unit.)
- **Recursive build.** `buildAssembly(parent)` builds the parent's own parts (`buildGeometry`, if any), then
  calls `buildChildren`, then for each child recurses (a child may itself host a void — a curtain-wall panel
  _is_ a door: exactly the ⓙ path, now under a generated element). Depth is bounded by the type graph, not
  unbounded recursion; a **cycle guard** refuses a type that nests itself transitively (a `geometry` failure,
  D42 — never a hang).
- **Superseding.** Every generated child's parts must be marked superseded on rebuild or they leak (the
  Entry-21 / ⓙ pattern — measured). The tree walk in `document.ts` (the same loop that already supersedes a
  door's leaf) extends to children.
- **Broken-ref one level up.** A child hosted-void whose slot vanished, or a `parentElementId` group member
  whose parent was deleted, is the **broken-ref** state (rule 3) — visible, non-fatal, awaiting retarget.

---

## 7. THE PROBE — a curtain wall (the canonical D59 nesting probe, `core_logic.md` §9a)

**Recommend the curtain wall over the stair** (§9 Q2): it is named _"the canonical nesting probe (D59)"_ in
§9a, and it exercises the generative-composition mechanism at its cleanest — **a grid of panels + mullions,
each a first-class child element with its own PEI and its own material** — without the stair's orthogonal
complexity (code-driven riser/going geometry, a railing that is _itself_ a host-following sub-element). If the
frozen contract carries a curtain wall, it carries the mechanism; the stair then adds only domain geometry.

**`core.curtainwall` (a new `@bunyan/types` type):**

- **Params:** `origin` `[x,y]` + `width` + `height` in a Level plane (baseline-consistent with the wall, D52);
  `rows` + `cols` (the grid); a `mullionSection` (a `Section` ref — a mullion is a `LinearMember`, D32); a
  `panelStyleId` / panel material.
- **`buildChildren`:** emits `rows×cols` **panel** children (slot `panel.r{r}c{c}`) — each a thin glazed solid
  filling one grid cell — and the **mullion** children (slot `mullion.v{c}` / `mullion.h{r}`) — each an
  extruded section along a grid line. Each child is a real element-build (own parts, own material, own
  `IfcPlate`/`IfcMember` classification), placed in the parent's frame; the parent's placement rides last so
  the whole wall moves as one (the D25 isomorphism, like the door leaf).
- **Anti-fuse gate:** panels and mullions are **separate solids** — assert no boolean runs between two children,
  and that a panel's face token is byte-identical whether or not a neighbouring panel exists (change `cols`
  4→5 and panel R0C0's `lateral.k` is unchanged).
- **The nesting-depth proof:** make **one panel a hosted door** (a child that is itself a ⓙ host) — proving
  hosting is _not_ one level deep and the ⓙ leaf path composes under a generated element.

---

## 8. The dependency-graph edge

- **Generated children need no new `dependents` case** — they are not scene rows, so no `SceneChange` ever
  targets one. A change to the **parent** (its params) already re-stages the parent via the existing
  `elements` self-edge, and the parent rebuild regenerates the whole subtree. **This is the declared-"nothing"
  precedent** — a generated child, like a Part, has no independent dependency edge.
- **The one real edge** is a child's own datum/host bindings (a curtain-wall panel-door hosted on a mullion) —
  but those are expressed as ordinary constraints/hostRefs _within the parent's recipe_, resolved during the
  recursive build, not as top-level scene edges. **No `SceneCollection` member is added.**
- **Groups** (v1.0.x) add a `groups` edge when they land — additive, out of scope here.

---

## 9. FRAMING QUESTIONS FOR THE ARCHITECT (owner-ruled before build)

> The rhythm: I recommend a default; you rule (and may override, as on 0c). All are reshape-cheap **before**
> any code lands. Q1 is the freeze-critical one — the rest follow from it.

- **Q1 — The identity model (THE freeze-critical fork).** Generated children are **derived** (Model A: PEI =
  `${parentId}/${slot}`, regenerated each rebuild, never stored, recipe-is-truth) **vs authored** (Model B:
  each panel a stored `scene.elements` row with a ULID). **Recommend A** — the only model consistent with D30 +
  D42 + persistent-naming-by-derivation; B forces a rebuild to mutate the element set (a change to the rebuild
  contract itself). This determines what `parentElementId` means and whether `buildChildren` is reserved.
- **Q2 — The probe.** Build a **curtain wall** (recommend — the §9a canonical D59 probe; cleanest test of the
  mechanism) vs a **stair** (adds code-driven geometry + a self-hosting railing on top of the mechanism).
- **Q3 — The child geometry surface.** `ElementGeometry.children?` (a **tree**; a parent owns a nested result)
  **vs** a **flat** geometry map keyed by derived child PEI (children registered as first-class geometry rows
  next to authored ones). **Recommend the tree** — it keeps "an assembly is one unit" literal and makes
  roll-up a walk; the flat map is easy for a consumer to iterate but loses the ownership edge. (Consumer-facing
  APIs can flatten a tree; they cannot re-nest a flat map.)
- **Q4 — Per-child override (reserve now or defer entirely).** Reserve a **sparse slot-keyed override patch**
  now (so Model C — "swap panel R2C3 for a door", "pin this mullion" — is additive later) **vs** defer the
  whole notion (add it when overrides ship, proving then it is additive). **Recommend reserve the shape**
  (cheap; it is the one place Model A is weaker than Revit, so pinning it pre-freeze de-risks the parity path).
- **Q5 — `parentElementId` re-pin + `groups`.** Confirm `parentElementId` is re-pinned to the **manual
  group/nest** meaning (not generated children) and that a flat `groups` collection is a purely-additive
  v1.0.x `SceneCollection` (proven additive here, **not built**). **Recommend confirm.**

### 9a. ✅ OWNER RULINGS (2026-07-22) + the two findings the BUILD produced

**Owner ruled (all as recommended): Q1 = Model A (derived children) · Q2 = curtain wall · Q3 = the tree
(`ElementGeometry.children?`) · Q4 = reserve the slot-keyed override patch (`Element.childOverrides?` +
`ChildOverride`) · Q5 = confirm (`parentElementId` re-pinned to manual group/nest; `groups` proven additive).**
Then the probe was BUILT (`packages/types/src/curtainwall.ts`, 4 types) and validated
(`tests/composition-nesting.test.ts`, 9, real OCCT) — and building it surfaced two things the design had wrong:

- **⚠ THE DERIVED-PEI SEPARATOR IS `:`, NOT `/` (found by building).** A child PEI flows into its parts'
  nodeIds (`${childPei}.${part}`), and a nodeId is a `SubShapeRef` component whose grammar **reserves `/`
  (`TOKEN_SEP`) and `#` (`OCCURRENCE_SEP`)** — a `/`-bearing nodeId throws at encode time (`subshape.ts`).
  So the separator is `:` (reserved by neither; absent from a `[a-z]+-`+Crockford-ULID PEI and from part
  names). Every `${parentId}/${slot}` in §3–§4 above is spelled `${parentId}:${slot}` in the code.
- **⚠ A PURE COMPOSITE HAS NO `buildGeometry` — the build guard had to widen.** `buildAssembly` rejected a
  type with no `buildGeometry` as `unbuildable`; a curtain wall's geometry IS its children. The guard now
  refuses only a type that can build **neither** a solid **nor** children, and `base` is `[]` for a pure
  composite. `quantities(curtainWall)` therefore has no own parts (it throws `NOT_FOUND`); the glass/aluminium
  totals roll up from the children — the "composite with only children" case is now first-class.
- **⚠ A THIRD, HEAP finding (in `document.ts::#commit`):** a superseded generated child must be **deleted**
  from the geometry map, not merely have its handle freed — else a **vanished slot** (a shrunk grid) lingers
  with a dangling handle. `#commit` now deletes every superseded id before re-setting the fresh set (survivors
  return; vanished slots stay gone). Revert-verified by the shrink-then-delete heap test.

---

## 10. Test plan (real OCCT + pure), revert-verified

**Part 1 — the built curtain wall (real OCCT):** a 3×2 curtain wall builds 6 panel children + the mullion
children, each with its own derived PEI, own part(s), own material; `quantities(curtainwall)` rolls the tree
up to glass m² + aluminium kg per child per material. **Anti-fuse:** assert no sibling boolean; a panel's
`lateral.k` token is byte-identical across a `cols` change (revert-verified — force a sibling fuse → the token
moves and the test goes red). **Nesting depth:** one panel is a hosted door → the ⓙ leaf builds under a
generated child; the door's derived PEI is `${cw}/panel.r0c0` and its leaf parts measure.

**Part 2 — compile-time (freeze-safety):** `buildChildren`/`BuiltChild`/`ElementGeometry.children` optional;
every existing type/scene/`.bnn` untouched; a scene with no composite type is byte-identical; `parentElementId`
carries a manual nest; a `groups` collection is shown additive (a `tsc` probe, the reserve-shapes precedent).

**Part 3 — round-trip + failure:** a curtain wall saves→loads byte-identical (one authored row; children
regenerate); a cycle-nesting type refuses at build (D42, not a hang); a vanished-slot tag is a broken-ref.

**Revert checks:** disable the recursive child build → the nesting-depth + quantities tests go red; disable the
supersede-children line → a heap-leak assertion goes red (measured handles).

---

## 11. Freeze-safety summary — no frozen byte moves

| Surface                                                                                | Change                                                               | Additive?                                        |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------ |
| `BimObjectType`                                                                        | `+ buildChildren?` (opt.)                                            | yes — sibling of `buildLeaf`                     |
| `ElementGeometry`                                                                      | `+ children?` (opt.) OR flat-map registration                        | yes — build-result type, not a frozen file shape |
| `Element.parentElementId?`                                                             | meaning re-pinned (manual group/nest); shape unchanged               | yes — a doc correction                           |
| `scene.json`                                                                           | none (generated children not stored); `groups` proven additive-later | yes                                              |
| `SubShapeRef` / `Part` / `VoidBuildContext` / kernel protocol / `SCENE_SCHEMA_VERSION` | none                                                                 | —                                                |

**⇒ The only additive surface is one optional Type method + one optional build-result field.** A derived
child PEI is the `nodeId` discipline promoted one level. If the built curtain wall proves the contract carries
it (Part 1 green, anti-fuse held, nesting-depth green), row Ⓑ is discharged and the freeze is not foreclosing
a Revit-class curtain wall / stair / group.
