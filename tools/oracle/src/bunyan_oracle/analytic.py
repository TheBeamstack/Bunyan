"""Closed-form sanity check (spec §9.1 tier 2).

We trust OCCT, so this is NOT here to audit the kernel. It is here to guard the one layer the
reference-build oracle cannot: **our own measurement and seeding code.** `occt.py` and the WASM
kernel could agree perfectly while we ask them both the wrong question — and that is not
hypothetical. On this module's first run it caught exactly that: we were reading OCCT's
`LinearProperties` off a solid, which sums each edge once per adjoining face, giving 45,600 mm
of edge for a box whose edges total 22,800 mm. Without this check that wrong number would have
been committed as the trusted golden, and a correct implementation would then have failed CI.

The seeder cross-checks these values against `occt.py` and ABORTS on disagreement, so a wrong
golden cannot be committed silently.

Exact for the shapes v1.0.0 actually ships: boxes (Wall, Slab, Column, Opening), prisms and
extrusions of polygonal profiles, cylinders, and boolean differences of axis-aligned boxes (an
Opening cut through a Wall). Where no closed form exists (a fillet on a boolean edge), this tier
simply does not apply and the reference-build oracle stands alone — which spec §9.0 permits.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, asdict
from typing import Any


@dataclass(frozen=True)
class Counts:
    solids: int
    faces: int
    edges: int
    vertices: int


@dataclass(frozen=True)
class Measures:
    volume: float
    area: float
    edge_length: float
    counts: Counts
    bounds_min: tuple[float, float, float]
    bounds_max: tuple[float, float, float]

    def to_json(self) -> dict[str, Any]:
        return {
            "volume": self.volume,
            "area": self.area,
            "edgeLength": self.edge_length,
            "counts": asdict(self.counts),
            "bounds": {"min": list(self.bounds_min), "max": list(self.bounds_max)},
        }


def box(dx: float, dy: float, dz: float) -> Measures:
    """A box at the origin, in millimetres (spec §6, decision D5)."""
    return Measures(
        volume=dx * dy * dz,
        area=2.0 * (dx * dy + dy * dz + dz * dx),
        edge_length=4.0 * (dx + dy + dz),
        counts=Counts(solids=1, faces=6, edges=12, vertices=8),
        bounds_min=(0.0, 0.0, 0.0),
        bounds_max=(dx, dy, dz),
    )


def rotated_box(dx: float, dy: float, dz: float, degrees: float) -> Measures:
    """A box rotated about the Z axis through the origin.

    ⚠ THE CLOSED FORM EXISTS HERE, AND IT IS WORTH HAVING. A rigid motion preserves volume, area and
    edge length exactly — so those come straight from `box()`, and asserting they are UNCHANGED is
    itself the check that the motion was rigid. What genuinely moves is the bounding box, and it too
    is closed-form: rotate the four base corners, take their extremes. Z is untouched by a rotation
    about Z.

    This is the tier that guards OUR OWN measurement code (spec §9.0): if the WASM kernel and the
    native-OCCT oracle both went through the same wrong angle — because the bug is in how *we* pass
    the angle, e.g. degrees where radians were wanted — they would agree with each other and both be
    wrong. The closed form is computed from the angle independently, so it does not share that fault.
    """
    base = box(dx, dy, dz)
    theta = math.radians(degrees)
    cos, sin = math.cos(theta), math.sin(theta)
    corners = [(0.0, 0.0), (dx, 0.0), (0.0, dy), (dx, dy)]
    rotated = [(x * cos - y * sin, x * sin + y * cos) for x, y in corners]
    xs = [x for x, _ in rotated]
    ys = [y for _, y in rotated]

    return Measures(
        volume=base.volume,
        area=base.area,
        edge_length=base.edge_length,
        counts=base.counts,
        bounds_min=(min(xs), min(ys), 0.0),
        bounds_max=(max(xs), max(ys), dz),
    )


def mirrored_box(dx: float, dy: float, dz: float) -> Measures:
    """A box mirrored in the YZ plane (x = 0): it lands at x in [-dx, 0].

    ⚠ `volume` is POSITIVE. A mirror flips handedness, and a kernel that mishandles that returns an
    inside-out solid of NEGATIVE volume — while its area, edge length and counts all stay perfect.
    This is the tier that says which sign is right.
    """
    base = box(dx, dy, dz)
    return Measures(
        volume=base.volume,
        area=base.area,
        edge_length=base.edge_length,
        counts=base.counts,
        bounds_min=(-dx, 0.0, 0.0),
        bounds_max=(0.0, dy, dz),
    )


def cylinder(radius: float, height: float) -> Measures:
    """A capped cylinder. Faces: lateral + 2 caps. Edges: 2 circular seams + 1 seam line."""
    return Measures(
        volume=math.pi * radius**2 * height,
        area=2.0 * math.pi * radius * (radius + height),
        edge_length=2.0 * (2.0 * math.pi * radius) + height,
        counts=Counts(solids=1, faces=3, edges=3, vertices=2),
        bounds_min=(-radius, -radius, 0.0),
        bounds_max=(radius, radius, height),
    )


def wall_with_opening(
    dx: float, dy: float, dz: float, ox: float, oy: float, oz: float, at_x: float, at_z: float
) -> Measures:
    """A wall box minus an opening box cut clean through its thickness.

    The archetypal MVP case (core_logic §3.6): Opening subtracted from a Wall host. Requires the
    opening to pierce the full thickness (oy == dy) and to be strictly interior in x and z, so no
    faces merge — which keeps the face/edge counts closed-form.
    """
    if not math.isclose(oy, dy):
        raise ValueError("opening must pierce the full wall thickness for the closed form to hold")
    if at_x <= 0 or at_z <= 0 or at_x + ox >= dx or at_z + oz >= dz:
        raise ValueError("opening must be strictly interior to the wall face")

    volume = dx * dy * dz - ox * oy * oz
    # Two big faces lose the opening's mouth; the cut adds 4 reveal faces; the two thickness-facing
    # ends of the opening are open, so they contribute no face.
    area = 2.0 * (dx * dy + dy * dz + dz * dx) - 2.0 * (ox * oz) + 2.0 * (ox * dy + oz * dy)
    edge_length = 4.0 * (dx + dy + dz) + 2.0 * (2.0 * (ox + oz)) + 4.0 * dy

    return Measures(
        volume=volume,
        area=area,
        edge_length=edge_length,
        # 6 box faces (2 of them now annular) + 4 reveals.
        counts=Counts(solids=1, faces=10, edges=24, vertices=16),
        bounds_min=(0.0, 0.0, 0.0),
        bounds_max=(dx, dy, dz),
    )


def extruded_polygon(points: list[tuple[float, float]], height: float) -> Measures:
    """A closed POLYGON boundary swept vertically — i.e. a Slab (spec §5: "planar boundary + thickness").

    ⚠ THIS TIER EARNS ITS KEEP HERE MORE THAN ANYWHERE ELSE IN THE HARNESS, and the reason is worth
    stating plainly: **`occt.py` and the WASM kernel are handed the same profile.** If *we* build the
    boundary wrongly — a dropped vertex, a transposed coordinate, a segment that closes the loop the
    long way round — then both of them sweep the *same* wrong polygon, produce the *same* wrong solid,
    and agree with each other to the last digit. The reference-build oracle is structurally blind to it.

    This function is the only thing in the harness that computes the answer **from the vertices**
    rather than from a swept solid, so it is the only thing that can catch it.

    Shoelace area, and the topology of a prism over an n-gon: n+2 faces, 3n edges, 2n vertices.
    """
    n = len(points)
    if n < 3:
        raise ValueError("a polygon needs at least 3 vertices")

    shoelace = 0.0
    perimeter = 0.0
    for i in range(n):
        x1, y1 = points[i]
        x2, y2 = points[(i + 1) % n]
        shoelace += x1 * y2 - x2 * y1
        perimeter += math.hypot(x2 - x1, y2 - y1)
    base_area = abs(shoelace) / 2.0

    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return Measures(
        volume=base_area * height,
        # Two caps, plus one lateral face per segment.
        area=2.0 * base_area + perimeter * height,
        # The two cap loops, plus one vertical edge per vertex.
        edge_length=2.0 * perimeter + n * height,
        counts=Counts(solids=1, faces=n + 2, edges=3 * n, vertices=2 * n),
        bounds_min=(min(xs), min(ys), 0.0),
        bounds_max=(max(xs), max(ys), height),
    )


def extruded_with_arc(
    points: list[tuple[float, float]],
    height: float,
    arc_index: int,
    via: tuple[float, float],
) -> Measures:
    """The same, but with segment `arc_index` bowed out into a three-point circular arc.

    ⚠ THE SHAPE THAT PROVES THE OP IS NOT A BOX IN DISGUISE. A curved slab edge is the case no boolean
    tree of boxes can express, so it is the one that shows `extrude` bought something real — and it is
    the one whose numbers a mistake in the arc code would quietly spoil.

    Closed form: take the polygon (chord in place of the arc), then correct for the circular segment
    the arc adds. For a chord of length `c` bulging to a sagitta `s`:

        R = (c/2)^2 / (2s) + s/2          (the circle through the three points)
        segment area = R^2 * acos(d/R) - d * sqrt(R^2 - d^2)      where d = R - s
        arc length   = 2 * R * asin(c / (2R))                     (minor arc; s < c/2)

    The extra area feeds volume (x height) and both caps; the arc replaces its chord in the perimeter,
    so it feeds the lateral area and the cap edge length. The topology is unchanged — an arc segment
    still contributes exactly one lateral face and one vertical edge.
    """
    poly = extruded_polygon(points, height)

    n = len(points)
    ax, ay = points[arc_index]
    bx, by = points[(arc_index + 1) % n]
    chord = math.hypot(bx - ax, by - ay)

    # The sagitta: how far `via` stands off the chord.
    # (Distance from a point to the line through a and b.)
    sagitta = abs((bx - ax) * (ay - via[1]) - (ax - via[0]) * (by - ay)) / chord
    if sagitta <= 0.0:
        raise ValueError("the arc's via point lies on its chord — that is a line, not an arc")

    radius = (chord / 2.0) ** 2 / (2.0 * sagitta) + sagitta / 2.0
    if sagitta >= radius:
        raise ValueError("this closed form covers the minor arc only (sagitta < radius)")
    d = radius - sagitta

    segment_area = radius**2 * math.acos(d / radius) - d * math.sqrt(radius**2 - d**2)
    arc_length = 2.0 * radius * math.asin(chord / (2.0 * radius))

    # ⚠ THE BOUNDS MUST FOLLOW THE ARC, NOT THE CHORD. The bulge sticks out past the polygon's own
    # extent — that is the entire point of it — so taking the polygon's bounding box here would hand
    # the seeder a box the arc pokes through, and the cross-check against OCCT would (rightly) abort.
    #
    # The extremes of a circular arc are its two endpoints, PLUS any of the circle's four axis-extreme
    # points (cx±R, cy) / (cx, cy±R) that actually lie on the swept portion. So find the centre, then
    # test each candidate against the sweep.
    cx, cy = _circumcentre(points[arc_index], via, points[(arc_index + 1) % n])

    ang = lambda px, py: math.atan2(py - cy, px - cx)  # noqa: E731
    theta_a, theta_via, theta_b = ang(ax, ay), ang(*via), ang(bx, by)

    def _on_arc(theta: float) -> bool:
        """Is `theta` on the arc that runs a -> via -> b?"""
        # Sweep counter-clockwise from a; the arc is the one that reaches `via` before `b`.
        norm = lambda t: (t - theta_a) % (2.0 * math.pi)  # noqa: E731
        return norm(theta) <= norm(theta_b) if norm(theta_via) <= norm(theta_b) else norm(theta) >= norm(theta_b)

    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    for theta, px, py in (
        (0.0, cx + radius, cy),
        (math.pi, cx - radius, cy),
        (math.pi / 2.0, cx, cy + radius),
        (-math.pi / 2.0, cx, cy - radius),
    ):
        if _on_arc(theta):
            xs.append(px)
            ys.append(py)

    return Measures(
        volume=poly.volume + segment_area * height,
        area=poly.area + 2.0 * segment_area + (arc_length - chord) * height,
        edge_length=poly.edge_length + 2.0 * (arc_length - chord),
        counts=poly.counts,
        bounds_min=(min(xs), min(ys), 0.0),
        bounds_max=(max(xs), max(ys), height),
    )


def _circumcentre(
    a: tuple[float, float], b: tuple[float, float], c: tuple[float, float]
) -> tuple[float, float]:
    """The centre of the unique circle through three non-collinear points."""
    (ax, ay), (bx, by), (cx, cy) = a, b, c
    d = 2.0 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
    if abs(d) < 1e-12:
        raise ValueError("the three points are collinear — there is no circle through them")
    ux = ((ax**2 + ay**2) * (by - cy) + (bx**2 + by**2) * (cy - ay) + (cx**2 + cy**2) * (ay - by)) / d
    uy = ((ax**2 + ay**2) * (cx - bx) + (bx**2 + by**2) * (ax - cx) + (cx**2 + cy**2) * (bx - ax)) / d
    return (ux, uy)


# ---------------------------------------------------------------------------------------------
# REVOLVE. The closed forms below are derived from the PROFILE'S OWN VERTICES — a radius, a height,
# a sphere's formula — and never from a swept solid. That is the entire point of this tier here:
# `occt.py` and the WASM kernel are handed the SAME meridian profile, so if we author that boundary
# wrongly they both spin the same wrong section and agree to the last digit (the trap Entry 12
# documented for `extrude`). Only an answer computed some OTHER way can catch it.
#
# ⚠ A FULL 360° REVOLVE IS NOT A PARTIAL ONE WITH A BIGGER NUMBER, and the topology says so: it has NO
# caps, and every face swept from a segment that is not radial closes on itself with a SEAM edge. These
# counts were measured (probe.cpp, Entry 14) before they were written down.
# ---------------------------------------------------------------------------------------------


def revolved_rectangle_to_cylinder(radius: float, height: float) -> Measures:
    """A rectangle touching the axis, spun a full turn — which IS a cylinder, and must be measurably
    indistinguishable from one.

    This is the strongest check in the revolve set and the cheapest: the primitive `makeCylinder` and
    a `revolve` of the corresponding rectangle are two entirely different code paths through OCCT, and
    they must land on the same solid — same volume, same area, same edge length, same 3F/3E/2V.
    """
    return cylinder(radius, height)


def revolved_tube(inner: float, outer: float, height: float) -> Measures:
    """A rectangle CLEAR of the axis, spun a full turn: a hollow tube.

    ⚠ THIS IS THE CASE THAT EXERCISES THE ORPHAN-FACE PATH. Its two annular faces are swept from the
    profile's two RADIAL segments — and OCCT reports no history whatsoever for those (measured), so the
    kernel has to name them from the circles their endpoints sweep. If it gets that wrong the shape does
    not build at all; if it gets the GEOMETRY wrong, this closed form catches it.

    Faces 4 (two cylinders + two annuli), edges 6 (four circles + two seams), vertices 4.
    """
    if not outer > inner > 0:
        raise ValueError("a tube needs 0 < inner < outer")
    ring = math.pi * (outer**2 - inner**2)
    return Measures(
        volume=ring * height,
        # Both cylindrical walls, plus the two annular end faces.
        area=2.0 * math.pi * (outer + inner) * height + 2.0 * ring,
        # Four circles (top and bottom, at each radius), plus the two seam lines — one per cylinder.
        edge_length=2.0 * (2.0 * math.pi * outer) + 2.0 * (2.0 * math.pi * inner) + 2.0 * height,
        counts=Counts(solids=1, faces=4, edges=6, vertices=4),
        bounds_min=(-outer, -outer, 0.0),
        bounds_max=(outer, outer, height),
    )


def revolved_hemisphere(radius: float) -> Measures:
    """A quarter-disc meridian (a radial segment, then a quarter-circle ARC back to the pole), spun a
    full turn: a HEMISPHERE — whose volume and area every schoolchild knows, and neither of which is
    Pappus's theorem applied to our own polygon.

    That independence is the point. It exercises an ARC segment, and an on-axis vertex (the pole) where
    the spherical face degenerates to a point — OCCT emits a DEGENERATE edge there, which counts in the
    topology and contributes nothing to the length.

    Faces 2 (the base disc + the spherical cap). Edges 3: the base circle, the arc's seam, and the
    degenerate edge at the pole. Vertices 2.
    """
    if not radius > 0:
        raise ValueError("a hemisphere needs a positive radius")
    return Measures(
        volume=(2.0 / 3.0) * math.pi * radius**3,
        # The curved cap (2 pi r^2) plus the flat base disc (pi r^2).
        area=3.0 * math.pi * radius**2,
        # The base circle, plus the meridian arc that closes the spherical face on itself (a quarter
        # circle). The degenerate edge at the pole has zero length by construction.
        edge_length=2.0 * math.pi * radius + 0.5 * math.pi * radius,
        counts=Counts(solids=1, faces=2, edges=3, vertices=2),
        bounds_min=(-radius, -radius, 0.0),
        bounds_max=(radius, radius, radius),
    )


def revolved_tube_partial(inner: float, outer: float, height: float, degrees: float) -> Measures:
    """The tube again, spun only PART of a turn — the case that HAS caps.

    It is the control for the whole design: a partial revolve behaves exactly like an extrusion (two
    caps, no seams), and a full one does not. If the kernel ever confuses the two, one of these two
    cases fails while the other passes.

    Faces 6: two cylindrical walls, two annular sectors, and the two flat caps. Edges 12: four arcs,
    four vertical lines, four radial lines. Vertices 8.
    """
    if not outer > inner > 0:
        raise ValueError("a tube needs 0 < inner < outer")
    # The BOUNDS below are only closed-form while the sector stays inside one quadrant; past 90 deg it
    # starts wrapping past an axis and the extremes stop being the corner points. Refuse rather than
    # return a plausible wrong number — a golden nobody can check is worse than no golden.
    if not 0.0 < degrees <= 90.0:
        raise ValueError("this closed form covers a sector of at most 90 degrees")
    fraction = degrees / 360.0
    theta = math.radians(degrees)
    ring = math.pi * (outer**2 - inner**2)
    thickness = outer - inner
    return Measures(
        volume=fraction * ring * height,
        area=(
            # The two cylindrical walls, cut to the sector.
            fraction * 2.0 * math.pi * (outer + inner) * height
            # The two annular sectors, top and bottom.
            + fraction * 2.0 * ring
            # The two flat caps — each a rectangle, thickness x height. THESE are what a full turn lacks.
            + 2.0 * thickness * height
        ),
        edge_length=(
            # Four arcs: top and bottom, at each radius.
            fraction * 2.0 * (2.0 * math.pi * outer) + fraction * 2.0 * (2.0 * math.pi * inner)
            # Four vertical edges, one at each corner of each cap.
            + 4.0 * height
            # Four radial edges: two on each cap.
            + 4.0 * thickness
        ),
        counts=Counts(solids=1, faces=6, edges=12, vertices=8),
        # ⚠ A SECTOR IS NOT A FULL TURN, AND ITS BOUNDS ARE NOT THE FULL TUBE'S. The sweep runs from
        # phi = 0 to phi = theta, so it lives in the first quadrant: x is smallest at the INNER radius
        # and the LARGEST angle, y is zero at phi = 0. Writing (-outer, -outer) here — the full tube's
        # box — is exactly the mistake this tier exists to catch, and it caught it.
        bounds_min=(inner * math.cos(theta), 0.0, 0.0),
        bounds_max=(outer, outer * math.sin(theta), height),
    )
