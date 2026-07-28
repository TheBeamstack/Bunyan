/**
 * `@bunyan/document` — the parametric truth layer above the kernel (P3).
 *
 * ⚠ NOTE WHAT THIS PACKAGE DOES NOT DEPEND ON: `@bunyan/kernel-client`. That is decision **D19** made
 * structural rather than advisory — a package that does not have the dependency cannot import it, even
 * by accident, even under a deadline. `DocumentContext` accepts a narrow `GeometryGateway`; the app's
 * bootstrap constructs the kernel client and hands it over, and that is the only place in the whole
 * product where the two ever meet.
 */

export * from './entities.js';
export * from './schema.js';
export * from './documentation.js';
export * from './families.js';
export * from './systems.js';
export * from './designoptions.js';
export * from './scene.js';
export * from './geometry.js';
export * from './sketch.js';
export * from './room.js';
export * from './joins.js';
export * from './types.js';
export * from './registries.js';
export * from './ulid.js';
export * from './revision.js';
export * from './commands.js';
export * from './undo.js';
export * from './build.js';
export * from './enumerate.js';
export * from './schedule.js';
export * from './cleandelta.js';
export * from './dependency.js';
export * from './document.js';
export * from './agent.js';
export * from './bnn.js';
