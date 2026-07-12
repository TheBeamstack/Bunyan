#!/bin/bash
# Configure upstream OCCT 7.9.3 for WebAssembly.
#
# Two decisions encoded here, both load-bearing:
#   1. NO LTO. opencascade.js compiles its whole object cache with -flto, which forces every link to
#      be a whole-program optimisation over LLVM bitcode. That is what OOM-killed every build on this
#      box (3.7 GiB, hosting live sites) even for a 6-symbol build. Upstream lets us simply not do it.
#   2. Modelling modules ONLY. Bunyan renders with three.js and does its own naming (D1), so OCCT's
#      Visualization, ApplicationFramework (OCAF), DataExchange (STEP/IGES) and Draw are dead weight.
#      Dropping them removes ~2070 of 5805 source files and the FreeType dependency with them.
set -e

cmake -S /src/occt -B /build \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_INSTALL_PREFIX=/install \
  -DBUILD_LIBRARY_TYPE=Static \
  \
  -DBUILD_MODULE_Visualization=OFF \
  -DBUILD_MODULE_ApplicationFramework=OFF \
  -DBUILD_MODULE_DataExchange=OFF \
  -DBUILD_MODULE_Draw=OFF \
  -DBUILD_MODULE_DETools=OFF \
  \
  -DUSE_FREETYPE=OFF \
  -DUSE_TK=OFF \
  -DUSE_TCL=OFF \
  -DUSE_OPENGL=OFF \
  -DUSE_GLES2=OFF \
  -DUSE_RAPIDJSON=OFF \
  -DUSE_DRACO=OFF \
  -DUSE_TBB=OFF \
  -DUSE_VTK=OFF \
  -DUSE_FFMPEG=OFF \
  -DUSE_OPENVR=OFF \
  -DBUILD_DOC_Overview=OFF \
  \
  -DCMAKE_CXX_FLAGS="-O2 -fexceptions -DIGNORE_NO_ATOMICS=1 -DOCCT_NO_PLUGINS" \
  -DCMAKE_C_FLAGS="-O2" \
  "$@" \
  2>&1 | tail -25

echo
echo "=== modules that will actually be built ==="
grep -E "^BUILD_MODULE_[A-Za-z]+:BOOL=ON" /build/CMakeCache.txt || true
echo "=== toolkits configured: $(grep -cE '^TOOLKIT|_LIBRARY' /build/CMakeCache.txt 2>/dev/null || echo '?') ==="
