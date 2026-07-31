# P5 step 5G — THE DESIGN-OPTION EXCLUSION CASCADE (row Ⓖ, D67)

**Status:** owner-ruled 2026-07-25 (fix before the freeze; widen the rule to see the model). Built in Entry 57.
**Predecessor:** `P5_step5F_reservations_design.md` (D65 reserved the shapes **and** the invariant).
**Found by:** the pre-freeze adversarial sweep the owner authorised in place of freezing (Entry 57 §1).

---

## §1 — The finding, measured

D65 ruled the exclusion invariant **into the frozen contract** — not merely into storage — so that Bunyan,
Planitor and Miqdar would implement **one** rule rather than three slightly different ones (`designoptions.ts`
header; domain rule 10). The rule shipped as `isElementActive`, tested, revert-verified, 19 assertions.

**It reads only the element's own `designOptionId`.** Its signature — `(element, options, active)` — is handed
an element and **no model**, so it is structurally incapable of asking what the element hangs off.

Measured against the real OCCT kernel, two real schemes, geometry built and `brokenRefs() == 0`:

```
Scheme A (chosen):        1 wall,  1 window          designOptionId: opt-a  (primary)
Scheme B (not built):     1 wall,  3 windows         designOptionId: opt-b

  consumer applies isElementActive to every scene element:
    active WALLS   = 1     ✓ correct
    active WINDOWS = 4     ✗ correct answer is 1
    ⇒ 3 windows counted for a scheme nobody builds
    ⇒ all 3 are hosted on the wall the SAME RULE JUST EXCLUDED — each is a window with no wall
```

This is **verbatim the failure mode D65 exists to prevent** ("a schedule double-counts and publishes work
packages for a scheme nobody is building"), reached by the one road D65 did not walk: **the hosting edge**.
The author tagged the _wall_ — the natural authoring act, and the only one Revit asks for — and the windows
followed it in the model but not in the rule.

⚠ **Why it is pre-freeze and not an ordinary bug.** The defect is in the _signature_, not the body. Correcting
it after the freeze changes a helper D65 deliberately froze **for three products to call**, i.e. exactly the
cross-product amendment the freeze exists to make impossible. Free today.

## §2 — The edge inventory (every "belongs-to" road to the same hole)

The §1b method applied to the rule itself: _which edges make one element's reality depend on another's?_

| Edge                                             | Field                                | Status                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hosting** (a window in a wall)                 | `Element.hostId`                     | ⚠⚠ **BROKEN — measured above.** An opening is an independent `scene.elements` row, so it is enumerated and judged on its own tag.                                                                                                                                                      |
| **Generated children** (a curtain wall's panels) | derived PEI `${parent}/${slot}`      | ✅ **SAFE BY CONSTRUCTION.** Model A children are **not stored rows** (`Object.keys(scene.elements) == [cw]`, Entry 48) — a consumer never enumerates them separately; they are carried by, and excluded with, their parent. **D59's derived-children ruling pays off a second time.** |
| **Manual groups** (a table + four chairs)        | `Element.parentElementId` (reserved) | ⚠ **Same hole, dormant.** Group members will be independent rows. Writing the rule for this edge now makes the v1.0.x `groups` collection land additively.                                                                                                                             |

⇒ The rule must be stated once over **every** belongs-to edge, present and reserved — which is what the
helper's own docstring already promises ("the invariant, expressed once").

## §3 — The ruled shape (owner, 2026-07-25)

> **Widen the rule to see the model.** An element counts iff **its own option is active AND every element it
> hangs off is active**, walking the host edge, and the group edge when groups land.

```ts
isElementActive(element, scene, active?)   // scene: { elements, designOptions }
```

The `options` record argument is **replaced by the model**, not supplemented: the scene already carries
`designOptions`, and a consumer that has one has the other. One argument, and it is the document.

**The walk.** From the element, follow `hostId` then `parentElementId` upward. The element counts only if it
and **every ancestor** passes the own-tag test. Rules at the edges, each matching an existing precedent:

- **A missing ancestor ⇒ excluded.** Precedent: the existing "an element naming an option the document does
  not define is a BROKEN REFERENCE, not a licence to include it." An opening whose host row is gone has no
  host to be cut into; counting it bills a window into thin air. Excluded, and a future body surfaces it
  (domain rule 3).
- **A cycle ⇒ excluded, never a hang.** Precedent: `buildChildrenTree`'s cycle guard (Entry 48 §7). A cyclic
  `hostId`/`parentElementId` chain is a hostile-`.bnn` defect, and the document must refuse it predictably.
- **Depth is unbounded but visited-guarded** — a window in a wall in a group in a group is ordinary.

**What does NOT change:** the own-tag semantics (absent ⇒ main model, always counted; unlisted set ⇒ that
set's primary), `DesignOption`, `ActiveOptions`, `Element.designOptionId`, `scene.designOptions`, and every
other reserved shape. **No `SCENE_SCHEMA_VERSION` bump, no new field, no verb, no stored byte.** This is a
correction to a frozen _rule_, expressed in the one function that carries it.

## §4 — Why not the alternatives (recorded, per the reserve-time discipline)

- **Enforce at authoring** (tagging a wall tags its windows) — closer to Revit, and it keeps the stored model
  self-consistent. **Rejected as the sole mechanism:** Miqdar _writes_ `.bnn` (§4g), so a file authored
  elsewhere that skips the propagation would mislead every consumer, and the read side is the only arbiter
  every consumer shares. Authoring-side propagation remains a legitimate **additive** convenience later.
- **A second scene-aware function beside the per-element one** — leaves a footgun wearing the obvious name;
  the three consumers reach for `isElementActive` first. Rejected on domain rule 10.

## §5 — Test plan (the standard: revert-verify, or it is an assertion)

`tests/option-cascade-d67.test.ts`, against the **real OCCT kernel** (the two-scheme building is real geometry,
not hand-made objects — the §1b method is what found this):

1. **The measured case:** two schemes, real walls + hosted windows ⇒ **1 wall + 1 window active, not 1 + 4.**
2. **The main-model window on an optioned wall** is excluded with its host (the exact §1 case).
3. **An optioned window on a main-model wall** is judged on its own tag (the cascade must not over-exclude).
4. **Switching the active option** flips which scheme's windows count — both directions.
5. **A missing host ⇒ excluded**, not counted.
6. **A cycle ⇒ excluded, and it terminates** (a hostile `.bnn`, never a hang).
7. **Group edge:** a member of an excluded `parentElementId` is excluded (the reserved edge, proven now).
8. **Generated children are unaffected** — the curtain wall still round-trips from one authored row.
9. ⚠ **REVERT-VERIFY:** drop the ancestor walk ⇒ tests 1/2/5/6/7 fail with the 4-windows number.
