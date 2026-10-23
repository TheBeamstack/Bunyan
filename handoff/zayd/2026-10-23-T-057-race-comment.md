# T-057 review fix — `installSecret`'s race comment — 2026-10-23 — seat: zayd

- **implements:** B-20261023-01's `need:` on PR #106; no new behaviour.
- **changed:** `apps/web/src/storage/documentStorage.ts` — `installSecret`'s doc comment, the reword option of step 2's fix.
- **what is true now:** the comment says racing first boots (StrictMode) can hold different secrets, and the loser's
  signed cache is refused by `verifyCacheIndex` (a lost restore, never a wrong solid), matching step 1's probe (`AeqB=false`).
- **not done:** `navigator.locks` (making the old claim true) was not chosen; no race test added, because the code is unchanged.
- **verified:** `npx vitest run apps/web/src/storage/documentStorage.test.ts tests/app-cache-open-t057.test.ts` → `10 passed`;
  `npx prettier --check` on the file → clean; `pnpm verify` through `agent_finish.py`.
- **next:** hmdnah, step 2 of PR #106.
- **risk:** high (task row); comment-only change; not owner-gated.
