// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import { CODE_ID_PLACEHOLDER } from './src/codeId.js';

const CODE_ID_MODULE = fileURLToPath(new URL('./src/codeId.ts', import.meta.url));

export interface BundleFile {
  readonly fileName: string;
  readonly bytes: string | Uint8Array;
}

/** sha256 over every file by name, length-prefixed so no two bundles concatenate alike. */
export function bundleCodeId(files: readonly BundleFile[]): string {
  const hash = createHash('sha256');
  for (const file of [...files].sort((a, b) => (a.fileName < b.fileName ? -1 : 1))) {
    const bytes = typeof file.bytes === 'string' ? Buffer.from(file.bytes, 'utf8') : file.bytes;
    hash.update(`${file.fileName}\0${bytes.length}\0`);
    hash.update(bytes);
  }
  return hash.digest('hex');
}

/**
 * D29 R6 — stamps `CODE_ID` with the digest of the whole bundle (worker chunks and the kernel `.wasm`
 * arrive as assets), taken with the placeholder still in place. Same-length replacement leaves source
 * maps valid. A build that bundles `src/codeId.ts` but lost its placeholder fails rather than ship it.
 */
export function codeIdPlugin(): Plugin {
  return {
    name: 'bunyan:code-id',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const outputs = Object.values(bundle);
      const codeId = bundleCodeId(
        outputs.map((o) => ({
          fileName: o.fileName,
          bytes: o.type === 'chunk' ? o.code : o.source,
        })),
      );
      let stamped = 0;
      for (const o of outputs) {
        if (o.type === 'chunk' && o.code.includes(CODE_ID_PLACEHOLDER)) {
          o.code = o.code.replaceAll(CODE_ID_PLACEHOLDER, codeId);
          stamped += 1;
        }
      }
      const bundled = [...this.getModuleIds()].some((id) => id.split('?')[0] === CODE_ID_MODULE);
      if (bundled && stamped === 0)
        this.error(`src/codeId.ts is bundled but its placeholder is not`);
    },
  };
}
