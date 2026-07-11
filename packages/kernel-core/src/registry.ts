/**
 * `ShapeHandle` registry & lifecycle (spec §6.2).
 *
 * OpenCascade.js objects live on the Emscripten heap and are NOT garbage-collected by JS —
 * every `TopoDS_Shape` and every intermediate must be explicitly released, or a long editing
 * session leaks WASM memory until the tab OOMs.
 *
 * This registry is the single owner of that memory. It is generic over the shape type so the
 * mock kernel (plain JS objects) and the real OCCT kernel (WASM objects with `.delete()`) share
 * one lifecycle implementation — and so the leak test in CI exercises the same code path that
 * ships.
 */

import type { ShapeHandle } from '@bunyan/protocol';

export interface ShapeRegistryOptions<T> {
  /** Called exactly once when a shape is released. For OCCT this is where `shape.delete()` goes. */
  readonly onRelease?: (shape: T) => void;
  readonly prefix?: string;
}

export class ShapeRegistry<T> {
  readonly #shapes = new Map<ShapeHandle, T>();
  readonly #onRelease: ((shape: T) => void) | undefined;
  readonly #prefix: string;
  #next = 0;

  constructor(options: ShapeRegistryOptions<T> = {}) {
    this.#onRelease = options.onRelease;
    this.#prefix = options.prefix ?? 'sh';
  }

  add(shape: T): ShapeHandle {
    const handle: ShapeHandle = `${this.#prefix}:${this.#next++}`;
    this.#shapes.set(handle, shape);
    return handle;
  }

  get(handle: ShapeHandle): T | undefined {
    return this.#shapes.get(handle);
  }

  has(handle: ShapeHandle): boolean {
    return this.#shapes.has(handle);
  }

  release(handle: ShapeHandle): boolean {
    const shape = this.#shapes.get(handle);
    if (shape === undefined) return false;
    this.#shapes.delete(handle);
    this.#onRelease?.(shape);
    return true;
  }

  /**
   * Frees everything. Called at the end of a rebuild to drop intermediates, and when a coalesced
   * edit's result is discarded (spec §3, §6.2). "No rebuild leaves leaked WASM heap" is a P2 exit
   * criterion, and `liveCount` is what asserts it.
   */
  releaseAll(): number {
    const n = this.#shapes.size;
    for (const shape of this.#shapes.values()) {
      this.#onRelease?.(shape);
    }
    this.#shapes.clear();
    return n;
  }

  get liveCount(): number {
    return this.#shapes.size;
  }
}
