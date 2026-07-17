# P5 · Steps 0e + 0f — The Missing CRUD & the Generalised "No Silent Re-identification" Guard — DESIGN

**Author:** Zayd (dev box) · **Date:** 2026-07-16 · **Status:** ⏳ awaiting owner review, then implementation
**Depends on:** ✅ 0a (dependency graph), ✅ 0b (constraints/datums) · **Executes:** D50 §0e/§0f, D51 (generalised), Freeze-Gate row ⓓ
**Freezes at P5:** the new commands' **`argsSchema`** (D21 — the agent's tool list freezes with `Command`), including the refuse-or-retarget arg shape. **This is why it gets a design:** the guard's arg shape is permanent.

---

## 0. The gap (measured, not asserted)

- **The registries are CREATE-ONLY.** There is `updateStyle`, `deleteElement`, `deleteConstraint` — and **nothing else**. No `updateContainer` / `updateGrid` / `updateMaterial` / `updateSection`; no `deleteStyle` / `deleteMaterial` / `deleteSection` / `deleteContainer` / `deleteGrid`. **A density typo cannot be fixed; a Level cannot be moved; a grid line cannot be nudged; an unused style cannot be removed.**
- **`updateContainer`/`updateGrid` are the missing halves of 0a/0b.** The invalidation edges for "move a Level" and "move a Grid" are **already in the graph and revert-verified** — but there is no command to _change_ the elevation or the offset. 0e is the two-line verb that makes "move a Level, the building follows" true **end to end** (0b proved it only by rebinding a datum).
- **⚠⚠ D51's guard was written as a rule and never built.** `updateStyle` writes `layers` **directly** (`commands.ts:490`), with no check that renaming a layer **orphans every opening hosted on that layer's face** — the layer name is _inside_ the `SubShapeRef` token (`wall-1.finish.interior/face/y-min#0`), and the UI renders it as ordinary editable text. Reproduced (Entry 24b): the wall rebuilds at full volume, no hole, `brokenRefs` 0→1, **no refusal, no warning.**
- **And the layer rename is only the FIRST instance (row ⓓ).** `materialId`, `sectionId`, `containerId`, a `grid`/`level` constraint target, `styleId` are all identity- or quantity-bearing. Every `delete…` that removes one, and every `update…` that repoints one, must **refuse-or-retarget** — never silently orphan. The rule is _"a command never silently changes what a reference points at."_

---

## 1. The reference taxonomy — what breaks when you remove/repoint what

The design must be driven by the actual reference graph, not by a list of verbs:

| Referenced entity     | Referrers (who points AT it)                              | Break on delete                                                 | Break on repoint/rename                   |
| --------------------- | --------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------- |
| **Material**          | style layer `.materialId`, `Section` (no), element (no)   | quantity loses its density (mass **omitted**, already graceful) | —                                         |
| **Section**           | style `.sectionId`                                        | a LinearMember's **swept profile vanishes** ⇒ build fails       | geometry changes (re-stage)               |
| **Style**             | element `.styleId`                                        | element loses its layer stack ⇒ build fails                     | —                                         |
| **Container (Level)** | element `.containerId`, `base`/`top` constraint `.target` | element loses its datum (falls back to 0)                       | elevation change ⇒ **re-stage (0a edge)** |
| **Grid**              | `grid` constraint `.target`                               | element loses its placement axis                                | offset change ⇒ **re-stage (0b edge)**    |
| **Style LAYER NAME**  | opening `.hostRef` **token** (contains the layer name)    | n/a                                                             | ⚠⚠ **orphans the opening (D51)**          |
| **Element**           | opening `.hostId`/`.hostRef`, constraint `.element`       | **cascade-delete (D39, built)**                                 | retarget (built)                          |

Two conclusions:

1. **`updateSection` forces the `sections` dependency edge to become REAL.** 0a declared `sections` as "nothing" with a note: _"when `updateSection` lands, revisit this line."_ It lands here. A section change must re-stage every element whose **style** references it (`section → styles-using-it → their instances`). _(Material stays "nothing" — geometry never depends on density; a density edit only re-computes quantities, lazily.)_
2. **Every delete of a referenced library entity, and `updateStyle`'s layer rename, needs the same guard** — refuse-or-retarget. That guard's arg shape is the one frozen thing here.

---

## 2. The refuse-or-retarget contract (row ⓓ — the FROZEN part)

One shared shape, on every command that can break a reference. The rule: **compute what would break; if nothing, proceed; if something, refuse with a typed failure that NAMES the references — unless the caller explicitly acknowledges or retargets.**

```ts
// Added to the argsSchema of every delete… and every identity-repointing update…:
acknowledge?: boolean;                   // "yes, proceed and let these references break"
retargetMap?: Record<string, string>;    // redirect each listed reference: old → new
```

Semantics (mirrors a database FK `ON DELETE RESTRICT | SET | CASCADE`, made explicit and undoable):

- **Default = RESTRICT.** The command throws `CommandFailure('REFUSED', …, [ref1, ref2, …])` — the `details` list every reference it would break (element id + the token/field), so the UI and the agent can show _exactly_ what is at stake. Nothing changes (reject + keep last-good, D42).
- **`retargetMap` = SET.** Each referrer named in the map is repointed to the new target in the **same edit** — e.g. delete `blockwork-200` with `{ 'blockwork-200': 'blockwork-215' }` rewrites every style layer using it, then deletes it; rename a layer with `{ 'wall-1.finish.interior/face/y-min#0': '…new-name…' }` rewrites the opening's `hostRef`. One atomic `UndoableEdit`.
- **`acknowledge: true` = accept the break.** Proceed; the dangling references surface as first-class **broken refs** on the next rebuild (domain rule 3) — for a material, mass is **omitted** (already graceful, `document.ts:397`); for a host face, the opening is a broken ref awaiting retarget. Never silent: the caller _said_ to break them.

⚠ **Why both, and why frozen now.** `retargetMap` is the safe repair path; `acknowledge` is the "I really mean it" escape hatch. Omitting either forecloses a real workflow (you cannot always supply a replacement, and you cannot always avoid breakage), and **adding an arg to a frozen `Command` is a contract amendment** — so both ship before the freeze even though the UI for them is P4.5+.

Implementation: one helper `guardReferences(referrers, args)` used by every guarded command — it computes the referrer set, applies `retargetMap`, or throws. **One guard, not a per-command reimplementation** (the D51 lesson: the rule existed; the single place to enforce it did not).

---

## 3. The commands to build

### 3.1 Updates

| Command                         | Fields                              | Re-stage                                                                                                                                                  | Guard?                                                    |
| ------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `updateContainer`               | name, elevation, number             | ⚠ **elevation ⇒ the 0a container edge fires** — every element on/above the Level rebuilds. _This closes "move a Level, the building follows" end to end._ | no (repoints nothing)                                     |
| `updateGrid`                    | name, axis, offset                  | ⚠ **offset ⇒ the 0b grid edge fires** — grid-hosted elements follow.                                                                                      | no                                                        |
| `updateMaterial`                | name, density, category, structural | **nothing** (geometry never depends on density; quantities recompute lazily)                                                                              | no                                                        |
| `updateSection`                 | name, shape, dimensions, standard   | ⚠ **the `sections` edge becomes REAL** — re-stage every element whose style uses it (§1).                                                                 | no                                                        |
| `updateStyle` (existing)        | +**the D51 layer-rename guard**     | instances (as today)                                                                                                                                      | ⚠⚠ **YES** — a layer rename orphans openings              |
| `updateConstraint` (new, cheap) | offset, target                      | re-stage the constraint's element (0b edge)                                                                                                               | guard if it repoints `target` to a missing datum (refuse) |

### 3.2 Deletes (each guarded — RESTRICT by default)

`deleteStyle` · `deleteMaterial` · `deleteSection` · `deleteContainer` · `deleteGrid`. Each: find referrers (§1 table), `guardReferences`, then emit the delete (+ any retargets) in one edit.

- **`deleteContainer`** also refuses if it has **child containers** (a Level with a Space under it) unless acknowledged/cascaded — same guard, referrer = children.
- **`deleteConstraint`** (built in 0b) needs no guard: nothing references a constraint.

### 3.3 Explicitly DEFERRED (not 0e)

- **`core.setPlacement` / `move` / `rotate` / `copy` / `array`** — the plan **reserves their shape in P4.5 step 5, driven by a pointing device** ("do not design `move` in the same phase that freezes it"). 0e does **not** invent them; it leaves that to P4.5. _(Flag for confirmation — see §7.)_

---

## 4. The dependency-graph change (`dependency.ts`)

One real change, one guard preserved:

```ts
case 'sections':
  // NO LONGER "nothing" (0a's note said: revisit when updateSection lands). A section is swept into a
  // LinearMember's profile, so a section change re-stages every element whose STYLE references it.
  return elementsUsingSection(scene, change.id);
case 'materials':
  // STILL "nothing" — geometry never depends on density; a density edit only re-computes quantities.
  return [];
```

`elementsUsingSection` = styles with `sectionId === id` → their instances (via the existing style→instance path). The exhaustive switch stays exhaustive; `materials` stays a _declared_ nothing.

---

## 5. Test plan

1. **⚠⚠ MOVE A LEVEL, THE BUILDING FOLLOWS — END TO END.** `updateContainer` changes L1's elevation; assert every element on it rebuilds at the new Z **on the geometry** (the criterion 0a's hole would have failed silently). The 0b test proved the datum path by rebinding; this proves it by _editing the number_, which is the real user action.
2. **MOVE A GRID, COLUMNS FOLLOW.** `updateGrid` changes an offset; grid-hosted member's placement follows.
3. **updateSection re-stages.** Change a section's dimensions; a member using it via its style rebuilds (⇒ the new `sections` edge). **Revert-verified** (neuter the edge ⇒ it fails).
4. **updateMaterial re-stages NOTHING geometric** but the quantity changes: edit density, geometry identical, `quantities()` mass updates.
5. **⚠⚠ THE D51 GUARD (the headline).** Rename a style layer that hosts an opening → **REFUSED**, the failure **names the opening**. Succeeds with `acknowledge` (the opening becomes a broken ref) or `retargetMap` (the opening's `hostRef` is rewritten and it still cuts). **Revert-verified** (drop the guard ⇒ the wall comes back with no hole, `brokenRefs` 0→1, exactly today's silent bug).
6. **Referential integrity, generalised (row ⓓ).** `deleteMaterial`/`deleteSection`/`deleteStyle`/`deleteContainer`/`deleteGrid` while referenced → **REFUSED**, naming the referrers; `retargetMap` reassigns then deletes; `acknowledge` proceeds (mass omitted / broken ref). `deleteContainer` with a child → refused.
7. **Atomicity + undo:** each guarded op is one `UndoableEdit`; undo restores the entity **and** every retarget it performed.
8. **Additive-principle evidence:** adding all of these required no edit to core scene-graph/undo/persistence code (D19), and each new verb appeared in `listCommands` for free (D21).

**Bar:** full suite green, `verify` clean, every new edge/guard revert-verified.

---

## 6. Freeze checklist

- New commands: `updateContainer` · `updateGrid` · `updateMaterial` · `updateSection` · `updateConstraint` · `deleteStyle` · `deleteMaterial` · `deleteSection` · `deleteContainer` · `deleteGrid` — each `argsSchema` freezes with `Command`.
- **The refuse-or-retarget arg shape** (`acknowledge?`, `retargetMap?`) on every guarded command — **the permanent part** (row ⓓ).
- `updateStyle` gains the D51 layer-rename guard (behaviour, not a new arg beyond the shared ones).
- `dependency.ts`: `sections` edge becomes real.
- A style layer's name is documented, in code, as **identity-bearing** (D51).

---

## 7. Decisions needing owner confirmation

1. **§2 — the refuse-or-retarget arg shape: `acknowledge?: boolean` + `retargetMap?: Record<string,string>`, RESTRICT by default.** This is the frozen shape (row ⓓ). Confirm — or prefer a single richer arg (e.g. `onBreak: 'refuse' | 'acknowledge' | { retarget: {…} }`)? _(I recommend the two flat args: they read cleanly in `listCommands` and are trivial for an agent to supply.)_
2. **§3.3 — defer `move`/`setPlacement` to P4.5 (as the plan says), building only CRUD here?** _(I recommend yes — the plan is explicit that `move` must be driven by a pointing device before it freezes.)_
3. **§3.1 — include `updateConstraint` now?** _(I recommend yes — cheap, completes constraint CRUD, and its target-repoint uses the same guard.)_
4. **Sanity check:** RESTRICT-by-default + explicit acknowledge/retarget (the DB-FK model) is the behaviour you want frozen for every destructive/repointing command?

Everything else (the command list, the `sections` edge, the taxonomy, the test plan) follows from D50/D51 and needs no new call — but I will not touch a freezing `argsSchema` until 1–4 are confirmed.
