// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * `PropertyPanel` — the selected element's parameters, editable. **This is what makes the wall a wall
 * you can change rather than a picture of one**, and it is the P4 property-panel criterion.
 *
 * ⚠ IT IS DERIVED, NOT HAND-WRITTEN (D21). The fields come straight from the Type's `parameterSchema`
 * via `SchemaForm`; nothing here knows a wall has a `length`. Register a new Type and its editor
 * appears with no edit to this file.
 *
 * ⚠ EVERY EDIT IS A COMMAND (D19). A change dispatches `core.setParams` through the one door — the
 * exact call an agent would make through `window.bunyan`. There is no private write path from the UI to
 * the geometry; the panel proposes params and the document rebuilds from the recipe.
 *
 * The dispatch discipline (see `edit/runner.ts`): edits flow through a single-flight, trailing-latest
 * runner so a drag collapses to one in-flight rebuild, and a slider drag additionally carries a
 * `coalesceKey` so the kernel discards superseded frames. The panel keeps a local `draft` so the inputs
 * stay responsive at 60 fps while the (slower) rebuild catches up, and resyncs from the document only
 * when it is NOT mid-edit — so an external change (undo/redo) is reflected, but a live drag is never
 * clobbered mid-gesture.
 */

import { useEffect, useRef, useState } from 'react';

import type { BimObjectType, Element, ParamValue, Params } from '@bunyan/document';

import { SchemaForm, setField } from './SchemaForm';
import type { EditMeta } from './SchemaForm';
import { createLatestRunner } from '../edit/runner';
import type { Dispatch, LatestRunner } from '../edit/runner';

export interface PropertyPanelProps {
  readonly element: Element;
  readonly type: BimObjectType;
  readonly dispatch: Dispatch;
}

export function PropertyPanel({ element, type, dispatch }: PropertyPanelProps) {
  const [draft, setDraft] = useState<Params>(element.params);
  const draftRef = useRef<Params>(element.params);
  /** True from the first keystroke/drag of a gesture until the runner drains — guards the resync below. */
  const editingRef = useRef(false);
  const runnerRef = useRef<LatestRunner | null>(null);
  runnerRef.current ??= createLatestRunner(() => {
    editingRef.current = false;
  });

  // Resync from the document on an EXTERNAL change (undo/redo, or a fresh selection) — but never while
  // a gesture is live, or a slow commit landing mid-drag would snap the slider back a few frames.
  useEffect(() => {
    if (!editingRef.current) {
      draftRef.current = element.params;
      setDraft(element.params);
    }
  }, [element]);

  const onEdit = (field: string, next: ParamValue | undefined, meta: EditMeta): void => {
    editingRef.current = true;

    // `undefined` = the user cleared an optional field. It is dropped from the bag; `setParams` merges
    // over the element's existing params, so an omitted key keeps its current value rather than erroring.
    const draftNext = setField(draftRef.current, field, next);
    draftRef.current = draftNext;
    setDraft(draftNext);

    runnerRef.current!.run(async () => {
      await dispatch(
        'core.setParams',
        { elementId: element.id, params: draftNext },
        // ⚠ A slider drag coalesces at the kernel; a discrete edit (typing, a checkbox) commits plainly.
        meta.live ? { coalesceKey: `setParams:${element.id}` } : {},
      );
    });
  };

  return (
    <SchemaForm
      schema={type.parameterSchema}
      value={draft}
      onEdit={onEdit}
      idPrefix={`prop-${element.id}`}
    />
  );
}
