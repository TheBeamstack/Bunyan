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

import type { BrokenReference, Element, ElementId, Params, Part } from './entities.js';
import { cutNodeId, partNodeId } from './geometry.js';
import type { GeometryGateway, GeometryRequestOptions } from './geometry.js';
import { elevationOf, hostedBy } from './scene.js';
import type { Scene } from './scene.js';
import { withDefaults } from './schema.js';
import type { Registries } from './registries.js';
import type { BuildContext, BuiltPart, VoidBuildContext } from './types.js';

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
  rootId: ElementId,
  options: BuildOptions = {},
): Promise<{
  readonly result: ElementGeometry;
  readonly voids: readonly ElementGeometry[];
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
  if (type.buildGeometry === undefined) {
    return unbuildable(`type "${element.typeId}" cannot build a solid (no buildGeometry)`);
  }

  // ---- 1. THE BASE PARTS. An element is its parts, in order (D30). --------------------------------
  const failed = (error: string): Awaited<ReturnType<typeof buildAssembly>> => ({
    result: { elementId: rootId, parts: [], state: 'failed', error, failure: 'geometry' },
    voids: [],
    brokenRefs,
    intermediates,
  });

  const discard = (handle: string): void => {
    intermediates.push(handle);
  };

  let base: readonly BuiltPart[];
  try {
    base = await type.buildGeometry(
      contextFor(scene, registries, { request }, element, element.params, discard),
    );
  } catch (error) {
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
      const built = await voidType.buildVoid(
        voidContextFor(scene, registries, { request }, opening, element, hostFace, discard),
      );
      intermediates.push(built.handle);
      cuts.push({ opening, handle: built.handle });
      voidResults.push({ elementId: opening.id, parts: [], state: 'valid' });
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
      });
    }
  } catch (error) {
    // The cut failed (a fillet too large, an empty boolean, an invalid result). REJECT THE EDIT AND
    // KEEP THE LAST-GOOD STATE — no partial geometry, no auto-repair (domain rule 4, spec §6.4).
    // ⚠ `failure: 'geometry'` is what tells `DocumentContext` this one REJECTS THE COMMAND (D42),
    // where an `unbuildable` type merely marks the element and lets the document carry on (D43).
    for (const part of parts) intermediates.push(part.handle);
    return {
      result: {
        elementId: rootId,
        parts: [],
        state: 'failed',
        error: messageOf(error),
        failure: 'geometry',
      },
      voids: voidResults,
      brokenRefs,
      intermediates,
    };
  }

  const state = brokenRefs.length > 0 ? 'broken-ref' : 'valid';
  return {
    result: { elementId: rootId, parts, state },
    voids: voidResults,
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
  element: Element,
  rawParams: Params,
  discard: (handle: string) => void = () => undefined,
): BuildContext {
  const type = registries.types.require(element.typeId);
  const style = element.styleId === undefined ? undefined : scene.styles[element.styleId];
  return {
    element,
    params: withDefaults(type.parameterSchema, rawParams),
    ...(style === undefined ? {} : { style }),
    material: (id) => scene.materials[id],
    section: (id) => scene.sections[id],
    container: (id) => scene.containers[id],
    elevation: elevationOf(scene, element.containerId),
    // ⚠ `other` only when a Type declares none AND builds an unstyled part — an honest "nobody said",
    // never a guess at the trade. D45: never inferred from the material.
    defaultDiscipline: type.defaultDiscipline ?? 'other',
    geometry,
    nodeId: (partName) => partNodeId(element.id, partName),
    // ⚠ The Type DECLARES its garbage; the engine collects it; `DocumentContext` frees it — once, at
    // the end of the rebuild, and only after checking it is not also somebody's final solid.
    discard,
  };
}

function voidContextFor(
  scene: Scene,
  registries: Registries,
  geometry: GeometryGateway,
  opening: Element,
  host: Element,
  hostFace: VoidBuildContext['hostFace'],
  discard: (handle: string) => void,
): VoidBuildContext {
  const hostType = registries.types.require(host.typeId);
  const hostStyle = host.styleId === undefined ? undefined : scene.styles[host.styleId];
  return {
    ...contextFor(scene, registries, geometry, opening, opening.params, discard),
    host,
    hostParams: withDefaults(hostType.parameterSchema, host.params),
    ...(hostStyle === undefined ? {} : { hostStyle }),
    hostFace,
  };
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  // ⚠ NOT DEAD CODE. OCCT/Emscripten throws bare integers, not `Error`s — the naive `catch (e: Error)`
  // drops them on the floor (this cost us a test in Entry 7, and it is why one exists for it).
  return String(error);
}
