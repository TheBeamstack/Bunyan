// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

import { measureFirstPaint } from './firstPaint';

declare global {
  interface Window {
    __firstPaintResults?: unknown;
  }
}

const out = document.getElementById('log')!;
const host = document.getElementById('host')!;
const log = (line: string): void => {
  out.textContent += `${line}\n`;
  console.log(line);
};

measureFirstPaint(host, log).then(
  (results) => {
    window.__firstPaintResults = results;
    log('done. Results on window.__firstPaintResults.');
  },
  (error: unknown) => {
    window.__firstPaintResults = { error: String(error) };
    log(`error: ${String(error)}`);
  },
);
