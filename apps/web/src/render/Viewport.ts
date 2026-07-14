/**
 * The three.js scene manager — kernel meshes → `BufferGeometry`, orbit camera, grid, axes.
 *
 * ⚠ SCOPE (P4, foundation pass). This is the WebGL2 renderer. P4 step 1 wants `WebGPURenderer` with a
 * WebGL2 fallback and P4 step 7 wants TSL shading; both are follow-ups. The seam that matters is
 * already right: this class receives a `RenderGateway` and never a `KernelClient`, and it consumes
 * `MeshBuffers` + provenance so sub-shape picking (P4 step 4) can be layered on without reshaping it.
 *
 * ⚠ AN ELEMENT IS ITS PARTS (D30). `setElement` tessellates EACH part and renders each as its own mesh
 * with its own material colour — a wall is three solids, not one. Quantities never come from these
 * triangles (`doc.quantities()` reads the B-Rep); this mesh is a disposable projection for the eyes.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import type { MeshBuffers, ShapeHandle } from '@bunyan/protocol';
import type { RenderGateway } from './RenderGateway';

/** One part to draw: its handle and a display colour. */
export interface RenderPart {
  readonly handle: ShapeHandle;
  readonly color: number;
}

export class Viewport {
  readonly #render: RenderGateway;
  readonly #renderer: THREE.WebGLRenderer;
  readonly #scene = new THREE.Scene();
  readonly #camera: THREE.PerspectiveCamera;
  readonly #controls: OrbitControls;
  /** Everything we drew for the current element — disposed and replaced on each `setElement`. */
  readonly #elementGroup = new THREE.Group();
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

    this.#scene.add(this.#elementGroup);

    this.#renderer.setAnimationLoop(this.#tick);
  }

  /** Fit the canvas backing store to its CSS box. Call on mount and on resize. */
  resize(width: number, height: number): void {
    if (this.#disposed || width === 0 || height === 0) return;
    this.#renderer.setSize(width, height, false);
    this.#camera.aspect = width / height;
    this.#camera.updateProjectionMatrix();
  }

  /** Tessellate and draw an element's parts. Replaces whatever was drawn before. */
  async setElement(parts: readonly RenderPart[]): Promise<void> {
    // A rebuild in flight while a newer one arrives: tag each call and bail if superseded.
    const frame = ++this.#frame;
    const meshes = await Promise.all(
      parts.map(async (part) => ({
        mesh: toBufferGeometry(await this.#render.tessellate(part.handle)),
        color: part.color,
      })),
    );
    if (this.#disposed || frame !== this.#frame) {
      for (const { mesh } of meshes) mesh.dispose();
      return;
    }

    this.#clearElement();
    for (const { mesh, color } of meshes) {
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.85,
        metalness: 0.0,
      });
      this.#elementGroup.add(new THREE.Mesh(mesh, material));
    }
  }

  #clearElement(): void {
    for (const child of [...this.#elementGroup.children]) {
      this.#elementGroup.remove(child);
      if (child instanceof THREE.Mesh) disposeMesh(child);
    }
  }

  readonly #tick = (): void => {
    this.#controls.update();
    this.#renderer.render(this.#scene, this.#camera);
  };

  dispose(): void {
    this.#disposed = true;
    this.#renderer.setAnimationLoop(null);
    this.#clearElement();
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
