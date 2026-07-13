"""Seed the committed golden values (spec §9, `v1.0.0_imp_plan.md` P1 step 8).

Run OFFLINE, on the pinned environment, whenever a `buildGeometry` is added or changed. The
output is committed; CI reads it but never runs this (CI has no OCCT-native Python).

    cd tools/oracle
    uv run seed-goldens ../../tests/goldens

The re-seed rule (spec §9): a new or changed `buildGeometry` MUST ship re-seeded goldens, or CI
fails the build. `tests/goldens/*.json` carries the environment it was seeded on so a mismatch is
visible rather than silent.
"""

from __future__ import annotations

import json
import math
import platform
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from . import analytic, occt


def _pinned_env() -> dict[str, str]:
    """The pinned seeding environment (spec §6.5) — recorded so a re-seed on a different box is visible."""
    try:
        from importlib.metadata import version

        ocp_version = version("cadquery-ocp")
    except Exception:  # pragma: no cover - metadata should always be present
        ocp_version = "unknown"

    return {
        "oracle": "cadquery-ocp (OCP bindings to OCCT)",
        "ocpVersion": ocp_version,
        "python": sys.version.split()[0],
        "platform": platform.platform(),
    }


def _case_box(name: str, dx: float, dy: float, dz: float) -> dict[str, Any]:
    return {
        "case": name,
        "op": "makeBox",
        "params": {"dx": dx, "dy": dy, "dz": dz},
        # Closed-form sanity check — guards OUR measurement/seeding code (spec §9.1).
        "analytic": analytic.box(dx, dy, dz).to_json(),
        # The PRIMARY oracle: a native OCCT build. What the WASM build is checked against in CI.
        "crossCheck": occt.box(dx, dy, dz),
        "tolerances": {"relative": 1e-9},
    }


def _case_cylinder(name: str, radius: float, height: float) -> dict[str, Any]:
    """The circular column — and the case that FORCED the `measure` op to exist.

    Its tessellation under-reports its volume by the chord error, so a quantity schedule read off the
    mesh would under-bill every column in the project. These values come from the B-Rep.
    """
    return {
        "case": name,
        "op": "makeCylinder",
        "params": {"radius": radius, "height": height},
        "analytic": analytic.cylinder(radius, height).to_json(),
        "crossCheck": occt.cylinder(radius, height),
        "tolerances": {"relative": 1e-9},
    }


def _case_wall_with_opening(
    name: str, dx: float, dy: float, dz: float, ox: float, oy: float, oz: float,
    at_x: float, at_z: float,
) -> dict[str, Any]:
    """THE archetypal BIM boolean: a window cut clean through a wall (core_logic §3.6).

    The closed form applies here, and it is worth having: it is the one tier that can catch us cutting
    with the wrong solid, or in the wrong direction, and getting a confidently wrong answer.
    """
    return {
        "case": name,
        "op": "boolean",
        "params": {
            "kind": "cut",
            "wall": {"dx": dx, "dy": dy, "dz": dz},
            "opening": {"dx": ox, "dy": oy, "dz": oz, "at": [at_x, 0.0, at_z]},
        },
        "analytic": analytic.wall_with_opening(dx, dy, dz, ox, oy, oz, at_x, at_z).to_json(),
        "crossCheck": occt.wall_with_opening(dx, dy, dz, ox, oy, oz, at_x, at_z),
        "tolerances": {"relative": 1e-9},
    }


def _case_filleted_box(name: str, dx: float, dy: float, dz: float, radius: float) -> dict[str, Any]:
    """A box with its `x-max|y-min` edge rounded.

    ⚠ NO `analytic` TIER, deliberately. A fillet's area and edge length have no closed form worth
    hand-deriving, and spec §9.0 says so explicitly: where no closed form exists, the reference-build
    oracle stands alone. Inventing an approximate closed form here would be worse than having none —
    it would produce a golden that is confidently, quietly wrong.
    """
    return {
        "case": name,
        "op": "fillet",
        "params": {"box": {"dx": dx, "dy": dy, "dz": dz}, "edge": "x-max|y-min", "radius": radius},
        "crossCheck": occt.filleted_box(dx, dy, dz, radius),
        "tolerances": {"relative": 1e-9},
    }


def _case_rotated_wall(name: str, dx: float, dy: float, dz: float, degrees: float) -> dict[str, Any]:
    """A wall rotated about Z — and the case that shows why `measure` alone cannot gate a transform.

    ⚠ Volume, area, edge length and counts are ALL INVARIANT under a rigid motion. A transform that
    used the wrong angle, the wrong axis, radians where degrees were meant — or that silently did
    nothing at all — would reproduce every one of them exactly. **`bounds` is the only measure that
    moves**, so it is the one doing the work here, and the invariants are what prove the motion was
    rigid rather than a stretch.
    """
    return {
        "case": name,
        "op": "transform",
        "params": {
            "box": {"dx": dx, "dy": dy, "dz": dz},
            "motions": [{"kind": "rotate", "axis": [0.0, 0.0, 1.0], "degrees": degrees}],
        },
        "analytic": analytic.rotated_box(dx, dy, dz, degrees).to_json(),
        "crossCheck": occt.rotated_wall(dx, dy, dz, degrees),
        "tolerances": {"relative": 1e-9},
    }


def _case_mirrored_wall(name: str, dx: float, dy: float, dz: float) -> dict[str, Any]:
    """A wall mirrored in the YZ plane — a NEGATIVE (handedness-flipping) transform.

    ⚠ The assertion that matters is `volume > 0`. A mishandled mirror returns an inside-out solid of
    NEGATIVE volume, and its area, edge length and counts all stay perfect while it does so.
    """
    return {
        "case": name,
        "op": "transform",
        "params": {
            "box": {"dx": dx, "dy": dy, "dz": dz},
            "motions": [{"kind": "mirror", "normal": [1.0, 0.0, 0.0]}],
        },
        "analytic": analytic.mirrored_box(dx, dy, dz).to_json(),
        "crossCheck": occt.mirrored_wall(dx, dy, dz),
        "tolerances": {"relative": 1e-9},
    }


def _case_extruded_slab(name: str, points: list[tuple[float, float]], height: float) -> dict[str, Any]:
    """An L-shaped floor plate — the shape that revealed `extrude` was missing (Entry 12).

    ⚠ The `analytic` tier is not decoration here, it is the ONLY independent check. `occt.py` and the
    WASM kernel are handed the SAME boundary; if we build that boundary wrongly, both sweep the same
    wrong polygon and agree perfectly. Only the shoelace formula, which works from the VERTICES, can
    catch it.
    """
    return {
        "case": name,
        "op": "extrude",
        "params": {"points": [list(p) for p in points], "height": height},
        "analytic": analytic.extruded_polygon(points, height).to_json(),
        "crossCheck": occt.extruded_profile(points, height),
        "tolerances": {"relative": 1e-9},
    }


def _case_extruded_arc_slab(
    name: str,
    points: list[tuple[float, float]],
    height: float,
    arc_index: int,
    via: tuple[float, float],
) -> dict[str, Any]:
    """A slab with a CURVED edge — the shape no boolean tree of boxes can express.

    This is the case that proves `extrude` bought something a box could not. Its closed form is the
    circular-segment area, derived from the three points of the arc.
    """
    return {
        "case": name,
        "op": "extrude",
        "params": {
            "points": [list(p) for p in points],
            "height": height,
            "arcIndex": arc_index,
            "via": list(via),
        },
        "analytic": analytic.extruded_with_arc(points, height, arc_index, via).to_json(),
        "crossCheck": occt.extruded_profile(points, height, (arc_index, via)),
        "tolerances": {"relative": 1e-9},
    }


def _case_chamfered_box(name: str, dx: float, dy: float, dz: float, distance: float) -> dict[str, Any]:
    """A box with its `x-max|y-min` edge chamfered. No `analytic` tier, same as the fillet."""
    return {
        "case": name,
        "op": "chamfer",
        "params": {
            "box": {"dx": dx, "dy": dy, "dz": dz},
            "edge": "x-max|y-min",
            "distance": distance,
        },
        "crossCheck": occt.chamfered_box(dx, dy, dz, distance),
        "tolerances": {"relative": 1e-9},
    }


def _case_revolved_column(name: str, radius: float, height: float) -> dict[str, Any]:
    """A rectangle touching the axis, spun a FULL turn — which is a cylinder, and must measure as one.

    The strongest check in the revolve set: `makeCylinder` and `revolve` are two different OCCT code
    paths, and they must land on the same solid. Its meridian also has a segment lying ON THE AXIS,
    which sweeps into a line rather than a face — the case that would make a naive "every segment
    generates exactly one face" rule refuse an ordinary column.
    """
    points = [(0.0, 0.0), (radius, 0.0), (radius, height), (0.0, height)]
    return {
        "case": name,
        "op": "revolve",
        "params": {"points": [list(p) for p in points], "angle": 360.0},
        "analytic": analytic.revolved_rectangle_to_cylinder(radius, height).to_json(),
        "crossCheck": occt.revolved_profile(points, 360.0),
        "tolerances": {"relative": 1e-9},
    }


def _case_revolved_tube(name: str, inner: float, outer: float, height: float) -> dict[str, Any]:
    """A rectangle CLEAR of the axis, spun a full turn: a hollow tube.

    ⚠ THE ORPHAN-FACE CASE. Its two annular faces are swept from RADIAL segments, and OCCT reports no
    history at all for those (measured, probe.cpp) — so the kernel must name them from the circles their
    endpoints sweep, or refuse the shape. Nothing else in the suite exercises that path.
    """
    points = [(inner, 0.0), (outer, 0.0), (outer, height), (inner, height)]
    return {
        "case": name,
        "op": "revolve",
        "params": {"points": [list(p) for p in points], "angle": 360.0},
        "analytic": analytic.revolved_tube(inner, outer, height).to_json(),
        "crossCheck": occt.revolved_profile(points, 360.0),
        "tolerances": {"relative": 1e-9},
    }


def _case_revolved_hemisphere(name: str, radius: float) -> dict[str, Any]:
    """A quarter-disc meridian spun a full turn: a HEMISPHERE.

    An ARC segment, and an on-axis vertex (the pole) where the spherical face degenerates to a point.
    Its closed form is the schoolbook 2/3 pi r^3 — computed no way that our profile code could taint.
    """
    via = (radius * math.sqrt(0.5), radius * math.sqrt(0.5))
    points = [(0.0, 0.0), (radius, 0.0), (0.0, radius)]
    return {
        "case": name,
        "op": "revolve",
        "params": {
            "points": [list(p) for p in points],
            "angle": 360.0,
            "arcIndex": 1,
            "via": list(via),
        },
        "analytic": analytic.revolved_hemisphere(radius).to_json(),
        "crossCheck": occt.revolved_profile(points, 360.0, (1, via)),
        "tolerances": {"relative": 1e-9},
    }


def _case_revolved_tube_partial(
    name: str, inner: float, outer: float, height: float, degrees: float
) -> dict[str, Any]:
    """The tube, spun only PART of a turn — the case that HAS caps.

    The control for the entire design: a partial revolve behaves like an extrusion (two caps, no seams)
    and a full one does not. If the kernel ever conflates them, exactly one of these two cases fails.
    """
    points = [(inner, 0.0), (outer, 0.0), (outer, height), (inner, height)]
    return {
        "case": name,
        "op": "revolve",
        "params": {"points": [list(p) for p in points], "angle": degrees},
        "analytic": analytic.revolved_tube_partial(inner, outer, height, degrees).to_json(),
        "crossCheck": occt.revolved_profile(points, degrees),
        "tolerances": {"relative": 1e-9},
    }


def build_goldens() -> dict[str, Any]:
    return {
        "$schema": "bunyan.goldens.v1",
        "seededAt": datetime.now(timezone.utc).isoformat(),
        "env": _pinned_env(),
        "note": (
            "Scope (spec §9.0): we trust OCCT; we verify our own code. `crossCheck` is the PRIMARY "
            "oracle — a native OCCT build (OCP), which catches our WASM-build and op-wiring errors. "
            "`analytic` is a closed-form sanity check that guards our own measurement/seeding code; "
            "the seeder aborts if the two disagree. Regression snapshots live in the TS harness."
        ),
        "cases": [
            # A wall-sized box, in millimetres. Large-ish coordinates on purpose (spec §6.5).
            _case_box("box-wall-3000x200x2500", 3000.0, 200.0, 2500.0),
            # A 100 m span: the large-extent case the spec requires so mm-scale features on big
            # models are exercised against OCCT's linear tolerance.
            _case_box("box-large-extent-100m", 100_000.0, 300.0, 4000.0),
            # P2's hard topology. Everything below is a shape whose sub-shape NAMES are derived rather
            # than declared, and whose geometry therefore has to be certified independently — a naming
            # bug does not look like a geometry bug, but a WRONG BOOLEAN does, and this is what catches
            # that one.
            _case_cylinder("cylinder-column-r150-h3000", 150.0, 3000.0),
            _case_wall_with_opening(
                "wall-with-window-1000x1400", 3000.0, 200.0, 2500.0, 1000.0, 200.0, 1400.0, 800.0, 900.0
            ),
            _case_filleted_box("box-wall-fillet-r50", 3000.0, 200.0, 2500.0, 50.0),
            # TRANSFORM. 30 deg because it is a real building angle whose sin/cos are irrational —
            # 90 deg would pass even if we fed the kernel radians, since the bounds of a box rotated
            # by pi/2 rad and by 90 deg differ, but a rotation of 0 or 90 is exactly the case where a
            # sloppy implementation still lands on a plausible axis-aligned answer.
            _case_rotated_wall("wall-rotated-30deg", 3000.0, 200.0, 2500.0, 30.0),
            _case_mirrored_wall("wall-mirrored-yz", 3000.0, 200.0, 2500.0),
            # EXTRUDE. The op three of the five MVP types need, and the one a building could not be
            # modelled without: `makeBox` cannot express a floor plate that is L-shaped, five-sided,
            # or curved — and real ones are.
            _case_extruded_slab(
                "slab-L-shaped-200thk",
                [(0.0, 0.0), (6000.0, 0.0), (6000.0, 2000.0), (2000.0, 2000.0), (2000.0, 4000.0), (0.0, 4000.0)],
                200.0,
            ),
            # A curved edge — the shape that is unreachable from boxes and booleans at ANY cost, and
            # therefore the case that proves the op is not a box in disguise.
            _case_extruded_arc_slab(
                "slab-curved-edge-200thk",
                [(0.0, 0.0), (6000.0, 0.0), (6000.0, 4000.0), (0.0, 4000.0)],
                200.0,
                1,
                (7000.0, 2000.0),
            ),
            _case_chamfered_box("box-wall-chamfer-d50", 3000.0, 200.0, 2500.0, 50.0),
            # REVOLVE. The other half of GenericSolid, and the last op P2 step 1 named that had never
            # been built. Four cases, and each one exists because it is the ONLY thing that exercises a
            # path the kernel gets right for a measured reason rather than an assumed one:
            #   * the column   — a segment ON the axis (sweeps to a line, not a face), and the result
            #                    must be indistinguishable from the `makeCylinder` primitive;
            #   * the tube     — RADIAL segments, whose faces OCCT reports NO history for at all;
            #   * the hemisphere — an ARC, and a pole where the face degenerates to a point;
            #   * the partial  — the control: it HAS caps, and a full turn does not.
            _case_revolved_column("revolve-column-r150-h3000", 150.0, 3000.0),
            _case_revolved_tube("revolve-tube-r500-r1000-h3000", 500.0, 1000.0, 3000.0),
            _case_revolved_hemisphere("revolve-hemisphere-r1000", 1000.0),
            _case_revolved_tube_partial("revolve-tube-partial-90deg", 500.0, 1000.0, 3000.0, 90.0),
        ],
    }


def main() -> int:
    out_dir = Path(sys.argv[1] if len(sys.argv) > 1 else "../../tests/goldens").resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "geometry.golden.json"

    goldens = build_goldens()

    # Cross-check tier 0 against tier 1 at seed time. If the closed form and OCCT disagree, one of
    # them is wrong and a human must look — never commit a golden that failed this.
    for case in goldens["cases"]:
        if "analytic" not in case:
            continue  # a fillet has no closed form — the oracle stands alone (spec §9.0)
        a, c = case["analytic"], case["crossCheck"]
        for key in ("volume", "area", "edgeLength"):
            lhs, rhs = float(a[key]), float(c[key])
            if abs(lhs - rhs) > 1e-6 * max(abs(lhs), abs(rhs), 1.0):
                raise SystemExit(
                    f"SEED ABORTED — {case['case']}: analytic {key}={lhs} disagrees with OCCT {rhs}"
                )
        if a["counts"] != c["counts"]:
            raise SystemExit(
                f"SEED ABORTED — {case['case']}: analytic counts {a['counts']} != OCCT {c['counts']}"
            )
        # ⚠ AND THE BOUNDS — which this check did NOT cover until Entry 14, when a wrong closed-form
        # bounding box for a 90-degree revolve was committed as a golden and survived the seeder. It
        # was caught downstream by the TS suite, which is luck, not design: the seeder is the gate that
        # is supposed to make a wrong golden uncommittable. The tests assert bounds; so must this.
        for key in ("min", "max"):
            for axis, (lhs, rhs) in enumerate(zip(a["bounds"][key], c["bounds"][key])):
                if abs(lhs - rhs) > 1e-6 * max(abs(lhs), abs(rhs), 1.0):
                    raise SystemExit(
                        f"SEED ABORTED — {case['case']}: analytic bounds.{key}[{axis}]={lhs} "
                        f"disagrees with OCCT {rhs}"
                    )

    out_path.write_text(json.dumps(goldens, indent=2) + "\n", encoding="utf-8")
    print(f"seeded {len(goldens['cases'])} case(s) -> {out_path}")
    for case in goldens["cases"]:
        volume = case.get("analytic", case["crossCheck"])["volume"]
        tier = "analytic == OCCT" if "analytic" in case else "OCCT only (no closed form)"
        print(f"  {case['case']}: volume={volume:.1f} mm^3 ({tier})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
