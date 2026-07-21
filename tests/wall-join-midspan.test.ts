/**
 * MID-SPAN / T-JUNCTION WALL JOINS — the cheap pre-freeze check (`review_P5.md` #4) — real OCCT, headless.
 *
 * ⚠ THE QUESTION THE FREEZE MUST ANSWER: today both the auto-join and the `core.setJoin` override handle
 * ONLY end-to-end corners (`wallsShareCorner` → endpoint-to-endpoint). A partition wall whose END meets
 * another wall's MID-SPAN — the commonest interior condition — gets no join, and `setJoin` refuses it. Is
 * the FROZEN `JoinConstraint` shape able to carry a mid-span join added later, or is a field pre-freeze?
 *
 * ⚠⚠ THE ANSWER, MODELLED HERE AND RECORDED: it is PURELY ADDITIVE — no new frozen field.
 *   - A mid-span T is decided from the `{start,end}` PARAMS, exactly like a corner is (`endpointsOf` vs the
 *     other's SEGMENT instead of its endpoints) — so auto-detection relaxes a precondition, it adds no state.
 *   - The override record `{element, other, resolution:'butt'}` ALREADY identifies the junction uniquely:
 *     two STRAIGHT baselines meet at AT MOST ONE point, so `{element, other}` is an unambiguous key, and
 *     WHERE `element` lands on `other` is DERIVED from the baselines (recipe-is-truth, D1-safe) — exactly
 *     as the mitre bisector is derived today. Nothing to store. `resolution: 'butt'` is already the right
 *     verb (`element` butts into `other`, which runs through). The reserved `priority?` shows the shape's
 *     growth path if per-layer mid-span priority is ever wanted (v1.0.x, additive).
 *
 * So this test LOCKS IN the current limit (a mid-span does not auto-join; `setJoin` refuses) so that a
 * future mid-span implementation is a deliberate, tested change — and records the freeze-safety proof.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { KernelHost } from '@bunyan/kernel-core';
import { InProcessTransport, KernelClient } from '@bunyan/kernel-client';
import { createOcctKernel } from '@bunyan/kernel-occt';
import type { OcctKernel } from '@bunyan/kernel-occt';
import { CORE_COMMANDS, DocumentContext, createRegistries } from '@bunyan/document';
import { wallType } from '@bunyan/types';

const T = 200;
const H = 2400;

describe('mid-span / T-junction joins — the pre-freeze additivity check (review_P5 #4)', () => {
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

  const newDoc = (): DocumentContext => {
    const registries = createRegistries();
    registries.types.register(wallType);
    for (const command of CORE_COMMANDS) registries.commands.register(command);
    return new DocumentContext({ registries, geometry: client });
  };

  const wall = async (
    doc: DocumentContext,
    start: readonly [number, number],
    end: readonly [number, number],
  ): Promise<string> =>
    (
      await doc.execute('core.createElement', {
        typeId: 'core.wall',
        params: { start, end, thickness: T, height: H },
      })
    ).changes[0]!.id;

  const bounds = async (doc: DocumentContext, id: string) => {
    const p = doc.partsOf(id)!.find((q) => q.name === 'wall')!;
    return (await client.request('bounds', { handle: p.handle })).bounds;
  };

  it('⚠ a partition meeting a wall MID-SPAN does not auto-join — both stay plain (the limit, recorded)', async () => {
    const doc = newDoc();
    const through = await wall(doc, [0, 0], [4000, 0]); // B — the through wall
    const partition = await wall(doc, [2000, 0], [2000, 2000]); // A — its end lands on B's mid-span

    expect(doc.brokenRefs()).toHaveLength(0);

    // The partition's start-cap is a PLAIN perpendicular at y = 0 (its baseline start). A mid-span join
    // would have butted it onto B's face (y = +T/2) — it does not, so its min-y sits at the baseline.
    expect((await bounds(doc, partition)).min[1]).toBeCloseTo(0, 6);
    // The through wall is untouched — nothing auto-joins to a point in its middle; its cap stays at x = 0.
    expect((await bounds(doc, through)).min[0]).toBeCloseTo(0, 6);
  });

  it('⚠ `core.setJoin` REFUSES a mid-span pair — they do not share a corner (the frozen verb is unchanged)', async () => {
    const doc = newDoc();
    const through = await wall(doc, [0, 0], [4000, 0]);
    const partition = await wall(doc, [2000, 0], [2000, 2000]);

    // The override verb gates on `wallsShareCorner` (endpoint-to-endpoint). A mid-span T has no shared
    // endpoint, so this refuses today. When mid-span lands (v1.0.x) this precondition relaxes to
    // "an endpoint lies on the other's segment" — the SAME `{element, other, resolution}` record, no new
    // frozen field. The refusal is the recorded current limit, not a contract gap.
    await expect(
      doc.execute('core.setJoin', { element: partition, other: through, resolution: 'butt' }),
    ).rejects.toThrow(/do not meet at a corner/);
  });
});
