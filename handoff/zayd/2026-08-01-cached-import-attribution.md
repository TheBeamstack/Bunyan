# Entry 73 — the cached-import attribution: the `shapeSignature` memory view is CANCELLED, measured

**Zayd · 2026-08-01 · Hetzner dev box, headless · branch `zayd/2026-08-01-shapesig-memview`**

---

## What the TASK asked for, and why it is not what shipped

The session's `TASK` was unambiguous and confident:

> **THE `shapeSignature` MEMORY VIEW — ruling-free, no contract, pure win, and it is most of what makes a
> cached import cost 12 ms.** Measured in Entry 71: a cached import pays **170 embind boundary crossings
> per solid** … `tessellate` already solves exactly this with a typed-array memory view; this is the same
> fix applied to the same trap.

It also carried its own escape hatch, and that is the instruction that decided the session:
**"⚠ Measure both sides — the 12.00 ms/solid import is the number to beat, and §1c-9 says measure the
artifact, not the manual."**

I measured first. **The premise is false, and the unit is not worth building.** What shipped is the
measurement that falsifies it, made permanent and machine-checked, plus the two live documents that were
carrying the wrong number as a work order.

---

## FINDING 1 — ⚠⚠ THE "170 EMBIND CROSSINGS" WERE NEVER MEASURED. THEY ARE A SUBTRACTION RESIDUE.

Entry 71's closing paragraph reads:

> *Where the 12 ms goes (native breakdown ×3 for our WASM, plus plumbing): `BRepTools::Read` **0.175 ms**
> … `BRepCheck_Analyzer` **1.143 ms** (68% of the OCCT work), the fingerprint's 34 `GProp` measurements
> **0.370 ms**, and the rest is **170 embind boundary crossings per solid** …*

**"And the rest is"** is the whole defect. A *native* breakdown was scaled by a blanket ×3 for WASM, and
**whatever the scaled parts failed to account for was attributed to the boundary crossings** — a quantity
that was never timed, on the strength of a trap that `kernel.cpp` documents in a different context and at
a different scale. That inference then travelled: into `current_state.md` §5 as Zayd priority **1**, into
`Zayd_Prompt.md`'s `TASK`, and into this session's opening instruction — three documents, one unmeasured
residue, presented each time with more confidence than the last.

This is **§1c-9 verbatim** (*"measure the artifact, not the manual"*) and **§1b's third method**. It is
also the same shape as §1c-7's worst form: the misleading artifact was not prose, it was a **number**.

### What a crossing actually costs

Measured on the real 34-sub-shape fixture (a wall cut by a door — Entry 47's trap, the same fixture the
D29 suite already uses), real OCCT WASM, dev box, headless:

```
  shapeSignature C++ compute   7.895 ms
  all 173 embind crossings     0.073 ms   (0.42 us each, 0.9% of the call)
  ⇒ a memory view could remove 0.073 ms/solid, and no more.
```

**0.073 ms out of a ~12 ms import is 0.6%.** For the residue theory to hold, a crossing would have to cost
**~50 µs**; it costs **0.42–0.66 µs**, two orders of magnitude less.

### ⚠ The method matters, because my FIRST attempt at it was wrong in exactly the same way

The obvious probe — time `shapeSignature`+drain, time `shapeSignature` alone, subtract — puts a **0.073 ms
signal inside a 10 ms measurement** and returns noise. It returned a **negative drain cost** (`-0.155 ms`,
then `-0.772 ms` on the real fixture through the real import path). That is the same error Entry 71 made,
and it very nearly let me "confirm" the opposite conclusion by reading noise as signal.

**The fix is to hold the compute out entirely:** build ONE signature vector, drain it 200 times, delete it
once. The compute then appears nowhere in the number. Three independent probes agree:

| probe | shape | crossings | measured |
| --- | --- | --- | --- |
| subtraction (**rejected — noise**) | holed wall, 58 sub-shapes | 294 | `-0.155 ms` |
| compute held out | plain box, 18 sub-shapes | 93 | 0.085 ms → **0.913 µs each** |
| compute held out | holed wall, 58 sub-shapes | 293 | 0.055 ms → **0.189 µs each** |
| **permanent test**, compute held out | **real fixture, 34 sub-shapes** | **173** | **0.073 ms → 0.42 µs each** |

---

## FINDING 2 — the residue is `shapeSignature`'s OWN `GProp` WORK, and that is the price of verification

`shapeSignature`'s C++ compute is **7.9 ms** — **46%** of the kernel-side import (`importBrep` alone is
9.9 ms; import + signature is 17.9 ms). It is ~34 `BRepGProp` integrations, one per sub-shape, and it is
**flat at ~0.17 ms/sub-shape** across shape classes (a plain box: 3.09 ms for 18; a holed wall: 9.82 ms
for 58).

⚠ Note this is **~15× the ×3-scaled native estimate**, not 3× — a second, independent reason not to trust
the scaled native breakdown that produced the residue.

**This confirms `current_state.md` §1a's existing sentence rather than contradicting it:** *"verification
is most of a cached load's cost … so no amount of serializer tuning changes this."* That line was right;
§5's priority 1 was the one that was wrong. §1a has been upgraded from an assertion to a measurement.

⇒ **There is no marshalling or serializer win hiding in the cache path.** The cold-load levers remain
exactly the three already named: `instantiate` (RESERVED), lazy build/eviction (D66), MT (D8).

---

## FINDING 3 — and the trade the memory view would actually have made

Even granting the 0.073 ms, the fix is the wrong one here, and the reason is worth recording because the
analogy to `tessellate` is what made it look obvious:

- **`tessellate`'s payoff is ~1.8 million crossings PER FRAME, on every drag.** `shapeSignature`'s is
  **170 per solid, once.** Four orders of magnitude apart. The same fix does not follow from the same trap.
- **The cost side is not zero.** A memory view means a **global buffer with a `valid only until the next
  call` lifetime** (`kernel.cpp` says exactly this of `g_mesh`) placed in the one path `cache.ts` opens by
  describing as *"the only place in Bunyan where a wrong answer produces a PLAUSIBLE wrong building."*
- Plus a WASM rebuild and a **14.6 MB committed binary artifact** churned for **0.6%**.

**Recommendation, and it is a body decision rather than a ruling: do not build it.** Recorded here so it
is not re-derived a third time.

---

## What shipped

### 1. The measurement, permanent and machine-checked

`tests/geometry-cache-d29.test.ts` gains **`⚠⚠ THE ATTRIBUTION`** (section 8). It reports the numbers the
way `THE PRIZE` above it does, and it **asserts two tripwires**:

```ts
expect(perCrossingUs).toBeLessThan(10);   // measured 0.42–0.66 us
expect(drainShare).toBeLessThan(0.25);    // measured 0.9%
```

⚠ **A RATIO, NOT A DURATION, AND DELIBERATELY.** `THE PRIZE` declines to gate on absolute time because a
shared box makes that untrustworthy, and that reasoning is not repealed here. A ratio survives a loaded
box, and both bounds sit **10–40× off** the measured values: they are tripwires for *"the crossings became
the cost after all"*, not thresholds. If either ever fires, the memory view **is** worth building and the
comment beside it says so in those words.

⚠ **WEAK-GREEN CHECK (REVIEW item 6) — what would let this pass while its own title is FALSE?** Two ways,
both closed: the drain could be dead-code-eliminated (so it accumulates into a `sum` that is returned,
never a discarded `get`), and the fixture could silently weaken to a plain box (so it asserts
`subShapes === 34` — a box's 18 would exercise neither a cut node nor a foreign token, the same trap the
file's own fixture comment documents).

⚠ It imports the raw WASM module. That is a deliberate layering reach, for the one reason this suite
already reaches into `cache.ts` directly: **the cost being priced is the embind boundary itself, which no
op can expose.** Everything else in the file still goes through the client.

### 2. REVERT-VERIFICATION (the standing rule, and REVIEW.md item 1)

A measurement test's revert-verify is *"assert the belief this replaces, and watch it go red."* Entry 71's
claim, encoded as the assertion, **fails with the real number in the output**:

```
AssertionError: ENTRY 71'S BELIEF: the crossings dominate a 12 ms import:
  expected 0.6613603757225428 to be greater than 10
 ❯ tests/geometry-cache-d29.test.ts:596
```

The old claim is now not merely unsupported — it is **machine-falsified**, with the falsification
reproducible by anyone who runs the suite.

### 3. The two live documents that were carrying the wrong number as a work order

- `current_state.md` **§1a** — the cold-load row's verification note upgraded from assertion to
  measurement, with the three remaining levers restated so the closed-off one is not re-proposed.
- `current_state.md` **§5** — Zayd priority 1 **deleted**, replaced by an explicit *"DO NOT RE-ADD"* block
  carrying the number. Priority 3 deleted too (Finding 4). The CLOSED list gains the attribution.

⚠ **`handoff/zayd/2026-07-30-d29-cache-bodies.md` is NOT rewritten.** It is a record of what was believed
and measured on 2026-07-30, and this project does not edit its own history; the correction belongs in the
documents that are *read as guidance*, which is where it went.

---

## FINDING 4 — ⚠ THE `schedule.ts` "RULE 17" RENAME IS A PHANTOM. THERE IS NO COLLISION.

TASK item 2 read: *"`schedule.ts`'s comments name their own convention 'rule 17', which collides with
`core_logic.md` §8's numbered rule 17 (D58)."*

**Read against the artifact, every clause of that is false.** `schedule.ts` has exactly two `rule 17`
citations, and **both are correct references to the real numbered domain rule 17** — *"A DRAWING IS A
PROJECTION OF THE B-REP"* (`core_logic.md:369`, D58), which **names schedules explicitly** in its own text:

- `schedule.ts:19` — *"the rule this body is the first test of (Entry 64, domain rule 17): **a schedule is
  a PROJECTION**"* ✅
- `schedule.ts:88` — *"A schedule is a PROJECTION (rule 17): `projectSchedule` must never refuse a builder
  his table…"* ✅

There is no local convention of that name. Better still, **the collision was already investigated and
resolved**, and `core_logic.md:376` records the outcome in terms that answer this TASK item directly:

> ⚠ **NUMBERED 19, NOT 17, AND THE REASON IS A CORRECTION WORTH KEEPING.** The design doc proposed
> "rule 17", **believing the only collision was a `schedule.ts` code-comment convention of that name. It
> was wrong**: 17 (a drawing is a projection, D58) and 18 (an element may own child elements, D59) are
> both real, swept domain rules. … *The check that caught it is this project's own: read the list rather
> than the claim about the list.*

So the work item is the **already-refuted belief**, which outlived its own refutation by travelling into a
prompt file. **Performing the rename would have introduced the error, not removed it** — it would have
renamed two correct citations of a binding domain rule into something else. No change made; the item is
struck from §5 with the reason.

---

## The session's transferable lesson

**Two of three TASK items dissolved on contact with the artifact, and the third is untouched work.** Both
died the same way: *a claim about the code, written into a planning document, and never read back against
the code.* One was a number nobody timed; one was a belief whose own refutation was already committed, two
files away.

⚠ **The mechanism that let both travel is the one this project's new handoff system was built to fix:**
§1e counted *"one session's outcome written in ten places, by hand"*, and both of these were copies —
Entry 71 → §5 → `Zayd_Prompt.md` → the session brief. **A copy is a claim nobody will re-read.** The
prompt file's own `TASK` is now a fourth-generation copy of an unmeasured residue, and the only thing that
caught it was the single line in the same `TASK` that said *measure both sides*.

⇒ **Keep that line in every TASK.** It cost ten minutes of probing and saved a WASM rebuild, a 14.6 MB
artifact churn, and a lifetime-sensitive global buffer in the cache verification path.

---

## Verification

- **630 green** · 78 files · **`pnpm verify` exit code 0, read directly**, all six gates
  (typecheck · lint · format:check · test · reseed:check · docs:check).
- Real OCCT WASM, dev box, headless. No mock anywhere in the D29 suite.
- **Revert-verified 1 way** (the only claim this entry makes): Entry 71's belief asserted → RED, output
  pasted above. The remaining D29 tests are unchanged and were not re-revert-verified — Entry 71 did that.
- **No kernel C++ change, no WASM rebuild, no artifact churn.** `RISK: additive` — no frozen byte, no
  `SCENE_SCHEMA_VERSION` bump, no field, no verb, no protocol change.
- **Box:** read/measure only. Three throwaway probes written and deleted. Nothing installed, no containers
  touched, no ports bound. `/tmp` 9.9 MB, ~2.4 GB RAM available throughout, load ≤0.67. Both live
  production sites untouched (`portfolio-caddy-1`, `beamstack-contact`), as were Planitor's and
  Chantier's containers.

## What is owed

- **Owner — three rulings still BLOCK the plan/section unit: Q1, Q2, Q3** (`open_rulings.md`). They have
  now blocked it across four sessions (69 → 71 → 72 → 73). Q1 decides the SHAPE of the unit, so it cannot
  be started under an assumption. **Q6 is answered by this entry's neighbours and unchanged: do not wire
  the D29 `.bnn` half for v1.0.0.** Q7–Q10 unchanged.
- **Owner — the FREEZE (P5 step 6) is still yours and still unblocked.** This entry moved no frozen byte.
- **Amer — nothing.** No `apps/web` surface is touched.
- **Next Zayd:** the going-public housekeeping (`LICENSE` AGPL-3.0, the CLA, the OCCT + planegcs
  attribution notices) — **its own commit**, Entries 64+65's lesson. Then the plan/section unit **the
  moment Q1–Q3 land**.
