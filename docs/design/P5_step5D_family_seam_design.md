# P5 step 5D — the family-definition data-format seam (D61, Freeze-Gate row Ⓓ)

**Status:** ✅ OWNER-RULED (Q1–Q3, §9) + BUILT + GREEN (Entry 50). `families.ts` + `Scene.families?` +
`tests/family-seam.test.ts` (4). Revert-verified.
**Author:** Zayd (dev box, headless). **Date:** 2026-07-22.
**Prereqs green:** Ⓐ (Entry 47), Ⓑ (Entry 48), Ⓒ (Entry 49) — full suite **337 green** at design time.

> ## ✅ OWNER RULINGS (2026-07-22)
>
> - **Q1 = Embedded in `scene.json`** (recommended) — `Scene.families?`, self-contained per rule 15.
> - **Q2 = A FULLY-SHAPED grammar now** (⚠ NOT the recommended opaque envelope) — reserve the real recipe
>   structure, not a discriminator over an opaque blob. Built in `families.ts` as a complete grammar for the
>   CORE parametric family (params + profiles + primitive/modifier parts + nesting + hosting), grounded in
>   frozen primitives, with **every recipe node a discriminated union + a `formatVersion`** so the uncovered
>   tail stays additive (a member, never an edit) and wholesale evolution migrates forward. The sufficiency
>   test builds a REAL element from a fully-shaped definition vs OCCT — a stronger freeze de-risk than the
>   opaque envelope would have given.
> - **Q3 = Prefixed ULID** (recommended) — `FamilyId = mintPei('family')`, collision-impossible across authors.

---

## 1. What this is, and why it is pre-freeze

**D61 (2026-07-21 strategic review):** _"Data-driven family authoring (Revit Family Editor moat):
families as DATA, not code. Reserve a family-definition data-format seam. Code-types stay for complex
behaviour."_

Today a Bunyan building element is **code**. `core.wall`, `core.opening`, `core.curtainwall` are
TypeScript `BimObjectType` objects (`@bunyan/types`), each with a `buildGeometry`/`buildVoid`/
`buildChildren` function, registered into a **process-global, idempotent-by-id** `Registry<BimObjectType>`
(`registries.ts:44` — a duplicate id THROWS). That is correct for elements whose behaviour is genuinely
programmatic (a wall's join solver, a curtain wall's child grid). It is the _wrong_ authoring path for the
long tail of parametric content — a manufacturer's window, a furniture item, a light fixture — which is
**parametric geometry, not behaviour**: a profile, some parameters, a few formulas, some sub-placements.
Revit lets a non-programmer author those in the Family Editor and ship them as data (`.rfa`); that content
ecosystem is one of Revit's deepest moats (Parity-D in the imp_plan appendix).

**Why it is pre-freeze and not "just build it in Parity-D":** a data-driven family produces a **type**, and
an element **references a type** (`Element.typeId`), and a `.bnn` must be **self-contained** (domain rule
15 — the same reason materials are _embedded_, not referenced-by-name into a pack that might be missing).
All three of those touch contracts that **freeze at P5**: `BimObjectType`, the registry contract, and
`scene.json`/`.bnn`. If we freeze without a reserved home for a family definition, Parity-D re-opens a
three-product amendment. **This step reserves the seam and PROVES it is sufficient — it does not build the
family authoring system.**

⚠ This is the §1b method turned on the freeze once more: **reserve against the REAL code, not the prose.**
The prose ("types are additive registrations, so a family is just another registration") is _incomplete_
in exactly the way Ⓒ's prose was — see §3.

---

## 2. What already exists that this can lean on (so the reservation is small)

The pre-freeze reservations already landed do most of a data family's heavy lifting — which is why D61 is
a _small_ seam, not a subsystem:

| Building block a data family needs               | Already reserved / built                         | Where       |
| ------------------------------------------------ | ------------------------------------------------ | ----------- |
| Parameters with a schema                         | `ParamSchema` (built, frozen at P5)              | `schema.ts` |
| **Formulas** (a family's `Width = Height * 0.6`) | `ParamField.formula?` reserved (ⓜ, 0g)           | `schema.ts` |
| Optional-visibility params (`relevantWhen`)      | `ParamField.relevantWhen?` reserved (⑤, 0g)      | `schema.ts` |
| A **2D profile solved to exact geometry**        | the sketch solver (0d — real planegcs)           | `sketch.ts` |
| Sub-components placed by the parent              | **composition / nesting** (`buildChildren`, D59) | `types.ts`  |
| Versioning + param migration on load             | `BimObjectType.version` + `migrate`              | `types.ts`  |
| An outbound IFC identity                         | `defaultClassification`, `ifcMapping?`           | `types.ts`  |

**⇒ The only thing genuinely missing is a HOME for the family DEFINITION so it travels with the model,
and the recognition that the definition selects an INTERPRETER.** Everything a family's geometry needs to
be _expressed_ is already reserved; what is not reserved is where the expression _lives_ and how it is
_loaded_.

---

## 3. The foreclosure analysis (§1b — against the code, not the prose)

**The reassuring prose (registries.ts header):** _"New kinds of things — types, commands, formats, views —
are ADDITIVE REGISTRATIONS, never core edits."_ True — but it describes a **code** type registered at app
startup into a **global** registry. A **data** family authored by a user and embedded in one `.bnn`
violates two of that sentence's hidden assumptions:

### F1 — The registry is GLOBAL and idempotent-by-id; embedded families are PER-DOCUMENT.

`Registry.register` (`registries.ts:44`) throws if the id already exists — _"re-registering the same id
would silently change behaviour under every existing document."_ That invariant is right for code types.
But two independently-authored `.bnn`s, each embedding a family that happens to share an id (`family.door.x`
v1, different geometry), **cannot both register into one global registry** — and even a single doc's
family must not leak into the process-global namespace where the _next_ doc would collide with it. ⇒
**Data-family type resolution must consult a DOCUMENT-SCOPED source**, not only the global registry. The
build engine resolves every type via `registries.types.get(element.typeId)` (`build.ts:170/481/531/566`);
that seam must, in Parity-D, become _"consult this document's families first, then the global registry."_
**That is an additive ENGINE change (an internal resolver), not a frozen-contract change** — _provided the
family definitions have a reserved home in the frozen `scene.json`._ They do not today. → R1.

### F2 — `scene.json` self-containment (rule 15). A `.bnn` with a family-typed element MUST carry the

definition. Materials are embedded for exactly this reason (`scene.ts:75` — _"a model opened on a machine
without the right material pack would silently lose every density in it"_). A family definition is far more
load-bearing than a density: without it the element **cannot build at all** (it degrades to `unbuildable`

- verbatim, D43 — safe, but not the shareable-content dream). ⇒ the definition must be **embedded in
  `scene.json`**, absent-defaulted, round-tripping verbatim. The codec already does this for free
  (`{ ...emptyScene(), ...parsed }`, `bnn.ts:161`); it needs the reserved key. → R1.

### F3 — Does a data-family need a new field on the frozen `BimObjectType`? **NO — and this is a finding to

PROVE, not assume (§1b).** A data family is interpreted by a `BimObjectType` produced by a **loader** that
closes over the definition: `makeFamilyType(def): BimObjectType`. Its `buildGeometry(ctx)` reads
`ctx.params` and the closed-over `def`, emits `BuiltPart[]` — structurally identical to a code type. It
needs nothing from `BuildContext` that is not already there (params, geometry gateway, sketch solver,
material/section resolvers). `version`/`migrate` handle evolution; `ifcMapping` handles IFC. ⇒ **a
data-backed `BimObjectType` and a code-backed one are the same shape; the only difference is where the
behaviour came from.** The freeze needs **no `BimObjectType` field for D61** — but §8's test must _prove_
it (a def → a produced type → an element builds real geometry vs OCCT, with zero new frozen field), the way
Ⓒ proved sufficiency with a real `mergeOrdered()`. If the proof fails, that failure IS the reserved field.

### F4 — The SHAPE of a family definition is genuinely unknown, and unlike Ⓐ nothing reads it in v1.0.0.

Ⓐ _shaped_ its descriptors (`ViewDescriptor`, `ScheduleDefinition`) because v1.0.0 **ships** one
plan/section/schedule in P6 — a body reads them soon, so the shape must be right now. A family recipe
grammar (profiles + ops + formulas + nested placements + constraints) is Revit's largest sub-language, it
ships in **Parity-D (years out)**, and **nothing in v1.0.0 reads it.** Shaping it now freezes a guess. This
is the central design fork → Q2.

---

## 4. The reservation set (recommended shapes — Q1–Q3 may adjust)

Three additions, all optional / additive / absent-defaulted. **No `SCENE_SCHEMA_VERSION` bump** (folds
into frozen v2, exactly as 0g/Ⓐ/Ⓒ). **No `BimObjectType` field** (F3). **No verb** (a family-authoring
command is a new additive registry entry when Parity-D lands — D19, distinct from anything owed pre-freeze).
**No backend** (D37 intact).

### R1 — `Scene.families?` (the HOME; the one frozen-contract touch)

```ts
// entities.ts
export type FamilyId = string;              // a prefixed ULID (D44) OR a namespaced string — Q3

// scene.ts — a FIFTH optional collection, the documentation-precedent (NOT georeference):
//   optional, absent-defaulted, TOP-LEVEL, NOT in emptyScene() / SceneCollection / the hostile-.bnn
//   guard / the dependency graph — because in v1.0.0 no body authors, reads, invalidates, or undoes a
//   family. Parity-D promotes it to a full SceneCollection additively (add the emptyScene entry, the
//   isPlainObject guard row, the "definitions rebuild their instances" dependency edge) in one step —
//   exactly as P6 will promote views/annotations/schedules/sheets.
readonly families?: Readonly<Record<FamilyId, FamilyDefinition>>;
```

### R2 — `FamilyDefinition` (the SHAPE) — ⚠ OWNER RULED Q2 = FULLY-SHAPED. The opaque envelope below is

**superseded**; the shipped grammar is `families.ts`: `FamilyDefinition` carries `parameterSchema` +
`defaultClassification`/`defaultDiscipline` + `parts?` (each a `FamilyPrimitive` base — `box`/`extrude`/
`revolve`, discriminated — plus ordered `FamilyModifier[]` — `chamfer`/`fillet`, with a semantic
`FamilyEdgeSelector`, never an index) + `children?` (`FamilyChildPlacement`, D59) + `hosting?`
(`FamilyHosting` — `voidPrimitive`+`leafParts`, a data door). Every scalar is a `FamilyValue` (a literal or
a param ref → parametric). `formatVersion` migrates the grammar forward. The kept envelope idea below is
recorded only as the rejected alternative.

<details><summary>Rejected alternative (Q2=A, opaque envelope)</summary>
```ts
// entities.ts (or a new families.ts, mirroring documentation.ts)
export interface FamilyDefinition {
  readonly id: FamilyId;
  readonly label: string;
  /**
   * ⚠ THE INTERPRETER DISCRIMINATOR. Which family grammar `definition` is written in — the loader that
   * turns it into a BimObjectType. Additive, versioned: a new grammar is a new `familyFormat` value +
   * its loader, never an edit to this envelope. An app lacking the interpreter for a given familyFormat
   * degrades the element to `unbuildable` + verbatim round-trip (D43) — never a crash, never silent loss.
   */
  readonly familyFormat: string;
  readonly formatVersion: number;
  /** The parameter schema the family exposes (drives the property panel + agent tools, like a Type). */
  readonly parameterSchema?: ParamSchema;
  /**
   * ⚠ THE GRAMMAR IS DEFERRED. Opaque, JSON-shaped (ParamValue), interpreted by the `familyFormat`
   * loader — profiles/ops/formulas/nested placements are defined by Parity-D BEHIND this discriminator,
   * additively. Reserving the HOME + the DISCRIMINATOR now, not a guessed grammar (F4, Q2). Matches the
   * "open-ended by design" precedent (`Material.structural`, `IfcMapping.params`).
   */
  readonly definition: ParamValue;
}
```

</details>

### R3 — `FamilyId` scheme (Q3) — a prefixed ULID (collision-impossible, marketplace-safe) vs a namespaced

string (`acme.door.x`, human-readable, TypeId-consistent, collidable). See Q3.

**What is NOT reserved (deliberately, with the reason):**

- **No `BimObjectType` field** (F3 — proven sufficient by §8, not assumed).
- **No `Registries`/`Registry` change.** The document-scoped resolver (F1) is an additive _engine_ seam
  Parity-D adds; §8 proves the DATA shapes suffice using a local registry, so the collision fix need not
  ship now.
- **No `emptyScene`/`SceneCollection`/hostile-guard/dependency entry** for `families` — same reasoning as
  Ⓐ's four documentation collections (nothing produces undo for it or reads it in v1.0.0).

---

## 5. Why this is freeze-safe (the additive proof)

- **`scene.json`:** a fifth absent-defaulted optional collection. Absent in every v1.0.0 file ⇒
  byte-identical to today. Present ⇒ rides the `{ ...emptyScene(), ...parsed }` spread verbatim
  (`bnn.ts:161`), round-trips through the `.bnn` for free. No `SCENE_SCHEMA_VERSION` bump (the Ⓐ/0g
  precedent). No hostile-guard entry needed until CRUD lands (the Ⓐ precedent).
- **`BimObjectType`:** untouched (F3).
- **`Registries`:** untouched (F1 is engine, not contract).
- **`Command.argsSchema`:** untouched (no verb owed pre-freeze).
- **The interpreter is selected by `familyFormat`**, so the _grammar_ evolves additively post-freeze
  behind a discriminator — the same discipline as the `Constraint`/`ConstraintTarget` discriminated
  unions (a new class is a new member, never an edit).

---

## 6. The three-consumers walk (does any downstream product need more?)

- **Planitor** binds to the **PEI + Clean Delta**, not to how a type was authored. A family-typed
  element has an ordinary PEI and ordinary parts/quantities — Planitor sees no difference. ✅
- **Miqdar** reads params/materials/sections/quantities off elements; a data family produces the same.
  ✅ (its analytical-anchor question is Ⓔ/D64, separate.)
- **BIMsync** is unbuilt and adapts (D57). ✅
- **IFC (P6):** a data family carries `defaultClassification`/`ifcMapping` like any type via its produced
  `BimObjectType` — no extra reservation. ✅

No consumer needs the _grammar_ pre-freeze; all they need is that a family-typed element is an ordinary
element — which R1–R3 guarantee.

---

## 7. What Parity-D builds later (the additive tail — for context, NOT this step)

1. A concrete `familyFormat` (e.g. `bunyan.family.v1`) + its loader `makeFamilyType(def): BimObjectType`.
2. The grammar of `definition` (profiles via the sketch solver + ops + formula evaluation + nested
   `buildChildren` placements).
3. The document-scoped type resolver (F1) — `build.ts` consults `scene.families` before the global
   registry.
4. The CRUD verbs (`core.createFamily`/`updateFamily`/…) + the `families` promotion to a full
   `SceneCollection` (undo + dependency edge: a family edit rebuilds its instances).
5. A family library/marketplace path (registry-as-palette; a doc embeds copies it uses — the materials
   dual).

Each is additive over the frozen R1–R3. **None ships in v1.0.0.**

---

## 8. Test plan (`tests/family-seam.test.ts`, pure + one real-OCCT sufficiency proof)

The Ⓒ discipline: a small **executable proof the reserved shapes are SUFFICIENT**, not a shipped feature.

1. **Round-trip (pure).** A `Scene` with a `families` entry → `saveBnn` → `loadBnn` → the definition is
   byte-identical (id, `familyFormat`, `formatVersion`, `parameterSchema`, opaque `definition`).
2. **Additive / absent-default (pure).** A v1.0.0 `.bnn` with **no** `families` key loads with
   `scene.families === undefined`; every existing collection is byte-identical; a typecheck proves no
   existing consumer references `families` (optional field, no break).
3. **⭐ SUFFICIENCY vs REAL OCCT (the F3 proof).** A minimal in-test family interpreter
   `makeFamilyType(def): BimObjectType` (closes over a `FamilyDefinition` whose opaque `definition`
   describes a box by `w×d×h` params) → register it in a **local** `Registries` → author an `Element` of
   that produced type → `DocumentContext` builds it → assert a real solid with the expected volume from
   the B-Rep (`measure`, not the mesh). **Proves a data family is a `BimObjectType` with ZERO new frozen
   field** (F3). The interpreter lives in the TEST only — the executable proof the frozen shapes suffice,
   not a shipped loader (no `familyFormat` ships in v1.0.0).
4. **Hostile-`.bnn` (pure).** `families: null` and `families: { x: 42 }` — confirm the codec does not
   crash on load (the field is ignored by every v1.0.0 body; it is not in the guarded key list, matching
   the Ⓐ documentation collections — nothing reads it, so there is nothing to corrupt yet).
5. **REVERT-VERIFY.** Neuter R1 (drop `families` from the `Scene` type / stop the codec round-trip) →
   tests 1 + 3 fail (the definition vanishes on round-trip; the produced-type element cannot build).
   Restore + re-green.

Expected: **~5 tests, +5**, full suite **~342 green**.

---

## 9. ⚠ THE FRAMING QUESTIONS FOR THE OWNER (rule before build)

**Q1 — Where does a family DEFINITION live?**

- **(A, recommended) Embedded in `scene.json` (`Scene.families?`) — a self-contained `.bnn` — with the
  registry/library as the palette.** The exact materials/sections dual (library = palette; a document
  embeds copies of the ones it uses). Satisfies rule 15: a `.bnn` sent to a machine without the family
  pack still builds. This is R1.
- **(B) Library/registry ONLY (not embedded).** Smaller files, but a `.bnn` opened without the pack loses
  the geometry (D43-safe-degrades to `unbuildable`, but the shareable-content promise is broken —
  violates rule 15's spirit).

**Q2 — What SHAPE do we reserve for a family definition? (the central fork, F4)**

- **(A, recommended) A versioned, format-discriminated OPAQUE envelope** (`familyFormat` + `formatVersion`
  - opaque `definition`) — reserve the HOME + the DISCRIMINATOR, defer the recipe GRAMMAR to Parity-D
    (additive behind `familyFormat`, like the `Constraint` union). Honest: the grammar is genuinely unknown
    and ships years out; nothing reads it in v1.0.0; shaping it now freezes a guess. Matches "open-ended by
    design" (`Material.structural`, `IfcMapping.params`).
- **(B) A fully-shaped `FamilyDefinition`** (a concrete recipe grammar now), like Ⓐ's descriptors. Only
  worth it if we expect a v1.0.0 body to read it soon — we do not (Ⓐ ships in P6; families ship in
  Parity-D). Risk: reserves a wrong grammar.

**Q3 — The `FamilyId` scheme.**

- **(A, recommended) A prefixed ULID (D44)** — `family-01J8…` — collision-impossible by construction, the
  right call for user/marketplace content where two authors will independently mint families (the D60 Q1
  reasoning: when identity crosses authors, make collision structurally impossible). A human `label`
  carries readability.
- **(B) A namespaced string** — `acme.door.x` — human-readable and consistent with `TypeId` (`core.wall`).
  But `TypeId`s are minted by ONE vendor (us); family ids are minted by MANY, so a namespaced string
  re-introduces the collision F1 is about.

**Q3 note:** F3's "no `BimObjectType` field" is a _finding I will prove_ in §8's real-OCCT test, not an
owner question — the §1b discipline is to demonstrate sufficiency, and if the proof fails, the failure is
the reserved field (and I will escalate before freezing).

---

## 10. Estimate & box

**~1 session** (a small reservation + the sufficiency proof; no solver, no kernel change, no new package).
Headless-closable. Touches only `@bunyan/document` (`entities.ts`/`scene.ts`/`bnn.ts` + a new test) — the
frozen kernel protocol is untouched. No containers, no ports, no other project. `pnpm verify` before any
(owner-gated) commit.
