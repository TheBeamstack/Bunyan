#!/bin/bash
# Link the Bunyan kernel: our C++ ops + upstream OCCT 7.9.3 static libs -> one .wasm module.
#
# NOTE the flags we get to choose here, which opencascade.js did not let us choose:
#   * The linker keeps only OCCT code our ops actually reach, so the artifact tracks what we USE.
#
# ⚠⚠ -O3 / -flto: MEASURED 2026-07-14 (Entry 21, owner-authorised). **DO NOT RE-RUN THIS EXPERIMENT.**
#
#   -O2 (was shipped)  cold load 7,334 ms   15.37 MB
#   -O3 (SHIPS NOW)    cold load 7,283 ms   14.59 MB   ← speed is NOISE. 5% smaller is real, so we keep it.
#   -O3 -flto          cold load 7,235 ms   14.59 MB   ← also noise, and 2x the link time (123 s vs 76 s).
#
#   * -O3 is now the build. It buys NO speed — but it is 5% smaller for free, and the download size is
#     an open question (spec §4j-5). All 186 tests pass on it, including every golden against the
#     NATIVE OCCT oracle and every naming test: same geometry, same identity tokens.
#
#   * ⚠ -flto LINKS FINE HERE — it does NOT OOM. Entry 3's hard stop was *opencascade.js's* whole-program
#     graph, not ours, and that distinction was never tested until now. **But it buys nothing, and the
#     reason is structural: OUR OCCT STATIC LIBS ARE PLAIN OBJECT FILES, NOT LLVM BITCODE** (`ar t
#     libTKMath.a` → `math.cxx.o`). So -flto can only optimise `kernel.cpp` — it cannot see *into* OCCT,
#     which is where **100% of the runtime is** (§4j-2's profile). It is optimising the 0.2%.
#
#   * ⇒ The only way LTO could ever pay is **rebuilding OCCT ITSELF with -flto** — a 2.5 h rebuild, and
#     **precisely the whole-program link that OOM-killed opencascade.js on this box.** Not attempted, and
#     not recommended: the measured prize is a 3x gap to native that is single-threading + the WASM
#     boundary, and **multithreading (v1.0.x) is the lever that actually closes it.**
set -e

OCCT_LIB=/install/lib
OCCT_INC=/install/include/opencascade

# Order matters for static archives; OCCT's dependency graph goes high-level -> low-level.
LIBS="
  -lTKMesh -lTKFillet -lTKOffset -lTKBool -lTKBO -lTKPrim -lTKShHealing -lTKFeat -lTKHLR
  -lTKTopAlgo -lTKGeomAlgo -lTKBRep -lTKGeomBase -lTKG3d -lTKG2d -lTKMath -lTKernel
"

mkdir -p /work/dist

em++ -O3 -std=c++17 \
  -fexceptions \
  -I"$OCCT_INC" \
  /work/src/kernel.cpp \
  -L"$OCCT_LIB" $LIBS \
  --bind \
  -sMODULARIZE=1 \
  -sEXPORT_ES6=1 \
  -sEXPORT_NAME=initBunyanKernel \
  -sALLOW_MEMORY_GROWTH=1 \
  -sINITIAL_MEMORY=64MB \
  -sMAXIMUM_MEMORY=4GB \
  -sDISABLE_EXCEPTION_CATCHING=0 \
  -sENVIRONMENT=web,worker,node \
  -sASSERTIONS=0 \
  -o /work/dist/bunyan-kernel.js

echo
echo "=== ARTIFACT ==="
ls -l /work/dist/
