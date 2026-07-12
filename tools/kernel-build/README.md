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
live public sites (see `current_state.md` §6a).

```bash
SPIKE=$HOME/occt-wasm-spike            # keep OCCT source OUT of the repo and OFF tmpfs (/tmp is RAM here)
mkdir -p "$SPIKE" && cd "$SPIKE"
curl -sL -o occt.tar.gz https://github.com/Open-Cascade-SAS/OCCT/archive/refs/tags/V7_9_3.tar.gz
tar xzf occt.tar.gz && mv OCCT-7_9_3 occt
mkdir -p build install

REPO=$HOME/projects/Bunyan/tools/kernel-build

# 1. configure (emscripten toolchain)
docker run --rm --memory=2g --cpus=2 --user "$(id -u):$(id -g)" \
  -v "$PWD/occt:/src/occt:ro" -v "$PWD/build:/build" -v "$PWD/install:/install" \
  -v "$REPO/configure.sh:/configure.sh:ro" \
  emscripten/emsdk:latest bash -c "emcmake bash /configure.sh"

# 2. compile OCCT  (~2.5 h)
docker run --rm --memory=2g --cpus=2 --user "$(id -u):$(id -g)" \
  -v "$PWD/occt:/src/occt:ro" -v "$PWD/build:/build" -v "$PWD/install:/install" \
  emscripten/emsdk:latest cmake --build /build --target install -j 2

# 3. link our kernel  (seconds)
docker run --rm --memory=2g --cpus=2 --user "$(id -u):$(id -g)" \
  -v "$REPO:/work" -v "$PWD/install:/install:ro" \
  emscripten/emsdk:latest bash /work/link.sh

# 4. judge it against the native-OCCT goldens (build-time smoke check)
node verify.mjs
```

`link.sh` writes to `dist/` (gitignored). The **committed** artifact lives with the package that ships
it — **`packages/kernel-occt/wasm/`**. After a rebuild:

```bash
cp dist/bunyan-kernel.{js,wasm} ../../packages/kernel-occt/wasm/
cd ../.. && pnpm verify          # the REAL gate: 95 tests, both kernels, real geometry
```

## `probe.cpp` — the naming probe (a measurement instrument, not the kernel)

`src/probe.cpp` links as its **own** WASM module and answers one question empirically:
**what does OCCT's `Generated`/`Modified`/`IsDeleted` history ACTUALLY report** — for a cylinder, for
three booleans, and for a fillet on an edge a boolean created (the case spec §4.5 calls the hardest)?

The naming rules in `src/kernel.cpp` are what they are **because of what this printed** (Entry 9). It
is committed so that the next person to change those rules can re-run the measurement instead of
trusting the comment above them — or the literature, which on OCCT 7.9.3 turned out to be wrong.

```bash
docker run --rm --memory=2g --cpus=2 --user "$(id -u):$(id -g)" \
  -v "$REPO:/work" -v "$SPIKE/install:/install:ro" \
  emscripten/emsdk:latest bash /work/probe.sh     # ~60 s, same libs as the kernel
node probe-history.mjs                            # the report; --json for the raw data
```

Read the **STILL UNNAMEABLE** column first: it is the only number that matters — how many sub-shapes
the resolver would have to *refuse*, once history and adjacency have both been applied.

⚠ **`pnpm verify` is what judges a new kernel, not `verify.mjs`.** The vitest suite drives the kernel
through the protocol and gates the goldens, the naming, the wireframe, the WASM-heap leak canary and
the typed-failure contract — on every push. `verify.mjs` is only the build-time smoke check, for the
moment when there is a `.wasm` but no repo around it.

## Pinned toolchain

|            |                                                                                      |
| ---------- | ------------------------------------------------------------------------------------ |
| OCCT       | **7.9.3** (`V7_9_3`, upstream, **unpatched**)                                        |
| emscripten | `emscripten/emsdk:latest` → **emcc 6.0.2**                                           |
| Threading  | **single** (owner ruling: v1.0.0 ships single-threaded; MT in v1.0.x)                |
| Artifact   | `packages/kernel-occt/wasm/bunyan-kernel.{js,wasm}` — **3.98 MB raw / ~1.5 MB gzip** |

⚠ **The OCCT version + emcc version are the kernel _build id_** (`occt-7.9.3-emcc-6.0.2`, in
`packages/kernel-occt/src/kernel.ts`). It is stamped into every saved `.bimproj` and invalidates the
geometry cache when it changes (spec §6). Bump it deliberately, and **re-seed the goldens**
(`tools/oracle`) whenever OCCT changes.

## The JS↔WASM boundary: one crossing per op, not per element

`tessellate` hands JavaScript **`typed_memory_view`s** — zero-copy windows onto the mesh buffers —
rather than embind `std::vector`s. This is not a micro-optimisation. Reading an embind vector costs
**one boundary crossing per element**: a 200k-vertex model would pay ~1.8 million crossings per
tessellation, on every drag frame, quietly reintroducing the exact cost this architecture exists to
avoid.

⚠ **The views are valid only until the next `tessellate` call.** `@bunyan/kernel-occt` copies them
into owned typed arrays synchronously; never hold one across an `await`.

## Licensing: settled — **the static link STANDS**

**Bunyan is AGPL-3.0** (owner ruling, `current_state.md` §4e / Entry 6). LGPL-2.1's relink obligation
exists so a user can rebuild against their own OCCT — **public, buildable source satisfies that
automatically.** So the static link stays and we keep the small artifact.

**Do not build an OCCT side-module. Do not ship object files.** (An earlier ruling mandated a side
module; it assumed Bunyan would be proprietary and was superseded.) LGPL still requires a **prominent
OCCT attribution notice** — README + the app's About screen.
