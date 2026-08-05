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
import { readFileSync } from 'node:fs';
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

  /* ============================================================================================
   * 4 — THE BUILD RECIPE (Entry 75). The source the committed .wasm is built FROM was covered by
   *     a convention, not by this gate.
   * ========================================================================================= */

  /**
   * ⚠ This half makes CI refuse MORE, which is why it is separated from Entry 74's narrowing and
   * carries its own revert-verification. Until now, a change to `kernel.cpp` was gated only by the
   * habit of committing the rebuilt artifact alongside it. The sweep ledger's base rate for
   * unenforced conventions in this repo is **1-in-2 dirty**.
   */
  it('⚠ DOES fire on the C++ and the build flags the shipped .wasm is compiled from', () => {
    expect(geometry('tools/kernel-build/src/kernel.cpp')).toBe(true);
    expect(geometry('tools/kernel-build/configure.sh')).toBe(true);
    expect(geometry('tools/kernel-build/link.sh')).toBe(true);
    // Entry 79 (Q14): the pinned emsdk digest names WHICH COMPILER applies those flags. A digest
    // bump is a toolchain change and a toolchain change can move a golden — the same argument that
    // put `link.sh` on this list, one level up.
    expect(geometry('tools/kernel-build/toolchain.json')).toBe(true);
  });

  /**
   * ⚠⚠ AND THE OTHER HALF, WHICH IS THE ONE THAT KEEPS ENTRY 74'S LESSON APPLIED. It would have
   * been one keystroke cheaper to write `tools/kernel-build/` — and that is precisely the defect
   * just removed from this list. `src/probe.cpp` builds a separate diagnostic via `probe.sh`;
   * `link.sh` compiles `src/kernel.cpp` alone (measured). Gating a measurement instrument behind
   * "re-seed the goldens" would re-create the false positive on day one.
   */
  it('⚠⚠ does NOT fire on the build directory’s docs, scripts, or the separate probe binary', () => {
    expect(geometry('tools/kernel-build/src/probe.cpp')).toBe(false);
    expect(geometry('tools/kernel-build/probe.sh')).toBe(false);
    expect(geometry('tools/kernel-build/probe-history.mjs')).toBe(false);
    expect(geometry('tools/kernel-build/verify.mjs')).toBe(false);
    expect(geometry('tools/kernel-build/README.md')).toBe(false);
  });
});

/* ================================================================================================
 * ⚠⚠ THE VALUE CHECK (Q16) — because everything above is satisfied by a CLOCK.
 *
 * The path matcher answers *"was a golden touched?"* and `seed-goldens` stamps a fresh `seededAt` on
 * every run, so a ONE-LINE TIMESTAMP DIFF satisfied the whole gate. Entry 77 and Entry 79 both shipped
 * exactly that, and in both cases the only thing that made compliance safe was an agent reading the
 * diff by hand. A gate that cannot distinguish *"re-seeded, values unchanged"* from *"re-seeded,
 * values MOVED, nobody looked"* certifies the second while looking like it checked.
 * ============================================================================================= */

// @ts-expect-error — plain .mjs helper, deliberately untyped; it is CI plumbing, not shipped code.
import { confirmationIn, goldenValuesMoved, payloadHash } from '../scripts/reseed-payload.mjs';

const hashOf = payloadHash as (text: string) => string | null;
const movedIn = goldenValuesMoved as (
  before: Record<string, string | null>,
  after: Record<string, string | null>,
) => string[];
const confirmed = confirmationIn as (messages: readonly string[]) => string | null;

const goldenJson = (seededAt: string, volume: number): string =>
  JSON.stringify({
    $schema: 'bunyan.goldens.v1',
    seededAt,
    env: { ocpVersion: '7.9.3.1.1' },
    cases: [{ case: 'box-wall', volume }],
  });

const GOLDENS = 'tests/goldens/geometry.golden.json';

describe('the re-seed gate compares VALUES, not the clock (Q16)', () => {
  it('⚠⚠ a bumped `seededAt` alone is NOT a re-seed — the payload hash is identical', () => {
    // The exact diff Entry 79 shipped: one timestamp line, every geometry value byte-identical.
    expect(hashOf(goldenJson('2026-08-05T15:38:36Z', 1500))).toBe(
      hashOf(goldenJson('2026-08-06T09:00:00Z', 1500)),
    );
    expect(
      movedIn({ [GOLDENS]: goldenJson('a', 1500) }, { [GOLDENS]: goldenJson('b', 1500) }),
    ).toEqual([]);
  });

  it('…and a moved VALUE is caught, whatever the timestamp does', () => {
    // ⚠ Weak-green guard: if `payloadHash` stripped too much — the whole `cases` array, say — this
    // pair would also come back equal, and the test above would still pass. Both directions are
    // asserted, so a hash that ignores everything fails here and a hash that ignores nothing fails
    // above. Neither alone is enough.
    expect(hashOf(goldenJson('a', 1500))).not.toBe(hashOf(goldenJson('a', 1501)));
    expect(
      movedIn({ [GOLDENS]: goldenJson('a', 1500) }, { [GOLDENS]: goldenJson('a', 1501) }),
    ).toEqual([GOLDENS]);
  });

  it('key order is not a change — a re-serialisation that reorders keys says nothing', () => {
    const a = '{"seededAt":"x","cases":[{"case":"w","volume":1}],"env":{"ocpVersion":"7.9"}}';
    const b = '{"env":{"ocpVersion":"7.9"},"cases":[{"volume":1,"case":"w"}],"seededAt":"y"}';
    expect(hashOf(a)).toBe(hashOf(b));
  });

  it('⚠ ARRAY ORDER *IS* a change — the cases are an ordered list, not a set', () => {
    const one = '{"cases":[{"case":"a"},{"case":"b"}]}';
    const two = '{"cases":[{"case":"b"},{"case":"a"}]}';
    expect(hashOf(one)).not.toBe(hashOf(two));
  });

  it('a golden that is new, deleted or unparseable counts as MOVED — never as unchanged', () => {
    // ⚠ The silence-as-answer trap (§1c-9): a gate that reads "I could not parse it" as "nothing
    // changed" certifies the one file it failed to read. Refusing is the only honest answer.
    expect(movedIn({}, { [GOLDENS]: goldenJson('a', 1500) })).toEqual([GOLDENS]);
    expect(movedIn({ [GOLDENS]: goldenJson('a', 1500) }, {})).toEqual([GOLDENS]);
    expect(movedIn({ [GOLDENS]: 'not json' }, { [GOLDENS]: goldenJson('a', 1500) })).toEqual([
      GOLDENS,
    ]);
    expect(hashOf('not json')).toBeNull();
  });

  it('the way out is a commit trailer WITH A REASON, and a bare marker is not one', () => {
    expect(confirmed(['Entry 82: something\n\nRe-seed-unchanged: relinked byte-for-byte'])).toBe(
      'relinked byte-for-byte',
    );
    // Any commit in the range may carry it, not only the tip.
    expect(confirmed(['a merge commit', 'Re-seed-unchanged: no op changed'])).toBe('no op changed');
    // ⚠ A marker with nothing after it is exactly the box-ticking this gate exists to stop.
    expect(confirmed(['Re-seed-unchanged:'])).toBeNull();
    expect(confirmed(['Re-seed-unchanged:   '])).toBeNull();
    expect(confirmed(['nothing to see here'])).toBeNull();
  });

  it('is the check `check-reseed.mjs` actually runs, not one this test calls in private', () => {
    // ⚠ Without this the suite passes while the gate keeps its old `touchedGoldens.length === 0` test
    // as its only value check — a green test asserting something weaker than its own name.
    const gate = readFileSync(new URL('../scripts/check-reseed.mjs', import.meta.url), 'utf8');
    expect(gate, '`check-reseed.mjs` no longer calls goldenValuesMoved').toMatch(
      /goldenValuesMoved\(/,
    );
    expect(gate, 'the gate no longer honours the author confirmation').toMatch(/confirmationIn\(/);
    expect(gate, 'the gate no longer fails on an unmoved payload').toMatch(/NOT ONE VALUE MOVED/);
  });
});
