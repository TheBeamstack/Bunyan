# P3 — CORRECTION PLAN

> # ✅✅ **FULLY EXECUTED — Entry 21, 2026-07-14. THIS DOCUMENT IS NOW HISTORY, NOT A WORK ORDER.**
>
> **All seven items landed. `pnpm verify` → 186/186, all five CI steps green on this box.**
> **⚠ Every one of the eleven fixes was verified by REVERTING it and watching its test fail** — the plan's
> own §3.1, discharged literally rather than assumed. **Both weak tests were rewritten, not supplemented.**
>
> **⚠⚠ AND THE REWRITE FOUND A NINTH GAP, WITH ONE PHASE TO SPARE.** The rule-4 test needed a Type that runs
> **two** kernel ops for one part (box → fillet) — **the first in this project's history.** It leaked four
> OCCT solids per rebuild: `BuildContext` gave a Type **no way to declare an intermediate**, and every
> fixture until then ran exactly one op per part, so the hole was invisible. ⇒ **`BuildContext.discard()` is
> new, and `BimObjectType` freezes at P5 — P5's real Wall/Slab/Opening will ALL run two or more ops.**
> _(The plan predicted this class of failure would "become reachable the moment a type's `buildGeometry`
> fails for SOME instances and not others". It was right, and reaching for it cost a contract fix.)_
>
> **What is left of P3: nothing.** The protocol is **FROZEN** (step 8). The next Zayd item is the **D29 cache**
> — see `current_state.md` §4j-2, and ⚠ **read it before writing a line: it is an IDENTITY task, not a
> serializer task.**

**What this was.** The work that had to land **before P3 could be declared closed**, derived from the P3 review
(`review_P3.md`, 2026-07-13) and the **seven owner rulings that closed it — D40–D46** (full text:
`V1.0.0_spec.md` §14). Every defect below was **produced by executing something**, not by reading; each
carries the reproduction that found it and the test that must exist so it cannot come back.

**⚠ THE DECISIONS ARE CLOSED. THIS IS EXECUTION.** _(2026-07-13, owner.)_

|         | Ruling                                                                                         | One line                                                                                       |
| ------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **D40** | The change feed is an **append-only JOURNAL**, not the undo stack                              | `seq` per edit · `issued_at_seq` per revision · never trimmed · an undo appends a **reversal** |
| **D41** | **`core.issueRevision` is a Command**                                                          | An actor that can author a building can release one (rule 9)                                   |
| **D42** | Rule 4 is **all-or-nothing by construction**, plus a **universal `dryRun`** on the executor    | Full fidelity, real kernel, result discarded. **`planDelete()` is DELETED**                    |
| **D43** | An unknown **or future** type/schema → **open, mark `failed`, PRESERVE VERBATIM through save** | A round-trip must be lossless for a file we only partly understand                             |
| **D44** | The PEI is a **prefixed ULID** — `wall-01J8Z3K7Q2`                                             | Kills id-reuse **by construction**; a counter would foreclose co-editing (rule 8)              |
| **D45** | **`discipline` lives on the PART**; `Classification` = `{ifcClass, loadBearing}`               | A void has none · Miqdar filters on `loadBearing` · the Clean Delta carries it **per part**    |
| **D46** | **One physical thing = one element, one PEI** (superposition rules **provisional**)            | Structural wins a collision; MEP never collides                                                |

**Scope boundary.** ⚠ **Nothing here touches the kernel or the message protocol.** Every defect is in the
**document layer**. ⇒ **The P3 protocol freeze (plan step 8) is NOT blocked by any of it**, and may run in
parallel. What _is_ blocked is **declaring P3 closed** — because almost all of it lives inside
`scene.json`, `UndoableEdit`, `Command` and `BimObjectType`, which **freeze at P5**, and after that every
item becomes a contract amendment plus a migration.

**The rule this plan is written under (and the one P2 broke twice):**

> **A phase's exit criteria are a SPECIFICATION, not a summary of what got done — and a green test proves
> only what it ASSERTS.** Two of the defects below exist because a green, well-named test asserts
> something _weaker than its own title_. **Those tests are rewritten as first-class work items**, not as
> tidying. A fix without a test that fails in its absence is an assertion, and this project has watched
> assertions pass for a month.

---

## 1. THE WORK, in execution order

> Each item: **the defect · the reproduction · the fix · the test that must exist.**
> ⚠ **"The test that must exist" is the deliverable, not the fix.**

### [1] D44 — the PEI becomes a prefixed ULID _(do this first: it is the smallest, and everything else stores ids)_

- **Defect.** `#idCounter` is rebuilt on load by `highestSuffix()` (`document.ts:80, 363-370`), which scans
  **surviving** element ids. **Reproduced:** create `wall-1..3` → delete `wall-3` → save → reload → create
  → **the new element is minted `wall-3`.** A dead PEI is handed to a different building element, and
  Planitor's progress records and Miqdar's analytical model both bind to it. Rule 13: _"not a refactor; a
  breaking change to three other products."_
- **Fix.** `mintId(prefix)` → `` `${prefix}-${ulid()}` ``. **Delete `highestSuffix()` and the counter
  entirely** — there is nothing to persist and nothing to rebuild. _(No dependency: a 40-line ULID is
  fine, and it must be **monotonic within a millisecond** so two ids minted in one tick cannot collide.)_
- **Test.** The reproduction, asserting the new id ≠ the dead one. Plus: 10 000 ids minted in a tight loop
  are all distinct; and an id survives save → load → re-issue unchanged.

### [2] D40 + D41 — the journal, and `core.issueRevision` _(the headline; blocks the Clean Delta)_

- **Defect.** The Clean Delta **cannot be computed from a `.bnn`**. `ModelRevision` has **no pointer into
  the log**; no `UndoableEdit` carries a revision/seq/timestamp; the log **is** the undo stack (**200-deep**,
  `shift()`ed — _250 edits pushed, the first 50 gone_), and **`undo()` pops entries out of it**;
  `DocumentContext` **does not know its own revision**. ⇒ A P6 producer would have to **diff two models** —
  the guessing BIMsync exists to do for foreign models and that D34 says Bunyan never does.
  **Root cause: the spec contradicted itself** (§6.1 called `history.json` _"optional, session continuity
  only"_ while §7a leaned the moat on it), **and Entry 18 built the wrong half.** Both halves are now fixed
  in the docs.
- **Fix.**
  - `UndoableEdit` gains **`seq`** (monotonic, document-scoped, never reused).
  - `ModelRevision` gains **`issued_at_seq`**.
  - `DocumentContext` owns **`#journal`** (append-only) **and** `#revision`, both separate from `UndoStack`.
    `history()` keeps returning the **undo stack**; a **new `changeFeed()`** returns the **journal**.
    ⚠ **Do not overload `history()`** — the two have different lifetimes, and conflating them is exactly
    how this bug happened.
  - **`undo()` appends a REVERSAL edit to the journal**, never erases.
  - **`core.issueRevision`** joins `CORE_COMMANDS` (D41); `saveBnn`/`loadBnn` persist and restore the
    journal + `nextSeq` + the current revision.
- **Test.** Issue rev1 → **250+ edits including an undo** → issue rev2 → save → reload →
  `changeFeed()` since `rev1.issued_at_seq` returns **exactly** the edits after rev1, undo included as a
  reversal, **nothing dropped**. Plus: an agent can `execute('core.issueRevision', …)` through
  `window.bunyan` alone. **Every step of this fails today.**
- ⚠ **Honest caveat to record, not solve:** `seq` is document-scoped, which is right for single-user
  v1.0.0. **Co-editing will need a merge-ordered journal** (Lamport/vector clock, or a CRDT). Not solved,
  **not foreclosed** — `seq` is a field, and the PEIs are already globally unique (D44).

### [3] D42 — the transactional rebuild, and the universal `dryRun`

- **Defect.** "Reject + keep last-good" is true of the **scene** and **false of the geometry**. `#rebuild`
  (`document.ts:299-346`) commits each root as it succeeds and **frees the previous solids**; if a later
  root fails, `execute` restores `this.#scene = before` (`document.ts:141-149`) but the committed geometry
  is **not** restored and its old handles are already released.
  **Reproduced (real OCCT):** two walls on one style; a style edit wall B refuses. The command throws, the
  scene rolls back correctly (`thickness 200 → 200`) — and wall A's solid is the one built at the
  **rejected** thickness: **`volume 1.5e9 → 3.0e9`**. `quantities()` then reports **double the true volume
  of an element the user never edited**, with **`basis: 'exact'`**.
  ⚠ `document.ts:15-19` claims this is _"true **by construction** rather than by discipline."_ It is not.
- **Fix.**
  - **Stage the rebuild.** Build every root into a staging map; on any failure, discard the staged results,
    release **only** the staged intermediates, and leave `#geometryByElement` and the live handles
    **untouched**. Commit — and release the superseded handles — only on full success.
  - Same discipline for **`undo()`/`redo()`**, which today have **no try/catch at all**
    (`document.ts:155-169`).
  - **`execute(id, args, { dryRun: true })`** — on the **executor's options**, never on the `Command`
    contract (commands stay passive and know nothing of transactional state). It runs the **real** path,
    with the **real** kernel, against the staged state, then **discards everything** and returns the
    `UndoableEdit` it _would_ have produced — or the typed failure **naming the offender**. It emits **no**
    edit, touches **no** journal, and leaks **no** handle.
  - **DELETE `planDelete()`** (`document.ts:191-209`) and its agent-surface binding
    (`agent.ts:80, 158`). Its answer is now `execute('core.deleteElement', args, { dryRun: true })`, whose
    would-be edit **already lists the cascade**. _A hand-written `plan…()` beside every verb is a second
    description of one behaviour — D21: **generated, never maintained**._
- **⚠ Test — THE REAL DELIVERABLE.** The existing rule-4 test (`document-openings.test.ts:298`) uses
  `params: { length: -1 }`, which the **schema** rejects _inside the command, before the kernel is ever
  called_ — **so the geometry-failure path, the one the rule is about, is never exercised.** **Rewrite it:**
  a **multi-element** edit in which **the kernel refuses**, asserting that every sibling's geometry,
  quantities **and live-handle count** are unchanged. Plus: a `dryRun` of the same edit returns the failure
  and leaves the document **bit-for-bit identical** (scene, geometry, journal, handles); a `dryRun` of a
  _valid_ edit returns an `UndoableEdit` that is **never applied**.
- **Reachability, honestly.** Not triggerable with today's fixture types (they fail only when a style has
  no layers — which fails _every_ instance, and an all-fail happens to be safe). It becomes reachable the
  moment a type's `buildGeometry` fails for **some** instances and not others — which the spec calls normal
  (§6.4, `core_logic.md` §7: _"fillet radius too large, open/self-intersecting profile, empty boolean"_) and
  which **P5's real Wall/Slab/Opening will do.** **Fix it before P5, or it ships as _"sometimes the model on
  screen doesn't match the file."_**

### [4] D45 — discipline moves to the Part

- **Defect.** `Classification.discipline` is a single value on the **element** — so an RC wall with plaster
  must be _entirely_ structural or _entirely_ architectural. ⇒ **Miqdar cannot ask which PART is
  structural** (though `core_logic.md` §3.3a says it idealizes exactly that), and **Planitor cannot route
  the concreter and the plasterer to different work packages on one wall** (though §4i claims _"a task binds
  to the part it actually builds"_). **Two already-written ecosystem claims are false as built.**
- **Fix.**
  - `StyleLayer` gains **`discipline`** (required); `BuiltPart` and `Part` gain **`discipline`** (required).
  - `BimObjectType` gains **`defaultDiscipline`** — the stamp for parts built with **no style**. **Never
    inferred from the material** (a concrete screed is not structural; a timber shear wall is).
  - **`Classification` becomes `{ifcClass, loadBearing}`** — `discipline` is **removed**, and
    `core.setClassification`'s `discipline` arg with it. **No derived element-level value either** (a lossy
    summary of data already in the payload is a thing someone will one day route off).
  - The agent surface's `query({ discipline })` becomes **part-scoped**: an element matches iff **≥1 of its
    parts** does, and the `ElementView`'s parts each report their own.
  - **An Opening has no parts ⇒ no discipline.** Nothing to do but _not_ require one.
- **Test.** A 3-layer wall: `structure` is structural, `finish.interior` is architectural, in **one
  element**. `query({discipline:'architectural'})` returns the wall **through its finish part only**, and
  never through its RC core. A LinearMember with no style takes its Type's `defaultDiscipline`. And an
  Opening carries none.

### [5] D43 — an unknown or future type must not brick the file

- **Defect.** `buildAssembly` returns `state: 'failed'` for a type with no `buildGeometry`
  (`build.ts:119-132`); `#rebuild` **throws** on any failed root (`document.ts:330-334`). **Reproduced:**
  save a wall + a column, reopen without the LinearMember type → **`rebuildAll()` throws** and the document
  is half-loaded and unusable. **And the mirror:** `migrateScene` (`bnn.ts:206-225`) only migrates
  **forward** (`typeVersion < type.version`), so an element authored against **Wall v3 opened by an app with
  Wall v2 is silently BUILT against v2's schema** — a wrong building rather than a refused one.
- **Fix.** A failed root marks the element `failed`, is surfaced beside `brokenRefs`, and **the document
  loads and edits**. Only a **command's own** root failing rejects that command (D42). `typeVersion >
type.version` ⇒ `failed`, never built. A `scene.json` `schemaVersion` from the future ⇒ a typed refusal
  naming the version. **And in every case the element round-trips through save UNTOUCHED.**
- **⚠ Test.** Save → reload with a type missing → **the document opens**, the wall builds, the column is
  `failed` and visible, an edit to the wall still works — **and a save round-trips the unknown element
  byte-for-byte.** _(Drop it and you have deleted Miqdar's columns and their PEIs. That test is the whole
  point of the ruling.)_ Same for a future `typeVersion`.

### [6] Autosave must not recover a stale snapshot

- **Defect.** `Autosave.#counter` starts at **0 in every new session** (`bnn.ts:272-288`). **Reproduced:**
  session 1 writes `autosave-1..3`; **crash**; session 2 constructs a fresh `Autosave` over the same store,
  edits (`length: 9999`), snapshots → it writes **`autosave-1.bnn`** (overwriting session 1's oldest), and
  `latest()` (highest counter) returns session 1's **`autosave-3`**. **Recovered `length` = 1300, not 9999.** The second crash silently restores **old work**, and the newest snapshot is unreachable. **Data
  loss, in the feature whose only purpose is preventing data loss.**
- **⚠ Why the suite cannot see it.** `document-persistence.test.ts:259-288` calls `latest()` on **the same
  `Autosave` instance** that wrote the snapshots. **It never constructs a fresh one over an existing store —
  which is the only situation autosave exists for.**
- **Fix.** Seed the counter from `store.list()` on construction (or key snapshots by timestamp + `seq`).
  Prune by the same order `latest()` reads.
- **Test.** **A second `Autosave` over a populated store** — `latest()` returns the newest snapshot; the
  ring prunes the oldest; three simulated sessions in a row each recover their own work.

### [7] The validation gaps

|     | Defect                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Fix                                                                                                                                                                                                                                                                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| a   | **A quantity that is `exact` and wrong.** `mass: volume * (material?.density ?? 0)` (`document.ts:233`) → an unresolvable material yields **0 kg, `basis: 'exact'`**. And **`createStyle` does not validate materials though `updateStyle` does** (`commands.ts:549-569` vs `:348-352`). _Reproduced: `{volume: 1.5e9, mass: 0, basis: "exact"}`._                                                                                                                                                                                      | **D45:** `createStyle` validates materials; and `quantities()` **omits `mass` entirely** (it becomes optional in the payload) when the density is unresolvable — reporting the volume and area, which **are** exact. **A missing density is an unknown, not a nought.** A `.bnn` is a file you can be _sent_, so the command-layer check alone is not enough. |
| b   | **Duplicate part names mint COLLIDING `SubShapeRef`s.** `partNodeId(id,name)` = `` `${id}.${name}` `` (`geometry.ts:55`) and nothing enforces unique layer names. _Reproduced: two layers named `structure` → **6 byte-identical ref tokens naming different faces of different solids**._ ⚠ Note the existing guard is on the **safe** path: `checkIdSafe()` rejects `/` and `#` in a **minted** id — which can never contain them — while the strings that actually reach a `nodeId` (**layer names, agent-authored**) are unchecked. | Refuse duplicate layer names in `createStyle`/`updateStyle`; assert `nodeId` uniqueness within an element in `buildAssembly` and **fail loudly** (`core_logic.md` §5: _an identity that cannot be derived structurally is a refusal, never an invention_).                                                                                                    |
| c   | **A mistyped `containerId` silently puts a wall on the ground floor.** `createElement` validates `styleId`/`hostId` but **not** `containerId`/`gridRefs` (`commands.ts:214-233`); `elevationOf()` returns **0** for an unknown container. _Reproduced: z-min **9000** vs **0**._ ⚠ `containerId` **is the LBS address** (D35) — a typo is a wrong building _and_ a wrong work package.                                                                                                                                                  | Validate the refs like the others.                                                                                                                                                                                                                                                                                                                            |
| d   | **`loadBnn`'s hostile guard is wrong:** `typeof scene[key] !== 'object'` (`bnn.ts:149-159`) — and **`typeof null === 'object'`**. A `.bnn` with `"elements": null` sails past the guard written to catch it and dies as a raw `TypeError`. The file's own comment claims _"all of them fail with a message."_ The hostile test only covers garbage bytes and a truncated zip.                                                                                                                                                           | Reject non-plain-objects. **Extend the hostile-`.bnn` test to well-formed zips with hostile JSON:** null collections, an element with no `classification`, a forged `hostRef`, a future `schemaVersion`.                                                                                                                                                      |
| e   | **`execute` rebuilds `edit.rebuilt`; `undo` rebuilds `#touched(changes)`** (`document.ts:140` vs `159`) — two answers to one question. Undoing a `createMaterial` rebuilds **every element in the document** (`document.ts:282-285`): ~7.3 s on the 195-element building, for an edit that changed no geometry.                                                                                                                                                                                                                         | One derivation, used by both.                                                                                                                                                                                                                                                                                                                                 |
| f   | **Six registries, not seven** (`registries.ts:111-120`) — plan P3 step 2's _"Persistent Naming resolver binding"_ is a comment.                                                                                                                                                                                                                                                                                                                                                                                                         | Either register it or **stop saying seven** (four places say it). Docs, not code.                                                                                                                                                                                                                                                                             |
| g   | `undo.ts:47-49` claims undo _"participates in the same edit-coalescing budget"_; `undo()` passes **no** `coalesceKey`.                                                                                                                                                                                                                                                                                                                                                                                                                  | Comment vs code. The code is right; fix the comment.                                                                                                                                                                                                                                                                                                          |

---

## 2. DOCS — ✅ ALREADY DONE IN THIS PASS

All contract docs now describe the rulings, so **the code is what is behind, not the docs**:

- **`core_logic.md`** — §2 (no token map) · §3.3 (`classification` = `{ifcClass, loadBearing}`) · §3.3a
  (Part carries `discipline`; part names unique) · §3.4 (`defaultDiscipline`; migration is forward-only) ·
  §3.4a (the layer authors `discipline`) · §3.6 (**a void has no discipline**) · **§3.12a (THE JOURNAL —
  new)** · §3.15 (`issued_at_seq`; the delta is per-part) · §4 (**the PEI is a prefixed ULID**) · §7
  (**the unbuildable element**; reject-means-the-whole-edit; `dryRun`) · §6 (Part → Discipline) ·
  **domain rules 9, 14, 15 amended and rule 16 added** (one thing = one element; the provisional
  superposition rules, with the open MEP-clash question named).
- **`V1.0.0_spec.md`** — §4.5 (**the token-map claim deleted**, with the kernel-less-consumer question
  recorded as deferred) · §5 (the D45 box) · §6 (the `.bnn` layout: ULID, `issued_at_seq`, the journal) ·
  **§6.1 (the two-structures box — the contradiction that caused all this)** · §7a (the Clean Delta:
  journal + per-part discipline + no zeroed mass) · **§14: D40–D46**.
- **`architecture.md`** — the token map (4 places) · the `.bnn` layout and the save path · the untrusted-recipe
  rule (`typeof null`, and D43's preserve-verbatim).
- **`v1.0.0_imp_plan.md`** — P3's status and its exit criteria (strengthened so a weaker test cannot
  discharge them).
- **`current_state.md`** — §1, §2, §4k, §5, Entry 19.

⚠ **Still owed in the docs, and it is P6's:** `v1.0.0_imp_plan.md` P6 must record that **the IFC importer
registers a Type per IFC class** (`IfcDuctSegment` → MEP, `IfcCovering` → architectural) rather than
dumping every entity into one `GenericSolid` — otherwise a consultant's file arrives as one undifferentiated
discipline and **D45's per-part routing is dead on the import path.** _(Reserved by D45's ruling; the work
is P6.)_

---

## 3. DONE MEANS

1. Every item in §1 has a test **that fails if the fix is reverted** — verified by reverting it, not by
   assuming it.
2. **The two weak tests are REWRITTEN, not supplemented** (rule 4 must fail _in the kernel_, on a
   _multi-element_ edit; autosave must _open a second session_).
3. `pnpm verify` green — **all five CI steps, on this box** (typecheck · eslint · tests · prettier).
4. `current_state.md` records what was fixed **and how it was verified**: _a claim without a verification
   method is not done._
5. **Then, and only then:** P3 step 8 — freeze the protocol — and close P3.

**And the thing this plan does NOT discharge:** §5's standing advice — _"keep modelling real buildings with
the API."_ The review drove the document API at its **failure boundaries**, which is a **different hunt**
finding a **different class**. **A stair, a roof, two walls that meet, a duct through a beam** remain uncut,
and that method has found **eight** gaps and is the only one that ever has.
