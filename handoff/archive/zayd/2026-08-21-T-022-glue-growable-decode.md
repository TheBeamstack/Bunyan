# T-022 — the emitted glue decodes from a view of growable WASM memory

**Seat:** `zayd` (builder on box) · **Date:** 2026-08-21 · **Branch:**
`task/T-022-kernel-occt-s-glue-decodes-from-growable` · **Risk:** additive

---

## 1. The defect

`tools/kernel-build/link.sh` builds with `-sALLOW_MEMORY_GROWTH=1`, so `HEAPU8`/`HEAPU16` are views onto
`WebAssembly.Memory.prototype.buffer`. Chrome 149+ exposes that buffer as a **resizable** `ArrayBuffer`,
and its `TextDecoder.decode` refuses a view backed by one. Emscripten 6.0.2 emits
`Decoder.decode(view.subarray(a, b))`, and `subarray` shares the backing buffer, so the view handed to
`decode` inherits the refusal.

The failure has no visible throw — `apps/web` sits on "Booting OCCT kernel…" — which is why it was
reported as a hang rather than as an error.

## 2. The sweep, and what it added to the task

The task named the UTF-8 site. Invariant 7 (`AGENTS.md` §4-7 — a new rule binds the next consumer and
nothing else, so sweep backward) says to enumerate every site the rule governs rather than fix the one
that was reported. Counting the set rather than reading the reported member is the mechanical form
`current_state.md` §1c-8 prescribes, and here it is a one-line count:

```
$ grep -o '\.decode(' packages/kernel-occt/wasm/bunyan-kernel.js | wc -l
2
```

Both are heap decodes, and **both were defective**:

| # | site | emitted by emscripten 6.0.2 |
| --- | --- | --- |
| 1 | `UTF8ArrayToString` | `UTF8Decoder.decode(heapOrArray.subarray(idx,endPtr))` |
| 2 | `UTF16ToString` | `UTF16Decoder.decode(HEAPU16.subarray(idx>>>0,endIdx>>>0))` |

Site 2 is not mentioned anywhere in the task. It is the same defect, reached by a different string type,
and fixing only site 1 would have shipped a kernel that still hangs the moment anything crosses the
boundary as UTF-16.

## 3. Why a post-link patch and not an emsdk bump — measured

The `done-when:` requires the cost measured before choosing. Three numbers decided it.

**(a) The OCCT static libs are stamped with the pinned compiler.** Extracting one object out of the
prebuilt archives and reading its `producers` section:

```
$ ar x ~/occt-wasm-spike/install/lib/libTKMath.a math.cxx.o
$ strings -a math.cxx.o | grep -i clang
clang version 23.0.0git (https://github.com/llvm/llvm-project 787619a4072e0eb7887357d5d284e86c17548aed)
```

That is the pinned emsdk's clang (`emcc --version` inside the pinned image: **6.0.2**, commit
`7a2d97d6`). Moving `emsdk.digest` moves the compiler away from the one the 119 MB of prebuilt libs were
compiled with, which is the condition `current_state.md` §6 prices at a **2.5 h OCCT rebuild** against a
**75 s** link.

**(b) A bump is a geometry change by the repo's own rule.** `toolchain.json` is in the re-seed gate's
`GEOMETRY_PATHS` precisely because a digest bump can move a golden, so the cheap fix would have dragged a
full offline re-seed and a `.bnn` cache invalidation (`OCCT_BUILD_ID` is stamped into every saved file)
behind a JavaScript string bug.

**(c) The box cannot absorb it comfortably anyway.** 9.0 G free on `/`, a second emsdk image is 3.18 GB,
and free RAM at the time was 382 MB + 346 MB swap (§6a).

⇒ The patch path, which the `done-when:` prefers when (a) holds, and it does.

## 4. The fix

`tools/kernel-build/postlink.mjs` rewrites both sites from `subarray` to `slice`, and `link.sh` runs it
as the last step of the link. **It runs against the linker's output, never against a committed file** —
a generated artifact is regenerated, not hand-edited, which is what the `done-when:` requires of a
post-link patch.

Each rewrite is **required to match**. If a later emsdk reshapes the emitted text, `postlink.mjs` exits
1 rather than matching nothing and quietly shipping an unpatched artifact — the "a gate's hard part is
the SKIP" failure in `current_state.md` §1d.

**Why `slice` is the fix, measured rather than asserted** (Node 20.20.2):

```
rab.resizable               = true
subarray().buffer.resizable = true      <- shares the buffer Chrome refuses
slice().buffer.resizable    = false     <- fresh, non-resizable
```

**What it costs.** `slice` copies, on the >16-byte path that already existed:

| payload | via `subarray` | via `slice` | delta |
| --- | --- | --- | --- |
| 64 B | 0.96 µs | 0.54 µs | −0.42 µs |
| 4 KB | 0.87 µs | 2.16 µs | +1.29 µs |
| 256 KB | 168.40 µs | 190.23 µs | +21.8 µs (+13%) |
| 4 MB | 2039.69 µs | 2301.14 µs | +261 µs (+13%) |

+13% on a large decode is the price of booting at all, and the kernel's boundary design (README, "one
crossing per op") means decodes are per-op, not per-element.

## 5. The pin, re-proved — and a stale record fixed

Relinked on the pinned digest before patching anything:

```
LINK SECONDS: 75
044baac643940196224f4e70cb2ae66997f9f8baf60e82fc8774fef4a7568db5  bunyan-kernel.js
f34fef311af31cd63d1804147f6f8bde58d44a07c4b864193a1fd1ac5223d56a  bunyan-kernel.wasm
```

Both **byte-identical to the committed artifact**, so the pin holds and is now re-proved against
something that is actually committed.

⚠ **Spec/contract defect fixed (`AGENTS.md` §3, row 1).** `toolchain.json`'s `verifiedBy` read *"the
artifact came back BYTE-IDENTICAL to the committed one (wasm sha256 `819ff12c…`)"*. No committed artifact
has that hash. Entry 79 measured it against the tree **before that same entry's own `toolchainId()`
change**, and the follow-up commit un-measured it — `current_state.md` §1d's *"a measurement is pinned to
a commit; a follow-up commit un-measures it"*, in the one file whose entire purpose is to be the pin. A
reader relinking today and comparing against the recorded number would have concluded the pin was broken.
Replaced with today's re-proof, which names the artifact that is here.

`README.md` and `NOTICE` carried the same hash but **were already precise** about it referring to the
pre-`toolchainId()` tree, so they were not wrong — they were updated because the redistributed glue
changed and the LGPL §6 attribution must describe what is actually shipped.

After the patch: `.wasm` **f34fef31… (unchanged)**, glue **4e5508df…**, 6 bytes smaller — two sites ×
`subarray`→`slice`.

## 6. Revert-verification (`AGENTS.md` §4-3)

`tests/kernel-glue-growable-decode.test.ts`, with the patched glue swapped back to the committed
pre-patch bytes:

```
RED   2 failed | 3 passed (5)
      > hands neither of them a subarray of the heap
        AssertionError: expected [ '.decode(heapOrArray.subarray(idx,…' ] to deeply equal []
      > hands both of them a copy instead
        AssertionError: expected [] to have a length of 2 but got +0
GREEN 5 passed (5)          (glue restored)
```

**Weak-green defence (`AGENTS.md` §4-8).** "No site uses `subarray`" is trivially true of a file with no
decode sites at all, so the first assertion **counts** them (exactly 2). That count is also the tripwire
for a *third* site appearing in a future emsdk: `postlink.mjs` patches the two it knows, and a new one
would ship unpatched. The fourth test measures the resizable-buffer semantics themselves, so the three
text assertions above it are not merely claims about what the file says.

## 7. The re-seed gate

The diff touches four `GEOMETRY_PATHS` entries, so the gate fires. The goldens were re-seeded from the
native OCP oracle (3 s, 15 cases) and **not one value moved** — only `seededAt`, which is the case the
gate's Q16 value-check exists to catch. Confirmed in the commit with the required trailer, and the gate
was run the way CI runs it:

```
$ BASE_REF=main HEAD_REF=HEAD node scripts/check-reseed.mjs
re-seed gate: golden values unchanged, CONFIRMED by the author — "…" — OK.
```

⚠ Note for whoever reads this next: re-seeding **cannot** detect this change even in principle, because
the seeder builds its answers with native OCCT, not with our WASM glue. The thing that actually exercises
the patched glue against those goldens is the suite, which drives the real kernel — 951 green.

`tools/kernel-build/postlink.mjs` was **added to `GEOMETRY_PATHS`**, file-exact per Entry 74's lesson: it
rewrites the artifact, so by `link.sh`'s own argument it is source the goldens certify.

## 8. Verification

`pnpm verify` in full, on box: **98 files, 951 tests, 0 failed.** `freeze-boundary` green ⇒ `RISK:
additive`. `docs:check` 163.

## 9. What is NOT verified here

⚠ **`unverified here: the kernel boots on Chrome 151 — the pc seats to confirm` (T-023).**

This is not a formality. Measured on this box, **Node 20.20.2 cannot reproduce the bug at all**:

```
node WASM memory.buffer.resizable = false
node decodes subarray ok          = true
```

Its `WebAssembly.Memory` buffer is not resizable, and it decodes a resizable-backed view without
complaint even when handed one directly. So there is no headless assertion that watches this fail the way
Chrome fails it, and **no `done-when:` item here claims a browser boot**. What is verified here is the
mechanism (§4) and the artifact (§6); that the browser hang is gone is `amer`/`khalihlna`'s to confirm,
and T-023 is the task that closes it.

The 149-vs-151 numbers in the task's own text come from the pc measurement and were not re-measured here.

## 10. OWES

- **`khalihlna`/`amer` (T-023):** clear `unverified here` — the kernel boots on Chrome 151 with this
  artifact. That is the only claim this turn could not make.
- **`hmdnah`:** review. Item 1 is the §6 revert above; it re-runs headlessly in ~1 s.
- **`brahim`:** nothing blocking. Worth a `## Discovered` row that **a generated artifact now has a
  patch step**, because the next person to relink must run `link.sh` rather than `em++` by hand — the
  README says so and the test enforces it, but the recipe is now two acts rather than one.
