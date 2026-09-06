# T-004 — per-element build cost is flat from 39 to 273 elements, and the 10,000 projection is 7.2 min

**Seat:** `zayd` (builder, box — headless). **Date:** 2026-08-15. **Decisions:** D66, D48.
**Task:** `docs/BACKLOG.md` T-004.

## 1. The question, and why a division could not answer it

Entry 90 measured D66's lazy build on 54 elements and named its own limit: _"flatness at 54 is not
flatness at 10,000."_ Lazy build is only worth building if the element you defer costs what an element
costs today, so the decision turns on the **marginal** cost, not the average.

`document-scale.test.ts` prices a cold load at one size and divides. An average at a single N is flat by
construction — it cannot report a slope, because it has one point. So the instrument had to change before
the question could be asked.

## 2. What was measured

`tests/document-build-cost-scale.test.ts` (NEW). Four sizes of the reference building already used by
`document-scale.test.ts` and `document-heap-scale.test.ts` — 1, 3, 5 and 7 storeys, at 39 elements and 62
solids per storey. Each size is authored, saved with `saveBnn`, reloaded with `loadBnn` into a fresh
`DocumentContext`, and the cost recorded is `rebuildAll()` on that cold context: every solid rebuilt from
`scene.json`, no cache present.

That act is the right instrument for three reasons. It is what D66 §3b's lazy first paint would defer. It
is what `current_state.md §1a`'s cold-load row already prices, so the new number lands in the same units
as the old one. And it excludes command dispatch, which the authoring path carries and a load does not.

**Each size gets a fresh OCCT kernel.** The `ShapeRegistry` and the WASM heap are per-session and only
grow, so a shared kernel would have every later size carrying the earlier ones' live shapes — the
measurement would be of the harness's own history rather than of the model's size. This is the same
rationale `document-heap-scale.test.ts` gives, for the same reason.

## 3. Method

Two estimators, because they fail differently.

**Ordinary least squares** of cold-load ms on element count, the pattern T-004 names in `implements:` and
`document-heap-scale.test.ts` established: the fixed cost lands in the intercept and the per-element cost
in the slope, so nothing is smeared.

**Finite differences** between consecutive sizes, `Δms / Δelements`. A least-squares line has a slope
whether or not the data is a line — a superlinear curve fits a line with a plausible slope and a merely
poor residual. The finite differences are the marginal cost measured locally at three points, so a rising
cost shows up as rising marginals rather than as a number that has to be inferred from R².

## 4. The numbers

Two full runs, box otherwise idle, ~1.79 GB available.

| size | elements | solids | cold load, run 1 | cold load, run 2 |
| ---- | -------- | ------ | ---------------- | ---------------- |
| 1 storey | 39 | 62 | 1513 ms | 1555 ms |
| 3 storey | 117 | 186 | 5070 ms | 5092 ms |
| 5 storey | 195 | 310 | 8427 ms | 8442 ms |
| 7 storey | 273 | 434 | 11785 ms | 11681 ms |

Local marginals, ms per additional element:

| interval | run 1 | run 2 |
| -------- | ----- | ----- |
| 39 → 117 | 45.60 | 45.35 |
| 117 → 195 | 43.05 | 42.94 |
| 195 → 273 | 43.05 | 41.54 |
| spread | 5.9% | 9.2% |

| fit | run 1 | run 2 |
| --- | ----- | ----- |
| slope (marginal ms/element) | 43.81 | 43.24 |
| intercept | −136 ms | −54 ms |
| R² | 0.9998 | 0.9996 |
| projected at 10,000 elements | 7.30 min | 7.21 min |

**The answer is yes: per-element build cost is flat across the measured range.** The slope reproduces to
1.3% across runs and the intercept is within ±140 ms of zero on a total of 11.7 s, which is the signature
of a cost that is purely per-element with no fixed part worth naming.

The one systematic deviation is that the smallest model prices about 5–10% **low** per element — 38.8 and
39.2/39.6 ms/el at 39 elements against 41.8–44.0 at the three larger sizes, in all four runs including
`hmdnah`'s two. Because the 39-element point sits below the line, the first local marginal (39 → 117) is
the highest in every run and the marginals fall slightly with size. That is the opposite direction from
superlinearity, so no claim here rests on it, and its cause is not measured — per-process warmup would
push the shortest measurement **high**, which is not what the runs show.

## 5. What it means for the 10,000 target

At 43.2–43.8 ms/element the cold load at D48's binding target is **7.2–7.3 minutes uncached**. That is the
same order as D66's own 6.35 min figure, reached from a different direction, and divided by the D29
cache's measured 2.07× it is 3.5 min against the ~3 min `§1a`'s cold-load row already carries. The row is updated with the
measurement and **not re-coloured** — the axis is still `⚠ OPEN`, because 7 min is not a load time and the
levers that could close it are unchanged.

**For lazy build the reading is favourable, and it is the reading the task asked for.** Deferring a
fraction of the elements buys that fraction of the cold load, at every size, because the elements are
priced independently. Entry 90's 64.5% deferrable figure would therefore be worth ~4.7 min of the
projected 7.3. It does not follow that lazy build is sufficient: the residual 2.6 min is still not a load
time, which is why `instantiate` and MT stay on the list.

## 6. Limits — stated at their actual size

**The extrapolation is 37×.** The measured range stops at 273 elements and the target is 10,000. The flat
marginals entitle the projection; they do not prove it. A cost that turns superlinear only above some
threshold inside that gap would not have been seen here, and the honest statement is that nothing in the
measured range hints at one.

**The measurement is not gated.** The harness asserts correctness at scale (element counts, no broken
refs, nothing `failed`, monotonic growth) and soundness (a positive marginal slope). The flatness verdict
is printed, not asserted, which is the standing rule for every timing harness in this repo — a wall-clock
gate on a shared box is a flake generator. ⚠ **The consequence, stated because a green test proves only
what it asserts (`AGENTS.md §4.8`): if a later change makes build cost superlinear, this file still
passes.** A ratio assertion on the marginal spread would be immune to absolute machine speed and would
catch it; it was not added here because it is a scope decision for the steward, not a measurement.

**`unverified here: the same cold load inside a real browser tab — `amer` to confirm.`** Everything above
is Node on the headless box, which is where `§1a`'s existing cold-load numbers also come from, so the row
stays internally consistent. D48's target is nonetheless about a browser tab, and the in-tab figure has
never been measured by anyone.

## 7. Secondary observation, from the same run

Authoring — the incremental path, one rebuild per command — has a marginal of 43.1 ms/element (run 1,
39→273), against the cold load's 43.8. The incremental path costs essentially what a rebuild costs per
element, so its command dispatch and staging are not a measurable share of authoring time at this scale.
Recorded because the run produced it, not because anything asked.

## 8. What it costs CI

The harness boots four OCCT kernels and builds 448 elements twice over, so it is not free: **58 s** on
this box run alone, and the full suite measured **233 s** with it in. Four sizes is the smallest number
that gives three finite differences, and 7 storeys is the largest that keeps one kernel's live set under
~434 solids. If the budget matters more than the third difference, the row to drop is 5 storeys.

## 9. Files

- `tests/document-build-cost-scale.test.ts` — NEW, the harness.
- `current_state.md §1a` — the cold-load row carries the measurement.
