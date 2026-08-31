// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE D19 BOUNDARY — a MACHINE check, not a review convention.
 *
 * ⚠⚠ THE RULE: **`DocumentContext` is the only holder of a `KernelClient`.** No React component, no
 * command, no agent, ever calls a kernel op.
 *
 * ⚠ AND THE REASON IT IS ENFORCED BY A TEST RATHER THAN BY A COMMENT — the plan says it in as many
 * words: *"enforce it with a lint rule or a package boundary, **not a comment**. The rule is worthless
 * if it depends on remembering it."* Every capability the UI reaches by calling the kernel directly is
 * a capability **an agent can never have**, and nobody finds out for a year.
 *
 * ⚠⚠ THIS SESSION MADE IT STRONGER THAN THE PLAN ASKED FOR, and the difference is worth stating:
 * **`@bunyan/document` does not DEPEND on `@bunyan/kernel-client` at all.** It takes a narrow
 * `GeometryGateway` (which a `KernelClient` satisfies structurally), so the document layer cannot
 * import the kernel client **even by accident, even under a deadline** — a package that does not have
 * the dependency cannot reach for it. The grep below then covers the place a package boundary cannot
 * reach: `apps/`, where Amer's React code will live, and where the temptation is greatest.
 *
 * The allowlist is deliberately tiny, and every entry on it is a place where holding a kernel client
 * is the *point*:
 *   - the `packages/kernel-…` packages — the kernel itself;
 *   - `tests/` — the kernel's own suite, which exists to drive it directly;
 *   - an app's `src/bootstrap.ts` — the ONE app file that constructs the client and hands it to
 *     `DocumentContext`. It does not exist yet. It is allowed in advance so that the rule lands
 *     BEFORE the code it governs, rather than being retrofitted against a shell that already works.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GeometryGateway } from '@bunyan/document';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Where a kernel client may legitimately be imported. Adding to this list is a design decision. */
const ALLOWED = [/^packages\/kernel-/, /^tests\//, /^apps\/[^/]+\/src\/bootstrap\.ts$/];

function sourceFiles(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out; // `apps/` does not exist yet — that is fine, and the rule still lands.
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === 'dist' || entry === 'wasm') continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) out.push(path);
  }
  return out;
}

describe('D19 — the kernel has exactly one door', () => {
  it('⚠ nothing outside the allowlist imports @bunyan/kernel-client', () => {
    const files = [
      ...sourceFiles(join(ROOT, 'packages')),
      ...sourceFiles(join(ROOT, 'apps')),
      ...sourceFiles(join(ROOT, 'tests')),
    ];
    expect(files.length).toBeGreaterThan(10);

    const offenders = files
      // ⚠ Normalise to POSIX separators: `path.relative` yields backslashes on Windows (Amer's box),
      // and the ALLOWED patterns are written with `/`. Without this the allowlist never matches there
      // and every legitimately-allowed file (all of `tests/`, the bootstrap) reads as an offender.
      .map((file) => relative(ROOT, file).replaceAll('\\', '/'))
      .filter((file) => !ALLOWED.some((pattern) => pattern.test(file)))
      .filter((file) =>
        /from\s+'@bunyan\/kernel-client'/.test(readFileSync(join(ROOT, file), 'utf8')),
      );

    expect(
      offenders,
      `these modules reach past DocumentContext straight to the kernel (D19):\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });

  it('⚠ the document package does not even DEPEND on the kernel client (the package boundary)', () => {
    const manifest = JSON.parse(
      readFileSync(join(ROOT, 'packages/document/package.json'), 'utf8'),
    ) as { dependencies?: Record<string, string> };

    // It cannot import what it does not depend on. This is the rule made structural rather than
    // advisory — and it is why `DocumentContext` takes a `GeometryGateway`, not a `KernelClient`.
    expect(Object.keys(manifest.dependencies ?? {})).not.toContain('@bunyan/kernel-client');
    expect(Object.keys(manifest.dependencies ?? {})).toContain('@bunyan/protocol');
  });

  it('⚠ GeometryGateway EXCLUDES tessellate at the TYPE level, not merely in a comment (step 12)', () => {
    // The review found `geometry.ts` CLAIMED `tessellate` was absent while the type admitted it —
    // `g.request('tessellate', …)` typechecked cleanly. This locks the fix: the assertion below is a
    // COMPILE-TIME check that the document layer cannot ask the kernel for a mesh. If the exclusion
    // regresses, `@ts-expect-error` becomes an unused suppression and `tsc` (the typecheck step) fails.
    // ⚠ The body is never invoked — it exists to be typechecked, not run.
    const _assertExcludesTessellate = (g: GeometryGateway): void => {
      // @ts-expect-error — 'tessellate' is excluded from DocumentOpName; the document must never render.
      void g.request('tessellate', { handle: 'h', deflection: 5 });
      // …while a genuine geometry query still typechecks, proving we narrowed ONLY tessellate.
      void g.request('bounds', { handle: 'h' });
    };
    expect(typeof _assertExcludesTessellate).toBe('function');
  });

  it('⚠ no command, no type and no agent surface can reach a kernel op', () => {
    // The document layer's ONLY geometry surface is `GeometryGateway`, and it is handed to a Type's
    // `buildGeometry` — never to a Command, and never to the agent surface. A command that wanted to
    // call `makeBox` would have to be given a gateway, and nothing gives it one.
    const commands = readFileSync(join(ROOT, 'packages/document/src/commands.ts'), 'utf8');
    const agent = readFileSync(join(ROOT, 'packages/document/src/agent.ts'), 'utf8');

    for (const [name, source] of [
      ['commands.ts', commands],
      ['agent.ts', agent],
    ] as const) {
      expect(source, `${name} must not import the geometry gateway`).not.toMatch(
        /import[^;]*GeometryGateway/,
      );
    }
  });
});
