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
        print(f"  {case['case']}: volume={case['analytic']['volume']:.1f} mm^3 (analytic == OCCT)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
