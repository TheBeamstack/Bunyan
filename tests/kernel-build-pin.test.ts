/**
 * THE TOOLCHAIN PIN — open ruling Q14, raised by Entry 76's review, built by Entry 79.
 *
 * ⚠⚠ WHY THIS FILE EXISTS, AND IT IS NOT HYGIENE. The build recipe invoked `emscripten/emsdk:latest`
 * at five sites, and `OCCT_BUILD_ID` — the string stamped into every saved `.bnn`, which decides
 * whether a cached B-Rep is reused or rebuilt (spec §6) — was a hand-maintained constant asserted
 * only against ITSELF, in four tests. Two facts measured on 2026-08-05 turn that from untidy into a
 * live defect:
 *
 *   1. **The tag had already moved.** `:latest` resolved to `sha256:76a44fff…` = emsdk **6.0.5**;
 *      the committed artifact was linked by `sha256:644883f5…` = **6.0.2**, three releases back.
 *      Anyone following the recipe relinks with a compiler the build id does not name. The only
 *      reason this box did not is that Docker still had the July image cached.
 *   2. **The artifact could not be asked.** The shipped `.wasm` had **11 sections, not one custom
 *      section and not one version string in 14.7 MB** — there was nothing to read back, so no test
 *      could have caught (1) even in principle.
 *
 * ⇒ Two changes, and this file gates both: the digest is pinned in `toolchain.json` (ONE copy, read
 * by the recipe and by these tests), and `kernel.cpp` now computes the build id from
 * `OCC_VERSION_COMPLETE` + `__EMSCRIPTEN_*__` — compile-time macros — and exposes it as
 * `toolchainId()`, so the artifact answers for itself and `createOcctKernel` refuses a module that
 * disagrees with the constant.
 *
 * ⚠ THE LAST TEST IS THE ONE THAT MATTERS. The others compare documents to documents, which is worth
 * something but cannot see a relink; only the one that boots the real WASM and asks it can.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { OCCT_BUILD_ID, createOcctKernel } from '@bunyan/kernel-occt';

const ROOT = new URL('..', import.meta.url);
const read = (p: string) => readFileSync(fileURLToPath(new URL(p, ROOT)), 'utf8');

interface Toolchain {
  occt: { version: string; sourceTag: string; patched: boolean };
  emsdk: { image: string; digest: string; equivalentTag: string; emcc: string };
  buildId: string;
}
const toolchain = JSON.parse(read('tools/kernel-build/toolchain.json')) as Toolchain;

/** Fenced code blocks only — prose may (and does) name `:latest` to explain why it is forbidden. */
const codeBlocks = (markdown: string): string[] =>
  [...markdown.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].map((m) => m[1] ?? '');

describe('the kernel toolchain is pinned by digest (Q14)', () => {
  it('records a well-formed image digest, not a tag', () => {
    expect(toolchain.emsdk.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(toolchain.emsdk.image).toBe('emscripten/emsdk');
  });

  /**
   * ⚠ THE REGRESSION GUARD. `:latest` is one careless paste away from returning, and it would
   * reproduce the exact defect this entry closed — silently, because the recipe would still work.
   * Scoped to EXECUTABLE text (code fences and shell scripts), so the warnings that explain the
   * hazard are free to quote it.
   */
  it('leaves no mutable emsdk tag in anything anyone would paste', () => {
    const executable: Array<[string, string]> = [
      ...codeBlocks(read('tools/kernel-build/README.md')).map(
        (b, i) =>
          ['tools/kernel-build/README.md (code block ' + String(i + 1) + ')', b] as [
            string,
            string,
          ],
      ),
      ['tools/kernel-build/link.sh', read('tools/kernel-build/link.sh')],
      ['tools/kernel-build/probe.sh', read('tools/kernel-build/probe.sh')],
      ['tools/kernel-build/configure.sh', read('tools/kernel-build/configure.sh')],
      ...codeBlocks(read('current_state.md')).map(
        (b, i) => ['current_state.md (code block ' + String(i + 1) + ')', b] as [string, string],
      ),
    ];

    const offenders = executable
      .filter(([, text]) => /emscripten\/emsdk:/.test(text))
      .map(([where]) => where);

    expect(offenders).toEqual([]);
  });

  it('states the pinned digest in the README so a reader sees what they are running', () => {
    const readme = read('tools/kernel-build/README.md');
    expect(readme).toContain(toolchain.emsdk.digest.slice('sha256:'.length, 'sha256:'.length + 8));
  });

  it('derives its build id from its own two halves', () => {
    expect(toolchain.buildId).toBe(`occt-${toolchain.occt.version}-emcc-${toolchain.emsdk.emcc}`);
  });

  it('agrees with the constant the TypeScript kernel declares', () => {
    expect(OCCT_BUILD_ID).toBe(toolchain.buildId);
  });

  /**
   * ⚠⚠ THE ONE THAT COULD NOT BE WRITTEN BEFORE THIS ENTRY, AND THE ONLY ONE THAT SEES A RELINK.
   *
   * Every other assertion here compares one document against another, so all of them stay green if
   * the artifact is rebuilt by a different compiler — that is precisely how Q14's failure was silent.
   * This one asks the module, and the string it answers with was written into the data section by the
   * compiler that compiled it.
   *
   * ⚠ Weak-green check (REVIEW.md item 6): could this pass while its title is false? Only if
   * `toolchainId()` returned a value derived from the TypeScript side — it cannot; it is a C++ string
   * literal built from `OCC_VERSION_COMPLETE` and `__EMSCRIPTEN_*__` at compile time. And it cannot
   * pass vacuously on a missing export either: an absent binding throws, it does not return
   * `OCCT_BUILD_ID`.
   */
  it('is confirmed BY THE WASM ARTIFACT, which reports the toolchain that compiled it', async () => {
    const kernel = await createOcctKernel();
    try {
      expect(kernel.artifactBuildId()).toBe(OCCT_BUILD_ID);
      expect(kernel.artifactBuildId()).toBe(
        `occt-${toolchain.occt.version}-emcc-${toolchain.emsdk.emcc}`,
      );
    } finally {
      kernel.dispose?.();
    }
  });
});
