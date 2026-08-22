# P5 / D66 — LAZY BUILD: what may be deferred, what may not, and the measurement it rests on

**Status:** DESIGN + MEASUREMENT (headless, `zayd`, 2026-08-17, T-018), instrument
`tests/d66-lazy-build-measure.test.ts`. **§3c is BUILT** (`zayd`, 2026-08-22, T-005) — its ruling and its
tripwire, `tests/d66-force-declare.test.ts`.
**Predecessor:** `P5_step9_D66_scale_design.md` (the contract half — reserve nothing).
**Successor:** **T-006** builds §3a and §3b.

**What lazy build is.** Build only the elements somebody is about to look at, and build the rest when
they are asked for. It is recipe-is-truth exercised on a subset, which is why `P5_step9_D66_scale_design.md`
§2 could rule that it needs nothing reserved in the frozen contract.

**What this document adds.** That ruling said lazy build _cannot be foreclosed_; it did not say what it
costs, whether it is safe, or which API it runs on. Those three are measured here.

**⚠ The instrument is a committed test file, not a script.** Every number below is printed by
`tests/d66-lazy-build-measure.test.ts`, so it can be re-taken on any box, and the safety claim in §2 goes
red if the code stops honouring it.

---

## 1. The fixture, and why it is shaped the way it is

8 storeys · **88 elements** · **112 solids**. Each storey is a closed rectangular ring of four baseline
walls (so all eight wall ends miter against exactly one partner), four free-standing partitions that touch
nothing, and three doors hosted on the ring's south wall.

**Baseline `{start,end}` walls** (`@bunyan/types`' `core.wall`), never the `{length,height}` fixture the
other scale harnesses use: `baselineOf` returns `undefined` for those, so `resolveJoins` early-returns and
the join question — the one thing that could make lazy build unsafe — would never fire.

⚠ **Each storey's ring is offset in plan.** `partnersAt` matches endpoints in 2D with no level or container
scoping, so eight identically-placed rings would give every corner fifteen partners and the ambiguity
fallback would drop every miter. That is a defect in `joins.ts`, not a property of this design; it is
measured and recorded in `docs/BACKLOG.md ## Discovered`, and here it is only fixture hygiene.

⚠ **One throwaway element is built and freed on each kernel before the clock starts.** Without it the
sweep in §3b measured a **negative** marginal cost, because each later load was warmer than the one before
by more than its extra elements cost. The warm-up is also the honest model of the product: the app
constructs its kernel once at bootstrap, long before a `.bnn` is opened.

---

## 2. ⚠⚠ THE SAFETY CONDITION — a partially built document agrees with a fully built one

Lazy build is only permissible if a document that built 9 elements answers every question about those 9
exactly as a document that built all 88 does. Two cold `DocumentContext`s were loaded from the **same
`.bnn` bytes**, one calling `rebuildAll()` and one `rebuildOnly(keepLive)`, and compared element for
element, part for part:

| Compared                             | Result                                                           |
| ------------------------------------ | ---------------------------------------------------------------- |
| part names and order                 | identical                                                        |
| `Part.nodeId`                        | identical                                                        |
| **`Part.refs`** (sub-shape identity) | **identical, token for token**                                   |
| `quantities()` volume and area       | identical to 1e-6                                                |
| `brokenRefs()`                       | empty in both — a partial build manufactures no broken reference |

⚠ **`nodeId` agreement proves nothing, and the instrument says so.** `partNodeId` is
`${elementId}.${partName}` — a pure function of the recipe, computed with no kernel call — so a partial
and a full build agree on it whatever the geometry did. An agreement check reading it is the weak green
`AGENTS.md §4.8` names. The instrument compares `refs` and carries a tripwire that fails if that is ever
changed to read `nodeId`.

### 2a. Across a join — the case that could have made lazy build unsafe

The keep-live set deliberately omits two of the four ring walls, so the built south wall's `start` corner
meets a **west wall this document has never built**.

**`resolveJoins` is a pure function of the `Scene`** — the recipe — and reads no built state. Measured on
the south wall, in both documents:

- `resolveJoins(scene, south)` returns both ends, `['start','end']`, in the partial document as in the full one;
- its solid's bounds are `[-100, -100, 0] … [8100, 100, 3000]` in **both**. The `-100` is the miter
  reaching 100 mm past the baseline start; a jointless cap would start at `0`.

⇒ **The miter is present although its partner was never built.** This is the property lazy build's safety
rests on, and it holds because the join resolver reads the recipe. ⚠ It is not a coincidence to be relied
on quietly: any future change that made `resolveJoins` consult the built set would turn a deferred
neighbour into a _geometry_ change on a wall nobody edited, which is D68's ambiguity flip in a second
guise.

⚠ **`refs` cannot see a miter** — T-011 measured a mitered and an unmitered cap carrying byte-identical
sub-shape tokens — so the join comparison is made on the B-Rep via `bounds`, not on the ref list.

---

## 3. The design

### 3a. The keep-live set

**What it is.** The elements whose solids are held live: those the camera can see, plus the selection, plus
whatever a running gesture touches. Computed from camera, selection and viewport.

1. ⚠⚠ **It is RUNTIME STATE AND IS NEVER PERSISTED.** Writing it into `scene.json` would violate
   recipe-is-truth exactly as persisting a mesh would (`AGENTS.md §4.1`), and it is the reason D66 needs no
   reserved field.
2. **It closes over ASSEMBLIES, and that is a floor under any camera-derived set.** `rebuildOnly` runs
   `affectedAssemblies`, so naming a door alone still costs its whole host wall — measured:
   `affectedAssemblies(scene, [door])` returns exactly `[hostWall]`. A hole is not a thing that can be
   built on its own.
3. **Measured on this fixture:** a 9-element requested set closes to **6 assembly roots** and builds **9
   elements / 12 solids** of the model's 88 / 112.

⚠ The measurement uses a headless stand-in for the camera — _level 0 minus the ring's two far walls_, a
viewer standing south of one storey. The real set is `amer`'s to compute in the browser (**T-006**); what
is measured here is what the document layer does with whatever set it is handed.

### 3b. First paint = `rebuildOnly(visible)`

First paint builds the keep-live set only, ordered by container: the camera's level first, then outward.

**What deferral removes, measured:**

|                                    |                              |
| ---------------------------------- | ---------------------------- |
| deferred, by element               | **89.8 %** (9 of 88 built)   |
| deferred, by solid                 | **89.3 %** (12 of 112 built) |
| cold load, `rebuildAll()`          | **2443 ms**                  |
| cold load, `rebuildOnly(keepLive)` | **347 ms**                   |
| **⇒ cold load removed**            | **85.8 %**                   |

**And the fixed part, which deferral cannot reach.** A four-point sweep of `rebuildOnly` at 22 / 44 / 66 /
88 elements (707 / 1231 / 1869 / 2567 ms), fresh warm kernel each, ordinary least squares of ms on
elements:

- marginal cost per element (**slope**): **28.3 ms** — the deferrable part;
- fixed cost per cold load (**intercept**): **39 ms**, **1.6 %** of the full load;
- **R² 0.9961**. A second run of the same harness gave 27.3 ms / 84 ms / R² 0.9991, so the fixed part is
  small and the slope is stable to about 4 %.

⇒ **The deferrable fraction in elements and the deferrable fraction in time agree to within ~4 points**, so
the keep-live set's size is the whole story and there is no large fixed cost hiding behind it.

⚠ **This fixture's 28.3 ms/element is not the per-element cost at scale**, and must not be quoted as one:
its walls are single-layer, where **T-004**'s richer fixture (three-layer walls, slabs, columns) measured
**41.9–43.8 ms/element** over 39–273 elements. T-004 is the instrument for the per-element cost;
**this one is the instrument for the FRACTION deferral removes.**

⚠ **`rebuildOnly` costs nothing extra for being bounded**: at the top sweep point it builds the whole model
in **2567 ms** against `rebuildAll()`'s **2443 ms** — the same work, within the run-to-run spread.

### 3c. FORCE vs DECLARE — every aggregate that quantifies over the model

An aggregate over a partially built model must either **FORCE** the elements it is about to report (build
them first) or **DECLARE** that it did not. **Ruled and built by T-005**; the measurements below are what
the choice rests on.

**What T-018 measured on the partial document:**

| Aggregate             | Behaviour before the ruling                                                                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projectQuantities()` | **DECLARED.** 12 rows and **79 `unmeasured` entries** against the full load's 112 rows and 0. Nothing was silently dropped.                                                                          |
| `saveBnn()`           | **Reads no built state.** The two documents' scenes are byte-identical as JSON, and `saveBnn(scene, options)` takes a `Scene`, never a `DocumentContext` — there is no built state within its reach. |

⚠⚠ **The declaration was honest about _what_ and wrong about _why_.** `enumerate.ts` gave an element with
no geometry entry `state: 'failed'` and `failure: 'unbuildable'` — which is what a Type refusing to build
looks like — so a consumer could not tell _"nobody has asked for this yet"_ from _"this cannot be built at
all"_, and a normal first paint reported most of the building as broken.

⚠⚠ **AND THE FINDING THAT DECIDED IT (T-005): DECLARE WAS NEVER AVAILABLE TO AN ENUMERATING AGGREGATE.** A
declaration can only name what it can see, and a **deferred parent's D59 children are not enumerated at
all** — deriving children _is_ the build (§2), so an unbuilt curtain wall yields no panel rows and leaves
nothing to declare them by. Measured on a 3×2 curtain wall: **6 panel rows from a full document, 0 from a
partial one**, with the authored row itself still reported. An aggregate that DECLAREd would be plausible
and short, which is domain rule 15's failure mode one level up.

**⇒ THE RULING, per aggregate** (`tests/d66-force-declare.test.ts`; each line is revert-verified, and the
red it produces is quoted):

| Aggregate             | Choice                          | Why                                                                                                                                                        | Red without it         |
| --------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `projectQuantities()` | **FORCE** (whole model)         | A project-wide total's whole contract is completeness.                                                                                                     | 3 rows against 16      |
| `evaluateSchedule()`  | **FORCE** (whole model)         | Its **row set**, not its measurement, is what needs the build — a schedule with no `quantity` column is short by every panel without it.                   | 0 panel rows against 6 |
| `projectView()`       | **FORCE** (whole model)         | A drawing that is plausible and short is exactly what nobody audits — the method's own standing argument, applied to the elements nobody has built yet.    | 2 drawn against 8      |
| `exportCleanDelta()`  | **FORCE**, bounded to the delta | Owner ruling Q2 sets that exporter's scope: its cost tracks the size of the CHANGE, so it forces the journal's own ids, exactly as its prior rebuild does. | 1 PEI against 17       |
| `saveBnn()`           | **NEITHER**                     | Its signature takes a `Scene`, so no built state is in reach. If that ever changes it FORCES — a save that silently omits unbuilt elements is data loss.   | —                      |

**The two supporting changes.**

1. **`enumerate.ts` reports a never-built element as `stale`, with no `failure`.** `ElementState.stale`
   already means _recipe present, solid not built_, and `agent.ts` already answered `stale` for the same
   element through `geometryOf()`. `ModelElement.state` widens by that one member, which
   `ElementGeometry['state']` structurally cannot carry: it is the state of an element that has no
   `ElementGeometry` at all.
2. **`deferredElements(scene, geometryOf, ids?)` is the FORCE set** — the authored rows with no geometry
   entry, bounded by `ids` for the Clean Delta. `rebuildOnly` of it is empty on a fully built document, so
   FORCE costs nothing outside lazy build.

⚠ **FORCE is a build, not an edit** (domain rule 17): no `UndoableEdit`, no journal entry, no revision, no
authored byte. The one stored field it moves is `scene.brokenRefs`, which is a MEASUREMENT that
`rebuildOnly` already moves and that a partial build had simply not taken yet.

⚠ **NOT BUILT, and named so it is not assumed:** a narrower force for a schedule or a view — building only
the Types that declare `buildChildren`, rather than the whole model — is a pure optimisation with no
correctness content, and nothing measures it yet.

### 3d. Eviction — NOT built, and that is a ruling, not an omission

`P5_step9_D66_scale_design.md` §1a measured the WASM heap at **0.31 GB at the 10,000-element target** —
it fits. Eviction is therefore not a v1.0.0 requirement, and the release mechanism it would need
(`releaseShape`) is already frozen and already fired by the kernel client. **Build lazily; evict later, or
never.** T-006 must not build it.

---

## 4. Does the build half need a new API?

**No. `rebuildOnly(ids)` already suffices, and nothing here proposes an addition.** It ships today
(`document.ts`), it builds whole assemblies, it does not throw on a failed element, and it carries no
measurable penalty for being bounded (§3b). The keep-live _policy_ is the caller's, which is what keeps it
runtime state and out of `scene.json`.

⚠ The one thing that does not exist is a way to release **one** element's solids; `dispose()` frees the
whole document. That is eviction, and §3d rules it out of v1.0.0 — so the absence is correct rather than
missing.

---

## 5. What is measured, what is not

**Measured here (headless, this box):** the deferrable fraction in elements, solids and wall-clock; the
per-element slope and the per-load fixed cost; identity, quantity and join agreement between a partial and
a full build; what `projectQuantities` and `saveBnn` do about deferred elements.

**Not measured here, and named so it is not assumed:**

- **The first-paint improvement in a real browser** — `machine: pc`, T-006's, and only `amer`/`khalihlna`
  may report it (`AGENTS.md §4.9`). _unverified here: lazy first paint improves time-to-first-pixel —
  `khalihlna` to confirm._
- **The real keep-live set from a camera frustum.** §3a's headless stand-in is a subset chosen by hand.
- **Behaviour at 10,000 elements.** Every number here is measured over 22–88 elements; the projection to
  D48's target is an extrapolation of ~114×, which the R² entitles but does not prove.
