// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * `Ribbon` — one button per command, GENERATED from the registry (`describeCommands`). **This is the
 * P4 ribbon criterion, and it is the exact mirror of the agent tool list** (D21): the same
 * `describeCommands` projection that tells an agent what it can do draws the human's buttons. Register
 * a command in `CORE_COMMANDS` and a button appears here with zero edits to this file — there is no
 * hand-maintained list of verbs, because a hand-maintained list drifts from the one that governs
 * behaviour.
 *
 * Clicking a verb opens a dialog whose form is `SchemaForm` over the command's `argsSchema` — again the
 * same schema language, the same renderer as the property panel. Submitting dispatches through the one
 * door (`dispatch` → `doc.execute`), so a button press and an agent's `window.bunyan` call are the
 * identical operation.
 *
 * Undo/redo sit alongside the generated verbs. They are NOT commands (you cannot "undo the undo" as an
 * authored edit — see `document.ts`), so they are deliberately not in `describeCommands`; they drive
 * `doc.undo()`/`doc.redo()` directly through the handlers App passes down.
 */

import { useState } from 'react';

import type { CommandDescriptor, ParamSchema, ParamValue, Params } from '@bunyan/document';
import { withDefaults } from '@bunyan/document';

import { SchemaForm, setField } from './SchemaForm';
import type { Dispatch } from '../edit/runner';

export interface RibbonProps {
  readonly commands: readonly CommandDescriptor[];
  readonly dispatch: Dispatch;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  /** Bumped after any successful command so App can re-derive selection/geometry. */
  readonly onDone: (edit: import('@bunyan/document').UndoableEdit) => void;
}

export function Ribbon({
  commands,
  dispatch,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onDone,
}: RibbonProps) {
  const [active, setActive] = useState<CommandDescriptor | null>(null);

  return (
    <div className="ribbon">
      <div className="ribbon-group">
        {commands.map((command) => (
          <button
            key={command.name}
            type="button"
            className="ribbon-button"
            title={command.description ?? command.name}
            onClick={() => {
              setActive(command);
            }}
          >
            {command.label}
          </button>
        ))}
      </div>

      <div className="ribbon-group ribbon-history">
        <button type="button" className="ribbon-button" onClick={onUndo} disabled={!canUndo}>
          Undo
        </button>
        <button type="button" className="ribbon-button" onClick={onRedo} disabled={!canRedo}>
          Redo
        </button>
      </div>

      {active !== null && (
        <CommandDialog
          command={active}
          dispatch={dispatch}
          onClose={(edit) => {
            setActive(null);
            if (edit !== null) onDone(edit);
          }}
        />
      )}
    </div>
  );
}

function CommandDialog({
  command,
  dispatch,
  onClose,
}: {
  readonly command: CommandDescriptor;
  readonly dispatch: Dispatch;
  readonly onClose: (edit: import('@bunyan/document').UndoableEdit | null) => void;
}) {
  const schema = command.argsSchema as ParamSchema;
  const [args, setArgs] = useState<Params>(() => withDefaults(schema, {}));
  const [busy, setBusy] = useState(false);
  const [rejected, setRejected] = useState(false);

  const onEdit = (field: string, next: ParamValue | undefined): void => {
    setArgs((prev) => setField(prev, field, next));
  };

  const run = async (): Promise<void> => {
    setBusy(true);
    setRejected(false);
    const edit = await dispatch(command.name, args);
    setBusy(false);
    if (edit !== null) onClose(edit);
    else setRejected(true); // App's banner already says why; keep the dialog open to fix the args.
  };

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        onClose(null);
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-label={command.label}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <header className="modal-header">
          <h3>{command.label}</h3>
          <code className="modal-verb">{command.name}</code>
        </header>
        {command.description !== undefined && <p className="modal-desc">{command.description}</p>}

        <SchemaForm schema={schema} value={args} onEdit={onEdit} idPrefix={`cmd-${command.name}`} />

        {rejected && (
          <p className="modal-rejected">Rejected — see the message in the header bar.</p>
        )}

        <footer className="modal-footer">
          <button
            type="button"
            className="ribbon-button"
            onClick={() => {
              onClose(null);
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ribbon-button primary"
            onClick={() => void run()}
            disabled={busy}
          >
            {busy ? 'Running…' : 'Run'}
          </button>
        </footer>
      </div>
    </div>
  );
}
