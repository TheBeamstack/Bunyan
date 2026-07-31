### Entry 56 — 2026-07-25 — Amer — **BROWSER STORAGE SHIPS: a real IndexedDB `StorageAdapter` + Autosave + Save/Open/Recover, wired into the app and verified in a real browser. The §3 "No browser storage" gap is closed. NO frozen contract touched.**
**Task (owner):** after the scale-page blocker was discharged (Entry 55, kept UNCOMMITTED — owner-gated), the owner chose
"another Amer track." Picked **browser storage** — the one entirely-missing foundation piece (§3 NOT-built: "No browser
storage — FSA/OPFS/IndexedDB behind `StorageAdapter` … **Amer's** (cannot be verified headless)"). It pairs with the
`.bnn` codec + `Autosave` Zayd already built, touches no frozen contract, and is fully verifiable in a real browser.
`pnpm verify` fully green (**375 tests, +5**; typecheck incl. apps/web, lint, format, reseed). ⚠ **No commit — owner-gated.**

- **WHAT I BUILT (`apps/web/src/storage/`).** The document layer defines the `StorageAdapter` SEAM (`read`/`write`/`remove`/
  `list` over `Uint8Array`) + `Autosave` + the `.bnn` codec, and keeps a `MemoryStore` so the round-trip is tested
  headlessly — but ships NO browser implementation on purpose ("code I cannot exercise is code I must not claim to have
  verified", `bnn.ts`). This is that implementation:
  - **`IndexedDbStore`** (`indexeddb.ts`) — a promisified IndexedDB `StorageAdapter`: one object store, string keys →
    `Uint8Array`, lazy shared connection, `write` COPIES the bytes (`.slice()`) so a subarray view never persists its whole
    backing buffer, `read` normalises back to `Uint8Array`. ⚠⚠ **`list()` returns EVERY key via `getAllKeys()` with no
    caching** — the property `Autosave`'s counter-seed depends on (the "saved 9999, recovered 1300" data-loss bug).
  - **The reload-based OPEN + Save/Delete/Autosave/Recover UI, wired into `App.tsx`.** A "Files" panel: name → **Save**
    (`saveBnn` → `store.write('doc/<name>.bnn')`), a list with **Open**/**Delete**, and a **Recover** banner on boot when a
    newer autosave exists. **Autosave** snapshots the whole `.bnn` into the ring 1.5 s after each edit. `bootstrap()` gained
    an optional `InitialDocument` — opening a file constructs the doc over the loaded scene and `rebuildAll()`s every solid
    from the recipe (the D29 cold-load path, now in the browser).
  - ⚠⚠ **THE MOAT RULE HONOURED: Save persists `doc.changeFeed()` (the journal) + `doc.revision`, NEVER `doc.history()`**
    (the capped undo stack — the moat-losing bug, plan step 10). Both the explicit Save and Autosave use `changeFeed()`.
  - **OPEN is reload-based (`documentStorage.ts`):** the shell is built around ONE `DocumentContext` from `bootstrap()`;
    swapping a loaded doc in place would thread a new doc + agent surface + reset all state. Instead Open parks the store key
    in `sessionStorage` and reloads — the boot path loads that file instead of seeding the demo. Robust, and a document
    switch IS a clean boot over the chosen scene.
- **⚠⚠ THE STRICTMODE BUG I HIT AND FIXED — the exact class Entry 23 already warned about.** First cut of the open path
  booted the DEMO, not the file: `takeOpenRequest()` read-and-CLEARED `sessionStorage`, and under StrictMode the effect
  double-mounts — the DISCARDED first mount consumed+cleared the key, so the SURVIVING mount saw `null`. **Fix: memoise the
  taken key at MODULE scope** (`takenOpenKey`), so both mounts of one page load read the SAME value, while a real reload
  (fresh page load, module re-evaluated) still returns to the demo. Same lesson as the `window.bunyan` StrictMode race:
  a consume-once action must survive the double-mount. **Verified fixed** (below).
- **VERIFIED IN A REAL BROWSER (the only place browser storage can be, the scale-harness precedent):**
  - **`storage-check.html`** — an asserting self-check (`storageCheck.ts`) that runs the adapter + `Autosave` contract
    against REAL IndexedDB (fresh throwaway DB, deleted after). **8/8 PASS**, including the two that matter: ⚠⚠ **a fresh
    `Autosave` over a store with 3 snapshots writes `autosave-4`, NOT `autosave-1`** (cross-session ring continuation — the
    data-loss gotcha, the case a same-instance test cannot see), and the ring prunes to depth keeping the newest. This is the
    browser-side "test" for browser-only code.
  - **The app, end to end:** saved a scene → `doc/house-b.bnn` landed in IndexedDB (1.6 KB, ZIP magic `PK\x03\x04`); edited
    the wall to a DISTINCT `length: 7000` (via `window.bunyan.execute` — the agent path, D19) and saved; **opened it via
    reload → booted "Open: house-b" with `length: 7000` (not the demo's 4000), state `valid`, geometry rebuilt, zero console
    errors** — proving Save → `loadBnn` → `rebuildAll` round-trips the real scene. The Autosave + Recover banner appeared on a
    fresh boot.
- **⚠ NO FROZEN CONTRACT TOUCHED, and it is not a freeze item.** `StorageAdapter`/`Autosave`/`saveBnn`/`loadBnn` all
  pre-exist; `IndexedDbStore` is an app-layer IMPLEMENTATION of the seam (D19-clean — no `KernelClient`, it only moves
  bytes); the `bootstrap()` `InitialDocument` param and the App UI are app-local. No `scene.json`/`SCENE_SCHEMA_VERSION`/
  verb/protocol change. Storage was always "Amer's, below the freeze" (§3) — this closes it without moving a frozen byte.
- **GATING.** `storage-check.html` is a third vite build input (built + gated). apps/web typecheck/lint/format cover the new
  files (the P4-step-0 gate). The pure helpers (`docKey`/`docName`/**`latestAutosaveKey`** — the recover-key selection, which
  must pick the highest counter NUMERICALLY not lexically, the `autosave-10 > autosave-2` trap) are unit-tested in Node
  (`documentStorage.test.ts`, 5) — the IndexedDB adapter itself is browser-verified. **375 green.**
- **⚠ NO COMMIT — owner-gated.** ⚠ **Still uncommitted and owner-gated: Entry 55 (the scale page) AND Entry 56 (storage).**
  Box: dev server on :5173 during verification then STOPPED; the app wrote a couple of throwaway docs into the local `bunyan`
  IndexedDB (dev-machine data, harmless); no containers touched, live public sites untouched, nothing installed.

**NEXT (Amer, all post-freeze / parallel — none blocks the freeze):** the renderer-batching / instancing rewrite (the (b)+(d)
unlock, Entry 55) · P4.5 interaction model (gated on the baseline-Wall) · a File System Access adapter behind the same seam
(save to real files the user picks — an additive second `StorageAdapter`) · WebGPU + WebGL2 fallback · service worker/PWA ·
Cloudflare deploy. **The freeze (step 6) remains the owner's act** (Entry 55: four axes + D8 verdict done).
