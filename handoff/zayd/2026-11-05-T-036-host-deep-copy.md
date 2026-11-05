# T-036 — `core.copy` deep-copies a host's openings

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-036-q7-core-copy-deep-copies-a-host-s-openin`
- task: `docs/BACKLOG.md` T-036 · risk: high · implements: D94 · D51 · D80 · D44 · `P4.5_baseline_move_design.md` §7

## Changed

- `packages/document/src/commands.ts` `copyCommand`: the hosted-element refusal is replaced by a deep copy. Each element
  `hostedBy` the source gets a fresh PEI (`ctx.mintId`), `hostId` = the copy, and copies of its datum constraints.
  Its params and placement are copied as they are, because it builds in its host's frame. It is one `ctx.edit`, whose `rebuilt` names the copy and every copied opening.
- New `copiedHostRef`: decodes the token (`decodeSubShapeRef`), takes the part name after `${hostId}.`, rebuilds
  `nodeId` with `partNodeId(copyId, part)`, keeps `kind`/`role`/`occurrence`, and re-encodes it (`encodeSubShapeRef`).
  A ref that does not decode, or is not on one of the host's parts, is REFUSED (D51).
- A sketch constraint or join override on the source refuses with the same message prefix as before; the check now also
  covers each hosted element and anything hosted on it.
- Two tests that pinned the old refusal now assert the deep copy: `tests/wall-motion.test.ts` (D52 wall) and
  `tests/move-verbs-and-transactions.test.ts` (placement-positioned fixture wall).

## Verified

- `pnpm exec vitest run tests/host-deep-copy.test.ts tests/wall-motion.test.ts tests/move-verbs-and-transactions.test.ts` → 35 passed.
- Revert-verify: `copies = ([] as Element[]).map(` in place of `hosted.map(` → `host-deep-copy.test.ts` 2 failed | 2 passed; restored → 4 passed.
- `pnpm verify` → 125 files, 1073 passed, 4 skipped; `docs:check` 5 files, 66 passed.

## done-when

1. The test copies a demo wall with 2 openings (on `lateral.1`/`lateral.3`) `by [0,5000,0]`. The result is 2 new openings with fresh PEIs, each with `hostId` = the copy and a `hostRef` among `doc.partsOf(copy)`'s refs.
   All 3 new elements are `state: 'valid'` in `modelElements()`, and every source row `toEqual`s its value before the copy.
2. The decoded new ref equals the source's `{kind, role, occurrence}` with `nodeId = partNodeId(copy, part)`, which the test asserts.
3. `dryRun` leaves the scene unchanged, and its edit lists both openings on the copy. One `undo()` restores a scene that `toEqual`s the one before the copy, and `brokenRefs()` is `[]` both after the copy and after the undo.
4. A join override (`core.setJoin` butt) and a sketch constraint (on `core.sketchProfile.v1`) still refuse with `cannot be copied exactly: …`.
5. Revert-verified: yes (above).

## notes

- To find the part name, the code takes what follows `${hostId}.` in the node id. That id is written by this package's own `partNodeId`, and D51's layer rename already reads it the same way (`layerNameOfRef`).
