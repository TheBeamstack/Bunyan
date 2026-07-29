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

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { bootstrap } from './bootstrap';
import type { BunyanApp, InitialDocument } from './bootstrap';
import { seedDemoScene } from './scaffold/seed';
import {
  createStore,
  docKey,
  docName,
  latestAutosaveKey,
  listDocKeys,
  readInitial,
  requestOpen,
  takeOpenRequest,
} from './storage/documentStorage';
import type { IndexedDbStore } from './storage/indexeddb';
import { ViewportCanvas } from './render/ViewportCanvas';
import type { RenderPart, PickResult } from './render/Viewport';
import {
  EMPTY_FILTER,
  isPartVisible,
  isPristine,
  toggleHidden,
  toggleInSet,
  type ViewFilter,
} from './view/viewFilter';
import { encodeSubShapeRef } from '@bunyan/protocol';
import { Ribbon } from './ui/Ribbon';
import { PropertyPanel } from './ui/PropertyPanel';
import { formatError, isSuperseded } from './edit/runner';
import type { Dispatch } from './edit/runner';
import { withUiRefresh } from './edit/agentRefresh';
import {
  Autosave,
  describeCommands,
  saveBnn,
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

/** The selected element's parts render in this colour — a display recolour (design §5/§8), not a mesh
 *  change. It rides the batch's instance-colour swap, so selecting never re-tessellates. */
const SELECTION_COLOR = 0x4aa3ff;

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
  // View state (P4.5 design §7) — hide/isolate/type/discipline. App-layer, touches no contract: it
  // decides what the viewport draws, never what the model is.
  const [filter, setFilter] = useState<ViewFilter>(EMPTY_FILTER);
  const [quantities, setQuantities] = useState<readonly PartQuantity[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  // Bumped after every committed edit — the signal that the document changed under React's feet.
  const [version, bump] = useReducer((n: number) => n + 1, 0);

  // ---- Persistence (browser storage, plan P4 step 5). The store + autosave live in a ref (plain
  //      objects, not React state); the file list / current name / recover offer are state. ----------
  const storageRef = useRef<{ store: IndexedDbStore; autosave: Autosave } | null>(null);
  const [savedDocs, setSavedDocs] = useState<readonly string[]>([]);
  /** The store key of the document currently open (a `doc/…bnn`), or null for the unsaved demo/scratch. */
  const [currentDoc, setCurrentDoc] = useState<string | null>(null);
  const [saveName, setSaveName] = useState('');
  /** A newer autosave than this session was offered on boot — its store key, to recover on demand. */
  const [recoverKey, setRecoverKey] = useState<string | null>(null);
  const [autosavedAt, setAutosavedAt] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    let started: BunyanApp | null = null;

    void (async () => {
      try {
        // Persistence boot (plan P4 step 5). If a file was chosen (reload-based open), load it; else
        // boot empty and seed the demo. A stored file that fails to parse falls back to the demo rather
        // than bricking the app — a `.bnn` is a file a user can be sent (D43 spirit).
        const store = createStore();
        const openKey = takeOpenRequest();
        let initial: InitialDocument | undefined;
        if (openKey !== null) {
          try {
            initial = await readInitial(store, openKey);
          } catch {
            initial = undefined;
          }
        }

        const bunyan = await bootstrap(initial);
        started = bunyan;
        // Unmounted while the ~14 MB kernel was booting (StrictMode double-mount): dispose it now,
        // because the cleanup below ran before `started` was set.
        if (!live) {
          bunyan.dispose();
          return;
        }

        let selectId: ElementId | null;
        if (initial === undefined) {
          selectId = await seedDemoScene(bunyan.doc);
        } else {
          // An opened file: select its first element so the panel has something to show.
          selectId = Object.keys(bunyan.doc.scene.elements)[0] ?? null;
        }
        if (!live) return;

        storageRef.current = { store, autosave: new Autosave(store) };
        setCurrentDoc(openKey !== null && openKey.startsWith('doc/') ? openKey : null);
        setSavedDocs(await listDocKeys(store));
        if (!live) return;
        // Offer recovery only on a fresh (non-open) boot: a newer autosave than any file means the last
        // session ended with unsaved work.
        if (openKey === null) {
          const latest = latestAutosaveKey(await store.list());
          if (!live) return;
          if (latest !== undefined) setRecoverKey(latest);
        }

        // ⚠ Wire the agent surface (D22) HERE, on the surviving app only — never inside `bootstrap()`,
        // or StrictMode's discarded first mount races its dead, unseeded document onto the global.
        // ⚠ Wrapped so an agent edit REFRESHES THE VIEW like a human edit does (the D19 equivalence gap
        // Entry 26 found): `bump` is React's stable reducer dispatch, safe to close over here.
        window.bunyan = withUiRefresh(bunyan.agent, bump);

        setApp(bunyan);
        setSelectedId(selectId);
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

  // ---- Autosave (plan P4 step 5). After a real edit, debounce, then snapshot the whole `.bnn` into the
  //      ring. ⚠ The journal is `changeFeed()`, NEVER `history()` (the moat-losing bug). Recovery is an
  //      ordinary load of the snapshot, so it goes through the exact path a normal open does. ----------
  useEffect(() => {
    if (app === null || version === 0) return; // nothing to save on the pristine boot
    const storage = storageRef.current;
    if (storage === null) return;
    const handle = setTimeout(() => {
      void (async () => {
        try {
          const bytes = saveBnn(app.doc.scene, {
            kernelBuildId: app.kernel.buildId,
            journal: app.doc.changeFeed(),
            revision: app.doc.revision,
          });
          const key = await storage.autosave.snapshot(bytes);
          setAutosavedAt(key);
        } catch {
          // An autosave failure must never surface as a user error; the next edit tries again.
        }
      })();
    }, 1500);
    return () => {
      clearTimeout(handle);
    };
  }, [app, version]);

  /** Save the current scene under a name (persist to IndexedDB). Uses the journal, not the undo stack. */
  const saveDoc = useCallback(
    async (name: string): Promise<void> => {
      const storage = storageRef.current;
      if (app === null || storage === null) return;
      const trimmed = name.trim();
      if (trimmed === '') return;
      try {
        const bytes = saveBnn(app.doc.scene, {
          kernelBuildId: app.kernel.buildId,
          journal: app.doc.changeFeed(),
          revision: app.doc.revision,
        });
        const key = docKey(trimmed);
        await storage.store.write(key, bytes);
        setCurrentDoc(key);
        setSavedDocs(await listDocKeys(storage.store));
        setBanner(`Saved “${trimmed}”`);
      } catch (error) {
        setBanner(formatError(error));
      }
    },
    [app],
  );

  /** Open a stored document by reloading into it (see `documentStorage.ts` — reload-based open). */
  const openDoc = useCallback((key: string): void => {
    requestOpen(key);
    window.location.reload();
  }, []);

  const deleteDoc = useCallback(async (key: string): Promise<void> => {
    const storage = storageRef.current;
    if (storage === null) return;
    await storage.store.remove(key);
    setSavedDocs(await listDocKeys(storage.store));
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
      const isSelected = element.id === selectedId;
      parts.forEach((part, i) => {
        // Hide/isolate/type/discipline (design §7): a filtered-out part is simply absent from the array,
        // so the viewport's diff removes it — no separate "hidden" path in the renderer.
        if (!isPartVisible(filter, element.id, element.typeId, part.discipline)) return;
        out.push({
          elementId: element.id,
          nodeId: part.nodeId,
          partName: part.name,
          handle: part.handle,
          // Selection is a display recolour (design §5/§8): a changed colour for an unchanged handle is
          // the batch's cheap recolour path, never a re-tessellation.
          color: isSelected ? SELECTION_COLOR : PART_COLORS[i % PART_COLORS.length]!,
        });
      });
    }
    return out;
  }, [app, elements, version, selectedId, filter]);

  /** The types + disciplines actually present in the scene — the universe the View filter offers. */
  const present = useMemo(() => {
    if (app === null)
      return { types: [] as { id: string; label: string }[], disciplines: [] as string[] };
    const typeIds = new Set<string>();
    const disciplines = new Set<string>();
    for (const element of elements) {
      typeIds.add(element.typeId);
      app.doc.partsOf(element.id)?.forEach((p) => disciplines.add(p.discipline));
    }
    const types = [...typeIds].map((id) => ({
      id,
      label: app.doc.registries.types.get(id)?.label ?? id,
    }));
    return { types, disciplines: [...disciplines].sort() };
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
    setSelectedId(hit === null ? null : hit.elementId);
  }, []);

  // ---- View actions (design §7). All app-layer; none reaches the document. ----
  const hideSelected = useCallback(() => {
    if (selectedId !== null) setFilter((f) => toggleHidden(f, selectedId));
  }, [selectedId]);
  const isolateSelected = useCallback(() => {
    if (selectedId === null) return;
    setFilter((f) => ({ ...f, isolated: f.isolated === selectedId ? null : selectedId }));
  }, [selectedId]);
  const showAll = useCallback(() => {
    setFilter(EMPTY_FILTER);
  }, []);
  const toggleType = useCallback(
    (id: string) => {
      setFilter((f) => ({
        ...f,
        types: toggleInSet(
          f.types,
          id,
          present.types.map((t) => t.id),
        ),
      }));
    },
    [present.types],
  );
  const toggleDiscipline = useCallback(
    (d: string) => {
      setFilter((f) => ({ ...f, disciplines: toggleInSet(f.disciplines, d, present.disciplines) }));
    },
    [present.disciplines],
  );

  // ---- Keyboard (design §7) — the app's SINGLE keydown owner; there was not one before. Esc clears
  //      selection; Ctrl/Cmd+Z / +Y (or +Shift+Z) drive undo/redo. A key typed into a form field is
  //      never hijacked. ----
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const t = e.target as HTMLElement | null;
      if (t !== null && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))
        return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (e.key === 'Escape') {
        setSelectedId(null);
        setPicked(null);
      } else if (mod && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [undo, redo]);

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
        {recoverKey !== null && (
          <span className="banner" role="alert">
            An autosaved session was found.
            <button
              type="button"
              className="banner-dismiss"
              title="Reload into the recovered session"
              onClick={() => {
                openDoc(recoverKey);
              }}
            >
              Recover
            </button>
            <button
              type="button"
              className="banner-dismiss"
              onClick={() => {
                setRecoverKey(null);
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
          {app !== null && (
            <FilesPanel
              savedDocs={savedDocs}
              currentDoc={currentDoc}
              saveName={saveName}
              autosavedAt={autosavedAt}
              onSaveNameChange={setSaveName}
              onSave={saveDoc}
              onOpen={openDoc}
              onDelete={deleteDoc}
            />
          )}
          {app !== null && (
            <ViewPanel
              types={present.types}
              disciplines={present.disciplines}
              filter={filter}
              hasSelection={selectedId !== null}
              onHide={hideSelected}
              onIsolate={isolateSelected}
              onShowAll={showAll}
              onToggleType={toggleType}
              onToggleDiscipline={toggleDiscipline}
            />
          )}
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

/**
 * The persistence panel (plan P4 step 5): save the current scene under a name into browser storage, and
 * open/delete saved documents. Opening reloads into the chosen file (see `documentStorage.ts`). Autosave
 * runs on its own in `App`; this shows its last snapshot.
 */
function FilesPanel({
  savedDocs,
  currentDoc,
  saveName,
  autosavedAt,
  onSaveNameChange,
  onSave,
  onOpen,
  onDelete,
}: {
  readonly savedDocs: readonly string[];
  readonly currentDoc: string | null;
  readonly saveName: string;
  readonly autosavedAt: string | null;
  readonly onSaveNameChange: (name: string) => void;
  readonly onSave: (name: string) => void | Promise<void>;
  readonly onOpen: (key: string) => void;
  readonly onDelete: (key: string) => void | Promise<void>;
}) {
  const current = currentDoc === null ? null : docName(currentDoc);
  // Default the save name to the open document's name, so re-saving overwrites it in place.
  const nameToSave = saveName.trim() === '' ? (current ?? '') : saveName;
  return (
    <section className="panel-section">
      <h2>Files</h2>
      <p className="hint">
        {current === null ? 'Unsaved scratch document.' : `Open: ${current}.`}
        {autosavedAt !== null && ' Autosaved.'}
      </p>
      <div className="field">
        <span className="field-control" style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            aria-label="Document name"
            placeholder={current ?? 'document name'}
            value={saveName}
            onChange={(e) => {
              onSaveNameChange(e.target.value);
            }}
          />
          <button
            type="button"
            disabled={nameToSave.trim() === ''}
            onClick={() => {
              void onSave(nameToSave);
            }}
          >
            Save
          </button>
        </span>
      </div>
      {savedDocs.length > 0 && (
        <ul className="problem-list">
          {savedDocs.map((key) => (
            <li key={key} className="problem">
              <button
                type="button"
                className="problem-link"
                title="Open (reloads into this document)"
                onClick={() => {
                  onOpen(key);
                }}
              >
                {docName(key)}
                {key === currentDoc ? ' ●' : ''}
              </button>
              <button
                type="button"
                className="banner-dismiss"
                title="Delete this document"
                onClick={() => {
                  void onDelete(key);
                }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * The View panel (P4.5 design §7): hide / isolate the selected element, and filter what the viewport
 * draws by type (element level) and discipline (part level, D45). Every action is app-layer — it changes
 * what is drawn, never the model. `null` in a filter set means "all shown"; a checkbox is checked when
 * its value passes the filter.
 */
function ViewPanel({
  types,
  disciplines,
  filter,
  hasSelection,
  onHide,
  onIsolate,
  onShowAll,
  onToggleType,
  onToggleDiscipline,
}: {
  readonly types: readonly { readonly id: string; readonly label: string }[];
  readonly disciplines: readonly string[];
  readonly filter: ViewFilter;
  readonly hasSelection: boolean;
  readonly onHide: () => void;
  readonly onIsolate: () => void;
  readonly onShowAll: () => void;
  readonly onToggleType: (id: string) => void;
  readonly onToggleDiscipline: (d: string) => void;
}) {
  const pristine = isPristine(filter);
  const hiddenCount = filter.hidden.size;
  return (
    <section className="panel-section">
      <h2>View</h2>
      <p className="hint">
        {pristine
          ? 'Showing everything.'
          : `${filter.isolated !== null ? 'Isolating one element. ' : ''}${
              hiddenCount > 0 ? `${hiddenCount} hidden. ` : ''
            }Filtered.`}
      </p>
      <div className="field" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" disabled={!hasSelection} onClick={onHide}>
          Hide
        </button>
        <button type="button" disabled={!hasSelection} onClick={onIsolate}>
          {filter.isolated !== null ? 'Un-isolate' : 'Isolate'}
        </button>
        <button type="button" disabled={pristine} onClick={onShowAll}>
          Show all
        </button>
      </div>
      {types.length > 1 && (
        <fieldset className="view-filter">
          <legend>Types</legend>
          {types.map((t) => (
            <label key={t.id} className="view-filter-row">
              <input
                type="checkbox"
                checked={filter.types === null || filter.types.has(t.id)}
                onChange={() => {
                  onToggleType(t.id);
                }}
              />
              {t.label}
            </label>
          ))}
        </fieldset>
      )}
      {disciplines.length > 1 && (
        <fieldset className="view-filter">
          <legend>Disciplines</legend>
          {disciplines.map((d) => (
            <label key={d} className="view-filter-row">
              <input
                type="checkbox"
                checked={filter.disciplines === null || filter.disciplines.has(d)}
                onChange={() => {
                  onToggleDiscipline(d);
                }}
              />
              {d}
            </label>
          ))}
        </fieldset>
      )}
    </section>
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
