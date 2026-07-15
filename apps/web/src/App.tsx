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
import type { RenderPart, PickResult } from './render/Viewport';
import { encodeSubShapeRef } from '@bunyan/protocol';
import { Ribbon } from './ui/Ribbon';
import { PropertyPanel } from './ui/PropertyPanel';
import { formatError, isSuperseded } from './edit/runner';
import type { Dispatch } from './edit/runner';
import { withUiRefresh } from './edit/agentRefresh';
import {
  describeCommands,
  type BrokenReference,
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
  // The last face the user clicked (P4 step 4) — carries its `SubShapeRef`. This is the substrate
  // P4.5 places a window on: a picked face resolves to a token no human ever types.
  const [picked, setPicked] = useState<PickResult | null>(null);
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
        // ⚠ Wrapped so an agent edit REFRESHES THE VIEW like a human edit does (the D19 equivalence gap
        // Entry 26 found): `bump` is React's stable reducer dispatch, safe to close over here.
        window.bunyan = withUiRefresh(bunyan.agent, bump);

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

  /** Every built element's parts, flattened for the viewport — a building is many solids (D30). Each
   *  carries its identity (element id, part name, stable `nodeId`) so the viewport can cache a mesh
   *  against it and re-tessellate only what changed (step 2b). */
  const renderParts = useMemo<readonly RenderPart[]>(() => {
    if (app === null) return [];
    const out: RenderPart[] = [];
    for (const element of elements) {
      const parts = app.doc.partsOf(element.id);
      if (parts === undefined) continue;
      parts.forEach((part, i) =>
        out.push({
          elementId: element.id,
          nodeId: part.nodeId,
          partName: part.name,
          handle: part.handle,
          color: PART_COLORS[i % PART_COLORS.length]!,
        }),
      );
    }
    return out;
  }, [app, elements, version]);

  /**
   * ⚠ THE TWO FAILURE STATES THE DOCUMENT MODEL EXISTS TO EXPOSE (P4 step 10). An element the app cannot
   * build (an unregistered/future Type — a Miqdar column, a plugin) is NOT dropped: it round-trips
   * verbatim through save (D43), so it must be SHOWN, not silently skipped. Likewise a broken host ref
   * (domain rule 3). The viewport can't draw either (no geometry), so they surface here instead — the one
   * thing D43 forbids is an unbuildable element being invisible.
   */
  const problems = useMemo(() => {
    if (app === null) return { unbuildable: [], broken: [] };
    return { unbuildable: app.doc.unbuildable(), broken: app.doc.brokenRefs() };
  }, [app, version]);

  const unbuildableIds = useMemo(
    () => new Set(problems.unbuildable.map((u) => u.elementId)),
    [problems],
  );

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

  /** A face was clicked in the viewport (P4 step 4) — select its element and keep the picked face. */
  const onPick = useCallback((hit: PickResult | null) => {
    setPicked(hit);
    if (hit !== null) setSelectedId(hit.elementId);
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
        {app !== null && <ViewportCanvas render={app.render} parts={renderParts} onPick={onPick} />}
        {status.kind === 'error' && <div className="overlay error">{status.message}</div>}

        <aside className="panel">
          <ProblemsPanel
            unbuildable={problems.unbuildable}
            broken={problems.broken}
            elements={elements}
            onSelect={setSelectedId}
          />
          {selected !== null ? (
            <>
              <ElementPicker
                elements={elements}
                selectedId={selectedId}
                unbuildableIds={unbuildableIds}
                onSelect={setSelectedId}
              />

              <section className="panel-section">
                <h2>{selected.element.name ?? selected.element.id}</h2>
                <p className="hint">
                  {selected.type.label} · {selected.element.typeId}. Edit a parameter and the
                  geometry rebuilds from the recipe (D19).
                </p>
                {picked !== null && picked.elementId === selected.element.id && (
                  <p className="picked" title="Click a face in the viewport to pick its sub-shape">
                    Picked face · <strong>{picked.partName}</strong> ·{' '}
                    <code>{encodeSubShapeRef(picked.faceRef)}</code>
                  </p>
                )}
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
  unbuildableIds,
  onSelect,
}: {
  readonly elements: readonly Element[];
  readonly selectedId: ElementId | null;
  readonly unbuildableIds: ReadonlySet<ElementId>;
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
                {(element.name ?? element.id) +
                  (unbuildableIds.has(element.id) ? ' ⚠ unbuildable' : '')}
              </option>
            ))}
          </select>
        </span>
      </label>
    </section>
  );
}

/**
 * The two first-class failure states, surfaced (P4 step 10). ⚠ NEITHER is ever offered a "fix" or a
 * "drop": an unbuildable element is somebody's data the app merely can't build (D43) — dropping it
 * deletes their columns from a file they opened to look at — and a broken ref is healed only by a manual
 * retarget, which is itself an `UndoableEdit`. This panel names them and stops; it does not act.
 */
function ProblemsPanel({
  unbuildable,
  broken,
  elements,
  onSelect,
}: {
  readonly unbuildable: readonly { readonly elementId: ElementId; readonly reason: string }[];
  readonly broken: readonly BrokenReference[];
  readonly elements: readonly Element[];
  readonly onSelect: (id: ElementId) => void;
}) {
  if (unbuildable.length === 0 && broken.length === 0) return null;
  const nameOf = (id: ElementId): string => elements.find((e) => e.id === id)?.name ?? id;

  return (
    <section className="panel-section problems">
      <h2>Problems</h2>
      {unbuildable.length > 0 && (
        <>
          <p className="hint">
            The app cannot build these elements (an unregistered or newer Type). They are preserved
            exactly and never modified (D43) — not dropped.
          </p>
          <ul className="problem-list">
            {unbuildable.map((u) => (
              <li key={u.elementId} className="problem unbuildable">
                <button
                  type="button"
                  className="problem-link"
                  onClick={() => {
                    onSelect(u.elementId);
                  }}
                >
                  {nameOf(u.elementId)}
                </button>
                <span className="problem-reason">{u.reason}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {broken.length > 0 && (
        <>
          <p className="hint">
            These elements are hosted on a sub-shape that no longer resolves. Retarget them manually
            — they are never auto-healed (domain rule 3).
          </p>
          <ul className="problem-list">
            {broken.map((b) => (
              <li key={`${b.elementId}:${b.ref}`} className="problem broken-ref">
                <button
                  type="button"
                  className="problem-link"
                  onClick={() => {
                    onSelect(b.elementId);
                  }}
                >
                  {nameOf(b.elementId)}
                </button>
                <span className="problem-reason">
                  {b.reason} · <code>{b.ref}</code>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
