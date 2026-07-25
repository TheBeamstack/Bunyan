/**
 * Renders the browser storage self-check (`runStorageCheck`) — the in-browser "test" for the
 * IndexedDB-backed `StorageAdapter`, which the headless box cannot run. Auto-runs on mount, shows a
 * pass/fail table, and parks the results on `window.__storageCheck` so they can be read back verbatim.
 */

import { useEffect, useState, type CSSProperties } from 'react';

import { runStorageCheck, type CheckResult } from './storageCheck';

export function StorageCheckPage() {
  const [results, setResults] = useState<readonly CheckResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void runStorageCheck()
      .then((r) => {
        if (!live) return;
        setResults(r);
        (window as unknown as { __storageCheck?: readonly CheckResult[] }).__storageCheck = r;
        console.log('[storage-check]', JSON.stringify(r, null, 2));
      })
      .catch((e: unknown) => {
        if (live) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      live = false;
    };
  }, []);

  const passed = results?.every((r) => r.pass) ?? false;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <strong>Bunyan — storage self-check</strong>{' '}
        <span style={styles.dim}>
          IndexedDB StorageAdapter + Autosave, against a real browser store
        </span>
        <span
          style={{
            ...styles.verdict,
            color: results === null ? '#f4d35e' : passed ? '#7fb069' : '#e06c75',
          }}
          data-testid="verdict"
        >
          {results === null ? 'running…' : passed ? '✓ ALL PASS' : '✗ FAILURES'}
        </span>
      </header>
      {error !== null && <p style={styles.err}>ERROR: {error}</p>}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>#</th>
            <th style={styles.th}>check</th>
            <th style={styles.th}>result</th>
            <th style={styles.thL}>detail</th>
          </tr>
        </thead>
        <tbody>
          {(results ?? []).map((r, i) => (
            <tr key={r.name}>
              <td style={styles.td}>{i + 1}</td>
              <td style={styles.tdL}>{r.name}</td>
              <td style={{ ...styles.td, color: r.pass ? '#7fb069' : '#e06c75', fontWeight: 700 }}>
                {r.pass ? 'PASS' : 'FAIL'}
              </td>
              <td style={styles.tdL}>
                <code>{r.detail}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    color: '#e6e8eb',
    background: '#14171a',
    font: '13px/1.6 ui-sans-serif, system-ui, sans-serif',
    padding: 16,
  },
  header: { display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 12 },
  dim: { color: '#8a9199' },
  verdict: { marginLeft: 'auto', fontWeight: 700 },
  err: { color: '#e06c75' },
  table: { borderCollapse: 'collapse', width: '100%', maxWidth: 900 },
  th: {
    textAlign: 'right',
    padding: '4px 8px',
    borderBottom: '1px solid #2a2f36',
    color: '#8a9199',
  },
  thL: {
    textAlign: 'left',
    padding: '4px 8px',
    borderBottom: '1px solid #2a2f36',
    color: '#8a9199',
  },
  td: { textAlign: 'right', padding: '4px 8px', borderBottom: '1px solid #20242a' },
  tdL: { textAlign: 'left', padding: '4px 8px', borderBottom: '1px solid #20242a' },
};
