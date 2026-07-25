/**
 * `IndexedDbStore` — the real browser `StorageAdapter` (spec §7, plan P4 step 5 / persistence).
 *
 * ⚠ WHY IT LIVES HERE, NOT IN `@bunyan/document`. The document layer defines the `StorageAdapter` SEAM
 * and keeps a `MemoryStore` so the round-trip is testable on the headless build box, but it deliberately
 * ships NO browser implementation: "code I cannot exercise is code I must not claim to have verified"
 * (`bnn.ts`). This is that implementation — a browser capability, exercised in a real browser.
 *
 * ⚠⚠ `list()` MUST RETURN EVERY KEY ALREADY IN THE STORE. `Autosave` seeds its ring counter from
 * `store.list()` on the FIRST snapshot of a session (`bnn.ts` — the "saved 9999, recovered 1300" bug):
 * a store whose `list()` under-reports makes a fresh session overwrite the previous session's snapshots
 * and silently recover stale work. So `list()` here is `getAllKeys()` over the whole object store, with
 * no caching that could go stale.
 *
 * ⚠ IndexedDB (not the File System Access API) is the default because it needs NO user gesture and NO
 * permission prompt, works in every browser and in a private window, and stores `Uint8Array` values
 * through the structured-clone algorithm directly. FSA (real files the user picks) is an additive second
 * adapter behind the same seam — a v1.0.x nicety, not the store the app needs to function.
 */

import type { StorageAdapter } from '@bunyan/document';

const DB_NAME = 'bunyan';
const DB_VERSION = 1;
const STORE = 'files';

/**
 * A `StorageAdapter` backed by one IndexedDB object store (out-of-line string keys → `Uint8Array`). The
 * database connection is opened lazily and shared across calls.
 */
export class IndexedDbStore implements StorageAdapter {
  readonly #dbName: string;
  #db: Promise<IDBDatabase> | undefined;

  /** `dbName` lets a test or a second document use an isolated database; defaults to the app's `bunyan`. */
  constructor(dbName: string = DB_NAME) {
    this.#dbName = dbName;
  }

  /** True when the current environment actually has IndexedDB (false in SSR / some locked-down modes). */
  static get available(): boolean {
    return typeof indexedDB !== 'undefined';
  }

  #open(): Promise<IDBDatabase> {
    if (this.#db !== undefined) return this.#db;
    if (!IndexedDbStore.available) {
      this.#db = Promise.reject(new Error('IndexedDB is not available in this environment'));
      return this.#db;
    }
    this.#db = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.#dbName, DB_VERSION);
      request.onupgradeneeded = (): void => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      request.onsuccess = (): void => {
        resolve(request.result);
      };
      request.onerror = (): void => {
        reject(request.error ?? new Error('IndexedDB open failed'));
      };
      request.onblocked = (): void => {
        reject(new Error('IndexedDB open blocked by another connection'));
      };
    });
    return this.#db;
  }

  async read(key: string): Promise<Uint8Array | undefined> {
    const db = await this.#open();
    const value = await request<unknown>(
      db.transaction(STORE, 'readonly').objectStore(STORE).get(key),
    );
    return value === undefined ? undefined : toUint8(value);
  }

  async write(key: string, bytes: Uint8Array): Promise<void> {
    const db = await this.#open();
    const tx = db.transaction(STORE, 'readwrite');
    // ⚠ Copy into a standalone buffer before handing it to structured clone: `bytes` may be a VIEW over a
    // larger buffer (a subarray), and storing the view would persist the whole backing buffer.
    tx.objectStore(STORE).put(bytes.slice(), key);
    await completed(tx);
  }

  async remove(key: string): Promise<void> {
    const db = await this.#open();
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    await completed(tx);
  }

  async list(): Promise<readonly string[]> {
    const db = await this.#open();
    const keys = await request<IDBValidKey[]>(
      db.transaction(STORE, 'readonly').objectStore(STORE).getAllKeys(),
    );
    // Only string keys are ever written; filter defensively so the contract's `string[]` holds.
    return keys.filter((k): k is string => typeof k === 'string');
  }
}

/** Resolve an `IDBRequest` to its result, or reject with its error. */
function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = (): void => {
      resolve(req.result);
    };
    req.onerror = (): void => {
      reject(req.error ?? new Error('IndexedDB request failed'));
    };
  });
}

/** Resolve when a read-write transaction fully commits (not merely when the request succeeds). */
function completed(tx: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = (): void => {
      resolve();
    };
    tx.onerror = (): void => {
      reject(tx.error ?? new Error('IndexedDB transaction failed'));
    };
    tx.onabort = (): void => {
      reject(tx.error ?? new Error('IndexedDB transaction aborted'));
    };
  });
}

/** Normalise a structured-clone value back to a `Uint8Array` (some engines hand back an `ArrayBuffer`). */
function toUint8(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  throw new Error('stored value is not binary');
}
