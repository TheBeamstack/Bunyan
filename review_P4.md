# `review_P4.md` — the P4 review (Entries 22–23, `apps/web`)

**Reviewer:** Zayd (Hetzner dev box, headless). **Date:** 2026-07-14. **Scope:** commit `3a6d068` — Amer's
`apps/web` (Entries 22–23), read against `v1.0.0_imp_plan.md` P4, `core_logic.md`, `architecture.md`,
`V1.0.0_spec.md` and `current_state.md`. Method: `review_prompt.md` (the seven hunts).

**Standing:** I am a reviewer. **I changed no source code.** Four throwaway probes were written, run and
deleted (a render-cost scale probe, a WASM-heap/project-quantities probe, a void-quantities probe — all under
`tests/` — and a type probe under `packages/document/src/`); one deliberate type error was injected into
`App.tsx` and reverted with `git checkout`. **No file under `packages/`, `apps/` or `tests/` is modified.**

**Follow-up (same session, at the owner's direction):** the owner ruled on four design questions and asked
that the fixes be folded into the reference plan. **This document remains the EVIDENCE — every number and
every reproduction. The WORK now lives in `v1.0.0_imp_plan.md`** (a new **P4 step 0**, an amended **P4**, a new
phase **P4.5 — The Interaction Model**, and amended **P5**/**P7**), with the handoff recorded in
`current_state.md` **Entry 24**. _Justification for one doc rather than two: unlike P3 — whose six defects were
revert-verifiable bugs in shipped code and earned a standalone `P3_correction_plan.md` — most of these findings
are **unbuilt work**, and unbuilt work belongs in the plan as steps with exit criteria. A parallel fixes list
would be a second description of one body of work, which is exactly what domain rule 10 and D21 forbid._

**The owner's insight that prompted this review:** _the UI is very primitive compared with ArchiCAD or
Revit._ It is acted on below, but it is not the frame — the frame is the seven hunts. The insight turns out
to be **correct, and its cause is not where it looks.**

---

## 1. THE HEADLINE — the single most important thing the owner does not know

> ### The UI is primitive because **the specification is primitive.** There is no interaction model in any of the four contract documents — and **P5 freezes the contracts that an interaction model would change.**

Amer did not under-build P4. **He built, faithfully and competently, exactly what the plan describes.** The
gap is upstream of him, in the documents, and it has been invisible because every document agrees with every
other document.

Search all four contract documents — `core_logic.md`, `architecture.md`, `V1.0.0_spec.md`,
`v1.0.0_imp_plan.md` — and the **only** interaction model ever written down is this diagram, which appears in
all four:

```
  human (button / drag) ─┐
  agent verb ────────────┼──►  Command registry ──► DocumentContext ──► kernel
  MCP [v1.0.x] ──────────┘
```

That is a diagram of **how an action reaches the model**. It is not a model of **how a human authors a
building**, and the project has been quietly treating the first as if it were the second.

**The words that do not appear anywhere in the repo's prose:** _snap_ (every hit is "snapshot"), _inference_,
_alignment guide_, _rubber band_, _preview_, _hover_, _gizmo_, _grip_, _handle_ (in the drag sense),
_context menu_, _tool state_. There is no domain rule about authoring; there are sixteen domain rules and
every one of them is about the _model_. There is no north-star about the human; there are five north-stars
and one of them is _agent_-operable authoring.

**So here is what it actually takes to place a window in Bunyan today.** The ribbon is generated from the
command registry, and `core.createElement`'s `argsSchema` (`packages/document/src/commands.ts:219-252`) is
rendered as a form. To cut a window into a wall the human must open that form and type:

| field       | control the schema produces | what the human must type                                    |
| ----------- | --------------------------- | ----------------------------------------------------------- |
| `typeId`    | text input                  | `core.opening.v1`                                           |
| `params`    | **JSON textarea**           | `{"width":1200,"height":1400,"offsetU":1500,"offsetV":900}` |
| `hostId`    | text input                  | the host wall's **ULID** — `wall-01J8Z3K7Q2…`               |
| `hostRef`   | **text input**              | `wall-01J8Z3K7Q2….finish.interior/face/y-min#0`             |
| `placement` | **JSON textarea**           | `[{"kind":"translate","by":[6000,0,3200]}]`                 |

**A human must hand-type a persistent-naming derivation token to place a window.** `SchemaForm.tsx:156-172`
renders `subShapeRef` as a plain text box, and D44 says element ids must _never_ be shown to a user as a
name — yet here one must be typed from memory. That single row is the whole finding in miniature: **the
`argsSchema` is a machine-readable contract for an agent, and the app is using it as a UI specification for a
human.** Those are not the same artifact. D21 ("one schema, three consumers") is _right_ for the property
panel and _right_ for the agent tool list; for the **ribbon** it silently substituted a form for a tool.

### What is missing has a name, and it is a layer

In Revit and ArchiCAD a ribbon button does not open a form. **It activates a tool**, and the tool then
collects its own arguments _from the viewport_: click a point, click another, snap to a grid line or a wall
end, watch a rubber-band preview, type `5000` to override the length, press Escape to cancel. Only at the end
does one command commit.

That layer — call it the **tool / interaction layer** — sits _between_ the human and the Command, and it is
**fully compatible with D19**: it dispatches exactly one Command at the end, so an agent and a human still
share one door. D19 is not the problem. **The problem is that nobody has written this layer down, so nobody
has noticed that the contracts P5 is about to freeze have never been exercised by it.**

### Why this is a _freeze_ problem and not a _later_ problem — the cost of delay

**P5 freezes `BimObjectType`, `Command` (with its `argsSchema`), and `SubShapeRef`.** Those are precisely the
contracts a tool layer pushes on. Three concrete collisions, none of which anyone has had to answer yet
because no tool has ever been built:

1. **How is a wall parameterised?** Today (fixture and scaffold alike) a wall is `{length, height}` plus a
   `placement` array of rigid motions. In every real BIM tool a wall is authored and edited **by its
   baseline** — two points — and its length is _derived_. This is not cosmetic: **"drag the wall's free
   end"** is the single most common gesture in BIM, and under the current parameterisation it is a
   _compound_ change to `length` **and** `placement` simultaneously — which **no command expresses.** Domain
   rule 9 then bites: _if no Command expresses it, the UI does not do it._ So the frozen contract would make
   the most ordinary gesture in the product either impossible or a private path that breaks D19.
2. **There is no command that moves an element.** The twelve core commands are all CRUD on the model
   (`createElement`, `setParams`, `updateStyle`, `deleteElement`, `retargetReference`, `setClassification`,
   `createStyle`, `createMaterial`, `createSection`, `createContainer`, `createGrid`, `issueRevision`).
   `placement` is set at creation and **can never be changed**. P5 step 7 does list `move/rotate/copy/array`
   — good — but their arg shapes have never met a pointing device, and they freeze on arrival.
3. **Nothing in the product can answer a geometric question in world space.** The agent surface's rule is
   _"queries return SEMANTICS, never triangles"_ (`agent.ts`), and its `Query` filters are
   `typeId · styleId · containerId · materialId · loadBearing · discipline` — **not one spatial predicate.**
   The render seam returns only triangles. **Every snap, every inference line, every dimension witness, every
   alignment guide is a geometric question in world space**, and no seam in the app can ask one. (The
   _kernel_ can — `distance`, `bounds`, `classifyPoint` are all live ops. The _document_ and the _renderer_
   simply never expose them.)

**Cost now:** a design session and a document. Possibly one reserved command shape or one optional field —
exactly the move this project already made, correctly and cheaply, for `sectionCut`, `importIfc`,
`instantiate`, `exportBrep`. _"The expensive thing to get wrong is the payload shape, not the body."_

**Cost after P5:** a contract amendment to `Command`/`BimObjectType` — the contracts **Miqdar and Planitor
bind to** — plus a migration of every saved `.bnn`. And it would be discovered the day someone finally sits
down to build a wall tool, which is the same way this project has discovered **every** significant gap it has
ever had.

**This is the answer to `review_prompt.md` §7.** If P4/P5 ship as they are, the thing discovered in six
months, costing a contract amendment and a migration, traceable to a question nobody asked today, is:
**"how does a human actually draw this?"**

---

## 2. WHAT IS OWED A DECISION (the owner's call, not mine)

### D1 — Does an interaction-model design step land **before** the P5 freeze?

- **(a) Yes — write the interaction model now, and reserve what it needs.** _(Recommended.)_ A short document
  answering: what is a tool, how does it collect input from the viewport, what snaps exist, what is a preview,
  how is a wall's geometry parameterised for _drawing_ rather than for _configuring_. Then reserve the command
  shapes it implies before the freeze. **Cost: days. It uses the project's own proven pattern (reserve the
  shape, defer the body).**
- **(b) No — freeze P5 on the current contracts and design the tools in P6+.** Cheaper this month; and it bets
  that a `Command` set never exercised by a pointing device happens to be the right one. **This project's own
  track record says that bet loses** (P2's op set was declared complete twice and could not build a floor
  plate).

### D2 — The kernel download-size call was due **before P4**, and P4 has started

`current_state.md` §4j-5 says, in writing: _"The kernel is 4.19 MB gzip. **An owner call is due before P4.**"_
**P4 began in Entry 22 and no call was made.** The levers are still the ones recorded there: accept it (the
service worker caches it once, D11); lazy-load it behind the app shell; or split core from booleans/fillet.
Related and also now due: P1 step 8's **first-load size/time budget check on a throttled profile**, whose exit
criterion was deferred with the note _"(First-load budget: pending the app.)"_ — **the app now exists.**

_Not a re-litigation: a deadline the documents set for themselves passed silently. I am reporting that it
passed, which is what §6 of the review brief asks for._

---

## 3. WHAT IS GENUINELY FINE — and exactly how I checked

A review that reports only problems teaches nothing about coverage. These I actively tried to break and could
not:

- **`pnpm verify` is green: 186/186 tests, typecheck, eslint, prettier.** I ran it. _(My first run was red
  with 352 eslint errors — that was my own fault for not running `pnpm install` after the pull. It is green.
  Amer's claim holds.)_
- **D19 is real, and it is genuinely machine-checked.** `tests/d19-boundary.test.ts` greps all of `packages/`,
  `apps/` and `tests/` for `from '@bunyan/kernel-client'` against a three-entry allowlist, and separately
  asserts that `packages/document/package.json` does not even _depend_ on the kernel client. I read the test
  and confirmed it covers `apps/` — this is the one gate that does. **No React component holds a
  `KernelClient`.** The rule landed before the code, exactly as designed.
- **The ribbon and the property panel really are generated, not hand-wired.** `Ribbon.tsx` maps over
  `describeCommands(registries)`; `PropertyPanel.tsx` renders `type.parameterSchema` through `SchemaForm`;
  neither file knows a wall has a `length`. Register a command and its button exists. **D21 is honoured here,
  and it is good work.**
- **The edit path is correct and thoughtfully done.** Every edit goes through `dispatch → doc.execute` — the
  one door. The single-flight, trailing-latest runner (`edit/runner.ts`) is a genuinely right piece of
  reasoning: it prevents two concurrent `execute` calls interleaving their heap frees, which
  reject-and-keep-last-good does _not_ protect against. Live slider drags carry `coalesceKey`; discrete edits
  do not. That is the correct distinction.
- **The StrictMode / `window.bunyan` bug and how it was found.** Amer drove the agent surface _as an agent_
  and caught a global pointing at a dead, unseeded document that every DOM-level check had passed. That is
  the project's own second method applied correctly, and it deserves to be said plainly: **it is exactly the
  right instinct.**
- **The rebuild cost matches the project's own recorded number.** My independent harness measured one wall
  param edit at 100–124 ms; `current_state.md` §4j records 127 ms. The document layer behaves as documented.

---

## 4. THE FINDINGS — ordered by cost of delay

### [1] `apps/web` IS OUTSIDE THE TYPECHECK GATE AND OUTSIDE THE TEST RUNNER. CI CANNOT FAIL ON IT.

**WHAT IS CLAIMED.** Entry 23: _"Gates green on this box: typecheck, eslint, 186/186 tests."_ Entry 22:
_"Gates green: `apps/web` typecheck (strict) ✓."_ The project's entire safety culture rests on `pnpm verify`,
and CI runs exactly its five steps.

**WHAT IS TRUE.** I appended this line to `apps/web/src/App.tsx`:

```ts
export const REVIEWER_PROBE: number = 'this is not a number';
```

```
pnpm typecheck   → exit 0   ✅ PASSES
pnpm lint        → exit 0   ✅ PASSES
tsc -p apps/web/tsconfig.json --noEmit
                 → apps/web/src/App.tsx(337,14): error TS2322: Type 'string' is not assignable to type 'number'.
```

The root `typecheck` script is `tsc -p tsconfig.json && … kernel-mock && kernel-occt && document`
(`package.json:16`) — **`apps/web/tsconfig.json` is never invoked by any script and by no CI step.** The root
`tsconfig.json` includes only `packages/*/src/**/*.ts` and `tests/**/*.ts` (and only `.ts`, never `.tsx`).
And `vitest.config.ts` includes only `tests/**/*.test.ts` — **so `pnpm test` cannot collect a test in
`apps/web` even if one existed.** None does: there are **zero test files anywhere under `apps/`**.

The entire browser app — **1,458 lines of the only surface a user ever touches** — is covered by eslint,
prettier and the D19 grep. Nothing else. Amer typechecked it _by hand_, per-package; that is a manual step CI
does not replicate and the next agent will not know to perform.

**WHY IT MATTERS.** This project's defining lesson is _"a green test suite proves the tests pass; it does not
prove the thing is built."_ It now has a sharper version: **the suite cannot even see half the product.** This
is the same species as Entry 14's finding (_"CI had never been green and could not be"_) — a gate that
everyone believes covers something it structurally cannot. It is also **why findings 2–7 below could all
happen at once, in good faith, with every gate green.**

**COST NOW vs LATER.** **Two lines today** (add `tsc -p apps/web/tsconfig.json` to the `typecheck` script;
add `apps/**/*.test.ts*` to the vitest `include`). Later: the UI grows through P4, P5 and P6 into the largest
package in the repo with no machine coverage at all, and the first regression is found by the owner, in a
browser, the way this one was.

**RECOMMENDATION.** Fix the gate **before** any more UI is written. Then the P4 exit criteria become
assertable rather than aspirational.

#### [1b] ⚠⚠ AND WHILE PROVING THAT, I FOUND CI IS **RED ON `main` RIGHT NOW** — ENTRY 14'S BUG, LITERALLY, FOR THE THIRD TIME

**WHAT IS CLAIMED.** Entry 23: _"Gates green on this box."_ `current_state.md` §6: _"`pnpm verify` — **the one
command that must stay green**."_

**WHAT IS TRUE.** `pnpm verify` is `typecheck && lint && test`. **CI runs five steps:** typecheck · lint ·
**`format:check`** · test · re-seed gate. **So `pnpm verify` can be green while CI is red — and it is:**

```
$ pnpm format:check
[warn] package.json                       ← FAILS on the COMMITTED tree
$ npx prettier package.json | diff package.json -
<     "onlyBuiltDependencies": ["esbuild"]        ← as committed in 3a6d068 (Entry 22)
>     "onlyBuiltDependencies": [
>       "esbuild"                                 ← what prettier requires
>     ]
$ git show 03ed47c:package.json | npx prettier --check   → All matched files use Prettier code style!
```

**The previous commit passes. The current one fails.** The offending line is the `pnpm.onlyBuiltDependencies`
key Amer added in Entry 22 so that Vite could start — a completely reasonable change, formatted by hand.

**WHY IT MATTERS.** `current_state.md` §7 records Entry 14 in these words: _"**CI was never green because it
could not be** — `format:check` runs **before** the tests and failed on the committed tree. **Nobody needed
the Actions tab: CI's steps are commands, and they run on this box.**"_ That lesson was learned, written
down, and **promoted into §1** — **and it has now happened again, for the same reason, because the one
command everybody runs (`verify`) does not run the gate that breaks (`format:check`).**

**COST NOW vs LATER.** One line in `package.json`, plus one line in the `verify` script.

**RECOMMENDATION.** **Make `verify` the CI step list, exactly** — add `format:check` and the re-seed gate.
**A local gate that is a strict subset of the remote gate is not a gate; it is a false-negative generator**,
and it has now told three sessions "green" while CI failed.

---

### [2] P4'S OWN NAMED ENFORCEMENT MECHANISM — THE D19 EQUIVALENCE TEST — DOES NOT EXIST

**WHAT IS CLAIMED.** `v1.0.0_imp_plan.md` P4 exit criteria, verbatim:

> **The equivalence test:** _anything a human can do in the shell, an agent can do through `window.bunyan`_ —
> demonstrated by driving the same end-to-end edit both ways and asserting the **same resulting document
> state and the same `UndoableEdit`**. **This test is the enforcement mechanism for the whole agent-native
> decision; without it, D19 is a good intention.**

**WHAT IS TRUE.** It does not exist. `grep -rln "equivalence\|same UndoableEdit\|both ways" tests/` returns
nothing. The D19 _import boundary_ is machine-checked (and that part is real — see §3); the D19 _behavioural
equivalence_ is not checked at all.

**WHY IT MATTERS.** Agent-native authoring is a **declared north-star** (`core_logic.md` §9) and D19 is the
ruling that serves it. The plan says in its own words what happens without this test. And the two surfaces
have _already_ diverged once in a way only agent-driving caught — that is the StrictMode bug in Entry 23.
That was found by hand. Nothing would catch the next one.

**COST NOW vs LATER.** One test, today, while there are twelve commands and one type. After P5 the surfaces
are frozen and the test becomes an audit of a year of drift.

**RECOMMENDATION.** Write it now, and make it a P4 exit gate. It is cheap precisely because the app is small.
_(It also cannot run until finding [1] is fixed — which is the argument for fixing [1] first.)_

---

### [3] ONE PARAMETER EDIT RE-TESSELLATES THE ENTIRE MODEL. 90% OF EVERY EDIT IS REDUNDANT WORK.

**WHAT IS CLAIMED.** P4 step 2, verbatim: _"Build the tessellation pipeline … **incremental re-tessellation
on edits**; dispose/regenerate meshes as pure display artifacts."_

**WHAT IS TRUE.** There is no incremental path. `App.tsx:151-162` recomputes `renderParts` — **every part of
every element in the document** — on every `version` bump; that is a new array identity, so
`ViewportCanvas.tsx:45-47`'s effect fires, and `Viewport.setElement()` (`Viewport.ts:78-101`) awaits
`tessellate(handle)` **for every part in the document** and rebuilds every `BufferGeometry` and every
`THREE.Mesh` from scratch. Every edit. Including every committed frame of a slider drag.

I measured it against the **real OCCT WASM**, on the same 5-storey building the project's own D29 measurement
uses (`tests/document-scale.test.ts`), at the app's own display deflection of 5 mm:

```
                                      rebuild        REDRAW ALL        redraw only        TOTAL
                                      1 wall         (as built)        the changed wall   PER EDIT
  1 storey    39 elements   62 solids   102 ms          175 ms            10.4 ms           277 ms
  3 storeys  117 elements  186 solids   124 ms          538 ms            17.2 ms           662 ms
  5 storeys  195 elements  310 solids   100 ms          865 ms            12.0 ms           965 ms
```

**Read the columns, not the rows.** The **rebuild is flat** (~100–124 ms — it is always one wall). The
**redraw grows linearly** with the whole model (~2.8 ms per solid). At 195 elements, **865 ms of the 965 ms an
edit costs is spent re-tessellating 309 solids that did not change.** Redrawing only the wall that actually
changed costs **12 ms** — the edit would be roughly **nine times faster**. Extrapolated to a 2,000-solid
project: **~5.6 seconds per edit**, per drag frame.

_(Measured in Node over `InProcessTransport`, not in a browser worker — so the absolute milliseconds will
differ in the browser. The **ratio is architectural, not environmental**: 90% of the work is redundant
wherever it runs.)_

**And the render path has no coalescing at all.** `RenderGateway.tessellate` passes no `coalesceKey`
(`RenderGateway.ts:42-44`), so during a drag each committed frame queues another N tessellations into the
worker behind the previous frame's. `Viewport`'s `#frame` guard discards _stale results_ — **after the kernel
has already computed them.** The single-flight runner disciplines the _document_ path; the _render_ path is
undisciplined, and the backlog grows with the drag.

**WHY IT MATTERS — and this is the part that could waste a phase.** The project has three carefully-reasoned
performance levers, one of which (`instantiate`) was **reserved in the frozen protocol** specifically to fix
the 21-second style edit, and another of which (the D29 BREP cache) the owner **ruled to ship**. All three
attack the **kernel rebuild**. **None of them touches this.** After `instantiate` collapses 400 booleans to
one, a single-element edit on a 195-element building will _still_ cost ~865 ms — and the temptation will be
to conclude the kernel is still too slow and reach for multithreading. **The dominant interactive cost in the
app as built is not in the kernel at all. It is in a redraw that has no incremental path**, and it is
invisible to every measurement the project has taken, because every measurement so far was taken _below_ the
renderer.

**COST NOW vs LATER.** **Cheap now, and the information is already in hand:** `doc.execute` returns the
`UndoableEdit`, and `edit.changes` already names exactly which elements changed — `App.tsx:199-202` reads it
for selection and then throws it away. Keying the render cache by part `nodeId` and re-tessellating only the
dirty parts is a contained change to two files, _today, while there are two of them_. Later it is a rewrite of
a renderer that picking, highlighting, section views and 2D views will all have been built on top of.

**RECOMMENDATION.** Make the redraw incremental before building picking on top of it — and record the number,
because it changes how the _next_ performance decision should be read.

---

### [4] THE PROVENANCE MAP IS PROMISED IN THREE COMMENTS AND AN ENTRY, AND DROPPED BY THE CODE

**WHAT IS CLAIMED.** `Viewport.ts:7` — _"consumes `MeshBuffers` + provenance so sub-shape picking (P4 step 4)
can be layered on without reshaping it."_ `Viewport.ts:141` — _"The provenance map rides along for picking."_
`RenderGateway.ts:24` — _"Tessellate … into a mesh + its provenance map (the substrate for sub-shape
picking)."_ Entry 22 — _"The provenance map is carried through `MeshBuffers` for sub-shape picking."_

**WHAT IS TRUE.** `grep -rn "provenance" apps/web/src/` returns **three comments and zero lines of code.**
`toBufferGeometry` (`Viewport.ts:142-148`) reads `positions`, `normals` and `indices`, and lets `provenance`,
`edgePositions` and `bounds` go out of scope with the `MeshBuffers` object. Nothing retains them. _(Because
`edgePositions` is also dropped, the model has no rendered edges at all — which is a large part of why it
reads as a 3D-viewer toy rather than a CAD viewport.)_

**This is the BREP-cache signature that `current_state.md` §1 explicitly teaches**: _a promised thing that
appears only in prose and comments._ It was the finding of Entry 13, and it is here again, nine entries later.

**And the claim that picking "can be layered on without reshaping it" is not true.** `RenderPart` is
`{ handle, color }` (`Viewport.ts:21-24`) — **it carries no identity at all**: no element id, no part name, no
`nodeId`. A picked triangle cannot be traced to an element, let alone to a `SubShapeRef`. That one narrow
type is simultaneously what blocks **sub-shape picking**, **incremental redraw** (finding 3), **hover
highlighting**, and **render coalescing**. It is the cheapest high-leverage fix in this review.

**COST NOW vs LATER.** Trivial now (widen `RenderPart`, keep the mesh's provenance beside its geometry).
Later, every renderer feature is built on a type that cannot name what it drew.

---

### [5] THE APP MATCHES SUPERSEDED DRAG FRAMES BY GREPPING ENGLISH PROSE — AND A TYPED CODE ALREADY EXISTS

**WHAT IS CLAIMED.** The protocol is **FROZEN** with 15 typed failure codes, one of which is `SUPERSEDED`,
precisely so that no consumer has to parse a message.

**WHAT IS TRUE.** `edit/runner.ts:81-87`:

```ts
export function isSuperseded(error: unknown): boolean {
  return (
    error instanceof CommandFailure &&
    error.code === 'GEOMETRY_FAILED' &&
    /superseded/i.test(error.message)
  ); // ← matching on English prose
}
```

The kernel raises the typed code at `kernel-client/src/client.ts:185`
(`kernelFailure('SUPERSEDED', 'Superseded by a newer edit on "…"')`). The document layer then **discards that
code** and re-throws everything as `GEOMETRY_FAILED`, embedding the original text in a concatenated message
(`document.ts:260-264`). The app recovers the lost information **by regular expression.** It works today —
I traced the whole path — and it works only as long as nobody rewords a string.

**WHY IT MATTERS.** Reword that message and **every intermediate frame of every slider drag stops being
swallowed and raises a red error banner in the user's face instead.** Nothing would catch it: `apps/web` has
no tests and no typecheck (finding 1). In the other direction, any genuine geometry failure whose message
happens to contain the word "superseded" is silently swallowed. **A frozen protocol went to the trouble of
typing this, and the information is being thrown away one layer above it and reconstructed from prose.**

**COST NOW vs LATER.** Free today: preserve the kernel's failure code through the document boundary (either a
`SUPERSEDED` `CommandFailure` code, or a `cause` field on it). **`CommandFailure`'s code set is part of the
document contract, and that freezes at P5.**

---

### [6] `GeometryGateway` CLAIMS TO EXCLUDE `tessellate`. IT DOES NOT — AND TWO D19 ARGUMENTS REST ON THAT.

**WHAT IS CLAIMED.** `packages/document/src/geometry.ts:36-38`: _"⚠ It is deliberately **NOT** all of
`OpMap`. **`tessellate` is absent**: … A document-layer call that wanted a mesh would be a document layer that
had started rendering."_ And `RenderGateway.ts:9` builds the entire justification for the render seam on it:
_"`GeometryGateway` **deliberately omits** `tessellate` because the *document* must never render."_

**WHAT IS TRUE.** `GeometryGateway.request<Op extends OpName>` where `OpName = keyof OpMap`
(`protocol/src/ops.ts:682`) — **and `tessellate` is in `OpMap` (`ops.ts:661`).** The gateway is _all_ of
`OpMap`. I proved it: a probe module calling `g.request('tessellate', …)` on a `GeometryGateway`
**typechecks cleanly** under `tsc -p packages/document/tsconfig.json`.

**WHY IT MATTERS.** Small, but it is the _"which one is stale — the comment or the code?"_ class, and here
the answer is that **two files assert a structural guarantee that the type system does not make.** The D19
import boundary is genuinely enforced (see §3); _this particular narrowing_ is enforced only by a comment,
and the project's own rule is that a rule enforced by a comment is worthless.

**COST NOW vs LATER.** One line, free: `Exclude<OpName, 'tessellate'>`. It is worth doing precisely because
the D19 story is one of this project's genuinely strong assets and should not rest on a false premise.

---

### [7] THE TWO FAILURE STATES THE DOCUMENT MODEL EXISTS TO SURFACE ARE INVISIBLE — AND WORSE, SILENTLY SO

**WHAT IS CLAIMED.** `current_state.md` §5, under _"TWO NEW THINGS THE UI NOW HAS TO SHOW"_: `doc.unbuildable()`
(D43 — _"**Show it**, greyed, with its reason, and never offer to fix or drop it"_) and `doc.brokenRefs()`
(domain rule 3 — _"marked, visible, never auto-healed"_).

**WHAT IS TRUE.** `grep -rn "unbuildable\|brokenRefs\|changeFeed\|saveBnn" apps/web/src/` → **zero hits.**
Amer correctly lists this as not-done (Entry 23 §5 item 5), so it is not a surprise. **But the current
behaviour is worse than "not built":** `App.tsx:151-162` does `if (parts === undefined) continue` — so an
element that cannot be built is **silently skipped and simply does not appear.** A Miqdar column in a file
someone opened to look at is not greyed out with a reason; **it is not there at all**, with no indication that
anything is missing.

**COST NOW vs LATER.** Small either way — but it should be logged as a P4 exit item rather than carried as a
to-do, because "invisible" is the one outcome D43 was specifically ruled to prevent.

---

## 5. HUNT 2 — P4's OWN STEP LIST, READ AGAINST THE CODE

_This is the check that would have caught `extrude`/`chamfer`/`revolve`. It takes a minute per step._

| P4 step                                                                                      | Status       | Evidence                                                                                                    |
| -------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------- |
| 1. `WebGPURenderer` + WebGL2 fallback; **both boot on the deployed build**                   | ❌           | `THREE.WebGLRenderer` only (`Viewport.ts:40`). No WebGPU, no fallback, no deploy.                           |
| 2. Tessellation pipeline · **retain provenance** · **incremental re-tessellation** · dispose | ⚠ **2 of 4** | Buffers→geometry ✅, dispose ✅. **Provenance dropped (finding 4). Incremental redraw absent (finding 3).** |
| 3. Camera orbit/pan/zoom, grid, axes, mm world                                               | ✅           | `OrbitControls`, `GridHelper`, `AxesHelper`, Z-up, mm. Genuinely done.                                      |
| 4. Selection & **sub-shape picking** → `SubShapeRef` via provenance                          | ❌           | Zero `Raycaster`, zero pointer handlers on the canvas. Selection is a `<select>` dropdown.                  |
| 5. React shell; **ribbon generated from the registry**                                       | ✅           | `describeCommands` → buttons, zero hand-wiring. Good work.                                                  |
| 6. **Auto property panel** from `parameterSchema`; coalesced edits; typed failures surfaced  | ✅           | `SchemaForm` over the schema; single-flight runner; `coalesceKey` on drags; dismissible banner. Good work.  |
| 7. TSL shading (no raw GLSL)                                                                 | ❌           | `MeshStandardMaterial`. No TSL.                                                                             |
| 8. Undo/redo wired to **keyboard** + UI                                                      | ⚠            | UI buttons ✅. **Zero `keydown`/`onKeyDown` handlers in the entire app.** No keyboard anywhere.             |

| P4 exit criterion                                                                                                                  | Status                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Type renders, **is selectable (face/edge → valid `SubShapeRef`)**, params editable, forced failure = clean error + no partial edit | ⚠ **half** — renders ✅, params ✅, error ✅; **selection-to-`SubShapeRef` ❌** |
| Ribbon shows exactly the registered commands; a stub command appears with zero UI edits                                            | ✅ true by construction — **but no test asserts it**                            |
| Renders on **both** WebGPU and WebGL2; **visual regression from this phase on**                                                    | ❌ neither                                                                      |
| D19 machine-checked **+ THE EQUIVALENCE TEST**                                                                                     | ⚠ boundary ✅ — **equivalence test does not exist (finding 2)**                 |

**P4 is roughly 40% complete, and Amer says so himself** (Entry 23 §5 lists items 3–6 as outstanding). **That
is not the finding.** The finding is that **the missing 60% is exactly the part that makes it a CAD
application rather than a form over a database** — and that **nothing in the machine will ever say so**,
because P4 has no gate and `apps/web` has no coverage (finding 1).

---

## 6. MY COVERAGE — what this review would NOT have caught

Stated plainly, because a review that looks exhaustive and is not retires suspicion it did not earn — and
this project has done that once already.

- **I never ran the app.** This box is headless; there is no browser and no GPU. Everything I claim about the
  renderer is read from the code or measured at the kernel seam beneath it. **If the three.js layer is wrong
  in a way that only shows on screen, I would not have seen it.** Amer's browser verification is real and
  complementary, and this review does not replace it.
- **My scale numbers are Node + `InProcessTransport`, not browser + Worker.** The redundancy ratio is
  structural and holds anywhere; the absolute milliseconds in a browser will differ.
- **I did not audit `SchemaForm`'s JSON textarea for hostile input**, nor the `.bnn` load path in a browser
  (it is not wired yet).
- **I did not re-verify the document layer or the kernel.** Entries 19 and 21 did that thoroughly and every
  fix there is revert-verified. I took P3 as sound and spent my time on the new code and on the question the
  P3 review could not ask: _what does the domain demand that nobody has written down?_
- **I did not read `Miqdar_v1.0.0_spec.md` §3.4** (the P5 freeze gate). It is still owed, and it is now
  entangled with finding [1] of this review: **if the interaction model changes the type contracts, the
  Miqdar gate must be cleared against the changed ones, not the current ones.**

---

## 7. THE ONE-PARAGRAPH VERDICT

**The direction is right and the foundations are unusually strong.** The kernel, the naming system, the
document model and the D19 command layer are the hard parts, and they are genuinely built, genuinely
verified, and genuinely better than the products this project intends to beat — the persistent-identity moat
is real and is worth what the documents say it is worth. **Amer's P4 work is competent and faithful, and his
method (driving the agent surface as a first-class actor) caught a bug no happy-path check would have.**

**What is missing is a layer nobody has written down.** Bunyan has built, with great care, _everything a
building needs in order to be true_ — and almost nothing of _how a human draws one_. That is why the UI reads
as primitive next to ArchiCAD, and it will keep reading that way no matter how good the kernel gets, because
the gap is not in the geometry and not in Amer's React. **It is in the specification.** The good news is the
timing: **the contracts have not frozen yet**, the app is 1,458 lines, and this project has a proven,
cheap pattern for exactly this situation — _reserve the shape before the freeze, defer the body._ The window
to use it closes at P5.
