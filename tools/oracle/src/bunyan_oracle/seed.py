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

    out_path.write_text(json.dumps(goldens, indent=2) + "\n", encoding="utf-8")
    print(f"seeded {len(goldens['cases'])} case(s) -> {out_path}")
    for case in goldens["cases"]:
        volume = case.get("analytic", case["crossCheck"])["volume"]
        tier = "analytic == OCCT" if "analytic" in case else "OCCT only (no closed form)"
        print(f"  {case['case']}: volume={volume:.1f} mm^3 ({tier})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
