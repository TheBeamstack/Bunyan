# `tools/kernel-build` — the OCCT → WebAssembly kernel build

**This is the reproducible recipe that produces Bunyan's geometry kernel.** It compiles **upstream
OCCT 7.9.3** to WebAssembly and links it with our C++ ops into a single module.

Verified 2026-07-12 on the Hetzner dev box: the output **matches the native-OCCT goldens exactly**
(`tests/goldens/geometry.golden.json`).

---

## The architecture (read this before changing anything)

**JavaScript never touches OCCT.** The `.wasm` module *is* the kernel: `src/kernel.cpp` implements the
ops (`makeBox`, `measure`, `tessellate`, `releaseShape`) and is statically linked against OCCT.
JavaScript calls **our op set**, not OCCT's API.

This is the opposite of `opencascade.js`, and it is deliberate:

| | `opencascade.js` | **this build** |
|---|---|---|
| What JS calls | all of OCCT's API | **our ops** |
| Geometry logic lives in | JavaScript | **C++, inside the WASM** |
| JS↔WASM crossings | one **per OCCT call** | one **per op** |
| Artifact (raw / gzip) | 62.8 MB / 13.1 MB | **3.94 MB / 1.46 MB** |
| OCCT version | 7.6.2 (2022) | **7.9.3** (matches our oracle) |

**Consequences that matter:**
- The linker keeps only OCCT code our ops actually reach ⇒ the artifact tracks what we **use**.
- The JS binding surface **never grows**. Adding features = **writing more C++ ops**, not exposing
  more OCCT. This is what lets the product scale to Revit-class scope.
- **IfcOpenShell can later link against this same OCCT build** — which is the only way to import IFC
  as *exact solids* rather than triangles. That is impossible with a prebuilt package.

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

# 4. judge it against the native-OCCT goldens
docker run --rm --memory=1g --user "$(id -u):$(id -g)" \
  -v "$REPO:/work" -v "$HOME/projects/Bunyan/tests/goldens:/goldens:ro" \
  -w /work emscripten/emsdk:latest node verify.mjs
```

`link.sh` writes to `dist/`; the **committed** artifact lives in `wasm/`. Copy `dist/*` → `wasm/` and
**re-run `verify.mjs`** before committing a new kernel.

## Pinned toolchain

| | |
|---|---|
| OCCT | **7.9.3** (`V7_9_3`, upstream, **unpatched**) |
| emscripten | `emscripten/emsdk:latest` → **emcc 6.0.2** |
| Threading | **single** (owner ruling: v1.0.0 ships single-threaded; MT in v1.0.x) |
| Artifact | `wasm/bunyan-kernel.{js,wasm}` — **3.94 MB raw / 1.46 MB gzip** |

⚠ **The OCCT version + emcc version are the kernel *build id*.** It is stamped into every saved
`.bimproj` and invalidates the geometry cache when it changes (spec §6). Bump it deliberately, and
**re-seed the goldens** (`tools/oracle`) whenever OCCT changes.

## ⚠ Open: LICENSING (owner ruled — not yet implemented)

**OCCT is LGPL 2.1**, and its exception covers only *header* material in object code — **not** general
static linking. This build **statically links** OCCT, which triggers LGPL's relink obligation.

**The owner ruled for the swappable side-module route** (OCCT as a separate, replaceable `.wasm`).
**Not yet done — and it must be measured first:** a side module cannot be dead-stripped the way this
static link is (it must keep what a caller *might* use), so **it will likely cost much of the 9× size
advantage**, plus a boundary performance cost. **Next session: prototype it and report the real
numbers** before committing to it. See `current_state.md` §4d.
