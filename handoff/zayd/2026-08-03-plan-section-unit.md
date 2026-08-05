# Entry 77 — the plan/section unit ships: a drawing IS the B-Rep (D58 row Ⓐ, D81)

**Zayd · dev box, headless · 2026-08-03 · branch `zayd/2026-08-03-plan-section-unit`**

> ⚠⚠ **I AM NOT MERGING THIS, AND THIS ONE THE OWNER MERGES ANYWAY.** Third entry running keeping Entry
> 75's rule. See §6 — the frozen surface moved, so this is `RISK: contract-touching` **whatever the
> generated label says**, and that discrepancy is itself a finding.

---

## 1. What this is

**The seven-session blockage broke.** The owner ruled Q1, Q2 and Q3 in chat on 2026-08-03, all three as
recommended, recorded as **D81**. Those three questions had blocked this unit across **seven sessions**
(69 → 71 → 72 → 73 → 74 → 75 → 76). This entry takes the ruling and builds
`P5_step6C_plan_section_design.md` §8 end to end.

- **Q1 ⇒ `mode:'cut'` only** for v1.0.0.
- **Q2 ⇒ `SectionCurve.nodeId?`** reserved for projected-curve provenance, written by nothing today.
- **Q3 ⇒ `ParamField.refTo`** gains all four of `'view'`/`'sheet'`/`'annotation'`/`'family'`.

`sectionCut` was **RESERVED in Entry 15 and has a body three phases later against an unchanged payload**
— the first time D13's reservation mechanism has completed its full arc.

---

## 2. What landed

| Layer | Change |
| --- | --- |
| `tools/kernel-build/src/kernel.cpp` | `sectionCut` — `BRepAlgoAPI_Section` per solid, owner face from OCCT's own `Generated()` history, points projected into the plane's 2D frame. **WASM rebuilt** (+69,808 B). |
| `packages/kernel-occt` | The adapter — maps the canonical owner-face index to **the face's own existing token**; `SECTION_DEFLECTION = 0.5 mm` (owner Q5). |
| `packages/protocol` | `SectionCurve.nodeId?` (Q2a). `sectionCut` **off `RESERVED_OPS`**. The false `ref` comment corrected (§6.1). |
| `packages/document/src/view.ts` | **NEW** — validator, plane derivation, `xAxisFor`, the clip/plane pre-filter, result types. |
| `packages/document` | `views` promoted to a full `SceneCollection` (+ dependency edge, + `.bnn` guard); `core.createView`/`updateView`/`deleteView`; `DocumentContext.projectView`; `refTo` widened. |
| `tests/plan-section.test.ts` | **NEW, 8 tests**, one per §5 criterion, real OCCT. |

**No `SCENE_SCHEMA_VERSION` bump. No `emptyScene()` entry** (Entry 68 measured that prediction wrong;
this unit did not re-litigate it).

### 2a. Verified

**`pnpm verify` — 653 green across 81 files, all six gates, real exit code 0.**

**Revert-verified, and the interesting one is the second:**

1. **The ref-token attribution.** Revert `projectView` to key by `ref.nodeId` → `plan-section` goes
   **RED: "expected length 8 but got 6"**. Restored → green.
2. **⚠ A revert-verification that FAILED TO FIRE, and fixing that found a weak green in my own test.**
   The first form of §6 asserted `holedWallCurves.length > solidCount`. Reverted, it **still passed** —
   because the wrong key drops curves *silently*: measured, **8 wall curves / 20 total becomes 6 / 10**,
   half the drawing gone with no error. `6 > 4` is true. Assertion changed to the exact count.
3. **A "fix" that turned out to be nothing.** I forwarded the resolved option catalogue into
   `modelElements` and wrote a comment claiming it was load-bearing. Revert-verified: the suite stayed
   **green** — `optionScopeOf` already falls back to `scene.designOptions`. **The line was removed
   rather than kept with a false justification.** The real §5 fix was in the fixture (see §3).

---

## 3. FOUND — five things, and three are about my own work

### 3a. ⚠⚠ A ref's `nodeId` names the node that MINTED it, not the part that CARRIES it

The design predicted this and I walked into it anyway. `projectView` first attributed curves by
`curve.ref.nodeId`, on the reasoning that a part's node id *is* `partNodeId(elementId, partName)`.

**Measured, on a wall with a window, cutting only that wall's handles:**

```
  cut curves returned          : 8
  of those, carrying a ref     : 8      (zero orphans — §1.1's table reproduced)
  distinct nodeIds in those refs: 2     wall-<ulid>.wall   AND   opening-<ulid>
```

The reveal faces belong to the **cut node**, not the wall — which the design doc says in §1.1 and Entry
71 measured from the other side (*16 of a real wall's 34 identities belong to other nodes*). Keyed by
`nodeId`, a plan through a window **draws 6 curves where 8 is correct and 10 where 20 is**, reports no
error, and looks like a drawing. `Part.refs` is the authority because it lists every token a part
carries *whoever minted them*.

### 3b. ⚠ `closed` is FALSE on every cut curve, and the frozen comment implies otherwise

`SectionCurve.closed`'s comment reads *"A cut curve bounds material and is closed."* Measured on a plain
box: **4 curves, all `closed=false`**. `BRepAlgoAPI_Section` returns individual EDGES, so the closed loop
is the union of four open edges — the granularity is the edge, not the loop. The field is reported
honestly from `BRep_Tool::IsClosed` rather than assumed. **Not corrected in the frozen comment**, because
that is a second contract edit and this PR already carries three; recorded here and in `open_rulings.md`.

### 3c. ⚠ `designOptionIds` is authorable only on a document whose options arrived by another road

`checkDesignOptions` — shared with the schedule CRUD — refuses an id absent from `scene.designOptions`,
and **v1.0.0 ships no command that can author a design option.** `core.createElement` says exactly that
in its own comment and deliberately *skips* the same check for its `designOptionId` field. So two doors
onto one reserved collection hold opposite policies, and `core.createSchedule`/`createView` with
`designOptionIds` can only succeed on a `.bnn` or a hand-assembled `Scene`. Pre-existing (Entry 68); the
view CRUD copied it faithfully because the design doc rules that a view and a schedule must not answer
the same question two ways.

### 3d. ⚠ A plausible face is not the right face, and nothing fails when you pick the wrong one

Hosting the test window on `lateral.0` — a real face of the wall — succeeds. The void then cuts a face
the plan never meets: the wall's volume comes back **exactly uncut (1,920,000,000 mm³)**, the drawing is
unchanged, and every call reports success. `lateral.1` is the a-side long face. §1c-4's lesson
(*OCCT's face names do not mean what they sound like*) one shape along, and the failure is silent.

### 3e. ⚠⚠ `pnpm state --rebaseline` LABELS A CONTRACT-TOUCHING PR `RISK: additive`

The risk is computed against the baseline and the baseline is then rewritten, so §8 reads:

```
| **frozen surface** | **RISK: additive** — re-baselined this session |
```

The qualifier carries the truth, but **the headline label is the thing `REVIEW.md` item 7 and the
prompt's step 3 tell a reviewer to route on** — and the routing rule is *contract-touching ⇒ the OWNER
merges*. So on exactly the PRs that must not be agent-merged, the generated label says they may be. Not
fixed here (it is a `scripts/state.mjs` change with its own revert-verification); raised as **Q15**.

### 3f. ⚠⚠ THE RE-SEED GATE IS SATISFIED BY A TIMESTAMP

CI failed on the re-seed gate (its **first fire on a genuine kernel change** — Entry 74's fire was a
false positive on a licence field). It is a LOCATION matcher: any change under `packages/kernel-occt/src/`
or `wasm/`, or `tools/kernel-build/src/`, demands that `tests/goldens/` also change.

I re-seeded on the pinned oracle rather than routing around it, **and then diffed the result**:

```
  tests/goldens/geometry.golden.json | 1 insertion(+), 1 deletion(-)

  -  "seededAt": "2026-07-13T11:52:47.575775+00:00",
  +  "seededAt": "2026-08-03T10:42:25.654256+00:00",
```

**One line. Every volume, area, count and bound across all 12 fixtures is byte-identical** — which is
the right answer, because this PR ADDS an op and modifies no existing geometry path. The 653-green suite
(every golden test running against the newly-linked WASM) already said so; the re-seed confirms it
independently against native OCCT.

⇒ **But note what actually satisfied the gate: a timestamp.** The remedy it prints bumps `seededAt`
unconditionally, so the gate cannot tell *"re-seeded, and the geometry is unchanged"* from *"re-seeded,
the geometry MOVED, and nobody looked at the diff."* Entry 74 named this exact hazard — *"an agent who
trips it and complies has silently re-baselined every golden with 'the gate told me to' as cover"* — and
narrowing the matcher in Entry 75 fixed the false-positive half while leaving this half untouched. **The
only thing that made my compliance safe here is that I read the diff**, which is not a property of the
gate. Raised as **Q16**.

---

## 4. What the frozen surface did

Three declarations moved, all ruled by D81, all additive in the "no existing field changed meaning" sense:

- `interface SectionCurve` — gained `nodeId?`
- `type SceneCollection` — gained `'views'`
- `interface ParamField` — `refTo` gained four members

`tests/frozen-surface.snapshot.json` **re-baselined in this PR**, which is what the freeze-boundary test
instructs when the change is intended and ruled.

---

## 5. What is NOT done

- **`mode:'cut+projection'`** — ruled out of v1.0.0 (Q1). The payload already carries the mode.
- **`3d` views** throw from `projectView` rather than returning empty: a 3D view is the renderer's, via
  `tessellate`. Deliberate, and stated in the code.
- **No sheet** (Q4 stands: composition, not projection).
- **`SectionCurve.closed`'s comment** (§3b) and the **`RISK` mislabel** (§3e) are raised, not fixed.

---

## 6. RISK

**`RISK: contract-touching` — the OWNER merges this.** The frozen surface moved (§4) and the baseline was
rewritten in the same PR under D81. ⚠ The generated label reads `additive` because of §3e; **do not
route on it for this PR.**
