# `open_rulings.md` — the owner's decision queue

**What this is.** Every question waiting on an owner ruling, in one place, each with a recommendation and
a price. Before this file existed the same eight questions were spread across a prompt file's §2, a design
doc's §7, three entries' NEXT sections and `current_state.md` §4j — so no one could see the queue, and one
blocking question sat unanswered across three sessions.

**How an agent uses it.**

- **Surface the blocking rows in your opening message**, every session, even when your TASK does not need
  them. ⚠ **Do not idle on them** — `TASK` is always something you can start alone.
- **When a ruling arrives, apply it AND record it** in the doc it belongs to (`docs/decisions.md` for a
  ruling, the design doc for a design question), then **strike the row here.** This file is a queue, not a
  decision record.
- **Add a row** whenever you surface a question, with a recommendation. A question with no recommendation
  is work handed to the owner rather than done for them.

**How the owner uses it.** Rule in batches. Everything below is **cheap only until the P5 freeze**; after
it, each becomes an amendment across three products (`.bnn` files in the field, Miqdar, Planitor).

---

## 🔴 BLOCKING — a unit cannot be built until these are ruled

| #      | Question                                                                            | Recommendation                                                                                                                                                                                        | Blocks                                                                                                          | Cost if deferred past the freeze                                   | Raised |
| ------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------ |
| **Q1** | **What does v1.0.0's plan/section SHOW** — cut only, or cut + projection?           | **`mode:'cut'` only.** Every curve then carries full sub-shape identity (measured 4/4, 1/1, 8/8, zero orphans) and cost is linear. HLR is ≈N^1.5 **and cannot attribute at all** (0 of 4 `IsSame()`). | The whole plan/section unit — Q1 decides the SHAPE of the thing, so building first is building the wrong thing. | A `ViewDescriptor` amendment; every issued `.bnn` carrying a view. | E69    |
| **Q2** | **Where does projected-curve provenance GO** if projection ever lands?              | **`SectionCurve.nodeId?`** over widening `SubShapeKind` with `'solid'` — `SubShapeKind` is frozen and load-bearing; an optional sibling field is not.                                                 | Same unit.                                                                                                      | Widening a frozen union afterwards.                                | E69    |
| **Q3** | **Does `ParamField.refTo` also gain `'view'`/`'sheet'`/`'annotation'`/`'family'`?** | **All four.** Free now, additive, nothing switches on it — the `'system'`/`'designOption'`/`'schedule'` precedent verbatim.                                                                           | `createView` takes a view id, so the plan/section unit cannot be authored without it.                           | A frozen `ParamSchema` amendment.                                  | E68    |

## 🟡 OPEN — a real decision, nothing blocked

| #       | Question                                                                                                                                                                                                                                | Recommendation                                                                                                                                                                                                                     | Cost if deferred                                                                    | Raised |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------ |
| **Q4**  | Does v1.0.0 owe a **SHEET**?                                                                                                                                                                                                            | **No** — a sheet is composition, not projection. The shape is already reserved.                                                                                                                                                    | Low; the reservation holds.                                                         | E69    |
| **Q5**  | The **discretisation tolerance** for section curves — mine to choose and document?                                                                                                                                                      | Mine, documented in the design doc and asserted in a test.                                                                                                                                                                         | Low.                                                                                | E69    |
| **Q6**  | **Is the D29 `.bnn` half worth wiring at the measured 2.07×?** A scheduling call, not a contract one.                                                                                                                                   | **No for v1.0.0.** It costs **6.64 ms/solid on every save** and **~61 MB at the 16k-solid target**, against a cold load that stays ~3 min either way. Spend the effort on `instantiate`, lazy build (D66) and MT (D8).             | None — the format field is additive whenever it lands.                              | E71    |
| **Q7**  | **Does `core.copy` deep-copy a host's openings?**                                                                                                                                                                                       | **Leave it refusing for v1.0.0.** Copying a door means rewriting a `hostRef` token that CONTAINS the host's element id — a re-identification (D1/D51), which is a ruling and not a body decision.                                  | The verb's `argsSchema` freezes at step 6.                                          | E72    |
| **Q8**  | **Is the BASELINE refusal the right strictness?** A user sliding a D52 wall must `core.setParams` both endpoints.                                                                                                                       | **Keep the refusal.** The alternative is `core.move` translating baseline params itself — Type knowledge in the command layer, which is what the ruled split says no to. Revisit if Amer's move tool finds it hostile in the hand. | Behavioural, cheap to change either way.                                            | E72    |
| **Q9**  | **rule 8 — does `FamilyDefinition` get a way to declare billable faces?** Without one, every D61 data-authored family reports the whole-solid area, which D72 measured **1.07×–3.03× wrong**.                                           | Reserve a way for DATA to name a face (role names on a primitive). The grammar shape is a design ruling, not a mechanical fix. ⚠ **The families north-star would otherwise ship permanently unable to bill correctly.**            | A three-product amendment; the family grammar freezes at step 6.                    | E64    |
| **Q10** | **rule 17 — should `Dimension.anchors` exclude the free `point` anchor?** Two paper anchors give a number no model edit will ever update — this rule's own _"drifts and lies"_, on the one annotation a builder reads AS a measurement. | **Narrow it** to the model-anchored members. One line while the shape is release-candidate.                                                                                                                                        | A three-product amendment, and the P6 body author will have implemented it by then. | E64    |

| **Q11** | **Who is the CLA's counterparty?** `CLA.md` ships with `<LEGAL ENTITY>` as a marked placeholder at every occurrence. | **You as a natural person, until a company exists** — it is assignable later, and an unnamed counterparty makes the agreement unenforceable now. I cannot invent this one: a CLA is an agreement _with somebody_. | Nothing until the first external PR — but a contribution merged under an unnamed counterparty is the exact defect D15 exists to prevent, and it is not fixable afterwards. | E74 |
| **Q12** | **Does a lawyer read `CLA.md` before the first external contribution?** | **Yes, and before — not after.** It is the Apache ICLA shape and §2 grants what dual-licensing needs, so it is a sound draft; that is not the same as advice. This is the one document whose first real use is its test. | Same as Q11: a merged contribution cannot be un-merged, and a defective grant cannot be cured retroactively. | E74 |

## ⚪ PARKED — recorded so it is not re-derived, no action wanted

| #      | Question                                                                                                                                                                                             | Status                                                                                                                                                                                     |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **P1** | Should `undo`/`redo` become **Commands** (rule 9)? They are things an actor does to the Document, they have no `argsSchema`, and they are absent from `listCommands()` — D41's exact argument shape. | **Additive** (a new verb is a registration, rule 5), so it forecloses nothing at the freeze. An owner call at leisure.                                                                     |
| **P2** | Delete the superseded Miqdar copies in `docs/archive/`?                                                                                                                                              | Their own header says **deleting them is a Bunyan freeze-gate change and an owner call**, because the P5 gate references them. Archived rather than deleted on 2026-07-31 for that reason. |

---

## ✅ RULED — struck from the queue

Recorded here only long enough to stop them being re-asked; the ruling itself lives in
`docs/decisions.md`, and the session that earned it in `handoff/` or `docs/history.md`.

- **P4.5 Q1–Q6** (the interaction model) — ruled 2026-07-30, applied into
  `docs/design/P4.5_interaction_model_design.md` §12, **and now BUILT** (Entries 70 + 72). Do not re-open.
- **Entry 65's three rulings** (D78 — `groupBy` names stable column keys · `designOptionIds?` reserved ·
  `ChildOverride.mark?` reserved) — applied and recorded. Do not re-open.
- **D8 multithreading** — ruled v1.0.x, 2026-07-25.
- **D64 / row Ⓔ** — the PEI-bound side-graph suffices; reserve nothing analytical. One exception,
  `Material.thermal?`, landed.
