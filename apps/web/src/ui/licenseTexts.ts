// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-003 — the source `NOTICE` and `licenses/` texts, embedded verbatim into the bundle so the in-app
 * screen (`LicensesScreen`) never summarises them (D15: the OCCT exception's prominent-notice condition
 * is discharged by the FULL text, not a paraphrase).
 *
 * ⚠ ONE COPY, READ AT BUILD TIME, NEVER RE-TYPED. `NOTICE` and every `licenses/*.txt` already exist at
 * the repo root — `tests/notice-attribution.test.ts` is what keeps that set honest against the shipped
 * dependency closure. This file does not duplicate that content; it re-exports it via Vite's `?raw`
 * import and `import.meta.glob`, so a file added under `licenses/` appears here with zero edits, the same
 * "measure the artifact, not a hand list" shape that gate itself uses.
 */

import notice from '../../../../NOTICE?raw';

const licenseModules = import.meta.glob('../../../../licenses/*.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export interface LicenseText {
  readonly fileName: string;
  readonly text: string;
}

export const NOTICE_TEXT: string = notice;

/** Every `licenses/*.txt`, sorted by file name so the screen's order is stable and deterministic. */
export const LICENSE_TEXTS: readonly LicenseText[] = Object.entries(licenseModules)
  .map(([path, text]) => {
    if (typeof text !== 'string') {
      // `?raw` + `import: 'default'` always yields a string; a non-string here means the glob
      // options above stopped matching what Vite actually returns.
      throw new Error(`licenseTexts: expected raw text for ${path}, got ${typeof text}`);
    }
    return { fileName: path.split('/').pop()!, text };
  })
  .sort((a, b) => a.fileName.localeCompare(b.fileName));
