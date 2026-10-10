// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from 'vitest';
import { createDocLock } from './docLock';

describe('createDocLock — one writer at a time on the document (T-006)', () => {
  it('runs tasks one after another in call order, even past a failure', async () => {
    const lock = createDocLock();
    const log: string[] = [];
    let release: () => void = () => undefined;
    const gate = new Promise<void>((r) => {
      release = r;
    });

    const first = lock.run(async () => {
      log.push('build:start');
      await gate;
      log.push('build:end');
    });
    const second = lock.run(() => {
      log.push('edit');
      return Promise.reject(new Error('rejected edit'));
    });
    const third = lock.run(() => {
      log.push('next');
      return Promise.resolve(7);
    });

    await Promise.resolve();
    expect(log).toEqual(['build:start']);
    release();
    await first;
    await expect(second).rejects.toThrow('rejected edit');
    expect(await third).toBe(7);
    expect(log).toEqual(['build:start', 'build:end', 'edit', 'next']);
  });
});
