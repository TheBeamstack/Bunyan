/**
 * React wrapper around the imperative `Viewport`. Owns the `<canvas>`, wires a `ResizeObserver`, pushes
 * the desired scene down on change, and turns pointer events into picks, hovers and tool input. The
 * `Viewport` itself knows nothing about React.
 *
 * ⚠ P4.5 ADDED THE POINTER-MOVE PATH (design §5/§8), and it is the plumbing hover, snapping and the
 * rubber-band preview all ride on. Before this the canvas listened for `pointerdown`/`pointerup` only —
 * which is why hover highlighting could not exist however cheap the recolour was.
 */

import { useEffect, useRef } from 'react';

import { Viewport, type PickResult } from './Viewport';
import type { RenderPart } from './Viewport';
import type { RenderGateway } from './RenderGateway';
import { faceCandidate, type SnapHit, type SnapKind } from '../tool/snap';
import { encodeSubShapeRef, type Vec3 } from '@bunyan/protocol';

/** A pointer that moves more than this (CSS px) between down and up is an orbit drag, not a pick. */
const CLICK_SLOP_PX = 4;
/** How close (CSS px) the cursor must be for a snap candidate to win. */
const SNAP_TOLERANCE_PX = 12;

/** What the cursor is over right now — everything a tool or a hover highlight needs from one move. */
export interface PointerSample {
  /** The element under the cursor, or `null` over empty space. Drives hover highlighting. */
  readonly pick: PickResult | null;
  /** The best Tier-1 snap within tolerance, or `null`. Drives the snap marker and tool input. */
  readonly snap: SnapHit | null;
  /** Where the ray meets the ground plane — the free point used when nothing snaps. */
  readonly ground: Vec3 | null;
}

export function ViewportCanvas({
  render,
  parts,
  previewFrom,
  snapTo,
  onPick,
  onPointerSample,
}: {
  readonly render: RenderGateway;
  readonly parts: readonly RenderPart[];
  /**
   * The snap kinds the active tool input accepts (`InputSpec.snapTo`); `null`/absent ⇒ all of them.
   * ⚠ Applied inside `chooseSnap`, before the ruled priority comparison — see its `allow` parameter.
   */
  readonly snapTo?: readonly SnapKind[] | null;
  /**
   * The anchor a rubber band is drawn FROM while a tool is collecting (design §5). `null` ⇒ no preview.
   * ⚠ This is OVERLAY geometry and never truth — the document has no idea it exists (rule 19).
   */
  readonly previewFrom?: Vec3 | null;
  /** A face was clicked (or empty space — `null`). Carries its `SubShapeRef` (step 4). */
  readonly onPick?: (pick: PickResult | null, event: { readonly additive: boolean }) => void;
  /** The pointer moved: what it is over, what it snaps to, where it meets the ground. */
  readonly onPointerSample?: (sample: PointerSample) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<Viewport | null>(null);
  // These callbacks change identity every render; read them through refs so the listeners stay stable.
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const onSampleRef = useRef(onPointerSample);
  onSampleRef.current = onPointerSample;
  // The live preview anchor, read inside the move handler without re-registering it.
  const previewFromRef = useRef<Vec3 | null>(previewFrom ?? null);
  previewFromRef.current = previewFrom ?? null;
  // The active input's snap filter, read inside the move handler without re-registering it.
  const snapToRef = useRef<readonly SnapKind[] | null>(snapTo ?? null);
  snapToRef.current = snapTo ?? null;

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

    const cursorOf = (e: PointerEvent): [number, number] => {
      const rect = canvas.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    };

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
      // Ctrl/Cmd/Shift extends the selection SET rather than replacing it (design §7, Q6).
      onPickRef.current?.(viewport.pick(ndcX, ndcY), {
        additive: e.ctrlKey || e.metaKey || e.shiftKey,
      });
    };

    /**
     * ⚠ THE PER-FRAME PATH. Everything here is Tier 1 (a screen-space lookup over retained geometry) plus
     * one raycast — no kernel call, ever. A `QueryGateway` round-trip here would be ~100 ms and turn a
     * 60 fps rubber band into a slideshow, which is the whole reason the seam is two-tiered (§4.1).
     */
    const onPointerMove = (e: PointerEvent): void => {
      const cursor = cursorOf(e);
      const rect = canvas.getBoundingClientRect();
      const ndcX = (cursor[0] / rect.width) * 2 - 1;
      const ndcY = -(cursor[1] / rect.height) * 2 + 1;

      const ground = viewport.groundPointAt(cursor);
      // ⚠ THE PICK COMES FIRST NOW, AND THE ORDER IS LOAD-BEARING (Entry 80): the face under the
      // cursor is a snap CANDIDATE, so it has to exist before the snap is chosen. It is fed in as a
      // live candidate rather than resolved separately, so `SNAP_PRIORITY` decides between "the face
      // you are over" and "the endpoint 3 px away" — one ruled comparison, not two answers the tool
      // would then have to reconcile.
      const pick = viewport.pick(ndcX, ndcY);
      const snap = viewport.snapAt(
        cursor,
        SNAP_TOLERANCE_PX,
        pick === null
          ? []
          : [
              faceCandidate({
                point: pick.point,
                ref: encodeSubShapeRef(pick.faceRef),
                elementId: pick.elementId,
                nodeId: pick.nodeId,
              }),
            ],
        snapToRef.current,
      );

      viewport.setSnapMarker(snap === null ? null : snap.point);

      // The rubber band: from the collected anchor to wherever the cursor resolves right now. Snap wins
      // over the free ground point, so the preview shows the point that would actually be committed.
      const anchor = previewFromRef.current;
      const to = snap?.point ?? ground;
      viewport.setPreviewLine(anchor !== null && to !== null ? [anchor, to] : null);

      onSampleRef.current?.({ pick, snap, ground });
    };

    const onPointerLeave = (): void => {
      viewport.setSnapMarker(null);
      viewport.setPreviewLine(null);
      onSampleRef.current?.({ pick: null, snap: null, ground: null });
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);

    return () => {
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      viewport.dispose();
      viewportRef.current = null;
    };
  }, [render]);

  // Push the desired scene to the (already-created) viewport whenever it changes; the viewport
  // re-tessellates only the parts whose geometry actually changed (step 2b).
  useEffect(() => {
    void viewportRef.current?.setScene(parts);
  }, [parts]);

  // A cancelled or committed gesture clears the rubber band without waiting for the next pointer move.
  useEffect(() => {
    if ((previewFrom ?? null) === null) viewportRef.current?.setPreviewLine(null);
  }, [previewFrom]);

  return <canvas ref={canvasRef} className="viewport-canvas" />;
}
