# STEWARD-t064-entries-clone — T-065, T-066: the save cost T-064's bar cannot clear alone — 2026-10-25 — brahim

## What was done

- `docs/BACKLOG.md`: `backlog.py add` appended T-065 (`ready`) after T-064 and T-066 (`blocked` on T-065) after T-065. `requires: browser` was added to both by hand (`## Discovered` 2026-10-10: no `--requires` flag).
- T-064's `depends-on:` gains T-065, which is what B-20261024-02's `need:` asks for. Its done-when 3 is unchanged; T-065's bar item is that same bar.
- T-065 is built on T-064's branch, because both change `apps/web/src/storage/bnnZip.ts`. Its PR therefore lands PR #116's commits.
- T-066 is split out because its cost (1437.9 ms, step-1 flag (c)) is a different mechanism: per-scene-value carry and re-key, not the post.
- `## Discovered` gains a diwan finding: `agent_start.py`'s resume ignores pending-decision holds (`agent_start.py:928-937`).
- The 2026-10-24 `## Discovered` finding that T-065 converts exists only on T-064's branch, so it is not deleted here. Delete it on that branch when it is merged into T-065's.

## Evidence

Diagnosis from a row-less R39 subagent at `68b4a9e`. It changed no file, and `git status --short` was empty before and after.

| Claim | Source |
|---|---|
| entries are `Record<string, Uint8Array>`, with no object graph | `packages/document/src/bnnzip.ts:16` |
| the document keeps the carried and exported buffers, so originals cannot be transferred | `document.ts:716,760,776-779` |
| pack plus one transfer: 31–37 ms pack, 0.7–0.8 ms post, against 38–49 ms `postMessage` | node only, synthetic 16k × 2,747 B; not Chrome |
| a new `carried` Map per scene value; restore's keys are discarded | `document.ts:1601-1604`, `:1403` |
| neither row touches a `[frozen_surface] watched` file | `.agent.toml:56-75` |
| entries clone 148.9–263.2 ms; 3 of 9 unmodified runs pass the bar | hmdnah step 2, `handoff/hmdnah/2026-10-25-T-064-review-step-2.md` on the T-064 branch |

Not measured: how much of the save's hold is the clone inside the save, as opposed to timed alone, and how the 1437.9 ms splits. T-065 and T-066 each measure their split first.

## Next

`hmdnah` reviews this PR. After it merges, a box `zayd` turn may take T-065, started as `agent_start.py --seat zayd T-065` until the resume finding is fixed.
