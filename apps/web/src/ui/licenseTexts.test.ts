// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * T-003 — headless proof that `licenseTexts.ts` embeds `NOTICE` and every `licenses/*.txt` VERBATIM,
 * not a paraphrase or a stale copy. The screen itself is browser-verified (console-error-free boot); this
 * is the logic half of the verification split (`Amer_Prompt.md`) — it needs no DOM.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { NOTICE_TEXT, LICENSE_TEXTS } from './licenseTexts';

const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));

describe('licenseTexts embeds NOTICE and licenses/ verbatim', () => {
  it('NOTICE_TEXT is byte-identical to the repo-root NOTICE file', () => {
    expect(NOTICE_TEXT).toBe(readFileSync(join(ROOT, 'NOTICE'), 'utf8'));
  });

  it('embeds exactly the files under licenses/ — none missing, none stale, none extra', () => {
    const onDisk = readdirSync(join(ROOT, 'licenses')).sort((a, b) => a.localeCompare(b));
    expect(LICENSE_TEXTS.map((l) => l.fileName)).toEqual(onDisk);
    for (const license of LICENSE_TEXTS) {
      expect(license.text).toBe(readFileSync(join(ROOT, 'licenses', license.fileName), 'utf8'));
    }
  });

  it('is non-trivial — a broken glob returning nothing would pass the checks above vacuously', () => {
    expect(LICENSE_TEXTS.length).toBeGreaterThan(0);
    expect(NOTICE_TEXT.length).toBeGreaterThan(0);
  });
});
