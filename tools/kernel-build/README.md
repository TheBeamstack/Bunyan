# `tools/kernel-build` — the OCCT → WebAssembly kernel build

**This is the reproducible recipe that produces Bunyan's geometry kernel.** It compiles **upstream
OCCT 7.9.3** to WebAssembly and links it with our C++ ops into a single module.

Verified 2026-07-12 on the Hetzner dev box: the output **matches the native-OCCT goldens exactly**
(`tests/goldens/geometry.golden.json`).

---

## The architecture (read this before changing anything)

**JavaScript never touches OCCT.** The `.wasm` module _is_ the kernel: `src/kernel.cpp` implements the
ops (`makeBox`, `measure`, `tessellate`, `releaseShape`) and is statically linked against OCCT.
JavaScript calls **our op set**, not OCCT's API.

This is the opposite of `opencascade.js`, and it is deliberate:

|                         | `opencascade.js`      | **this build**                 |
| ----------------------- | --------------------- | ------------------------------ |
| What JS calls           | all of OCCT's API     | **our ops**                    |
| Geometry logic lives in | JavaScript            | **C++, inside the WASM**       |
| JS↔WASM crossings       | one **per OCCT call** | one **per op**                 |
| Artifact (raw / gzip)   | 62.8 MB / 13.1 MB     | **3.98 MB / 1.47 MB**          |
| OCCT version            | 7.6.2 (2022)          | **7.9.3** (matches our oracle) |

**Consequences that matter:**

- The linker keeps only OCCT code our ops actually reach ⇒ the artifact tracks what we **use**.
- The JS binding surface **never grows**. Adding features = **writing more C++ ops**, not exposing
  more OCCT. This is what lets the product scale to Revit-class scope.
- **IfcOpenShell can later link against this same OCCT build** — which is the only way to import IFC
  as _exact solids_ rather than triangles. That is impossible with a prebuilt package.

## The two choices that make it build on a small box

1. **NO LTO.** `opencascade.js` compiles its object cache with `-flto`, forcing every link to be a
   whole-program optimisation over LLVM bitcode. That **OOM-kills on a 3.7 GiB box even for a 6-symbol
   build.** Plain `-O2` links in seconds.
2. **Modelling toolkits only** — Visualization, ApplicationFramework (OCAF), DataExchange (STEP/IGES)
   and Draw are switched **off**. Bunyan renders with three.js and does its own naming (D1).

18 toolkits are built. Note what is deliberately **in**:
`TKHLR` (**hidden-line removal → plans/sections/elevations**), `TKOffset` (**wall layers, shelling**),
`TKShHealing` (**repairing imported geometry**), `TKBO`/`TKBool` (booleans), `TKFillet`, `TKMesh`.

## Build

Needs Docker. **~2.5 h compile on 2 cores; the link takes seconds.** Cap the memory — this box hosts
live public sites (see `docs/CURRENT_STATE.md` §6a).

```bash
SPIKE=$HOME/occt-wasm-spike            # keep OCCT source OUT of the repo and OFF tmpfs (/tmp is RAM here)
mkdir -p "$SPIKE" && cd "$SPIKE"
curl -sL -o occt.tar.gz https://github.com/Open-Cascade-SAS/OCCT/archive/refs/tags/V7_9_3.tar.gz
tar xzf occt.tar.gz && mv OCCT-7_9_3 occt
mkdir -p build install

REPO=$HOME/projects/Bunyan/tools/kernel-build

# ⚠⚠ THE TOOLCHAIN IS PINNED BY DIGEST, NOT BY TAG. `:latest` is a moving pointer — it named emcc
# 6.0.2 when the committed artifact was linked and names 6.0.5 today. Read it from the manifest so
# there is ONE copy of the digest in the repo (see "Pinned toolchain" below for what it costs to skip).
EMSDK=$(node -p "require('$REPO/toolchain.json').emsdk.image + '@' + require('$REPO/toolchain.json').emsdk.digest")

# 1. configure (emscripten toolchain)
docker run --rm --memory=2g --cpus=2 --user "$(id -u):$(id -g)" \
  -v "$PWD/occt:/src/occt:ro" -v "$PWD/build:/build" -v "$PWD/install:/install" \
  -v "$REPO/configure.sh:/configure.sh:ro" \
  "$EMSDK" bash -c "emcmake bash /configure.sh"

# 2. compile OCCT  (~2.5 h)
docker run --rm --memory=2g --cpus=2 --user "$(id -u):$(id -g)" \
  -v "$PWD/occt:/src/occt:ro" -v "$PWD/build:/build" -v "$PWD/install:/install" \
  "$EMSDK" cmake --build /build --target install -j 2

# 3. link our kernel  (seconds)
docker run --rm --memory=2g --cpus=2 --user "$(id -u):$(id -g)" \
  -v "$REPO:/work" -v "$PWD/install:/install:ro" \
  "$EMSDK" bash /work/link.sh

# 4. judge it against the native-OCCT goldens (build-time smoke check)
node verify.mjs
```

`link.sh` writes to `dist/` (gitignored). The **committed** artifact lives with the package that ships
it — **`packages/kernel-occt/wasm/`**. After a rebuild:

```bash
cp dist/bunyan-kernel.{js,wasm} ../../packages/kernel-occt/wasm/
cd ../.. && pnpm verify          # the REAL gate: 136 tests, both kernels, real geometry
```

⚠ **`bunyan-kernel.js` (the emscripten glue) is in `.prettierignore`, and must stay there.** It is generated,
minified machine output. It was _not_ there from Entry 7 to Entry 14, and because CI runs `pnpm format:check`
**before** `pnpm test`, **every CI run in that window failed at step 3** — which is the entire reason CI was
never seen green. The hand-written `bunyan-kernel.d.ts` beside it is ours and stays formatted.

## `probe.cpp` — the naming probe (a measurement instrument, not the kernel)

`src/probe.cpp` links as its **own** WASM module and answers one question empirically:
**what does OCCT's `Generated`/`Modified`/`IsDeleted` history ACTUALLY report** — for a cylinder, three
booleans, a fillet on an edge a boolean created (the case spec §4.5 calls the hardest), a groove, five
transforms, **four revolves**, and **a duct through a round column**?

⚠ **Every single time this probe has been pointed at a new shape, it has found something the docs do not
say — and twice it contradicted what this project had confidently predicted.** Entry 14 alone: a full 360°
revolve's cap accessors return a face **that is not in the result** (not null, as any reasonable person would
guess); its seam is **free** (the predicted risk was the easy part); **a segment perpendicular to the axis
reports no history at all while its face is in the result** (nobody predicted it, and it is the flat bottom of
every column); and **a duct through a round column produces two topologically indistinguishable rims**, which
is the genuinely-symmetric tie spec §4.5 reserved the positional key for — **reachable since Entry 9, unseen
for five sessions, because every boolean ever tested cut a box.**

**⇒ Before you trust naming on a shape class nobody has cut, cut it here first.** It costs 60 seconds.

The naming rules in `src/kernel.cpp` are what they are **because of what this printed** (Entry 9). It
is committed so that the next person to change those rules can re-run the measurement instead of
trusting the comment above them — or the literature, which on OCCT 7.9.3 turned out to be wrong.

```bash
docker run --rm --memory=2g --cpus=2 --user "$(id -u):$(id -g)" \
  -v "$REPO:/work" -v "$SPIKE/install:/install:ro" \
  "$EMSDK" bash /work/probe.sh                    # ~60 s, same libs as the kernel ($EMSDK: see Build)
node probe-history.mjs                            # the report; --json for the raw data
```

Read the **STILL UNNAMEABLE** column first: it is the only number that matters — how many sub-shapes
the resolver would have to _refuse_, once history and adjacency have both been applied.

⚠ **`pnpm verify` is what judges a new kernel, not `verify.mjs`.** The vitest suite drives the kernel
through the protocol and gates the goldens, the naming, the wireframe, the WASM-heap leak canary and
the typed-failure contract — on every push. `verify.mjs` is only the build-time smoke check, for the
moment when there is a `.wasm` but no repo around it.

## Pinned toolchain

**The machine-readable copy is `toolchain.json`** — the recipe above and the tests both read it, so
there is exactly one place to change and nothing to keep in sync by hand.

|            |                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------ |
| OCCT       | **7.9.3** (`V7_9_3`, upstream, **unpatched**)                                                    |
| emscripten | **`emscripten/emsdk@sha256:644883f5…`** (= tag `6.0.2`) → **emcc 6.0.2** (`7a2d97d6`)            |
| Threading  | **single** (owner ruling: v1.0.0 ships single-threaded; MT in v1.0.x)                            |
| Artifact   | `packages/kernel-occt/wasm/bunyan-kernel.{js,wasm}` — **15.36 MB raw / 4.24 MB gzip** (Entry 14) |

⚠⚠ **PINNED BY DIGEST, AND `:latest` IS NOT AN ACCEPTABLE SUBSTITUTE — THIS IS MEASURED, NOT
CAUTIOUS.** The recipe said `emscripten/emsdk:latest` until Entry 79. On 2026-08-05 that tag resolved
to `sha256:76a44fff…`, which is **emsdk 6.0.5** — three releases past the **6.0.2** that linked the
committed artifact. Anyone following the recipe would have relinked the kernel with a compiler the
build id does not name, and the only reason this box did not is that Docker had the July image
cached. `tests/kernel-build-pin.test.ts` fails if a mutable tag comes back.

⚠ **The OCCT version + emcc version are the kernel _build id_** (`occt-7.9.3-emcc-6.0.2`, in
`packages/kernel-occt/src/kernel.ts`). It is stamped into every saved `.bnn` and invalidates the
geometry cache when it changes (spec §6). Bump it deliberately, and **re-seed the goldens**
(`tools/oracle`) whenever OCCT changes.

⚠ **It is no longer a claim you have to keep true by hand.** `kernel.cpp` computes the same string
from `OCC_VERSION_COMPLETE` and `__EMSCRIPTEN_*__` — compile-time macros — and exposes it as
`toolchainId()`; `createOcctKernel` refuses to boot a module whose answer differs from `OCCT_BUILD_ID`.
So a relink on a different emsdk now fails loudly instead of silently mis-stamping every `.bnn`.

**Reproducibility, verified 2026-08-21 (T-022):** relinking on the pinned digest reproduced the
committed artifact **byte for byte** — `bunyan-kernel.wasm` sha256
`f34fef311af31cd63d1804147f6f8bde58d44a07c4b864193a1fd1ac5223d56a`, and `bunyan-kernel.js` sha256
`044baac643940196224f4e70cb2ae66997f9f8baf60e82fc8774fef4a7568db5` as the linker emits it. Step 3
alone, 75 s. Entry 79 first proved the pin on 2026-08-05, against the artifact as it stood before that
entry's own `toolchainId()` change, so its two hashes name nothing committed today.

⚠ **The committed glue is not the linker's output.** `link.sh` runs `postlink.mjs` over
`bunyan-kernel.js`, which rewrites both `TextDecoder.decode` sites off a view of growable memory —
Chrome 149+ refuses one, and the kernel hangs on boot. The patched glue is sha256
`4e5508df3f3173c717b528184ad8def2cba0c8f2f97673e5ac563d453448491a`; `bunyan-kernel.wasm` is untouched
by it. `tests/kernel-glue-growable-decode.test.ts` asserts the shipped bytes, so a relink that drops
the patch fails rather than ships.

## The JS↔WASM boundary: one crossing per op, not per element

`tessellate` hands JavaScript **`typed_memory_view`s** — zero-copy windows onto the mesh buffers —
rather than embind `std::vector`s. This is not a micro-optimisation. Reading an embind vector costs
**one boundary crossing per element**: a 200k-vertex model would pay ~1.8 million crossings per
tessellation, on every drag frame, quietly reintroducing the exact cost this architecture exists to
avoid.

⚠ **The views are valid only until the next `tessellate` call.** `@bunyan/kernel-occt` copies them
into owned typed arrays synchronously; never hold one across an `await`.

## Licensing: settled — **the static link STANDS**

**Bunyan is AGPL-3.0** (owner ruling, `docs/CURRENT_STATE.md` §4e / Entry 6). LGPL-2.1's relink obligation
exists so a user can rebuild against their own OCCT — **public, buildable source satisfies that
automatically.** So the static link stays and we keep the small artifact.

**Do not build an OCCT side-module. Do not ship object files.** (An earlier ruling mandated a side
module; it assumed Bunyan would be proprietary and was superseded.) LGPL still requires a **prominent
OCCT attribution notice** — README + the app's About screen.
