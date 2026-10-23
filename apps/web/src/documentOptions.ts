// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * The boot path's `DocumentOptions`, factored out of `bootstrap.ts` so it runs under node with no Worker
 * (T-057). D29: with an install secret, the doc signs what it writes under this build's envelope and
 * restores a loaded file's `geometry-cache/` only if this install signed it (design §2e, §4).
 */

import type { DocumentOptions, GeometryGateway, Registries } from '@bunyan/document';

import type { InitialDocument } from './bootstrap';
import { cacheEnvelope } from './storage/cacheEnvelope';

export function documentOptions(
  registries: Registries,
  geometry: GeometryGateway,
  kernelBuildId: string,
  initial?: InitialDocument,
  installSecret?: Uint8Array,
): DocumentOptions {
  const loaded =
    initial === undefined
      ? {}
      : { scene: initial.scene, journal: initial.journal, revision: initial.revision };
  if (installSecret === undefined) return { registries, geometry, ...loaded };
  const current = cacheEnvelope(kernelBuildId);
  return {
    registries,
    geometry,
    ...loaded,
    geometryCacheEnvelope: current,
    geometryCacheSecret: installSecret,
    ...(initial?.cache === undefined
      ? {}
      : { geometryCache: { files: initial.cache, current, installSecret } }),
  };
}
