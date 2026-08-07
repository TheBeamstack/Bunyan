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
 *
 * ⚠⚠ **AND THE WRAPPER MUST FORWARD `options`, WHICH IT DID NOT — D23's TRANSACTION WAS BEING DROPPED
 * HERE, SILENTLY** (Entry 86, found by driving the real app). `execute` was written `(command, args)` and
 * called `agent.execute(command, args)`, so the THIRD argument — the one carrying `transactionId` — was
 * discarded by a wrapper whose entire job is to be transparent. **Nothing failed.** Every edit applied,
 * the geometry was right, both diagnostics stayed empty; the only casualty was the UNDO GRANULARITY, and
 * that is invisible until a user presses `Ctrl+Z` once and finds half their gesture still there. For the
 * corner-drag that half-state is not merely untidy — it is a corner left OPEN, a model the user never
 * authored and the join resolver will faithfully resolve. Measured before the fix: two `core.setParams`
 * under ONE id, then one undo ⇒ `w1.end` still `[4500,500]` while `w2.start` was back at `[4000,0]`, and
 * it took TWO undos to reverse one gesture — behaviour byte-identical to passing no `transactionId` at
 * all. ⇒ **a pass-through wrapper is a place where an argument can go missing without anything erroring,
 * and the variadic tail is where to look.**
 */

import type { AgentSurface } from '@bunyan/document';

export function withUiRefresh(agent: AgentSurface, notify: () => void): AgentSurface {
  return {
    ...agent,
    // ⚠ `options` is forwarded, not re-built: this wrapper adds a refresh and must otherwise be
    // indistinguishable from the surface it wraps. Anything it re-declares, it can drop.
    execute: async (command, args, options) => {
      const edit = await agent.execute(command, args, options);
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
