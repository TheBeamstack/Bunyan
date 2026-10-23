// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * D29 R6 — the envelope's `codeId` is the shipped bundle's digest (`D-20261012-06`: `bundle`;
 * `docs/design/P5_step9_D29_bnn_cache_design.md` §2d).
 *
 * `vite build` writes it into each HTML entry's `<meta name="bunyan-code-id">` (`../codeIdPlugin.ts`),
 * never into a chunk: a chunk's name is a hash taken before the stamp, so a stamped chunk could serve a
 * stale id under an unchanged URL. The HTML is unhashed and names the hashed files it loads, so a stale
 * copy only ever pairs an old id with that same old code.
 */
export const CODE_ID_META = 'bunyan-code-id';

/** What the build replaces in the HTML. Not hex, so an unstamped page cannot pass for a digest. */
export const CODE_ID_PLACEHOLDER =
  'bunyan-code-id:unstamped:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

/**
 * A stamped digest as is; anything else (dev server, tests, a worker with no `document`) is its own
 * code identity per load, so no cache outlives it.
 */
export function codeIdFrom(stamp: string | null | undefined): string {
  return stamp !== null && stamp !== undefined && /^[0-9a-f]{64}$/.test(stamp)
    ? stamp
    : `unstamped:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
}

/** The running build's `codeId`. */
export const CODE_ID: string = codeIdFrom(
  globalThis.document?.querySelector<HTMLMetaElement>(`meta[name="${CODE_ID_META}"]`)?.content,
);
