# Bunyan oracle tooling — offline golden seeding

Generates the committed golden values in `tests/goldens/`. **Never runs in CI** (spec §9, D6/D9):
CI runs the WASM build against these committed numbers and nothing else.

```bash
cd tools/oracle
uv venv --python 3.12 .venv
VIRTUAL_ENV=$PWD/.venv uv pip install -e .
VIRTUAL_ENV=$PWD/.venv uv run seed-goldens ../../tests/goldens
```

## What we are verifying (spec §9.0 — owner ruling, 2026-07-11)

> **We trust OCCT. We verify our own code.**

Validating OpenCascade is **out of scope**: it is an industrial kernel with decades of production
use, and checking it would require a second, genuinely independent geometry engine that we are not
going to adopt. Everything here exists to catch **our** mistakes:

- a mis-wired parameter (a 200 mm wall where we meant 2000);
- a wrong operation, or the right operations in the wrong order;
- a broken or mis-configured WASM build that behaves unlike a known-good native OCCT;
- a regression;
- a mistake in our own measurement code.

## The checks

| Check                                | Source                                           | Catches                                                                                                                                                           |
| ------------------------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Reference-build oracle** (primary) | native OCCT via `cadquery-ocp` (`occt.py`)       | our **WASM build** and our **op wiring** — the same kernel through a different binding, build and code path, so a disagreement is _our_ bug                       |
| **Closed-form sanity check**         | arithmetic (`analytic.py`)                       | our **own measurement/seeding code** — the one layer the oracle above cannot check, because it and the kernel can agree while we ask them both the wrong question |
| **Regression snapshots**             | Bunyan's own engine (`tests/harness/measure.ts`) | **drift** only; certifies nothing on its own                                                                                                                      |

The seeder **cross-checks the two tiers before writing** and aborts on disagreement, so a wrong
golden cannot be committed silently.

**Why the closed-form check survives even though we trust OCCT.** It has already earned its place.
On its first run it caught us reading OCCT's `BRepGProp::LinearProperties` off a _solid_, which sums
each edge once per adjoining face — reporting **45,600 mm** of edge for a box whose edges total
**22,800 mm**. That was **our misuse of the OCCT API**, not an OCCT defect: exactly the class of bug
this tooling exists to catch. Had we seeded from OCCT alone, 45,600 mm would have been committed as
the trusted golden, and a _correct_ future implementation would have failed CI against it. Fixed by
measuring over deduplicated edges (`occt.py::_total_edge_length`).

Where no closed form exists (a fillet on an edge produced by a boolean), this tier simply does not
apply and the reference-build oracle stands alone. That is fine — §9.0 says so explicitly.

## Toolchain note (owner-approved 2026-07-11)

The plan originally specified **`pythonocc-core`**. It is **not installable from PyPI**: that entry
is an abandoned `0.16` placeholder, and the real 7.9.x releases are **conda-only**, while this box's
Python toolchain is `uv` (no conda, no system pip). We use **`cadquery-ocp`** — pip-installable
bindings to the same OCCT 7.9. The spec (§2) and the plan (P1 step 2) now name it.

## Pinned environment (spec §6.5)

Recorded into every golden file, so a re-seed on a different box is visible rather than silent:

- `cadquery-ocp==7.9.3.1.1` (OCCT 7.9)
- Python 3.12
- **System dependency:** `libgl1` (OCP pulls in VTK, which links `libGL.so.1`). A headless box
  without it fails at `import OCP` with `ImportError: libGL.so.1`.
