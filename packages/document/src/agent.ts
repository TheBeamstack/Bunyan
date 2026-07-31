/**
 * THE AGENT SURFACE (decisions D19–D23, spec §4.6).
 *
 * ⚠⚠ THE THING TO UNDERSTAND ABOUT THIS FILE: **there is almost nothing in it, and that is the proof
 * the design is right.** If this shim ever needs logic of its own beyond marshalling, D19 has been
 * violated somewhere upstream — because the agent API *is* the Command registry, and everything here
 * is a projection of registries that already exist for the ribbon and the property panel.
 *
 * There is **no agent phase** in the plan and there must never be one.
 *
 * ⚠ Three properties, each an owner ruling:
 *   - **`window.bunyan` first; MCP deferred to v1.0.x** (D22). *"No complex setup" is a hard
 *     requirement, and an MCP bridge IS that setup* — a download, a config file, a local process — and
 *     it would puncture the client-only/zero-backend promise. This surface **ships with the app: zero
 *     install.** MCP stays cheap later precisely BECAUSE of D19: it is another *transport* over the
 *     same verbs, not a second API.
 *   - **Versioned separately** (`agentApi: 1`) — it does NOT inherit the P5 type-contract freeze, and
 *     it evolves on its own clock.
 *   - **Explore → act → verify** (D23). `query` explores, `execute` acts, and the returned
 *     `UndoableEdit` IS the verification — the same object undo uses.
 *
 * ⚠ AND THE RULE THAT KEEPS IT HONEST: **queries return SEMANTICS, never triangles.** A `Float32Array`
 * is unreadable to an agent; handing one over is handing it a picture and asking it to think.
 *
 * `window.bunyan = createAgentSurface(doc)` is Amer's one line. This module knows nothing about a
 * browser, which is also why it is testable headlessly — and P3's exit criteria demand exactly that:
 * **a test acting ONLY through this surface, with no test-only back door.**
 */

import type { Element, ElementId, Params } from './entities.js';
import type { DocumentContext, QuantityBreakdown } from './document.js';
import { describeCommands, describeTypes } from './registries.js';
import type { CommandDescriptor, TypeDescriptor } from './registries.js';
import { containerPath } from './scene.js';
import type { UndoableEdit } from './undo.js';

/** ⚠ Versioned SEPARATELY from `protocolVersion` and from the P5 type freeze (D22). */
export const AGENT_API_VERSION = 1;

export interface ElementView {
  readonly id: ElementId;
  readonly typeId: string;
  readonly name?: string;
  readonly styleId?: string;
  readonly params: Params;
  readonly classification: Element['classification'];
  /** `Site → Building → Level` — the LBS path (D35), as names an agent (or Planitor) can read. */
  readonly location: readonly string[];
  readonly hostId?: ElementId;
  /**
   * The parts it is actually made of (D30). Names, not solids — **and each reports its OWN discipline**
   * (D45), because an RC wall is a structural core with architectural plaster on it.
   */
  readonly parts: readonly {
    readonly name: string;
    readonly materialId: string;
    readonly discipline: string;
  }[];
  readonly state: string;
}

export interface QueryFilter {
  readonly typeId?: string;
  readonly styleId?: string;
  readonly containerId?: string;
  readonly materialId?: string;
  readonly loadBearing?: boolean;
  /**
   * ⚠ **PART-SCOPED** (D45). An element matches iff **at least one of its parts** has this discipline —
   * so `query({discipline: 'architectural'})` finds an RC wall **through its plaster**, and
   * `query({discipline: 'structural'})` finds the same wall **through its core**. That is the correct
   * answer and an element-level field could not give it: *"filter by architectural and the slab must
   * disappear"* — but the ceiling under it must not.
   */
  readonly discipline?: string;
}

export interface AgentSurface {
  readonly agentApi: number;
  /** ⚠ GENERATED from the Command registry (D21). Register a command; it appears here. Zero edits. */
  listCommands: () => readonly CommandDescriptor[];
  listTypes: () => readonly TypeDescriptor[];
  listStyles: () => readonly { id: string; name: string; typeId: string }[];
  listMaterials: () => readonly { id: string; name: string; density: number }[];
  listSections: () => readonly { id: string; name: string; shape: string }[];
  /**
   * Act. Returns the state delta — which is also the verification (D23).
   *
   * ⚠⚠ `transactionId` IS HERE BECAUSE OF D19, NOT BECAUSE AN AGENT ASKED FOR IT. Grouping several edits
   * into one undoable unit is a real capability (P4.5 row ⓘ, owner-ruled Q5), and *"every capability
   * reachable only through the UI is a capability an agent can never have"* is this file's whole reason to
   * exist. A tool that can commit an atomic "add a room" while an agent can only commit four separate
   * walls is exactly the second-API drift D19 forbids. Optional and absent-defaulted, so every existing
   * caller is unchanged; `agentApi` does not move (D22 — the surface versions on its own clock, and this
   * is additive).
   */
  execute: (
    command: string,
    args: Params,
    options?: { readonly transactionId?: string },
  ) => Promise<UndoableEdit>;
  /**
   * ⚠⚠ **LOOK BEFORE YOU LEAP — AND IT IS THE SAME VERB, NOT A SECOND ONE** (D42).
   *
   * Runs the command for real (real kernel, full fidelity), throws the result away, and returns the
   * `UndoableEdit` it *would* have produced — or the typed failure **naming the element that refused**.
   * `dryRun('core.deleteElement', {elementId})` returns an edit whose changes already list the entire
   * cascade, because the real command computed it.
   *
   * ⚠ This **replaces `planDelete()`**, which is deleted. A hand-written `plan…()` beside every verb is
   * a second description of one behaviour, and it drifts (D21: **generated, never maintained**).
   */
  dryRun: (command: string, args: Params) => Promise<UndoableEdit>;
  /** Explore. Reads the RECIPE — no kernel op, no triangles. */
  query: (filter?: QueryFilter) => readonly ElementView[];
  get: (id: ElementId) => ElementView | undefined;
  /** Measured, per part, per material, `basis: "exact"` (domain rule 15). */
  quantities: (id: ElementId) => Promise<QuantityBreakdown>;
  /** The first-class, visible broken-reference state (domain rule 3). */
  brokenRefs: () => readonly { elementId: string; ref: string; reason: string }[];
  /**
   * Elements this app cannot build at all — an unregistered Type, or one from the future (D43).
   * Visible, preserved verbatim through save, and never a reason to refuse anyone's command.
   */
  unbuildable: () => readonly { elementId: string; reason: string }[];
  /**
   * ⚠⚠ **THE ECOSYSTEM'S CHANGE FEED** (D40) — append-only, `seq`-ordered, never trimmed. **Not the
   * undo stack.** *"What changed since revision N?"* is `changeFeed().filter(e => e.seq > N)`, and it
   * is READ, never inferred by diffing two models.
   */
  changeFeed: () => readonly UndoableEdit[];
  undo: () => Promise<UndoableEdit | undefined>;
  redo: () => Promise<UndoableEdit | undefined>;
}

export function createAgentSurface(doc: DocumentContext): AgentSurface {
  const view = (element: Element): ElementView => ({
    id: element.id,
    typeId: element.typeId,
    ...(element.name === undefined ? {} : { name: element.name }),
    ...(element.styleId === undefined ? {} : { styleId: element.styleId }),
    params: element.params,
    classification: element.classification,
    location: containerPath(doc.scene, element.containerId).map((c) => c.name),
    ...(element.hostId === undefined ? {} : { hostId: element.hostId }),
    parts: (doc.partsOf(element.id) ?? []).map((p) => ({
      name: p.name,
      materialId: p.materialId,
      discipline: p.discipline,
    })),
    state: doc.geometryOf(element.id)?.state ?? 'stale',
  });

  return {
    agentApi: AGENT_API_VERSION,

    listCommands: () => describeCommands(doc.registries),
    listTypes: () => describeTypes(doc.registries),
    listStyles: () =>
      Object.values(doc.scene.styles).map((s) => ({ id: s.id, name: s.name, typeId: s.typeId })),
    listMaterials: () =>
      Object.values(doc.scene.materials).map((m) => ({
        id: m.id,
        name: m.name,
        density: m.density,
      })),
    listSections: () =>
      Object.values(doc.scene.sections).map((s) => ({ id: s.id, name: s.name, shape: s.shape })),

    // ⚠ NO `coalesceKey` — agent commands opt OUT of edit-coalescing (D23). A `SUPERSEDED` failure is
    // meaningless to an agent that issued one deliberate command; coalescing belongs to a drag.
    // ⚠ `transactionId` passes straight through — the executor owns the grouping, so the agent surface
    // stays the thin shim it is meant to be (no second implementation of anything).
    execute: (command, args, options) =>
      doc.execute(
        command,
        args,
        options?.transactionId === undefined ? {} : { transactionId: options.transactionId },
      ),
    dryRun: (command, args) => doc.execute(command, args, { dryRun: true }),

    query: (filter = {}) =>
      Object.values(doc.scene.elements)
        .filter((element) => {
          if (filter.typeId !== undefined && element.typeId !== filter.typeId) return false;
          if (filter.styleId !== undefined && element.styleId !== filter.styleId) return false;
          if (filter.containerId !== undefined && element.containerId !== filter.containerId) {
            return false;
          }
          if (
            filter.loadBearing !== undefined &&
            element.classification.loadBearing !== filter.loadBearing
          ) {
            return false;
          }
          // ⚠ PART-SCOPED (D45): an element matches iff ONE OF ITS PARTS does. The RC wall answers
          // `structural` (through its core) AND `architectural` (through its plaster) — and that is not
          // a fudge, it is what the wall IS. An element-level field had to lie about one of them.
          if (filter.discipline !== undefined) {
            const parts = doc.partsOf(element.id) ?? [];
            if (!parts.some((p) => p.discipline === filter.discipline)) return false;
          }
          if (filter.materialId !== undefined) {
            const parts = doc.partsOf(element.id) ?? [];
            if (!parts.some((p) => p.materialId === filter.materialId)) return false;
          }
          return true;
        })
        .map(view),

    get: (id) => {
      const element = doc.scene.elements[id];
      return element === undefined ? undefined : view(element);
    },

    quantities: (id) => doc.quantities(id),
    brokenRefs: () =>
      doc.brokenRefs().map((b) => ({ elementId: b.elementId, ref: b.ref, reason: b.reason })),
    unbuildable: () => doc.unbuildable(),
    changeFeed: () => doc.changeFeed(),
    undo: () => doc.undo(),
    redo: () => doc.redo(),
  };
}
