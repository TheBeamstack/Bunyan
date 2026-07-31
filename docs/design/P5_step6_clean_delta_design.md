# P5 step 6 — THE CLEAN DELTA, designed on Bunyan's terms (Freeze-Gate ⑥, D57)

**What this is.** The design that closes Freeze-Gate **⑥** — _"the contract that carries money"_. It fixes the
shape of the Clean Delta payload **and proves the frozen transport can produce every field of it**, so the
`UndoableEdit` / `SceneChange` / journal / `ModelRevision` shapes can freeze at step 6 without foreclosing it.

**Why it exists (and why it is no longer an escalation — D57, 2026-07-20).** ⑥ was long mis-filed as _blocked on
an off-box BIMsync spec_. The owner ruling **D57** corrected it: **BIMsync is unbuilt; it will be built after
Bunyan v1.0.0 and its spec adapts to Bunyan.** So Bunyan **owns** the Clean Delta and designs it for the two
consumers whose needs are **known and on-box** — **Planitor** (4D/5D scheduling) and **Miqdar** (analysis). This
design is therefore anchored to a **real, on-box consumer contract**, not a guess:

> `../Planitor/v2.2_spec.md` **§4 — "The Clean Delta Package (canonical contract)"**, `source: "bunyan"`,
> `contract_version: "1.1"`. That block is the target this design maps onto, field for field.

**The headline finding.** ⚠⚠ **⑥ imposes NO new frozen field.** Every field of Planitor v2.2's Clean Delta maps
to a shape that is already frozen, or is **derived by the exporter** from the frozen journal. The Clean Delta
**exporter + its JSON Schema is a v1.0.x build deliverable** (like the D29 cache body): reserved-and-shaped now,
built later. This retires `review_P5.md` **Finding 1** — the single highest cost-of-delay item — to _green: the
transport freeze is safe on this axis, confirmed against the real consumer._

---

## 1. The mechanism is already right — the risk was only the payload (`review_P5.md` #1)

The journal machinery is sound and frozen, and the review confirmed it independently:

- **`change_type` is READ, not inferred** (`core_logic.md` §3.12a, D40). A `ModelRevision` records
  `issued_at_seq`; the delta since revision N **is** `journal.filter(e => e.seq > revN.issued_at_seq)`. There is
  no diffing of two models — the property BIMsync is an entire platform built to manufacture, Bunyan has by
  construction.
- **`reidentified` cannot occur** (D44 ULID PEI + D1 derived sub-shape identity). Planitor's confusing-change
  resolution queue is _always empty_ for a Bunyan model (Planitor v2.2 D9).
- **`quantity.basis` is `exact`** — measured on the B-Rep, **per part, per material** (D30/D33/D45), which
  bypasses Planitor's derivation ladder and retires its hardcoded `density: 7850` (Planitor v2.2 D10).

So the only open question ⑥ ever posed is the one this document answers: **can the frozen shapes PRODUCE every
payload field?** The answer is yes, proven below.

---

## 2. Field-by-field mapping — Planitor v2.2 §4 ⇒ frozen Bunyan source

Every row is either a **direct read** of a frozen shape, or a **derivation** the exporter performs (marked
_[exporter]_ — v1.0.x code, not a frozen field). Nothing is _stored new_.

| Clean Delta field (Planitor v2.2 §4)                                      | Bunyan frozen source                                                                                 | How                                                                                                                    |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `contract_version`, `source:"bunyan"`, `units`                            | —                                                                                                    | _[exporter]_ constants                                                                                                 |
| `model_revision.snapshot_number` / `previous_snapshot_number` / `lineage` | `ModelRevision.snapshot_number` / `previous_snapshot_number` / `lineage`                             | direct                                                                                                                 |
| `model_revision.promoted_at` / `promoted_by`                              | `ModelRevision.issued_at` / `issued_by`                                                              | direct (rename)                                                                                                        |
| `spatial.zones[]` / `floors[]` (LBS)                                      | `scene.containers` — the `Site → Building → Level → Space` tree (D35)                                | _[exporter]_ walks the tree; `spatial_container_code` is the tree path (§3.2: the LBS falls out of the authored model) |
| element `pei`                                                             | `element.id` — the prefixed ULID **is** the PEI (D44), no minting                                    | direct                                                                                                                 |
| `ifc_guid`, `fingerprint`                                                 | —                                                                                                    | _[exporter]_ optional/`null` for a Bunyan model (identity is by construction — no fingerprint needed)                  |
| `change_type`                                                             | journal: `UndoableEdit.command` + `SceneChange.before/after` + `UndoableEdit.rebuilt`                | _[exporter]_ — derivation rules in §3. **All inputs frozen.**                                                          |
| `spatial_container_code`                                                  | `element.containerId` → the container tree code                                                      | _[exporter]_ resolve                                                                                                   |
| `classification.ifc_class`                                                | `element` classification `{ifcClass, loadBearing}` / `type.defaultClassification`                    | direct                                                                                                                 |
| `classification.predefined_type` (COLUMN/BEAM…)                           | the Type + params (a `LinearMember`'s `direction`: z⇒column, x/y⇒beam)                               | _[exporter]_ derive; see §4 (no frozen field)                                                                          |
| `classification.material`, `type_name`                                    | style / material name / `type.label`                                                                 | _[exporter]_                                                                                                           |
| `classification.out_of_scope`                                             | `loadBearing` + discipline filter                                                                    | _[exporter]_ policy                                                                                                    |
| `quantity.value`, `basis:"exact"`, `canonical.{volume,area}`              | `DocumentContext.quantities(id)` → `PartQuantity.{volume, area}` (measured, D30)                     | direct; `basis` is always `exact` (rule 15)                                                                            |
| `quantity.canonical.length`                                               | the element's **semantic axis length** — a param (a `LinearMember.length`), NOT `measure.edgeLength` | _[exporter]_; see §4 (this is Freeze-Gate ⓗ — **no frozen field**)                                                     |
| `quantity.canonical.count`                                                | `1` per element, summed per LBS×type                                                                 | _[exporter]_ aggregate                                                                                                 |
| `quantity.parts[].{name,material,volume,area,unit}`                       | `quantities().parts[].{name, materialName, volume, area}` + Material unit                            | direct (the per-part breakdown, D30 — _the point of the whole exercise_)                                               |
| `prior.{quantity_value, spatial_container_code}`                          | replay the journal to `revN.issued_at_seq` → the scene at N → `quantities`/`containerId` at N        | _[exporter]_ (journal is complete + append-only ⇒ replay is exact)                                                     |
| `links.{split_from_pei, merge_into_pei}`                                  | a `split`/`merge` **command**'s args (v1.0.x verbs)                                                  | _[exporter]_; `null` in v1.0.0 (no such verb yet) — additive when added                                                |
| `summary`                                                                 | aggregate over `elements[]`                                                                          | _[exporter]_                                                                                                           |

**Conclusion of the mapping:** ✅ **no cell requires a new frozen field.** Two cells (`change_type`,
`prior`) are _computed from the journal_; the rest are direct reads or exporter policy. The journal fields they
depend on — `command`, `SceneChange.before/after`, `rebuilt`, `ModelRevision.issued_at_seq` — are **all frozen**.

---

## 3. `change_type` — the derivation rules (the exporter's core, v1.0.x)

Planitor's enum is `added | modified_qty | modified_move | modified_type | deleted | unchanged | reidentified |
split | merge`. Each is a **pure function of the journal slice** `J = journal.filter(e => e.seq > revN.seq)`,
plus a per-element rebuild at N vs now for the quantity comparison:

| `change_type`     | Derivation from the frozen journal                                                                                                                                                                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `added`           | the element's first appearance in `J` is a `SceneChange{collection:'elements', before:absent}` (its command is `core.createElement`), and it still exists now.                                                                                                                                                                        |
| `deleted`         | the element's last appearance in `J` is `{after:absent}`, and it does not exist now (a cascade delete, D39, appears here too).                                                                                                                                                                                                        |
| `modified_move`   | in `J` the element's `before→after` differs **only** in position (`start`/`end` for a wall; `placement` otherwise), quantity unchanged.                                                                                                                                                                                               |
| `modified_qty`    | quantity at N ≠ quantity now — **whether the element's own params changed OR it appears in some edit's `rebuilt`** (an associative cascade: a Level moved, 400 walls' quantities changed though nothing touched them directly). ⚠ **This is the case a naive two-model diff gets right only by luck; Bunyan reads it off `rebuilt`.** |
| `modified_type`   | `before→after` changed `typeId` or `styleId`.                                                                                                                                                                                                                                                                                         |
| `unchanged`       | the element is absent from `J` **and** from every `rebuilt` in `J` (Planitor treats absence-from-`elements` as unchanged, so these may simply be omitted).                                                                                                                                                                            |
| `reidentified`    | ⚠ **never emitted** — impossible by construction (D1/D44). The moat.                                                                                                                                                                                                                                                                  |
| `split` / `merge` | a `core.split*`/`core.merge*` command in `J` (v1.0.x verbs); its args carry `links.{split_from_pei, merge_into_pei}`. Reported **authoritatively** (they were commands), never inferred.                                                                                                                                              |

**All inputs are frozen.** `modified_move` vs `modified_qty` — the review's specific worry — is decided from
`SceneChange.before/after` (which field changed) and a quantity comparison (replay to N), both derivable. **No
`moved` flag needs to be stored on any frozen shape.**

---

## 4. The two apparent gaps, and why neither is a frozen-field change

**(a) Freeze-Gate ⓗ — LENGTH and COUNT in the quantity.** Planitor's `canonical` carries `{volume, area,
length, count}`; Bunyan's `PartQuantity` carries `{volume, area, mass}`. Does the freeze need a `length` field?

**No.** The schedule's _length_ (_"120 m of IPE300"_) is an element's **semantic axis length** — a
`LinearMember`'s `length` param, or a wall's baseline `|end − start|` — **not** `measure.edgeLength` (the sum of
all edges, which is meaningless as a schedule quantity). It is therefore a **param read at export time**, per
element kind, and needs no field on the frozen `PartQuantity`. `count` is `1` per element, aggregated by the
exporter per LBS×type. ⇒ **ⓗ is discharged: length and count are exporter-derived from frozen params; nothing is
reserved.** _(And `PartQuantity` is a computed projection, not stored state — so even adding a field to it later
is additive and migration-free. It is doubly safe.)_

**(b) `classification.predefined_type` (COLUMN vs BEAM).** Derived from the Type + params (a `LinearMember`'s
`direction`) or `defaultClassification.ifcClass`. Exporter policy, no frozen field. If a future IFC subtype
needs to be _authored_ rather than derived, the **reserved** `Element.classifications` bag (0g, ⓠ) carries it —
already additive.

---

## 5. Miqdar as the second consumer (D57) — nothing it needs is missing

Miqdar reads **the model (`.bnn`) + the change feed**. Its needs are already met by the same shapes:

- **Which elements are structural** — `loadBearing` + `discipline` **per part** (D45), a _read not a guess_
  (Miqdar §3.4 row 8). The Clean Delta already carries `parts[].discipline`-derivable classification.
- **Bind to a Style, not N instances** — `styleId` is on every element; a Miqdar `DesignGroup` binds to a
  Bunyan `ElementStyle` (Miqdar §3.4 row 7). Frozen.
- **Locate a frame** — the spatial container tree / `spatial_container_code` (Miqdar §3.4 row 9). Frozen.
- **Analytical-hint fields** — live in **Miqdar's own analytical graph**, bound to Bunyan by
  `{bunyanInstanceId, typeId, typeVersion}` (Miqdar §3.4). They are **not** Bunyan fields (see gate ⑧, §6).

So the _same_ per-part, PEI-anchored, spatial-resolved delta serves both consumers. There is no Miqdar-specific
payload field, and no Miqdar-driven frozen change (the no-coupling rule, Miqdar §3.4, stands).

---

## 6. Gate ⑧ (Miqdar §3.4) — DISCHARGED: reserve nothing

The freeze gate asks (Miqdar §3.4 **row 5**): _does `BimObjectType.version` + `migrate` suffice to add OPTIONAL
analytical-hint fields later?_ **Yes ⇒ reserve nothing.** Rationale:

1. **Analytical hints do not live on `BimObjectType`.** Miqdar authors its own analytical model (centreline
   idealisation, releases, effective stiffness, supports — Miqdar §4) and **binds** it to Bunyan by PEI. Bunyan's
   type contract is not where a hint would go.
2. **If Bunyan ever did expose an optional hint**, the reservation pattern already in the frozen contract proves
   it is additive: `ifcMapping?`, `migrateStyle?`, and now **`buildLeaf?`** were all added to `BimObjectType` as
   optional fields with no migration and no break. One more optional field is the same move.
3. Rows 1–4 are already satisfied (identity stability; documented semantic `.bnn`; live `quantities`/`materials`
   hooks — the door's leaf now exercises per-part quantities on a _hosted_ element too; explicit + migratable
   `SCENE_SCHEMA_VERSION`). Row 6 (Beam) is discharged (`LinearMember` ships). ⇒ **⑧ clears; no field reserved.**

---

## 7. What is a v1.0.x build deliverable (not a freeze item)

- **The Clean Delta exporter** — `journal + revN → CleanDeltaPackage` — and its **JSON Schema** (owned by
  Bunyan, `contract_version: "1.1"`, `source: "bunyan"`). Shape fixed here; body built in v1.0.x.
- **`prior`-state replay** — reconstruct the scene at `revN.issued_at_seq` to compute quantity deltas. Correct by
  the append-only journal; a straightforward v1.0.x body.
- **`split`/`merge` verbs** — when authored, their command args carry `links`. Additive.

None of these touches a frozen shape.

---

## 8. Verdict

**⑥ freezes clean.** The `UndoableEdit` / `SceneChange` / journal / `ModelRevision` shapes carry — frozen, today —
everything the real on-box Planitor v2.2 Clean Delta needs, and everything Miqdar needs, with **no new field**.
The one item the review feared was frozen on a guess (the payload) is instead **derived by an exporter from a
complete, append-only, revision-anchored journal** — read, not inferred. `review_P5.md` Finding 1 is retired.

**Owner sign-off requested at step 6:** accept this design as the frozen-transport confirmation for ⑥ (no frozen
change), and schedule the exporter + JSON Schema as a v1.0.x deliverable.
