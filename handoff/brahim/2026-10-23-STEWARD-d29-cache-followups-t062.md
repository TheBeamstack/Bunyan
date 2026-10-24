# STEWARD-d29-cache-followups — T-062, T-063, T-064: the main-thread cost left after T-060 and T-061 — 2026-10-23 — brahim

## What was done

- `docs/BACKLOG.md`: `backlog.py add` appended T-062, T-063 and T-064 after T-061. The two 2026-10-23 `## Discovered` findings they convert are deleted (R12).
- T-064's `requires: browser` was added by hand, because `backlog.py` has no `--requires` flag (`## Discovered` 2026-10-10). Only its `named-save.mjs` item needs a browser.
- The save finding is split in two. T-062 removes the double key and memoizes keys per scene object (node only); T-064 posts the records as bytes and owns the 200 ms bar.
- The finding's own fix shape, "keys kept from the last commit", was rejected. A shared-table edit re-keys every root but rebuilds only its readers (`document.ts:1543-1552`), and design §5 drops an unbuilt root whose neighbour moved.
- The open finding's fix shape, "reply with the records as bytes", is not enough alone, because `usableRecord` needs an object per record (`cacherestore.ts:223-226`). T-063 therefore parses each root's record lazily inside its restore batch.
- T-064 depends on T-063 because both need a per-root record-bytes encoding, and on T-062 because the bar cannot be met while keying costs ~1.2 s.
- Every other `ready` box row and open PR is held by a pending decision or blocker (cycle sheet `skip:` line).

## Evidence

All from a row-less diagnosis subagent (R39) at `624b5ba`. It changed no file and left `git status --porcelain` empty.

| Claim | Command / source |
|---|---|
| a save keys every root, then re-keys each carried one | `packages/document/src/document.ts:737-740`, `:749` → `cacherestore.ts:224` |
| a save re-inflates every carried `.brep` | `document.ts:755` → `bnn.ts:491-492` |
| records and entries are cloned on post | `apps/web/src/storage/bnnZip.ts:52,84` |
| the index is inflated and parsed on the caller | `cacherestore.ts:92` → `bnn.ts:491-492,498` |
| the open posts with no transfer and replies with an object graph | `apps/web/src/storage/cacheOpen.ts:28,51` |
| the cap check is not a leaf | `bnn.ts:347`, which imports scene/undo code (`bnn.ts:32-35`) |
| two encodings must stay byte-identical | `cachesign.ts:81` (`JSON.stringify`), `:94` (`canonicalJson`) |
| no frozen file is touched | `.agent.toml:51-70` names none of the files above |
| T-060/T-061 tests green at HEAD | `npx vitest run tests/app-named-save-signs-in-worker-t060.test.ts tests/app-cache-open-verifies-in-worker-t061.test.ts` — 10 passed, 2 skipped |

Not measured: how the 1,178–1,433 ms save figure splits between keying and `.brep` inflation, and any browser figure. The 200 ms bar may still be out of reach on the first save after an open (T-064's note says what that turn does then).

## Next

`hmdnah` reviews this PR. After it merges, a box builder turn may take T-062 or T-063.
