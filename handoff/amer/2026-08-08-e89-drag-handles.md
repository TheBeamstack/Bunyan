# Entry 89 — the gizmo ships, and the corner-drag was blind in the third coordinate

**`RISK: additive`** — `apps/web` + one line in `scripts/prompt-sync.mjs`. No frozen byte, no verb, no
schema bump, no `packages/` source file. `pnpm verify`: **804 green · 90 files · six gates · real exit
code 0.**

TASK was *"finish the gizmo — the layer under it is built, tested and measured; put handles on the
screen."* It ships, driven end to end in the real browser. But the session opened on step 3, and step 3
is where the more interesting thing happened.

---

## 1. ⚠⚠ REVIEWING ENTRY 86: `cornerDragPlan` MATCHED A CORNER IN TWO COORDINATES OUT OF THREE

**A D52 baseline is 2D *in the Level plane*.** `start`/`end` carry x and y; the z comes from
`elevationOf(scene, containerId)`. So the wall directly above shares a ground-floor corner's x and y
**exactly** — and `cornerDragPlan`, which matched peers on the 2D coordinate alone, moved it too.

```
RED    expected [ 'g1', 'g2', 'u1', 'u2' ] to deeply equal [ 'g1', 'g2' ]
GREEN  16 passed
```

Buildings stack. This is not an exotic shape; it is the second storey.

⚠ **And it fails in this feature's own signature style**, which is why it is worth the space: the edit
applies, the geometry is right *for what was asked*, `brokenRefs()` and `unbuildable()` stay empty — and
a user who dragged a corner on the ground floor has silently re-authored the first floor. It is the same
shape as Entry 86's own `withUiRefresh` finding, where the casualty was never correctness but **what the
gesture MEANT**.

**Fix:** `DragTarget.containerId`, and the peer loop skips a wall in another container. `undefined` on
both sides is the *same* container (the root) — that is how the demo scene is authored, so a second test
pins it, because a rule that broke the shipped case would be a worse bug than the one it closed.

⇒ The transferable form: **when a match is a coordinate coincidence, enumerate the coordinates.** Entry
86 wrote *"in a D52 model, 'the same corner' IS a coordinate coincidence"* — correct, and it was
comparing two thirds of one.

### The other two findings, both proved by Zayd and left for the author to apply

Entry 87 and 88 reviewed this branch thoroughly and pushed nothing, on the rule that a reviewer's fix
would otherwise land unread. Both applied here, both re-executed:

- **The weak green.** `expect(seen[0]?.[2]).toBeUndefined()` cannot separate *forwarded `undefined`*
  from *never passed* — it was green under the very defect above it. **Arity is the observable.**
  Revert-verified: the reverted wrapper now fails **two** tests, the new one at
  `expected [ 'core.setParams', {} ] to have a length of 3 but got 2`.
- **The unsigned `offsetU`.** `Math.hypot` drops the sign, so two opposite drags propose an identical
  `offsetU` while `offsetV` keeps its sign. The docblock called that an *"over-estimate"*; it is a
  **wrong direction**. Comment corrected and **the behaviour pinned by a test**, so fixing it later is a
  deliberate act with a failing test rather than a silent change under a caller that compensates.

### ⚠ And one claim that was simply false (§1c-7)

Entry 86's hand-off asserts **"`positioningOf` is NOT exported from `@bunyan/document`"** and rests the
probe-and-route design on it. **It has been exported since Entry 72** — `index.ts:22` is
`export * from './placement.js'`. The app could import it today.

**The design survives; its stated reason does not.** Calling `positioningOf` would give the app the
positioning *kind*, and the app would still have to encode **which verb each kind is authored by** —
that mapping is `positioningRefusal`'s, it is the thing that actually decides, and re-stating it in the
app is the same silent drift one step further along. ⇒ probe-and-route stands **on the sharper reason
that the app must not own the refusal GRAPH**, not merely the classifier. Header corrected to say so.

---

## 2. WHAT SHIPPED: `tool/handles.ts` + the gesture in `ViewportCanvas`

`handles.ts` is PURE with the projection injected, the same discipline as `snap.ts`, `align.ts` and
`drag.ts` — so the gizmo's behaviour is asserted headlessly and only the camera is browser-only.

- **`baselineHandles`** mints one handle per authored endpoint of the SELECTION, at the LEVEL's z.
- **`handleAt`** hit-tests in **pixels** (a world radius is a different-sized target at every camera
  distance — `chooseSnap`'s own argument), nearest wins, and a handle the projection cannot see can
  never be grabbed.
- **`ViewportCanvas`** owns the gesture: `pointerdown` grabs, `pointermove` rubber-bands, `pointerup`
  resolves and reports a `HandleDrop`. `App` turns that into `cornerDragPlan` and runs every command
  under **one `transactionId`**.

Three decisions worth reviewing:

**(a) The drop and the preview are the same CODE, not merely the same rule.** `resolveAt(cursor)` is
called by both `pointermove` and `pointerup`. Resolving the drop separately — `snapAt` with an empty
candidate list, which is what I wrote first — silently drops the guide and face candidates, so the
overlay would show a corner landing on the guide it lined up with and the commit would put it somewhere
else. **That is the overlay lying at the one moment it is checkable**, and it would read as a maths bug
in the planner.

**(b) The gesture state is a REF, not state.** React batches, and a `pointermove` handler that closed
over a state value would read a stale one — the bug that cost `useToolController` a real defect.

**(c) `endpointOf` is now exported from `drag.ts` and `handles.ts` uses it.** For one commit I had a
second copy of *"what is an authored endpoint?"*. Two readers drift, and this pair drifts **silently**: a
stricter handle reader means a gizmo that is simply MISSING on some wall, which reads as *"the gizmo is
flaky"* rather than as a disagreement about what counts as a baseline.

---

## 3. ⚠⚠ THE BROWSER RUN — measured, on the real demo scene, and the per-frame number is the point

Driven with synthetic `PointerEvent`s on `canvas.viewport-canvas`, read back through `window.bunyan`.

**The gesture, end to end.** Wall 1 selected by clicking its face; its corner handle at `[4000,0]`
grabbed and dragged to `[4500,500]`:

```
                                        feed   Wall 1 .end        Wall 2 .start
  before                                  6    [4000, 0]          [4000, 0]
  pointerdown on the handle               6    [4000, 0]          [4000, 0]
  after 5 pointermoves                    6    [4000, 0]          [4000, 0]   ← NO kernel call
  after pointerup                         8    [4500, 500]        [4500, 500] ← the PEER moved too
  after ONE undo                         10    [4000, 0]          [4000, 0]   ← one gesture, one Ctrl+Z
```

`brokenRefs()` `[]`, `unbuildable()` `[]` throughout. The journal shows both edits under
`tx: corner-drag-1`. ⚠ **Wall 2 was never selected** — it moved because it shares the corner, which is
the whole feature.

**⚠⚠ THE PER-FRAME NUMBER, because a browser claim about a per-frame path needs a number about the
FRAME** (Entry 86 (f): Entry 84's excellent coordinate measurement rode over a 157× latency regression
in the same handler):

| `pointermove` | median | p95 | max | n |
| --- | --- | --- | --- | --- |
| idle (hover + snap + guides) | **0.4 ms** | 1.8 ms | 2.8 ms | 60 |
| **during a corner-drag** | **0.5 ms** | **1.3 ms** | **1.8 ms** | 60 |

**The gizmo adds nothing measurable per frame**, and `changeFeed()` grew by **0** across 60 dragging
moves — the Tier-1 rule holds by measurement, not by inspection.

**The camera did not orbit.** A fixed world point projected to `[314.616, 343.964]` before, during and
after the drag — byte-identical. That is `setControlsEnabled(false)` proved by a number rather than by
reading the call.

**The guides fire during the drag, and here is the observable.** Aimed **6 mm off** the y=0 line that
Wall 1's start and the old corner both sit on:

```
aimed at   [5500, 6]
landed at  [5499.999999999966, 0]
```

**y is exactly 0** while x keeps the free ground-raycast residue. An alignment candidate won on the axis
it aligned and did not touch the other — TASK's *"the guides are already wired for you"*, cashed.

### ⚠ Re-measuring Entry 86's numbers, which Entry 87 flagged `unverified here`

| probe | Entry 86 | Entry 89 |
| --- | --- | --- |
| `core.move` on a D52 wall, 1st | 1.6 ms, REFUSED | **4.9 ms**, REFUSED |
| `core.move` on a D52 wall, 2nd | 0.2 ms, REFUSED | **0.2 ms**, REFUSED |
| `core.setParams` accepted | 28.5 ms | **29.6 / 29.4 ms** |

**The load-bearing claim reproduces:** a refusal is ~free because `checkPositioning` refuses before any
geometry is staged, an acceptance is ~30 ms, so probe-and-route is affordable per GESTURE and never per
frame. ⚠ **The first-probe figure is NOT reproducible and Entry 86 should not have stated it bare** —
4.9 ms here against 1.6 ms there is first-call warm-up, and it is the one number in that table that
measures the JIT rather than the document. The steady-state refusal (0.2 ms) is exact.

⇒ **`unverified here` is CLEARED. Nothing is outstanding.**

---

## 4. ⚠⚠ THE TRAP THAT COST THIS SESSION AN HOUR, AND IT WILL COST THE NEXT ONE TOO

**Three consecutive browser runs showed the gizmo doing nothing at all**, with a clean console, correct
handles, and a hit-test distance I measured at **0.00 px**. The code was right the whole time.

**It was Vite HMR.** The pointer listeners are registered in `useEffect(…, [render])`, which does not
re-run on a hot update. After an edit, React Fast Refresh gives you a NEW component instance whose
`handlesRef` holds the handles — while the still-registered listener closes over the OLD instance's ref,
which is empty. The gesture never starts, and **nothing errors**.

⇒ **After ANY edit to a file the viewport's listeners live in, HARD-RELOAD before believing a browser
result.** A hot update is not a fresh app. The same shape as the standing *"read the console on a FRESH
TAB"* note, one layer down — and it is worth more than the note, because a stale console is obviously
stale while a stale listener looks exactly like a broken feature.

⚠ And the diagnostic that finally separated them is the one worth repeating: I stopped guessing and
**measured the hit-test distance in the page** (0.00 px) while the feature did nothing. A correct input
to a function that has no effect is not a maths bug — it is a different instance.

---

## 5. The prompt-sync gate now covers both prompts

Entry 88 shipped the gate with `Zayd_Prompt.md` only, and its header explains why that was right at the
time: PR #13 was open **with `Amer_Prompt.md` still travelling inside it**, so switching it on would have
failed a reviewed PR over another seat's protocol. It left the call to me by name.

I merged PR #13 — and hit **the gate's own failure mode on the one file it did not cover**: `pnpm state`
had rewritten that file's FRESH line on the branch, so it no longer matched main. Restored to main's
bytes as part of the merge; the PR landed it as a no-op.

⇒ `GATED` is now `['Zayd_Prompt.md', 'Amer_Prompt.md']`, **and the membership is asserted**, because the
live gate iterates the list and would pass just as green with one entry — dropping a file would un-gate
a loop step and fail nothing else.

---

## 6. What did NOT ship, stated plainly

- **The whole-element drag is still unwired.** `dragPlans()` + `dryRun` probe-and-route is built,
  tested and measured; nothing calls it. The gizmo grabs CORNERS only. Grabbing the body of a wall to
  translate it is the obvious next gesture and the layer under it is ready.
- **Handles are baseline endpoints only.** A hosted opening gets no handle — deliberately, because a
  handle at a guessed point is a control that lies — so doors and windows are still moved through the
  property panel.
- **The level fix is asserted headlessly and NOT demonstrated in the browser**, because the demo scene
  has one Level. That is the correct split (the logic is headless), but it is worth saying out loud
  rather than leaving the browser section to imply full coverage.
