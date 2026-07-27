/**
 * THE REBUILD ENGINE — the recipe becomes geometry here, and nowhere else.
 *
 * ⚠ THE ORDER OF EVENTS IS THE DESIGN. An element's parts are built from its recipe; then every void
 * hosted on it (its windows) is resolved AGAINST THOSE PARTS' OWN IDENTITIES and cut through **every
 * layer**. So:
 *
 *     BASE PARTS  →  resolve each opening's hostRef  →  cut the void through ALL parts  →  FINAL PARTS
 *
 * That two-stage shape is what dissolves the apparent cycle (a wall's solid depends on its windows;
 * its windows depend on its faces). Neither depends on the *other's result* — the window depends on
 * the wall's BASE, and the wall's FINAL depends on the window. A wall and its openings therefore
 * rebuild as ONE unit, and that unit is what `assemblyRoot` names.
 *
 * ⚠ AND THE THREE RULES IT ENFORCES, none of which is negotiable:
 *
 *   1. **NEVER FUSE TWO ELEMENTS** (measured, Entry 12). Fusing two walls at a corner re-owns 4 of the
 *      first wall's 6 faces to the fuse node ⇒ every window hosted on that wall breaks the moment a
 *      neighbour is joined to it, retroactively, on a wall nobody edited. A boolean is an
 *      **intra-element** operation. This engine only ever cuts an element with its OWN hosted voids.
 *   2. **A BROKEN REFERENCE DOES NOT TAKE THE DOCUMENT WITH IT** (domain rule 3). If an opening's
 *      hostRef no longer resolves, the opening is marked `broken-ref`, the HOST STILL BUILDS (without
 *      that hole), and the document still loads and still edits. Predictable breakage beats silent
 *      wrongness — but a breakage that bricks the file is not predictable, it is fatal.
 *   3. **INTERMEDIATES ARE FREED AT THE END OF EVERY REBUILD** (spec §6.2). OCCT solids live on the
 *      Emscripten heap and are not garbage-collected. A drag that leaked one dead solid per frame
 *      would OOM the tab in a minute.
 */

import type { RigidMotion } from '@bunyan/protocol';
import type { BrokenReference, Element, ElementId, Params, Part, TypeId } from './entities.js';
import { childElementId, cutNodeId, partNodeId } from './geometry.js';
import type { GeometryGateway, GeometryRequestOptions } from './geometry.js';
import {
  datumElevations,
  elevationOf,
  gridPointOf,
  hostedBy,
  sketchConstraintsOf,
} from './scene.js';
import { resolveJoins } from './joins.js';
import type { Scene } from './scene.js';
import { solveSketch as runSketchSolve } from './sketch.js';
import type { SketchSolver } from './sketch.js';
import { withDefaults } from './schema.js';
import type { Registries } from './registries.js';
import type { BimObjectType, BuildContext, BuiltPart, VoidBuildContext } from './types.js';

/** The recursion-depth backstop for generative composition (D59) — a cycle guard catches self-nesting
 * types first; this bounds a pathological but acyclic type graph so a rebuild can never hang. */
const MAX_COMPOSITION_DEPTH = 8;

/** What a rebuild produced for one element. */
export interface ElementGeometry {
  readonly elementId: ElementId;
  readonly parts: readonly Part[];
  readonly state: 'valid' | 'failed' | 'broken-ref';
  /** Set when `state` is `failed` — the typed kernel failure, surfaced rather than swallowed. */
  readonly error?: string;
  /**
   * ⚠⚠ WHY IT FAILED, AND THE DISTINCTION IS LOAD-BEARING — it is what lets D42 and D43 both be true:
   *
   *   - **`unbuildable`** — we cannot build this element **at all**: its Type is not registered, or it
   *     was authored against a FUTURE version of a Type we have (D43). This is **tolerated**: the
   *     element is marked `failed`, stays visible, is **preserved verbatim through save**, and **never
   *     rejects anybody's command.** Rejecting on it would mean one Miqdar-authored column makes the
   *     whole document uneditable — and dropping it would mean saving silently deletes that column.
   *   - **`geometry`** — the **kernel refused** (a fillet too large, an empty boolean, an invalid
   *     result). This is the failure domain rule 4 is about: if it happens to an element the running
   *     command was rebuilding, **the whole command is rejected** and the document stays at last-good
   *     (D42).
   *
   * Conflating them is how *"one unregistered type bricks the file"* and *"a half-rolled-back rebuild"*
   * managed to be the same line of code.
   */
  readonly failure?: 'unbuildable' | 'geometry';
  /**
   * ⚠ GENERATED CHILD ELEMENTS (D59 composition, Model A — owner-ruled 2026-07-22 Q3: a TREE). A composite
   * parent (a curtain wall) owns child elements (panels/mullions), each a full `ElementGeometry` with its own
   * DERIVED PEI (`${parentId}:${slot}`) and its own parts — regenerated each rebuild, never a stored scene row
   * (recipe-is-truth, D30). A child may itself be composite (its own `children`), so this is a TREE and hosting
   * is NOT one level deep (rule 18). Absent ⇒ a flat element (today's only case). `quantities`/tags/schedules
   * walk it; `DocumentContext` also registers every descendant FLAT by its PEI for heap + per-child queries.
   */
  readonly children?: readonly ElementGeometry[];
  /**
   * ⚠ THE SYNTHETIC `Element` A GENERATED CHILD WAS BUILT FROM (D59 Model A) — **absent on an authored
   * row**, whose `Element` is `scene.elements[elementId]`.
   *
   * ⚠⚠ FOUND BY BUILDING THE ENUMERATION QUERY (`P5_step6A_enumeration_design.md`), and it was a real
   * hole: a generated child's **Type, style, classification and name were not recoverable from the built
   * tree at all.** The engine constructs a full `Element` for every child (it must — `buildGeometry` takes
   * one) and then **threw it away**, keeping only the geometry. So a curtain-panel schedule — *"completely
   * standard in Revit"* (Entry 57) — could not say what type its rows were, and the Clean Delta's
   * `classification.ifc_class` / `type_name` were unproducible for 16 of the measured 19 real elements.
   *
   * Carrying it is **additive and costs nothing**: `ElementGeometry` is a build-output projection, never
   * stored, never in `scene.json`, not a frozen shape — and the object already existed in the engine's
   * hand. It also makes a derived child and an authored row the **same shape** to a consumer, which is
   * why the enumeration has one code path instead of two.
   */
  readonly element?: Element;
}

export interface BuildResult {
  readonly geometry: ReadonlyMap<ElementId, ElementGeometry>;
  readonly brokenRefs: readonly BrokenReference[];
  /** Handles that are now garbage — the caller releases them (it owns the lifecycle, not us). */
  readonly released: readonly string[];
}

/**
 * The element whose rebuild this element participates in. A window rebuilds WITH its wall, because a
 * hole is not a thing you can build on its own.
 */
export function assemblyRoot(scene: Scene, id: ElementId): ElementId {
  const element = scene.elements[id];
  if (element === undefined) return id;
  return element.hostId ?? id;
}

/** Every assembly a change to these elements/styles invalidates. */
export function affectedAssemblies(
  scene: Scene,
  changed: Iterable<ElementId>,
): readonly ElementId[] {
  const roots = new Set<ElementId>();
  for (const id of changed) {
    const root = assemblyRoot(scene, id);
    if (scene.elements[root] !== undefined) roots.add(root);
  }
  return [...roots];
}

/** Every element wearing a style — what "edit the style, 400 walls rebuild" actually costs (D31). */
export function assembliesUsingStyle(scene: Scene, styleId: string): readonly ElementId[] {
  return affectedAssemblies(
    scene,
    Object.values(scene.elements)
      .filter((e) => e.styleId === styleId)
      .map((e) => e.id),
  );
}

export interface BuildOptions {
  readonly coalesceKey?: string;
}

/**
 * Build one assembly: an element, its parts, and every void hosted on it.
 *
 * Returns the geometry AND the handles the caller must release — this function allocates on the WASM
 * heap and refuses to also own it, because ownership of that heap belongs to exactly one place
 * (`DocumentContext`) and splitting it is how leaks are born.
 */
export async function buildAssembly(
  scene: Scene,
  registries: Registries,
  geometry: GeometryGateway,
  solver: SketchSolver,
  rootId: ElementId,
  options: BuildOptions = {},
): Promise<{
  readonly result: ElementGeometry;
  readonly voids: readonly ElementGeometry[];
  /** ⚠ D59 — every DESCENDANT of this assembly's root, FLATTENED by derived PEI. `DocumentContext` registers
   * and supersedes each one exactly like a void, so a curtain wall's panels share the heap discipline. The
   * TREE (ownership edges) lives on `result.children`; this is the flat projection for the geometry map. */
  readonly children: readonly ElementGeometry[];
  readonly brokenRefs: readonly BrokenReference[];
  readonly intermediates: readonly string[];
}> {
  const element = scene.elements[rootId];
  if (element === undefined) throw new Error(`cannot build unknown element "${rootId}"`);

  const intermediates: string[] = [];
  const brokenRefs: BrokenReference[] = [];
  const request: GeometryGateway['request'] = (op, payload, opts) =>
    geometry.request(op, payload, { ...requestOptions(options), ...opts });

  // ---- 0. CAN WE BUILD THIS AT ALL? (D43) ---------------------------------------------------------
  // ⚠ An unknown Type, or one authored against a version FROM THE FUTURE, is `unbuildable` — NOT an
  // error that takes the document with it. The element opens, is visible, is never built, is never
  // edited, is never a host — and **round-trips through save byte for byte**. A `.bnn` we only partly
  // understand must still be a `.bnn` we cannot damage: drop the element and we have deleted Miqdar's
  // columns, and their PEIs, on a file the user only opened to look at.
  const type = registries.types.get(element.typeId);
  const unbuildable = (error: string): Awaited<ReturnType<typeof buildAssembly>> => ({
    result: { elementId: rootId, parts: [], state: 'failed', error, failure: 'unbuildable' },
    voids: [],
    children: [],
    brokenRefs,
    intermediates,
  });

  if (type === undefined) {
    return unbuildable(`type "${element.typeId}" is not registered in this app`);
  }
  if (element.typeVersion > type.version) {
    // ⚠ THE MIRROR OF MIGRATION, AND IT WAS MISSING. `migrateScene` only ever brought params FORWARD;
    // an element authored against Wall v3 and opened by an app that has Wall v2 was silently BUILT
    // against v2's schema — a wrong building rather than a refused one. You cannot migrate backwards:
    // v2's code has never heard of v3's parameters.
    return unbuildable(
      `element "${rootId}" was authored against "${element.typeId}" v${String(element.typeVersion)}, ` +
        `and this app has v${String(type.version)} — it is from the future and cannot be built`,
    );
  }
  // ⚠ D59: a PURE COMPOSITE (a curtain wall) has NO `buildGeometry` — its geometry IS its children. A type
  // that can build NEITHER a solid NOR children is genuinely unbuildable; one with `buildChildren` is not.
  if (type.buildGeometry === undefined && type.buildChildren === undefined) {
    return unbuildable(`type "${element.typeId}" cannot build a solid or children`);
  }

  // ---- 1. THE BASE PARTS. An element is its parts, in order (D30). --------------------------------
  const failed = (error: string): Awaited<ReturnType<typeof buildAssembly>> => ({
    result: { elementId: rootId, parts: [], state: 'failed', error, failure: 'geometry' },
    voids: [],
    children: [],
    brokenRefs,
    intermediates,
  });

  const discard = (handle: string): void => {
    intermediates.push(handle);
  };

  let base: readonly BuiltPart[];
  try {
    // ⚠ D59: a pure composite has no `buildGeometry` — its own frame parts are empty; its children carry it.
    base =
      type.buildGeometry === undefined
        ? []
        : await type.buildGeometry(
            contextFor(scene, registries, { request }, solver, element, element.params, discard),
          );
  } catch (error) {
    return failed(messageOf(error));
  }

  // ---- 1b. GENERATED CHILDREN (D59 composition, Model A). Built UNPLACED in the root's local frame; the -----
  // root's placement rides the whole subtree last (step 3). A composite parent (a curtain wall) generates its
  // panels/mullions here — each a first-class element with a DERIVED PEI, its own parts, its own material —
  // regenerated every rebuild, never a stored scene row (recipe-is-truth, D30). A child failure that is a KERNEL
  // refusal (`geometry`) rejects the whole assembly (D42), so every child handle built so far is handed back.
  const childFlatUnplaced: ElementGeometry[] = [];
  let childTreeUnplaced: readonly ElementGeometry[] = [];
  try {
    childTreeUnplaced = await buildChildrenTree(
      scene,
      registries,
      { request },
      solver,
      element,
      new Set<TypeId>([type.id]),
      0,
      discard,
      childFlatUnplaced,
    );
  } catch (error) {
    for (const g of childFlatUnplaced) for (const p of g.parts) intermediates.push(p.handle);
    return failed(messageOf(error));
  }

  // ⚠ TWO PARTS MAY NOT SHARE A NODE ID — and this is an IDENTITY check, not a hygiene one. The DAG
  // node is `${elementId}.${partName}`, so two layers both named `structure` mint **byte-identical
  // `SubShapeRef` tokens for different faces of different solids**: a window hosted on one is hosted on
  // both, or on neither, and no amount of naming rigor downstream can recover which was meant. The
  // command layer refuses duplicate layer names; this catches every other way a Type could mint one.
  // `core_logic.md` §5: an identity that cannot be derived structurally is a REFUSAL, never an invention.
  const nodes = new Set<string>();
  for (const part of base) {
    if (nodes.has(part.nodeId)) {
      for (const built of base) intermediates.push(built.handle);
      return failed(
        `element "${rootId}" builds two parts on the DAG node "${part.nodeId}" — their sub-shape ` +
          `references would be identical tokens naming different faces. Part names must be unique.`,
      );
    }
    nodes.add(part.nodeId);
  }

  // ---- 2. THE HOSTED VOIDS. Each is resolved against the base parts' OWN identities. --------------
  const openings = hostedBy(scene, rootId);
  const voidResults: ElementGeometry[] = [];
  const cuts: { readonly opening: Element; readonly handle: string }[] = [];

  for (const opening of openings) {
    const voidType = registries.types.get(opening.typeId);
    if (voidType?.buildVoid === undefined) {
      voidResults.push({
        elementId: opening.id,
        parts: [],
        state: 'failed',
        error: `type "${opening.typeId}" is not a hosted void (no buildVoid)`,
      });
      continue;
    }

    // ⚠ THE RESOLUTION THAT PERSISTENT NAMING EXISTS FOR. The opening names a face of its host by a
    // derivation path (D1) — never an index. If the host was resized, the face is still there under
    // the same token, and this succeeds. If the host was re-authored such that the face is GONE, this
    // is the moment we find out — and the answer is a BROKEN REF, not a crash and not a guess.
    const hostRef = opening.hostRef;
    const hostPart = base.find((part) => hostRef !== undefined && part.refs.includes(hostRef));

    if (hostRef === undefined || hostPart === undefined) {
      brokenRefs.push({
        elementId: opening.id,
        ref: hostRef ?? '(none)',
        hostId: rootId,
        reason:
          hostRef === undefined
            ? 'the opening names no host face'
            : `the host face "${hostRef}" does not exist on any part of "${rootId}" after its rebuild`,
      });
      voidResults.push({
        elementId: opening.id,
        parts: [],
        state: 'broken-ref',
        error: `unresolved host reference "${hostRef ?? '(none)'}"`,
      });
      // ⚠ AND THE HOST STILL BUILDS. Domain rule 3: the document must survive carrying a broken
      // reference. It is a visible state awaiting manual retargeting — not a reason to lose the wall.
      continue;
    }

    let hostFace;
    try {
      const bounds = await request('bounds', { handle: hostPart.handle, ref: hostRef });
      // ⚠ THE FACE'S FRAME, READ FROM THE B-REP SURFACE — never guessed from a bounding box. `inward`
      // is `-normal`: for a planar axis-aligned face this is byte-identical to the old bbox-derived
      // datum, and for a CURVED face (a round column's lateral, whose bbox equals the whole solid's) it
      // is the only thing that can say which way is in — the bbox heuristic bored a pocket down the
      // column's axis (Entry 30, `tests/gap-void-curved-face.test.ts`).
      const frame = await request('faceFrame', { handle: hostPart.handle, ref: hostRef });
      const { normal } = frame;
      hostFace = {
        ref: hostRef,
        bounds: { min: bounds.bounds.min, max: bounds.bounds.max },
        inward: [-normal[0], -normal[1], -normal[2]] as [number, number, number],
        frame: {
          origin: frame.origin,
          normal: frame.normal,
          uAxis: frame.uAxis,
          vAxis: frame.vAxis,
        },
      };
    } catch (error) {
      voidResults.push({
        elementId: opening.id,
        parts: [],
        state: 'failed',
        error: messageOf(error),
      });
      continue;
    }

    try {
      const voidCtx = voidContextFor(
        scene,
        registries,
        { request },
        solver,
        opening,
        element,
        hostFace,
        discard,
      );
      const built = await voidType.buildVoid(voidCtx);
      intermediates.push(built.handle);
      cuts.push({ opening, handle: built.handle });

      // ---- ⓙ: A HOSTED ELEMENT MAY ALSO BUILD A SOLID (a door's leaf/frame), not only a hole. --------
      // Freeze-Gate ⓙ (`review_P5.md` #2): before this, a hosted element was built via `buildVoid` ONLY
      // and its own `parts` were always `[]` — so a door was a hole with no leaf. A hosted type that
      // provides `buildLeaf` builds its solid IN THE HOST'S LOCAL FRAME (from `hostFace`, like the void);
      // the engine applies the host's placement last, so the door moves with its wall. The leaf becomes
      // the OPENING element's own parts (`quantities` then measures the door, per part, per material).
      const leafParts = await buildLeafParts(voidType, voidCtx, element, request, intermediates);
      voidResults.push({ elementId: opening.id, parts: leafParts, state: 'valid' });
    } catch (error) {
      voidResults.push({
        elementId: opening.id,
        parts: [],
        state: 'failed',
        error: messageOf(error),
      });
    }
  }

  // ---- 3. CUT EVERY VOID THROUGH EVERY PART. ------------------------------------------------------
  // ⚠ EVERY part, not just the structural one. An opening that pierced only the blockwork and left the
  // plaster intact would be an obvious, embarrassing bug — and it is exactly the bug a single-solid
  // model could never even have expressed. This loop is what D30 costs, and it is four lines.
  const parts: Part[] = [];
  try {
    for (const built of base) {
      let handle = built.handle;
      let refs = built.refs;

      for (const cut of cuts) {
        const result = await request('boolean', {
          nodeId: cutNodeId(built.nodeId, cut.opening.id),
          kind: 'cut',
          a: handle,
          b: cut.handle,
        });
        // The operand is now an intermediate: the boolean produced a NEW solid and the old one is
        // garbage. Release it at the end of the rebuild, never before — it is still an operand.
        intermediates.push(handle);
        handle = result.handle;
        refs = result.refs;
      }

      // ⚠ PLACEMENT IS LAST, AND THAT IS THE WHOLE POINT. The element was built and cut in its OWN
      // frame; only now is it put where it belongs in the world. `transform` mints no identities
      // (D25, measured Entry 11) — it is a topological isomorphism, so `refs` come back token for
      // token. A rotated wall is the same wall, and the window in it is still in it.
      if (element.placement !== undefined && element.placement.length > 0) {
        const placed = await request('transform', { handle, motions: element.placement });
        intermediates.push(handle);
        handle = placed.handle;
        refs = placed.refs;
      }

      parts.push({
        name: built.name,
        materialId: built.materialId,
        discipline: built.discipline,
        nodeId: built.nodeId,
        handle,
        refs,
        // ⚠ Carried through the placement transform unchanged, and that is SOUND rather than lucky:
        // `transform` is pure INHERIT and mints no identities (Entry 11, measured — a rotated wall is
        // the same wall, refs token-for-token), so an exposed ref stays valid across a placement.
        ...(built.exposedRefs === undefined ? {} : { exposedRefs: built.exposedRefs }),
      });
    }
  } catch (error) {
    // The cut failed (a fillet too large, an empty boolean, an invalid result). REJECT THE EDIT AND
    // KEEP THE LAST-GOOD STATE — no partial geometry, no auto-repair (domain rule 4, spec §6.4).
    // ⚠ `failure: 'geometry'` is what tells `DocumentContext` this one REJECTS THE COMMAND (D42),
    // where an `unbuildable` type merely marks the element and lets the document carry on (D43).
    for (const part of parts) intermediates.push(part.handle);
    // ⚠ D59: the children were built (in the local frame) before this cut failed — free their handles too.
    for (const g of childFlatUnplaced) for (const p of g.parts) intermediates.push(p.handle);
    return {
      result: {
        elementId: rootId,
        parts: [],
        state: 'failed',
        error: messageOf(error),
        failure: 'geometry',
      },
      voids: voidResults,
      children: [],
      brokenRefs,
      intermediates,
    };
  }

  // ---- 3b. PLACE THE CHILD SUBTREE. The children were built in the root's LOCAL frame (their positioning ----
  // params are root-local); the root's placement rides the whole subtree last, so a curtain wall moves as one
  // unit (`transform` mints no identities, D25 — a rotated panel is the same panel). Empty placement ⇒ handles
  // pass through unchanged. This yields the placed TREE (`result.children`) and the placed FLAT list.
  const placedChildren = await placeTree(
    childTreeUnplaced,
    element.placement ?? [],
    request,
    intermediates,
  );

  const state = brokenRefs.length > 0 ? 'broken-ref' : 'valid';
  return {
    result: {
      elementId: rootId,
      parts,
      state,
      ...(placedChildren.tree.length === 0 ? {} : { children: placedChildren.tree }),
    },
    voids: voidResults,
    children: placedChildren.flat,
    brokenRefs,
    intermediates,
  };
}

function requestOptions(options: BuildOptions): GeometryRequestOptions {
  return options.coalesceKey === undefined ? {} : { coalesceKey: options.coalesceKey };
}

function contextFor(
  scene: Scene,
  registries: Registries,
  geometry: GeometryGateway,
  solver: SketchSolver,
  element: Element,
  rawParams: Params,
  discard: (handle: string) => void = () => undefined,
): BuildContext {
  const type = registries.types.require(element.typeId);
  const style = element.styleId === undefined ? undefined : scene.styles[element.styleId];
  // ⚠ THE ACTIVE-DATUM INPUTS (D50 step 0b). Resolved ONCE from the element's `Constraint`s so the Type
  // reads scalars and never touches the scene — the recipe→solids one-way street (D19) is preserved.
  const datums = datumElevations(scene, element.id);
  const gridPoint = gridPointOf(scene, element.id);
  // ⚠ THE WALL JOINS (0c), resolved from the scene to plane cap-lines here so the Type reads scalars and
  // never touches the scene (the 0b move). Empty for a plain wall or a non-wall element — the optional
  // field stays absent then, so nothing but a joined wall ever sees it.
  const joins = resolveJoins(scene, element.id);
  return {
    element,
    params: withDefaults(type.parameterSchema, rawParams),
    ...(style === undefined ? {} : { style }),
    material: (id) => scene.materials[id],
    section: (id) => scene.sections[id],
    container: (id) => scene.containers[id],
    elevation: elevationOf(scene, element.containerId),
    elevationOf: (id) => elevationOf(scene, id),
    grid: (id) => scene.grids[id],
    ...(datums.base === undefined ? {} : { baseElevation: datums.base }),
    ...(datums.top === undefined ? {} : { topElevation: datums.top }),
    ...(gridPoint === undefined ? {} : { gridPoint }),
    ...(joins.length === 0 ? {} : { joins }),
    // ⚠ `other` only when a Type declares none AND builds an unstyled part — an honest "nobody said",
    // never a guess at the trade. D45: never inferred from the material.
    defaultDiscipline: type.defaultDiscipline ?? 'other',
    geometry,
    nodeId: (partName) => partNodeId(element.id, partName),
    // ⚠ THE SKETCH SOLVER (0d). The Type passes its own profile; the engine attaches this element's
    // `SketchConstraint`s (resolved from the scene, so the Type stays pure — the 0b move) and solves. It
    // THROWS on an unsatisfiable sketch, which `buildGeometry`'s catch turns into a `geometry` failure ⇒
    // D42 rejects the command that made it (the over-constrained refusal, done at build time — one path).
    solveSketch: (sketch) => runSketchSolve(solver, sketch, sketchConstraintsOf(scene, element.id)),
    // ⚠ The Type DECLARES its garbage; the engine collects it; `DocumentContext` frees it — once, at
    // the end of the rebuild, and only after checking it is not also somebody's final solid.
    discard,
  };
}

function voidContextFor(
  scene: Scene,
  registries: Registries,
  geometry: GeometryGateway,
  solver: SketchSolver,
  opening: Element,
  host: Element,
  hostFace: VoidBuildContext['hostFace'],
  discard: (handle: string) => void,
): VoidBuildContext {
  const hostType = registries.types.require(host.typeId);
  const hostStyle = host.styleId === undefined ? undefined : scene.styles[host.styleId];
  return {
    ...contextFor(scene, registries, geometry, solver, opening, opening.params, discard),
    host,
    hostParams: withDefaults(hostType.parameterSchema, host.params),
    ...(hostStyle === undefined ? {} : { hostStyle }),
    hostFace,
  };
}

/**
 * D59 — GENERATE A COMPOSITE PARENT'S CHILD ELEMENTS (owner-ruled 2026-07-22, Model A). A curtain wall's
 * panels/mullions; a stair's treads. Each is a first-class element (rule 18) — its own DERIVED PEI
 * (`${parentId}:${slot}`), its own parts, its own material — but generated from the parent's recipe and never
 * stored (recipe-is-truth, D30). Returns the DIRECT-children tree, UNPLACED (in the parent's local frame); the
 * root's placement rides the whole subtree last (`placeTree`). Every descendant is also pushed to `flat` so a
 * failure can free its handles and the document can register it in the geometry map.
 *
 * ⚠⚠ It refuses a duplicate SLOT (byte-identical child PEIs, `core_logic.md` §5), two child parts on one DAG
 * node (same rule as a base part), a self-nesting TYPE (a cycle → never terminates), and depth past the
 * backstop — all `geometry` failures (D42 rejects; never a hang). An UNREGISTERED child type is D43's business:
 * a visible `failed`/`unbuildable` child that does NOT reject the parent (one Miqdar-authored child ≠ a dead file).
 */
async function buildChildrenTree(
  scene: Scene,
  registries: Registries,
  geometry: { readonly request: GeometryGateway['request'] },
  solver: SketchSolver,
  parentElement: Element,
  ancestry: ReadonlySet<TypeId>,
  depth: number,
  discard: (handle: string) => void,
  flat: ElementGeometry[],
): Promise<readonly ElementGeometry[]> {
  const parentType = registries.types.require(parentElement.typeId);
  if (parentType.buildChildren === undefined) return [];
  if (depth >= MAX_COMPOSITION_DEPTH) {
    throw new Error(
      `element "${parentElement.id}" nests deeper than ${String(MAX_COMPOSITION_DEPTH)} levels — a composition cycle or runaway recipe`,
    );
  }

  const descriptors = await parentType.buildChildren(
    contextFor(scene, registries, geometry, solver, parentElement, parentElement.params, discard),
  );

  const tree: ElementGeometry[] = [];
  const slots = new Set<string>();
  for (const child of descriptors) {
    if (slots.has(child.slot)) {
      throw new Error(
        `element "${parentElement.id}" generates two children on the slot "${child.slot}" — their ` +
          `derived PEIs would be byte-identical tokens naming different elements. Slots must be unique.`,
      );
    }
    slots.add(child.slot);
    const childId = childElementId(parentElement.id, child.slot);

    const childType = registries.types.get(child.typeId);
    if (childType === undefined) {
      // ⚠ D43 — an unregistered child type is TOLERATED (a visible failed child), never a rejection.
      const g: ElementGeometry = {
        elementId: childId,
        parts: [],
        state: 'failed',
        error: `child type "${child.typeId}" is not registered in this app`,
        failure: 'unbuildable',
        // ⚠ Carried even here — ESPECIALLY here. This is the element the roll-up will report as
        // unmeasurable, and *"a child of unknown type"* is a useless thing to hand a human. The type is
        // exactly what is known about it (it is why it failed), and `typeVersion` is not (D43).
        element: {
          id: childId,
          typeId: child.typeId,
          typeVersion: 0,
          params: child.params,
          parentElementId: parentElement.id,
          // ⚠ The Type is unregistered, so its `defaultClassification` is unreadable — the proxy class is
          // IFC's own answer for an element whose kind is not known, which is exactly this element's state.
          classification: child.classification ?? {
            ifcClass: 'IfcBuildingElementProxy',
            loadBearing: false,
          },
          ...(child.styleId === undefined ? {} : { styleId: child.styleId }),
          ...(child.name === undefined ? {} : { name: child.name }),
        },
      };
      tree.push(g);
      flat.push(g);
      continue;
    }
    // ⚠ THE CYCLE GUARD. Generation is deterministic from params, so a type that transitively nests itself
    // never terminates — refuse it before it recurses (a `geometry` failure, D42; never a hang).
    if (ancestry.has(child.typeId)) {
      throw new Error(
        `composition cycle: type "${child.typeId}" nests itself (building child "${childId}")`,
      );
    }

    const childElement: Element = {
      id: childId,
      typeId: child.typeId,
      typeVersion: childType.version,
      params: child.params,
      classification: child.classification ?? childType.defaultClassification,
      parentElementId: parentElement.id,
      ...(child.styleId === undefined ? {} : { styleId: child.styleId }),
      ...(child.name === undefined ? {} : { name: child.name }),
    };

    // The child's OWN parts (a panel's glazing, a mullion's aluminium) — built in the parent's local frame.
    let childParts: readonly BuiltPart[] = [];
    if (childType.buildGeometry !== undefined) {
      childParts = await childType.buildGeometry(
        contextFor(scene, registries, geometry, solver, childElement, child.params, discard),
      );
    }
    // Identity check — same rule as a base part (step 1): two parts on one DAG node is a REFUSAL.
    const nodes = new Set<string>();
    for (const part of childParts) {
      if (nodes.has(part.nodeId)) {
        for (const built of childParts) discard(built.handle);
        throw new Error(
          `child "${childId}" builds two parts on the DAG node "${part.nodeId}" — their sub-shape ` +
            `references would be identical tokens naming different faces. Part names must be unique.`,
        );
      }
      nodes.add(part.nodeId);
    }

    // ⚠ RECURSE — a child may itself be composite (rule 18: hosting is NOT one level deep). A door-panel that
    // generates its own leaf/frame is depth 2; the cycle guard grows by this child's type.
    const grand = await buildChildrenTree(
      scene,
      registries,
      geometry,
      solver,
      childElement,
      new Set<TypeId>([...ancestry, child.typeId]),
      depth + 1,
      discard,
      flat,
    );

    const g: ElementGeometry = {
      elementId: childId,
      parts: childParts.map((p) => ({
        name: p.name,
        materialId: p.materialId,
        discipline: p.discipline,
        nodeId: p.nodeId,
        handle: p.handle,
        refs: p.refs,
        ...(p.exposedRefs === undefined ? {} : { exposedRefs: p.exposedRefs }),
      })),
      state: 'valid',
      ...(grand.length === 0 ? {} : { children: grand }),
      element: childElement,
    };
    tree.push(g);
    flat.push(g);
  }
  return tree;
}

/**
 * D59 — apply the root's placement to a whole child SUBTREE, producing the placed tree + its flat projection.
 * The children were built in the root's LOCAL frame; `transform` mints no identities (D25), so a placed panel
 * is the same panel token-for-token. An empty placement passes handles through unchanged (no transform, no
 * garbage). Each transformed pre-placement solid is handed back as an intermediate.
 */
async function placeTree(
  tree: readonly ElementGeometry[],
  motions: readonly RigidMotion[],
  request: GeometryGateway['request'],
  intermediates: string[],
): Promise<{
  readonly tree: readonly ElementGeometry[];
  readonly flat: readonly ElementGeometry[];
}> {
  const placedTree: ElementGeometry[] = [];
  const flat: ElementGeometry[] = [];
  for (const node of tree) {
    let placedParts: readonly Part[] = node.parts;
    if (motions.length > 0 && node.parts.length > 0) {
      const next: Part[] = [];
      for (const part of node.parts) {
        const result = await request('transform', { handle: part.handle, motions });
        intermediates.push(part.handle); // the pre-placement solid is now garbage
        next.push({ ...part, handle: result.handle, refs: result.refs });
      }
      placedParts = next;
    }
    const sub =
      node.children === undefined
        ? { tree: [] as readonly ElementGeometry[], flat: [] as readonly ElementGeometry[] }
        : await placeTree(node.children, motions, request, intermediates);
    const placedNode: ElementGeometry = {
      elementId: node.elementId,
      parts: placedParts,
      state: node.state,
      ...(node.error === undefined ? {} : { error: node.error }),
      ...(node.failure === undefined ? {} : { failure: node.failure }),
      ...(sub.tree.length === 0 ? {} : { children: sub.tree }),
      // ⚠ Placement moves solids, never identity (D25: `transform` mints no identities) — so the child's
      // Element rides through unchanged. Dropping it here would lose it on every PLACED composite, which
      // is every real one.
      ...(node.element === undefined ? {} : { element: node.element }),
    };
    placedTree.push(placedNode);
    flat.push(placedNode, ...sub.flat);
  }
  return { tree: placedTree, flat };
}

/**
 * ⓙ — BUILD A HOSTED ELEMENT'S SOLID (a door's leaf/frame). The other half of a hosted element: `buildVoid`
 * makes the hole, `buildLeaf` makes the thing IN the hole. Absent ⇒ a pure void (a plain opening), and this
 * returns `[]` — byte-identical to the pre-ⓙ behaviour.
 *
 * The leaf is built in the HOST's local frame (from `hostFace`, like the void); here the engine applies the
 * host's placement last, so the door rides its wall into the world. Throws on a duplicate leaf node id or a
 * placement refusal — the caller marks the opening `failed` (the wall + its hole survive; only the door is
 * lost), and every solid this touched is handed back as garbage so nothing leaks on the failure path.
 */
async function buildLeafParts(
  voidType: BimObjectType,
  ctx: VoidBuildContext,
  host: Element,
  request: GeometryGateway['request'],
  intermediates: string[],
): Promise<readonly Part[]> {
  if (voidType.buildLeaf === undefined) return [];

  const leaves = await voidType.buildLeaf(ctx);
  if (leaves.length === 0) return [];

  // ⚠ IDENTITY CHECK, exactly as for base parts (see step 1): two leaf parts on ONE DAG node would mint
  // byte-identical `SubShapeRef` tokens for different solids — the ironmongery hosted on one would be on
  // both, or neither. `core_logic.md` §5: an identity that cannot be derived structurally is a REFUSAL.
  const nodes = new Set<string>();
  for (const leaf of leaves) {
    if (nodes.has(leaf.nodeId)) {
      for (const built of leaves) intermediates.push(built.handle);
      throw new Error(
        `opening "${ctx.element.id}" builds two leaf parts on the DAG node "${leaf.nodeId}" — their ` +
          `sub-shape references would be identical tokens naming different faces. Part names must be unique.`,
      );
    }
    nodes.add(leaf.nodeId);
  }

  const placed: Part[] = [];
  try {
    for (const leaf of leaves) {
      let handle = leaf.handle;
      let refs = leaf.refs;
      // ⚠ IT IS THE HOST's placement the leaf rides, never the opening's — the void that made room for it
      // was cut in the host's OWN frame BEFORE the host was placed (step 3 places host parts last), so the
      // leaf must follow the same motion to stay in its doorway. `transform` mints no identities (D25), so
      // the leaf's `refs` come back token for token — a rotated door is the same door.
      if (host.placement !== undefined && host.placement.length > 0) {
        const result = await request('transform', { handle, motions: host.placement });
        intermediates.push(handle); // the pre-placement solid is now garbage
        handle = result.handle;
        refs = result.refs;
      }
      placed.push({
        name: leaf.name,
        materialId: leaf.materialId,
        discipline: leaf.discipline,
        nodeId: leaf.nodeId,
        handle,
        refs,
      });
    }
  } catch (error) {
    // A placement refused mid-way: every solid we hold — the raw leaves and the ones already placed — is
    // now garbage. Hand it all back so nothing leaks, then let the caller mark the opening failed.
    for (const leaf of leaves) intermediates.push(leaf.handle);
    for (const part of placed) intermediates.push(part.handle);
    throw error;
  }
  return placed;
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  // ⚠ NOT DEAD CODE. OCCT/Emscripten throws bare integers, not `Error`s — the naive `catch (e: Error)`
  // drops them on the floor (this cost us a test in Entry 7, and it is why one exists for it).
  return String(error);
}
