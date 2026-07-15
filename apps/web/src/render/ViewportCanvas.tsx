/**
 * React wrapper around the imperative `Viewport`. Owns the `<canvas>`, wires a `ResizeObserver`, pushes
 * the desired scene down on change, and turns a click into a sub-shape pick (P4 step 4). The `Viewport`
 * itself knows nothing about React.
 */

import { useEffect, useRef } from 'react';

import { Viewport, type PickResult } from './Viewport';
import type { RenderPart } from './Viewport';
import type { RenderGateway } from './RenderGateway';

/** A pointer that moves more than this (CSS px) between down and up is an orbit drag, not a pick. */
const CLICK_SLOP_PX = 4;

export function ViewportCanvas({
  render,
  parts,
  onPick,
}: {
  readonly render: RenderGateway;
  readonly parts: readonly RenderPart[];
  /** A face was clicked (or empty space — `null`). The picked face carries its `SubShapeRef` (step 4). */
  readonly onPick?: (pick: PickResult | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<Viewport | null>(null);
  // `onPick` can change identity every render; read it through a ref so the canvas listener is stable.
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  // Create the Viewport once, for the life of the canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    const viewport = new Viewport(canvas, render);
    viewportRef.current = viewport;

    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box !== undefined) viewport.resize(box.width, box.height);
    });
    observer.observe(canvas);
    viewport.resize(canvas.clientWidth, canvas.clientHeight);

    // A click (down and up at ~the same spot) is a pick; a drag is an orbit and OrbitControls owns it.
    let downX = 0;
    let downY = 0;
    const onPointerDown = (e: PointerEvent): void => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onPointerUp = (e: PointerEvent): void => {
      if (
        Math.abs(e.clientX - downX) > CLICK_SLOP_PX ||
        Math.abs(e.clientY - downY) > CLICK_SLOP_PX
      ) {
        return; // it was a drag
      }
      const rect = canvas.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      onPickRef.current?.(viewport.pick(ndcX, ndcY));
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);

    return () => {
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      viewport.dispose();
      viewportRef.current = null;
    };
  }, [render]);

  // Push the desired scene to the (already-created) viewport whenever it changes; the viewport
  // re-tessellates only the parts whose geometry actually changed (step 2b).
  useEffect(() => {
    void viewportRef.current?.setScene(parts);
  }, [parts]);

  return <canvas ref={canvasRef} className="viewport-canvas" />;
}
