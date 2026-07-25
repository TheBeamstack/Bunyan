/**
 * THE BROWSER SCALE PAGE (plan P4 step 9b, D66 axes (b) + (d)).
 *
 * Boots the real kernel + document (D19 — through `bootstrap()`, never a `KernelClient`), builds a small
 * real reference set, then drives `ScaleHarness` to produce the two numbers the P5 freeze is held on
 * (Entry 54): draw calls + frame time at the ~10,000-element target, and incremental edit latency at that
 * scale. Results are rendered as a table, logged to the console, and parked on `window.__scaleResults`
 * so the measurement can be read back verbatim.
 *
 * ⚠ Not StrictMode (see `scaleMain.tsx`): the measurement is heavy and must run once, not twice.
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

import { bootstrap } from '../bootstrap';
import type { BunyanApp } from '../bootstrap';
import {
  ScaleHarness,
  SWEEP_SCALES,
  EDIT_SCALES,
  TARGET_PARTS,
  type FrameStats,
  type EditLatency,
  type ScaleResults,
} from './harness';

type Phase =
  | { readonly kind: 'booting' }
  | { readonly kind: 'building' }
  | { readonly kind: 'sweeping'; readonly at: number }
  | { readonly kind: 'editing' }
  | { readonly kind: 'done' }
  | { readonly kind: 'error'; readonly message: string };

export function ScalePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'booting' });
  const [log, setLog] = useState<readonly string[]>([]);
  const [sweep, setSweep] = useState<readonly FrameStats[]>([]);
  const [edits, setEdits] = useState<readonly EditLatency[]>([]);
  const [results, setResults] = useState<ScaleResults | null>(null);
  const [kernelLabel, setKernelLabel] = useState('—');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    let live = true;
    let app: BunyanApp | null = null;
    let harness: ScaleHarness | null = null;
    const note = (line: string): void => {
      if (live) setLog((prev) => [...prev, line]);
    };

    void (async () => {
      try {
        setPhase({ kind: 'booting' });
        app = await bootstrap();
        if (!live) {
          app.dispose();
          return;
        }
        setKernelLabel(`${app.kernel.name} ${app.kernel.kernelVersion} · ${app.kernel.buildId}`);
        note(`kernel booted: ${app.kernel.name} ${app.kernel.kernelVersion}`);

        harness = new ScaleHarness(canvas, app.doc, app.render);
        const dpr = harness.canvasInfo;
        note(`canvas ${String(dpr.width)}×${String(dpr.height)} px (dpr ${String(dpr.dpr)})`);

        // 1) A real reference building — proves the D19 → kernel → tessellate → three.js pipeline runs
        //    in-browser, and gives the pooled real geometry the filler shares.
        setPhase({ kind: 'building' });
        const reference = await harness.buildReference();
        if (!live) return;
        note(
          `reference built: ${String(reference.elements)} walls, ${String(reference.parts)} real parts ` +
            `in ${reference.buildMs.toFixed(0)} ms`,
        );

        // 2) (b) Draw calls + frame time, swept to the ~16k-part target.
        const sweepPoints: FrameStats[] = [];
        for (const n of SWEEP_SCALES) {
          if (!live) return;
          setPhase({ kind: 'sweeping', at: n });
          harness.growFillerTo(n);
          const stats = await harness.measureFrames();
          if (!live) return;
          sweepPoints.push(stats);
          setSweep([...sweepPoints]);
          note(
            `sweep ${String(n).padStart(6)} parts → ${String(stats.drawCalls).padStart(6)} draw calls, ` +
              `${stats.medianFrameMs.toFixed(1)} ms/frame (${stats.fps.toFixed(1)} fps)`,
          );
          if (harness.contextLost) {
            note('⚠ WEBGL CONTEXT LOST — the tab GPU gave out at this scale.');
            break;
          }
        }

        // 3) (d) Incremental edit latency at increasing resident scale (should be ~flat: step 2b).
        setPhase({ kind: 'editing' });
        const editPoints: EditLatency[] = [];
        let toggle = false;
        for (const resident of EDIT_SCALES) {
          if (!live) return;
          harness.growFillerTo(resident);
          // Two edits per scale (there-and-back) so we always change geometry; keep the second.
          await harness.measureEdit(toggle);
          toggle = !toggle;
          const e = await harness.measureEdit(toggle);
          toggle = !toggle;
          if (!live) return;
          editPoints.push(e);
          setEdits([...editPoints]);
          note(
            `edit @ ${String(resident).padStart(6)} resident → ${e.totalMs.toFixed(1)} ms total ` +
              `(rebuild ${e.kernelRebuildMs.toFixed(1)} + retess ${e.retessellateMs.toFixed(1)} + ` +
              `install ${e.installMs.toFixed(1)}), next frame ${e.nextFrameMs.toFixed(1)} ms, ` +
              `${String(e.changedParts)} parts changed`,
          );
        }

        const target =
          sweepPoints.find((p) => p.parts >= TARGET_PARTS) ?? sweepPoints[sweepPoints.length - 1]!;
        const full: ScaleResults = {
          reference,
          canvas: harness.canvasInfo,
          sweep: sweepPoints,
          target,
          edits: editPoints,
          drawCallsPerPart: target.parts > 0 ? target.drawCalls / target.parts : 2,
        };
        setResults(full);
        (window as unknown as { __scaleResults?: ScaleResults }).__scaleResults = full;
        console.log('[scale] RESULTS', JSON.stringify(full, null, 2));
        setPhase({ kind: 'done' });
        note('done. Results on window.__scaleResults.');
      } catch (error) {
        if (!live) return;
        const message = error instanceof Error ? error.message : String(error);
        setPhase({ kind: 'error', message });
        note(`ERROR: ${message}`);
      }
    })();

    return () => {
      live = false;
      harness?.dispose();
      app?.dispose();
    };
  }, []);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <strong>Bunyan — browser scale harness</strong>{' '}
        <span style={styles.dim}>
          D66 axes (b) draw calls + (d) edit latency · kernel {kernelLabel}
        </span>
        <span style={styles.phase} data-testid="phase">
          {phaseLabel(phase)}
        </span>
      </header>

      <div style={styles.body}>
        <canvas ref={canvasRef} style={styles.canvas} />

        <aside style={styles.panel}>
          <Section title="(b) Draw calls + frame time vs part count">
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>parts</th>
                  <th style={styles.th}>draw calls</th>
                  <th style={styles.th}>tris</th>
                  <th style={styles.th}>ms/frame</th>
                  <th style={styles.th}>p95</th>
                  <th style={styles.th}>fps</th>
                </tr>
              </thead>
              <tbody>
                {sweep.map((s) => (
                  <tr key={s.parts} style={s.parts >= TARGET_PARTS ? styles.targetRow : undefined}>
                    <td style={styles.td}>{s.parts.toLocaleString()}</td>
                    <td style={styles.td}>{s.drawCalls.toLocaleString()}</td>
                    <td style={styles.td}>{compact(s.triangles)}</td>
                    <td style={styles.td}>{s.medianFrameMs.toFixed(1)}</td>
                    <td style={styles.td}>{s.p95FrameMs.toFixed(1)}</td>
                    <td style={styles.td}>{s.fps.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {results !== null && (
              <p style={styles.dim}>
                target ≈ {TARGET_PARTS.toLocaleString()} parts ⇒{' '}
                <strong>{results.target.drawCalls.toLocaleString()} draw calls</strong>,{' '}
                <strong>{results.target.medianFrameMs.toFixed(1)} ms/frame</strong> (
                {results.target.fps.toFixed(1)} fps). {results.drawCallsPerPart.toFixed(1)} draw
                calls/part (face mesh + edge line).
              </p>
            )}
          </Section>

          <Section title="(d) Incremental edit latency vs resident scale">
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>resident</th>
                  <th style={styles.th}>changed</th>
                  <th style={styles.th}>total ms</th>
                  <th style={styles.th}>rebuild</th>
                  <th style={styles.th}>retess</th>
                  <th style={styles.th}>install</th>
                  <th style={styles.th}>frame</th>
                </tr>
              </thead>
              <tbody>
                {edits.map((e) => (
                  <tr key={e.residentParts}>
                    <td style={styles.td}>{e.residentParts.toLocaleString()}</td>
                    <td style={styles.td}>{e.changedParts}</td>
                    <td style={styles.td}>{e.totalMs.toFixed(1)}</td>
                    <td style={styles.td}>{e.kernelRebuildMs.toFixed(1)}</td>
                    <td style={styles.td}>{e.retessellateMs.toFixed(1)}</td>
                    <td style={styles.td}>{e.installMs.toFixed(1)}</td>
                    <td style={styles.td}>{e.nextFrameMs.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Log">
            <pre style={styles.logBox}>{log.join('\n')}</pre>
          </Section>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={styles.section}>
      <h2 style={styles.h2}>{title}</h2>
      {children}
    </section>
  );
}

function phaseLabel(phase: Phase): string {
  switch (phase.kind) {
    case 'booting':
      return 'booting kernel…';
    case 'building':
      return 'building reference…';
    case 'sweeping':
      return `sweeping ${phase.at.toLocaleString()} parts…`;
    case 'editing':
      return 'measuring edit latency…';
    case 'done':
      return '✓ done';
    case 'error':
      return `error: ${phase.message}`;
  }
}

function compact(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}k`;
  return String(n);
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    color: '#e6e8eb',
    background: '#14171a',
    font: '13px/1.5 ui-sans-serif, system-ui, sans-serif',
  },
  header: { padding: '8px 12px', borderBottom: '1px solid #2a2f36', display: 'flex', gap: 12 },
  phase: { marginLeft: 'auto', color: '#f4d35e' },
  dim: { color: '#8a9199' },
  body: { display: 'flex', flex: 1, minHeight: 0 },
  canvas: { flex: 1, minWidth: 0, display: 'block' },
  panel: { width: 460, overflow: 'auto', padding: 12, borderLeft: '1px solid #2a2f36' },
  section: { marginBottom: 16 },
  h2: { font: '600 12px/1.4 ui-sans-serif', textTransform: 'uppercase', color: '#8a9199' },
  table: { borderCollapse: 'collapse', width: '100%', fontVariantNumeric: 'tabular-nums' },
  th: {
    textAlign: 'right',
    padding: '2px 6px',
    borderBottom: '1px solid #2a2f36',
    color: '#8a9199',
  },
  td: { textAlign: 'right', padding: '2px 6px', borderBottom: '1px solid #20242a' },
  targetRow: { background: '#22262c', fontWeight: 700 },
  logBox: {
    font: '11px/1.4 ui-monospace, monospace',
    whiteSpace: 'pre-wrap',
    color: '#b7bdc4',
    background: '#0f1215',
    padding: 8,
    borderRadius: 4,
    maxHeight: 220,
    overflow: 'auto',
  },
};
