/**
 * CLOSE THE UI-REFRESH GAP (P4 — the D19 equivalence work; the gap Entry 26 found).
 *
 * ⚠ THE BUG. `window.bunyan.execute(...)` calls `DocumentContext.execute` directly, while the human path
 * (`App.dispatch`) additionally bumps a React `version` so the viewport and panels re-derive. So a wall an
 * agent authored through `window.bunyan` mutated the document and the WASM heap correctly — but did NOT
 * appear until some *UI* action next bumped the version. The two surfaces D19 promises are interchangeable
 * were observably not: same edit, different visible result.
 *
 * ⚠ WHY THE FIX LIVES HERE AND NOT IN `DocumentContext`. `DocumentContext` is `@bunyan/document` (Zayd's),
 * it is not React-reactive, and it exposes no change signal — a signal on it would be a contract addition
 * that freezes at P5. The app-level equivalent is to funnel BOTH surfaces through one `notify`: the human
 * path already bumps in `dispatch`; this wraps the agent surface so its state-mutating verbs bump too.
 *
 * ⚠ Only the MUTATORS notify. `dryRun` runs the command and throws the result away (no state change), and
 * the read verbs (`query`, `quantities`, `changeFeed`, …) change nothing — refreshing on them would be a
 * spurious re-render. A rejected `execute` throws before `notify`, which is correct: reject + keep-last-good
 * means nothing changed, so nothing need refresh.
 */

import type { AgentSurface } from '@bunyan/document';

export function withUiRefresh(agent: AgentSurface, notify: () => void): AgentSurface {
  return {
    ...agent,
    execute: async (command, args) => {
      const edit = await agent.execute(command, args);
      notify();
      return edit;
    },
    undo: async () => {
      const edit = await agent.undo();
      notify();
      return edit;
    },
    redo: async () => {
      const edit = await agent.redo();
      notify();
      return edit;
    },
  };
}
