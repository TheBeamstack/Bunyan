/**
 * MEP SYSTEMS & CONNECTORS — RESERVED shapes (D62, Freeze-Gate row Ⓕ; `P5_step5F_reservations_design.md`).
 * Owner-ruled 2026-07-24: **Q1 = FULL RESERVE** — the system collection, the element-side connector list and
 * system edge, AND their `createElement` args, all in one step (the ⓣ lesson: a reserved noun with no
 * authoring path forces a later `argsSchema` amendment).
 *
 * ⚠ WHAT THIS IS FOR. A duct/pipe/conduit/cable-tray **network** (`v1.0.0_imp_plan.md` "Parity-C"): segments
 * joined at **connectors**, grouped into **systems** (Supply Air, Sanitary, Cold Water). Bunyan v1.0.0 models
 * none of it — but the *contracts* a network needs touch `Element`/`scene.json`, which freeze at P5, so the
 * shapes are reserved here and the bodies (routing, sizing, clash, the sweep geometry) are Parity-C.
 *
 * ⚠⚠ THE KERNEL NEEDS NOTHING RESERVED, AND THAT IS A FINDING, NOT AN ASSUMPTION (design §1). MEP geometry
 * wants `sweepAlongPath`/`loft` — ops that do not exist. But the protocol froze at the end of P3 and
 * **`faceFrame` was added AFTER that freeze** (Entry 30) under **D13**: *"adding an op is additive and
 * permitted; changing an existing op's envelope needs sign-off."* ⇒ a sweep op in v1.0.x is the precedented
 * path, not an amendment. **This file therefore reserves NO op and touches no kernel byte.**
 *
 * ⚠ AND A CONNECTOR IS NOT A `SubShapeRef`. It is AUTHORED placement data (a port 400 mm along the axis,
 * facing +X), not a DERIVED sub-shape identity — so it never enters the naming system (D1) and costs the
 * identity path nothing. Contrast `Element.hostRef`, which IS a `SubShapeRef` token precisely because a host
 * face is derived geometry that must survive a rebuild.
 *
 * ⚠ NO BODY READS ANY OF THIS IN v1.0.0. The reservation exists so Parity-C is a BUILD, not a three-product
 * contract amendment (`.bnn` in the field, Miqdar, Planitor).
 */

import type { Discipline } from './entities.js';

/**
 * A system's id — a prefixed ULID (D44): `system-01J8Z3K7Q2…`. Same reasoning as `FamilyId` (D61 Q3) and
 * every other PEI: collision-impossible by construction, never parsed for meaning.
 */
export type SystemId = string;

/**
 * A named MEP network an element belongs to — *"SA-1, Supply Air"*.
 *
 * ⚠ IT IS A GROUPING ENTITY, AND THAT IS WHY IT IS A SHARED DEFINITION RATHER THAN A STRING ON EACH ELEMENT
 * (domain rule 12, and the D33 Material lesson restated): a value that must be **grouped, scheduled, and
 * read by a downstream engine** cannot be a copy on every instance. *"Give me every element on SA-1"* and
 * *"re-label SA-1"* are both one operation against a definition and N against duplicated strings.
 */
export interface SystemDefinition {
  readonly id: SystemId;
  /** The human-facing name — `SA-1`, `CWS`, `SAN-3`. Shown on schedules and tags. */
  readonly name: string;
  /**
   * What KIND of system — `supply-air`, `return-air`, `exhaust`, `sanitary`, `storm`, `cold-water`,
   * `hot-water`, `power`, `data`, …
   *
   * ⚠ A STRING KEY, DELIBERATELY NOT AN ENUM. The real domain is large, jurisdiction-flavoured and
   * vendor-extended; an enum here would be exactly the frozen contract a new system kind has to amend. The
   * open-key choice is the same one `Material.structural?`/`Section.dimensions` make, and the opposite of
   * `Discipline` (which is closed because D45 pins it to four trades on purpose).
   */
  readonly classification: string;
  /** Which trade builds it — reuses D45's vocabulary. In practice `'mep'` for every system here. */
  readonly discipline: Discipline;
  /** Optional free description — the designer's note on the network's duty. */
  readonly description?: string;
}

/**
 * A PORT on an element where another component joins it — a duct outlet, a pipe end, a terminal inlet.
 *
 * ⚠⚠ `at`/`direction` ARE IN THE ELEMENT'S OWN BUILD FRAME, AND THAT IS LOAD-BEARING, NOT A CONVENIENCE
 * (design §3.5, the D25 lesson). An element is authored in its own frame and *then* placed
 * (`Element.placement`), and **`transform` mints no identities** — a rigid motion is a topological
 * isomorphism. Storing a connector in WORLD coordinates would mean moving or rotating a duct silently
 * invalidated every port on it, which is precisely the positional fragility the naming system exists to
 * refuse. In the build frame, a placed duct's connectors are the built duct's connectors, unchanged.
 *
 * ⚠ `name` is the connector's slot in the element's own vocabulary (`in`, `out`, `branch.1`) — the same
 * discipline as `Part.name` (D30): **unique within its element**, authored by the type, never positional.
 * A future connection edge names `{elementId, connectorName}`, so a duplicate name would make one edge
 * address two ports — the collision `StyleLayer.name` is refused for.
 */
export interface Connector {
  /** Slot name, unique within the element (`in` / `out` / `branch.1`). Authored, never positional. */
  readonly name: string;
  /** mm, in the ELEMENT'S OWN BUILD FRAME (see the warning above) — never world space. */
  readonly at: readonly [number, number, number];
  /** The outward normal the connecting component approaches along, in the same build frame. */
  readonly direction: readonly [number, number, number];
  readonly shape: 'round' | 'rectangular' | 'oval';
  /** mm — interpreted by `shape`: `{diameter}` for round, `{width,height}` for rectangular/oval. */
  readonly dimensions: Readonly<Record<string, number>>;
  /** Flow sense at this port. Absent ⇒ unspecified (a fitting that does not care). */
  readonly flow?: 'in' | 'out' | 'bidirectional';
  /**
   * The system THIS PORT belongs to, when it differs from the element's own `systemId` — a heat exchanger
   * or a valve bridges two networks, so the system is genuinely per-port, not only per-element. Absent ⇒
   * inherits `Element.systemId`.
   */
  readonly systemId?: SystemId;
}
