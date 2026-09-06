# Entry 79 — the emsdk image is pinned by digest, and the artifact now names its own compiler (Q14)

**Zayd · dev box, headless · 2026-08-05 · branch `zayd/2026-08-05-emsdk-digest-pin`**

> ⚠ **I AM NOT MERGING THIS.** Fifth entry running keeping Entry 75's rule: it goes up as the open PR
> and the NEXT session reviews and merges it. `RISK: additive`, so a reviewing agent may merge it —
> the owner does not have to.

---

## 1. What this is

`open_rulings.md` **Q14**, raised by Entry 76's late review of Entry 74 and handed to this session by
the prompt the moment PR #5 merged. The question was:

> **Do we pin the emscripten image by digest so the kernel build is byte-reproducible?**
> `tools/kernel-build/README.md` invokes `emscripten/emsdk:latest` — mutable — and the build id
> `occt-7.9.3-emcc-6.0.2` is a hand-maintained constant in `kernel.ts`, not a value read back from the
> artifact.

Both halves are now closed, and the second half turned out to be the one with teeth. **The pin makes a
rebuild reproducible; only the readback makes a WRONG rebuild loud.** Q14's own cost column said it:
_"the build id is asserted against itself in four tests, so nothing would catch the drift."_

---

## 2. What landed

| File                                       | What                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `tools/kernel-build/toolchain.json`        | **NEW** — the single machine-readable source of truth: OCCT version, emsdk image + **digest**, emcc version + commit, and the derived `buildId`. The recipe and the tests both read it. |
| `tools/kernel-build/README.md`             | All five `emscripten/emsdk:latest` invocations → `"$EMSDK"`, resolved from `toolchain.json`. "Pinned toolchain" rewritten: it claimed a pin it did not have. |
| `tools/kernel-build/probe.sh`              | Its pasteable invocation comment, same treatment.                                                |
| `current_state.md` §6                      | The box's own rebuild command, same treatment.                                                   |
| `tools/kernel-build/src/kernel.cpp`        | **`toolchainId()`** + `<emscripten/version.h>` + `<Standard_Version.hxx>`, and the embind binding. |
| `packages/kernel-occt/wasm/*`              | **Artifact relinked on the pinned digest** (+139 B) + `toolchainId(): string` on the hand-written `.d.ts`. |
| `packages/kernel-occt/src/kernel.ts`       | `createOcctKernel` **refuses to boot** a module whose `toolchainId()` disagrees with `OCCT_BUILD_ID`; `artifactBuildId()` exposed on `OcctKernel`. |
| `scripts/reseed-paths.mjs`                 | `toolchain.json` added to `GEOMETRY_PATHS` — it names the COMPILER, so it belongs beside `link.sh`. |
| `tests/kernel-build-pin.test.ts`           | **NEW, 6 tests.**                                                                                |
| `tests/reseed-gate.test.ts`                | +1 assertion for the new gated path.                                                             |
| `tests/goldens/geometry.golden.json`       | Re-seeded (the gate fired correctly). **The whole diff is one `seededAt` line** — see §3f.       |
| `open_rulings.md`                          | **Q14 struck.**                                                                                  |

### 2a. Verified

**661 green across 82 files · six gates · real exit code 0 ·** `freeze-boundary` green ⇒ `RISK: additive`.

**Revert-verified four ways, each watched RED before the fix went back:**

1. **The artifact readback** — restored the pre-Entry-79 `.wasm` and ran the new test:
   `TypeError: wasm.toolchainId is not a function` at `kernel.ts:355`. This is the one that proves the
   test reads the ARTIFACT and not the TypeScript beside it.
2. **The mismatch refusal** — set `OCCT_BUILD_ID` to `occt-7.9.3-emcc-6.0.5` (i.e. simulated exactly
   Q14's failure: a relink on today's `:latest`). Both `kernel-build-pin` and `occt-kernel` went RED with
   `[INTERNAL] Kernel artifact mismatch: the WASM module reports "occt-7.9.3-emcc-6.0.2" but
   OCCT_BUILD_ID claims "occt-7.9.3-emcc-6.0.5"`.
3. **The pin guard** — put `emscripten/emsdk:latest` back into README code block 1:
   `expected [ "tools/kernel-build/README.md (code block 1)" ] to deeply equal []`.
4. **The re-seed path** — removed `toolchain.json` from `GEOMETRY_PATHS`: `expected false to be true`.

---

## 3. FOUND

### 3a. ⚠⚠ THE TAG HAD ALREADY MOVED. Q14 WAS NOT A HYPOTHETICAL WHEN IT WAS FILED — IT WAS A LIVE DEFECT.

Resolved against Docker Hub on 2026-08-05:

| Tag                            | Manifest digest    | = emsdk |
| ------------------------------ | ------------------ | ------- |
| what linked the shipped artifact | `sha256:644883f5…` | **6.0.2** (image built 2026-07-01) |
| `:latest` **today**            | `sha256:76a44fff…` | **6.0.5** (image built 2026-07-29) |

Confirmed by resolving the version tags: `6.0.2` → `644883f5…`, `6.0.5` → `76a44fff…` → identical to
`latest`. **Three emscripten releases have shipped since the artifact was built.** Anyone following
`README.md` verbatim today would have relinked the kernel with a compiler that `OCCT_BUILD_ID` does not
name — and **all four tests asserting that constant would have stayed green**, because they assert it
against itself.

⚠ **The only reason Entry 77's rebuild (2026-08-03) was not already wrong is that `docker run` does not
re-pull a tag it has locally.** The July 1 image was still in this box's cache. That is not a control;
it is a coincidence that expires the first time anyone prunes Docker or builds on another machine.

### 3b. ⚠⚠ "READ IT BACK FROM THE ARTIFACT" WAS IMPOSSIBLE, NOT MERELY UNDONE.

Q14's phrasing assumes the build id could be read back off the module. It could not. Parsed the shipped
`.wasm` section by section:

```
section id=1 (type) … id=2 (import) … id=3 (function) … id=4 (table) … id=5 (memory)
id=6 (global) … id=7 (export) … id=9 (elem) … id=12 (datacount) … id=10 (code) … id=11 (data)
total sections: 11
```

**Eleven sections, not one CUSTOM section** — no `producers`, which `-O3` strips — and a scan for
`clang version` / `emcc` / `OCCT` / `7.9.3` over all **14.7 MB** returned **nothing**. So no test could
have caught 3a even in principle, and no amount of care in the README would have helped either.

⇒ The fix had to *give* the artifact something to say. `kernel.cpp` now composes the id from
`OCC_VERSION_COMPLETE` and `__EMSCRIPTEN_MAJOR__/MINOR__/TINY__` — **compile-time macros, so the string
is written by the compiler that compiles the file** and is baked into the data section as a literal.
It is now greppable in the binary:

```
$ grep -aoE "occt-[0-9.]+-emcc-[0-9.]+" bunyan-kernel.wasm
occt-7.9.3-emcc-6.0.2
```

### 3c. ⚠⚠ THE PIN IS PROVEN, NOT ASSERTED: THE REBUILD CAME BACK BYTE-IDENTICAL.

Before touching any C++, I relinked the **unmodified** source on the pinned digest and compared against
the committed artifact:

```
819ff12cbd627fd7d8a5e73e30b0d34f7f5b056702b23c38e218ad6784a6c696  dist/bunyan-kernel.wasm
819ff12cbd627fd7d8a5e73e30b0d34f7f5b056702b23c38e218ad6784a6c696  packages/kernel-occt/wasm/bunyan-kernel.wasm
fc5b042176127d6bbaea48dafea9f3293a10c2f3059e495ea1e130bf68638345  dist/bunyan-kernel.js
fc5b042176127d6bbaea48dafea9f3293a10c2f3059e495ea1e130bf68638345  packages/kernel-occt/wasm/bunyan-kernel.js
```

**`cmp` clean on both, 14,682,327 bytes.** ~75 s, step 3 of the recipe only. That is what makes this a
pin rather than a note: the digest is now known to reproduce the shipped bytes, and anyone can re-check
it in 75 seconds. (The committed artifact has since moved on by the +139 bytes of `toolchainId()`.)

### 3d. ⚠ `OCC_VERSION_STRING` IS `"7.9"`, NOT `"7.9.3"` — AND IT WOULD HAVE PRODUCED A PLAUSIBLE LIE.

The obvious spelling of the C++ half is `"occt-" OCC_VERSION_STRING`. Measured in the installed header
before using it:

```
#define OCC_VERSION_STRING   "7.9"        ← major.minor only
#define OCC_VERSION_COMPLETE "7.9.3"      ← what we want
```

The wrong one compiles, links, runs, and reports **`occt-7.9-emcc-6.0.2`** — which then fails the build
id comparison and looks like a *toolchain* problem rather than a typo. The whole point of this entry is
a constant that cannot lie; it nearly shipped with a new one that could.

### 3e. ⚠ `__EMSCRIPTEN_MAJOR__` IS NOT PREDEFINED, AND THE SPELLING EVERYONE REMEMBERS IS DEPRECATED.

A five-second compile probe, rather than a guess in the middle of a 75-second link:

- without `#include <emscripten/version.h>` → **`error: use of undeclared identifier '__EMSCRIPTEN_MAJOR__'`**;
- the lowercase `__EMSCRIPTEN_major__` (the form in most documentation) carries
  `#pragma clang deprecated(__EMSCRIPTEN_major__, "Use __EMSCRIPTEN_MAJOR__ instead")`.

### 3f. ⚠ THE RE-SEED GATE, SECOND WORKED EXAMPLE — AND IT IS Q16'S ARGUMENT AGAIN, VERBATIM.

The gate fired correctly (`kernel.cpp`, the artifact and `packages/kernel-occt/src/` all changed). I
re-seeded on the pinned native oracle, and **the entire diff is one line**:

```
-  "seededAt": "2026-08-03T10:42:25.654256+00:00",
+  "seededAt": "2026-08-05T15:38:36.956943+00:00",
```

Every geometry value across all 15 fixtures byte-identical — **correct**, because this entry adds a
reporting function and touches no geometry path. But the gate cannot tell that from a re-seed where the
geometry MOVED. **The only thing that made compliance safe was reading the diff**, exactly as in Entry
77. That is now two entries running, which is the strongest argument yet for **Q16**.

---

## 4. What the frozen surface did

**Nothing.** `pnpm verify`'s `freeze-boundary` gate is green and the snapshot is unchanged, so this is
`RISK: additive` on the machine's verdict *and* on the diff: no frozen byte, no `SCENE_SCHEMA_VERSION`
bump, no field or verb on a frozen shape. `toolchainId()` is a new WASM export and `artifactBuildId()`
a new method on `OcctKernel` — neither is protocol surface. `KernelInfo.buildId` is unchanged in shape
and in value.

⚠ **One behavioural change worth naming even though it is additive:** `createOcctKernel` can now reject
where it previously could not. It throws `[INTERNAL] Kernel artifact mismatch` when the committed
artifact and `OCCT_BUILD_ID` disagree. That can only fire on a broken build — but it fires in the
browser too, so it is Amer's business as well as mine. It is deliberate: the build id decides whether a
cached B-Rep is reused or rebuilt (spec §6), so a kernel that misdescribes itself does not fail loudly,
it silently certifies stale caches as compatible. The same argument the `capabilities` comment already
makes one screen above it.

---

## 5. What is NOT done

- **Q15, Q16, Q17 remain open.** Q15/Q16 were this session's *fallback* and were not needed once #5
  merged; Q16 gained a second worked example (§3f) but no fix.
- **The 2.5 h OCCT compile was not re-run.** Steps 1–2 of the recipe are pinned by the same digest but
  have not been re-executed on it; only step 3 (the link) has. The static libs in
  `~/occt-wasm-spike/install` predate this entry.
- **Nothing verifies the digest still resolves.** If Docker Hub ever garbage-collects that manifest the
  recipe breaks at `docker run`, loudly. Acceptable: the alternative is a network call in CI.
- **`emsdk 6.0.5` was not evaluated.** Moving to it is a deliberate bump — new digest, new build id,
  re-seed — and it is not this entry's business.

---

## 6. RISK

**`RISK: additive`** — `tests/freeze-boundary.test.ts` green, snapshot unchanged.

⚠ Under Entry 75's rule the REVIEWING agent merges, and the reviewer is by construction a later
session. **This PR is left open and unmerged.**
