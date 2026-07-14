/**
 * The P4 shell. Boots the kernel through `bootstrap()`, seeds a scaffold wall through the command
 * layer, and gives it an editing UI: a registry-generated ribbon and a schema-driven property panel.
 * The spine it proves, end to end:
 *
 *     ribbon / property panel ─►  dispatch  ─►  DocumentContext.execute (D19)  ─►  OCCT kernel
 *                                                     │
 *                                     parts (D30) ────┴──► tessellate ──► three.js viewport
 *
 * ⚠ APP HOLDS NO KERNEL CLIENT. It holds a `DocumentContext` (author) and a `RenderGateway` (draw),
 * both handed over by `bootstrap.ts` — the one file allowed to touch `@bunyan/kernel-client` (D19). The
 * ribbon and panel reach the document only through `dispatch`, the one door every actor shares.
 *
 * ⚠ REFRESH MODEL. `DocumentContext` is not React-reactive: a command mutates the scene + the WASM heap
 * in place. So a successful `dispatch` bumps `version`, and everything derived (the render parts, the
 * selected element, its quantities) recomputes from the document. Picking (P4 step 4), storage (step 5)
 * and WebGPU (step 6) build on this spine without reshaping it.
 */

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';

import { bootstrap } from './bootstrap';
import type { BunyanApp } from './bootstrap';
import { seedDemoScene } from './scaffold/seed';
import { ViewportCanvas } from './render/ViewportCanvas';
import type { RenderPart } from './render/Viewport';
import { Ribbon } from './ui/Ribbon';
import { PropertyPanel } from './ui/PropertyPanel';
import { formatError, isSuperseded } from './edit/runner';
import type { Dispatch } from './edit/runner';
import {
  describeCommands,
  type CommandDescriptor,
  type Element,
  type ElementId,
  type ExecuteOptions,
  type Params,
  type PartQuantity,
  type UndoableEdit,
} from '@bunyan/document';
import './App.css';

/** A stable per-part display palette (foundation-pass placeholder for real material appearance). */
const PART_COLORS = [0x9aa0a6, 0xf4d35e, 0xe8e8e8, 0x7fb069, 0xc45b5b];

type Status =
  | { readonly kind: 'booting' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'error'; readonly message: string };

export function App() {
  const [app, setApp] = useState<BunyanApp | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'booting' });
  const [selectedId, setSelectedId] = useState<ElementId | null>(null);
  const [quantities, setQuantities] = useState<readonly PartQuantity[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  // Bumped after every committed edit — the signal that the document changed under React's feet.
  const [version, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    let live = true;
    let started: BunyanApp | null = null;

    void (async () => {
      try {
        const bunyan = await bootstrap();
        started = bunyan;
        // Unmounted while the ~14 MB kernel was booting (StrictMode double-mount): dispose it now,
        // because the cleanup below ran before `started` was set.
        if (!live) {
          bunyan.dispose();
          return;
        }

        const wallId = await seedDemoScene(bunyan.doc);
        if (!live) return;

        // ⚠ Wire the agent surface (D22) HERE, on the surviving app only — never inside `bootstrap()`,
        // or StrictMode's discarded first mount races its dead, unseeded document onto the global.
        window.bunyan = bunyan.agent;

        setApp(bunyan);
        setSelectedId(wallId);
        setStatus({ kind: 'ready' });
      } catch (error) {
        if (!live) return;
        setStatus({ kind: 'error', message: formatError(error) });
      }
    })();

    return () => {
      live = false;
      started?.dispose();
    };
  }, []);

  /**
   * THE ONE DOOR, as a bound function (D19). Wraps `doc.execute`: on success it bumps `version` so the
   * viewport and panels re-derive; on a real failure it raises the banner; a superseded drag frame is
   * swallowed silently (the newer frame is already on its way). It never throws — callers read the
   * returned edit (`null` ⇒ rejected/superseded).
   */
  const dispatch = useCallback<Dispatch>(
    async (
      commandId: string,
      args: Params,
      options?: ExecuteOptions,
    ): Promise<UndoableEdit | null> => {
      if (app === null) return null;
      try {
        const edit = await app.doc.execute(commandId, args, options ?? {});
        setBanner(null);
        bump();
        return edit;
      } catch (error) {
        if (isSuperseded(error)) return null;
        setBanner(formatError(error));
        return null;
      }
    },
    [app],
  );

  const onEditError = (e: unknown): void => {
    setBanner(formatError(e));
  };
  const undo = useCallback(() => {
    if (app === null) return;
    void app.doc.undo().then(bump, onEditError);
  }, [app]);
  const redo = useCallback(() => {
    if (app === null) return;
    void app.doc.redo().then(bump, onEditError);
  }, [app]);

  // ---- Derived state. Recomputed whenever the document changes (`version`) or selection moves. -----

  const commands = useMemo<readonly CommandDescriptor[]>(
    () => (app === null ? [] : describeCommands(app.doc.registries)),
    [app],
  );

  // ⚠ `version` is a dependency on purpose — the eslint exhaustive-deps rule cannot see that `app.doc`
  // is mutable, but a commit changes what these reads return without changing `app`.
  const elements = useMemo<readonly Element[]>(
    () => (app === null ? [] : Object.values(app.doc.scene.elements)),
    [app, version],
  );

  /** Every built element's parts, flattened for the viewport — a building is many solids (D30). */
  const renderParts = useMemo<readonly RenderPart[]>(() => {
    if (app === null) return [];
    const out: RenderPart[] = [];
    for (const element of elements) {
      const parts = app.doc.partsOf(element.id);
      if (parts === undefined) continue;
      parts.forEach((part, i) =>
        out.push({ handle: part.handle, color: PART_COLORS[i % PART_COLORS.length]! }),
      );
    }
    return out;
  }, [app, elements, version]);

  const selected = useMemo(() => {
    if (app === null || selectedId === null) return null;
    const element = app.doc.scene.elements[selectedId];
    if (element === undefined) return null;
    const type = app.doc.registries.types.get(element.typeId);
    if (type === undefined) return null;
    return { element, type };
  }, [app, selectedId, version]);

  // Quantities for the selected element — measured from the B-Rep (async), refreshed on every edit.
  useEffect(() => {
    if (app === null || selected === null) {
      setQuantities([]);
      return;
    }
    let live = true;
    void app.doc
      .quantities(selected.element.id)
      .then((q) => {
        if (live) setQuantities(q.parts);
      })
      .catch(() => {
        if (live) setQuantities([]);
      });
    return () => {
      live = false;
    };
  }, [app, selected, version]);

  const kernelLabel = useMemo(() => {
    if (app === null) return '—';
    return `${app.kernel.name} ${app.kernel.kernelVersion} · ${app.kernel.buildId}`;
  }, [app]);

  /** A command finished — if it created an element, select it so its parts and params come up. */
  const onCommandDone = useCallback((edit: UndoableEdit) => {
    const created = edit.changes.find((c) => c.collection === 'elements' && c.after !== undefined);
    if (created !== undefined) setSelectedId(created.id);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <span className="brand">Bunyan</span>
        <span className="status" data-kind={status.kind}>
          {status.kind === 'booting' && 'Booting OCCT kernel…'}
          {status.kind === 'ready' && `Kernel: ${kernelLabel}`}
          {status.kind === 'error' && `Error: ${status.message}`}
        </span>
        {banner !== null && (
          <span className="banner" role="alert">
            {banner}
            <button
              type="button"
              className="banner-dismiss"
              onClick={() => {
                setBanner(null);
              }}
            >
              ✕
            </button>
          </span>
        )}
      </header>

      {app !== null && (
        <Ribbon
          commands={commands}
          dispatch={dispatch}
          onUndo={undo}
          onRedo={redo}
          canUndo={app.doc.canUndo}
          canRedo={app.doc.canRedo}
          onDone={onCommandDone}
        />
      )}

      <main className="app-body">
        {app !== null && <ViewportCanvas render={app.render} parts={renderParts} />}
        {status.kind === 'error' && <div className="overlay error">{status.message}</div>}

        <aside className="panel">
          {selected !== null ? (
            <>
              <ElementPicker elements={elements} selectedId={selectedId} onSelect={setSelectedId} />

              <section className="panel-section">
                <h2>{selected.element.name ?? selected.element.id}</h2>
                <p className="hint">
                  {selected.type.label} · {selected.element.typeId}. Edit a parameter and the
                  geometry rebuilds from the recipe (D19).
                </p>
                <PropertyPanel
                  element={selected.element}
                  type={selected.type}
                  dispatch={dispatch}
                />
              </section>

              <section className="panel-section">
                <h2>Quantities</h2>
                <p className="hint">
                  Measured from the B-Rep (basis: exact), per part, per material (D30/D45).
                </p>
                <table>
                  <thead>
                    <tr>
                      <th>Part</th>
                      <th>Material</th>
                      <th>Discipline</th>
                      <th>Volume (mm³)</th>
                      <th>Mass (kg)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quantities.map((q) => (
                      <tr key={q.name}>
                        <td>{q.name}</td>
                        <td>{q.materialName}</td>
                        <td>{q.discipline}</td>
                        <td>{Math.round(q.volume).toLocaleString()}</td>
                        {/* ⚠ D45 — absent mass renders "—", never "0 kg". `mass` is already kg. */}
                        <td>{q.mass === undefined ? '—' : q.mass.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          ) : (
            <p className="hint">{status.kind === 'ready' ? 'No element selected.' : 'Loading…'}</p>
          )}
        </aside>
      </main>
    </div>
  );
}

function ElementPicker({
  elements,
  selectedId,
  onSelect,
}: {
  readonly elements: readonly Element[];
  readonly selectedId: ElementId | null;
  readonly onSelect: (id: ElementId) => void;
}) {
  if (elements.length <= 1) return null;
  return (
    <section className="panel-section">
      <label className="field" htmlFor="element-picker">
        <span className="field-label">Element</span>
        <span className="field-control">
          <select
            id="element-picker"
            value={selectedId ?? ''}
            onChange={(e) => {
              onSelect(e.target.value);
            }}
          >
            {elements.map((element) => (
              <option key={element.id} value={element.id}>
                {element.name ?? element.id}
              </option>
            ))}
          </select>
        </span>
      </label>
    </section>
  );
}
