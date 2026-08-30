// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * THE AGENT SURFACE — P3's agent exit criteria, discharged (D19–D23, spec §4.6).
 *
 * ⚠⚠ THE RULE THIS FILE ENFORCES, AND IT IS THE WHOLE OF D19:
 *
 *     A TEST ACTING *ONLY* THROUGH THE AGENT SURFACE CAN BUILD, INSPECT AND EDIT A BUILDING.
 *     NO TEST-ONLY BACK DOOR.
 *
 * And the reason it is written as a *constraint on the test* rather than as a feature: **if a test
 * needs a private path, so will the UI** — and every capability the UI reaches by going around the
 * command layer is a capability an agent can never have. Nobody discovers that gap until an agent is
 * asked to use it, a year later.
 *
 * So below, `bunyan` is the only object in scope. There is no `doc.` anywhere after the surface is
 * created — that is not a stylistic choice, it is the assertion.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import {
  AGENT_API_VERSION,
  CORE_COMMANDS,
  CommandFailure,
  DocumentContext,
  createAgentSurface,
  createRegistries,
} from '@bunyan/document';
import type { AgentSurface } from '@bunyan/document';
import { FIXTURE_TYPES } from './fixtures/bim-types.js';

describe('the agent surface — the command layer IS the API', () => {
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

  /** `window.bunyan = createAgentSurface(doc)` is Amer's one line. This is that line. */
  const surface = (): AgentSurface => {
    const registries = createRegistries();
    for (const type of FIXTURE_TYPES) registries.types.register(type);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    return createAgentSurface(new DocumentContext({ registries, geometry: client }));
  };

  it('⚠⚠ AN AGENT BUILDS A BUILDING THROUGH THE SURFACE ALONE — no back door', async () => {
    const bunyan = surface();

    // ---- EXPLORE. The agent needs no documentation: it ASKS THE APP (D21). ----------------------
    expect(bunyan.agentApi).toBe(AGENT_API_VERSION);

    const commands = bunyan.listCommands();
    const create = commands.find((c) => c.name === 'core.createElement')!;
    // Its arguments are DERIVED from the registry — the same schema the property panel renders.
    expect(Object.keys(create.argsSchema as object)).toContain('typeId');
    expect(create.returns).toBe('UndoableEdit');

    const types = bunyan.listTypes();
    expect(types.map((t) => t.id)).toContain('core.wall.v1');
    // ⚠ It learns from the registry that an Opening is HOSTED — so it knows it needs a host and a
    // face, without anyone having written that down in a doc that would go stale.
    expect(types.find((t) => t.id === 'core.opening.v1')!.hosted).toBe(true);

    // ---- ACT. Type-driven verbs (D20): it says "wall", not "draw a rectangle and extrude it". ---
    await bunyan.execute('core.createMaterial', {
      id: 'concrete',
      name: 'C25/30',
      category: 'concrete',
      density: 2400,
      structural: { f_ck: 25 },
    });
    await bunyan.execute('core.createStyle', {
      id: 'INT-100',
      name: 'INT-100',
      typeId: 'core.wall.v1',
      layers: [
        { name: 'structure', materialId: 'concrete', thickness: 100, discipline: 'structural' },
      ],
    });
    const created = await bunyan.execute('core.createElement', {
      typeId: 'core.wall.v1',
      styleId: 'INT-100',
      params: { length: 3000, height: 2400 },
    });

    // ---- VERIFY. The returned UndoableEdit IS the verification (D23) — the same object undo uses. -
    expect(created.command).toBe('core.createElement');
    expect(created.changes).toHaveLength(1);
    const wallId = created.changes[0]!.id;

    // ---- QUERY. Semantics, never triangles. --------------------------------------------------
    const walls = bunyan.query({ typeId: 'core.wall.v1' });
    expect(walls).toHaveLength(1);
    expect(walls[0]!.id).toBe(wallId);
    expect(walls[0]!.parts.map((p) => p.materialId)).toEqual(['concrete']);
    // ⚠ Nothing in that answer is a Float32Array. An agent handed triangles has been handed a picture
    // and asked to think.
    expect(JSON.stringify(walls[0])).not.toContain('positions');

    // ---- MEASURE. Exact, per part, per material (domain rule 15). -----------------------------
    const quantities = await bunyan.quantities(wallId);
    expect(quantities.basis).toBe('exact');
    expect(quantities.parts[0]!.volume).toBeCloseTo(3000 * 100 * 2400, 3);
    expect(quantities.parts[0]!.mass).toBeCloseTo((3000 * 100 * 2400 * 2400) / 1e9, 6);

    // ---- AND UNDO IT, through the same door. --------------------------------------------------
    await bunyan.undo();
    expect(bunyan.query({ typeId: 'core.wall.v1' })).toHaveLength(0);
    await bunyan.redo();
    expect(bunyan.query({ typeId: 'core.wall.v1' })).toHaveLength(1);
  });

  it('a failed command returns a TYPED failure and NO edit; the document is at last-good', async () => {
    const bunyan = surface();
    await expect(
      bunyan.execute('core.createElement', { typeId: 'nope', params: {} }),
    ).rejects.toBeInstanceOf(CommandFailure);
    // Nothing was created, and nothing is on the undo stack to un-create.
    expect(bunyan.query()).toHaveLength(0);
    expect(await bunyan.undo()).toBeUndefined();
  });

  it('an agent LOOKS BEFORE IT LEAPS: a DRY RUN reports the cascade before it acts (D39, D42)', async () => {
    const bunyan = surface();
    await bunyan.execute('core.createMaterial', {
      id: 'block',
      name: 'Block',
      category: 'masonry',
      density: 2000,
    });
    await bunyan.execute('core.createStyle', {
      id: 'W',
      name: 'W',
      typeId: 'core.wall.v1',
      layers: [
        { name: 'structure', materialId: 'block', thickness: 200, discipline: 'structural' },
      ],
    });
    const wall = await bunyan.execute('core.createElement', {
      typeId: 'core.wall.v1',
      styleId: 'W',
      params: { length: 4000, height: 2600 },
    });
    const wallId = wall.changes[0]!.id;

    const face = `${wallId}.structure/face/y-min#0`;
    await bunyan.execute('core.createElement', {
      typeId: 'core.opening.v1',
      hostId: wallId,
      hostRef: face,
      params: { width: 1000, height: 1200, offsetU: 500, offsetV: 900 },
    });

    // ⚠ The agent asks what a delete would cost BEFORE issuing it — the same list a UI would use to
    // say "1 element will also be deleted". This is what makes the cascade safe rather than surprising.
    //
    // ⚠⚠ AND IT ASKS BY RUNNING THE VERB ITSELF, DRY (D42) — `planDelete()` is DELETED. A hand-written
    // `plan…()` beside every command is a second description of one behaviour, and a second description
    // drifts (D21: generated, never maintained). The dry run's would-be edit lists the whole cascade
    // because the REAL command computed it, against the REAL kernel, and then threw the result away.
    const planned = await bunyan.dryRun('core.deleteElement', { elementId: wallId });
    expect(planned.changes).toHaveLength(2); // the wall AND its window
    expect(bunyan.query()).toHaveLength(2); // …and nothing was actually deleted

    const edit = await bunyan.execute('core.deleteElement', { elementId: wallId });
    expect(edit.changes).toHaveLength(2);
    expect(bunyan.query()).toHaveLength(0);
  });

  it('⚠ registering a command makes it an agent verb with ZERO other edits (D21)', () => {
    const registries = createRegistries();
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    const doc = new DocumentContext({ registries, geometry: client });
    const bunyan = createAgentSurface(doc);

    const before = bunyan.listCommands().length;
    registries.commands.register({
      id: 'test.newVerb',
      label: 'A brand new verb',
      description: 'Registered at runtime; documented by nobody.',
      argsSchema: { note: { kind: 'string', label: 'Note' } },
      execute: (ctx) => ctx.edit('new verb', [], []),
    });

    // No edit to the agent surface. No edit to a doc. It is simply THERE, with its schema.
    const after = bunyan.listCommands();
    expect(after).toHaveLength(before + 1);
    expect(after.find((c) => c.name === 'test.newVerb')!.argsSchema).toEqual({
      note: { kind: 'string', label: 'Note' },
    });
  });
});
