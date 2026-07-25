/**
 * ⚠⚠ THE BROWSER SCALE HARNESS — AXES (b) DRAW CALLS + (d) EDIT LATENCY (plan P4 step 9b, D66).
 *
 * The headless box measured the two scale axes it can (WASM heap FITS at 0.31 GB; cold load ~6.35 min,
 * Entry 54). The two remaining axes are Amer's, because they exist only in a real browser with a real GPU
 * and the real three.js renderer:
 *
 *   (b) DRAW CALLS + FRAME TIME at the ~10,000-element target (≈16,000 solid parts).
 *   (d) EDIT LATENCY at that scale — the renderer re-tessellation cost of one incremental edit.
 *
 * ── WHY IT IS BUILT THE WAY IT IS (the same discipline the headless harnesses use) ────────────────────
 * The renderer axes are a function of what is IN the three.js scene — the number of `THREE.Mesh` draw
 * calls and their triangles — NOT of how the geometry was produced. A box the kernel built and a box
 * cloned from it render identically. And this box is small (3.7 GB RAM, live public sites — §6a): building
 * 16,000 real OCCT solids in a tab would be ~10 min and strain the box, exactly why the heap harness caps
 * at ~310 solids and EXTRAPOLATES rather than building the target. So this harness does the same:
 *
 *   1. Boot the REAL kernel + document through `bootstrap()` (D19 — the app never holds a `KernelClient`;
 *      it gets a `DocumentContext` to author and a `RenderGateway` to draw). Build a small REAL reference
 *      set of composite walls through the command layer and tessellate their parts — real wall geometry,
 *      the honest per-part triangle/edge distribution.
 *   2. Fill ONE three.js scene (mirroring the shipped `Viewport`: same `createPartMaterial`,
 *      `toBufferGeometry`, `buildEdgeSegments`, EDGE colour, lights, Z-up mm world) to the target part
 *      count with meshes that SHARE the real pooled geometries — one draw call each (three.js does not
 *      auto-instance a shared geometry), grid-spread so a fit camera sees them. Draw calls = mesh count
 *      EXACTLY; frame time is draw-call-bound and faithful; memory stays a few pooled buffers, box-safe.
 *   3. (b) Sweep the part count and record `renderer.info.render.calls` + median/p95 frame time per scale.
 *   4. (d) With the scene resident at scale, edit a REAL wall through `doc.execute('core.setParams')`:
 *      the document rebuilds only that element, its changed parts re-tessellate through the real
 *      `RenderGateway` (step 2b — ONLY the dirty parts), and the harness swaps just those meshes. The
 *      measured latency is the real incremental cost under target-scale renderer load.
 *
 * ⚠ NO BATCHING HERE. The plan is explicit: measure the as-built one-mesh-per-part architecture FIRST;
 * batching-by-material / instancing is "a rewrite not an optimisation" and is a decision the number
 * informs, not a thing to sneak in before the number exists (plan step 9b). The Viewport draws a face
 * `Mesh` AND an edge `LineSegments` per part, so draw calls are ~2× the part count — the harness reports
 * both so the finding is legible.
 *
 * ⚠ FIDELITY CAVEAT, DISCLOSED. Filler parts are cloned from the real composite-wall LAYER solids
 * (rectangular prisms — the simplest real part). A wall pierced by a window carries more triangles, so the
 * per-part TRIANGLE count here is a conservative lower bound. The DRAW-CALL count — the dominant cost at
 * 16k–32k calls, and the one that decides the axis — is exact (one mesh + one edge line per part,
 * regardless of a part's triangle count).
 */

import * as THREE from 'three';

import type { MeshBuffers, ShapeHandle } from '@bunyan/protocol';
import type { DocumentContext, ElementId } from '@bunyan/document';
import type { RenderGateway } from '../render/RenderGateway';
import {
  toBufferGeometry,
  buildEdgeSegments,
  createPartMaterial,
  EDGE_COLOR,
} from '../render/Viewport';
import { percentile } from './stats';

/** Steady-state render cost at one resident part count — the (b) axis at that scale. */
export interface FrameStats {
  /** Face `Mesh` draw calls = resident part count (the sweep target). */
  readonly parts: number;
  /** `renderer.info.render.calls` after a render — face meshes + edge line segments (≈ 2 × parts). */
  readonly drawCalls: number;
  /** `renderer.info.render.triangles` — total triangles submitted this frame. */
  readonly triangles: number;
  readonly medianFrameMs: number;
  readonly p95FrameMs: number;
  /** 1000 / medianFrameMs — the interactive frame rate a user would feel at this scale. */
  readonly fps: number;
}

/** One incremental edit's cost, broken into its stages — the (d) axis at a resident scale. */
export interface EditLatency {
  /** How many filler parts were resident in the scene while the edit ran. */
  readonly residentParts: number;
  /** How many of the edited element's parts actually re-tessellated (step 2b: only the dirty ones). */
  readonly changedParts: number;
  /** `doc.execute('core.setParams')` — the kernel rebuild of the one edited element (flat vs scale). */
  readonly kernelRebuildMs: number;
  /** Tessellating just the changed parts through the real `RenderGateway`. */
  readonly retessellateMs: number;
  /** Disposing the old meshes and installing the new ones in three.js. */
  readonly installMs: number;
  /** Dispatch → new meshes installed (kernel + re-tessellate + install). */
  readonly totalMs: number;
  /** The frame time of the very next render, with the whole resident scene still on screen. */
  readonly nextFrameMs: number;
}

export interface ReferenceInfo {
  readonly elements: number;
  readonly parts: number;
  readonly buildMs: number;
}

export interface ScaleResults {
  readonly reference: ReferenceInfo;
  readonly canvas: { readonly width: number; readonly height: number; readonly dpr: number };
  readonly sweep: readonly FrameStats[];
  /** The row at (or nearest above) the ~16k-part target — the (b) answer. */
  readonly target: FrameStats;
  readonly edits: readonly EditLatency[];
  readonly drawCallsPerPart: number;
}

/** The 10,000-element interactive target (D48) in solid parts: ~1.6 solids/element ⇒ ~16,000 parts. */
export const TARGET_PARTS = 16_000;

/** Part-count scales to sweep. The top of the sweep is the real target; the rest trace the curve. */
export const SWEEP_SCALES = [1_000, 2_000, 4_000, 8_000, 12_000, 16_000] as const;

/** Resident scales at which to measure an incremental edit — to show (d) is flat vs scale (step 2b). */
export const EDIT_SCALES = [0, 8_000, 16_000] as const;

/** Grid spacing between filler parts, in mm — roughly a structural bay, so the spread reads as a model. */
const GRID_SPACING_MM = 3_000;

/** A stable per-part display palette (mirrors App.tsx's foundation-pass placeholder colours). */
const PART_COLORS = [0x9aa0a6, 0xf4d35e, 0xe8e8e8, 0x7fb069, 0xc45b5b] as const;

/** How many frames to render (and discard) before measuring, to let shaders/JIT/GPU warm up. */
const WARMUP_FRAMES = 15;
/** How many frames to time per scale. Median over this many is stable and quick. */
const MEASURE_FRAMES = 60;

/** A real, pooled source part: the geometry every filler mesh that references it will draw. */
interface PooledPart {
  readonly face: THREE.BufferGeometry;
  readonly edges: THREE.BufferGeometry | null;
}

/** A real drawn part of the reference building — kept editable for the (d) edit probe. */
interface RealPart {
  readonly nodeId: string;
  handle: ShapeHandle;
  mesh: THREE.Mesh;
  edges: THREE.LineSegments | null;
}

export class ScaleHarness {
  readonly #doc: DocumentContext;
  readonly #render: RenderGateway;
  readonly #renderer: THREE.WebGLRenderer;
  readonly #scene = new THREE.Scene();
  readonly #camera: THREE.PerspectiveCamera;
  readonly #sceneGroup = new THREE.Group();

  /** Real, uniquely-built parts of the reference building — the ones the edit probe re-tessellates. */
  readonly #realParts = new Map<string, RealPart>();
  /** The pool of real geometries every filler mesh shares (so 16k meshes cost a few buffers, not 16k). */
  #pool: PooledPart[] = [];
  /** Filler objects currently in the scene (face meshes + edge lines), so the sweep can grow/dispose. */
  readonly #filler: THREE.Object3D[] = [];
  /** How many filler PARTS (face meshes) are currently resident. */
  #fillerParts = 0;

  #wallStyleId = 'SCALE-EXT';
  #editableWallId: ElementId | null = null;
  #disposed = false;

  constructor(canvas: HTMLCanvasElement, doc: DocumentContext, render: RenderGateway) {
    this.#doc = doc;
    this.#render = render;

    // Match the shipped Viewport: real GPU renderer, antialias on, device pixel ratio, mm Z-up world.
    this.#renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.#renderer.setPixelRatio(window.devicePixelRatio);
    this.#scene.background = new THREE.Color(0x1a1d21);

    this.#camera = new THREE.PerspectiveCamera(50, 1, 10, 5_000_000);
    this.#camera.up.set(0, 0, 1);

    this.#scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(5000, 10000, 8000);
    this.#scene.add(key);

    this.#scene.add(this.#sceneGroup);
    this.resize(canvas.clientWidth || 960, canvas.clientHeight || 600);
  }

  get canvasInfo(): { width: number; height: number; dpr: number } {
    return {
      width: this.#renderer.domElement.width,
      height: this.#renderer.domElement.height,
      dpr: window.devicePixelRatio,
    };
  }

  resize(width: number, height: number): void {
    if (this.#disposed || width === 0 || height === 0) return;
    this.#renderer.setSize(width, height, false);
    this.#camera.aspect = width / height;
    this.#camera.updateProjectionMatrix();
  }

  /**
   * Build a small REAL reference set (composite walls) through the command layer (D19), tessellate each
   * part through the real `RenderGateway`, install the real meshes, and keep the pooled geometries the
   * filler will share. Returns the reference size and the build time.
   */
  async buildReference(wallCount = 12): Promise<ReferenceInfo> {
    const started = performance.now();

    await this.#doc.execute('core.createMaterial', {
      id: 'blockwork',
      name: 'Blockwork',
      category: 'masonry',
      density: 1400,
    });
    await this.#doc.execute('core.createMaterial', {
      id: 'eps-80',
      name: 'EPS insulation',
      category: 'insulation',
      density: 30,
    });
    await this.#doc.execute('core.createMaterial', {
      id: 'plaster-15',
      name: 'Gypsum plaster',
      category: 'finish',
      density: 1200,
    });
    await this.#doc.execute('core.createStyle', {
      id: this.#wallStyleId,
      name: 'Scale external wall',
      typeId: 'core.wall.v1',
      layers: [
        { name: 'structure', materialId: 'blockwork', thickness: 200, discipline: 'structural' },
        { name: 'insulation', materialId: 'eps-80', thickness: 80, discipline: 'architectural' },
        { name: 'finish', materialId: 'plaster-15', thickness: 15, discipline: 'architectural' },
      ],
    });

    for (let i = 0; i < wallCount; i++) {
      // Vary the size so the pooled geometries are not all identical (realistic culling/overdraw).
      const edit = await this.#doc.execute('core.createElement', {
        typeId: 'core.wall.v1',
        styleId: this.#wallStyleId,
        name: `Wall ${String(i + 1)}`,
        params: { length: 3000 + (i % 5) * 900, height: 2600 + (i % 3) * 300 },
      });
      const id = edit.changes[0]!.id;
      if (this.#editableWallId === null) this.#editableWallId = id;
      await this.#installReal(id);
    }

    // Frame the reference building so the first paint is sensible before the sweep spreads the filler.
    this.#frameGrid(4);

    const parts = this.#realParts.size;
    return { elements: wallCount, parts, buildMs: performance.now() - started };
  }

  /** Tessellate every part of a real element and install its meshes; pool its geometries for the filler. */
  async #installReal(elementId: ElementId): Promise<void> {
    const parts = this.#doc.partsOf(elementId);
    if (parts === undefined) return;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const buffers = await this.#render.tessellate(part.handle);
      const face = toBufferGeometry(buffers);
      const edgeSeg = buildEdgeSegments(buffers);
      const mesh = new THREE.Mesh(face, createPartMaterial(PART_COLORS[i % PART_COLORS.length]!));
      this.#sceneGroup.add(mesh);
      if (edgeSeg !== null) this.#sceneGroup.add(edgeSeg);
      this.#realParts.set(part.nodeId, {
        nodeId: part.nodeId,
        handle: part.handle,
        mesh,
        edges: edgeSeg,
      });
      // Pool a CLONE (the real meshes may later be disposed/replaced by the edit probe; the pool must
      // outlive them). One pooled entry per real part is plenty of variety for the filler.
      this.#pool.push({
        face: face.clone(),
        edges: edgeSeg === null ? null : edgeSeg.geometry.clone(),
      });
    }
  }

  /**
   * Ensure exactly `n` filler PARTS are resident, grid-spread. Grows by adding (cheap, reuses pooled
   * geometry) or shrinks by disposing the tail — so a sweep from 1k→16k never rebuilds from scratch.
   */
  growFillerTo(n: number): void {
    if (this.#pool.length === 0) throw new Error('scale harness: buildReference() must run first');

    while (this.#fillerParts < n) {
      const pooled = this.#pool[this.#fillerParts % this.#pool.length]!;
      const color = PART_COLORS[this.#fillerParts % PART_COLORS.length]!;
      const pos = this.#gridPosition(this.#fillerParts);

      const mesh = new THREE.Mesh(pooled.face, createPartMaterial(color));
      mesh.position.copy(pos);
      this.#sceneGroup.add(mesh);
      this.#filler.push(mesh);

      if (pooled.edges !== null) {
        const line = new THREE.LineSegments(
          pooled.edges,
          new THREE.LineBasicMaterial({ color: EDGE_COLOR }),
        );
        line.position.copy(pos);
        this.#sceneGroup.add(line);
        this.#filler.push(line);
      }
      this.#fillerParts++;
    }

    while (this.#fillerParts > n) {
      // Pop the tail: the edge line (if any) then the face mesh. Shared pooled geometry is NEVER disposed
      // here — only the per-mesh materials and the wrapper objects.
      this.#popFillerPart();
    }

    this.#frameGrid(Math.max(n, this.#realParts.size));
  }

  #popFillerPart(): void {
    // Objects were pushed as [mesh, (line)]; pop until we have removed exactly one face mesh.
    while (this.#filler.length > 0) {
      const obj = this.#filler.pop()!;
      this.#sceneGroup.remove(obj);
      disposeMaterialOnly(obj);
      if (obj instanceof THREE.Mesh) {
        this.#fillerParts--;
        return;
      }
    }
  }

  /** Deterministic 3D grid position for filler index `i`, centred on the origin. */
  #gridPosition(i: number): THREE.Vector3 {
    // A roughly-cubic grid keeps the spread compact so a fit camera sees most of it.
    const side = Math.max(1, Math.ceil(Math.cbrt(TARGET_PARTS)));
    const x = i % side;
    const y = Math.floor(i / side) % side;
    const z = Math.floor(i / (side * side));
    const half = ((side - 1) * GRID_SPACING_MM) / 2;
    return new THREE.Vector3(
      x * GRID_SPACING_MM - half,
      y * GRID_SPACING_MM - half,
      z * GRID_SPACING_MM,
    );
  }

  /** Point the camera at the whole grid so (nearly) every mesh is in-frustum — the honest worst case. */
  #frameGrid(count: number): void {
    const side = Math.max(1, Math.ceil(Math.cbrt(TARGET_PARTS)));
    const extent = side * GRID_SPACING_MM;
    const radius = extent * 0.9 + 4000;
    const center = new THREE.Vector3(
      0,
      0,
      (Math.floor(count / (side * side)) * GRID_SPACING_MM) / 2,
    );
    this.#camera.position.set(center.x + radius, center.y - radius, center.z + radius * 0.7);
    this.#camera.lookAt(center);
    this.#camera.updateProjectionMatrix();
    this.#frameCenter.copy(center);
    this.#frameRadius = radius;
  }

  readonly #frameCenter = new THREE.Vector3();
  #frameRadius = 10_000;

  /** Render one frame, orbiting the camera a little around the model (so culling is exercised live). */
  #renderOrbitFrame(angle: number): void {
    const r = this.#frameRadius;
    this.#camera.position.set(
      this.#frameCenter.x + r * Math.cos(angle),
      this.#frameCenter.y + r * Math.sin(angle),
      this.#frameCenter.z + r * 0.7,
    );
    this.#camera.lookAt(this.#frameCenter);
    this.#renderer.render(this.#scene, this.#camera);
  }

  /**
   * Measure steady-state frame time at the current resident count. Renders `WARMUP_FRAMES` to warm up,
   * then times `MEASURE_FRAMES`, returning median/p95/fps and the draw-call + triangle counts.
   */
  async measureFrames(): Promise<FrameStats> {
    let angle = 0.6;
    const step = (Math.PI * 2) / (MEASURE_FRAMES * 2);

    for (let i = 0; i < WARMUP_FRAMES; i++) {
      this.#renderOrbitFrame(angle);
      angle += step;
      await yieldToTask();
    }

    const times: number[] = [];
    let drawCalls = 0;
    let triangles = 0;
    for (let i = 0; i < MEASURE_FRAMES; i++) {
      const t0 = performance.now();
      this.#renderOrbitFrame(angle);
      const dt = performance.now() - t0;
      times.push(dt);
      drawCalls = this.#renderer.info.render.calls;
      triangles = this.#renderer.info.render.triangles;
      angle += step;
      await yieldToTask();
    }

    const median = percentile(times, 50);
    return {
      parts: this.#fillerParts,
      drawCalls,
      triangles,
      medianFrameMs: median,
      p95FrameMs: percentile(times, 95),
      fps: median > 0 ? 1000 / median : Infinity,
    };
  }

  /**
   * (d) Measure one incremental edit at the current resident scale: change the reference wall's length,
   * let the document rebuild it, re-tessellate ONLY its changed parts (step 2b), swap those meshes, and
   * time one frame after. `toggle` alternates the target length so repeated calls always change geometry.
   */
  async measureEdit(toggle: boolean): Promise<EditLatency> {
    const wallId = this.#editableWallId;
    if (wallId === null) throw new Error('scale harness: no editable reference wall');

    // Snapshot the current handles so we can tell which parts actually got a fresh solid.
    const before = new Map<string, ShapeHandle>();
    for (const p of this.#realParts.values()) before.set(p.nodeId, p.handle);

    const t0 = performance.now();
    await this.#doc.execute('core.setParams', {
      elementId: wallId,
      params: { length: toggle ? 4200 : 3600 },
    });
    const kernelRebuildMs = performance.now() - t0;

    // Re-tessellate only the parts whose handle changed — the incremental redraw signal (reconcile.ts).
    const parts = this.#doc.partsOf(wallId) ?? [];
    const dirty = parts.filter((p) => before.get(p.nodeId) !== p.handle);

    const tess0 = performance.now();
    const rebuilt = await Promise.all(
      dirty.map(async (p) => ({ part: p, buffers: await this.#render.tessellate(p.handle) })),
    );
    const retessellateMs = performance.now() - tess0;

    const install0 = performance.now();
    for (const { part, buffers } of rebuilt)
      this.#replaceRealPart(part.nodeId, part.handle, buffers);
    const installMs = performance.now() - install0;

    const totalMs = performance.now() - t0;

    // The frame the user waits for after the edit commits — rendered with the whole scene resident.
    const frame0 = performance.now();
    this.#renderer.render(this.#scene, this.#camera);
    const nextFrameMs = performance.now() - frame0;

    return {
      residentParts: this.#fillerParts,
      changedParts: dirty.length,
      kernelRebuildMs,
      retessellateMs,
      installMs,
      totalMs,
      nextFrameMs,
    };
  }

  /** Replace one real part's face mesh + edges with freshly-tessellated geometry (keeps its material). */
  #replaceRealPart(nodeId: string, handle: ShapeHandle, buffers: MeshBuffers): void {
    const existing = this.#realParts.get(nodeId);
    if (existing === undefined) return;

    const material = existing.mesh.material;
    this.#sceneGroup.remove(existing.mesh);
    existing.mesh.geometry.dispose();
    if (existing.edges !== null) {
      this.#sceneGroup.remove(existing.edges);
      existing.edges.geometry.dispose();
      (existing.edges.material as THREE.Material).dispose();
    }

    const mesh = new THREE.Mesh(toBufferGeometry(buffers), material);
    this.#sceneGroup.add(mesh);
    const edgeSeg = buildEdgeSegments(buffers);
    if (edgeSeg !== null) this.#sceneGroup.add(edgeSeg);
    this.#realParts.set(nodeId, { nodeId, handle, mesh, edges: edgeSeg });
  }

  /** Whether the WebGL context reports a context loss (a possible scale symptom worth surfacing). */
  get contextLost(): boolean {
    return this.#renderer.getContext().isContextLost();
  }

  dispose(): void {
    this.#disposed = true;
    while (this.#filler.length > 0) this.#popFillerPart();
    for (const p of this.#realParts.values()) {
      this.#sceneGroup.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
      if (p.edges !== null) {
        this.#sceneGroup.remove(p.edges);
        p.edges.geometry.dispose();
        (p.edges.material as THREE.Material).dispose();
      }
    }
    this.#realParts.clear();
    for (const pooled of this.#pool) {
      pooled.face.dispose();
      pooled.edges?.dispose();
    }
    this.#pool = [];
    this.#renderer.dispose();
  }
}

/**
 * Yield to the event loop between rendered frames — via a `MessageChannel` macrotask, NOT
 * `requestAnimationFrame`.
 *
 * ⚠ WHY NOT rAF. rAF is paused/heavily throttled in a background or non-foreground tab (and this
 * measurement runs in an embedded browser pane that the OS may treat as hidden), which stalls sample
 * COLLECTION — not the render cost, which each frame times synchronously around `renderer.render`, but
 * the loop that gathers the samples. A `MessageChannel` message is a macrotask that is NOT subject to
 * background-timer throttling, so it yields (keeping the tab responsive) at full speed regardless of
 * visibility. The measured frame time is unaffected either way; only the wall-clock to collect it is.
 */
function yieldToTask(): Promise<void> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (): void => {
      resolve();
    };
    channel.port2.postMessage(undefined);
  });
}

/** Dispose a wrapper object's material(s) only — never its (possibly pooled/shared) geometry. */
function disposeMaterialOnly(obj: THREE.Object3D): void {
  const material = (obj as unknown as { material?: THREE.Material | THREE.Material[] }).material;
  if (material === undefined) return;
  for (const one of Array.isArray(material) ? material : [material]) one.dispose();
}
