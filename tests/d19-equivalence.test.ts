// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE D19 EQUIVALENCE TEST — the P4 exit criterion, and the enforcement mechanism for the whole
 * agent-native decision.
 *
 * ⚠⚠ THE RULE (spec §4.6, plan P4 exit): **anything a human can do in the shell, an agent can do through
 * `window.bunyan` — and it produces the SAME resulting document state and the SAME `UndoableEdit`.** The
 * human path in the app is `App.dispatch(cmd, args)` → `doc.execute(cmd, args, {})`; the agent path is
 * `window.bunyan.execute(cmd, args)` → `createAgentSurface(doc).execute(cmd, args)`. This drives the SAME
 * scripted end-to-end edit down both, on the REAL OCCT kernel, and asserts they land in the same place.
 *
 * ⚠ WHY IT EXISTS NOW. The two surfaces have already diverged twice in ways only agent-driving caught —
 * the StrictMode `window.bunyan` bug (Entry 23) and the UI-refresh gap (Entry 26). Both were found by
 * hand; nothing would have caught the next. Written now — twelve commands, one type — it is a check; after
 * P5 it would be an audit of a year of drift.
 *
 * ⚠ ULIDs (D44) make element ids random per run, so the two documents cannot be compared byte-for-byte.
 * `normalize` canonicalises each run's minted ids to stable placeholders (order of minting), which is the
 * honest comparison: identity is *derived*, and what must match is everything EXCEPT the random suffix.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import {
  CORE_COMMANDS,
  DocumentContext,
  createAgentSurface,
  createRegistries,
} from '@bunyan/document';
import type { DocumentContext as Doc, Params, UndoableEdit } from '@bunyan/document';
import { FIXTURE_TYPES } from './fixtures/bim-types.js';

/** One executor — the ONLY difference between the two runs is which surface this reaches the doc through. */
type Execute = (command: string, args: Params) => Promise<UndoableEdit>;

describe('D19 — the human shell and the agent surface are interchangeable', () => {
  let kernel: OcctKernel;
  let client: KernelClient;

  beforeAll(async () => {
    kernel = await createOcctKernel();
    client = new KernelClient(new InProcessTransport(new KernelHost(kernel)));
  });
  afterAll(() => {
    client.dispose();
    kernel.dispose?.();
  });

  function freshDoc(): Doc {
    const registries = createRegistries();
    for (const type of FIXTURE_TYPES) registries.types.register(type);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    return new DocumentContext({ registries, geometry: client });
  }

  /**
   * The scripted end-to-end edit: a material, a style, a wall, then a parameter edit on that wall, and an
   * undo. It exercises create + edit + undo — the spine of the app. Returns every edit it produced and the
   * final scene, so both can be compared across the two surfaces.
   */
  async function runScript(
    execute: Execute,
    doc: Doc,
  ): Promise<{
    edits: UndoableEdit[];
    finalScene: unknown;
  }> {
    const edits: UndoableEdit[] = [];
    edits.push(
      await execute('core.createMaterial', {
        id: 'concrete',
        name: 'Concrete',
        category: 'concrete',
        density: 2400,
      }),
    );
    edits.push(
      await execute('core.createStyle', {
        id: 'INT-100',
        name: 'INT-100',
        typeId: 'core.wall.v1',
        layers: [
          { name: 'structure', materialId: 'concrete', thickness: 100, discipline: 'structural' },
        ],
      }),
    );
    const created = await execute('core.createElement', {
      typeId: 'core.wall.v1',
      styleId: 'INT-100',
      params: { length: 3000, height: 2400 },
    });
    edits.push(created);
    const wallId = created.changes[0]!.id;
    edits.push(await execute('core.setParams', { elementId: wallId, params: { length: 4200 } }));
    const undone = await doc.undo();
    if (undone !== undefined) edits.push(undone);

    return { edits, finalScene: doc.scene };
  }

  /**
   * Replace each run's minted ids (in mint order) with stable placeholders — everywhere they appear — and
   * canonicalise the wall-clock `at` timestamp each edit carries. Neither the random ULID nor the moment
   * the edit happened is part of "the same edit"; everything else is.
   */
  function normalize(value: unknown, mintedIds: readonly string[]): unknown {
    let json = JSON.stringify(value);
    mintedIds.forEach((id, i) => {
      json = json.split(id).join(`«ID${i}»`);
    });
    json = json.replace(/"at":"[^"]*"/g, '"at":"«TS»"');
    return JSON.parse(json) as unknown;
  }

  /** The only random id our script mints is the wall's — pulled from the createElement edit. */
  function mintedIdsOf(edits: readonly UndoableEdit[]): string[] {
    const create = edits.find((e) => e.command === 'core.createElement');
    return create === undefined ? [] : [create.changes[0]!.id];
  }

  it('⚠⚠ THE SAME EDIT, BOTH WAYS → the same UndoableEdits and the same final scene (id-normalised)', async () => {
    // HUMAN PATH: exactly what App.dispatch does — doc.execute directly.
    const humanDoc = freshDoc();
    const human = await runScript((c, a) => humanDoc.execute(c, a, {}), humanDoc);

    // AGENT PATH: exactly what window.bunyan does — through createAgentSurface.
    const agentDoc = freshDoc();
    const bunyan = createAgentSurface(agentDoc);
    const agent = await runScript((c, a) => bunyan.execute(c, a), agentDoc);

    const humanIds = mintedIdsOf(human.edits);
    const agentIds = mintedIdsOf(agent.edits);
    expect(humanIds).toHaveLength(1);
    expect(agentIds).toHaveLength(1);

    // Same sequence of edits (same commands, same changes), modulo the random ULID.
    expect(normalize(human.edits, humanIds)).toEqual(normalize(agent.edits, agentIds));

    // Same resulting parametric truth — the scene.json the recipe is.
    expect(normalize(human.finalScene, humanIds)).toEqual(normalize(agent.finalScene, agentIds));
  });

  it('the agent surface exposes every core command the human shell can dispatch (no back-door verbs)', () => {
    const doc = freshDoc();
    const bunyan = createAgentSurface(doc);
    const agentCommandIds = new Set(bunyan.listCommands().map((c) => c.name));
    // Every registered command is reachable through the agent surface — the ribbon has no private verbs.
    for (const command of CORE_COMMANDS) {
      expect(agentCommandIds.has(command.id)).toBe(true);
    }
  });
});
