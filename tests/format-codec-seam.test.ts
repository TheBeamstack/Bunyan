/**
 * THE FORMAT-CODEC SEAM — domain rule 5, made load-bearing (Entry 60, the rule-5 backward sweep).
 *
 * ⚠⚠ WHAT THIS FILE REPLACES. `step5F-reservations.test.ts` asserted the DWG seam like this:
 *
 *     expect(registries.codecs.size).toBe(0);
 *     registries.codecs.register({ id: 'dwg', label: 'AutoCAD DWG', extensions: ['.dwg'], … });
 *     expect(registries.codecs.size).toBe(1);
 *
 * …and D63 discharged a freeze-gate row on it with *"asserted in the test, not just written down."*
 * **Apply §1b's second method to it: what would it take for that test to pass while the criterion is
 * FALSE?** Nothing at all — it exercises the generic `Registry` class (already proven by 51 type and 39
 * command registrations), and it would pass verbatim if `FormatCodec` were `{ id }`. It never reads a
 * byte, never writes one, and nothing in the repo consulted `registries.codecs` in the first place;
 * `saveBnn`/`loadBnn` were called by name from the app. **The registration was inert.**
 *
 * So this file asserts the thing that was actually claimed: **a format is an ADDITIVE REGISTRATION —
 * register a codec and a caller who knows only a FILENAME can round-trip it, with zero core edits.**
 */

import { describe, expect, it } from 'vitest';
import { BNN_CODEC, createRegistries, codecFor, emptyScene, saveBnn } from '@bunyan/document';
import type { CodecReadResult, CodecWriteInput, FormatCodec, Scene } from '@bunyan/document';

describe('the format-codec seam — a new format is an additive registration (rule 5)', () => {
  /* ============================================================================================
   * §1 — THE PRIMARY PATH GOES THROUGH THE REGISTRY
   * ========================================================================================= */

  it('⚠⚠ a `.bnn` round-trips through the REGISTRY, with the caller naming only a filename', () => {
    const registries = createRegistries();
    registries.codecs.register(BNN_CODEC);

    const scene = emptyScene();

    // The caller has a filename. It does not know, and must not need to know, what a `.bnn` is.
    const writer = codecFor(registries, 'house-a.bnn', 'write');
    expect(writer).toBeDefined();
    const bytes = writer!.write!({ scene, options: { kernelBuildId: 'test' } });

    const reader = codecFor(registries, 'house-a.bnn', 'read');
    expect(reader).toBeDefined();
    const result = reader!.read!(bytes);

    expect(result.scene.elements).toEqual(scene.elements);
    expect(result.manifest).toBeDefined();
  });

  it('the format Bunyan itself ships is registered — so the seam is exercised by the primary path', () => {
    expect(BNN_CODEC.canRead).toBe(true);
    expect(BNN_CODEC.canWrite).toBe(true);
    // ⚠ The members that did not exist before Entry 60. Their ABSENCE is what made the old seam inert.
    expect(typeof BNN_CODEC.read).toBe('function');
    expect(typeof BNN_CODEC.write).toBe('function');
  });

  /* ============================================================================================
   * §2 — THE ACTUAL D63 CLAIM: A NEW FORMAT COSTS ONE REGISTRATION
   * ========================================================================================= */

  it('⚠⚠ D63, asserted for real: a DWG codec is REACHED and INVOKED with zero core edits', () => {
    const registries = createRegistries();
    registries.codecs.register(BNN_CODEC);

    // Before registration the dispatcher simply has no answer — nothing to edit, nothing to patch.
    expect(codecFor(registries, 'site-survey.dwg')).toBeUndefined();

    let invokedWith: Uint8Array | undefined;
    const dwg: FormatCodec = {
      id: 'dwg',
      label: 'AutoCAD DWG',
      extensions: ['.dwg'],
      canRead: true,
      canWrite: false,
      read: (bytes: Uint8Array): CodecReadResult => {
        invokedWith = bytes;
        return { scene: emptyScene() };
      },
    };
    registries.codecs.register(dwg);

    // ⚠ THE WHOLE CLAIM: the dispatcher now routes `.dwg` to it, and CALLS it. No core edit anywhere.
    const found = codecFor(registries, 'site-survey.dwg');
    expect(found?.id).toBe('dwg');
    const payload = new Uint8Array([1, 2, 3]);
    const out = found!.read!(payload);
    expect(invokedWith).toBe(payload);
    expect(out.scene).toBeDefined();

    // …and it did not disturb the format that was already there.
    expect(codecFor(registries, 'house-a.bnn')?.id).toBe('bnn');
  });

  it('a write-only format is not offered for reading, and vice versa', () => {
    const registries = createRegistries();
    const exporter: FormatCodec = {
      id: 'ifc',
      label: 'IFC export',
      extensions: ['.ifc'],
      canRead: false,
      canWrite: true,
      write: (input: CodecWriteInput): Uint8Array => {
        const scene: Scene = input.scene;
        return new Uint8Array([Object.keys(scene.elements).length]);
      },
    };
    registries.codecs.register(exporter);

    expect(codecFor(registries, 'model.ifc', 'write')?.id).toBe('ifc');
    // ⚠ `canRead: false` ⇒ the dispatcher must not hand it to a reader. Declaring a capability it does
    // not have is the failure the old metadata-only interface could not even express.
    expect(codecFor(registries, 'model.ifc', 'read')).toBeUndefined();
  });

  it('the longest matching extension wins, so a compound extension never loses to a prefix', () => {
    const registries = createRegistries();
    registries.codecs.register(BNN_CODEC);
    registries.codecs.register({
      id: 'bnn-backup',
      label: 'Bunyan backup',
      extensions: ['.backup.bnn'],
      canRead: true,
      canWrite: false,
      read: (): CodecReadResult => ({ scene: emptyScene() }),
    });

    expect(codecFor(registries, 'house-a.bnn')?.id).toBe('bnn');
    expect(codecFor(registries, 'house-a.backup.bnn')?.id).toBe('bnn-backup');
  });

  /* ============================================================================================
   * §3 — THE HONEST BOUNDARY. What is still a reservation is SAID to be one.
   * ========================================================================================= */

  it('⚠ the VIEWS registry is still a reserved shape — recorded, not quietly left', () => {
    const registries = createRegistries();
    // Nothing registers a view and nothing dispatches one; the P6 bodies (D58) are what change this.
    // It is asserted so that the day a view IS registered, somebody has to come here and say so —
    // which is exactly the check the codec registry never had.
    expect(registries.views.size).toBe(0);
    // ⚠ And the direct comparison that makes the point: the codec registry is no longer in this state.
    const withBnn = createRegistries();
    withBnn.codecs.register(BNN_CODEC);
    expect(codecFor(withBnn, 'x.bnn')).toBeDefined();
  });

  it('a saved `.bnn` is byte-identical whether written through the registry or by name', () => {
    const registries = createRegistries();
    registries.codecs.register(BNN_CODEC);
    const scene = emptyScene();
    const options = { kernelBuildId: 'test' };

    const viaRegistry = codecFor(registries, 'a.bnn', 'write')!.write!({ scene, options });
    const viaName = saveBnn(scene, options);

    // ⚠ The wrapper must not become a second implementation (domain rule 10 — one description, never
    // two). If these ever diverge, the registry has quietly forked the format.
    expect(viaRegistry).toEqual(viaName);
  });
});
