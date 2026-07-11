"""THE PRIMARY ORACLE: the measures, computed by a native OCCT build via OCP.

Scope (spec §9.0, owner ruling 2026-07-11): **we trust OCCT; we verify our own code.**

This file produces the reference values our WASM build is checked against. Because it runs the
same kernel through a *different binding, a different build, and a different code path*, a
disagreement means **our** code is wrong — a mis-wired parameter, a wrong op or op order, or a
broken/mis-configured WASM build. That is exactly, and only, what we are trying to catch.

It does NOT certify OCCT, and is not asked to: OCP and our WASM build are the same OpenCascade
C++ code, so validating the kernel with it would be circular. Validating OCCT is out of scope.
"""

from __future__ import annotations

from typing import Any

from OCP.BRepBndLib import BRepBndLib
from OCP.BRepGProp import BRepGProp
from OCP.BRepPrimAPI import BRepPrimAPI_MakeBox
from OCP.Bnd import Bnd_Box
from OCP.GProp import GProp_GProps
from OCP.TopAbs import TopAbs_ShapeEnum
from OCP.TopExp import TopExp
from OCP.TopTools import TopTools_IndexedMapOfShape
from OCP.TopoDS import TopoDS_Shape

_KINDS = {
    "solids": TopAbs_ShapeEnum.TopAbs_SOLID,
    "faces": TopAbs_ShapeEnum.TopAbs_FACE,
    "edges": TopAbs_ShapeEnum.TopAbs_EDGE,
    "vertices": TopAbs_ShapeEnum.TopAbs_VERTEX,
}


def _count(shape: TopoDS_Shape, kind: TopAbs_ShapeEnum) -> int:
    """Counts UNIQUE sub-shapes.

    `TopExp_Explorer` walks occurrences, not unique shapes — a box's 12 edges each belong to two
    faces, so exploring for edges reports 24. `MapShapes` deduplicates (by TShape + location), which
    is what the topology-count check in the harness actually means.
    """
    shape_map = TopTools_IndexedMapOfShape()
    TopExp.MapShapes_s(shape, kind, shape_map)
    return shape_map.Extent()


def _total_edge_length(shape: TopoDS_Shape) -> float:
    """Total length of the UNIQUE edges.

    Calling `BRepGProp.LinearProperties` on a solid directly does NOT give this: it walks edge
    occurrences, and every edge of a closed solid is shared by two faces, so it returns exactly
    twice the true total (a 3000x200x2500 box reports 45600 mm against a closed-form 22800 mm).
    Summing over the deduplicated edge map is the measure that means what the goldens claim.
    """
    edge_map = TopTools_IndexedMapOfShape()
    TopExp.MapShapes_s(shape, TopAbs_ShapeEnum.TopAbs_EDGE, edge_map)

    total = 0.0
    for i in range(1, edge_map.Extent() + 1):
        props = GProp_GProps()
        BRepGProp.LinearProperties_s(edge_map.FindKey(i), props)
        total += props.Mass()
    return total


def measure(shape: TopoDS_Shape) -> dict[str, Any]:
    volume_props = GProp_GProps()
    BRepGProp.VolumeProperties_s(shape, volume_props)

    surface_props = GProp_GProps()
    BRepGProp.SurfaceProperties_s(shape, surface_props)

    # `AddOptimal` gives the tight box the bounds schema is checked against (spec §9).
    bbox = Bnd_Box()
    BRepBndLib.AddOptimal_s(shape, bbox)
    xmin, ymin, zmin, xmax, ymax, zmax = bbox.Get()

    return {
        "volume": volume_props.Mass(),
        "area": surface_props.Mass(),
        "edgeLength": _total_edge_length(shape),
        "counts": {name: _count(shape, kind) for name, kind in _KINDS.items()},
        "bounds": {"min": [xmin, ymin, zmin], "max": [xmax, ymax, zmax]},
    }


def box(dx: float, dy: float, dz: float) -> dict[str, Any]:
    return measure(BRepPrimAPI_MakeBox(dx, dy, dz).Shape())
