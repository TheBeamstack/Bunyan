// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * `loadBnn` as it stood before D29 R2 (`main` at 600baab, `packages/document/src/bnn.ts`), frozen here
 * so a test can open a cache-carrying `.bnn` in "a build that ignores it" (design §3). Its comments are
 * stripped; its behaviour is verbatim. Never edit it to match the live loader.
 */

import { unzipSync } from 'fflate';
import { SCENE_SCHEMA_VERSION, emptyScene } from '@bunyan/document';
import type { BnnPackage, Manifest, Scene, UndoableEdit } from '@bunyan/document';

const decoder = new TextDecoder();

export function loadBnnPreR2(bytes: Uint8Array): BnnPackage {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch (error) {
    throw new Error(`not a readable .bnn package: ${error instanceof Error ? error.message : ''}`);
  }

  const manifestBytes = files['manifest.json'];
  const sceneBytes = files['scene.json'];
  if (manifestBytes === undefined) throw new Error('.bnn is missing manifest.json');
  if (sceneBytes === undefined) throw new Error('.bnn is missing scene.json');

  const manifest = JSON.parse(decoder.decode(manifestBytes)) as Manifest;
  const parsed = JSON.parse(decoder.decode(sceneBytes)) as Partial<Scene>;

  const schemaVersion = parsed.schemaVersion ?? SCENE_SCHEMA_VERSION;
  if (typeof schemaVersion !== 'number' || schemaVersion > SCENE_SCHEMA_VERSION) {
    throw new Error(
      `.bnn scene.json is schema version ${String(schemaVersion)}; this app understands ` +
        `up to ${String(SCENE_SCHEMA_VERSION)}. Refusing to open it rather than misread it.`,
    );
  }

  const scene: Scene = { ...emptyScene(), ...parsed, schemaVersion };

  for (const key of [
    'elements',
    'styles',
    'materials',
    'sections',
    'containers',
    'grids',
    'constraints',
    'roomSeparators',
  ] as const) {
    if (!isPlainObject(scene[key])) {
      throw new Error(`.bnn scene.json: "${key}" must be an object, and it is not`);
    }
  }
  for (const key of ['schedules', 'views', 'designOptions'] as const) {
    if (parsed[key] !== undefined && !isPlainObject(parsed[key])) {
      throw new Error(`.bnn scene.json: "${key}" must be an object, and it is not`);
    }
  }
  if (!Array.isArray(scene.brokenRefs)) {
    throw new Error('.bnn scene.json: "brokenRefs" must be an array, and it is not');
  }

  const journalBytes = files['history.json'];
  const thumbnail = files['thumbnail.png'];
  const journal =
    journalBytes === undefined
      ? undefined
      : (JSON.parse(decoder.decode(journalBytes)) as UndoableEdit[]);
  if (journal !== undefined && !Array.isArray(journal)) {
    throw new Error('.bnn history.json: the journal must be an array, and it is not');
  }

  return {
    manifest,
    scene,
    ...(journal === undefined ? {} : { journal }),
    ...(thumbnail === undefined ? {} : { thumbnail }),
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
