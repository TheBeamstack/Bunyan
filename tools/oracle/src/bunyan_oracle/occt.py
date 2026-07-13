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

import math
from typing import Any

from OCP.BRep import BRep_Tool
from OCP.BRepAlgoAPI import BRepAlgoAPI_Cut
from OCP.BRepBndLib import BRepBndLib
from OCP.BRepBuilderAPI import (
    BRepBuilderAPI_MakeEdge,
    BRepBuilderAPI_MakeFace,
    BRepBuilderAPI_MakeWire,
    BRepBuilderAPI_Transform,
)
from OCP.BRepFilletAPI import BRepFilletAPI_MakeChamfer, BRepFilletAPI_MakeFillet
from OCP.BRepGProp import BRepGProp
from OCP.BRepPrimAPI import (
    BRepPrimAPI_MakeBox,
    BRepPrimAPI_MakeCylinder,
    BRepPrimAPI_MakePrism,
    BRepPrimAPI_MakeRevol,
)
from OCP.Bnd import Bnd_Box
from OCP.GC import GC_MakeArcOfCircle
from OCP.GProp import GProp_GProps
from OCP.gp import gp_Ax1, gp_Ax2, gp_Ax3, gp_Dir, gp_Pln, gp_Pnt, gp_Trsf, gp_Vec
from OCP.TopAbs import TopAbs_ShapeEnum
from OCP.TopExp import TopExp
from OCP.TopoDS import TopoDS, TopoDS_Shape
from OCP.TopTools import TopTools_IndexedMapOfShape

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


def cylinder(radius: float, height: float) -> dict[str, Any]:
    return measure(BRepPrimAPI_MakeCylinder(radius, height).Shape())


def wall_with_opening(
    dx: float, dy: float, dz: float, ox: float, oy: float, oz: float, at_x: float, at_z: float
) -> dict[str, Any]:
    """A wall, cut clean through by an opening. THE archetypal BIM boolean (core_logic §3.6)."""
    wall = BRepPrimAPI_MakeBox(dx, dy, dz).Shape()
    opening = BRepPrimAPI_MakeBox(gp_Pnt(at_x, 0.0, at_z), ox, oy, oz).Shape()

    cut = BRepAlgoAPI_Cut(wall, opening)
    cut.Build()
    if not cut.IsDone():
        raise RuntimeError("the reference cut did not complete")
    return measure(cut.Shape())


def rotated_wall(dx: float, dy: float, dz: float, degrees: float) -> dict[str, Any]:
    """A wall rotated about the vertical axis through the origin.

    ⚠ WHY THIS CASE EXISTS, AND WHY `measure` ALONE WOULD NOT CATCH THE BUG IT IS FOR: volume, area
    and edge length are INVARIANT under a rigid motion. A transform that rotated by the wrong angle,
    about the wrong axis, or not at all would reproduce every one of them EXACTLY. **The only measure
    that moves is `bounds`** — so this case is really a bounds test wearing a measure test's clothes,
    and the invariant quantities are here to pin the other half: that the motion was rigid at all.
    """
    wall = BRepPrimAPI_MakeBox(dx, dy, dz).Shape()
    rot = gp_Trsf()
    rot.SetRotation(gp_Ax1(gp_Pnt(0, 0, 0), gp_Dir(0, 0, 1)), math.radians(degrees))
    moved = BRepBuilderAPI_Transform(wall, rot, False)
    moved.Build()
    if not moved.IsDone():
        raise RuntimeError("the reference rotation did not complete")
    return measure(moved.Shape())


def mirrored_wall(dx: float, dy: float, dz: float) -> dict[str, Any]:
    """A wall mirrored in the YZ plane (x = 0) — a NEGATIVE, handedness-flipping transform.

    ⚠ The number to watch is `volume`, and it must be POSITIVE. A mishandled negative transform
    yields an inside-out solid whose volume comes back NEGATIVE — and nothing else in the harness
    would notice, because its area, edge length and counts are all still perfect.
    """
    wall = BRepPrimAPI_MakeBox(dx, dy, dz).Shape()
    mirror = gp_Trsf()
    mirror.SetMirror(gp_Ax2(gp_Pnt(0, 0, 0), gp_Dir(1, 0, 0)))
    moved = BRepBuilderAPI_Transform(wall, mirror, False)
    moved.Build()
    if not moved.IsDone():
        raise RuntimeError("the reference mirror did not complete")
    return measure(moved.Shape())


def filleted_box(dx: float, dy: float, dz: float, radius: float) -> dict[str, Any]:
    """A box with ONE edge rounded — the vertical edge at (x = dx, y = 0).

    ⚠ The edge is selected GEOMETRICALLY here, and that is fine: this is the oracle, not the naming
    path. Its job is to produce a reference number for a shape we can describe unambiguously. The
    kernel under test selects the SAME edge by its persistent identity (`x-max|y-min`), which is
    precisely the difference the harness exists to check.
    """
    box_shape = BRepPrimAPI_MakeBox(dx, dy, dz).Shape()

    edge_map = TopTools_IndexedMapOfShape()
    TopExp.MapShapes_s(box_shape, TopAbs_ShapeEnum.TopAbs_EDGE, edge_map)

    target = None
    for i in range(1, edge_map.Extent() + 1):
        edge = TopoDS.Edge_s(edge_map.FindKey(i))
        vertices = TopTools_IndexedMapOfShape()
        TopExp.MapShapes_s(edge, TopAbs_ShapeEnum.TopAbs_VERTEX, vertices)
        points = [
            BRep_Tool.Pnt_s(TopoDS.Vertex_s(vertices.FindKey(j)))
            for j in range(1, vertices.Extent() + 1)
        ]
        if len(points) == 2 and all(
            math.isclose(p.X(), dx, abs_tol=1e-9) and math.isclose(p.Y(), 0.0, abs_tol=1e-9)
            for p in points
        ):
            target = edge
            break
    if target is None:
        raise RuntimeError("could not find the x-max|y-min edge to fillet")

    mk = BRepFilletAPI_MakeFillet(box_shape)
    mk.Add(radius, target)
    mk.Build()
    if not mk.IsDone():
        raise RuntimeError("the reference fillet did not complete")
    return measure(mk.Shape())


def chamfered_box(dx: float, dy: float, dz: float, distance: float) -> dict[str, Any]:
    """A box with ONE edge chamfered — the same `x-max|y-min` vertical edge the fillet case rounds.

    Same reasoning as `filleted_box`: the edge is picked geometrically HERE (this is the oracle, whose
    job is a reference number for an unambiguously-described shape), while the kernel under test picks
    it by its persistent identity. That difference is the point of the check.
    """
    box_shape = BRepPrimAPI_MakeBox(dx, dy, dz).Shape()

    edge_map = TopTools_IndexedMapOfShape()
    TopExp.MapShapes_s(box_shape, TopAbs_ShapeEnum.TopAbs_EDGE, edge_map)

    target = None
    for i in range(1, edge_map.Extent() + 1):
        edge = TopoDS.Edge_s(edge_map.FindKey(i))
        vertices = TopTools_IndexedMapOfShape()
        TopExp.MapShapes_s(edge, TopAbs_ShapeEnum.TopAbs_VERTEX, vertices)
        points = [
            BRep_Tool.Pnt_s(TopoDS.Vertex_s(vertices.FindKey(j)))
            for j in range(1, vertices.Extent() + 1)
        ]
        if len(points) == 2 and all(
            math.isclose(p.X(), dx, abs_tol=1e-9) and math.isclose(p.Y(), 0.0, abs_tol=1e-9)
            for p in points
        ):
            target = edge
            break
    if target is None:
        raise RuntimeError("could not find the x-max|y-min edge to chamfer")

    mk = BRepFilletAPI_MakeChamfer(box_shape)
    mk.Add(distance, target)
    mk.Build()
    if not mk.IsDone():
        raise RuntimeError("the reference chamfer did not complete")
    return measure(mk.Shape())


def _profile_face(points: list[tuple[float, float]], arc: tuple[int, tuple[float, float]] | None):
    """Build a closed planar profile on the z = 0 plane, exactly as the kernel's `extrude` does.

    `points` are the loop's vertices (the last segment closes back to the first). `arc`, when given,
    is `(index, via)` — segment `index` becomes a three-point arc bulging through `via` instead of a
    straight line, which is how a slab gets a curved edge.
    """
    wire = BRepBuilderAPI_MakeWire()
    n = len(points)
    for k in range(n):
        a = gp_Pnt(points[k][0], points[k][1], 0.0)
        b = gp_Pnt(points[(k + 1) % n][0], points[(k + 1) % n][1], 0.0)
        if arc is not None and arc[0] == k:
            via = gp_Pnt(arc[1][0], arc[1][1], 0.0)
            curve = GC_MakeArcOfCircle(a, via, b)
            if not curve.IsDone():
                raise RuntimeError("the reference arc segment is degenerate")
            wire.Add(BRepBuilderAPI_MakeEdge(curve.Value()).Edge())
        else:
            wire.Add(BRepBuilderAPI_MakeEdge(a, b).Edge())
    face = BRepBuilderAPI_MakeFace(wire.Wire())
    if not face.IsDone():
        raise RuntimeError("the reference profile does not bound a face")
    return face.Face()


def extruded_profile(
    points: list[tuple[float, float]],
    height: float,
    arc: tuple[int, tuple[float, float]] | None = None,
) -> dict[str, Any]:
    """A closed boundary swept into a solid — a Slab, in other words (spec §5)."""
    prism = BRepPrimAPI_MakePrism(_profile_face(points, arc), gp_Vec(0.0, 0.0, height))
    prism.Build()
    if not prism.IsDone():
        raise RuntimeError("the reference prism did not complete")
    return measure(prism.Shape())


# The profile plane the revolve cases are authored in: u = +X, v = +Z, normal = -Y. It is the frame a
# revolved element is actually drawn in — a section beside the axis it spins around — and it is the
# SAME frame the TypeScript test sends the kernel, so the two are comparable at all.
_MERIDIAN_PLANE = gp_Ax3(gp_Pnt(0.0, 0.0, 0.0), gp_Dir(0.0, -1.0, 0.0), gp_Dir(1.0, 0.0, 0.0))


def _meridian_face(points: list[tuple[float, float]], arc: tuple[int, tuple[float, float]] | None):
    """A closed profile in the meridian (XZ) plane — (u, v) maps to (u, 0, v) — exactly as the kernel
    builds it from a `Profile` whose plane is origin=(0,0,0), normal=(0,-1,0), xAxis=(1,0,0).
    """
    wire = BRepBuilderAPI_MakeWire()
    n = len(points)
    for k in range(n):
        a = gp_Pnt(points[k][0], 0.0, points[k][1])
        b = gp_Pnt(points[(k + 1) % n][0], 0.0, points[(k + 1) % n][1])
        if arc is not None and arc[0] == k:
            via = gp_Pnt(arc[1][0], 0.0, arc[1][1])
            curve = GC_MakeArcOfCircle(a, via, b)
            if not curve.IsDone():
                raise RuntimeError("the reference arc segment is degenerate")
            wire.Add(BRepBuilderAPI_MakeEdge(curve.Value()).Edge())
        else:
            wire.Add(BRepBuilderAPI_MakeEdge(a, b).Edge())
    face = BRepBuilderAPI_MakeFace(gp_Pln(_MERIDIAN_PLANE), wire.Wire())
    if not face.IsDone():
        raise RuntimeError("the reference profile does not bound a face")
    return face.Face()


def revolved_profile(
    points: list[tuple[float, float]],
    angle_deg: float,
    arc: tuple[int, tuple[float, float]] | None = None,
) -> dict[str, Any]:
    """A closed meridian profile spun about the Z axis — a column, a tube, a dome (spec §5: GenericSolid).

    The angle is in degrees. 360 is the ordinary case, and it is NOT the partial one with a bigger
    number: it has no caps and every lateral face closes on itself with a seam. That asymmetry is the
    whole difficulty of the op, and it is why this reference exists.
    """
    revol = BRepPrimAPI_MakeRevol(
        _meridian_face(points, arc),
        gp_Ax1(gp_Pnt(0.0, 0.0, 0.0), gp_Dir(0.0, 0.0, 1.0)),
        math.radians(angle_deg),
    )
    revol.Build()
    if not revol.IsDone():
        raise RuntimeError("the reference revolve did not complete")
    return measure(revol.Shape())
