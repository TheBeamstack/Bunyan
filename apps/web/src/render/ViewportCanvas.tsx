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
import { guideCandidates } from '../tool/align';
import { handleAt, type DragHandle } from '../tool/handles';
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

/**
 * A corner-drag, as the viewport reports it. The gesture's identity is the HANDLE — taken from the
 * selection at `pointerdown` and carried unchanged to `pointerup` — and `to` is where it landed.
 *
 * ⚠ `to` is the 2D baseline point, because that is what `core.setParams` writes (`drag.ts`). The z the
 * handle was drawn at is the Level's and is not the gesture's to change.
 */
export interface HandleDrop {
  readonly handle: DragHandle;
  readonly to: readonly [number, number];
}

export function ViewportCanvas({
  render,
  parts,
  previewFrom,
  snapTo,
  authoring,
  handles,
  onPick,
  onPointerSample,
  onHandleDrop,
}: {
  readonly render: RenderGateway;
  readonly parts: readonly RenderPart[];
  /**
   * Is a point-collecting tool active (design §4.3)? Alignment guides are drawn only then — a dashed
   * guide offers a place to land a click, and Select has no click to land. See `ToolController.authoring`
   * for why `snapTo: null` could not answer this.
   */
  readonly authoring?: boolean;
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
  /**
   * The grabbable baseline endpoints of the SELECTION (design §9) — drawn in the preview layer and
   * hit-tested in pixels by `handleAt`. Empty ⇒ no gizmo, and the canvas behaves exactly as before.
   *
   * ⚠ Identity travels on the handle. The viewport never re-derives which element a drag is moving from
   * the cursor or the snap — see `tool/handles.ts`'s header for why that is the one rule here.
   */
  readonly handles?: readonly DragHandle[];
  /** A face was clicked (or empty space — `null`). Carries its `SubShapeRef` (step 4). */
  readonly onPick?: (pick: PickResult | null, event: { readonly additive: boolean }) => void;
  /** The pointer moved: what it is over, what it snaps to, where it meets the ground. */
  readonly onPointerSample?: (sample: PointerSample) => void;
  /**
   * A handle was dragged and released. The caller turns it into commands (`cornerDragPlan`) and runs
   * them under ONE `transactionId` — that grouping is the feature, and it is the caller's because the
   * viewport neither holds the document nor knows what a command is (domain rule 19).
   */
  readonly onHandleDrop?: (drop: HandleDrop) => void;
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
  // Whether a point-collecting tool is active, read inside the move handler without re-registering it.
  const authoringRef = useRef(authoring ?? false);
  authoringRef.current = authoring ?? false;
  // The selection's grab handles, read inside the pointer handlers without re-registering them.
  const handlesRef = useRef<readonly DragHandle[]>(handles ?? []);
  handlesRef.current = handles ?? [];
  const onHandleDropRef = useRef(onHandleDrop);
  onHandleDropRef.current = onHandleDrop;
  /**
   * The handle currently being dragged, or `null`. ⚠⚠ A REF AND NOT STATE, DELIBERATELY: React BATCHES,
   * and a `pointermove` handler that closed over a state value would read a stale one — the bug that
   * cost `useToolController` a real defect (typing `5000` produced `0`). The pointer handlers are
   * registered once for the life of the canvas and must decide from live values.
   */
  const gestureRef = useRef<DragHandle | null>(null);

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

    /** End the gesture and put the camera back. Idempotent — every exit path may call it. */
    const endGesture = (): void => {
      if (gestureRef.current === null) return;
      gestureRef.current = null;
      viewport.setControlsEnabled(true);
      viewport.setPreviewLine(null);
      viewport.setSnapMarker(null);
      viewport.setGuideLines(null);
    };

    const onPointerDown = (e: PointerEvent): void => {
      downX = e.clientX;
      downY = e.clientY;

      /**
       * ⚠⚠ THE GRAB IS TESTED BEFORE ANYTHING ELSE CLAIMS THE POINTER, and both of the things it
       * suppresses are load-bearing. `OrbitControls` is bound to this same canvas and reads a held drag
       * as an orbit, so without `setControlsEnabled(false)` the camera spins while the handle appears to
       * follow the cursor and the wall lands where nobody aimed. And `setPointerCapture` is what keeps
       * the gesture alive when the cursor leaves the canvas mid-drag — a corner dragged past the edge
       * must still commit where it was released, not silently die at the boundary.
       */
      const grabbed = handleAt(handlesRef.current, viewport.project, cursorOf(e));
      if (grabbed === null) return;
      gestureRef.current = grabbed;
      viewport.setControlsEnabled(false);
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerUp = (e: PointerEvent): void => {
      const gesture = gestureRef.current;
      if (gesture !== null) {
        /**
         * ⚠⚠ THE DROP POINT IS RESOLVED THE SAME WAY THE RUBBER BAND WAS DRAWN — snap first, ground
         * second — because the preview is a PROMISE about where the commit will land. Resolving it any
         * other way here would make the overlay a lie at the only moment it is checkable.
         * ⚠ And the identity is `gesture`'s, taken at `pointerdown` from the SELECTION. The snap decides
         * only WHERE; it carries no `ref` when a guide wins, which is exactly the careful case.
         */
        const to = resolveAt(cursorOf(e)).point;
        endGesture();
        if (to !== null) onHandleDropRef.current?.({ handle: gesture, to: [to[0], to[1]] });
        return; // ⚠ never ALSO a pick — the click that grabbed a handle is not a click on the element
      }
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
     * ⚠⚠ WHAT THE CURSOR RESOLVES TO, IN ONE PLACE, BECAUSE THE PREVIEW IS A PROMISE.
     *
     * The rubber band drawn on `pointermove` and the point committed on `pointerup` must be the same
     * answer, and the only way to guarantee that is for them to be the same CODE. Resolving the drop
     * separately — `snapAt` with an empty candidate list, say — silently drops the guide and face
     * candidates, so the overlay would show a corner landing on the guide it lined up with and the
     * commit would put it somewhere else. That is the overlay lying at the one moment it is checkable,
     * and it would look like a maths bug in the planner.
     *
     * ⚠ THE PER-FRAME PATH. Everything here is Tier 1 (a screen-space lookup over retained geometry) plus
     * one raycast — no kernel call, ever. A `QueryGateway` round-trip here would be ~100 ms and turn a
     * 60 fps rubber band into a slideshow, which is the whole reason the seam is two-tiered (§4.1).
     */
    const resolveAt = (
      cursor: readonly [number, number],
    ): {
      pick: PickResult | null;
      snap: SnapHit | null;
      ground: Vec3 | null;
      guides: ReturnType<Viewport['guidesAt']>;
      anchor: Vec3 | null;
      point: Vec3 | null;
    } => {
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
      // ⚠ THE GUIDES ARE COMPUTED BEFORE THE SNAP, FOR THE SAME REASON THE PICK IS (Entry 80): a
      // guide's foot is a snap CANDIDATE, so it must exist before `chooseSnap` runs. It rides in
      // through the same `live` array the face candidate uses, so `SNAP_PRIORITY` decides between
      // "the corner you have lined up with" and "the face you are over" in one ruled comparison.
      // ⚠ The gesture's own anchor is passed as an extra reference: the point you are drawing FROM is
      // the one a human most expects to line up with, and it is not in the snap index (it is a value
      // the controller holds, not geometry the viewport drew).
      /**
       * ⚠⚠ A CORNER-DRAG IS AN AUTHORING GESTURE, so it gets the guides and the rubber band — and it
       * gets them by SUPPLYING the two inputs that were already wired rather than by adding a path.
       * The anchor is the handle's own point (where the corner was when it was grabbed), and
       * `authoring` is true for the duration. That is TASK's *"the guides are already wired for you"*
       * cashed in: `snapTo` stays `null`, so the alignment fires and `SNAP_PRIORITY` decides between a
       * guide and a face in the one ruled comparison it always did.
       */
      const gesture = gestureRef.current;
      const anchor = gesture !== null ? gesture.point : previewFromRef.current;
      const guides =
        authoringRef.current || gesture !== null
          ? viewport.guidesAt(
              cursor,
              SNAP_TOLERANCE_PX,
              snapToRef.current,
              anchor === null ? [] : [anchor],
            )
          : [];

      const snap = viewport.snapAt(
        cursor,
        SNAP_TOLERANCE_PX,
        [
          ...(pick === null
            ? []
            : [
                faceCandidate({
                  point: pick.point,
                  ref: encodeSubShapeRef(pick.faceRef),
                  elementId: pick.elementId,
                  nodeId: pick.nodeId,
                }),
              ]),
          ...guideCandidates(guides),
        ],
        snapToRef.current,
      );

      // Snap wins over the free ground point, so the preview shows the point that would be committed.
      return { pick, snap, ground, guides, anchor, point: snap?.point ?? ground };
    };

    const onPointerMove = (e: PointerEvent): void => {
      const { pick, snap, ground, guides, anchor, point } = resolveAt(cursorOf(e));

      viewport.setSnapMarker(snap === null ? null : snap.point);
      viewport.setGuideLines(guides.map((guide) => guide.line));
      // The rubber band: from the collected anchor to wherever the cursor resolves right now.
      viewport.setPreviewLine(anchor !== null && point !== null ? [anchor, point] : null);

      onSampleRef.current?.({ pick, snap, ground });
    };

    const onPointerLeave = (): void => {
      // ⚠ A CAPTURED GESTURE OUTLIVES THE CANVAS BOUNDARY. Clearing the overlay here would blank the
      // rubber band the moment a corner is dragged past the edge of the viewport, while the gesture
      // itself carried on invisibly — the drop would then land correctly from a preview that had
      // vanished. `pointerup` and `pointercancel` are the gesture's only ends.
      if (gestureRef.current !== null) return;
      viewport.setSnapMarker(null);
      viewport.setPreviewLine(null);
      viewport.setGuideLines(null);
      onSampleRef.current?.({ pick: null, snap: null, ground: null });
    };

    /** The OS took the pointer away (a touch cancelled, a window lost focus). Commit nothing. */
    const onPointerCancel = (): void => {
      endGesture();
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('pointercancel', onPointerCancel);

    return () => {
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      viewport.dispose();
      viewportRef.current = null;
    };
  }, [render]);

  // Push the selection's grab handles to the overlay whenever they change — a new selection, or an
  // edit that moved a baseline. ⚠ Truncation is reported, never silent (`setDragHandles` returns it).
  useEffect(() => {
    const drawn = viewportRef.current?.setDragHandles((handles ?? []).map((h) => h.point)) ?? 0;
    if (drawn < (handles ?? []).length) {
      console.warn(
        `bunyan: ${(handles ?? []).length - drawn} drag handles not drawn (over capacity)`,
      );
    }
  }, [handles]);

  // Push the desired scene to the (already-created) viewport whenever it changes; the viewport
  // re-tessellates only the parts whose geometry actually changed (step 2b).
  useEffect(() => {
    void viewportRef.current?.setScene(parts);
  }, [parts]);

  // A cancelled or committed gesture clears the rubber band without waiting for the next pointer move.
  // ⚠ The guides are NOT cleared here, and that asymmetry is deliberate: the rubber band belongs to the
  // gesture and dies with it, while a guide belongs to the CURSOR and is still true when no tool is
  // active. It is recomputed on the next move and cleared on `pointerleave`.
  useEffect(() => {
    if ((previewFrom ?? null) === null) viewportRef.current?.setPreviewLine(null);
  }, [previewFrom]);

  return <canvas ref={canvasRef} className="viewport-canvas" />;
}
