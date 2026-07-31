# P5 · Step 5 Ⓒ — Co-authoring Concurrency / Merge Seam — DESIGN (D60, Freeze-Gate row Ⓒ)

**Status:** design + reservation. **Author:** Zayd (dev box, headless). **Date:** 2026-07-22.
**Companion evidence:** `tests/coauthoring-merge-seam.test.ts` (pure — merge order + codec round-trip).
**Reopened-freeze context:** `current_state.md` §0a + Entry 46; `v1.0.0_imp_plan.md` "🟠 REOPENED" row Ⓒ.

---

## 0. What this row is, and what it deliberately is NOT

**D60 (owner-validated 2026-07-21):** real-time multi-user co-authoring of one model is **Bunyan's** future
capability — a Revit **worksharing** moat the ecosystem does NOT cover (Planitor / Miqdar / BIMsync are
downstream _consumers_ of a Bunyan model, never _co-authors_ of it). Owner chose **"reserve the seam now,
build later"** (D60 Q1).

**⇒ THIS ROW IS A RESERVATION, NOT A BUILD.** It reserves the **merge metadata** — the per-edit,
per-revision, and per-document fields a future CRDT/OT merge-ordered journal will need — so that the
co-editing **transport** (whenever it lands) is **purely additive** over the frozen journal + `.bnn`, never
a three-product amendment. **Bunyan stays client-only in v1.0.0 (D37 stands — no backend, no allocator, no
server).** This row writes **no transport, no network, no lock manager, no CRDT engine.** It writes the
optional fields those will attach to, and **proves a deterministic merge is expressible over them** with a
pure ordering function used only in the test.

**Why it is pre-freeze even though the transport is not.** The shapes a merge leans on — `UndoableEdit`,
the journal serialized as `history.json`, `ModelRevision.issued_at_seq`, the `.bnn` manifest — **freeze at
P5.** D40 already flagged the exact hazard in `undo.ts`'s own header: _"`seq` is document-scoped … co-editing
will need a merge-ordered journal … not solved here, and not foreclosed either."_ This row makes that
caveat a **reservation** before any issued `.bnn` exists in the field. As D60 puts it: **free now,
foreclosed forever if the journal freezes without it.**

**The method (unchanged, `current_state.md` §1b): reserve against the REAL frozen contracts, not the
prose.** The prose in `undo.ts` reassures that co-editing is not foreclosed _because PEIs are ULIDs (D44)_.
Reserving against the real code found that reassurance **incomplete** — see §3.

---

## 1. The one fact that shapes everything — `seq` is a single-writer scalar

The journal orders every edit by a **single monotonic integer `seq`**, minted document-locally
(`Journal.#nextSeq`, peeked at `#contextFor`). The entire Clean Delta rests on one sentence:

> _"what changed since revision N?"_ **= `journal.filter(e => e.seq > revN.issued_at_seq)`** (D40).

That sentence is exactly right for **one writer**, and **structurally wrong for two.** With two replicas
editing concurrently, **both mint `seq = 42`.** A single scalar cannot express:

- a **total order two replicas agree on** (both think they are at 42);
- **happened-before** (did replica B's edit see replica A's, or were they concurrent?);
- a **cut point** for "since revision N" that is unambiguous across replicas (`seq > 42` is ambiguous).

The four frozen shapes that carry this scalar, and therefore foreclose a merge if frozen bare:

| Frozen shape                    | The single-writer assumption baked in                                                        | Freezes |
| ------------------------------- | -------------------------------------------------------------------------------------------- | ------- |
| `UndoableEdit` (`undo.ts`)      | `seq` is the sole order key; `id` = `edit-${seq}-${command}`; `reverses` points by that `id` | P5      |
| the journal as `history.json`   | ordered/compared by scalar `seq`; `since(N)` = `seq > N`                                     | P5      |
| `ModelRevision` (`revision.ts`) | `issued_at_seq` is a scalar cut point                                                        | P5      |
| `.bnn` `manifest.json`          | no document identity except a revision's `lineage` (absent until issued)                     | P5      |

Nothing here needs a different **algorithm** decided now (Lamport vs vector-clock vs op-DAG is a
transport-phase call). It needs the frozen shapes to **admit carrying** the metadata whichever algorithm
wants — and to prove it by exhibiting one.

---

## 2. What a merge-ordered journal fundamentally needs (the analysis)

A merged journal is the **union of edits produced on ≥ 2 replicas**, re-sequenced into one deterministic
order every replica computes identically. Per the CRDT/OT literature, the minimal ingredients are:

1. **A globally-unique edit identity** — so an edit from replica A and one from replica B are never
   confused, and a pointer to an edit (`reverses`) resolves after merge.
2. **A replica / origin identity** — who produced it: needed for deterministic tie-breaking of concurrent
   edits and for attribution ("Amer moved this wall").
3. **A causal ordering key** — enough to respect happened-before and yield a deterministic **total** order.
   The minimal single-scalar mechanism is a **Lamport clock**; the order is `(lamport, origin)`
   lexicographic. (A version vector or op-DAG is richer and strictly additive over this.)
4. **A merge-safe revision anchor** — "since revision N" must be a **frontier** (a per-replica cut), not a
   single scalar, because a scalar cut is ambiguous across replicas.
5. **A document identity across replicas** — two `.bnn` files must be recognizable as _the same document_
   before they can be merged, even before either was ever issued.

**What v1.0.0 already provides for free (the genuine part of D40's reassurance):**

- **Element PEIs are globally-unique ULIDs (D44)** — so the merge never has to reconcile _element_
  identity. This is the load-bearing half, and it is real: no two replicas mint the same `wall-…`.
- **Edits are discrete state DELTAS, not command replays (D40)** — a merge concatenates deltas; it never
  re-runs a boolean, so it cannot re-target a `SubShapeRef`. The anti-replay invariant is what makes a
  journal merge _sound_ in the first place.
- **The journal is append-only (D40)** — a merge is an append of the peer's tail, which is the operation
  the structure is already built for.

Requirements 1–5 are what is **not** yet carried. §3 is what reserving against the real code (not the
prose) revealed about them.

---

## 3. THREE foreclosures the §1b method found (reserve against the code, not the prose)

`undo.ts` says co-editing is "not foreclosed … the PEIs are already globally unique ULIDs (D44)." Reserving
against the real frozen contracts found that this is true of **element** PEIs and **incomplete** for the
journal itself:

1. **The EDIT's own id is `seq`-derived, NOT a ULID.** `#editId` mints `edit-${nextSeq}-${commandId}`
   (`document.ts:498`) — **document-scoped, so two replicas both mint `edit-42-core.createElement`.** And
   `reverses` points at an edit by **exact string equality on that id** (`undo.ts:206`;
   `e.id === reversal.reverses`, `document-persistence.test.ts:285`). ⇒ After a merge, a bare `id` is
   ambiguous. The globally-unique edit key must be **`(origin, id)`**, which is exactly what reserving
   `origin` supplies. (D44's own words — "a document-local counter collides between two co-editing peers" —
   apply verbatim to the edit id; the ruling fixed it for elements and the edit id was left behind.)

2. **`issued_at_seq` is a scalar cut point** (`revision.ts:35`), and `since()` filters `seq > N`
   (`undo.ts:176`). Under merge, "everything after seq 42" is ambiguous (two replicas' 42s). The cut point
   must be expressible as a **frontier** — a per-origin position vector. Reserve `ModelRevision.frontier?`.

3. **An un-issued `.bnn` has NO document identity.** The only document-lifetime id is
   `ModelRevision.lineage`, which **does not exist until `core.issueRevision` runs** (and even then defaults
   to `bnn-${Date.now()}`, `revision.ts:52`). Two _un-issued_ `.bnn`s of the same document — the normal
   co-editing case, where peers edit before anyone issues a baseline — cannot be recognized as mergeable.
   Reserve `manifest.documentLineage?`.

None of the three is fixable after the freeze without a three-product amendment (a `.bnn` in the field
carries the frozen shapes). All three are one optional field each.

---

## 4. The reserved surface — optional, absent-defaulted, additive at every point

Following the **`transactionId` / `georeference` precedent** (an optional field, absent ⇒ today's exact
single-writer behaviour), never a shape change to a required field.

### 4.1 `UndoableEdit` (`undo.ts`) — two optional fields

```ts
interface UndoableEdit {
  // … all existing frozen fields UNCHANGED …
  /** ⚠ RESERVED (D60), NOT BUILT. The replica that produced this edit — a ULID-shaped id, no allocator
   *  (D44 mechanism). ABSENT ⇒ the single local replica (v1.0.0). The global edit key is (origin, id). */
  readonly origin?: string;
  /** ⚠ RESERVED (D60), NOT BUILT. A Lamport logical clock: max(all lamports seen) + 1. ABSENT ⇒ equals
   *  `seq` (single writer). A merge totally-orders by (lamport, origin); v1.0.0 orders by `seq`, unchanged. */
  readonly lamport?: number;
}
```

- **`origin`** answers requirements 1 + 2. Global edit identity is the pair `(origin, id)` — `id` stays
  document-scoped and human-readable (`edit-42-core.createElement`), `origin` disambiguates across replicas.
  **`reverses` stays a bare `id` and is interpreted within the same `origin`** — undo is **replica-local**
  (you undo _your_ edits), the standard co-editing semantic; a future cross-replica undo carries an
  `origin:id` composite string, additive to the existing string field, foreclosing nothing.
- **`lamport`** answers requirement 3. Absent ⇒ `lamport := seq`, so a single-user journal orders
  identically whether it reads `seq` or `(lamport, origin)`. This does **not** commit to Lamport-over-vector:
  a version-vector transport ignores `lamport` and uses per-origin `seq`; reserving the field forecloses
  neither.

### 4.2 `ModelRevision` (`revision.ts`) — one optional field

```ts
interface ModelRevision {
  // … all existing frozen fields UNCHANGED, incl. issued_at_seq …
  /** ⚠ RESERVED (D60), NOT BUILT. The merge frontier at issuance: origin → highest lamport included.
   *  ABSENT ⇒ use the scalar `issued_at_seq` (single writer). "Since revision N" under merge = every edit
   *  causally beyond this frontier. */
  readonly frontier?: Readonly<Record<string, number>>;
}
```

Answers requirement 4. `issued_at_seq` stays the primary single-writer anchor (unchanged); `frontier` is
the merge-safe generalization an issued file carries so a peer computes the delta unambiguously.

### 4.3 `.bnn` `manifest.json` (`bnn.ts`) — one optional field

```ts
interface Manifest {
  // … all existing frozen fields UNCHANGED …
  /** ⚠ RESERVED (D60), NOT BUILT. A stable per-document id (ULID), minted at document birth so two files
   *  are recognizable as the same mergeable document even before any revision is issued. ABSENT ⇒ a single
   *  standalone document. Once issued, ModelRevision.lineage threads through it. */
  readonly documentLineage?: string;
}
```

Answers requirement 5. Carried through `SaveOptions` as an optional field; `saveBnn`/`loadBnn` round-trip
it when present, ignore it when absent — exactly as `revision`/`thumbnail` already do.

### 4.4 The `Journal` class — NO reservation owed

The `Journal` is a **class, not a wire contract**; its serialized form is the `UndoableEdit[]` array in
`history.json`, and that array's shape is reserved by §4.1. The class's internal `#nextSeq`, `append`,
`since`, `restore` are single-writer _implementation_ that a transport phase **replaces additively** (a
`MergeJournal` subtype ordering by `(lamport, origin)`), with no change to any frozen serialized byte. So
nothing is reserved on the class itself — and that is the point: the reservation lives entirely in the
**data**, where the freeze actually bites.

---

## 5. The merge-order proof — a pure function, demonstrated in the test, NOT shipped

The reservation's proof obligation (`current_state.md` §1b: _prove additivity, don't reason from prose_) is
to exhibit a **deterministic merge over the reserved fields** — showing the frozen shapes are sufficient —
**without shipping a transport.** The test defines a pure:

```ts
mergeOrdered(a: UndoableEdit[], b: UndoableEdit[]): UndoableEdit[]
// union by (origin, id); sort by (lamport, origin) lexicographic; stable & commutative
```

and proves:

- **Determinism / commutativity:** `mergeOrdered(A, B)` ≡ `mergeOrdered(B, A)` (order-independent — the
  CRDT property). Two peers merging in either direction reach byte-identical journals.
- **Causality respected:** an edit with a higher Lamport stamp never sorts before one it causally followed.
- **Single-writer identity:** for a one-origin journal, `mergeOrdered` yields exactly the `seq` order — so
  v1.0.0's existing ordering is the degenerate case, unchanged.
- **`(origin, id)` disambiguates** the `edit-42` collision (§3.1): two edits, same `id`, different `origin`,
  both survive the merge and order deterministically.
- **`reverses` resolves within origin:** a reversal from replica A points at A's edit unambiguously even
  when B has an `id`-colliding edit.
- **Frontier delta:** "since revision N" computed from a `frontier` over a merged journal returns exactly
  the causally-later edits (and equals the `issued_at_seq` scalar result on a single-origin journal).

`mergeOrdered` lives in the **test file only** — it is the executable proof that the reserved shapes are
sufficient, not a shipped feature (there is no transport to feed it real multi-origin edits in v1.0.0).

---

## 6. Where it lands, and what does NOT move

- **`packages/document/src/undo.ts`** — `origin?` + `lamport?` on `UndoableEdit` (+ the D60 comment tying
  them to the existing header caveat). **No change to `Journal`, `UndoStack`, `reversalOf`.**
- **`packages/document/src/revision.ts`** — `frontier?` on `ModelRevision`. `nextRevision` unchanged (it
  never sets it; a transport does).
- **`packages/document/src/bnn.ts`** — `documentLineage?` on `Manifest` + `SaveOptions`; `saveBnn`/`loadBnn`
  round-trip it additively (present ⇒ written/read; absent ⇒ omitted, byte-identical to today).
- **`tests/coauthoring-merge-seam.test.ts`** — the §5 proof + the codec round-trip (a `.bnn` carrying merge
  metadata saves + loads byte-identical; one carrying none defaults — the reservation's revert-check).

**What does NOT move — and this is the reservation's whole claim:**

- **No `SCENE_SCHEMA_VERSION` bump.** Nothing lands on `scene.json` at all — merge metadata is journal +
  manifest, not scene. The scene (the parametric truth) is identical whether authored by one peer or ten.
- **No frozen field changes shape.** Every reservation is a new optional field; every existing consumer
  (`since`, `issued_at_seq`, `restore`, `reverses`) behaves identically when they are absent — which they
  always are in v1.0.0.
- **No verb owed.** Like Ⓐ (§7 there), a co-editing transport is **new commands** (join-session /
  apply-remote-edit) — a purely additive registry entry (D19), not an argument on a frozen `argsSchema`. And
  the single-user commands never SET these fields, so no existing `argsSchema` grows.
- **No backend, no network, no allocator (D37).** `origin` and `documentLineage` are **ULIDs** — globally
  unique with no coordination, exactly the D44 property that let identity be client-only in the first place.

---

## 7. Open framing questions for the owner (recommended defaults in force; reshape before commit)

All reservations are additive and uncommitted, so these are reshape-cheap. My recommended default is in
**bold**; I have designed against it and will build against whatever you rule.

- **Q1 — Edit identity across replicas.** **(recommended) Keep `edit.id` document-scoped + human-readable
  and make `(origin, id)` the global key; `reverses` is replica-local (you undo your own edits).** vs.
  switch `edit.id` to a ULID **now** (globally unique like element PEIs, D44-symmetric, `reverses` works
  cross-replica — but a mint-behaviour change to a freezing field, and it drops the readable seq-in-id). I
  recommend the first: it changes **zero** single-user behaviour, keeps ids readable, and replica-local undo
  is the standard co-editing semantic. Ids are opaque strings so even the ULID switch stays reachable later
  — neither choice truly forecloses the other; this is a "how much to pre-commit now" call.

- **Q2 — The causal clock.** **(recommended) Reserve a Lamport scalar `lamport?`** (minimal; a deterministic
  total order `(lamport, origin)`; a version vector is additive if ever needed) vs. reserve a full
  per-edit version vector now (heavier, full concurrency detection) vs. reserve nothing and rely on the
  wall-clock `at` (rejected — clock skew makes the order non-deterministic, and a non-deterministic merge is
  not a merge).

- **Q3 — The revision anchor.** **(recommended) Reserve `ModelRevision.frontier?`** so an issued file
  already carries a merge-safe cut point, vs. leave `issued_at_seq` scalar and have the transport derive a
  frontier at merge time. Reserving is one optional field and means an issued baseline is delta-computable
  by a peer with no extra handshake.

- **Q4 — Document identity for un-issued files.** **(recommended) Reserve `manifest.documentLineage?`** so
  two un-issued `.bnn`s are recognizable as the same mergeable document, vs. rely solely on
  `ModelRevision.lineage` (which does not exist until a revision is issued — §3.3). Reserving closes the
  normal co-editing case (peers edit before anyone issues).

---

## 8. What lands this row (one commit, owner-gated)

1. **`undo.ts`** — `origin?` + `lamport?` on `UndoableEdit`; the D60 note.
2. **`revision.ts`** — `frontier?` on `ModelRevision`.
3. **`bnn.ts`** — `documentLineage?` on `Manifest` + `SaveOptions`; additive round-trip in `saveBnn`/`loadBnn`.
4. **`tests/coauthoring-merge-seam.test.ts`** — the merge-order proof (§5) + codec round-trip; the
   revert-check is: **drop any one reserved field ⇒ the merge/round-trip test that needs it fails** (a
   `.bnn` carrying merge metadata would lose it on load; the `edit-42` collision would order
   non-deterministically), exactly as `reserve-shapes.test.ts` revert-checks ⓣ by dropping a field.

**Verification (`current_state.md` §1b + `review_prompt.md`):** compile-time additivity (every field
optional; single-user path references none of them), a pure deterministic-merge proof over the reserved
shapes, and codec round-trip. This row touches **no kernel, no scene, no schema version** — it is the
lightest of the reopened rows, and the one whose absence is the most expensive after the freeze (a merge
retrofitted onto issued `.bnn` files is D40's three-product amendment).
