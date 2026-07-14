/**
 * React wrapper around the imperative `Viewport`. Owns the `<canvas>`, wires a `ResizeObserver`, and
 * re-tessellates whenever `parts` changes. The `Viewport` itself knows nothing about React.
 */

import { useEffect, useRef } from 'react';

import { Viewport } from './Viewport';
import type { RenderPart } from './Viewport';
import type { RenderGateway } from './RenderGateway';

export function ViewportCanvas({
  render,
  parts,
}: {
  readonly render: RenderGateway;
  readonly parts: readonly RenderPart[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<Viewport | null>(null);

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

    return () => {
      observer.disconnect();
      viewport.dispose();
      viewportRef.current = null;
    };
  }, [render]);

  // Push new geometry to the (already-created) viewport whenever it changes.
  useEffect(() => {
    void viewportRef.current?.setElement(parts);
  }, [parts]);

  return <canvas ref={canvasRef} className="viewport-canvas" />;
}
