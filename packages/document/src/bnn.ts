/**
 * `.bnn` — the native format (spec §6, decision D38).
 *
 * A zip of documented JSON:
 *
 *     project.bnn
 *     ├── manifest.json   app/schema/type versions, the KERNEL BUILD ID, and the MODEL REVISION (D34)
 *     ├── scene.json      THE PARAMETRIC TRUTH. The building IS this file.
 *     ├── history.json    the edit log — session continuity AND the ecosystem's change feed (D34)
 *     └── thumbnail.png   a convenience artifact; never affects load
 *
 * ⚠ **THERE IS NO `geometry-cache.brep` AND NOTHING HERE ASSUMES ONE** (D29, deferred by owner ruling
 * to P3 step 4 — to be decided WITH the measured rebuild cost, which is the whole point of the
 * deferral). Whatever is ruled, it is purely additive to a zip, so v1.0.x could add it without
 * breaking a single saved file.
 *
 * ⚠ **WHY A NATIVE FORMAT EXISTS AT ALL, WHEN IFC IS A REAL OPEN STANDARD:** IFC is an *interchange*
 * format, not an *authoring* one. It stores the RESULTS of modelling — geometry, properties,
 * relationships — but **it cannot store the parametric recipe, it has no concept of a `SubShapeRef`,
 * and its GlobalIds churn between exports.** Save to IFC and reopen, and you have a building made of
 * frozen shapes rather than a building you can still edit. And it is not lock-in: the source is AGPL,
 * this file is documented and versioned, and Miqdar — a different product — reads *and writes* it.
 */

import { unzipSync, zipSync } from 'fflate';
import type { Scene } from './scene.js';
import { SCENE_SCHEMA_VERSION, emptyScene } from './scene.js';
import type { UndoableEdit } from './undo.js';
import type { ModelRevision } from './revision.js';
import type { Registries } from './registries.js';
import type { Element, Params } from './entities.js';

export const APP_VERSION = '0.0.0';

export interface Manifest {
  readonly app: string;
  readonly appVersion: string;
  readonly schemaVersion: number;
  /**
   * `occt-7.9.3-emcc-6.0.2`. Recorded because it is what a geometry cache would have to be validated
   * against — and because a model rebuilt by a different kernel build is a fact worth being able to see.
   */
  readonly kernelBuildId: string;
  /** Every type used, and the version each element was authored against — this drives migration. */
  readonly typeVersions: Readonly<Record<string, number>>;
  /** ⚠ Absent until the model is ISSUED. Saving does not create one (D34). */
  readonly revision?: ModelRevision;
}

export interface BnnPackage {
  readonly manifest: Manifest;
  readonly scene: Scene;
  /** ⚠ THE JOURNAL (D40) — the ecosystem's change feed. Not "optional session continuity". */
  readonly journal?: readonly UndoableEdit[];
  readonly thumbnail?: Uint8Array;
}

export interface SaveOptions {
  readonly kernelBuildId: string;
  /**
   * ⚠⚠ **THE JOURNAL** (D40) — `doc.changeFeed()`, **not** `doc.history()`. Append-only, `seq`-ordered,
   * never trimmed. Persisting the undo stack here instead is precisely the bug that made the Clean
   * Delta uncomputable: it is capped at 200 and an undo pops entries out of it.
   */
  readonly journal?: readonly UndoableEdit[] | undefined;
  readonly thumbnail?: Uint8Array | undefined;
  /**
   * The revision the document was last ISSUED at — `doc.revision`. ⚠ Saving does NOT mint one:
   * `core.issueRevision` does (D41). Carried into the manifest so a consumer can compute the delta.
   */
  readonly revision?: ModelRevision | undefined;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Which type version each element was authored against — the input to load-time migration. */
function typeVersionsOf(scene: Scene): Record<string, number> {
  const versions: Record<string, number> = {};
  for (const element of Object.values(scene.elements)) {
    const known = versions[element.typeId];
    versions[element.typeId] =
      known === undefined ? element.typeVersion : Math.max(known, element.typeVersion);
  }
  return versions;
}

export function saveBnn(scene: Scene, options: SaveOptions): Uint8Array {
  const manifest: Manifest = {
    app: 'bunyan',
    appVersion: APP_VERSION,
    schemaVersion: SCENE_SCHEMA_VERSION,
    kernelBuildId: options.kernelBuildId,
    typeVersions: typeVersionsOf(scene),
    ...(options.revision === undefined ? {} : { revision: options.revision }),
  };

  const files: Record<string, Uint8Array> = {
    'manifest.json': encoder.encode(JSON.stringify(manifest, null, 2)),
    'scene.json': encoder.encode(JSON.stringify(scene, null, 2)),
  };
  if (options.journal !== undefined) {
    files['history.json'] = encoder.encode(JSON.stringify(options.journal, null, 2));
  }
  if (options.thumbnail !== undefined) files['thumbnail.png'] = options.thumbnail;

  return zipSync(files, { level: 6 });
}

/**
 * ⚠ A `.bnn` IS A FILE A USER CAN BE *SENT*. Everything here is parsed defensively: a malformed
 * manifest, a missing `scene.json`, a scene whose collections are not objects — all of them fail with
 * a message, never with a half-loaded document. (The one part that would have been fed as *binary* to
 * OCCT's deserializer is the geometry cache, which does not exist — see D29. That is not a small
 * security dividend, and it is one of the arguments for never building it.)
 */
export function loadBnn(bytes: Uint8Array): BnnPackage {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch (error) {
    throw new Error(`not a readable .bnn package: ${error instanceof Error ? error.message : ''}`);
  }

  const manifestBytes = files['manifest.json'];
  const sceneBytes = files['scene.json'];
  if (manifestBytes === undefined) throw new Error('.bnn is missing manifest.json');
  if (sceneBytes === undefined) throw new Error('.bnn is missing scene.json');

  const manifest = JSON.parse(decoder.decode(manifestBytes)) as Manifest;
  const parsed = JSON.parse(decoder.decode(sceneBytes)) as Partial<Scene>;

  // ⚠⚠ A `schemaVersion` FROM THE FUTURE IS A TYPED REFUSAL, NAMING THE VERSION (D43). We cannot know
  // what a later `scene.json` means, and a document half-understood is a document silently wrong. This
  // refuses the FILE; an unknown *element type* inside a file we do understand is the opposite call —
  // it opens, and the element is carried verbatim (see `build.ts`, D43).
  const schemaVersion = parsed.schemaVersion ?? SCENE_SCHEMA_VERSION;
  if (typeof schemaVersion !== 'number' || schemaVersion > SCENE_SCHEMA_VERSION) {
    throw new Error(
      `.bnn scene.json is schema version ${String(schemaVersion)}; this app understands ` +
        `up to ${String(SCENE_SCHEMA_VERSION)}. Refusing to open it rather than misread it.`,
    );
  }

  const scene: Scene = { ...emptyScene(), ...parsed, schemaVersion };

  for (const key of [
    'elements',
    'styles',
    'materials',
    'sections',
    'containers',
    'grids',
    // ⚠ `constraints` (0b) and `roomSeparators` (0g) are first-class collections a hostile `.bnn` can set
    // to `null` too — `{ ...emptyScene(), ...parsed }` would then overwrite the `{}` default with `null`
    // and crash deeper in (`typeof null === 'object'`, the exact trap the guard below exists for).
    'constraints',
    'roomSeparators',
  ] as const) {
    // ⚠⚠ **`typeof null === 'object'`.** The guard here used to be `typeof scene[key] !== 'object'` —
    // so a `.bnn` carrying `"elements": null` sailed straight through the check written to catch it and
    // died deeper in as a raw `TypeError`, while the file's own comment promised "all of them fail with
    // a message". A `.bnn` is a file a user can be SENT. **Validate the shape, never the `typeof`.**
    if (!isPlainObject(scene[key])) {
      throw new Error(`.bnn scene.json: "${key}" must be an object, and it is not`);
    }
  }
  if (!Array.isArray(scene.brokenRefs)) {
    throw new Error('.bnn scene.json: "brokenRefs" must be an array, and it is not');
  }

  const journalBytes = files['history.json'];
  const thumbnail = files['thumbnail.png'];
  const journal =
    journalBytes === undefined
      ? undefined
      : (JSON.parse(decoder.decode(journalBytes)) as UndoableEdit[]);
  if (journal !== undefined && !Array.isArray(journal)) {
    throw new Error('.bnn history.json: the journal must be an array, and it is not');
  }

  return {
    manifest,
    scene,
    ...(journal === undefined ? {} : { journal }),
    ...(thumbnail === undefined ? {} : { thumbnail }),
  };
}

/** ⚠ Not `typeof x === 'object'`: that is true of `null` and of every array. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/*
 * ⚠ `issue()` USED TO LIVE HERE, AND THAT WAS THE BUG (D41). It was a free function in the persistence
 * codec — so **an agent could author a building but could not release one**, and `listCommands()` never
 * mentioned the single new concept the whole ecosystem rests on. It is now **`core.issueRevision`**, an
 * ordinary Command (`commands.ts`), because domain rule 9 admits no second path. The minting itself
 * lives in `revision.ts`, where the journal and the command can both see it.
 */

/**
 * LOAD-TIME MIGRATION (spec §4.1, plan P3 step 5).
 *
 * A Type evolves; old files keep loading. For every element authored against an older version of its
 * type, the type's own `migrate` brings its params forward.
 *
 * ⚠ **Rebuild-from-`scene.json` is the primary load path and always exists** — the recipe is truth. So
 * migration only ever has to move *parameters*, never geometry: there is no stored geometry to migrate.
 * That is the quiet dividend of the core invariant, and it is why a format migration here is a
 * twenty-line function rather than a project.
 *
 * ⚠⚠ **MIGRATION IS FORWARD-ONLY, AND THE BACKWARD CASE IS NOT A MIGRATION — IT IS A REFUSAL** (D43).
 * An element authored against **Wall v3**, opened by an app that has **Wall v2**, cannot be brought
 * "back": v2's code has never heard of v3's parameters. It used to be **silently built against v2's
 * schema** — a wrong building rather than a refused one. It is now left exactly as it is, and
 * `buildAssembly` marks it `unbuildable`: visible, never built, and **preserved verbatim through save**.
 * A file we only partly understand must be a file we cannot damage.
 */
export function migrateScene(scene: Scene, registries: Registries): Scene {
  const elements: Record<string, Element> = {};
  let migrated = 0;

  for (const [id, element] of Object.entries(scene.elements)) {
    const type = registries.types.get(element.typeId);
    // ⚠ An unknown type, or one from the future, is passed through UNTOUCHED — not dropped, not
    // "fixed". Dropping it would delete Miqdar's columns, and their PEIs, on a round-trip through an
    // app that merely opened the file to look at it (D43).
    if (type === undefined || element.typeVersion >= type.version) {
      elements[id] = element;
      continue;
    }
    const params: Params =
      type.migrate === undefined
        ? element.params
        : type.migrate(element.params, element.typeVersion);
    elements[id] = { ...element, params, typeVersion: type.version };
    migrated++;
  }

  return migrated === 0 ? scene : { ...scene, elements };
}

/* ================================================================================================
 * PERSISTENCE — the seam, not the implementation (spec §7).
 *
 * ⚠ THE BROWSER STORAGE IS DELIBERATELY NOT HERE. The File System Access API, OPFS and IndexedDB are
 * browser capabilities, and this box is headless — code I cannot exercise is code I must not claim to
 * have verified. So the document layer defines the SEAM and Amer implements it against a real browser,
 * where it can actually be tested. A `MemoryStore` below keeps the seam honest and the round-trip
 * tested here.
 * ============================================================================================= */

export interface StorageAdapter {
  read: (key: string) => Promise<Uint8Array | undefined>;
  write: (key: string, bytes: Uint8Array) => Promise<void>;
  remove: (key: string) => Promise<void>;
  list: () => Promise<readonly string[]>;
}

export class MemoryStore implements StorageAdapter {
  readonly #files = new Map<string, Uint8Array>();
  read(key: string): Promise<Uint8Array | undefined> {
    return Promise.resolve(this.#files.get(key));
  }
  write(key: string, bytes: Uint8Array): Promise<void> {
    this.#files.set(key, bytes);
    return Promise.resolve();
  }
  remove(key: string): Promise<void> {
    this.#files.delete(key);
    return Promise.resolve();
  }
  list(): Promise<readonly string[]> {
    return Promise.resolve([...this.#files.keys()]);
  }
}

/**
 * Autosave: a capped ring of snapshots (spec §7, plan P3 step 7).
 *
 * ⚠ It writes the `.bnn` itself, not some second lesser format — so recovery is an ordinary load, and
 * the path that restores a crashed session is the same path that has been tested every other day.
 *
 * ⚠⚠ **AND THE COUNTER MUST BE SEEDED FROM THE STORE, WHICH IT WAS NOT — SO AUTOSAVE RECOVERED STALE
 * WORK.** `#counter` started at **0 in every new session**. Session 1 wrote `autosave-1..3` and crashed;
 * session 2 opened over the same store, edited, snapshotted — and wrote **`autosave-1`** again,
 * overwriting session 1's oldest, while `latest()` (highest counter) still returned session 1's
 * `autosave-3`. **Measured: saved 9999, recovered 1300.** The second crash silently restored *old*
 * work, and the newest snapshot was unreachable. **Data loss, in the feature whose only purpose is
 * preventing data loss.**
 *
 * ⚠ And the reason the suite could not see it: the test called `latest()` on **the same `Autosave`
 * instance that wrote the snapshots**. It never constructed a fresh one over an existing store — *which
 * is the only situation autosave exists for.* It would have passed forever.
 */
export class Autosave {
  readonly #store: StorageAdapter;
  readonly #depth: number;
  /** `undefined` until seeded from the store — a fresh session must not assume it is the first. */
  #counter: number | undefined;

  constructor(store: StorageAdapter, depth = 5) {
    this.#store = store;
    this.#depth = depth;
  }

  /** ⚠ The next counter, seeded from what is ALREADY in the store. A new session continues the ring. */
  async #next(): Promise<number> {
    if (this.#counter === undefined) {
      const existing = await this.#keys();
      this.#counter = existing.reduce((highest, key) => Math.max(highest, counterOf(key)), 0);
    }
    return ++this.#counter;
  }

  async #keys(): Promise<readonly string[]> {
    return (await this.#store.list()).filter((k) => k.startsWith('autosave-')).sort(byCounter);
  }

  async snapshot(bytes: Uint8Array): Promise<string> {
    const key = `autosave-${String(await this.#next())}.bnn`;
    await this.#store.write(key, bytes);
    // ⚠ Prune by the SAME order `latest()` reads, or the ring drops the snapshot it is about to offer.
    const keys = await this.#keys();
    for (const stale of keys.slice(0, Math.max(0, keys.length - this.#depth))) {
      await this.#store.remove(stale);
    }
    return key;
  }

  /** The most recent snapshot — what the "recover your session?" prompt offers. */
  async latest(): Promise<Uint8Array | undefined> {
    const newest = (await this.#keys()).at(-1);
    return newest === undefined ? undefined : this.#store.read(newest);
  }
}

function counterOf(key: string): number {
  return Number(/autosave-(\d+)/.exec(key)?.[1] ?? 0);
}
function byCounter(a: string, b: string): number {
  return counterOf(a) - counterOf(b);
}
