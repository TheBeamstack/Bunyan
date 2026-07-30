/**
 * THE TOOL CONTROLLER — P4.5 design §3. The single active-tool slot, the keyboard, and numeric entry.
 *
 *     Ribbon button / shortcut ─► ToolController ─► reads  SnapGateway (Tier 1, per frame)
 *                                                  draws  PreviewLayer (overlay, never truth)
 *                                                  commits ONE Command through Dispatch ─► DocumentContext
 *
 * ⚠⚠ WHAT MAKES THIS A CONTROLLER AND NOT A COMMAND LAYER (domain rule 19). It holds the in-progress
 * gesture in **React state** — a plain value, outside the document — and it reaches the model through the
 * SAME `Dispatch` the ribbon and the property panel use. It has no `DocumentContext`, no `KernelClient`,
 * and no way to write a scene. A cancelled gesture is a discarded value; there is nothing to clean up,
 * because nothing was ever staged.
 *
 * ⚠ Exactly ONE tool is active at a time; activating another cancels the first with no trace (§2).
 */

import { useCallback, useMemo, useRef, useState } from 'react';

import type { UndoableEdit } from '@bunyan/document';
import type { Vec3 } from '@bunyan/protocol';
import type { Dispatch } from '../edit/runner';
import type { PointerSample } from '../render/ViewportCanvas';
import { applyNumericKey, parseLengthMm, pointAtLength } from './numeric';
import { SELECT_TOOL, toolById } from './tools';
import {
  acceptInput,
  anchorOf,
  beginSession,
  commitOf,
  currentInput,
  type Tool,
  type ToolSession,
} from './toolMachine';

export interface ToolController {
  readonly activeTool: Tool;
  readonly session: ToolSession | null;
  /** What the status line should say right now — the current input's prompt, or null when idle. */
  readonly prompt: string | null;
  /** The rubber-band anchor for the viewport overlay, or null when nothing is being collected. */
  readonly previewFrom: Vec3 | null;
  /** The numeric field's contents while it is open, else null. */
  readonly numericText: string | null;
  // ⚠ Declared as function PROPERTIES, not methods. These are stable `useCallback` arrows passed straight
  // into JSX props, and a method signature makes `@typescript-eslint/unbound-method` (rightly) warn that
  // the receiver could be lost. Property syntax says what they actually are: values, not methods.
  readonly activate: (toolId: string) => void;
  readonly cancel: () => void;
  readonly onPointerSample: (sample: PointerSample) => void;
  /** Consume a viewport click as tool input. Returns false when no tool wanted it (⇒ it is a selection). */
  readonly handleClick: () => boolean;
  /** Consume a keystroke. Returns false when the tool layer did not want it (⇒ the app's owner handles it). */
  readonly handleKey: (event: KeyboardEvent) => boolean;
}

export function useToolController(options: {
  readonly dispatch: Dispatch;
  readonly onCommitted?: (edit: UndoableEdit) => void;
}): ToolController {
  const [activeToolId, setActiveToolId] = useState(SELECT_TOOL.id);
  const [session, setSession] = useState<ToolSession | null>(null);
  const [numericText, setNumericText] = useState<string | null>(null);

  // The latest pointer sample, in a ref: a click and a keystroke both need "where is the cursor and what
  // does it snap to" WITHOUT the controller re-rendering on every mouse move.
  const cursorRef = useRef<PointerSample>({ pick: null, snap: null, ground: null });
  const optionsRef = useRef(options);
  optionsRef.current = options;

  /**
   * ⚠⚠ REFS MIRROR THE GESTURE STATE, AND THIS IS A CORRECTNESS FIX, NOT A STYLE CHOICE — it was found by
   * driving the tool in a real browser (Entry 70), not by reading the code.
   *
   * Every handler here is registered once and closes over the `session`/`numericText` of the render that
   * registered it. React BATCHES state updates, so two events arriving in the same tick both read the
   * SAME stale value and the second overwrites the first instead of building on it. Measured: typing
   * `5`,`0`,`0`,`0` into the numeric field left **`0`** — each keystroke saw `numericText === null` and
   * re-set the field to the single digit it was holding. Slow human typing hides it (a render lands
   * between keys); fast typing, a key-repeat, or a scripted burst does not.
   *
   * ⇒ **Decisions read the REF (always current), and every write updates the ref and the state together.**
   * The ref is the truth the handlers run on; the state exists to re-render the status line.
   */
  const sessionRef = useRef<ToolSession | null>(null);
  const numericRef = useRef<string | null>(null);

  const putSession = useCallback((next: ToolSession | null): void => {
    sessionRef.current = next;
    setSession(next);
  }, []);
  const putNumeric = useCallback((next: string | null): void => {
    numericRef.current = next;
    setNumericText(next);
  }, []);

  const activeTool = useMemo(() => toolById(activeToolId) ?? SELECT_TOOL, [activeToolId]);

  const cancel = useCallback(() => {
    putSession(null);
    putNumeric(null);
  }, [putSession, putNumeric]);

  const activate = useCallback(
    (toolId: string) => {
      // Activating a tool cancels whatever was in progress, with no trace (§2).
      putSession(null);
      putNumeric(null);
      setActiveToolId(toolById(toolId) === undefined ? SELECT_TOOL.id : toolId);
    },
    [putSession, putNumeric],
  );

  /**
   * Feed one collected point into the gesture, and COMMIT when it completes.
   *
   * ⚠ The commit is the only thing in this file that touches the document, it happens exactly once per
   * gesture, and it goes through the shared `Dispatch`. On failure the banner already has it and the tool
   * returns to its start state — nothing was committed, so there is nothing to roll back (D42).
   */
  const offerPoint = useCallback(
    (tool: Tool, point: Vec3) => {
      const current = sessionRef.current ?? beginSession(tool);
      const { session: next, complete } = acceptInput(tool, current, point);
      putNumeric(null);

      if (!complete) {
        putSession(next);
        return;
      }

      const commit = commitOf(tool, next);
      // The tool declined (a zero-length wall): drop the gesture rather than send a doomed command.
      putSession(null);
      if (commit === null) return;

      void optionsRef.current.dispatch(commit.commandId, commit.args).then((edit) => {
        if (edit !== null) optionsRef.current.onCommitted?.(edit);
      });
    },
    [putSession, putNumeric],
  );

  const onPointerSample = useCallback((sample: PointerSample) => {
    cursorRef.current = sample;
  }, []);

  /** Where a click means, right now: the snap wins over the free ground point (§4.4 chooses the target). */
  const resolveCursorPoint = useCallback((): Vec3 | null => {
    const { snap, ground } = cursorRef.current;
    return snap?.point ?? ground;
  }, []);

  const handleClick = useCallback((): boolean => {
    if (activeTool.inputs.length === 0) return false; // Select: the click is a selection, not input.
    const point = resolveCursorPoint();
    if (point === null) return true; // A tool is active but the cursor means nothing — swallow, don't select.
    offerPoint(activeTool, point);
    return true;
  }, [activeTool, offerPoint, resolveCursorPoint]);

  const handleKey = useCallback(
    (event: KeyboardEvent): boolean => {
      // ⚠ EVERY read below is from a REF, never from the closed-over render value — see the note on
      // `sessionRef`/`numericRef`. Reading `numericText` here is what made `5000` arrive as `0`.
      const live = sessionRef.current;
      const typed = numericRef.current;
      const collecting = live !== null || typed !== null;

      if (event.key === 'Escape') {
        // Esc cancels the GESTURE first and the selection only if there is no gesture — so one Esc never
        // does two things at once (§2: "cancel, leave no trace").
        if (typed !== null) {
          putNumeric(null);
          return true;
        }
        if (live !== null) {
          cancel();
          return true;
        }
        return false;
      }

      // Numeric entry applies only where the tool declares it — the input measured FROM a previous point.
      const base = live ?? beginSession(activeTool);
      const allowed = currentInput(activeTool, base)?.numeric === true && anchorOf(base) !== null;

      const result = applyNumericKey(typed, event.key, { allowed });
      if (result.text !== typed) putNumeric(result.text);

      if (result.commit) {
        const length = parseLengthMm(result.text ?? '');
        const anchor = anchorOf(base);
        const towards = resolveCursorPoint();
        // A half-typed value or a cursor with no direction leaves the field open rather than guessing.
        if (length !== null && anchor !== null && towards !== null) {
          const exact = pointAtLength(anchor, towards, length);
          if (exact !== null) offerPoint(activeTool, exact);
        }
        return true;
      }
      if (result.consumed) return true;

      return collecting && event.key === 'Enter';
    },
    [activeTool, cancel, offerPoint, putNumeric, resolveCursorPoint],
  );

  const prompt = useMemo(() => {
    if (activeTool.inputs.length === 0) return null;
    return currentInput(activeTool, session ?? beginSession(activeTool))?.prompt ?? null;
  }, [activeTool, session]);

  return {
    activeTool,
    session,
    prompt,
    previewFrom: session === null ? null : anchorOf(session),
    numericText,
    activate,
    cancel,
    onPointerSample,
    handleClick,
    handleKey,
  };
}
