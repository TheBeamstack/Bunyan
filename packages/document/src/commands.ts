/**
 * THE COMMAND LAYER — and there is only one (decision D19, domain rule 9).
 *
 * ⚠⚠ THE RULING, IN ONE LINE: **every action — a button, a drag, an agent verb — is a `Command`, and
 * no actor has a private path to the kernel.**
 *
 *     button / drag ─┐
 *     agent verb ────┼──►  Command registry ──► DocumentContext ──► KernelClient ──► OCCT
 *     MCP [v1.0.x] ──┘         the only door
 *
 * **Every capability reachable only through the UI is a capability an agent can never have** — and
 * nobody discovers the gap until an agent is asked to use it, a year later. So there is no second API,
 * and this file is not "the agent's API": it is *the* API, and the agent is simply another actor at
 * the same door.
 *
 * ⚠ AND THE TWO PROPERTIES THAT MAKE IT WORK (D21, D23):
 *   - **`argsSchema`** — so the agent's tool list is GENERATED from the registry, never maintained
 *     beside it (a hand-written one drifts within weeks; a derived one cannot).
 *   - **`execute` RETURNS its `UndoableEdit`** — so the diff an actor verifies against and the delta
 *     undo reverses are the same object, and verification costs nothing extra.
 */

import type {
  BrokenReference,
  Classification,
  ConstraintTarget,
  DatumConstraint,
  Element,
  ElementId,
  ElementStyle,
  Grid,
  JoinConstraint,
  Material,
  ParamValue,
  Params,
  Section,
  SketchConstraint,
  SketchConstraintKind,
  SketchOperands,
  SpatialContainer,
} from './entities.js';
import { isDatumConstraint, isJoinConstraint } from './entities.js';
import { joinOverridesOf, wallsMeet } from './joins.js';
import { readSketch } from './sketch.js';
import type { Registries } from './registries.js';
import type { Scene, SceneChange } from './scene.js';
import { hostedBy, instancesOfStyle, stylesUsingMaterial, stylesUsingSection } from './scene.js';
import type { ParamSchema } from './schema.js';
import { validateParams, withDefaults } from './schema.js';
import type { UndoableEdit } from './undo.js';
import type { ModelRevision } from './revision.js';
import { nextRevision } from './revision.js';

/**
 * A typed command failure. **Reject + keep last-good** (domain rule 4, spec §6.4): a failed command
 * produces NO `UndoableEdit` and the document remains at its last valid state.
 */
export class CommandFailure extends Error {
  readonly code: 'INVALID_ARGS' | 'NOT_FOUND' | 'REFUSED' | 'GEOMETRY_FAILED';
  readonly details: readonly string[];

  constructor(code: CommandFailure['code'], message: string, details: readonly string[] = []) {
    super(message);
    this.name = 'CommandFailure';
    this.code = code;
    this.details = details;
  }
}

/**
 * What a command may do. Note what is ABSENT: the kernel (D19), the undo stack, and any way to mutate
 * the scene directly. **A command PROPOSES a state delta; it does not apply one.** That is what keeps
 * "reject + keep last-good" true by construction rather than by discipline — a command that fails
 * cannot have half-changed anything, because it never had the power to change anything.
 */
export interface CommandContext {
  readonly scene: Scene;
  readonly registries: Registries;
  /**
   * Mint a new element id — its **PEI** (D44). A prefixed ULID (`wall-01J8Z3K7Q2`), never a counter:
   * a counter reuses the ids of deleted elements, and it forecloses co-editing (see `ulid.ts`).
   */
  readonly mintId: (prefix: string) => string;
  /** The revision this document was last ISSUED at (D34). `undefined` ⇒ never issued. */
  readonly revision: ModelRevision | undefined;
  /** The journal `seq` this command's edit will carry (D40) — what `issued_at_seq` anchors to. */
  readonly seq: number;
  /** Build the `UndoableEdit` this command returns. `rebuilt` = the elements whose geometry is stale. */
  readonly edit: (
    label: string,
    changes: readonly SceneChange[],
    rebuilt: readonly ElementId[],
    extra?: { readonly revision?: ModelRevision },
  ) => UndoableEdit;
}

export interface Command {
  /** `core.createElement`. The verb an agent calls, and the id the ribbon binds a button to. */
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  /** ⚠ The field that makes capability discovery generated rather than maintained (D21). */
  readonly argsSchema: ParamSchema;
  /** ⚠ Returns the delta (D23). The thing undo reverses and the thing an actor verifies with. */
  readonly execute: (ctx: CommandContext, args: Params) => Promise<UndoableEdit> | UndoableEdit;
}

/* ================================================================================================
 * Helpers
 * ============================================================================================= */

function requireElement(scene: Scene, id: unknown): Element {
  if (typeof id !== 'string' || scene.elements[id] === undefined) {
    throw new CommandFailure('NOT_FOUND', `no element "${String(id)}" in this document`);
  }
  return scene.elements[id];
}

function checkArgs(command: Command, args: Params): Params {
  const issues = validateParams(command.argsSchema, args);
  if (issues.length > 0) {
    throw new CommandFailure(
      'INVALID_ARGS',
      `invalid arguments for "${command.id}"`,
      issues.map((i) => i.message),
    );
  }
  return withDefaults(command.argsSchema, args);
}

/**
 * Narrow a validated `ParamValue` to a string / number.
 *
 * ⚠ NOT `String(value)`. A `ParamValue` may be an object, and `String({})` is `"[object Object]"` — a
 * value that would sail through every id check in this file and then name a style, a material or a
 * DAG node. The schema has already proven the type (`validateParams` walked every field); these
 * narrow to it rather than coercing, so a bug in the schema surfaces as a refusal, not as an element
 * called `[object Object]`.
 */
function text(value: ParamValue | undefined, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}
function num(value: ParamValue | undefined, fallback = 0): number {
  return typeof value === 'number' ? value : fallback;
}

/**
 * The layer stack, out of a validated `ParamValue` bag. The schema has already proven the shape
 * (`validateParams` walked every field), so this narrows rather than trusts.
 */
function asLayers(raw: unknown): ElementStyle['layers'] | undefined {
  if (raw === undefined) return undefined;
  return raw as ElementStyle['layers'];
}

/**
 * ⚠ `/` and `#` are the `SubShapeRef` token separators — a string containing one could forge a ref.
 *
 * ⚠⚠ **AND NOTE WHAT THIS MUST BE CALLED ON.** It used to be called only on a **minted** id — which is
 * a ULID and *can never contain a separator*, so the guard was on the one path that never needed it,
 * while the strings that actually reach a `nodeId` — **the style's layer names, which an agent
 * authors** — went unchecked. A guard on the safe path is not a guard.
 */
function checkNameSafe(name: string, what: string): void {
  // ⚠ `/` and `#` separate a `SubShapeRef`'s parts (`node/face/y-min#0`); `~` separates a cut's node
  // (`wall-1.structure~window-2`). A name carrying one could forge a token naming another solid's face.
  //
  // ⚠ **`.` is deliberately ALLOWED** — `finish.interior` is the established part-name convention, and
  // it is unambiguous: a part's node is `${elementId}.${partName}`, and an element id is a prefixed
  // ULID that **contains no dot**. So the first dot always separates the id from the name, however many
  // follow it. (Ban it and you break every layer stack in the product for no safety at all.)
  if (/[/#~]/.test(name)) {
    throw new CommandFailure(
      'REFUSED',
      `${what} "${name}" contains one of "/", "#" or "~" — these are SubShapeRef / DAG-node ` +
        `separators, and a name carrying one could forge a reference to another element's face`,
    );
  }
}

/**
 * ⚠⚠ THE LAYER STACK IS AN IDENTITY-BEARING STRUCTURE, AND THESE ARE IDENTITY CHECKS.
 *
 * A layer becomes a **Part**, and a Part's DAG node is `${elementId}.${layerName}` — so:
 *
 *   - **two layers with the same name mint BYTE-IDENTICAL `SubShapeRef` tokens** for different faces of
 *     different solids. Measured: two layers called `structure` produced 6 colliding ref tokens. A
 *     window hosted on one of them is hosted on both, or on neither, and nothing downstream can recover
 *     which was meant. *(`core_logic.md` §5: an identity that cannot be derived structurally is a
 *     refusal, never an invention.)*
 *   - a layer naming a **material that does not exist** yields a part whose mass cannot be computed —
 *     and `updateStyle` checked this while `createStyle` did not, so the *first* way anyone creates a
 *     style was the unguarded one.
 */
function checkLayers(scene: Scene, layers: ElementStyle['layers']): void {
  const names = new Set<string>();
  for (const layer of layers ?? []) {
    checkNameSafe(layer.name, 'layer name');
    if (names.has(layer.name)) {
      throw new CommandFailure(
        'REFUSED',
        `two layers are both named "${layer.name}" — their parts would share a DAG node and mint ` +
          `identical SubShapeRefs for different faces. Layer names must be unique within a style.`,
      );
    }
    names.add(layer.name);
    if (scene.materials[layer.materialId] === undefined) {
      throw new CommandFailure('NOT_FOUND', `unknown material "${layer.materialId}"`);
    }
  }
}

/* ================================================================================================
 * THE REFUSE-OR-RETARGET GUARD (D50 step 0f, D51 generalised — Freeze-Gate row ⓓ)
 *
 * ⚠⚠ THE RULE, IN ONE LINE: **a command never silently changes what a reference points at.** A destructive
 * or repointing edit computes what it would break; if anything, it REFUSES with a typed failure that NAMES
 * the references — unless the caller passes `retargetMap` (redirect them) or `acknowledge` (proceed, let
 * them break, first-class). Modelled on a database foreign key: RESTRICT | SET | (acknowledged) CASCADE.
 *
 * ⚠ WHY ONE HELPER, NOT A CHECK PER COMMAND. D51 was WRITTEN as a rule ("a command must never do it
 * silently", D26) and NEVER BUILT — `updateStyle` renamed a layer and orphaned every opening hosted on it,
 * `brokenRefs` 0→1, no warning. The rule existed; the single place to enforce it did not. This is that place.
 * ============================================================================================= */

/** One thing that references the entity a command is about to remove or repoint. */
interface Referrer {
  /** Named in the refusal, so the UI/agent sees exactly what is at stake. */
  readonly describe: string;
  /** The `retargetMap` key that resolves this referrer — the OLD id/token being removed or renamed. */
  readonly retargetKey: string;
  /** The change that repoints this referrer to `to` (used when `retargetMap` supplies a replacement). */
  readonly redirect: (to: string) => SceneChange;
}

/** The two args every guarded command carries. ⚠ THIS SHAPE FREEZES at P5 (row ⓓ). */
const GUARD_ARGS: ParamSchema = {
  acknowledge: {
    kind: 'boolean',
    label: 'Acknowledge',
    description: 'Proceed even though it breaks references — they become first-class broken refs.',
  },
  retargetMap: {
    kind: 'object',
    label: 'Retarget map',
    description: 'old id/token → new — redirect each reference instead of breaking it.',
  },
};

/**
 * Refuse-or-retarget. Returns the extra `SceneChange`s that repoint the redirected referrers (folded into
 * the command's own edit, so it is one atomic, undoable unit). Throws `REFUSED` — naming every reference —
 * if any would break and the caller neither retargeted nor acknowledged it.
 */
function guardReferences(
  subject: string,
  referrers: readonly Referrer[],
  args: Params,
): readonly SceneChange[] {
  if (referrers.length === 0) return [];
  const acknowledge = args['acknowledge'] === true;
  const map = (args['retargetMap'] ?? {}) as Record<string, string>;
  const extra: SceneChange[] = [];
  const blocked: string[] = [];
  for (const r of referrers) {
    const to = map[r.retargetKey];
    if (to !== undefined) extra.push(r.redirect(to));
    else if (!acknowledge) blocked.push(r.describe);
  }
  if (blocked.length > 0) {
    throw new CommandFailure(
      'REFUSED',
      `${subject} is still referenced — refusing to break ${blocked.length} reference(s) silently. ` +
        `Pass retargetMap to redirect them, or acknowledge:true to proceed and let them break.`,
      blocked,
    );
  }
  return extra;
}

/* ---- Reference finders: who points AT a library entity (the §1 taxonomy of the 0e design) -------- */

/** Styles with a layer built of this material → redirect swaps the material in every matching layer. */
function materialReferrers(scene: Scene, materialId: string): readonly Referrer[] {
  return stylesUsingMaterial(scene, materialId).map((style) => ({
    describe: `style "${style.id}" has a layer of material "${materialId}"`,
    retargetKey: materialId,
    redirect: (to) =>
      bumpStyle(style, {
        layers: (style.layers ?? []).map((l) =>
          l.materialId === materialId ? { ...l, materialId: to } : l,
        ),
      }),
  }));
}

/** Styles that name this section → redirect swaps the `sectionId`. */
function sectionReferrers(scene: Scene, sectionId: string): readonly Referrer[] {
  return stylesUsingSection(scene, sectionId).map((style) => ({
    describe: `style "${style.id}" is swept from section "${sectionId}"`,
    retargetKey: sectionId,
    redirect: (to) => bumpStyle(style, { sectionId: to }),
  }));
}

/** Elements wearing this style → redirect swaps the `styleId`. */
function styleReferrers(scene: Scene, styleId: string): readonly Referrer[] {
  return instancesOfStyle(scene, styleId).map((el) => ({
    describe: `element "${el.id}" wears style "${styleId}"`,
    retargetKey: styleId,
    redirect: (to) => elementChange(el, { ...el, styleId: to }),
  }));
}

/** Everything anchored to a container: elements on it, base/top constraints, and child containers. */
function containerReferrers(scene: Scene, containerId: string): readonly Referrer[] {
  const out: Referrer[] = [];
  for (const el of Object.values(scene.elements)) {
    if (el.containerId === containerId) {
      out.push({
        describe: `element "${el.id}" is on container "${containerId}"`,
        retargetKey: containerId,
        redirect: (to) => elementChange(el, { ...el, containerId: to }),
      });
    }
  }
  for (const c of Object.values(scene.constraints)) {
    if (isDatumConstraint(c) && c.target.kind === 'level' && c.target.id === containerId) {
      out.push({
        describe: `constraint "${c.id}" (${c.kind}) targets level "${containerId}"`,
        retargetKey: containerId,
        redirect: (to) => constraintChange(c, { ...c, target: { kind: 'level', id: to } }),
      });
    }
  }
  for (const child of Object.values(scene.containers)) {
    if (child.parentId === containerId) {
      out.push({
        describe: `container "${child.id}" is a child of "${containerId}"`,
        retargetKey: containerId,
        redirect: (to) => ({
          collection: 'containers',
          id: child.id,
          before: child,
          after: { ...child, parentId: to },
        }),
      });
    }
  }
  return out;
}

/** Grid constraints that place an element on this axis → redirect swaps the axis. */
function gridReferrers(scene: Scene, gridId: string): readonly Referrer[] {
  return Object.values(scene.constraints)
    .filter(
      (c): c is DatumConstraint =>
        isDatumConstraint(c) && c.target.kind === 'grid' && c.target.id === gridId,
    )
    .map((c) => ({
      describe: `constraint "${c.id}" places element "${c.element}" on grid "${gridId}"`,
      retargetKey: gridId,
      redirect: (to) => constraintChange(c, { ...c, target: { kind: 'grid', id: to } }),
    }));
}

/**
 * ⚠⚠ THE ORIGINAL D51 CASE. Openings hosted on a style layer whose NAME is disappearing (renamed or
 * removed). The layer name is INSIDE the `SubShapeRef` token (`wall-1.finish.interior/face/y-min#0`), so a
 * rename re-mints identities across every wall wearing the style. `retargetMap` maps the OLD layer name to
 * the NEW one, and the redirect rewrites the token's node segment; `acknowledge` lets the openings orphan.
 */
function layerRenameReferrers(
  scene: Scene,
  style: ElementStyle,
  newLayers: ElementStyle['layers'],
): readonly Referrer[] {
  const kept = new Set((newLayers ?? []).map((l) => l.name));
  const lost = new Set((style.layers ?? []).map((l) => l.name).filter((n) => !kept.has(n)));
  if (lost.size === 0) return [];
  const instances = new Set(instancesOfStyle(scene, style.id).map((e) => e.id));
  const out: Referrer[] = [];
  for (const el of Object.values(scene.elements)) {
    if (el.hostId === undefined || el.hostRef === undefined || !instances.has(el.hostId)) continue;
    const layer = layerNameOfRef(el.hostId, el.hostRef);
    if (layer === undefined || !lost.has(layer)) continue;
    out.push({
      describe: `opening "${el.id}" is hosted on layer "${layer}"`,
      retargetKey: layer,
      redirect: (to) =>
        elementChange(el, { ...el, hostRef: rewriteLayerInRef(el.hostId!, el.hostRef!, to) }),
    });
  }
  return out;
}

/** The layer name inside a hosted opening's `SubShapeRef` — `<hostId>.<layerName>/face/…` → `layerName`. */
function layerNameOfRef(hostId: ElementId, ref: string): string | undefined {
  const slash = ref.indexOf('/');
  const node = slash === -1 ? ref : ref.slice(0, slash);
  return node.startsWith(`${hostId}.`) ? node.slice(hostId.length + 1) : undefined;
}

/** Rewrite the layer-name segment of a hosted opening's `SubShapeRef` to `newName`. */
function rewriteLayerInRef(hostId: ElementId, ref: string, newName: string): string {
  const slash = ref.indexOf('/');
  return `${hostId}.${newName}${slash === -1 ? '' : ref.slice(slash)}`;
}

function bumpStyle(style: ElementStyle, patch: Partial<ElementStyle>): SceneChange {
  return {
    collection: 'styles',
    id: style.id,
    before: style,
    after: { ...style, ...patch, version: style.version + 1 },
  };
}
function elementChange(before: Element, after: Element): SceneChange {
  return { collection: 'elements', id: after.id, before, after };
}
function constraintChange(before: DatumConstraint, after: DatumConstraint): SceneChange {
  return { collection: 'constraints', id: after.id, before, after };
}

/* ================================================================================================
 * THE CORE COMMANDS
 * ============================================================================================= */

/**
 * ⚠ TYPE-DRIVEN VERBS, AND PRIMITIVES ARE THE ESCAPE HATCH (D20).
 * `createElement('core.wall.v1', {...})` — **not** "draw a rectangle then extrude it". It is free,
 * because a BIM Object Type already *is* the recipe from params to geometry. An agent asked to place a
 * wall should say "wall", and the kernel's primitives should not be its vocabulary.
 */
export const createElementCommand: Command = {
  id: 'core.createElement',
  label: 'Create element',
  description:
    "Create a BIM element of a registered type. Params are validated against the type's parameterSchema.",
  argsSchema: {
    typeId: { kind: 'string', label: 'Type', required: true, description: 'e.g. core.wall.v1' },
    params: { kind: 'object', label: 'Parameters', required: true },
    styleId: {
      kind: 'ref',
      refTo: 'style',
      label: 'Style',
      description: 'The shared parameter set',
    },
    name: { kind: 'string', label: 'Name' },
    containerId: { kind: 'ref', refTo: 'container', label: 'Level / Space' },
    // ⚠ ACTIVE-DATUM BINDINGS (D50 step 0b). These fold the element and its `Constraint`s into ONE edit
    // (owner decision, one atomic undo). `baseLevel`/`topLevel` span a wall between two Levels — height
    // is DERIVED (D52); `*Offset` lifts/drops the extent (a parapet, a footing — Finding 1). `gridRefs`
    // places the element on grid axes (its intersection). All are stored as constraints, never on the
    // element (owner decision A). Standalone `createConstraint`/`deleteConstraint` edit them afterward.
    baseLevel: { kind: 'ref', refTo: 'container', label: 'Base level' },
    baseOffset: { kind: 'number', label: 'Base offset', unit: 'mm' },
    topLevel: {
      kind: 'ref',
      refTo: 'container',
      label: 'Top level',
      description: 'Height is derived',
    },
    topOffset: { kind: 'number', label: 'Top offset', unit: 'mm' },
    gridRefs: {
      kind: 'array',
      label: 'Grid axes',
      description: 'Grid axes to place on — their intersection is the placement point',
      items: { kind: 'ref', refTo: 'grid', label: 'Grid' },
    },
    hostId: { kind: 'ref', refTo: 'element', label: 'Host', description: 'For a hosted void' },
    hostRef: { kind: 'subShapeRef', label: 'Host face', description: 'The face it is hosted on' },
    placement: {
      kind: 'array',
      label: 'Placement',
      description:
        'Rigid motions putting the element in the world. Applied AFTER its openings are cut.',
      items: { kind: 'object', label: 'Motion' },
    },
    loadBearing: {
      kind: 'boolean',
      label: 'Load-bearing',
      description: 'D36 — Miqdar must not guess',
    },
    // ⚠ NO `discipline` ARG (D45). It is a property of a PART, authored on the style's layer — an RC
    // wall is a structural core with architectural plaster on it, and an element-level value says
    // something false about exactly the parts that matter.
    //
    // ⚠⚠ RESERVED-AT-FREEZE METADATA (0g.2, Freeze-Gate ⓣ). 0g (Entry 37) reserved these SHAPES on
    // `Element`; `Command.argsSchema` freezes at the SAME step 6, so the AUTHORING slot must be reserved
    // WITH them — else a later body (P6 writes `properties`; 2D writes `mark`; Planitor writes `phase*`)
    // amends a frozen contract + the agent tool-list. All optional; an element can be BORN with them in
    // ONE atomic edit. Post-create editing is `core.setElementMetadata` (below). No body reads them yet.
    mark: {
      kind: 'string',
      label: 'Mark',
      description: 'Schedule / drawing-tag identifier — W-01, C12 (ⓡ)',
    },
    phaseCreated: {
      kind: 'string',
      label: 'Phase created',
      description: 'Construction phase this element appears in (ⓛ)',
    },
    phaseDemolished: {
      kind: 'string',
      label: 'Phase demolished',
      description: 'Construction phase this element is removed in (ⓛ)',
    },
    parentElementId: {
      kind: 'ref',
      refTo: 'element',
      label: 'Parent element',
      description: 'Nesting — a curtain-wall panel/mullion, an assembly member (ⓝ)',
    },
    properties: {
      kind: 'object',
      label: 'Properties',
      description: 'IFC / agent property sets — pset name → { property → value } (ⓟ)',
    },
    classifications: {
      kind: 'object',
      label: 'Classifications',
      description: 'Classification-system codes — system → code, e.g. Uniclass2015 → EF_25_10 (ⓠ)',
    },
    // ⚠⚠ ROW Ⓕ RESERVED ARGS (2026-07-24, owner-ruled Q1 "full reserve" — `P5_step5F_reservations_
    // design.md`). The SAME ⓣ lesson 0g.2 learned the hard way: `Element.systemId`/`connectors`/
    // `designOptionId` are reserved element fields, and `argsSchema` freezes at the SAME step 6 — so a
    // reserved noun WITHOUT an authoring slot forces a later body to amend a frozen contract *and* the
    // generated agent tool-list. Reserved here so Parity-C/F are a BUILD, not an amendment. No body reads
    // them in v1.0.0; an element can be BORN with them in one atomic edit.
    systemId: {
      kind: 'ref',
      refTo: 'system',
      label: 'MEP system',
      description: 'The network this element belongs to — SA-1, CWS (D62, reserved)',
    },
    connectors: {
      kind: 'array',
      label: 'Connectors',
      description:
        "MEP ports where other components join — position/direction in the element's OWN BUILD FRAME (D62, reserved)",
      items: { kind: 'object', label: 'Connector' },
    },
    designOptionId: {
      kind: 'ref',
      refTo: 'designOption',
      label: 'Design option',
      description:
        'The design alternative this element belongs to; absent ⇒ main model (D65, reserved). ⚠ Consumers must exclude non-active options',
    },
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(createElementCommand, rawArgs);
    const typeId = text(args['typeId']);
    const type = ctx.registries.types.get(typeId);
    if (type === undefined) throw new CommandFailure('NOT_FOUND', `unknown type "${typeId}"`);

    const params = (args['params'] ?? {}) as Params;
    const issues = validateParams(type.parameterSchema, params);
    if (issues.length > 0) {
      throw new CommandFailure(
        'INVALID_ARGS',
        `invalid params for type "${typeId}"`,
        issues.map((i) => i.message),
      );
    }

    const styleId = args['styleId'] as string | undefined;
    if (styleId !== undefined) {
      const style = ctx.scene.styles[styleId];
      if (style === undefined) throw new CommandFailure('NOT_FOUND', `unknown style "${styleId}"`);
      // ⚠ A Wall style cannot be worn by a Slab. The style names the type it is FOR, and that is not
      // bureaucracy: a layer stack means something different to each, and a silent mismatch would
      // build a plausible, wrong solid.
      if (style.typeId !== typeId) {
        throw new CommandFailure(
          'REFUSED',
          `style "${styleId}" is for type "${style.typeId}", not "${typeId}"`,
        );
      }
    }

    const hostId = args['hostId'] as string | undefined;
    if (hostId !== undefined) requireElement(ctx.scene, hostId);

    // ⚠ THE LBS ADDRESS, AND IT WAS UNVALIDATED. `containerId` is the element's place in the spatial
    // tree (D35) — which IS Planitor's Location Breakdown Structure. A typo did not fail: `elevationOf`
    // returns 0 for an unknown container, so the wall was silently built **on the ground floor** (z-min
    // 9000 → 0, measured). A wrong building AND a wrong work package, from one mistyped string.
    const containerId = args['containerId'] as string | undefined;
    if (containerId !== undefined && ctx.scene.containers[containerId] === undefined) {
      throw new CommandFailure('NOT_FOUND', `unknown container "${containerId}"`);
    }

    // ⚠ RESERVED FIELD, but a REF is still validated (a dangling ref is the silent breakage this project
    // refuses — the `containerId` lesson). Nesting semantics land in a later phase; the id must resolve.
    const parentElementId = args['parentElementId'] as string | undefined;
    if (parentElementId !== undefined) requireElement(ctx.scene, parentElementId);

    const id = ctx.mintId(typeId.split('.')[1] ?? 'element');

    // ⚠ THE DATUM BINDINGS become `Constraint`s in the SAME edit (D50 step 0b) — one atomic, one-undo
    // "create a wall from L1 to L2". `datumConstraintsFor` validates every target exists (a typo refuses,
    // it never silently places on the ground floor — the LBS lesson, one level up).
    const constraints = datumConstraintsFor(ctx, id, args);

    const classification: Classification = {
      ifcClass: type.defaultClassification.ifcClass,
      loadBearing:
        (args['loadBearing'] as boolean | undefined) ?? type.defaultClassification.loadBearing,
    };

    const element: Element = {
      id,
      typeId,
      typeVersion: type.version,
      params,
      classification,
      ...(styleId === undefined ? {} : { styleId }),
      ...(args['name'] === undefined ? {} : { name: text(args['name']) }),
      ...(containerId === undefined ? {} : { containerId }),
      ...(hostId === undefined ? {} : { hostId }),
      ...(args['hostRef'] === undefined ? {} : { hostRef: text(args['hostRef']) }),
      ...(args['placement'] === undefined
        ? {}
        : { placement: args['placement'] as NonNullable<Element['placement']> }),
      // ⚠ 0g.2 (ⓣ) — the reserved metadata, born WITH the element in this one atomic edit.
      ...(args['mark'] === undefined ? {} : { mark: text(args['mark']) }),
      ...(args['phaseCreated'] === undefined ? {} : { phaseCreated: text(args['phaseCreated']) }),
      ...(args['phaseDemolished'] === undefined
        ? {}
        : { phaseDemolished: text(args['phaseDemolished']) }),
      ...(parentElementId === undefined ? {} : { parentElementId }),
      ...(args['properties'] === undefined
        ? {}
        : { properties: args['properties'] as NonNullable<Element['properties']> }),
      ...(args['classifications'] === undefined
        ? {}
        : { classifications: args['classifications'] as NonNullable<Element['classifications']> }),
      // ⚠ ROW Ⓕ (D62/D65) — the reserved MEP/design-option state, born WITH the element in this one edit.
      // Shape-validated only: v1.0.0 has no `scene.systems`/`designOptions` CRUD to check an id against, and
      // inventing referential validation against collections nothing can author yet would refuse every
      // legitimate call. The integrity check lands WITH those bodies (Parity-C/F), like `parentElementId`'s.
      ...(args['systemId'] === undefined ? {} : { systemId: text(args['systemId']) }),
      // ⚠ Cast via `unknown`: a `Connector`'s `at`/`direction` are fixed-length TUPLES, which do not
      // structurally overlap `ParamValue`'s open array — unlike `placement`, whose motions are plain
      // objects. The arg is shape-checked by `checkArgs` as an array; the per-item schema lands with
      // Parity-C's body (there is no `scene.systems` CRUD to validate against yet).
      ...(args['connectors'] === undefined
        ? {}
        : { connectors: args['connectors'] as unknown as NonNullable<Element['connectors']> }),
      ...(args['designOptionId'] === undefined
        ? {}
        : { designOptionId: text(args['designOptionId']) }),
    };

    return ctx.edit(
      `Create ${type.label}`,
      [
        { collection: 'elements', id, after: element },
        ...constraints.map((c): SceneChange => ({ collection: 'constraints', id: c.id, after: c })),
      ],
      // A new void invalidates its HOST's geometry — the wall now has a hole in it.
      hostId === undefined ? [id] : [hostId],
    );
  },
};

/**
 * Build the `base`/`top`/`grid` `Constraint`s a `createElement` requested, validating every target exists.
 * A datum binding is first-class (D53) — never a param, never an element field — so it is minted here and
 * emitted in the create's edit. Offsets are folded onto base/top (Finding 1: a parapet is `top` + 1100).
 */
function datumConstraintsFor(
  ctx: CommandContext,
  element: ElementId,
  args: Params,
): readonly DatumConstraint[] {
  const out: DatumConstraint[] = [];
  const level = (kind: 'base' | 'top', levelArg: string, offsetArg: string): void => {
    const target = args[levelArg] as string | undefined;
    if (target === undefined) return;
    if (ctx.scene.containers[target] === undefined) {
      throw new CommandFailure('NOT_FOUND', `unknown ${kind} level "${target}"`);
    }
    const offset = args[offsetArg] as number | undefined;
    out.push({
      id: ctx.mintId('constraint'),
      element,
      kind,
      target: { kind: 'level', id: target },
      ...(offset === undefined ? {} : { offset }),
    });
  };
  level('base', 'baseLevel', 'baseOffset');
  level('top', 'topLevel', 'topOffset');
  for (const gridId of (args['gridRefs'] as readonly string[] | undefined) ?? []) {
    if (ctx.scene.grids[gridId] === undefined) {
      throw new CommandFailure('NOT_FOUND', `unknown grid "${gridId}"`);
    }
    out.push({
      id: ctx.mintId('constraint'),
      element,
      kind: 'grid',
      target: { kind: 'grid', id: gridId },
    });
  }
  return out;
}

export const setParamsCommand: Command = {
  id: 'core.setParams',
  label: 'Change parameters',
  description:
    "Change an element's instance parameters. The geometry is rebuilt from the new recipe.",
  argsSchema: {
    elementId: { kind: 'ref', refTo: 'element', label: 'Element', required: true },
    params: {
      kind: 'object',
      label: 'Parameters',
      required: true,
      description: 'Merged over existing',
    },
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(setParamsCommand, rawArgs);
    const element = requireElement(ctx.scene, args['elementId']);
    const type = ctx.registries.types.require(element.typeId);

    const params: Params = { ...element.params, ...((args['params'] ?? {}) as Params) };
    const issues = validateParams(type.parameterSchema, params);
    if (issues.length > 0) {
      throw new CommandFailure(
        'INVALID_ARGS',
        `invalid params for "${element.id}"`,
        issues.map((i) => i.message),
      );
    }

    const after: Element = { ...element, params };
    return ctx.edit(
      `Edit ${type.label}`,
      [{ collection: 'elements', id: element.id, before: element, after }],
      // ⚠ Its hosted openings rebuild WITH it: they are anchored to its faces, and the faces moved.
      [element.id, ...hostedBy(ctx.scene, element.id).map((o) => o.id)],
    );
  },
};

/**
 * ⚠⚠ THE MOST-USED OPERATION IN REVIT, AND BUNYAN COULD NOT EXPRESS IT UNTIL D31.
 * Edit `EXT-200-Concrete` and **four hundred walls rebuild.** That is the point of a Style, and it is
 * also the hook Miqdar's `DesignGroup` writes into (one section, assigned to a GROUP of columns).
 */
export const updateStyleCommand: Command = {
  id: 'core.updateStyle',
  label: 'Edit style',
  description:
    'Edit a shared style. EVERY element referencing it rebuilds — this is "change one wall type, update 400 walls".',
  argsSchema: {
    styleId: { kind: 'ref', refTo: 'style', label: 'Style', required: true },
    name: { kind: 'string', label: 'Name' },
    layers: {
      kind: 'array',
      label: 'Layer stack',
      description: 'Ordered. Each layer becomes a PART of every instance (D30).',
      items: {
        kind: 'object',
        label: 'Layer',
        fields: {
          name: { kind: 'string', label: 'Part name', required: true },
          materialId: { kind: 'ref', refTo: 'material', label: 'Material', required: true },
          thickness: { kind: 'number', label: 'Thickness', unit: 'mm', required: true, min: 0 },
          // ⚠ D45 — whose trade builds this layer. Required: the concreter and the plasterer are routed
          // to different work packages **on the same wall**, and nothing else in the model can say so.
          discipline: {
            kind: 'enum',
            label: 'Discipline',
            required: true,
            options: ['architectural', 'structural', 'mep', 'other'],
          },
        },
      },
    },
    sectionId: { kind: 'ref', refTo: 'section', label: 'Section' },
    params: { kind: 'object', label: 'Shared parameters' },
    // ⚠⚠ THE D51 GUARD (row ⓓ). Renaming or removing a layer whose NAME is inside a hosted opening's
    // `SubShapeRef` re-mints identities across every wall wearing the style — it is REFUSED unless the
    // caller redirects the openings (`retargetMap` old-layer-name → new) or accepts the break.
    ...GUARD_ARGS,
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(updateStyleCommand, rawArgs);
    const styleId = text(args['styleId']);
    const style = ctx.scene.styles[styleId];
    if (style === undefined) throw new CommandFailure('NOT_FOUND', `unknown style "${styleId}"`);

    const layers = asLayers(args['layers']);
    checkLayers(ctx.scene, layers);
    const sectionId = args['sectionId'] as string | undefined;
    if (sectionId !== undefined && ctx.scene.sections[sectionId] === undefined) {
      throw new CommandFailure('NOT_FOUND', `unknown section "${sectionId}"`);
    }

    // ⚠⚠ D51: a layer rename/removal that orphans openings is REFUSED here (the guard that was written as
    // a rule and never built), unless retargeted or acknowledged. Only relevant when `layers` is edited.
    const orphanRetargets =
      layers === undefined
        ? []
        : guardReferences(
            `style "${styleId}" layer rename`,
            layerRenameReferrers(ctx.scene, style, layers),
            args,
          );

    const after: ElementStyle = {
      ...style,
      version: style.version + 1,
      ...(args['name'] === undefined ? {} : { name: text(args['name']) }),
      ...(layers === undefined ? {} : { layers }),
      ...(sectionId === undefined ? {} : { sectionId }),
      ...(args['params'] === undefined ? {} : { params: args['params'] as Params }),
    };

    const instances = Object.values(ctx.scene.elements).filter((e) => e.styleId === styleId);
    return ctx.edit(
      `Edit style ${style.name}`,
      [{ collection: 'styles', id: styleId, before: style, after }, ...orphanRetargets],
      instances.flatMap((e) => [e.id, ...hostedBy(ctx.scene, e.id).map((o) => o.id)]),
    );
  },
};

/**
 * ⚠⚠ CASCADE-DELETE. **OWNER RULING (D39), 2026-07-13.**
 *
 * **Deleting a wall deletes the windows hosted in it — in ONE undoable edit, so undo restores both.**
 *
 * The question this settles: P3's exit criteria demanded that "deleting a wall that hosts a window has
 * a defined, tested outcome", and **no document said which outcome.** Domain rule 3 ("a broken
 * reference is a first-class state awaiting manual retargeting, never auto-healed") plainly governs a
 * ref whose SUB-SHAPE vanished — the face a window sat on disappearing when the wall is re-authored.
 * It does not settle what happens when the HOST ITSELF is deleted, and reading it as though it did
 * would make "broken" the normal state of the document after any delete.
 *
 * **The ruling, and the reasoning the owner accepted:** an Opening is DEFINED BY its host — a window
 * floating in space is not a thing, and its geometry is a boolean against a solid that no longer
 * exists. Revit and ArchiCAD both cascade (with a warning). So:
 *   - **cascade**, in one edit, undoably;
 *   - the caller **warns first** — ⚠ **and as of D42 that is `execute(…, { dryRun: true })`, NOT a
 *     `planDelete()`**, which is **deleted**. The dry run's would-be `UndoableEdit` already lists the
 *     entire cascade, because the *real command* computed it. A hand-written `plan…()` beside every
 *     verb is a second description of one behaviour, and a second description drifts (D21: **generated,
 *     never maintained**);
 *   - **broken-ref stays reserved for its real case**, which keeps domain rule 3 sharp instead of
 *     making it the routine outcome of a routine action.
 */
export const deleteElementCommand: Command = {
  id: 'core.deleteElement',
  label: 'Delete element',
  description:
    'Delete an element AND everything hosted on it (D39), as one undoable edit. To see what will go BEFORE acting, run it with { dryRun: true } — the returned edit already lists the whole cascade (D42).',
  argsSchema: {
    elementId: { kind: 'ref', refTo: 'element', label: 'Element', required: true },
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(deleteElementCommand, rawArgs);
    const element = requireElement(ctx.scene, args['elementId']);
    const type = ctx.registries.types.require(element.typeId);

    const doomed = [element, ...cascadeOf(ctx.scene, element.id)];
    const changes: SceneChange[] = doomed.map((e) => ({
      collection: 'elements' as const,
      id: e.id,
      before: e,
    }));

    // ⚠ CLEAN UP JOIN OVERRIDES that name a doomed wall (0c) — else a stored override would dangle in
    // `scene.json`, referencing an element that no longer exists. The corner's other wall re-stages to a
    // plain cap automatically: the invalidator's join edge sees the doomed wall's before-endpoints (§4).
    const clearedJoins = new Set<string>();
    for (const e of doomed) {
      for (const o of joinOverridesOf(ctx.scene, e.id)) {
        if (clearedJoins.has(o.id)) continue;
        clearedJoins.add(o.id);
        changes.push({ collection: 'constraints', id: o.id, before: o });
      }
    }

    // ⚠ Broken refs are NOT in the delta: they are DERIVED by the rebuild, not authored state. Deleting
    // the wall a complaint was about therefore retires the complaint automatically, on the next
    // rebuild — rather than leaving the document grumbling about an element nobody can see any more.

    // If the element was itself hosted, its HOST must rebuild — the hole is gone.
    const rebuilt = element.hostId === undefined ? [] : [element.hostId];

    return ctx.edit(
      doomed.length === 1
        ? `Delete ${type.label}`
        : `Delete ${type.label} and ${doomed.length - 1} hosted element(s)`,
      changes,
      rebuilt,
    );
  },
};

/** Everything that dies WITH this element (D39). Transitive: a window in a wall, a vent in the window. */
export function cascadeOf(scene: Scene, id: ElementId): readonly Element[] {
  const doomed: Element[] = [];
  const queue = [id];
  const seen = new Set<ElementId>([id]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const hosted of hostedBy(scene, current)) {
      if (seen.has(hosted.id)) continue;
      seen.add(hosted.id);
      doomed.push(hosted);
      queue.push(hosted.id);
    }
  }
  return doomed;
}

/**
 * ⚠ MANUAL RETARGETING OF A BROKEN REFERENCE — and it is **itself an `UndoableEdit`** (spec §6.1).
 *
 * This is the other half of domain rule 3, and the half that is easy to leave unbuilt: a broken
 * reference that can be *seen* but not *fixed* is a document in a state the user cannot leave. The
 * fix is an ordinary command, so it undoes like everything else.
 */
export const retargetReferenceCommand: Command = {
  id: 'core.retargetReference',
  label: 'Retarget reference',
  description:
    'Point a broken hosted element at a new host face. The ONLY way a broken reference is ever repaired — it is never auto-healed (domain rule 3).',
  argsSchema: {
    elementId: { kind: 'ref', refTo: 'element', label: 'Element', required: true },
    hostId: { kind: 'ref', refTo: 'element', label: 'New host', required: true },
    hostRef: { kind: 'subShapeRef', label: 'New host face', required: true },
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(retargetReferenceCommand, rawArgs);
    const element = requireElement(ctx.scene, args['elementId']);
    const host = requireElement(ctx.scene, args['hostId']);

    const after: Element = { ...element, hostId: host.id, hostRef: text(args['hostRef']) };
    const rebuilt = [host.id];
    if (element.hostId !== undefined && element.hostId !== host.id) rebuilt.push(element.hostId);

    return ctx.edit(
      `Retarget ${element.name ?? element.id}`,
      [{ collection: 'elements', id: element.id, before: element, after }],
      rebuilt,
    );
  },
};

/**
 * D36 — a Wall may be a shear wall or a partition. **Miqdar must never guess**; it must be told.
 *
 * ⚠ **`discipline` IS NOT SETTABLE HERE ANY MORE (D45).** It is a property of a PART, authored on the
 * style's layer. Miqdar filters on **`loadBearing`**, which is what this command is actually for.
 */
export const setClassificationCommand: Command = {
  id: 'core.setClassification',
  label: 'Set classification',
  description:
    'Set loadBearing / IFC class. D36 — this is what tells Miqdar which elements are structural, and it must never be inferred. (Discipline lives on the PART — D45.)',
  argsSchema: {
    elementId: { kind: 'ref', refTo: 'element', label: 'Element', required: true },
    loadBearing: { kind: 'boolean', label: 'Load-bearing' },
    ifcClass: { kind: 'string', label: 'IFC class' },
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(setClassificationCommand, rawArgs);
    const element = requireElement(ctx.scene, args['elementId']);
    const classification: Classification = {
      ifcClass: (args['ifcClass'] as string | undefined) ?? element.classification.ifcClass,
      loadBearing:
        (args['loadBearing'] as boolean | undefined) ?? element.classification.loadBearing,
    };
    const after: Element = { ...element, classification };
    // Classification is metadata: it changes what the element MEANS, not what it looks like. No rebuild.
    return ctx.edit(
      `Classify ${element.name ?? element.id}`,
      [{ collection: 'elements', id: element.id, before: element, after }],
      [],
    );
  },
};

/**
 * ⚠ 0g.2 (Freeze-Gate ⓣ) — THE POST-CREATE AUTHORING PATH for the metadata reserved at freeze.
 *
 * `createElement` lets an element be BORN with a mark / phase / property; this edits them afterward — the
 * verb P6 (IFC `properties`/`classifications`), 2D documentation (`mark`) and Planitor (`phase*`) will
 * drive. Its `argsSchema` freezes at step 6 WITH those fields, so it is reserved now even though no body
 * reads them yet — the same "reserve the shape, not the body" pattern as the 0g data fields.
 *
 * ⚠ SEMANTICS: a PROVIDED arg SETS the field; an ABSENT one leaves it UNCHANGED. Clearing a field is a
 * future ADDITIVE arg (e.g. a `clear: string[]`), never an overload of `null` — baking a value-vs-cleared
 * ambiguity into a frozen contract is exactly what this project reserves shapes to avoid.
 *
 * ⚠ NO GUARD, NO REBUILD: none of these fields is identity- or quantity-bearing (unlike a style-layer name
 * or a `materialId` — D51/ⓓ), so no refuse-or-retarget guard applies; and none feeds the build, so it
 * re-stages nothing (`rebuilt: []`, like `setClassification`).
 */
export const setElementMetadataCommand: Command = {
  id: 'core.setElementMetadata',
  label: 'Set element metadata',
  description:
    'Set the non-geometric metadata reserved at freeze — mark, construction phases, nesting parent, IFC/agent property sets, classification codes. Absent args are left unchanged. No geometry rebuild.',
  argsSchema: {
    elementId: { kind: 'ref', refTo: 'element', label: 'Element', required: true },
    mark: { kind: 'string', label: 'Mark' },
    phaseCreated: { kind: 'string', label: 'Phase created' },
    phaseDemolished: { kind: 'string', label: 'Phase demolished' },
    parentElementId: { kind: 'ref', refTo: 'element', label: 'Parent element' },
    properties: { kind: 'object', label: 'Properties' },
    classifications: { kind: 'object', label: 'Classifications' },
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(setElementMetadataCommand, rawArgs);
    const element = requireElement(ctx.scene, args['elementId']);

    const parentElementId = args['parentElementId'] as string | undefined;
    if (parentElementId !== undefined) requireElement(ctx.scene, parentElementId);

    const after: Element = {
      ...element,
      ...(args['mark'] === undefined ? {} : { mark: text(args['mark']) }),
      ...(args['phaseCreated'] === undefined ? {} : { phaseCreated: text(args['phaseCreated']) }),
      ...(args['phaseDemolished'] === undefined
        ? {}
        : { phaseDemolished: text(args['phaseDemolished']) }),
      ...(parentElementId === undefined ? {} : { parentElementId }),
      ...(args['properties'] === undefined
        ? {}
        : { properties: args['properties'] as NonNullable<Element['properties']> }),
      ...(args['classifications'] === undefined
        ? {}
        : { classifications: args['classifications'] as NonNullable<Element['classifications']> }),
    };
    // Metadata changes what the element MEANS, not what it looks like. No rebuild (like setClassification).
    return ctx.edit(
      `Set metadata on ${element.name ?? element.id}`,
      [{ collection: 'elements', id: element.id, before: element, after }],
      [],
    );
  },
};

/* ---- The library commands: styles, materials, sections, containers, grids ---------------------- */

export const createStyleCommand: Command = {
  id: 'core.createStyle',
  label: 'Create style',
  description:
    'Create a shared, named parameter set (D31) — a layer stack, a section, shared params.',
  argsSchema: {
    id: { kind: 'string', label: 'Id', required: true },
    name: { kind: 'string', label: 'Name', required: true },
    typeId: { kind: 'string', label: 'For type', required: true },
    layers: {
      kind: 'array',
      label: 'Layer stack',
      items: {
        kind: 'object',
        label: 'Layer',
        fields: {
          name: { kind: 'string', label: 'Part name', required: true },
          materialId: { kind: 'ref', refTo: 'material', label: 'Material', required: true },
          thickness: { kind: 'number', label: 'Thickness', unit: 'mm', required: true, min: 0 },
          // ⚠ D45 — whose trade builds this layer. Required: the concreter and the plasterer are routed
          // to different work packages **on the same wall**, and nothing else in the model can say so.
          discipline: {
            kind: 'enum',
            label: 'Discipline',
            required: true,
            options: ['architectural', 'structural', 'mep', 'other'],
          },
        },
      },
    },
    sectionId: { kind: 'ref', refTo: 'section', label: 'Section' },
    params: { kind: 'object', label: 'Shared parameters' },
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(createStyleCommand, rawArgs);
    const id = text(args['id']);
    if (ctx.scene.styles[id] !== undefined) {
      throw new CommandFailure('REFUSED', `style "${id}" already exists`);
    }
    if (!ctx.registries.types.has(text(args['typeId']))) {
      throw new CommandFailure('NOT_FOUND', `unknown type "${text(args['typeId'])}"`);
    }
    const layers = asLayers(args['layers']);
    // ⚠ `updateStyle` validated its materials and `createStyle` did not — so the FIRST way anyone
    // creates a style was the unguarded one, and a dangling materialId reached `quantities()` as
    // `0 kg, basis: 'exact'`. Both now go through the same check.
    checkLayers(ctx.scene, layers);
    const style: ElementStyle = {
      id,
      name: text(args['name']),
      typeId: text(args['typeId']),
      version: 1,
      ...(layers === undefined ? {} : { layers }),
      ...(args['sectionId'] === undefined ? {} : { sectionId: text(args['sectionId']) }),
      ...(args['params'] === undefined ? {} : { params: args['params'] as Params }),
    };
    return ctx.edit(`Create style ${style.name}`, [{ collection: 'styles', id, after: style }], []);
  },
};

/**
 * ⚠ A Material is an ENTITY, not a string (D33) — `density` is REQUIRED because a material that
 * cannot answer a weight cannot do half of what it exists for, and because it is the number that
 * collapses Planitor's quantity fallback ladder (which hardcodes 7850 for steel, since IFC will
 * so often not say) into a lookup.
 */
export const createMaterialCommand: Command = {
  id: 'core.createMaterial',
  label: 'Create material',
  description: 'Add a material to the document (D33). Carries density and structural properties.',
  argsSchema: {
    id: { kind: 'string', label: 'Id', required: true },
    name: { kind: 'string', label: 'Name', required: true },
    category: {
      kind: 'enum',
      label: 'Category',
      required: true,
      options: ['concrete', 'steel', 'timber', 'masonry', 'insulation', 'finish', 'other'],
    },
    density: { kind: 'number', label: 'Density', unit: 'kg/m³', required: true, min: 0 },
    structural: {
      kind: 'object',
      label: 'Structural properties',
      description: 'f_ck, E, f_y — Miqdar reads these',
    },
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(createMaterialCommand, rawArgs);
    const id = text(args['id']);
    if (ctx.scene.materials[id] !== undefined) {
      throw new CommandFailure('REFUSED', `material "${id}" already exists`);
    }
    const material: Material = {
      id,
      name: text(args['name']),
      category: args['category'] as Material['category'],
      density: num(args['density']),
      ...(args['structural'] === undefined
        ? {}
        : { structural: args['structural'] as Record<string, number> }),
    };
    return ctx.edit(
      `Create material ${material.name}`,
      [{ collection: 'materials', id, after: material }],
      [],
    );
  },
};

export const createSectionCommand: Command = {
  id: 'core.createSection',
  label: 'Create section',
  description: 'Add a section to the document catalogue (D33) — IPE300, RECT-300x600.',
  argsSchema: {
    id: { kind: 'string', label: 'Id', required: true },
    name: { kind: 'string', label: 'Name', required: true },
    shape: {
      kind: 'enum',
      label: 'Shape',
      required: true,
      options: ['rectangle', 'circle', 'i-beam', 'custom'],
    },
    dimensions: { kind: 'object', label: 'Dimensions', required: true, description: 'mm' },
    standard: { kind: 'string', label: 'Standard' },
    properties: {
      kind: 'object',
      label: 'Section properties',
      description: 'area, Iy, Iz — Miqdar reads these',
    },
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(createSectionCommand, rawArgs);
    const id = text(args['id']);
    if (ctx.scene.sections[id] !== undefined) {
      throw new CommandFailure('REFUSED', `section "${id}" already exists`);
    }
    const section: Section = {
      id,
      name: text(args['name']),
      shape: args['shape'] as Section['shape'],
      dimensions: args['dimensions'] as Record<string, number>,
      ...(args['standard'] === undefined ? {} : { standard: text(args['standard']) }),
      ...(args['properties'] === undefined
        ? {}
        : { properties: args['properties'] as Record<string, number> }),
    };
    return ctx.edit(
      `Create section ${section.name}`,
      [{ collection: 'sections', id, after: section }],
      [],
    );
  },
};

/** D35 — `Site → Building → Level → Space`. ⚠ A two-tower project was unmodellable without this. */
export const createContainerCommand: Command = {
  id: 'core.createContainer',
  label: 'Create spatial container',
  description:
    'Create a Site, Building, Level or Space (D35). This tree IS the downstream Location Breakdown Structure.',
  argsSchema: {
    id: { kind: 'string', label: 'Id', required: true },
    kind: {
      kind: 'enum',
      label: 'Kind',
      required: true,
      options: ['site', 'building', 'level', 'space'],
    },
    name: { kind: 'string', label: 'Name', required: true },
    parentId: { kind: 'ref', refTo: 'container', label: 'Parent' },
    elevation: { kind: 'number', label: 'Elevation', unit: 'mm', description: 'For a level' },
    number: { kind: 'string', label: 'Number', description: 'For a space — "214"' },
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(createContainerCommand, rawArgs);
    const id = text(args['id']);
    if (ctx.scene.containers[id] !== undefined) {
      throw new CommandFailure('REFUSED', `container "${id}" already exists`);
    }
    const parentId = args['parentId'] as string | undefined;
    if (parentId !== undefined && ctx.scene.containers[parentId] === undefined) {
      throw new CommandFailure('NOT_FOUND', `unknown parent container "${parentId}"`);
    }
    const container: SpatialContainer = {
      id,
      kind: args['kind'] as SpatialContainer['kind'],
      name: text(args['name']),
      ...(parentId === undefined ? {} : { parentId }),
      ...(args['elevation'] === undefined ? {} : { elevation: num(args['elevation']) }),
      ...(args['number'] === undefined ? {} : { number: text(args['number']) }),
    };
    return ctx.edit(
      `Create ${container.kind} ${container.name}`,
      [{ collection: 'containers', id, after: container }],
      [],
    );
  },
};

/** D32 — Level's missing twin. A column sits at B-3, and it STAYS at B-3 when the spacing changes. */
export const createGridCommand: Command = {
  id: 'core.createGrid',
  label: 'Create grid',
  description:
    'Create a named structural axis (D32). Level organizes vertically; Grid horizontally.',
  argsSchema: {
    id: { kind: 'string', label: 'Id', required: true },
    name: { kind: 'string', label: 'Name', required: true },
    axis: { kind: 'enum', label: 'Axis', required: true, options: ['x', 'y'] },
    offset: { kind: 'number', label: 'Offset', unit: 'mm', required: true },
    buildingId: { kind: 'ref', refTo: 'container', label: 'Building' },
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(createGridCommand, rawArgs);
    const id = text(args['id']);
    if (ctx.scene.grids[id] !== undefined) {
      throw new CommandFailure('REFUSED', `grid "${id}" already exists`);
    }
    const grid: Grid = {
      id,
      name: text(args['name']),
      axis: args['axis'] as Grid['axis'],
      offset: num(args['offset']),
      ...(args['buildingId'] === undefined ? {} : { buildingId: text(args['buildingId']) }),
    };
    return ctx.edit(`Create grid ${grid.name}`, [{ collection: 'grids', id, after: grid }], []);
  },
};

/* ================================================================================================
 * CONSTRAINTS — the active-datum bindings, editable on their own (D50 step 0b, D53)
 * ============================================================================================= */

/**
 * Bind an existing element to a datum — a `base`/`top` Level (with an optional offset) or a `grid` axis.
 * The create-time path folds these into `createElement`; this edits them afterward (attach a wall top to a
 * newly-drawn level, move a column onto a grid). The re-stage is the element the constraint drives.
 */
export const createConstraintCommand: Command = {
  id: 'core.createConstraint',
  label: 'Add constraint',
  description:
    'Bind an element to a datum: base/top to a Level (height derived, offset optional) or grid to an axis.',
  argsSchema: {
    element: { kind: 'ref', refTo: 'element', label: 'Element', required: true },
    kind: { kind: 'enum', label: 'Kind', required: true, options: ['base', 'top', 'grid'] },
    target: {
      kind: 'string',
      label: 'Target',
      required: true,
      description: 'A container id for base/top, a grid id for grid',
    },
    offset: { kind: 'number', label: 'Offset', unit: 'mm', description: 'base/top only' },
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(createConstraintCommand, rawArgs);
    const element = requireElement(ctx.scene, args['element']);
    const kind = args['kind'] as DatumConstraint['kind'];
    const targetId = text(args['target']);
    const target = constraintTarget(ctx, kind, targetId);
    const offset = args['offset'] as number | undefined;
    const constraint: DatumConstraint = {
      id: ctx.mintId('constraint'),
      element: element.id,
      kind,
      target,
      ...(offset === undefined ? {} : { offset }),
    };
    return ctx.edit(
      `Constrain ${element.id} (${kind})`,
      [{ collection: 'constraints', id: constraint.id, after: constraint }],
      [element.id],
    );
  },
};

/** Remove a datum binding. The element it drove re-stages (it falls back to its own params). */
export const deleteConstraintCommand: Command = {
  id: 'core.deleteConstraint',
  label: 'Remove constraint',
  description: 'Remove an active-datum binding; the element rebuilds without it.',
  argsSchema: {
    id: { kind: 'string', label: 'Constraint id', required: true },
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(deleteConstraintCommand, rawArgs);
    const id = text(args['id']);
    const constraint = ctx.scene.constraints[id];
    if (constraint === undefined) {
      throw new CommandFailure('NOT_FOUND', `no constraint "${id}" in this document`);
    }
    if (!isDatumConstraint(constraint)) {
      throw new CommandFailure(
        'REFUSED',
        `"${id}" is a sketch constraint — remove it with deleteSketchConstraint`,
      );
    }
    return ctx.edit(
      `Remove constraint ${id}`,
      [{ collection: 'constraints', id, before: constraint }],
      [constraint.element],
    );
  },
};

/** Resolve a constraint's target id to a validated, typed `ConstraintTarget` (base/top→Level, grid→Grid). */
function constraintTarget(
  ctx: CommandContext,
  kind: DatumConstraint['kind'],
  targetId: string,
): ConstraintTarget {
  if (kind === 'grid') {
    if (ctx.scene.grids[targetId] === undefined) {
      throw new CommandFailure('NOT_FOUND', `unknown grid "${targetId}"`);
    }
    return { kind: 'grid', id: targetId };
  }
  if (ctx.scene.containers[targetId] === undefined) {
    throw new CommandFailure('NOT_FOUND', `unknown ${kind} level "${targetId}"`);
  }
  return { kind: 'level', id: targetId };
}

/* ================================================================================================
 * WALL-TO-WALL JOIN OVERRIDES (D50 step 0c, `P5_step0c_design.md` §6). ⚠ THERE IS NO create-a-join
 * verb — corners auto-miter on proximity (owner-ruled Q3). These verbs only DEVIATE a corner from the
 * auto-default: `setJoin` forces butt / explicit mitre / none (Disallow Join); `clearJoin` restores the
 * auto-miter. Both freeze WITH their `argsSchema` at step 6.
 *
 * ⚠⚠ A join is a DISPLAY/QUANTITIES cleanup, NEVER a fuse (§4h). Setting it re-stages both walls of the
 * corner (the 0c dependency edge); it re-owns no face — a wall's side faces keep their tokens (D26).
 * ============================================================================================= */

/** The existing override for the {a, b} corner, whichever order it was stored in — or `undefined`. */
function existingJoinOverride(
  scene: Scene,
  a: ElementId,
  b: ElementId,
): JoinConstraint | undefined {
  return joinOverridesOf(scene, a).find((o) => o.element === b || o.other === b);
}

export const setJoinCommand: Command = {
  id: 'core.setJoin',
  label: 'Set wall join',
  description:
    'Override a wall corner: butt (element into other), an explicit mitre, or none (Disallow Join). Corners auto-mitre by default — this only deviates one. The two walls must meet at a shared endpoint.',
  argsSchema: {
    element: { kind: 'ref', refTo: 'element', label: 'Wall', required: true },
    other: { kind: 'ref', refTo: 'element', label: 'Joined wall', required: true },
    resolution: {
      kind: 'enum',
      label: 'Resolution',
      required: true,
      options: ['butt', 'mitre', 'none'],
      description:
        'butt ⇒ element butts into other; mitre ⇒ symmetric; none ⇒ walls stay separate boxes',
    },
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(setJoinCommand, rawArgs);
    const element = requireElement(ctx.scene, args['element']);
    const other = requireElement(ctx.scene, args['other']);
    if (element.id === other.id) {
      throw new CommandFailure('INVALID_ARGS', 'a wall cannot be joined to itself');
    }
    if (!wallsMeet(element, other)) {
      throw new CommandFailure(
        'REFUSED',
        `"${element.id}" and "${other.id}" do not meet — nothing to join`,
      );
    }
    const resolution = text(args['resolution']) as JoinConstraint['resolution'];
    // ⚠ ONE OVERRIDE PER CORNER. If the pair already carries one, REPLACE it in place (same id, undoable
    // before→after) so a document never accumulates two contradictory overrides for one corner.
    const prior = existingJoinOverride(ctx.scene, element.id, other.id);
    const id = prior?.id ?? ctx.mintId('join');
    const join: JoinConstraint = {
      id,
      element: element.id,
      other: other.id,
      kind: 'join',
      resolution,
    };
    return ctx.edit(
      `Join ${element.id}↔${other.id} (${resolution})`,
      [{ collection: 'constraints', id, before: prior, after: join }],
      // Both walls of the corner re-stage — the dependency graph would derive this from the constraint
      // change too, but naming it makes the intent explicit and covers the butt-direction flip.
      [element.id, other.id],
    );
  },
};

export const clearJoinCommand: Command = {
  id: 'core.clearJoin',
  label: 'Clear wall join',
  description:
    'Remove a join override; the corner returns to the auto-mitre default. Takes the override id, or both wall ids.',
  argsSchema: {
    id: {
      kind: 'string',
      label: 'Override id',
      description: 'The JoinConstraint id (or pass element+other)',
    },
    element: { kind: 'ref', refTo: 'element', label: 'Wall' },
    other: { kind: 'ref', refTo: 'element', label: 'Joined wall' },
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(clearJoinCommand, rawArgs);
    const explicit = text(args['id']);
    const override =
      explicit !== ''
        ? ctx.scene.constraints[explicit]
        : existingJoinOverride(ctx.scene, text(args['element']), text(args['other']));
    if (override === undefined) {
      throw new CommandFailure('NOT_FOUND', 'no join override matches these arguments');
    }
    if (!isJoinConstraint(override)) {
      throw new CommandFailure(
        'REFUSED',
        `"${override.id}" is not a wall join — use deleteConstraint / deleteSketchConstraint`,
      );
    }
    return ctx.edit(
      `Clear join ${override.id}`,
      [{ collection: 'constraints', id: override.id, before: override }],
      [override.element, override.other],
    );
  },
};

/* ================================================================================================
 * SKETCH CONSTRAINTS — the 2D solver's rules, as first-class union members (D50 §0d, Q2 owner-ruled:
 * DEDICATED verbs, not folded into createConstraint). A sketch constraint relates geometry WITHIN one
 * element's profile (two points coincident, two segments perpendicular, |p1 p2| = 3000) — sketch-local
 * operands, never a scene datum.
 *
 * ⚠ THE OVER-CONSTRAINED REFUSAL IS NOT HERE — IT IS AT BUILD TIME. Adding a conflicting constraint makes
 * the element's `buildGeometry` solve fail; that surfaces as a `geometry` failure, and D42 rejects the whole
 * command and keeps last-good (`document.ts`). So this command only validates the OPERAND SHAPE; the solver
 * (via the staged rebuild) is what proves the constraint is satisfiable. One refusal path, not two.
 * ============================================================================================= */

/** How many points / segments each sketch-constraint kind takes — validated before it can be minted. */
const SKETCH_OPERAND_ARITY: Record<SketchConstraintKind, { points: number; segments: number }> = {
  coincident: { points: 2, segments: 0 },
  distance: { points: 2, segments: 0 },
  horizontal: { points: 0, segments: 1 },
  vertical: { points: 0, segments: 1 },
  parallel: { points: 0, segments: 2 },
  perpendicular: { points: 0, segments: 2 },
  equal: { points: 0, segments: 2 },
  tangent: { points: 0, segments: 2 },
};

const SKETCH_CONSTRAINT_KINDS = Object.keys(
  SKETCH_OPERAND_ARITY,
) as readonly SketchConstraintKind[];

/** Validate operand arity + that every referenced point id / segment index exists in the element's sketch. */
function checkSketchOperands(
  element: Element,
  kind: SketchConstraintKind,
  operands: SketchOperands,
  value: number | undefined,
): void {
  const want = SKETCH_OPERAND_ARITY[kind];
  const points = operands.points ?? [];
  const segments = operands.segments ?? [];
  if (points.length !== want.points || segments.length !== want.segments) {
    throw new CommandFailure(
      'INVALID_ARGS',
      `sketch constraint "${kind}" takes ${String(want.points)} point(s) and ${String(want.segments)} segment(s), ` +
        `got ${String(points.length)} and ${String(segments.length)}`,
    );
  }
  if (kind === 'distance' && typeof value !== 'number') {
    throw new CommandFailure(
      'INVALID_ARGS',
      `sketch constraint "distance" needs a numeric value (mm)`,
    );
  }
  const sketch = readSketch(element.params);
  if (sketch === undefined) {
    throw new CommandFailure('REFUSED', `element "${element.id}" has no sketch to constrain`);
  }
  const pointIds = new Set(sketch.points.map((p) => p.id));
  for (const id of points) {
    if (!pointIds.has(id)) {
      throw new CommandFailure(
        'NOT_FOUND',
        `sketch point "${id}" is not in element "${element.id}"`,
      );
    }
  }
  for (const index of segments) {
    if (!Number.isInteger(index) || index < 0 || index >= sketch.segments.length) {
      throw new CommandFailure(
        'NOT_FOUND',
        `sketch segment index ${String(index)} is out of range for element "${element.id}" ` +
          `(${String(sketch.segments.length)} segments)`,
      );
    }
  }
}

/** Read the operand arrays out of a validated args bag — the schema proved they are arrays of the right kind. */
function sketchOperandsFrom(args: Params): SketchOperands {
  const points = (args['points'] as readonly ParamValue[] | undefined) ?? [];
  const segments = (args['segments'] as readonly ParamValue[] | undefined) ?? [];
  return {
    points: points.map((p) => text(p)),
    segments: segments.map((s) => num(s)),
  };
}

export const createSketchConstraintCommand: Command = {
  id: 'core.createSketchConstraint',
  label: 'Add sketch constraint',
  description:
    'Constrain an element sketch: coincident/distance take two point ids; horizontal/vertical one segment index; parallel/perpendicular/equal/tangent two.',
  argsSchema: {
    element: { kind: 'ref', refTo: 'element', label: 'Element', required: true },
    kind: { kind: 'enum', label: 'Kind', required: true, options: [...SKETCH_CONSTRAINT_KINDS] },
    points: {
      kind: 'array',
      label: 'Point ids',
      description: 'Sketch point ids (coincident/distance).',
      items: { kind: 'string', label: 'Point id' },
    },
    segments: {
      kind: 'array',
      label: 'Segment indices',
      description:
        'Sketch segment indices, 0-based authored order (horizontal/vertical/parallel/…).',
      items: { kind: 'number', label: 'Segment index' },
    },
    value: { kind: 'number', label: 'Value', unit: 'mm', description: 'distance only' },
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(createSketchConstraintCommand, rawArgs);
    const element = requireElement(ctx.scene, args['element']);
    const kind = args['kind'] as SketchConstraintKind;
    const operands = sketchOperandsFrom(args);
    const value = args['value'] as number | undefined;
    checkSketchOperands(element, kind, operands, value);
    const constraint: SketchConstraint = {
      id: ctx.mintId('sketchc'),
      element: element.id,
      kind,
      operands,
      ...(value === undefined ? {} : { value }),
    };
    return ctx.edit(
      `Sketch-constrain ${element.id} (${kind})`,
      [{ collection: 'constraints', id: constraint.id, after: constraint }],
      [element.id],
    );
  },
};

export const deleteSketchConstraintCommand: Command = {
  id: 'core.deleteSketchConstraint',
  label: 'Remove sketch constraint',
  description: 'Remove a sketch constraint; the element re-solves and rebuilds without it.',
  argsSchema: {
    id: { kind: 'string', label: 'Constraint id', required: true },
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(deleteSketchConstraintCommand, rawArgs);
    const id = text(args['id']);
    const constraint = ctx.scene.constraints[id];
    if (constraint === undefined) {
      throw new CommandFailure('NOT_FOUND', `no constraint "${id}" in this document`);
    }
    if (isDatumConstraint(constraint)) {
      throw new CommandFailure(
        'REFUSED',
        `"${id}" is a datum binding, not a sketch constraint — remove it with deleteConstraint`,
      );
    }
    return ctx.edit(
      `Remove sketch constraint ${id}`,
      [{ collection: 'constraints', id, before: constraint }],
      [constraint.element],
    );
  },
};

/* ================================================================================================
 * THE MISSING CRUD — updates & guarded deletes (D50 step 0e/0f). The registries were CREATE-ONLY:
 * a density typo could not be fixed, a Level could not be moved, an unused style could not be removed.
 *
 * ⚠ NOTE THE RE-STAGE ARG IS `[]` ON EVERY ONE. The typed dependency graph (step 0a/0b) derives what
 * rebuilds from the emitted `SceneChange`s — a container change re-stages the elements on it, a section
 * change their instances, a constraint retarget its element. The command emits the change; the invalidator
 * does the cascade. (This is the payoff of 0a: correctness by construction, not by each command remembering.)
 * ============================================================================================= */

/**
 * ⚠⚠ EDIT A LEVEL — AND THE BUILDING FOLLOWS. Changing a Level's `elevation` re-stages every element on it
 * (the 0a container→element edge). This is the verb that makes "move a Level, the building follows" true
 * END TO END — 0b proved the datum path by rebinding; this edits the number, the real user action.
 */
export const updateContainerCommand: Command = {
  id: 'core.updateContainer',
  label: 'Edit container',
  description:
    "Edit a Level/Space (elevation, name, number). Changing a Level's elevation re-stages every element on it — the building follows.",
  argsSchema: {
    id: { kind: 'ref', refTo: 'container', label: 'Container', required: true },
    name: { kind: 'string', label: 'Name' },
    elevation: { kind: 'number', label: 'Elevation', unit: 'mm' },
    number: { kind: 'string', label: 'Number' },
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(updateContainerCommand, rawArgs);
    const id = text(args['id']);
    const before = ctx.scene.containers[id];
    if (before === undefined) throw new CommandFailure('NOT_FOUND', `unknown container "${id}"`);
    const after: SpatialContainer = {
      ...before,
      ...(args['name'] === undefined ? {} : { name: text(args['name']) }),
      ...(args['elevation'] === undefined ? {} : { elevation: num(args['elevation']) }),
      ...(args['number'] === undefined ? {} : { number: text(args['number']) }),
    };
    return ctx.edit(
      `Edit ${before.kind} ${after.name}`,
      [{ collection: 'containers', id, before, after }],
      [],
    );
  },
};

/** ⚠ EDIT A GRID — nudge its `offset` and every grid-hosted element follows (the 0b grid edge). */
export const updateGridCommand: Command = {
  id: 'core.updateGrid',
  label: 'Edit grid',
  description:
    'Edit a grid axis (offset/axis/name). Moving the offset re-stages the columns on it.',
  argsSchema: {
    id: { kind: 'ref', refTo: 'grid', label: 'Grid', required: true },
    name: { kind: 'string', label: 'Name' },
    axis: { kind: 'enum', label: 'Axis', options: ['x', 'y'] },
    offset: { kind: 'number', label: 'Offset', unit: 'mm' },
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(updateGridCommand, rawArgs);
    const id = text(args['id']);
    const before = ctx.scene.grids[id];
    if (before === undefined) throw new CommandFailure('NOT_FOUND', `unknown grid "${id}"`);
    const after: Grid = {
      ...before,
      ...(args['name'] === undefined ? {} : { name: text(args['name']) }),
      ...(args['axis'] === undefined ? {} : { axis: args['axis'] as Grid['axis'] }),
      ...(args['offset'] === undefined ? {} : { offset: num(args['offset']) }),
    };
    return ctx.edit(`Edit grid ${after.name}`, [{ collection: 'grids', id, before, after }], []);
  },
};

/**
 * Fix a density typo. ⚠ Re-stages NOTHING geometric (a solid's shape never depends on density — D30) —
 * the change is picked up lazily by `quantities()`. That non-rebuild is the point of the material→"nothing"
 * dependency edge, not a bug.
 */
export const updateMaterialCommand: Command = {
  id: 'core.updateMaterial',
  label: 'Edit material',
  description:
    'Edit a material (density, category, structural props). Quantities update; no rebuild.',
  argsSchema: {
    id: { kind: 'ref', refTo: 'material', label: 'Material', required: true },
    name: { kind: 'string', label: 'Name' },
    density: { kind: 'number', label: 'Density', unit: 'kg/m³', min: 0 },
    category: { kind: 'string', label: 'Category' },
    structural: { kind: 'object', label: 'Structural properties' },
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(updateMaterialCommand, rawArgs);
    const id = text(args['id']);
    const before = ctx.scene.materials[id];
    if (before === undefined) throw new CommandFailure('NOT_FOUND', `unknown material "${id}"`);
    const after: Material = {
      ...before,
      ...(args['name'] === undefined ? {} : { name: text(args['name']) }),
      ...(args['density'] === undefined ? {} : { density: num(args['density']) }),
      ...(args['category'] === undefined
        ? {}
        : { category: text(args['category']) as Material['category'] }),
      ...(args['structural'] === undefined
        ? {}
        : { structural: args['structural'] as NonNullable<Material['structural']> }),
    };
    return ctx.edit(
      `Edit material ${after.name}`,
      [{ collection: 'materials', id, before, after }],
      [],
    );
  },
};

/**
 * ⚠ EDIT A SECTION — and this is why the `sections` dependency edge stopped being "nothing" (step 0e). A
 * Section is swept into a LinearMember's PROFILE, so changing its dimensions re-stages every element whose
 * style names it.
 */
export const updateSectionCommand: Command = {
  id: 'core.updateSection',
  label: 'Edit section',
  description: 'Edit a section (shape/dimensions/standard). Re-stages every member swept from it.',
  argsSchema: {
    id: { kind: 'ref', refTo: 'section', label: 'Section', required: true },
    name: { kind: 'string', label: 'Name' },
    shape: { kind: 'string', label: 'Shape' },
    dimensions: { kind: 'object', label: 'Dimensions' },
    standard: { kind: 'string', label: 'Standard' },
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(updateSectionCommand, rawArgs);
    const id = text(args['id']);
    const before = ctx.scene.sections[id];
    if (before === undefined) throw new CommandFailure('NOT_FOUND', `unknown section "${id}"`);
    const after: Section = {
      ...before,
      ...(args['name'] === undefined ? {} : { name: text(args['name']) }),
      ...(args['shape'] === undefined ? {} : { shape: args['shape'] as Section['shape'] }),
      ...(args['dimensions'] === undefined
        ? {}
        : { dimensions: args['dimensions'] as Record<string, number> }),
      ...(args['standard'] === undefined ? {} : { standard: text(args['standard']) }),
    };
    return ctx.edit(
      `Edit section ${after.name}`,
      [{ collection: 'sections', id, before, after }],
      [],
    );
  },
};

/** Edit a constraint — move a parapet's offset, or repoint the datum it follows. */
export const updateConstraintCommand: Command = {
  id: 'core.updateConstraint',
  label: 'Edit constraint',
  description: "Edit a datum binding's offset or target; the element it drives re-stages.",
  argsSchema: {
    id: { kind: 'string', label: 'Constraint id', required: true },
    offset: { kind: 'number', label: 'Offset', unit: 'mm' },
    target: { kind: 'string', label: 'New target', description: 'Repoint to another Level/Grid' },
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(updateConstraintCommand, rawArgs);
    const id = text(args['id']);
    const before = ctx.scene.constraints[id];
    if (before === undefined) throw new CommandFailure('NOT_FOUND', `no constraint "${id}"`);
    if (!isDatumConstraint(before)) {
      throw new CommandFailure(
        'REFUSED',
        `"${id}" is a sketch constraint, not a datum binding — edit it via deleteSketchConstraint + createSketchConstraint`,
      );
    }
    const target =
      args['target'] === undefined
        ? before.target
        : constraintTarget(ctx, before.kind, text(args['target']));
    const after: DatumConstraint = {
      ...before,
      target,
      ...(args['offset'] === undefined ? {} : { offset: num(args['offset']) }),
    };
    return ctx.edit(
      `Edit constraint ${id}`,
      [{ collection: 'constraints', id, before, after }],
      [before.element],
    );
  },
};

/* ---- Guarded deletes: RESTRICT by default, retargetMap to redirect, acknowledge to break (0f) ------ */

export const deleteStyleCommand: Command = {
  id: 'core.deleteStyle',
  label: 'Delete style',
  description:
    'Delete a shared style. REFUSED if any element wears it, unless retargetMap redirects them or acknowledge:true.',
  argsSchema: {
    id: { kind: 'ref', refTo: 'style', label: 'Style', required: true },
    ...GUARD_ARGS,
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(deleteStyleCommand, rawArgs);
    const id = text(args['id']);
    const before = ctx.scene.styles[id];
    if (before === undefined) throw new CommandFailure('NOT_FOUND', `unknown style "${id}"`);
    const extra = guardReferences(`style "${id}"`, styleReferrers(ctx.scene, id), args);
    return ctx.edit(
      `Delete style ${before.name}`,
      [...extra, { collection: 'styles', id, before }],
      [],
    );
  },
};

export const deleteMaterialCommand: Command = {
  id: 'core.deleteMaterial',
  label: 'Delete material',
  description:
    'Delete a material. REFUSED if a style layer uses it, unless retargetMap redirects them or acknowledge:true.',
  argsSchema: {
    id: { kind: 'ref', refTo: 'material', label: 'Material', required: true },
    ...GUARD_ARGS,
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(deleteMaterialCommand, rawArgs);
    const id = text(args['id']);
    const before = ctx.scene.materials[id];
    if (before === undefined) throw new CommandFailure('NOT_FOUND', `unknown material "${id}"`);
    const extra = guardReferences(`material "${id}"`, materialReferrers(ctx.scene, id), args);
    return ctx.edit(
      `Delete material ${before.name}`,
      [...extra, { collection: 'materials', id, before }],
      [],
    );
  },
};

export const deleteSectionCommand: Command = {
  id: 'core.deleteSection',
  label: 'Delete section',
  description:
    'Delete a section. REFUSED if a style is swept from it, unless retargetMap redirects them or acknowledge:true.',
  argsSchema: {
    id: { kind: 'ref', refTo: 'section', label: 'Section', required: true },
    ...GUARD_ARGS,
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(deleteSectionCommand, rawArgs);
    const id = text(args['id']);
    const before = ctx.scene.sections[id];
    if (before === undefined) throw new CommandFailure('NOT_FOUND', `unknown section "${id}"`);
    const extra = guardReferences(`section "${id}"`, sectionReferrers(ctx.scene, id), args);
    return ctx.edit(
      `Delete section ${before.name}`,
      [...extra, { collection: 'sections', id, before }],
      [],
    );
  },
};

export const deleteContainerCommand: Command = {
  id: 'core.deleteContainer',
  label: 'Delete container',
  description:
    'Delete a Level/Space. REFUSED if elements/constraints/child containers reference it, unless retargetMap or acknowledge:true.',
  argsSchema: {
    id: { kind: 'ref', refTo: 'container', label: 'Container', required: true },
    ...GUARD_ARGS,
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(deleteContainerCommand, rawArgs);
    const id = text(args['id']);
    const before = ctx.scene.containers[id];
    if (before === undefined) throw new CommandFailure('NOT_FOUND', `unknown container "${id}"`);
    const extra = guardReferences(`container "${id}"`, containerReferrers(ctx.scene, id), args);
    return ctx.edit(
      `Delete ${before.kind} ${before.name}`,
      [...extra, { collection: 'containers', id, before }],
      [],
    );
  },
};

export const deleteGridCommand: Command = {
  id: 'core.deleteGrid',
  label: 'Delete grid',
  description:
    'Delete a grid axis. REFUSED if a constraint places an element on it, unless retargetMap or acknowledge:true.',
  argsSchema: {
    id: { kind: 'ref', refTo: 'grid', label: 'Grid', required: true },
    ...GUARD_ARGS,
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(deleteGridCommand, rawArgs);
    const id = text(args['id']);
    const before = ctx.scene.grids[id];
    if (before === undefined) throw new CommandFailure('NOT_FOUND', `unknown grid "${id}"`);
    const extra = guardReferences(`grid "${id}"`, gridReferrers(ctx.scene, id), args);
    return ctx.edit(
      `Delete grid ${before.name}`,
      [...extra, { collection: 'grids', id, before }],
      [],
    );
  },
};

/* ================================================================================================
 * ISSUING A REVISION — a COMMAND, not a file operation (decision D41)
 * ============================================================================================= */

/**
 * ⚠⚠ **ISSUE THE MODEL** — *"this is the version I am handing downstream"* (D34, D40, **D41**).
 *
 * **SAVING IS NOT ISSUING.** Save ten times and no revision is minted; none of those saves was a
 * statement about what you are handing to anyone. A revision is a **deliberate act**, and it is the
 * anchor every downstream delta is computed against.
 *
 * ⚠ **WHY IT IS A COMMAND, AND WHY THAT WAS A RULING.** It was a free function in the persistence codec
 * (`bnn.ts`), which meant **an agent could author a building but could not release one** — the single
 * new concept the entire ecosystem rests on was reachable only from a file menu, and `listCommands()`
 * never mentioned it. Domain rule 9 admits **no second path**: anything an actor can do to the Document
 * is a Command. It also makes D40's anchor fall out for free — the document knows its own journal
 * position, so `issued_at_seq` is simply *the seq of this edit*.
 *
 * ⚠ **It changes no scene state, and it is deliberately NOT undoable.** Its `changes` are empty: what
 * it produces is a *revision*, which is document state, not scene state. And you cannot recall a
 * revision you have already handed to the contractor — an "undo" of it would be a lie in the one log
 * three products compute payments from. It is journalled (that is the point) but never pushed onto the
 * undo stack, so nothing offers to reverse it.
 */
export const issueRevisionCommand: Command = {
  id: 'core.issueRevision',
  label: 'Issue revision',
  description:
    'ISSUE the model — declare this state a baseline to hand downstream (D34/D41). Saving is not issuing. The revision records its journal position (issued_at_seq), which is what makes "what changed since revision N?" answerable at all.',
  argsSchema: {
    by: { kind: 'string', label: 'Issued by', required: true, description: 'Who is releasing it' },
    lineage: {
      kind: 'string',
      label: 'Lineage',
      description: 'The thread every revision on this model hangs on. Defaults to the current one.',
    },
  },
  execute(ctx, rawArgs) {
    const args = checkArgs(issueRevisionCommand, rawArgs);
    // ⚠ `issued_at_seq` IS THIS EDIT'S OWN SEQ. So the delta since this revision —
    // `journal.filter(e => e.seq > issued_at_seq)` — excludes the issuance itself and includes exactly
    // what happens after it. That is the whole mechanism, and it is one line.
    const revision = nextRevision(
      ctx.revision,
      text(args['by']),
      ctx.seq,
      args['lineage'] === undefined ? undefined : text(args['lineage']),
    );
    return ctx.edit(`Issue revision ${String(revision.snapshot_number)}`, [], [], { revision });
  },
};

/** Every core command. Registered by `createRegistries`'s caller — additively, like everything else. */
export const CORE_COMMANDS: readonly Command[] = [
  createElementCommand,
  setParamsCommand,
  updateStyleCommand,
  deleteElementCommand,
  retargetReferenceCommand,
  setClassificationCommand,
  setElementMetadataCommand,
  createStyleCommand,
  createMaterialCommand,
  createSectionCommand,
  createContainerCommand,
  createGridCommand,
  createConstraintCommand,
  deleteConstraintCommand,
  createSketchConstraintCommand,
  deleteSketchConstraintCommand,
  setJoinCommand,
  clearJoinCommand,
  updateContainerCommand,
  updateGridCommand,
  updateMaterialCommand,
  updateSectionCommand,
  updateConstraintCommand,
  deleteStyleCommand,
  deleteMaterialCommand,
  deleteSectionCommand,
  deleteContainerCommand,
  deleteGridCommand,
  issueRevisionCommand,
];

export type { BrokenReference };
