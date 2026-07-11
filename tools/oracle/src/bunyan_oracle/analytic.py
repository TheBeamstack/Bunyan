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
