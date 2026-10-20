# T-035 — Q8 — design: moving a D52 baseline wall, properly

- seat: zayd (builder, box) · account: davidian-abdo
- branch: `task/T-035-q8-design-moving-a-d52-baseline-wall-pro`
- task: `docs/BACKLOG.md` T-035 · risk: normal · implements: D95 · D52 · D80 · P4.5 design §9

## Changed

- `docs/design/P4.5_baseline_move_design.md` (new): D95's free-text verbatim; the measured refusal; the ten
  baseline readers; candidates A (`ParamField.motion?` schema tag, recommended), B (`BimObjectType.applyMotion?`)
  and C (fold placement into `baselineOf`, rejected); mirror; joins; T-036 and Q20 dependencies.
- `docs/OWNER-DECISIONS.md`: `D-20261012-03` (mechanism, default `annotation`) and `D-20261012-04`
  (does a moved wall drag its joined walls, default `detach`).

## Verified

- `pnpm exec vitest run tests/t035-probe.test.ts --silent=false --reporter=verbose` with the probe in the
  design doc's §A: `core.move`/`copy`/`rotate`/`setPlacement` REFUSED at the `baseline` rung on both demo
  walls (8 of 8); `core.setParams` with both endpoints moved ACCEPTED (2 of 2). Probe file deleted after.
- `kind: 'point'` types directions too: `commands.ts` `normal`/`direction`/`axis`/`by`; `wall.ts` types
  `start`/`end` as `kind: 'array'` — why A needs a new member rather than reading `kind`.
- `pnpm verify` — result in the finish output.

## done-when

- Doc exists, under 400 lines (273), quotes D95 verbatim: yes.
- Refusal measured with a named command; every baseline derivation named (§2): yes.
- Mechanism outside D95's two rejected options, three candidates with frozen-surface cost and pre-step-6
  timing; Revit/Archicad/Rhino: yes, marked `unverified here: §4's three rows — hmdnah to confirm`.
- T-036 and `D-20261007-08` dependencies (§7): yes.
- Open questions are `D-` records with options and defaults; no code changes: yes.

## notes

- WebSearch permission was not granted on this box, so §4 cites API names from the author's knowledge only.
- A or B must land before P5 step 6 (each adds a member to a watched file ⇒ contract-touching, owner merge).
- T-036 stays `blocked`; the steward sequences a build row for the chosen mechanism after `D-20261012-03`.
