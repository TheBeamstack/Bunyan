// Judge the WASM kernel against the goldens that were seeded offline from a NATIVE OCCT build.
//
// This is the whole point of the transport-agnostic design: the same assertions that certify the
// mock now certify real geometry. A disagreement here means OUR code is wrong (spec §9.0) — the
// WASM build, the op wiring, or the measurement — because both sides are the same OCCT 7.9.3.

import { readFileSync } from 'node:fs';
import initKernel from './dist/bunyan-kernel.js';

const goldens = JSON.parse(readFileSync('/goldens/geometry.golden.json', 'utf8'));
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

  const h = kernel.makeBox(dx, dy, dz);
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

  // Tessellation must be watertight-ish and carry provenance for every triangle.
  const mesh = kernel.tessellate(h, 0.1);
  const nTris = mesh.indices.size() / 3;
  const nProv = mesh.triangleFace.size();
  console.log(`  [${nTris === nProv && nTris > 0 ? 'PASS' : 'FAIL'}] provenance    ${nTris} triangles, ${nProv} face tags`);
  if (nTris !== nProv || nTris === 0) failures++;

  kernel.releaseShape(h);
  console.log(`  [${kernel.liveHandles() === 0 ? 'PASS' : 'FAIL'}] handle freed  liveHandles=${kernel.liveHandles()}`);
  if (kernel.liveHandles() !== 0) failures++;
  console.log();
}

// The typed-failure contract: the kernel must never throw across the boundary (spec §6.4, D10).
const bad = kernel.makeBox(-1, 10, 10);
const rejected = bad === 0 && kernel.lastError().startsWith('INVALID_PAYLOAD');
console.log(`── failure contract`);
console.log(`  [${rejected ? 'PASS' : 'FAIL'}] invalid params rejected without throwing: "${kernel.lastError()}"`);
if (!rejected) failures++;

console.log(`\n${failures === 0 ? '✅ ALL CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
