#!/bin/bash
# Link the NAMING PROBE (src/probe.cpp) — a measurement instrument, not the shipped kernel.
#
# Same OCCT static libs, same flags as link.sh (no -flto; see the note there). It produces its own
# module so that nothing exploratory ever lands in the kernel Amer ships against.
#
#   # ⚠ PINNED BY DIGEST (Q14) — `:latest` moves, and it already has: 6.0.2 -> 6.0.5. See toolchain.json.
#   EMSDK=$(node -p "require('./toolchain.json').emsdk.image + '@' + require('./toolchain.json').emsdk.digest")
#   docker run --rm --memory=2g --cpus=2 --user "$(id -u):$(id -g)" \
#     -v "$PWD:/work" -v "$HOME/occt-wasm-spike/install:/install:ro" \
#     "$EMSDK" bash /work/probe.sh
#   node probe-history.mjs
set -e

OCCT_LIB=/install/lib
OCCT_INC=/install/include/opencascade

LIBS="
  -lTKMesh -lTKFillet -lTKOffset -lTKBool -lTKBO -lTKPrim -lTKShHealing -lTKFeat -lTKHLR
  -lTKTopAlgo -lTKGeomAlgo -lTKBRep -lTKGeomBase -lTKG3d -lTKG2d -lTKMath -lTKernel
"

mkdir -p /work/dist

em++ -O2 -std=c++17 \
  -fexceptions \
  -I"$OCCT_INC" \
  /work/src/probe.cpp \
  -L"$OCCT_LIB" $LIBS \
  --bind \
  -sMODULARIZE=1 \
  -sEXPORT_ES6=1 \
  -sEXPORT_NAME=initBunyanProbe \
  -sALLOW_MEMORY_GROWTH=1 \
  -sINITIAL_MEMORY=64MB \
  -sMAXIMUM_MEMORY=4GB \
  -sDISABLE_EXCEPTION_CATCHING=0 \
  -sENVIRONMENT=node \
  -sASSERTIONS=0 \
  -o /work/dist/bunyan-probe.js

echo
echo "=== PROBE ==="
ls -l /work/dist/bunyan-probe.*
