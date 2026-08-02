/**
 * ⚠⚠ THE RE-SEED GATE'S PATH MATCHER — the guard that had never been guarded.
 *
 * The gate (`scripts/check-reseed.mjs`) enforces the spec's rule that *"a new or changed
 * `buildGeometry` MUST ship with re-seeded goldens."* Two facts about its history are why this file
 * exists:
 *
 *   1. **It had never executed its real path once in 73 entries** (Entry 73). `actions/checkout`
 *      shallow-clones by default, so its `base...head` diff died; and with no PR ever opened, it had
 *      only taken its `not a pull request — skipping` branch. It was a gate nobody had opened.
 *   2. **The first change it ever measured, it refused wrongly** (Entry 74). Adding
 *      `"license": "AGPL-3.0-only"` to `packages/kernel-occt/package.json` tripped it, because the
 *      match was `startsWith('packages/kernel-occt/')` — a directory prefix, which catches manifests,
 *      tsconfigs, READMEs and every future file in the package.
 *
 * ⚠ WHY AN OVER-BROAD GATE IS WORSE THAN IT LOOKS, and the reason this is a bug and not a nitpick:
 * the remedy it prints is *"re-seed the goldens."* An agent who trips it on a licence field and
 * dutifully re-seeds has just re-baselined every golden — so genuine geometry drift, if any were
 * present, would be silently blessed with "the gate told me to" as its justification. A guard that
 * cries wolf does not fail safe; it trains people to route around it.
 *
 * ⚠ REVERT-VERIFY: restore either entry to its package-root form (`'packages/kernel-occt/'`,
 * `'packages/types/'`) in `scripts/reseed-paths.mjs` and the first block below goes RED — which is
 * exactly the CI failure that produced this test.
 */

import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain .mjs helper, deliberately untyped; it is CI plumbing, not shipped code.
import { GEOMETRY_PATHS, isGeometryFile, isGoldenFile } from '../scripts/reseed-paths.mjs';

const geometry = isGeometryFile as (file: string) => boolean;
const golden = isGoldenFile as (file: string) => boolean;
const paths = GEOMETRY_PATHS as readonly string[];

describe('the re-seed gate matches GEOMETRY, not LOCATION', () => {
  /* ============================================================================================
   * 1 — THE FALSE POSITIVE THAT BROKE ENTRY 74'S CI. These files live inside a geometry package
   *     and cannot move a vertex.
   * ========================================================================================= */

  it('⚠⚠ does NOT fire on non-source files that merely live in a geometry package', () => {
    // The two exact paths CI named when it refused a licence-field-only diff.
    expect(geometry('packages/kernel-occt/package.json')).toBe(false);
    expect(geometry('packages/types/package.json')).toBe(false);

    // The same class, so a future manifest/config/doc edit cannot resurrect this.
    expect(geometry('packages/kernel-occt/tsconfig.json')).toBe(false);
    expect(geometry('packages/kernel-occt/README.md')).toBe(false);
    expect(geometry('packages/types/tsconfig.json')).toBe(false);
    expect(geometry('packages/kernel-mock/package.json')).toBe(false);
  });

  /* ============================================================================================
   * 2 — THE GATE MUST STILL BITE. Narrowing a guard is only correct if it still refuses what it
   *     was built to refuse, so this is the half that stops the "fix" from being a hole.
   * ========================================================================================= */

  it('⚠ DOES still fire on every kind of file that can change a golden', () => {
    expect(geometry('packages/kernel-occt/src/kernel.ts')).toBe(true);
    expect(geometry('packages/kernel-occt/src/ops.ts')).toBe(true);
    expect(geometry('packages/kernel-occt/wasm/bunyan-kernel.wasm')).toBe(true);
    expect(geometry('packages/kernel-occt/wasm/bunyan-kernel.js')).toBe(true);
    expect(geometry('packages/types/src/wall.ts')).toBe(true);
    expect(geometry('packages/kernel-mock/src/box.ts')).toBe(true);
  });

  it('recognises the goldens themselves', () => {
    expect(golden('tests/goldens/wall.json')).toBe(true);
    expect(golden('tests/goldens/nested/deep.json')).toBe(true); // at any depth
    expect(golden('tests/kernel-host.test.ts')).toBe(false);
  });

  /* ============================================================================================
   * 3 — THE STRUCTURAL RULE, so the next person to extend the list cannot reintroduce the defect
   *     by adding another package root.
   * ========================================================================================= */

  it('⚠ every entry names a source location, never a package root', () => {
    for (const p of paths) {
      // A bare `packages/<name>/` is exactly the shape that caused the false positive.
      expect(
        /^packages\/[^/]+\/$/.test(p),
        `"${p}" is a package ROOT. It will match package.json, tsconfig.json and every doc in the ` +
          `package. Point at the source instead (e.g. "${p}src/").`,
      ).toBe(false);
    }
  });

  it('the mock kernel entry is still file-exact, because only one of its files is geometry', () => {
    expect(paths).toContain('packages/kernel-mock/src/box.ts');
    expect(geometry('packages/kernel-mock/src/transport.ts')).toBe(false);
  });
});
