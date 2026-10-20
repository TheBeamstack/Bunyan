# P5 / D29 — the geometry cache in the `.bnn`: where it lives, what invalidates it, what a save pays

**Status:** DESIGN (headless, `zayd`, 2026-10-12, T-038). No code changed.
**Implements:** D93 (the owner wired the `.bnn` half, `D-20261007-03`: `yes`) · D29 · `docs/decisions.md` §4j-2.
**Built already, and not re-opened here:** `exportBrep` / `importBrep`, the fingerprint and the untrusted-bytes
guard (`packages/kernel-occt/src/cache.ts`, `tests/geometry-cache-d29.test.ts`). This document is the `.bnn` half
only: storage, invalidation, the restore path, and the save policy.

---

## 1. The problem in one paragraph

The fingerprint proves _"these bytes are the solid these tokens were assigned to"_; it never proves _"this solid
is what the recipe would build"_ (§4j-2). The manifest's two candidate keys do not close that gap:
`kernelBuildId` moves only when OCCT or the toolchain moves, and `typeVersions` is the **maximum** `typeVersion`
per type (`typeVersionsOf`, `bnn.ts`), which no parameter edit moves. So a `scene.json` whose wall was
lengthened by hand — or by any writer that carries the cache through without understanding it — opens today's
design with a fingerprint that verifies and a wall at its old length. The cache needs a key over **what the build
read**, computable from the scene alone, without a kernel.

---

## 2. ⚠⚠ The invalidation key

### 2a. Two levels

| Level         | Where                              | Contents                                                                                                       | On mismatch                    |
| ------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **envelope**  | `geometry-cache/index.json` header | cache scheme `bnnc1`, `FINGERPRINT_SCHEME` (`bnn1`), the writer's `kernelBuildId`, the writer's `codeId` (§2d) | the **whole cache** is ignored |
| **input key** | one per assembly root in the index | `sha256` of the canonical JSON of the assembly's build inputs (§2b)                                            | **that assembly** rebuilds     |

⚠ The envelope carries its **own** `kernelBuildId` and never reads `manifest.json`'s. A writer that carries the
cache through verbatim (Miqdar, a script, an older Bunyan) rewrites the manifest with its own id; trusting the
manifest would let a foreign writer vouch for solids it never built.

### 2b. The input key — what the build reads, named one by one

`buildAssembly` (`build.ts`) builds a root, every void hosted on it, and its D59 children as one unit, and calls
`contextFor` once per **each** of them: a generated child gets its own context (`build.ts:753`) under the id
`<rootId>:<slot>` (`childElementId`, `geometry.ts:82`), with a `styleId` the root's Type chose in code
(`build.ts:745`), not one the scene names. The key is the digest of, for the root and for each element of
`hostedBy(scene, root)` sorted by id:

| Input                                                                                                    | Read by                   | Why it is in the key                                                                                                |
| -------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| the full element row (`params`, `placement`, `styleId`, `hostId`, `hostRef`, `typeId`, `typeVersion`, …) | `contextFor`, `placeTree` | the recipe itself; whole row, so a new field cannot be missed                                                       |
| `datumElevations`, `gridPointOf`                                                                         | `contextFor`              | a `Constraint` row elsewhere in the scene moves the element (D50 0b)                                                |
| `resolveJoins(scene, id)` — the **resolved** cap-lines                                                   | `contextFor`              | a neighbour's endpoint moves this wall's miter; the resolved value, not the neighbour's row, is what the Type reads |
| `sketchConstraintsOf(scene, id)`                                                                         | `solveSketch`             | the 0d solver's input                                                                                               |
| `elevationOf(scene, containerId)`                                                                        | `contextFor`              | a storey's elevation edit moves every element on it                                                                 |

⚠ **The child lookups.** The last four rows are scene lookups by element id, and a child's `contextFor` makes them
under `<rootId>:<slot>`. The key pass cannot list the slots without running the Type, so it digests every
`Constraint`, join and `SketchConstraint` row whose subject id starts with `<rootId>:` (nested children included).

**And the shared tables, whole:** `styles`, `materials`, `sections`, `containers`, `grids` are digested once per
save as one canonical JSON each, and that digest goes into every key. `BuildContext` exposes the last four as lazy
accessors (`material(id)`, `section(id)`, …), and `styles` is read by a `styleId` a D59 Type may generate (above),
so in both cases the set of rows a build reads is code, not data; digesting the whole table needs no read-tracing
and no change to the frozen `BuildContext`. The price is coarse: a hand-edit to one style or material re-keys every
assembly, which costs exactly today's full rebuild. ⚠ A per-root style row is **not** sound: it misses a style only
a child reads (PR #73 review, reproduced on real OCCT).

⚠ **Canonical JSON** = sorted keys, no whitespace, `JSON.stringify` numbers. A reformatted or key-reordered
`scene.json` keeps every key; a changed value changes the key of the assemblies that read it, and of no other.

⚠ **Cost.** `hostedBy`, `sketchConstraintsOf` and `constraintsOf` scan the whole scene, so computing every key
naively is O(n²) at 16k. The key pass builds one index (by `hostId`, by constraint subject) first. It is pure
TypeScript with no kernel call; its time at 16k is **not measured** and row R1 measures it.

### 2c. Why it catches the hand-edit, and why a stale entry costs only a rebuild

1. A hand-edited value is read by the build (that is what makes it matter), so it is in some assembly's §2b
   inputs; that assembly's recomputed key differs from the stored one, and its entry is never handed to
   `importBrep`. **The assembly is built from the recipe**, through the same `buildAssembly` call as today.
2. An entry whose key matches but whose bytes or tokens were altered fails `importBrep`'s fingerprint with
   `CACHE_STALE` (already built). The restore path (§4) releases every solid it imported for that assembly and
   **rebuilds the whole assembly** — never a partial restore, never a guessed name.
3. Nothing in the restore path assigns, matches or repairs an identity: tokens come only from a verified entry
   or from the recipe. D1 holds.

### 2d. What the input key cannot see: code

A Type's `buildGeometry` fixed without a `version` bump builds a different solid from the same inputs, and no
digest of `scene.json` moves. The envelope's `codeId` closes that. **Open: which `codeId`** — `D-20261012-06`.
Recommended: a content hash of the shipped bundle stamped at build time (every deploy discards every cache, so
the first open after an update is today's rebuild); the alternative, `typeVersions` + engine version, keeps
caches across deploys and serves a stale solid whenever a fix forgets its bump.

### 2e. What no key can see: a hostile author

A `.bnn` is a file a user can be **sent**, and the fingerprint is a public SHA-256, not a MAC: an author can write
any solid, any tokens, a matching fingerprint and a matching input key. The recipient then sees and bills
geometry the recipe would not build — for a product whose quantities are `basis: "exact"` (D30/D33), that is the
failure that matters. **Open: whose caches are trusted** — `D-20261012-05`. Recommended: `own` — the envelope
carries an HMAC (the in-house `sha256`, keyed by a per-install secret in browser storage) over the index; a file
this install did not write restores nothing and opens at today's rebuild speed. That makes _"this solid is what
the recipe built"_ true by provenance, and costs nothing on the common case, re-opening your own work.

---

## 3. Placement in the `.bnn` — additive

```
project.bnn
├── manifest.json            unchanged
├── scene.json               unchanged
├── history.json             unchanged
├── thumbnail.png            unchanged
└── geometry-cache/          NEW, optional
    ├── index.json           envelope + one record per cached assembly root
    └── <rootId>/<k>.brep    one entry per solid, the `exportBrep` bytes
```

**An index record** is the assembly's `ElementGeometry` tree as `buildAssembly` returned it, with each `Part`'s
`handle` replaced by `k` and its `refs`/`fingerprint` from `exportBrep`; generated children keep their synthetic
`element` (D59). Only an assembly whose root, voids and children are all `valid` with no broken reference is
cached; anything else always rebuilds (it is rare, and its `brokenRefs` are re-derived for free).

| Compatibility case                                              | Result                      | Why                                                                                  |
| --------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------ |
| an old file (no `geometry-cache/`) opens in a cache-aware build | rebuilds, as today          | the no-cache path stays primary (spec §6)                                            |
| a file with a cache opens in today's build                      | opens                       | `loadBnn` reads only the four names it knows; unknown entries are ignored (`bnn.ts`) |
| that build then saves                                           | the cache is dropped        | `saveBnn` writes only what it knows; an absent cache costs a rebuild                 |
| a writer edits `scene.json` and carries the cache verbatim      | affected assemblies rebuild | §2c, by input key                                                                    |
| Miqdar opens it                                                 | ignores it                  | it has no kernel and can never use or produce a cache                                |

**Frozen shapes — none moves.** Checked against `[frozen_surface] watched` (`.agent.toml`): `scene.json`,
`Part`, `BuildContext`, `BimObjectType` and the protocol ops are untouched (`importBrep`'s payload already takes
`nodeId`, `brep`, `refs`, `fingerprint` per solid). `Manifest`, `SaveOptions`, `BnnPackage` and
`ElementGeometry` live in `bnn.ts` / `build.ts`, which are not watched; the cache adds an optional
`SaveOptions.cache` and an optional reader, never a required member.

⚠ **Spec drift to fix when R2 lands:** spec §6's tree names a single `geometry-cache.brep` (marked
PROVISIONAL); this design makes it a directory, so one solid's refusal does not cost the file.

⚠ **The loader must not inflate what it ignores.** `loadBnn` calls `unzipSync` on everything, so a 61 MB cache
would be decompressed on every open even by a build that discards it. The cache-aware `loadBnn` passes
`unzipSync`'s `filter` to skip `geometry-cache/` and reads entries on demand from the retained file bytes.
Today's build pays the inflation once and ignores the result — correct, merely slower.

---

## 4. The restore path

One substitution, in `DocumentContext.#stage`, per root, **on the load path only**: `rebuildAll` and `rebuildOnly`
(so `#forceBuild`) pass a `restore` flag; the edit paths (`document.ts:372,455,497`) never pass it and always build.

1. Compute the root's input key (§2b). No entry, or a different key ⇒ `buildAssembly`, unchanged.
2. Same key ⇒ `importBrep` each solid of the record. **Any** refusal ⇒ release the ones imported, `buildAssembly`.
3. Every import verified ⇒ assemble the `ElementGeometry` tree from the record; each `Part.refs` must be a
   permutation of what `importBrep` returned for that solid, else treat as a refusal (step 2).

It composes with D66: `rebuildOnly(keepLive)` restores the keep-live set instead of building it, and FORCE
(`#forceBuild`) restores what it can. An edit rebuilds its assembly from the recipe as today, so a restored solid
is never an input to a later boolean.

⚠ **A restored solid is not bit-identical to a rebuilt one on curves** (§4j-2: the round trip is not bit-exact),
so a quantity read from it may differ below the mm grid. The agreement tripwire (R3) compares `refs` token for
token and quantities at D28's rounding, and R3 measures whether a Clean Delta `prior` computed on a rebuilt
model and a current value on a restored one can disagree on an unedited element.

---

## 5. The budget, and the save policy

Measured (§4j-2, one run, 60 solids, `handoff/archive/zayd/2026-07-30-d29-cache-bodies.md:50-56`): rebuild 24.86 ms/solid, cached import
12.00 ms/solid (**2.07×**), export **6.64 ms/solid**, **3,817 B/solid**. Projected to D48's 16,000 solids:

|                          | Per solid | At 16k             |
| ------------------------ | --------- | ------------------ |
| cold open, recipe        | 24.86 ms  | 398 s              |
| cold open, cache         | 12.00 ms  | 192 s              |
| export, if a save did it | 6.64 ms   | **106 s per save** |
| cache size, uncompressed | 3,817 B   | ~61 MB             |

⇒ **A save never exports. The cache is written LAZILY, and there is no option in v1.0.0.**

- **After each commit**, the rebuilt assemblies are queued for export in idle worker time; an edit to one wall
  costs that wall's few solids (~7 ms each), off the interaction path.
- **Restored and unbuilt (D66-deferred) assemblies are carried**, not re-exported: their entries are copied from
  the retained file bytes when their input key still matches the current scene.
- **A save writes only entries whose key matches the scene it writes** — recomputed at save, so an unbuilt
  assembly whose neighbour moved is dropped rather than written stale. An assembly not yet exported is absent.
- A first save after a cache-less open writes a partial cache; the idle exporter fills it (106 s of worker time
  at 16k), and each later save carries more.

**Measured by R4** (`tests/geometry-cache-export-d29.test.ts`, the R3 fixture's 20 real exported solids replicated
to 16,000, box, 2026-10-14; method and command in `handoff/zayd/2026-10-14-T-042-d29-lazy-export.md`):

|                         | Per solid            | At 16k                                   |
| ----------------------- | -------------------- | ---------------------------------------- |
| `.brep`, raw/compressed | 2,747 B / 687 B, 4:1 | 43.9 MB / 11.0 MB                        |
| `index.json`            | 3,830 B / 228 B      | 61.3 MB / 3.6 MB, **one entry**          |
| `saveBnn` (`zipSync` 6) | —                    | **4.1 s** with the cache, 0.3 ms without |

⚠ `index.json` outweighs the solids raw on this mix (each `Part` carries its refs twice, a D59 child its row), so
the ~61 MB above understated the inflated cache: 105 MB, inside every T-046 cap. A save of the full cache
blocks for ~4 s; this fixture is curtain-wall heavy, so another mix moves both figures.

**Autosave omits the cache** (`D-20261012-07`, default `omit` applied 2026-10-20; R7, T-045): a five-deep ring
carrying R4's cache would be ~525 MB inflated, or ~73 MB zipped, of OPFS at 16k. `Autosave.snapshotScene` drops
`SaveOptions.cache` (`tests/autosave-cache-d29.test.ts`); a recovered session rebuilds as today.

---

## 6. Decomposition — rows a steward can file

| Row                | Scope                                                                                                                   | Done when                                                                                                                                                                                                                                                                                                                                             | Depends on     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **R1** key         | `cacheInputKey(scene, root, tables)` + envelope + canonical JSON + the one-pass index; `packages/document`              | each §2b input class, hand-edited, flips exactly the keys of the assemblies that read it, a style only a D59 child reads flips its root's key, and a reformat flips none (test-first); key time at 1k/4k/16k elements printed                                                                                                                         | —              |
| **R2** layout      | optional `SaveOptions.cache`; `loadBnn` filters `geometry-cache/` and exposes an on-demand reader; spec §6 tree amended | an old file opens; a cached file opens in a build that ignores it (today's `loadBnn` on the fixture)                                                                                                                                                                                                                                                  | R1             |
| **R3** restore     | the load-only `#stage` substitution of §4                                                                               | restored ≡ rebuilt (`refs` token for token, quantities at D28 rounding) on the D66 fixture; a hand-edited value rebuilds exactly the assemblies whose §2b key it flips (a joined neighbour's included; a shared-table edit rebuilds all); a tampered `.brep` rebuilds and leaks no handle; the Clean Delta question of §4 answered with a measurement | R1, R2         |
| **R4** lazy export | the idle exporter, carry-through, write-only-valid-keys; measure compressed size and save time                          | a save calls no `exportBrep`; an unbuilt assembly whose neighbour moved is not written                                                                                                                                                                                                                                                                | R3             |
| **R5** trust       | the envelope MAC per `D-20261012-05`                                                                                    | a file from another install restores nothing (revert-verified)                                                                                                                                                                                                                                                                                        | R2, the answer |
| **R6** `codeId`    | stamping per `D-20261012-06`                                                                                            | a changed bundle discards the cache                                                                                                                                                                                                                                                                                                                   | R2, the answer |
| **R7** autosave    | per `D-20261012-07`                                                                                                     | autosave's snapshot matches the answer                                                                                                                                                                                                                                                                                                                | R4, the answer |

R3 is `risk: high` (it is where a wrong name would come from); the others are `normal`. None touches a watched
file, so none is contract-touching.

---

## 7. What this document does not claim

- **Nothing here is measured on 16k solids.** §5's right column is a ×267 extrapolation of a 60-solid run.
- The fingerprint, the tie refusal and the hardening are built and tested; this document assumes them.
- The `.bnn` zip loader has no decompression or entry-count caps today, against spec §9; a cache makes that
  larger. Recorded in `docs/BACKLOG.md ## Discovered`, not claimed.
