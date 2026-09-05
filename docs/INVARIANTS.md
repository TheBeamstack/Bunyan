# INVARIANTS.md — what is true of Bunyan, and only of Bunyan

The turn protocol is org-wide and lives in `diwan/AGENTS.md`; the review protocol in
`diwan/docs/REVIEW-PROMPT.md`. This file is everything those two cannot carry because it is not true
of every repo. Paths, gate commands and git identity are `.agent.toml` at the root.

**What this repo is.** _Bunyan_ — a browser-native, serverless, parametric BIM/CAD authoring platform.
An exact B-Rep kernel (OpenCascade/OCCT compiled to WebAssembly) computes geometry; the design is
stored as a _parametric recipe_, and meshes/2D views are disposable projections of it.

## 1. Product invariants

Numbering is preserved: `docs/BACKLOG.md` and the handoff record cite these as `AGENTS.md §4.N`.

1. **B-Rep is the source of truth; the parametric recipe is the source of truth for the B-Rep.**
   Meshes and 2D views are disposable projections, never persisted as truth. The one non-negotiable
   invariant — everything else follows from it.
2. **Persistent naming is derivation, never a geometric index** (D1). A `SubShapeRef` is a path
   through the op DAG, assigned when an op runs and propagated forward — never recovered by matching
   geometry after the fact. The project's #1 risk, and why `tests/naming-*.test.ts` exist.
3. Protocol: `diwan/docs/REVIEW-PROMPT.md` item 1 (a fix without a test that fails in its absence is
   an assertion; the reviewer independently re-runs one revert per PR).
4. Protocol: `REVIEW-PROMPT.md` item 5 (measure, don't assert — a claim with no method is not done).
5. **Additive only until the owner freezes** (D13). Adding a command/type/format/view is a
   registration; changing a frozen shape's envelope is `RISK: contract-touching`, decided mechanically
   by `tests/freeze-boundary.test.ts` against `tests/frozen-surface.snapshot.json` — never by
   judgement. See §4.
6. **`DocumentContext` is the only door** (D19). Nothing outside `@bunyan/document` touches the kernel
   or `scene.json` directly; `apps/web` builds against the document layer, never the kernel client.
   Enforced by `tests/d19-boundary.test.ts`; `apps/web/src/bootstrap.ts` is the one allowed
   `KernelClient` holder.
7. Protocol: `REVIEW-PROMPT.md` item 2 (a new rule binds the next consumer and nothing else; sweep
   backward). Bunyan's base rate the one time this was done exhaustively: **9 dirty of 18**.
8. Protocol: `REVIEW-PROMPT.md` item 6 (weak green).
9. **The verification split is real, and it is a debt that accumulates.** GL-only code is
   browser-verified; everything with logic in it is headless-verified. Only `amer`/`khalihlna` may
   report a browser claim as passing — `zayd`/`hmdnah` write `unverified here: <claim> — khalihlna to
confirm`, and clearing it is the pc seat's first action next session. Keep logic headless wherever
   possible: anything left browser-only is a review item only one seat can ever discharge.
10. Protocol: `diwan/AGENTS.md §6` (nothing is deleted from the record).
11. **Box discipline is binding** (`docs/CURRENT_STATE.md §6a`). `zayd` and `hmdnah` never overload
    the Hetzner box; `portfolio-caddy-1` and `beamstack-contact` are live production and are never
    valid pause targets.

## 2. Owner-gated — three classes, and only three

Everything else merges on an approving cross-account review and green CI, **including `risk: high`**,
which buys a second review turn rather than the owner's merge. CI labels these `needs-operator/*`
mechanically (`scripts/reserved-classes.mjs`, `.agent.toml [reserved.*]`, `docs/RUNBOOK.md`). Cited
elsewhere as `AGENTS.md §5.N`.

1. **`RISK: contract-touching`** — any diff `tests/freeze-boundary.test.ts` flags against the frozen
   surface. Decided by a machine, not a reviewer's judgement; the reviewer approves, the owner merges.
2. **A legal/contractual figure** — today exactly `CLA.md`'s `<LEGAL ENTITY>` (`open_rulings.md`
   Q11/Q12). Any `CLA.md` change flags: under-labelling costs the licence, over-labelling costs a
   click.
3. **The P5 freeze itself** — the one irreversible act. After it, `tests/frozen-surface.snapshot.json`
   may not move without an owner ruling.

## 3. The spec documents, and precedence

`docs/contracts/` is the source of truth and changes rarely: `core_logic.md` (the domain model),
`architecture.md` (layers, worker protocol, registries), `V1.0.0_spec.md` (scope, D1–D66),
`v1.0.0_imp_plan.md` (phases, exit criteria, the freeze gate). Read on demand per
`docs/CURRENT_STATE.md §0`'s reading order — never worked around. `docs/design/*`, `docs/decisions.md`
and `docs/PHASE_LOG.md` are reference, read on lookup.

**Precedence:** `docs/contracts/` > `v1.0.0_imp_plan.md`'s phase narrative > `docs/CURRENT_STATE.md`,
`open_rulings.md` or an entry's prose. If a build reveals a contract doc is wrong, fix the contract doc
and say so in the entry.

`docs/decisions.md` is the ratified-ruling register (D1–D88). `open_rulings.md` is the owner's open
question list; a missing decision goes there with a recommendation and a cost-if-deferred.

## 4. The frozen surface

|               |                                                                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| baseline      | `tests/frozen-surface.snapshot.json`                                                                                                                           |
| watched       | the 16 files in `scripts/frozen-surface.mjs` `WATCHED` — `packages/protocol/src/*` and `packages/document/src/*`, mirrored into `.agent.toml [frozen_surface]` |
| verdict       | measured against the baseline **as it exists on the base ref**, read with `git show`, never against the working tree the PR may have just rewritten            |
| re-baselining | the owner's act after the P5 freeze; it labels `needs-operator/freeze`                                                                                         |

## 5. The re-seed gate

A change to geometry-producing code must ship re-generated goldens, **and the values must move**.

|               |                                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| sources       | `scripts/reseed-paths.mjs` `GEOMETRY_PATHS`, mirrored into `.agent.toml [reseed]`                                      |
| goldens       | `tests/goldens/`                                                                                                       |
| re-seed with  | `cd tools/oracle && uv run seed-goldens ../../tests/goldens`                                                           |
| clock field   | `seededAt` is stamped every run and excluded from the payload hash — a timestamp-only diff does not discharge the gate |
| honest escape | a `Re-seed-unchanged: <reason>` commit trailer, when the values genuinely did not move                                 |

⚠ **Entries name SOURCE, never a package root.** `packages/kernel-occt/` matches its `package.json`;
`packages/kernel-occt/src/` is the statement about geometry. A gate that cries wolf on a licence field
teaches the next agent to re-baseline real drift.

## 6. `docs/CURRENT_STATE.md` — the router, and its sections

Read in full every session; `§0` says which document answers which question. Cited by section number
throughout the backlog and the handoff record.

|              |                                                                       |
| ------------ | --------------------------------------------------------------------- |
| `§0b`        | the live claim — **script-written, never hand-edited**                |
| `§1c`        | the trap list, standing always-read                                   |
| `§1d`        | durable process/tooling lessons                                       |
| `§5`         | the ✅ CLOSED list — binding; do not redo anything on it              |
| `§6` / `§6a` | environment · box discipline                                          |
| `§7`         | entry abstracts (eight mandatory fields), bodies at `handoff/<seat>/` |
| `§8`         | measured state — **generated by `pnpm state`, never hand-edited**     |

## 7. Measured traps that belong to this repo

- **The `NEXT TURN: REVIEW ONLY` banner does not route the two-step review.** It is written into the
  task branch and read after `git checkout main`, where it has never appeared. The PR's
  `review/step-1` label is what routes (T-014).
- **The budget is about the COMMITTED file.** The pc has `core.autocrlf=true`, so the working tree is
  not the committed file; `tests/docs-budget.test.ts` normalises before measuring, and five of its
  tests once failed only on the machine that does not run CI.
- **Two `§7` heading schemes are live at once, deliberately** (D82). Entries 1–90 keep theirs.
- **`pnpm verify` is the CI step list, exactly** — a local gate that is a strict subset of CI is a
  false-negative generator, and this repo has been bitten by it.
- **Prettier owns these prose docs.** `.prettierignore` exempts `docs/contracts/`, `docs/archive/`,
  `docs/CURRENT_STATE.md`, `docs/decisions.md`, `docs/PHASE_LOG.md`, `handoff/` and the legal texts —
  by **path**. Move a prose document, move its line in the same commit; a stale entry does not error,
  it silently stops exempting the file.

## 8. Where the retired sections went

`AGENTS.md` and `REVIEW.md` are now stubs. Existing citations resolve as:

| Cited as                           | Now                                                        |
| ---------------------------------- | ---------------------------------------------------------- |
| `AGENTS.md §0`                     | `diwan/AGENTS.md §0` · roster `diwan/docs/seats/README.md` |
| `AGENTS.md §1.1` / `§1.2` / `§1.3` | `diwan/AGENTS.md §1`, the role table                       |
| `AGENTS.md §2`                     | `diwan/AGENTS.md §2` · §3 here for precedence              |
| `AGENTS.md §3`                     | `diwan/AGENTS.md §4`                                       |
| `AGENTS.md §4.N`                   | §1 here                                                    |
| `AGENTS.md §5`                     | §2 here                                                    |
| `AGENTS.md §6` / `§7`              | `diwan/AGENTS.md §6` / `§5`                                |
| `REVIEW.md` item N                 | `diwan/docs/REVIEW-PROMPT.md` item N — same numbering      |
| `REVIEW.md §"Two steps"`           | `diwan/docs/REVIEW-PROMPT.md §"Two steps…"`                |
