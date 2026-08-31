// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE GLUE MUST NOT DECODE FROM A VIEW OF GROWABLE MEMORY — T-022.
 *
 * ⚠⚠ WHY THIS FILE EXISTS. The shipped kernel did not boot on Chrome 149+, and it did not throw
 * anywhere visible either: `apps/web` sat on "Booting OCCT kernel…" forever. `link.sh` builds with
 * `-sALLOW_MEMORY_GROWTH=1`, so `HEAPU8`/`HEAPU16` are views onto `WebAssembly.Memory`'s buffer;
 * Chrome 149+ exposes that buffer as a **resizable** `ArrayBuffer`, and its `TextDecoder.decode`
 * refuses a view backed by one. Emscripten 6.0.2 emitted `Decoder.decode(view.subarray(a, b))`, and
 * `subarray` shares the backing buffer, so the view handed to `decode` was refused.
 *
 * The fix is a post-link patch (`tools/kernel-build/postlink.mjs`) that makes both sites `slice`,
 * which copies into a fresh non-resizable buffer. It is a patch rather than an emsdk bump because
 * bumping the digest moves the compiler, and the OCCT static libs prebuilt under the current pin are
 * stamped with the pinned emcc's clang — a 75 s link would become a 2.5 h OCCT rebuild.
 *
 * ⚠⚠ THIS ASSERTS AGAINST THE ARTIFACT, NOT AGAINST THE RECIPE (`current_state.md §1c-9`). A test
 * that read `postlink.mjs` would prove only that we still intend to patch; the emitted bytes are the
 * thing that ships, and they have disagreed with their own doc-comments in this project before. The
 * committed glue is therefore read and scanned.
 *
 * ⚠ WHAT THIS FILE CANNOT DO. Node 20.20.2 is not a reproduction of the bug: measured here, its
 * `WebAssembly.Memory.prototype.buffer.resizable` is `false`, and it decodes a resizable-backed view
 * without complaint. So no headless assertion can watch this fail as Chrome fails it, and the boot
 * itself is `unverified here` — the pc seats confirm it (T-023). What IS verifiable here is the
 * mechanism, and both halves of it are asserted below: that the artifact hands `decode` no shared
 * view, and that `slice` is what severs the sharing.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('..', import.meta.url);
const read = (p: string) => readFileSync(fileURLToPath(new URL(p, ROOT)), 'utf8');

const GLUE = 'packages/kernel-occt/wasm/bunyan-kernel.js';
const glue = read(GLUE);

/** Every `.decode(` in the emitted glue, with the argument text that follows it. */
const decodeSites = (source: string): string[] => {
  const sites: string[] = [];
  for (let i = source.indexOf('.decode('); i !== -1; i = source.indexOf('.decode(', i + 1)) {
    sites.push(source.slice(i, i + 120));
  }
  return sites;
};

describe('the emitted glue never decodes from a view of growable memory (T-022)', () => {
  /**
   * ⚠ Weak-green (REVIEW.md item 6): the assertion below is "no site uses `subarray`", which is
   * trivially true of a file with no decode sites at all — a relink that renamed or inlined them
   * would pass while proving nothing. Counting them first is what stops that, and it is also the
   * tripwire for a THIRD site appearing: `postlink.mjs` patches exactly the two it knows, so a new
   * one would ship unpatched and this count is what notices.
   */
  it('has exactly the two decode sites the post-link patch knows about', () => {
    expect(decodeSites(glue)).toHaveLength(2);
  });

  it('hands neither of them a subarray of the heap', () => {
    const offenders = decodeSites(glue).filter((site) => site.includes('subarray'));
    expect(offenders).toEqual([]);
  });

  it('hands both of them a copy instead', () => {
    const copying = decodeSites(glue).filter((site) => site.includes('.slice('));
    expect(copying).toHaveLength(2);
  });

  /**
   * ⚠⚠ THE ONE THAT MAKES THE THREE ABOVE MEAN SOMETHING. They are text assertions about a
   * generated file: they say the artifact says `slice`, and nothing whatever about what `slice`
   * does. This measures the actual property the fix turns on — that `subarray` propagates the
   * resizable backing buffer Chrome refuses, and `slice` does not.
   */
  it('measures WHY slice is the fix: subarray shares the resizable buffer, slice does not', () => {
    // ⚠ Typed locally rather than by widening the repo's `lib`: resizable ArrayBuffers are ES2024,
    // and one test is not a reason to move the compilation target of every package.
    type ResizableCtor = new (n: number, opts: { maxByteLength: number }) => ArrayBuffer;
    const resizableOf = (b: ArrayBufferLike) => (b as { resizable?: boolean }).resizable;

    const growable = new (ArrayBuffer as unknown as ResizableCtor)(1024, {
      maxByteLength: 1 << 20,
    });
    const heap = new Uint8Array(growable);

    expect(resizableOf(growable)).toBe(true);
    expect(resizableOf(heap.subarray(0, 64).buffer)).toBe(true);
    expect(resizableOf(heap.slice(0, 64).buffer)).toBe(false);
  });

  /**
   * The patch must survive a relink, and it only does so because `link.sh` runs it. A hand-patched
   * generated file is the failure mode this guards: the next person to follow the recipe would
   * silently ship an unpatched artifact.
   */
  it('is applied by the recipe, so a relink cannot drop it', () => {
    expect(read('tools/kernel-build/link.sh')).toContain('postlink.mjs');
  });
});
