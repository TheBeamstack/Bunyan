// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * D29 R6 — the envelope's `codeId` is the shipped bundle's digest (`D-20261012-06`: `bundle`;
 * `docs/design/P5_step9_D29_bnn_cache_design.md` §2d).
 *
 * `vite build` overwrites this literal, in place and at its length, with the sha256 of every emitted
 * file (`../codeIdPlugin.ts`), so every deploy discards every cache. It must stay one literal: the
 * stamp finds it by its bytes.
 */
export const CODE_ID_PLACEHOLDER =
  'bunyan-code-id:unstamped:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

/**
 * The running build's `codeId`. Unstamped (dev server, tests) no code identity exists, so each load is
 * its own and no cache outlives it; a regex rather than `===` keeps a minifier from folding the test.
 */
export const CODE_ID: string = /^[0-9a-f]{64}$/.test(CODE_ID_PLACEHOLDER)
  ? CODE_ID_PLACEHOLDER
  : `unstamped:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
