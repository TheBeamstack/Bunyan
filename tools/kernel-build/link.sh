#!/bin/bash
# Link the Bunyan kernel: our C++ ops + upstream OCCT 7.9.3 static libs -> one .wasm module.
#
# NOTE the flags we get to choose here, which opencascade.js did not let us choose:
#   * NO -flto. Whole-program optimisation over LLVM bitcode is what OOM-killed every opencascade.js
#     link on this 3.7 GiB box, even for a 6-symbol build. Plain -O2 links in a fraction of the memory.
#   * The linker keeps only OCCT code our ops actually reach, so the artifact tracks what we USE.
set -e

OCCT_LIB=/install/lib
OCCT_INC=/install/include/opencascade

# Order matters for static archives; OCCT's dependency graph goes high-level -> low-level.
LIBS="
  -lTKMesh -lTKFillet -lTKOffset -lTKBool -lTKBO -lTKPrim -lTKShHealing -lTKFeat -lTKHLR
  -lTKTopAlgo -lTKGeomAlgo -lTKBRep -lTKGeomBase -lTKG3d -lTKG2d -lTKMath -lTKernel
"

mkdir -p /work/dist

em++ -O2 -std=c++17 \
  -fexceptions \
  -I"$OCCT_INC" \
  /work/kernel.cpp \
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
