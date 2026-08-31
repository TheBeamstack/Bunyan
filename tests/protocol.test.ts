// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import {
  PROTOCOL_VERSION,
  compareSubShapeRefs,
  decodeSubShapeRef,
  encodeSubShapeRef,
  isKernelRequest,
  isOpName,
  subShapeRefsEqual,
} from '@bunyan/protocol';
import type { SubShapeRef } from '@bunyan/protocol';

describe('SubShapeRef identity encoding', () => {
  const ref: SubShapeRef = { nodeId: 'wall-7', kind: 'face', role: 'lateral', occurrence: 2 };

  it('round-trips through its canonical token', () => {
    const token = encodeSubShapeRef(ref);
    expect(token).toBe('wall-7/face/lateral#2');
    const back = decodeSubShapeRef(token);
    expect(back).toBeDefined();
    expect(subShapeRefsEqual(back!, ref)).toBe(true);
  });

  it('rejects separators in nodeId/role rather than producing an ambiguous token', () => {
    expect(() => encodeSubShapeRef({ ...ref, nodeId: 'wall/7' })).toThrow();
    expect(() => encodeSubShapeRef({ ...ref, role: 'a#b' })).toThrow();
  });

  it('rejects a non-integer occurrence (identity must be discrete, never a float)', () => {
    expect(() => encodeSubShapeRef({ ...ref, occurrence: 1.5 })).toThrow();
    expect(() => encodeSubShapeRef({ ...ref, occurrence: -1 })).toThrow();
  });

  it('fails safe on malformed tokens — a hostile scene.json must not yield a valid ref', () => {
    for (const bad of [
      '',
      'garbage',
      'a/face/b',
      'a/face/b#x',
      'a/notakind/b#0',
      'a/face#0',
      '/face/r#0',
    ]) {
      expect(decodeSubShapeRef(bad), bad).toBeUndefined();
    }
  });

  it('orders refs deterministically and without locale sensitivity', () => {
    const refs: SubShapeRef[] = [
      { nodeId: 'b', kind: 'face', role: 'r', occurrence: 0 },
      { nodeId: 'a', kind: 'vertex', role: 'r', occurrence: 0 },
      { nodeId: 'a', kind: 'edge', role: 'z', occurrence: 0 },
      { nodeId: 'a', kind: 'edge', role: 'a', occurrence: 3 },
      { nodeId: 'a', kind: 'edge', role: 'a', occurrence: 1 },
    ];
    const sorted = [...refs].sort(compareSubShapeRefs).map(encodeSubShapeRef);
    expect(sorted).toEqual([
      'a/edge/a#1',
      'a/edge/a#3',
      'a/edge/z#0',
      'a/vertex/r#0',
      'b/face/r#0',
    ]);

    // The canonical re-sort must be a pure function of the refs: shuffling the input cannot
    // change the output, or multi-threaded OCCT ordering would leak into identity (spec §4.5).
    const shuffled = [refs[4]!, refs[0]!, refs[3]!, refs[1]!, refs[2]!];
    expect([...shuffled].sort(compareSubShapeRefs).map(encodeSubShapeRef)).toEqual(sorted);
  });
});

describe('envelope guards', () => {
  it('recognizes a well-formed request', () => {
    expect(
      isKernelRequest({
        protocolVersion: PROTOCOL_VERSION,
        correlationId: 'c1',
        op: 'echo',
        payload: {},
      }),
    ).toBe(true);
  });

  it('rejects junk from the message boundary', () => {
    for (const bad of [null, undefined, 42, 'hi', {}, { op: 'echo' }]) {
      expect(isKernelRequest(bad)).toBe(false);
    }
  });

  it('knows its op names', () => {
    expect(isOpName('makeBox')).toBe(true);
    expect(isOpName('launchMissiles')).toBe(false);
  });
});
