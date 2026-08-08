# Entry 86 — the move verbs, the corner-drag, and the wrapper that was eating D23

**`RISK: additive`** — `apps/web` only. No frozen byte, no `packages/` file, no verb, no schema bump.
`pnpm verify`: **753 green · 87 files · six gates · real exit code 0.**

TASK was *"the move tool + gizmo, and the corner-drag"*, with two instructions attached: **read the
refusal before building the gizmo**, and **answer Q8 — is that baseline refusal hostile in the hand?**

Reading the refusal first is what saved the session, because it turns out the tool the task names
cannot be built the obvious way, and the mechanism the corner-drag rests on **did not work**.

---

## 1. ⚠⚠ THE DEFECT: `withUiRefresh` WAS SILENTLY DROPPING `transactionId`

`apps/web/src/edit/agentRefresh.ts` wraps the agent surface so an agent edit refreshes the React view
(the Entry-26 gap). Its `execute` was written:

```ts
execute: async (command, args) => {
  const edit = await agent.execute(command, args);   // ← the THIRD argument is discarded
```

`ExecuteOptions` is the third argument, and it is where **`transactionId`** lives — D23, owner-ruled
Q5, *"three walls meeting at a point are dragged together, which is three `core.setParams`, and three
undos is not what the user did."*

**Nothing failed.** Every edit applied, the geometry was right, `brokenRefs()` and `unbuildable()`
stayed empty. The only casualty was **undo granularity**, which is invisible until someone presses
`Ctrl+Z` once. Measured in the real app, two `core.setParams` under one id, then one undo:

```
before the fix                          after the fix
  initial      w1.end=[4000,0] w2.start=[4000,0]      initial      w1.end=[4000,0] w2.start=[4000,0]
  after drag   w1.end=[4500,500] w2.start=[4500,500]  after drag   w1.end=[4500,500] w2.start=[4500,500]
  after 1 undo w1.end=[4500,500] w2.start=[4000,0] ✗  after 1 undo w1.end=[4000,0] w2.start=[4000,0] ✓
  after 2 undo w1.end=[4000,0] w2.start=[4000,0]      after 1 redo w1.end=[4500,500] w2.start=[4500,500] ✓
```

⚠⚠ **And read the failed state, because it is worse than "one extra keypress": `w1` ends at
`[4500,500]` while `w2` starts at `[4000,0]`. The corner is OPEN.** One undo of a corner-drag left a
model the user never authored, geometrically wrong, with both diagnostics empty — and the join
resolver would then faithfully resolve a junction that is no longer a junction.

**Control run:** the same two edits with **no** `transactionId` behave **identically**. That is what
established it was the wrapper and not a misunderstanding of the grouping rule.

**Where it was NOT.** I walked the whole chain before blaming anything, and every other link is right:
`agent.ts:178` forwards `transactionId`; `document.ts:396` stamps it onto the edit; `document.ts:416`
pushes that stamped edit; `UndoStack.takeUndoGroup` groups on it correctly (pinned headlessly — three
edits, one id, one group, newest-first). **The document layer is clean. It was four missing characters
in `apps/web`.**

**Fix:** forward `options`. Revert-verified — the new transparency test goes RED with
`expected undefined to deeply equal { transactionId: 'gesture-7' }`.

### The transferable lesson

`agentRefresh.test.ts` had four tests and they were all good tests. Every one of them asserted what the
wrapper **adds** — a `notify` fires here, does not fire there. **Not one asserted what it must not take
away.** A pass-through wrapper's whole contract is that it is invisible, and invisibility is exactly the
property that a test of added behaviour cannot see.

⇒ **For any wrapper, decorator or proxy: assert the ARGUMENTS ARRIVE, not just that the side effect
happened. The variadic tail is where things go missing, and nothing errors when they do.**

---

## 2. Q8 ANSWERED: the baseline refusal is RIGHT, and the hostility is in the RIBBON, not the rule

Q8 asked whether `core.move`'s refusal is the right strictness, and said *"revisit if Amer's move tool
finds it hostile in the hand."* Here is the finding, and it is not the one the question anticipated.

**The refusal itself is correct and should not be relaxed.** A D52 wall's `{start, end}` is what the
join resolver, the room solver and the billed axis length all derive from; a `placement` written beside
them moves the *solid* and leaves every derivation at the old baseline. That is a silent wrong-schedule
bug, which is the class this project refuses hardest. The message also **names the road that works**,
which is what makes it recoverable rather than merely strict.

**What IS hostile is that the demo scene contains nothing `core.move` accepts.** Probed through
`dryRun` on the real app:

| element | `core.move` | cost |
| --- | --- | --- |
| Wall 1 (D52 baseline) | **REFUSED** | 1.6 ms |
| Wall 2 (D52 baseline) | **REFUSED** | 0.2 ms |

A "Move" button in the generated ribbon is therefore a control that refuses on **everything a user can
currently click**. The verb is not wrong; **rendering it as a generic button is**. Same argument as
`core.array`, which refuses by design and is now withheld from the ribbon for exactly this reason.

⇒ **Recommendation on Q8: keep the refusal, and treat "which verbs deserve a ribbon button" as the
real question.** Filed as a row rather than decided here.

### ⚠ And a measured correction to the dry run's reputation

A refused `dryRun` costs **1.6 ms then 0.2 ms**, not the ~100 ms that *"a real kernel rebuild thrown
away"* implies — `checkPositioning` refuses in the document, **before any geometry is staged**. An
**accepted** one (`core.setParams`) costs **28.5 ms**. This matters because it is what makes
probe-and-route affordable: walking a candidate list is dominated by its single accepted probe.
*(I had written "~100 ms" into `drag.ts`'s own header from the docblock's reputation, then measured it
and corrected my own comment. §1c-9: measure the artifact, not the manual.)*

---

## 3. WHAT SHIPPED: `tool/drag.ts` — a planner that PROPOSES and lets the document DISPOSE

The design decision worth reviewing: **the app does not classify.** It would be four lines to read
`element.hostId` and call `params.start !== undefined` a baseline — and those four lines would be a
second copy of `positioningOf`, which the document deliberately builds out of the join resolver's own
`baselineOf` so that *"this is not a guess about a Type, it is the engine's own test."* A second copy
drifts, and it drifts **silently**: the wrong verb on a baseline wall does not throw.

So `dragPlans()` returns **ordered candidate plans** — hosted, then baseline, then placement, which is
the engine's own refusal graph read forwards — and the caller `dryRun`s them and takes the first the
document accepts. That is D42's stated purpose (*"a UI highlights the offender; an agent reads it and
RE-PLANS"*), it costs one Tier-2 round trip **per gesture** and never per frame, and it means the app
never parses a refusal message. **Prose is not an API.**

`cornerDragPlan()` finds every wall sharing the grabbed corner **by coordinate** (within 1 mm) and
emits one `core.setParams` each, for **one transactionId**. Two things it deliberately does not do:
it does not rewrite the endpoint the user did not touch (an untouched value in the change feed reads
as an authored one), and it does not take identity from the snap — a guide point carries **no `ref`**
by construction (`align.ts`), so a drag that needed identity from the snap would be reading a field
that is absent exactly when the user has aimed most carefully. Matching on the coordinate is the
correct question anyway: in a D52 model, "the same corner" **is** a coordinate coincidence.

---

## 4. ⚠ WHAT DID **NOT** SHIP, STATED PLAINLY

**The GL gizmo — the draggable arrow handles in the viewport — is not built.** What is built is the
layer beneath it: the planner, the corner-drag grouping, the transaction that makes it one undo, and
the ribbon withholding. The gesture is proven through synthetic events and `window.bunyan`, not
through a widget a user can grab.

That is a real gap against TASK's headline and I am not dressing it up. The reason is that the session
spent its budget on the two findings above, and I judged a *measured* defect in D23 — the mechanism the
gizmo would have been built on top of — to be worth more than a widget built on a broken one. **The
gizmo would have shipped with a corner-drag that half-undid.**

⇒ Next session: `ViewportCanvas` drag handles on the selected element's baseline endpoints, calling
`cornerDragPlan` on `pointerup` with one gesture id. Everything below it is here and tested.
