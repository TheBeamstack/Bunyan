// Judge a freshly-linked WASM kernel against the goldens seeded offline from a NATIVE OCCT build.
//
// A disagreement here means OUR code is wrong (spec §9.0) — the WASM build, the op wiring, or the
// measurement — because both sides are the same OCCT 7.9.3.
//
// SCOPE: this is the BUILD-TIME smoke check, for the moment after `link.sh` when there is a .wasm but
// no repo around it. The real gate is the vitest suite (`tests/golden-box.test.ts` +
// `tests/occt-kernel.test.ts`), which runs the same assertions through the protocol on every push,
// against BOTH kernels. Keep this file honest, but do not grow it — this one only runs when someone
// remembers to run it.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import initKernel from './dist/bunyan-kernel.js';

// Resolved relative to THIS file, so the smoke test runs the same from the repo root, from this
// directory, or from inside the build container. (It previously read an absolute `/goldens/...`,
// which only ever resolved inside a container mount — i.e. it could not be run as documented.)
const goldens = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../tests/goldens/geometry.golden.json', import.meta.url)), 'utf8'),
);
const kernel = await initKernel();

const REL_TOL = 1e-9;
let failures = 0;

function check(label, actual, expected, tol = REL_TOL) {
  const denom = Math.abs(expected) > 1 ? Math.abs(expected) : 1;
  const rel = Math.abs(actual - expected) / denom;
  const ok = rel <= tol;
  if (!ok) failures++;
  const status = ok ? 'PASS' : 'FAIL';
  console.log(
    `  [${status}] ${label.padEnd(14)} got ${String(actual).padEnd(22)} want ${String(expected).padEnd(22)}${ok ? '' : `  (rel err ${rel.toExponential(2)})`}`,
  );
}

console.log(`\nGoldens seeded from: ${goldens.env.oracle} ${goldens.env.ocpVersion}`);
console.log(`WASM kernel:         upstream OCCT 7.9.3 (this build)\n`);

for (const c of goldens.cases) {
  if (c.op !== 'makeBox') continue;
  const { dx, dy, dz } = c.params;
  console.log(`── ${c.case}  (${dx} x ${dy} x ${dz} mm)`);

  const h = kernel.makeBox(0, 0, 0, dx, dy, dz);
  if (!h) {
    console.log(`  [FAIL] makeBox returned 0: ${kernel.lastError()}`);
    failures++;
    continue;
  }

  const m = kernel.measure(h);
  const want = c.analytic ?? c.crossCheck;

  check('volume', m.volume, want.volume);
  check('area', m.area, want.area);
  check('edgeLength', m.edgeLength, want.edgeLength);

  if (want.counts) {
    check('solids', m.solids, want.counts.solids, 0);
    check('faces', m.faces, want.counts.faces, 0);
    check('edges', m.edges, want.counts.edges, 0);
    if (want.counts.vertices !== undefined) check('vertices', m.vertices, want.counts.vertices, 0);
  }

  // Tessellation must carry provenance for every triangle, and a named polyline for every edge.
  // (`tessellate` returns zero-copy views onto the WASM heap — valid only until the next call.)
  const mesh = kernel.tessellate(h, 0.1);
  const nTris = mesh.indices.length / 3;
  const nProv = mesh.triangleFace.length;
  console.log(
    `  [${nTris === nProv && nTris > 0 ? 'PASS' : 'FAIL'}] provenance    ${nTris} triangles, ${nProv} face tags`,
  );
  if (nTris !== nProv || nTris === 0) failures++;

  // The naming report is now STRUCTURAL (relation + ancestors), not a list of role strings — the C++
  // no longer knows what a sub-shape is CALLED, only where it came from (D18). Composing the names is
  // TypeScript's job, and it is tested there; all this smoke test needs is that every face and edge
  // was accounted for at all.
  const naming = kernel.getNaming(h);
  const nFaces = naming.faces.size();
  const nEdges = naming.edges.size();
  naming.faces.delete();
  naming.edges.delete();
  naming.operands.delete();

  const namedOk = nFaces === want.counts.faces && nEdges === want.counts.edges;
  console.log(
    `  [${namedOk ? 'PASS' : 'FAIL'}] naming        ${nFaces} faces, ${nEdges} edges named structurally`,
  );
  if (!namedOk) failures++;

  // The wireframe must draw every named edge, and its length must match the exact B-Rep.
  let wire = 0;
  for (let e = 0; e < mesh.edgeIndex.length; e++) {
    const start = mesh.edgeStart[e];
    for (let i = 0; i + 1 < mesh.edgeCount[e]; i++) {
      const a = (start + i) * 3;
      const b = (start + i + 1) * 3;
      wire += Math.hypot(
        mesh.edgePositions[b] - mesh.edgePositions[a],
        mesh.edgePositions[b + 1] - mesh.edgePositions[a + 1],
        mesh.edgePositions[b + 2] - mesh.edgePositions[a + 2],
      );
    }
  }
  console.log(
    `  [${mesh.edgeIndex.length === nEdges ? 'PASS' : 'FAIL'}] wireframe     ${mesh.edgeIndex.length} polylines`,
  );
  if (mesh.edgeIndex.length !== nEdges) failures++;
  check('wire length', wire, want.edgeLength, 1e-6);

  kernel.releaseShape(h);
  console.log(
    `  [${kernel.liveHandles() === 0 ? 'PASS' : 'FAIL'}] handle freed  liveHandles=${kernel.liveHandles()}`,
  );
  if (kernel.liveHandles() !== 0) failures++;
  console.log();
}

// The typed-failure contract: the kernel must never throw across the boundary (spec §6.4, D10).
const bad = kernel.makeBox(0, 0, 0, -1, 10, 10);
const rejected = bad === 0 && kernel.lastError().startsWith('INVALID_PAYLOAD');
console.log(`── failure contract`);
console.log(
  `  [${rejected ? 'PASS' : 'FAIL'}] invalid params rejected without throwing: "${kernel.lastError()}"`,
);
if (!rejected) failures++;

console.log(`\n${failures === 0 ? '✅ ALL CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
