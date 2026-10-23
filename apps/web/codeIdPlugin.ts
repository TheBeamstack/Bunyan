// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

import { createHash } from 'node:crypto';
import type { Plugin } from 'vite';
import { CODE_ID_META, CODE_ID_PLACEHOLDER } from './src/codeId.js';

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
 * D29 R6 — stamps the digest of the whole bundle (worker chunks and the kernel `.wasm` arrive as
 * assets), taken with the placeholder still in place, into every HTML entry's meta tag. Only the
 * unhashed HTML changes after Rollup names the files: a hashed file's bytes are never touched.
 */
export function codeIdPlugin(): Plugin {
  return {
    name: 'bunyan:code-id',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { name: CODE_ID_META, content: CODE_ID_PLACEHOLDER },
          injectTo: 'head-prepend',
        },
      ];
    },
    generateBundle(_options, bundle) {
      const outputs = Object.values(bundle);
      const codeId = bundleCodeId(
        outputs.map((o) => ({
          fileName: o.fileName,
          bytes: o.type === 'chunk' ? o.code : o.source,
        })),
      );
      for (const o of outputs) {
        if (o.type !== 'asset' || !o.fileName.endsWith('.html')) continue;
        const html =
          typeof o.source === 'string' ? o.source : Buffer.from(o.source).toString('utf8');
        if (!html.includes(CODE_ID_PLACEHOLDER))
          this.error(`${o.fileName} carries no code-id meta`);
        o.source = html.replaceAll(CODE_ID_PLACEHOLDER, codeId);
      }
    },
  };
}
