/**
 * THE SIX REGISTRIES OF THE DOCUMENT LAYER (spec §4, architecture §4).
 *
 * **New kinds of things — types, commands, formats, views, materials, sections — are ADDITIVE
 * REGISTRATIONS, never core edits** (domain rule 5). This file is the mechanism that makes that
 * sentence true rather than aspirational.
 *
 *   1. BIM Object Type      — what a Wall IS
 *   2. Command / Action     — what an actor can DO          ⚠ THE AGENT API IS THIS ONE (D19)
 *   3. File Format Codec    — how a model leaves and enters
 *   4. View / Representation— how a model is projected (3D, 2D, ⚠ and "for reasoning" — D23)
 *   5. Material Library     — D33
 *   6. Section Catalogue    — D33
 *
 * ⚠ **SIX, NOT SEVEN — and four documents said seven.** The "seventh" was the **naming resolver**, and
 * it is **not a registry of the document layer at all**: it lives in the kernel
 * (`@bunyan/kernel-occt/src/naming.ts`), behind the `GeometryGateway`, and the document reaches it the
 * only way it reaches anything geometric — by asking the kernel. There was never a seventh entry here
 * and there should not be one: registering it would mean the document layer held a naming component,
 * which is precisely the D19 boundary this package exists to keep. *(The plan's instruction was
 * "either register it or stop saying seven." The honest answer was: stop saying seven.)*
 *
 * ⚠⚠ AND THE RULE THAT MAKES THE AGENT SURFACE FREE (D21): **capability discovery is GENERATED from
 * these registries.** `listCommands()` and `listTypes()` are projections of the same objects that
 * govern the behaviour — so a newly registered command appears as an agent verb with ZERO other edits.
 * A hand-written agent tool list would drift within weeks; a derived one cannot. (The kernel's own
 * `capabilities` learned this lesson the hard way — it drifted for two sessions, Entry 14.)
 */

import type { Material, Section, TypeId } from './entities.js';
import type { Scene } from './scene.js';
import type { BimObjectType } from './types.js';
import type { Command } from './commands.js';

/** A minimal, typed registry. Registration is idempotent-by-id and refuses a silent overwrite. */
export class Registry<T extends { readonly id: string }> {
  readonly #items = new Map<string, T>();
  readonly #kind: string;

  constructor(kind: string) {
    this.#kind = kind;
  }

  register(item: T): void {
    if (this.#items.has(item.id)) {
      throw new Error(
        `${this.#kind} "${item.id}" is already registered. Registration is additive; ` +
          `re-registering the same id would silently change behaviour under every existing document.`,
      );
    }
    this.#items.set(item.id, item);
  }

  get(id: string): T | undefined {
    return this.#items.get(id);
  }

  /** Throws with a useful message. Use where absence is a bug, not a user error. */
  require(id: string): T {
    const item = this.#items.get(id);
    if (item === undefined) throw new Error(`unknown ${this.#kind}: "${id}"`);
    return item;
  }

  has(id: string): boolean {
    return this.#items.has(id);
  }

  /** Canonically ordered — a projection of a registry must not depend on registration order. */
  list(): readonly T[] {
    return [...this.#items.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  }

  get size(): number {
    return this.#items.size;
  }
}

/**
 * A file-format codec (spec §4.3) — `.bnn` is one, IFC import is one (P6), a DWG reader would be one.
 *
 * ⚠⚠ **`read`/`write` ARE THE POINT, AND THEY WERE MISSING UNTIL ENTRY 60.** This interface used to be
 * `{id, label, extensions, canRead, canWrite}` — pure metadata, no behaviour — and **nothing anywhere
 * consulted `registries.codecs`.** `saveBnn`/`loadBnn` were called by name. So registering a codec
 * accomplished exactly nothing, and *"a new format is an additive registration"* (`core_logic.md` rule 5)
 * was decorative for formats while being genuinely true for types and commands.
 *
 * **How the rule-5 backward sweep found it, mechanically:** count what is actually registered across the
 * repo — **51 types, 39 commands, 1 codec (inside the test asserting the seam exists), 0 views.** Of the
 * four kinds rule 5 names, two worked.
 *
 * ⚠ It also lands on **D63**, which discharged freeze-gate row Ⓕ with *"the DWG seam ALREADY EXISTS…
 * asserted in the test, not just written down."* That test registered a descriptor and asserted `size`
 * went 0→1 — it exercised the generic `Registry` class, and would have passed had `FormatCodec` been
 * `{id}`. The seam it certified could not read a byte. **D63's conclusion survives; its evidence did not.**
 */
export interface FormatCodec {
  readonly id: string;
  readonly label: string;
  /** Lower-case, dot-led — `['.bnn']`. Matched against a filename by `codecFor`. */
  readonly extensions: readonly string[];
  readonly canRead: boolean;
  readonly canWrite: boolean;
  /** Decode bytes into a scene (+ whatever else the format carries). Present iff `canRead`. */
  readonly read?: (bytes: Uint8Array) => CodecReadResult;
  /** Encode a scene into bytes. Present iff `canWrite`. */
  readonly write?: (input: CodecWriteInput) => Uint8Array;
}

/**
 * What reading a file yields. `scene` is the only required member — every other format-specific payload
 * (a `.bnn`'s manifest and journal) rides along optionally, so a codec for a format that carries less
 * (a DWG underlay, an IFC import) is not forced to invent fields it has no source for.
 */
export interface CodecReadResult {
  readonly scene: Scene;
  readonly manifest?: unknown;
  readonly journal?: unknown;
  readonly thumbnail?: Uint8Array;
}

/** What writing a file is given. `options` is format-specific and passed through untouched. */
export interface CodecWriteInput {
  readonly scene: Scene;
  readonly options?: unknown;
}

/**
 * ⚠ THE DISPATCHER — the thing that makes rule 5 true for formats rather than aspirational. Pick the
 * codec that handles `filename` by its extension, without the caller naming a format. **This is what a
 * new format registration has to reach in order to be additive**: register a `.dwg` codec and every
 * caller of `codecFor` can open a `.dwg` with zero other edits, which is precisely the property rule 5
 * asserts and the property the old metadata-only registry could not deliver.
 *
 * ⚠ Longest extension wins, so a `.tar.gz`-style compound never loses to a shorter prefix.
 */
export function codecFor(
  registries: Registries,
  filename: string,
  need: 'read' | 'write' = 'read',
): FormatCodec | undefined {
  const lower = filename.toLowerCase();
  let best: FormatCodec | undefined;
  let bestLen = -1;
  for (const codec of registries.codecs.list()) {
    if (need === 'read' && !codec.canRead) continue;
    if (need === 'write' && !codec.canWrite) continue;
    for (const ext of codec.extensions) {
      if (lower.endsWith(ext.toLowerCase()) && ext.length > bestLen) {
        best = codec;
        bestLen = ext.length;
      }
    }
  }
  return best;
}

/**
 * A view/representation (spec §4.4) — how the model is PROJECTED.
 *
 * ⚠ `for: 'reasoning'` IS NOT A JOKE, AND IT IS D23. The agent's read API is registered here, beside
 * the 3D view: it is the projection **for reasoning**, as the mesh is the projection **for eyes**.
 * Queries return SEMANTICS — ids, types, params, quantities, relationships — **never triangles.** A
 * `Float32Array` is unreadable to an agent, and an agent handed one has been given a picture and
 * asked to think.
 *
 * ⚠⚠ **AND IT IS A RESERVED SHAPE, NOT A WORKING SEAM — SAID PLAINLY (Entry 60).** Nothing registers a
 * `ViewDefinition` and nothing reads `registries.views`; there is no projection member here to call. The
 * view BODIES are P6 (one plan, one section, one schedule — D58), and the shape a view is actually
 * described by is `documentation.ts`'s `ViewDescriptor`, which is a separate, deliberately additive union.
 *
 * This is recorded rather than quietly left because the codec registry beside it had exactly the same
 * shape — metadata with no behaviour and no dispatcher — and a decision (D63) was discharged on the
 * assumption that it worked. **A reservation is fine; a reservation mistaken for a mechanism is not.**
 * When the P6 bodies land, this grows a projection member and a dispatcher, exactly as `FormatCodec`
 * just did.
 */
export interface ViewDefinition {
  readonly id: string;
  readonly label: string;
  readonly for: 'eyes' | 'reasoning';
}

/**
 * The six registries, as one object. Passed to `DocumentContext`; projected by the agent surface.
 * (The naming resolver is the KERNEL's — see the header. It is not, and must not become, one of these.)
 */
export interface Registries {
  readonly types: Registry<BimObjectType>;
  readonly commands: Registry<Command>;
  readonly codecs: Registry<FormatCodec>;
  readonly views: Registry<ViewDefinition>;
  /** The LIBRARY — the palette. A document embeds copies of the ones it uses (see `scene.ts`). */
  readonly materials: Registry<Material>;
  readonly sections: Registry<Section>;
}

export function createRegistries(): Registries {
  return {
    types: new Registry<BimObjectType>('BIM object type'),
    commands: new Registry<Command>('command'),
    codecs: new Registry<FormatCodec>('format codec'),
    views: new Registry<ViewDefinition>('view'),
    materials: new Registry<Material>('material'),
    sections: new Registry<Section>('section'),
  };
}

/* ================================================================================================
 * THE CAPABILITY PROJECTION (D21) — "an agent needs no external documentation; it asks the app."
 * ============================================================================================= */

export interface CommandDescriptor {
  readonly name: string;
  readonly label: string;
  readonly description?: string;
  readonly argsSchema: unknown;
  /** ⚠ Every command returns its `UndoableEdit` (D23) — so verification costs nothing extra. */
  readonly returns: 'UndoableEdit';
}

export interface TypeDescriptor {
  readonly id: TypeId;
  readonly version: number;
  readonly label: string;
  readonly description?: string;
  readonly parameterSchema: unknown;
  readonly styleable: boolean;
  readonly hosted: boolean;
  readonly ifcClass: string;
}

/**
 * ⚠ THIS FUNCTION IS THE AGENT'S DOCUMENTATION, and it is derived from the registry rather than
 * written beside it. **Register a command and it becomes an agent verb with zero other edits.** That
 * is the exact mirror of P4's ribbon criterion — and it is why there is no "agent phase" in the plan
 * and there must never be one.
 */
export function describeCommands(registries: Registries): readonly CommandDescriptor[] {
  return registries.commands.list().map((command) => ({
    name: command.id,
    label: command.label,
    ...(command.description === undefined ? {} : { description: command.description }),
    argsSchema: command.argsSchema,
    returns: 'UndoableEdit' as const,
  }));
}

export function describeTypes(registries: Registries): readonly TypeDescriptor[] {
  return registries.types.list().map((type) => ({
    id: type.id,
    version: type.version,
    label: type.label,
    ...(type.description === undefined ? {} : { description: type.description }),
    parameterSchema: type.parameterSchema,
    styleable: type.styleSchema !== undefined,
    hosted: type.buildVoid !== undefined,
    ifcClass: type.defaultClassification.ifcClass,
  }));
}
