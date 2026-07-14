/**
 * The three.js scene manager — kernel meshes → `BufferGeometry`, orbit camera, grid, axes.
 *
 * ⚠ SCOPE (P4). This is the WebGL2 renderer. P4 step 1 wants `WebGPURenderer` with a WebGL2 fallback
 * and P4 step 7 wants TSL shading; both are follow-ups. The seam that matters is already right: this
 * class receives a `RenderGateway` and never a `KernelClient`.
 *
 * ⚠ AN ELEMENT IS ITS PARTS (D30). Each part is its own mesh with its own material colour — a wall is
 * three solids, not one. Quantities never come from these triangles (`doc.quantities()` reads the
 * B-Rep); this mesh is a disposable projection for the eyes.
 *
 * ⚠ THE REDRAW IS INCREMENTAL (P4 step 2b). `setScene` keeps a mesh cache keyed by each part's STABLE
 * `nodeId` and re-tessellates only the parts whose `handle` changed — an untouched element costs
 * nothing. See `reconcile.ts` for the plan and why the changed handle is a sufficient dirty signal.
 * *(`toBufferGeometry` still drops the provenance/edge maps — that is step 2c, next.)*
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import type { MeshBuffers } from '@bunyan/protocol';
import type { RenderGateway } from './RenderGateway';
import type { RenderPart } from './RenderPart';
import { planRedraw, type CachedPart } from './reconcile';

export type { RenderPart } from './RenderPart';

/** A part currently on screen: what it was built from, plus its live three.js mesh. */
interface DrawnPart extends CachedPart {
  readonly mesh: THREE.Mesh;
}

export class Viewport {
  readonly #render: RenderGateway;
  readonly #renderer: THREE.WebGLRenderer;
  readonly #scene = new THREE.Scene();
  readonly #camera: THREE.PerspectiveCamera;
  readonly #controls: OrbitControls;
  /** Everything currently drawn. */
  readonly #sceneGroup = new THREE.Group();
  /** Mesh cache keyed by the STABLE part `nodeId` — the substrate of the incremental redraw (step 2b). */
  readonly #drawn = new Map<string, DrawnPart>();
  #frame = 0;
  #disposed = false;

  constructor(canvas: HTMLCanvasElement, render: RenderGateway) {
    this.#render = render;

    this.#renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.#renderer.setPixelRatio(window.devicePixelRatio);

    this.#scene.background = new THREE.Color(0x1a1d21);

    // World is millimetres (spec §6). A near/far spanning a building at mm scale.
    this.#camera = new THREE.PerspectiveCamera(50, 1, 10, 500_000);
    this.#camera.position.set(6000, 5000, 8000);
    this.#camera.up.set(0, 0, 1); // Z is up in Bunyan's world.

    this.#controls = new OrbitControls(this.#camera, canvas);
    this.#controls.target.set(2000, 500, 1400);
    this.#controls.update();

    this.#scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(5000, 10000, 8000);
    this.#scene.add(key);

    const grid = new THREE.GridHelper(20_000, 20, 0x445566, 0x2a2f36);
    grid.rotation.x = Math.PI / 2; // three's grid is XZ; ours is the XY ground plane.
    this.#scene.add(grid);
    this.#scene.add(new THREE.AxesHelper(2000));

    this.#scene.add(this.#sceneGroup);

    this.#renderer.setAnimationLoop(this.#tick);
  }

  /** Fit the canvas backing store to its CSS box. Call on mount and on resize. */
  resize(width: number, height: number): void {
    if (this.#disposed || width === 0 || height === 0) return;
    this.#renderer.setSize(width, height, false);
    this.#camera.aspect = width / height;
    this.#camera.updateProjectionMatrix();
  }

  /**
   * Draw `parts`, reusing every mesh whose geometry did not change (P4 step 2b). Only parts with a new
   * or changed `handle` are tessellated; a part that merely changed colour swaps its material; a part
   * that left the scene is disposed. This replaces the old `setElement`, which re-tessellated the whole
   * model on every call — the dominant interactive cost the review measured (Entry 24).
   */
  async setScene(parts: readonly RenderPart[]): Promise<void> {
    // A newer setScene may supersede this one while we await the kernel; tag it and bail if so.
    const frame = ++this.#frame;
    const plan = planRedraw(this.#drawn, parts);

    // Tessellate ONLY the dirty parts, in parallel. (The render path is still un-coalesced — step 2d.)
    const built = await Promise.all(
      plan.tessellate.map(async (part) => ({
        part,
        geometry: toBufferGeometry(await this.#render.tessellate(part.handle)),
      })),
    );

    if (this.#disposed || frame !== this.#frame) {
      for (const { geometry } of built) geometry.dispose();
      return;
    }

    for (const nodeId of plan.remove) this.#removePart(nodeId);
    for (const part of plan.recolor) this.#recolorPart(part);
    for (const { part, geometry } of built) this.#installPart(part, geometry);
  }

  #installPart(part: RenderPart, geometry: THREE.BufferGeometry): void {
    this.#removePart(part.nodeId); // a rebuilt part replaces its old mesh
    const material = new THREE.MeshStandardMaterial({
      color: part.color,
      roughness: 0.85,
      metalness: 0.0,
    });
    const mesh = new THREE.Mesh(geometry, material);
    // Carry identity onto the object so a raycast hit (step 4) maps back to element + part.
    mesh.userData['nodeId'] = part.nodeId;
    mesh.userData['elementId'] = part.elementId;
    this.#sceneGroup.add(mesh);
    this.#drawn.set(part.nodeId, { handle: part.handle, color: part.color, mesh });
  }

  #recolorPart(part: RenderPart): void {
    const existing = this.#drawn.get(part.nodeId);
    if (existing === undefined) return;
    const { material } = existing.mesh;
    if (material instanceof THREE.MeshStandardMaterial) material.color.setHex(part.color);
    this.#drawn.set(part.nodeId, {
      handle: existing.handle,
      color: part.color,
      mesh: existing.mesh,
    });
  }

  #removePart(nodeId: string): void {
    const existing = this.#drawn.get(nodeId);
    if (existing === undefined) return;
    this.#sceneGroup.remove(existing.mesh);
    disposeMesh(existing.mesh);
    this.#drawn.delete(nodeId);
  }

  #clearAll(): void {
    for (const { mesh } of this.#drawn.values()) {
      this.#sceneGroup.remove(mesh);
      disposeMesh(mesh);
    }
    this.#drawn.clear();
  }

  readonly #tick = (): void => {
    this.#controls.update();
    this.#renderer.render(this.#scene, this.#camera);
  };

  dispose(): void {
    this.#disposed = true;
    this.#renderer.setAnimationLoop(null);
    this.#clearAll();
    this.#controls.dispose();
    this.#renderer.dispose();
  }
}

interface Disposable {
  dispose(): void;
}

/**
 * Free a mesh's GPU resources. `instanceof THREE.Mesh` narrows to `Mesh<any, any, any>`, so we read the
 * two fields we know are there through a concrete structural type rather than touching `any`.
 */
function disposeMesh(child: THREE.Object3D): void {
  const { geometry, material } = child as unknown as {
    geometry: Disposable;
    material: Disposable | Disposable[];
  };
  geometry.dispose();
  for (const one of Array.isArray(material) ? material : [material]) one.dispose();
}

/** `MeshBuffers` → a three.js `BufferGeometry`. The provenance map rides along for picking (P4 step 4). */
function toBufferGeometry(mesh: MeshBuffers): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
  return geometry;
}
