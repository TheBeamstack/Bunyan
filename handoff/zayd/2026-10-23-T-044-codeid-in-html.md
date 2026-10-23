# T-044 — `CODE_ID` is stamped into the HTML, never a hashed chunk (B-20261020-02) — 2026-10-23 — seat: zayd

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-044-d29-r6-codeid-is-stamped-per-the-owner-a` · PR #90 · risk: high
- returned by: `handoff/hmdnah/2026-10-20-T-044-review-step-1.md` (fix shape 1 of 2)

## Changed

- `apps/web/codeIdPlugin.ts`: `transformIndexHtml` injects `<meta name="bunyan-code-id">` carrying the placeholder
  into every HTML entry; `generateBundle` digests every file as before, then replaces the placeholder in the
  `.html` assets only. An HTML asset with no placeholder fails the build. No chunk or hashed asset is rewritten,
  so the old "bundled but not stamped" guard is gone.
- `apps/web/src/codeId.ts`: `CODE_ID` is `codeIdFrom(document meta content)`; anything not 64 hex (dev server,
  tests, a worker with no `document`) is `unstamped:<time>:<random>` per load, as before.
- `apps/web/src/codeId.test.ts`: the build fixture is now an HTML app (entry, a dynamic chunk carrying `CODE_ID`,
  a module worker); its entry chunk runs against a stub `document` serving the built HTML's meta tags. It asserts
  every same-named hashed file keeps its bytes across a main or worker change. hmdnah's probe is landed as written.
- Design §2d names where the id is stamped. Merged `origin/main` (T-043/PR #89): conflicts in BACKLOG,
  CURRENT_STATE, PHASE_LOG, resolved by taking main's side whole and re-applying this branch's rows and entries;
  the BATON block was taken whole from this branch. `CacheEnvelope` is unchanged by T-043, so nothing else moved.

## Verified

- `npx vitest run apps/web/src/codeId.test.ts` → 4 passed.
- Revert: pre-fix `codeIdPlugin.ts` and `codeId.ts` (two new exports shimmed) → 2 failed; the probe reads
  `assets/id-GK_lKDOT.js: expected 'const x="284537e2…' to be 'const x="43715645…'`, hmdnah's own failure. Restored → 4 passed.
- `npx vite build --outDir /tmp/t044-dist` from `apps/web` → built in 4.96 s; `index.html`, `scale.html`,
  `storage-check.html` and `first-paint.html` each carry the one id `a04aef6a…`, and no placeholder remains in `dist/`.
- `pnpm verify`: see the phase-log abstract.

## Not verified

- The runtime meta read in a real browser: the test stubs `document`. No product code imports `CODE_ID` yet.
- HTTP caching of the HTML itself in a deploy: a stale HTML pairs an old id with its own old hashed files, which
  is coherent; the repo carries no header config to measure.
