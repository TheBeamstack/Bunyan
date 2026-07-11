"""Offline golden-value seeding for Bunyan's geometry harness.

Never imported by the app and never run in CI (spec §9, decision D6/D9).
"""

from . import analytic, occt

__all__ = ["analytic", "occt"]
