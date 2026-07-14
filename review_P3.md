# REVIEW — Phase 3 (the document model) and what precedes it

**Reviewer session, 2026-07-13, dev box (Zayd's box), headless, real OCCT 7.9.3 WASM.**
Baseline confirmed before and after: `169/169` green, all five CI steps. Every finding below was produced
by **executing something**, not by reading. Probes were written in `tests/`, run, and **deleted** — the
tree is byte-identical to how I found it.

---

## THE HEADLINE

> **The Clean Delta cannot be computed from a `.bnn`. The ecosystem's change feed is the undo stack —
> capped at 200 edits, mutated by undo, and with no anchor to a Model Revision. So the one question the
> whole ecosystem exists to answer — _"what changed since revision N?"_ — has no answer in the file.**

D34 and domain rule 14 stake the moat on this sentence: _"`change_type` is **READ** off the
`UndoableEdit` log, never inferred by diffing two models."_ That is the property BIMsync is an entire
platform built to _manufacture_ for foreign models, and the reason `current_state.md` §4i says the
confusing-change resolution queue is _"EMPTY, ALWAYS, BY CONSTRUCTION."_

It is not, by construction. Measured:

- `ModelRevision` = `{snapshot_number, previous_snapshot_number, lineage, issued_at, issued_by}` —
  **no pointer into the log.**
- `UndoableEdit` = `{id, command, label, changes, rebuilt}` — **no revision, no sequence, no timestamp.**
- `UndoStack` keeps **200** edits and `shift()`s the oldest (`undo.ts:56-63`).
- `undo()` **pops** an edit out of `history()` (`undo.ts:69-73`).
- `DocumentContext` **does not know its own revision at all** — `revision` exists only as a field the
  _caller_ passes to `saveBnn` (`bnn.ts:82`).

A consumer handed `rev2.bnn` sees six logged edits and cannot say which happened after rev1 was issued.
A producer written in P6 would have to **diff two models to find out** — which is precisely the guessing
Bunyan's entire contribution was to make unnecessary.

**This is the answer to the prompt's closing question.** It ships as "done"; it is discovered when
someone writes the Clean Delta producer (P6) or when Planitor's schedule silently misses a wall that
moved 250 edits ago; and it costs a **contract amendment across three repos plus a migration of every
`.bnn` ever issued**, because the fix adds fields to `manifest.json`, to `scene.json` and to
`UndoableEdit` — and `UndoableEdit`/`scene.json` **freeze at P5**.

**Today it is free.** The Clean Delta JSON Schema is _not yet agreed_ (Entry 17: _"agree it before anyone
writes a producer"_), no `.bnn` has ever been issued, and nothing downstream binds yet.

---

## WHAT IS OWED A DECISION (yours, not mine)

**1. The change feed's shape — decide it before the Clean Delta schema is agreed.**
An append-only **journal**, distinct from the undo stack, anchored to revisions. My recommendation:

- `UndoableEdit` gains a monotonic `seq` (and keep `transactionId`, already reserved);
- `ModelRevision` gains `issued_at_seq` — the log position at which it was issued;
- the journal is persisted whole in `history.json` and is **never** trimmed by the 200-deep undo cap;
- an undone edit is journalled as a _reversal_, not erased (a consumer may already hold the earlier state).

Cost today: a few fields, no protocol change. Cost after P5: a frozen-contract amendment in three repos.

**2. Is `issue()` a Command?** Today it is a free function in `bnn.ts`, not in the registry — so an agent
**cannot issue a revision**, cannot hand a model downstream, and `listCommands()` never mentions it.
Domain rule 9 says _"anything an actor can do to the Document is a Command; there is no second path."_
Issuing is explicitly _"a deliberate act"_ (D34). Recommendation: **`core.issueRevision` becomes a
Command**, and the document owns its current revision. Cost today: one command. After P5: an amendment.

**3. D29 is still unruled and still yours** — I did not re-litigate it and I did not re-measure it.
One input for it: **none of my findings need a kernel op.** They are all document-layer. ⇒ **The P3
protocol freeze is not blocked by anything in this review.** The things that are cheap-now-expensive-later
here all freeze at **P5** (`scene.json`, `Command`, `UndoableEdit`, `BimObjectType`), not at P3.

---

## FINDINGS, ordered by cost of delay

### [1] The change feed cannot answer "what changed since revision N"

See **THE HEADLINE**. `bnn.ts:46-53, 82`, `undo.ts:22-42, 56-63, 98-100`, `document.ts:96-98`.

- **CLAIMED** — `core_logic.md` rule 14; `current_state.md` §4i; `undo.ts:92-97` (_"THIS IS THE
  ECOSYSTEM'S CHANGE FEED… Bunyan does not guess: it was THERE"_).
- **TRUE** — probe: 250 edits pushed → `history()` returns **200**, oldest is `e50`, `e0-e49` are gone.
  Probe: issue rev1, edit, issue rev2, save → the manifest's revision has **no log anchor** and no edit
  carries a revision/seq/timestamp. Probe: one `undo()` **removes** the edit from `history()`.
- **MATTERS** — a wrong schedule and a wrong payment downstream, silently. The failure is invisible to
  Bunyan: it looks like a shorter list.
- **COST** — free today; a three-repo contract amendment + a migration of every issued `.bnn` later.
- **RECOMMEND** — the journal above. Do it **before** the Clean Delta schema is agreed.

### [2] Element ids are REUSED — the PEI is not persistent

- **CLAIMED** — `core_logic.md` §4 (_"assigned on creation and **never reused**"_) and rule 13
  (_"anything that would re-mint an element's id on a rebuild is **not a refactor; it is a breaking
  change to three other products**"_). `entities.ts:24-31`.
- **TRUE** — `DocumentContext.#idCounter` is rebuilt on load by `highestSuffix()`
  (`document.ts:80, 363-370`), which scans **surviving** element ids only. Probe: create `wall-1..3`,
  **delete `wall-3`**, save, reload, create a wall → **the new element is minted `wall-3`.** A deleted
  PEI is handed to a different building element.
- **MATTERS** — Planitor's progress records and Miqdar's analytical model bind to that id. After
  delete → save → reopen → create, they bind to _the wrong element_, and nothing anywhere reports it.
  This is the exact failure BIMsync's "confusing-change resolution queue" exists to catch — except that
  queue is empty _by assumption_, so nobody is looking.
- **COST** — free today (persist the counter, or mint from a document-level `nextId` in `scene.json`).
  Later: a migration of every saved file **plus** silent mis-binding in the field, which is the class of
  bug that is only ever found by a human noticing a schedule is wrong.
- **RECOMMEND** — persist the id counter in `scene.json` (it freezes at P5). Never derive identity from
  the surviving population.

### [3] "Reject + keep last-good" is false for every multi-element edit

- **CLAIMED** — domain rule 4; `document.ts:15-19` (_"'reject + keep last-good' is true **by
  construction** rather than by discipline… A command cannot have half-changed anything"_);
  `commands.ts:59-64`.
- **TRUE** — it is true of the **scene** and false of the **geometry**. In `#rebuild`
  (`document.ts:299-346`) the roots are rebuilt in a loop, and each success **commits**
  (`#geometryByElement.set(root, built.result)`) and **frees the previous solids**. If a later root
  fails, `execute` restores `this.#scene = before` (`document.ts:141-149`) — but the already-committed
  geometry is **not** restored, and its old handles are already released.
  Probe (real OCCT): two walls on one style; a style edit that wall B refuses. The command throws and
  the scene rolls back correctly (`thickness 200 → 200`) — and wall A's solid is now the one built at
  the **rejected** thickness: `volume 1.5e9 → 3.0e9`. `quantities()` then reports, with
  `basis: 'exact'`, **double the true volume of an element the user never edited.**
- **⚠ WHY THE SUITE CANNOT SEE THIS** — the only rule-4 test
  (`document-openings.test.ts:298`) uses `params: { length: -1 }`, which the **schema** rejects inside
  the command, _before the kernel is ever called_. The geometry-failure path — the one the rule is
  about — **is never exercised.** This is exactly Hunt 2's warning: _a criterion is not discharged by a
  test that exercises a weaker case than the criterion states._
- **REACHABILITY, honestly** — I could **not** trigger it with today's fixture types (they only fail
  when a style has no layers, which fails _every_ instance, and the first failure is safe). I triggered
  it with a type whose `buildGeometry` fails for one instance and not another. **P5's real types will do
  exactly that**: the spec itself (§6.4, `core_logic.md` §7) names _"fillet radius too large,
  open/self-intersecting profile, empty boolean"_ as **legitimate** failures — and `updateStyle` across
  400 walls is the archetypal multi-root edit. The engine is wrong now; the types that will expose it
  arrive in P5.
- **COST** — cheap today (rebuild into a staging map and commit atomically, or re-run the rebuild on the
  restored scene in the catch). Expensive later: it presents as _"sometimes the model on screen doesn't
  match the file"_, and it corrupts **exported quantities** while claiming `basis: 'exact'`.
- **RECOMMEND** — make the rebuild transactional, and **rewrite the rule-4 test to fail in the kernel**,
  not in the schema. The current test retires a suspicion it did not earn.

### [4] One unregistered type makes the whole document unopenable

- **CLAIMED** — the broken-ref work's own principle (`build.ts:21-24`): _"a breakage that bricks the file
  is not predictable, it is fatal"_; `core_logic.md` §3.5 (unmapped imports land as `GenericSolid`).
- **TRUE** — `buildAssembly` returns `state: 'failed'` for a type with no `buildGeometry`
  (`build.ts:119-132`); `#rebuild` **throws** on any failed root (`document.ts:330-334`). Probe: save a
  document with a wall + a column, reopen it in a session where the LinearMember type is not registered
  → `rebuildAll()` **throws**: `type "core.linearMember.v1" cannot build a solid`. The wall had already
  been built; the document is half-loaded and unusable.
- **MATTERS** — a plugin type, an older app version, a **`.bnn` written by Miqdar**, a file with one
  future type. Any of them bricks the file. The broken-reference work got this right for refs and left
  the same hole for types.
- **COST** — cheap today (an unknown-type element is `failed`/unbuilt but the document loads and edits —
  the same discipline domain rule 3 already applies to refs). Later: a support class of _"your file
  won't open."_
- **RECOMMEND** — a failed root marks the element `failed` and is surfaced; only a _command's own_ root
  failing rejects the command.

### [5] Autosave: a fresh session recovers a STALE snapshot and overwrites the ring

- **CLAIMED** — plan P3 step 7; `current_state.md` §3 (_"Autosave recovers a crashed session"_).
- **TRUE** — `Autosave.#counter` starts at **0 in every new session** (`bnn.ts:272-288`) and keys are
  minted from it. Probe: session 1 writes `autosave-1..3`; **crash**; session 2 constructs a new
  `Autosave` over the same store, edits (`length: 9999`) and snapshots → it writes **`autosave-1.bnn`**
  (overwriting session 1's oldest), and `latest()` — which picks the highest counter — returns session
  1's **`autosave-3.bnn`**. Recovered `length` = **1300, not 9999.** The second crash silently restores
  _old_ work and the newest snapshot is unreachable.
- **⚠ WHY THE SUITE CANNOT SEE THIS** — the autosave test
  (`document-persistence.test.ts:259-288`) calls `latest()` on **the same `Autosave` instance** that
  wrote the snapshots. It never constructs a fresh one over an existing store — which is _the only
  situation autosave exists for._
- **MATTERS** — data loss, in the feature whose entire purpose is preventing data loss.
- **COST** — trivial today (seed the counter from `store.list()`, or key by timestamp). Later: a user's
  lost afternoon, and a bug report nobody can reproduce because the first crash always works.

### [6] `quantities()` reports `basis: 'exact'` while returning **0 kg**

- **CLAIMED** — domain rule 15: _"a quantity is MEASURED, never reconstructed… **it must never emit an
  estimated quantity dressed as a measured one**"_; `document.ts:58-65`.
- **TRUE** — `mass: (volume / 1e9) * (material?.density ?? 0)` (`document.ts:233`). If the material is
  missing, the mass is **0** and `basis` is still **`'exact'`**. And a missing material is reachable:
  **`core.createStyle` does not check that a layer's `materialId` exists** (`commands.ts:549-569`) —
  though **`core.updateStyle` does** (`commands.ts:348-352`). Probe: a style naming `no-such-material`
  → wall builds → `quantities()` → `{volume: 1.5e9, mass: 0, basis: "exact"}`.
- **MATTERS** — worse than an estimate: **a wrong number wearing the badge that says "trust me."** It is
  the one thing the domain says Bunyan must never do, and it is what collapses Planitor's fallback ladder
  into a lookup — a lookup that now returns zero.
- **COST** — trivial today. Later: a wrong bill of quantities, downstream, with `basis: exact` on it.
- **RECOMMEND** — `createStyle` validates materials exactly as `updateStyle` does; and `quantities()`
  **refuses** rather than returning 0 for an unresolvable material.

### [7] Two style layers with the same name mint **colliding SubShapeRefs**

- **TRUE** — `partNodeId(elementId, partName)` = `` `${id}.${name}` `` (`geometry.ts:55-57`), and nothing
  enforces that a style's layer names are unique (`commands.ts:524-569`). Probe: a style with two layers
  both named `structure` → the two parts get the **same `nodeId`** and share **6 byte-identical
  `SubShapeRef` tokens naming different faces of different solids**. An Opening hosted on one of them
  binds to whichever part `Array.find` reaches first (`build.ts:171`).
- Note the guard that _does_ exist is on the safe path: `checkIdSafe()` rejects `/` and `#` in a
  **minted** element id (`commands.ts:137-145`), which can never contain them — while the strings that
  actually flow into a `nodeId` (layer names, agent-authored) are unchecked. (`/` and `#` are at least
  caught loudly downstream by `encodeSubShapeRef`; a duplicate name is not caught at all.)
- **COST** — free today; `scene.json` and `SubShapeRef` freeze at **P5**, and this is an identity-contract
  defect. **RECOMMEND** — refuse duplicate layer names at the command; assert unique `nodeId`s per element.

### [8] A mistyped `containerId` silently puts the element on the ground floor

- **TRUE** — `createElement` validates `styleId` and `hostId` but **not** `containerId` or `gridRefs`
  (`commands.ts:214-233`). `elevationOf()` returns **0** for an unknown container (`scene.ts:151-156`).
  Probe: two walls, one on `level-3` (elev 9000) and one on `"level-03"` (a typo) → measured z-min
  **9000** vs **0**. The wall is built on the ground floor and nothing complains.
- **MATTERS** — `containerId` is _also_ the element's **LBS address** (D35): the typo is both a wrong
  building and a wrong work package. **COST** — trivial now. **RECOMMEND** — validate the ref, as the
  other refs are.

### [9] The spec claims a persisted **naming token map** that has zero code

- **CLAIMED** — `V1.0.0_spec.md:261` (_"The identity **token map** is persisted in `scene.json`… on load,
  deterministic replay re-binds the stored tokens"_) and `:452` (the `scene.json` layout); plan P3 step 1.
- **TRUE** — `Scene` (`scene.ts:33-58`) has **no token map**. Elements carry a single `hostRef` string;
  every other ref is re-derived from the kernel on rebuild.
- **This is the BREP-cache bug's exact species** (Entry 13: promised in five places, zero code). The
  difference is that here **the code is right and the spec is wrong** — a deterministic derivation needs
  no stored map, and storing one would be storing a result. ⇒ **Delete the claim; do not build the map.**
- **COST** — free today. After P5 the `scene.json` shape is frozen _with a documented field nobody
  writes_, and the next agent builds it.

### Small — one line each

- **`loadBnn`'s hostile-input guard is wrong**: `typeof scene[key] !== 'object'` (`bnn.ts:149-159`) —
  and `typeof null === 'object'`. A `.bnn` with `"elements": null` sails through the guard that exists to
  catch it and dies later as a raw `TypeError: Cannot convert undefined or null to object`. The file's
  own comment claims _"all of them fail with a message."_ (Probed.) The hostile-`.bnn` test only covers
  garbage bytes and a truncated zip.
- **Six registries, not seven** (`registries.ts:111-120`) — the "Persistent Naming resolver binding" of
  plan step 2 is a comment, not a registry. Harmless, but the docs say seven in four places.
- **`undo()`/`redo()` have no rollback** (`document.ts:155-169`) — no try/catch around `#rebuild`, so a
  failing undo leaves the edit popped and the scene reverted. Same species as [3].
- **`execute` rebuilds `edit.rebuilt`; `undo` rebuilds `#touched(changes)`** — two different answers to
  the same question (`document.ts:140` vs `159`). Undoing a `createMaterial` rebuilds **every element in
  the document** (`document.ts:282-285`) — ~7.3 s on the 195-element building, for an edit that changed
  nothing geometric.
- **`undo.ts:47-49` claims undo "participates in the same edit-coalescing budget"** — `undo()` passes no
  `coalesceKey` (`document.ts:159`). Comment vs code; the code is probably right.

---

## WHAT IS GENUINELY FINE — and how I checked

I want to be specific, because a review that only lists problems teaches nothing about coverage.

- **D30 — an element is its parts.** Not asserted, _measured_: `document-model` / `document-openings`
  assert each layer loses exactly `w × h × its own thickness` to the opening, against the **real OCCT
  kernel**. That assertion **fails if the feature is absent**. The composite wall is real.
- **D31 — a style edit rebuilds every instance.** Verified in the B-Rep (volumes change), not in a flag.
- **The rotated-wall result holds.** I re-read the assertion: volumes identical to the straight wall _and_
  the host-face token **byte-identical**. Build-in-local-frame-and-place-last (`build.ts:252-261`) is
  genuinely what makes that true, and D25 is load-bearing exactly as claimed.
- **The broken-reference state is real** and the document survives it: marked, visible, never auto-healed,
  still loadable, still editable, and repairable **only** by `core.retargetReference` — which is itself
  an `UndoableEdit`. This is the best-executed part of P3.
- **Cascade delete (D39)** does what the ruling said, in one edit, with `planDelete()` reporting first.
- **The heap discipline holds.** 20 edits on a 3-layer wall with a window leave exactly the same number of
  live solids — asserted against `wasmLiveHandles()`, the **WASM side's own** count. My own probes
  (including the failure path in [3]) showed handles balanced, 26 → 26.
- **D19 is structural, not conventional.** `packages/document/package.json` depends on `@bunyan/protocol`
  and `fflate` — **it cannot import `@bunyan/kernel-client`**, and the grep gate covers `apps/`. This is
  stronger than the lint rule the plan asked for, and it is correctly claimed.
- **Undo is a genuine state delta** (`scene.ts:96-120`), not a command replay. `revertChanges` is correct,
  including the deliberate rebuild-don't-delete so a key cannot survive as a phantom.
- **The agent surface has no back door**: the agent test drives `createAgentSurface` only, and
  `listCommands()` is a projection of the registry — I checked that registering a command needs zero
  other edits.
- **The protocol did not move for any of D30–D38** — I verified `packages/document` imports only types
  from `@bunyan/protocol`. The "it costs the kernel nothing" claim is true.

## MY OWN COVERAGE — what this review would NOT have caught

- **I did not exercise the browser half** (FSA/OPFS/IndexedDB, the re-grant, the service worker). It does
  not exist; it is Amer's; if it is wrong, this review did not look.
- **I did not re-measure D29 or the 21 s style edit.** I took Entry 18's numbers as given and did not
  re-derive them; my findings do not depend on them.
- **I did not audit the kernel's C++ or the naming resolver** — P2 scope, and §4b's oracle covers it
  better than I could.
- **I did not model a new building.** §5's advice ("keep cutting shapes nobody has cut") is still owed and
  I did not discharge it — **a stair, a roof, two walls that meet, a duct through a beam.** My method here
  was to drive the _document_ API at its failure boundaries, which is a different hunt and finds a
  different class. Both are needed.
- **Findings [3] and [7] I could only trigger with types I wrote.** I have stated that plainly; the engine
  defect is real and type-independent, but if you want the trigger to be a _shipped_ type, it arrives at
  P5 and not before.

## THE PROMPT WAS INCOMPLETE IN ONE PLACE

The seven hunts ask what the code claims and whether it is built. They do not ask **whether a _test_
proves the claim it is filed under.** Two of the six serious findings here ([3] and [5]) exist _because a
green, well-named, well-commented test asserts a weaker proposition than its own title_ — the rule-4 test
fails in the schema instead of the kernel; the autosave test never opens a second session. Both would pass
forever. ⇒ **Add to the standing brief: for each exit criterion, read the test that discharges it and ask
what it would take for that test to pass while the criterion is false.**
