# P5 step 6D — THE DESIGN-OPTIONS CRUD, and whether `scene.designOptions` is promoted (Q17, D65 row Ⓕ)

**Zayd · 2026-08-06 · design-first, per `Zayd_Prompt.md`'s standing constraint.** Q17 is
**contract-touching**, so the owner merges whatever is built from this. **This document is the
deliverable; nothing in this unit is built until the owner rules §7.**

> **The question as filed (Q17):** _"`designOptionIds` can be authored only on a document whose design
> options arrived by some OTHER road — do we promote `designOptions` to a `SceneCollection` and give it a
> CRUD?"_ Filed by Entry 78's review of Entry 77 §3c; pre-existing since Entry 68.

---

## 0. What this document adds to the question

Three things, all measured rather than argued:

1. **The gap is not "two doors disagree." It is a 50.0% silent under-report on a document any user can
   build today, with `basis: 'exact'` on it and every diagnostic empty.** §1.
2. **The Q17 row's own description of the defect is wrong against the code** — `checkDesignOptions` is
   _not_ shared by `core.createView`; the view path is a second, independent implementation of the same
   rule in a different file, with a different failure code. §2.
3. **"Is the promotion additive?" has two different answers and the question conflates them.** It is
   **data-additive** (D79's trick works verbatim — no `SCENE_SCHEMA_VERSION` bump, existing `.bnn` files
   stay byte-identical) and it is **NOT freeze-additive** (`type SceneCollection` is a watched
   declaration; widening it moves the frozen surface, measured). Entry 77 already paid this exact price
   for `views`. §3.

---

## 1. The gap, MEASURED — driven through the shipped verbs, not quoted

Method: a `DocumentContext` with the fixture types and `CORE_COMMANDS`, real OCCT kernel, built entirely
by commands — i.e. exactly what a user or an agent can reach. One material, one level, one style, and
then the three doors, all naming the **same** option id `opt-b`.

### 1.1 No verb can author a design option — counted, not assumed

```
VERBS: 40
VERBS matching /option/i: []
scene.designOptions BEFORE: undefined
```

**0 of 40 registered commands can create, rename or delete a design option.** `scene.designOptions` is
therefore `undefined` on every document a command ever produced, and — this is the part that makes the
rest follow — **it is `undefined` for the checks too.**

### 1.2 The two artifact doors REFUSE, and they refuse by two different mechanisms

```
DOOR A1  core.createSchedule  →  NOT_FOUND : unknown design option "opt-b"
DOOR A2  core.createView      →  REFUSED   : this view descriptor would not draw correctly …
```

Both correct on their own terms, and neither reachable in the affirmative: since §1.1 makes
`scene.designOptions` permanently absent, **`designOptionIds` is unauthorable on both artifacts through
the verbs.** That is Q17's original observation and it holds.

### 1.3 The element door ACCEPTS the same id — and this is where it stops being a symmetry complaint

```
DOOR B   core.createElement { designOptionId: 'opt-b' }  →  ACCEPTED
         id = wall-01KZB6F411EBDTAYGJABZNK90K
```

`core.createElement` validates the shape and deliberately not the reference. Its comment says why:

> _"Shape-validated only: v1.0.0 has no `scene.systems`/`designOptions` CRUD to check an id against, and
> inventing referential validation against collections nothing can author yet would refuse every
> legitimate call."_

**The reasoning is sound and its conclusion is the defect**, because of what the accepted element then
does.

### 1.4 ⚠⚠ THE CONSEQUENCE — 1 row where 2 walls exist, 50.0% of the volume gone, `basis: 'exact'`

Two identical 6000 × 3000 × 200 blockwork walls. One carries `designOptionId: 'opt-b'`; the other carries
nothing. Nothing else differs.

| asked                                        | answer                                                      | correct           |
| -------------------------------------------- | ----------------------------------------------------------- | ----------------- |
| `scene.elements`                             | **2**                                                       | 2                 |
| `doc.quantities(tagged)`                     | `volume 3 600 000 000 mm³ · mass 6 480 kg · basis: 'exact'` | —                 |
| `doc.modelElements()`                        | **1**                                                       | 2                 |
| schedule (`{}` filter, volume column) — rows | **1**                                                       | 2                 |
| schedule — `quantity:volume` total           | **3 600 000 000 mm³**                                       | 7 200 000 000 mm³ |
| `schedule.basis`                             | `'exact'`                                                   | —                 |
| `schedule.unmeasured`                        | `[]`                                                        | —                 |
| `doc.brokenRefs()`                           | `[]`                                                        | —                 |
| `doc.unbuildable()`                          | `[]`                                                        | —                 |

**A wall that builds real geometry, that `quantities()` measures as `exact`, is silently absent from every
enumerating consumer — and no diagnostic in the document records that it happened.**

The mechanism is not a bug in any one file; every step is behaving as written.
`enumerate.ts` applies the D65/D67 invariant through `isElementActive`, which reads:

```ts
// ⚠ An element naming an option the document does not define is a BROKEN REFERENCE, not a licence to
// include it: including it would double-count. Excluded, and a future body surfaces it (domain rule 3).
if (option === undefined) return false;
```

That is the right rule. **The "future body surfaces it" half was never built**, and `core.createElement`
is the door that makes the unsurfaced case reachable.

### 1.5 Why this is D65's own stated failure mode, arriving inverted

D65 froze the exclusion invariant into the contract to stop a schedule **double-counting** an optioned
element — _"a wrong number wearing the `basis: 'exact'` badge, which is domain rule 15's exact failure
mode reached by a new road."_ What actually ships is the **mirror image**: not 2.0000× over, but
**0.5000× under**, on a document with **no design options at all**, produced by the one door D65's own
reservation left open. Same badge, same rule 15, opposite sign.

⚠ And note the base rate this fits: `current_state.md` §1c-8's ledger — **a new rule binds the next
consumer and nothing else.** D65 (07-23) wrote the rule; `core.createElement`'s reserved args landed
07-24 under row Ⓕ; nobody swept the authoring door against the consumer rule, because they were written
three days apart by the same reservation.

---

## 2. ⚠ THE Q17 ROW IS WRONG ABOUT THE CODE — there is no shared check

`open_rulings.md` Q17 reads: _"`checkDesignOptions` (shared by `core.createSchedule` and now
`core.createView`)."_ Read against the code:

| door                                          | where the check lives                                 | failure                                           |
| --------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------- |
| `core.createSchedule` / `core.updateSchedule` | `checkDesignOptions()` in `commands.ts`               | `NOT_FOUND`, one id at a time, stops at the first |
| `core.createView` / `core.updateView`         | `validateViewDescriptor()` in `view.ts`, its own loop | `REFUSED`, all issues collected                   |
| `core.createElement`                          | —                                                     | accepts                                           |

**Two independent implementations of one rule, in two files, with two failure codes** — domain rule 10's
_"one description, never two"_, and the exact shape `optionScopeOf()` was extracted to stop one level
down (D68: _"the RULE was shared while the SCOPE THE RULE IS EVALUATED AGAINST was not"_). It is a third
door, not a second copy of the first.

⇒ Whatever §7 rules, the unit collapses these to one check with one failure shape. That part is not a
question.

---

## 3. IS THE PROMOTION ADDITIVE? — measured, and the answer is "in one sense yes, in the other no"

`Zayd_Prompt.md` set this as the finding worth having: _"if the same trick works here, the promotion may
be additive after all."_ It works, and it does not make the promotion additive, because the word carries
two meanings in this repo and they part company here.

### 3.1 Data-additive: YES — D79's trick transfers verbatim

`schedules` (Entry 68/D79) and `views` (Entry 77/D81) were both promoted **without an `emptyScene()`
entry**: the collection materialises on first authoring inside `applyOne`, whose `?? {}` already handles
creating into an absent collection. `designOptions` is already an optional, absent-defaulted, top-level
`Record`, sitting beside them for exactly this reason (`scene.ts`'s row Ⓕ comment says so). So:

- **no `SCENE_SCHEMA_VERSION` bump** — it folds into frozen v2, like every row Ⓕ reservation;
- **a document with no design options stays byte-identical** — no new key in any `.bnn`;
- the hostile-`.bnn` guard takes the optional-collection shape D79 already established (absent legal,
  present-and-not-an-object refused).

### 3.2 Freeze-additive: NO — `type SceneCollection` is a watched declaration

Measured. Adding `| 'designOptions'` to the union and running the gate:

```
× the frozen surface > has not moved since the baseline — any diff means RISK: contract-touching
+   packages/document/src/scene.ts :: type SceneCollection
```

**One declaration, named exactly.** `tests/frozen-surface.snapshot.json` watches 21 declarations in
`scene.ts`, `type SceneCollection` among them, so widening it is `RISK: contract-touching` **by
construction** — and `pnpm state` routes the merge to the owner. Entry 77 paid this same price promoting
`views` and its PR was owner-merged.

⇒ **Q17's "is it additive?" cannot be answered "yes" without saying which additive.** The `.bnn` in the
field is safe; the freeze boundary is not, and the freeze boundary is what decides who merges.

### 3.3 And the compiler names the rest of the work, which is the designed mechanism

With the union widened, `pnpm typecheck` gives exactly one error:

```
packages/document/src/dependency.ts(177,26):
  error TS2345: Argument of type '"designOptions"' is not assignable to parameter of type 'never'.
```

The exhaustive switch refuses to compile until the rebuild edge is declared (Entry 33's mechanism, and
the same single error Entry 68 and Entry 77 each hit). **One site, and the edge it wants is the
interesting one — see §4.3.**

---

## 4. The shape, if §7 rules for the promotion

### 4.1 Three verbs, ordinary additive registrations (domain rule 5)

`core.createDesignOption` · `core.updateDesignOption` · `core.deleteDesignOption` — the
`createSchedule`/`createView` template exactly. Ids **minted** (D44): an option has a name the user owns
and no natural key, so a caller-chosen id re-opens id reuse.

### 4.2 The refusals the verbs must carry — _"the verbs carry the refusal the body deliberately will not"_ (D79)

`designoptions.ts` already states two authoring rules as prose that nothing enforces, and D79's sentence
says the authoring door is where they belong:

1. **Exactly one `isPrimary` per `setName`.** The file already calls a set with none, or two, _"an
   AUTHORING DEFECT the future CRUD must refuse … not something a consumer should paper over by picking
   one"_ — and `ownTagActive` papers over it today by taking whichever option the record iteration
   reaches. The `StyleLayer.name` uniqueness discipline, one level up.
2. **Delete is a D51 refuse-or-retarget**, and it has at least three referrer classes:
   `Element.designOptionId`, `ViewCommon.designOptionIds`, `ScheduleDefinition.designOptionIds`. ⚠ Unlike
   D79's sheet case, **every one of these collections IS writable**, so the full D51 ladder is available:
   `redirect` is real here and the `Referrer.redirect?` optionality D79 introduced is not needed.

### 4.3 The dependency edge — and it is NOT the "nothing" that `schedules`/`views` declared

`schedules` and `views` each declared a deliberate **nothing**, on one argument: a projection reads the
model and the model does not read the projection. **That argument does not transfer.** An element's
`designOptionId` is read by the _room solver_ and the _join resolver_ (D68) — `assembleRoomInput` and
`partnersAt` both take an option selection — so changing which option is primary, or deleting an option,
**changes which walls are visible to the miter resolver**, which changes a built B-Rep.

⚠ D68 is the worked evidence and it is the vicious case: the **ambiguity flip**, where an option change
pushes a corner's partner count 1→2 and _"a correctly-mitered main-model corner silently loses its
miter."_ Declaring `'designOptions'` as a "nothing" would reproduce D68 from the authoring side.

⇒ **The edge is real and it must be stated in the unit, not discovered later.** The conservative,
D73-consistent form: an edit to a design option re-stages every element whose option membership could
change under it — at minimum every element tagged into that option's **set**, plus (D67) everything
hosted on or parented to one. ⚠ Over-naming costs a rebuild; under-naming leaves a stale solid — the
`wallsJoinedTo` argument, and it points the same way here.

### 4.4 The check collapses to one (§2)

One `checkDesignOptions(scene, ids)` used by the schedule door, the view door **and** the element door,
with one failure shape. `view.ts`'s loop calls it instead of re-implementing it.

---

## 5. The test plan, and what would let each test pass while its own title is FALSE

| #   | criterion                                                                                  | the weak green it must not have                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | the three verbs create/rename/delete an option, and `applyOne` materialises the collection | asserting only the create — the **absent-collection first create** is where D79's `?? {}` earns its keep, so assert against a document that has never had one                    |
| 2   | **a document with no options is byte-identical** to one written before the unit            | comparing parsed objects; compare **serialised bytes**, or an added empty `{}` passes                                                                                            |
| 3   | undo/redo of each verb                                                                     | asserting the scene only — assert the **journal** entry too, or a verb that edits without minting an `UndoableEdit` passes                                                       |
| 4   | a set with two primaries, or none, is REFUSED                                              | testing only the two-primaries half; **both** directions, or a check that refuses everything passes                                                                              |
| 5   | delete refuses while an element/view/schedule references it, and `redirect` retargets      | testing one referrer class; **count the classes** (§4.2 says three) rather than reading one                                                                                      |
| 6   | **§1.4 reproduced and closed**: 2 walls in, 2 rows out, 7 200 000 000 mm³                  | asserting the row count only — assert the **total**, since a row with a null cell would restore the count and not the number                                                     |
| 7   | the dependency edge re-stages the right elements (§4.3)                                    | asserting that _something_ re-staged; assert **which**, and assert that an unrelated element did **not**                                                                         |
| 8   | one check, three doors (§2)                                                                | a source-grep for `checkDesignOptions(` in all three files — ⚠ **that is a proxy for execution** (Entry 81's lesson): drive all three verbs and assert the **same failure code** |

⚠ Criterion 6 is the one the unit exists for, and criterion 2 is the one that keeps it additive.

---

## 6. What is NOT in this unit

- **The option-aware UI.** Nothing here is browser work; Amer's layer is untouched.
- **`optionSets` as its own collection.** `designoptions.ts` argues the set is a name, not a second
  collection, and §4.2's primary rule is what a set needs. An `optionSets?` collection remains an
  additive reservation over this if sets later need properties.
- **`ActiveOptions` persistence.** A selection is _a question asked of the model, not a property of it_
  (`designoptions.ts`) — that stays true and nothing here stores one.
- **Phase filters / area schemes.** D65 already settled that they need nothing.

---

## 7. Open questions for the owner

Filed into `open_rulings.md` as **Q17a–Q17c**, each with a recommendation. **Nothing is built until these
are ruled**, because the first one decides whether the unit exists at all.

### Q17a — Promote `designOptions` to a `SceneCollection` and ship the CRUD?

**Recommendation: yes.** It is data-additive (§3.1), the compiler names the whole remaining surface
(§3.3), and it is the third instance of a promotion this repo has now done twice on identical terms.
⚠ **It is `RISK: contract-touching` (§3.2) and the owner merges it** — that is the cost, and it is the
same cost Entry 77 paid.

### Q17b — Until Q17a lands, which way does the asymmetry close?

The Q17 row says the defect is that the doors **disagree**, not which policy is right, and §1.4 says the
disagreement is not cosmetic. Two directions, and **I am not choosing**:

- **Close it SHUT** — `core.createElement` refuses a `designOptionId` naming no option. Loud, one line,
  and it makes `designOptionId` unauthorable, matching the other two doors. ⚠ It also makes the reserved
  arg dead until Q17a lands, which is what row Ⓕ reserved it to avoid.
- **Close it OPEN** — the artifact doors accept an unresolvable id. ⚠ **Recommended against:** it
  reintroduces _"a drawing that claims to be Option B and is Option A"_ (`view.ts`'s own comment) and
  §1.4 is what accepting looks like.

### Q17c — ⚠ Should a dangling `designOptionId` be a BROKEN REFERENCE **now**, regardless of Q17a/Q17b?

**Recommendation: yes, and it is the one piece that is additive and direction-neutral.** `isElementActive`
already calls it _"a BROKEN REFERENCE … a future body surfaces it (domain rule 3)"_ — this is that body.
It refuses nothing and permits nothing; it only stops §1.4 from being **silent**, which is the whole of
what makes §1.4 dangerous. It is Entry 80's review finding in a new place: the document accepted a
reference it could not resolve and landed it in a state where `brokenRefs()` and `unbuildable()` both came
back empty.

⚠ **Ruled here rather than built** because it interacts with Q17b: if the door refuses, this path is
unreachable through the verbs (though still reachable through a hand-assembled `Scene` or a `.bnn`, which
is D43's population and is why I would still want it).

---

## 8. Status

**DESIGN ONLY — nothing built, no frozen byte moved, no verb registered.** `pnpm verify` green on this
branch with docs only. The measurements in §1 and §3 were taken with a scratch harness and a temporary
one-line edit to `scene.ts`, both removed; the tree is clean.
