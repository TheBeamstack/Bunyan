# T-009 — Q18: a hosted void may only host on its host's own base part

**Seat:** `zayd` (builder, box — headless). **Date:** 2026-08-16. **Decisions:** D84 (the ruling), D12,
D51. **Task:** `docs/BACKLOG.md` T-009.

## 1. What was missing

`hostedBy`'s resolution (`packages/document/src/build.ts`, step 2) matches an opening's `hostRef` against
its host's **BASE parts** — built via `type.buildGeometry` **before** any of the host's voids are cut
(step 1). A `hostRef` naming a face a cut itself created or modified can never be found there: it lands in
`brokenRefs()` and the opening builds `state: 'broken-ref'`, discovered only at the next rebuild — never at
the moment the bad reference was authored. Nothing before this PR checked a `hostRef` at create/retarget
time at all.

**Measured the trigger, headlessly.** A single-layer wall + a door whose sill is coincident with the wall's
own base (`offsetV: 0`) leaves OCCT reporting that boundary **Modified**, not merely holed, so the cut's
naming pass (`kernel-occt/naming.ts`, `REL_DERIVE`) mints a genuinely derived FACE token there:

```
wall-…structure~opening-…/face/cut(wall-…structure.face.z-min~0)#0
```

— `kind: 'face'`, `nodeId` containing `~` (`cutNodeId`'s own separator), `role` starting `cut(`. This is
the exact shape "a face of the wall as already cut" names: a real, minted, pickable token that is not the
host's own pristine face, and today's resolution accepts it as an opening's `hostRef` without complaint. A
window with a sill (`offsetV > 0`, not touching any wall boundary) does **not** reproduce this — an
interior hole leaves the enclosing face's own token passed through unchanged (`REL_INHERIT`, the comment at
`geometry.ts`'s `cutNodeId` — "the wall's own faces keep their own tokens through the boolean"), so this is
narrower than "any second opening" and specifically about a void that touches/coincides with an existing
boundary or a prior cut's own reveal.

## 2. The fix

One new pure function, `requireHostFaceIsBasePart(hostId, hostRef)` in
`packages/document/src/commands.ts`, called from both places a `hostRef` is ever set:

- **`core.createElement`** — right after `hostId` is validated to exist, before anything else is built
  from `args`.
- **`core.retargetReference`** — right after the belongs-to-cycle guard, before the edit is built. D51's
  own text is "generalised to every reference" — retargeting is the *other* door onto a host face, and
  the identical hazard applies there (an agent, or the owner's own manual-repair UI, could retarget a
  broken reference straight onto a derived face and get a second silent break instead of a fix).

**The check, and why it is legitimate here and nowhere else:** `decodeSubShapeRef(hostRef)` (a real,
structured decode — not string-splitting), then refuse if `nodeId.includes('~')` or
`role.startsWith('cut(')`. Both are **structural facts this package owns and guarantees**, not an inference
from an opaque string:

- `checkNameSafe` (already in this file, unchanged) refuses `~` in every authored name (layer, style,
  material). `cutNodeId` (`geometry.ts`) is the **only** code in the product that ever writes `~` into a
  `nodeId`. So `~`'s presence in a `hostRef` can only ever mean "this node came from a cut," full stop —
  there is no authored id it could be confused with.
- `derivedRole` (`kernel-occt/naming.ts`) always composes a derived face/edge's role as `` `${opTag}(...)` ``,
  and the cut op's own `opTag` is literally `'cut'` (`build.ts`'s `request('boolean', { kind: 'cut', ... })`),
  so a role beginning `cut(` names the same fact one operation later, in case a token's node segment were
  ever inherited from a **prior** cut on a chained derivation (a face genuinely on the cut's own new
  surface, not merely a face the cut passed through).

`apps/web` cannot make this same check — *"ids are opaque, never parse them"* is standing there, correctly,
because it has no guarantee about a string it did not mint. `@bunyan/document` **did** mint it (`cutNodeId`,
`derivedRole`'s `opTag`), so reading its own format back is not a parse of an opaque id, it is the layer
that owns the format checking its own invariant — the same justification `layerNameOfRef`/`checkNameSafe`
already rely on for the D51 style-rename case, a few dozen lines above.

**Deliberately not built:** the "louder" alternative D84 rejected — `core.createElement` refusing a
derived-node `hostRef` with no explanation and no way for the caller to find a valid face instead. This
refusal names *why* (nodeId vs. role, and which) and says what to do about it ("pick a face of the host as
it exists before any hosted void cuts it"); giving `apps/web`'s picking gesture a way to *offer* a valid
face rather than hand back a derived one is `apps/web` work, `T-010`, which this task is deliberately split
from (machine: `pc`) and does not touch.

## 3. Verification

`pnpm verify`: **PASS**, exit 0 — `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test &&
pnpm reseed:check && pnpm docs:check`, all six gates green. Main suite: **95 files, 902 tests**, real OCCT
WASM kernel throughout (`tests/document-openings.test.ts` builds real geometry, no mock). `docs:check`
subset: **8 files, 146 tests**. `tests/freeze-boundary.test.ts` green ⇒ the frozen surface has not moved —
**RISK: additive** (touches only `packages/document/src/commands.ts` and
`tests/document-openings.test.ts`, no frozen byte, no new type/format).

**Revert-verified, live.** Neutralised the guard's condition (`if (false && (...))`) and re-ran
`vitest run tests/document-openings.test.ts`: **2 of 14 RED** — exactly the two new tests, both failing on
`.rejects.toThrow(/own base part/)` because `createElement`/`retargetReference` now silently accepted the
derived face and the assertion never threw. Restored the real condition: **14/14 green** again.

## 4. What the tests assert (`tests/document-openings.test.ts`)

Two new `it`s, both against the real kernel, both reproducing the defect by calling the **verb**
(`core.createElement` / `core.retargetReference`) directly with a derived `hostRef` obtained from a real
build — never a simulated UI gesture, per the task's own `done-when:` ("an agent calling `core.createElement`
with the same ref gets the same broken element, so the test goes through the verb, not through the
gesture"):

- **`D84 — createElement REFUSES a host face a prior cut already created or modified`** — builds a wall,
  cuts a door touching the floor (`offsetV: 0`), harvests a genuinely derived face ref
  (`interior.refs.find(ref => ref.includes('/face/cut('))`, asserted to exist so the test cannot pass
  vacuously if the fixture ever stops reproducing the trigger), then asserts a second `createElement`
  hosted on it throws `/own base part/` — **and** that `doc.brokenRefs()` stays empty (refused, not
  silently broken).
- **`D84 — retargetReference REFUSES a host face a prior cut already created or modified`** — same
  harvest, against `core.retargetReference` on an existing (validly-hosted) opening.

Both tests would pass **vacuously** if the fixture stopped producing a derived face at all, which is why
each asserts the harvested ref is defined before using it — a green run this way is worthless (`REVIEW.md`
item 6, weak-green).

**Unaffected, confirmed by the full suite staying green:** every existing test that retargets onto a
fabricated-but-nonexistent face (`.../face/does-not-exist#0`) or an existing **edge** ref — neither carries
`~` in its node segment nor a `cut(`-prefixed role, so both still reach `broken-ref` exactly as before; the
"a second window does not re-target the first" test still reuses the **pristine** captured `hostFace` for
both windows and is untouched by this guard.

## 5. What this does NOT cover

- **The browser picking gesture itself** — `T-010` (`machine: pc`), which needs `amer`/`khalihlna` to
  measure and fix in a real browser. This PR gives the tool a *reason* (the refusal's message) but not yet
  a *replacement face* to offer; wiring the pick to resolve against the host's base parts (or to retry
  against a document-layer query) is that task's work, not this one's.
- **A structural "is this really the same host" check across chained cuts** beyond the two signals above —
  not needed: `nodeId.includes('~')` is a strict superset of "derived by any cut anywhere in this host's
  own DAG," since every derivation walks back through at least one `cutNodeId`-minted segment.

## 6. Backward sweep (invariant 7)

`hostRef` is set in exactly two places in the whole document layer — `core.createElement` and
`core.retargetReference` — both are now guarded; grepped for every other write of `.hostRef` in
`packages/document/src/*.ts` (`elementChange`/`layerRenameReferrers`'s `redirect`, D51's own style-rename
retarget) and confirmed those **rewrite** an existing, already-valid `hostRef`'s layer-name segment (a pure
string substitution keeping the same face, just renamed) rather than accepting a new one from a caller — no
second, unguarded door.

## 7. Files

- `packages/document/src/commands.ts` — `requireHostFaceIsBasePart` NEW (private); called from
  `createElementCommand.execute` and `retargetReferenceCommand.execute`; `decodeSubShapeRef` import added.
- `tests/document-openings.test.ts` — two new `it`s (+2), both real-kernel, both revert-verified.
