/**
 * Post-link patch for the emitted glue: never hand `TextDecoder.decode` a view of growable memory.
 *
 * `link.sh` builds with `-sALLOW_MEMORY_GROWTH=1`, so `HEAPU8`/`HEAPU16` are views onto
 * `WebAssembly.Memory.prototype.buffer`. Chrome 149+ exposes that buffer as a **resizable**
 * `ArrayBuffer`, and its `TextDecoder.decode` refuses a view backed by one — the kernel hangs on
 * "Booting OCCT kernel…" rather than throwing anywhere visible. Emscripten 6.0.2 emits
 * `Decoder.decode(view.subarray(a, b))` at both of its decode sites, and `subarray` shares the
 * backing buffer, so the view it produces is refused too.
 *
 * `slice` copies into a fresh, non-resizable `ArrayBuffer` (measured: `slice().buffer.resizable`
 * is `false` where `subarray().buffer.resizable` is `true`), which is the whole fix. It costs one
 * extra copy on the >16-byte path: +13% on a 4 MB decode (2.04 ms -> 2.30 ms), unmeasurable below
 * a few KB.
 *
 * ⚠ This runs against the LINKER'S OUTPUT, never against a committed file — a generated artifact is
 * regenerated, not hand-edited. It leaves `toolchain.json`'s digest pin alone, which is why it is a
 * patch and not an emsdk bump: the OCCT static libs under that pin are stamped with the pinned
 * emcc's clang, so moving the digest turns a 75 s link into a 2.5 h OCCT rebuild.
 *
 * ⚠ Every rewrite is REQUIRED to match. An emsdk bump that reshapes the emitted text makes this
 * script fail loudly rather than silently ship an unpatched artifact — a patch that quietly matches
 * nothing is the "gate that skips itself" failure (`current_state.md §1d`).
 */

import { readFileSync, writeFileSync } from 'node:fs';

/** Each decode site emscripten 6.0.2 emits, and the copy that replaces its shared-buffer view. */
const REWRITES = [
  {
    what: 'UTF8ArrayToString',
    from: 'UTF8Decoder.decode(heapOrArray.subarray(idx,endPtr))',
    to: 'UTF8Decoder.decode(heapOrArray.slice(idx,endPtr))',
  },
  {
    what: 'UTF16ToString',
    from: 'UTF16Decoder.decode(HEAPU16.subarray(idx>>>0,endIdx>>>0))',
    to: 'UTF16Decoder.decode(HEAPU16.slice(idx>>>0,endIdx>>>0))',
  },
];

const target = process.argv[2];
if (!target) {
  console.error('usage: node postlink.mjs <path to bunyan-kernel.js>');
  process.exit(1);
}

let source = readFileSync(target, 'utf8');

for (const { what, from, to } of REWRITES) {
  const count = source.split(from).length - 1;
  if (count !== 1) {
    console.error(
      `postlink FAILED — expected exactly 1 ${what} decode site to patch, found ${count}.\n` +
        `The linker's emitted text has moved; re-read it and update REWRITES before shipping.\n` +
        `  looked for: ${from}`,
    );
    process.exit(1);
  }
  source = source.replace(from, to);
}

writeFileSync(target, source);
console.log(`postlink: patched ${REWRITES.length} decode sites in ${target}`);
