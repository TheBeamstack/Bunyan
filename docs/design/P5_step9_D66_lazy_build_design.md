# D66 — LAZY BUILD + EVICTION: the design, and it is mostly a POLICY, not a mechanism

**Entry 90 · 2026-08-08 · Zayd.** Companion to `P5_step9_D66_scale_design.md`, which ruled the _contract_
half (**reserve nothing** — eviction is additive by construction). This is the other half: **what to
build, when, and what it costs the invariant.** Everything below was measured on this box before a line
of it was written — `tests/d66-lazy-build-measure.test.ts` is the instrument and it ships with the design.

> ⚠ **Why this doc exists at all.** §1a's cold load is the **only ⚠ row left** (~3 min at the 10k target,
> untouched since Entry 73). Of its three levers, `instantiate` is RESERVED and MT is ruled v1.0.x, so
> **D66 is the one that is open to this seat.**

---

## 1. The three questions TASK asked, answered with numbers

### Q1 — What fraction of a cold load is actually FORCED? **~35%, and the rest is deferrable.**

A 3-storey, 54-element building, loaded from `scene.json` alone with no cache (the D29 path):

|                                          | elements   | ms       | ms/element | vs `rebuildAll` |
| ---------------------------------------- | ---------- | -------- | ---------- | --------------- |
| **(A) `rebuildAll`** — today's cold load | 54         | **1271** | 23.5       | —               |
| **(B) first storey only**                | 18 (33.3%) | **452**  | 25.1       | **35.5%**       |
| **(C) the rest, deferred**               | 36         | 831      | 23.1       | —               |
| **(B)+(C)** — the two-pass total         | 54         | 1283     | —          | **100.9%**      |

**⇒ 64.5% of the cold load is not needed before first paint**, and doing it in two passes costs
**~1–4.5%** (measured twice: 100.9% and 104.5% on consecutive runs). **Cost fraction ≈ element fraction**
(35.5% vs 33.3%), so at this size the per-element cost is flat and **there is no fixed floor worth
buying back** — the saving is simply "build fewer things", and it scales with how much of the model the
camera can see rather than with how big the model is.

⚠ **What this does NOT say.** It does not say the 10k cold load becomes usable. A first paint that needs
one storey of a 10k-element tower is still ~1,000 elements ≈ **24 s** at 23.5 ms/element. **Lazy build
moves the number from unusable to bad; it does not close the row.** Combining it with `instantiate`
(RESERVED, collapses N identical builds to 1) is what could — and that is a separate, reserved lever.
**Say so plainly rather than declaring the axis closed.**

### Q2 — What does eviction cost the INVARIANT? **Nothing measurable, and this is the load-bearing result.**

D66's contract ruling rested on _reasoning_ — recipe-is-truth ⇒ any subset rebuilds. §1b's third method
is exactly the warning against trusting that shape of argument (_"ship the BREP cache"_ read as a perf
call and dragged in a persisted name→shape index D1 forbids). So it is measured here, three ways:

1. **A partially built document agrees with a fully built one, element for element** — part node ids and
   the full measured `quantities` breakdown, byte-identical, including a wall carrying a **window** (the
   CUT node is where sub-shape names are minted, so it is the likeliest place for build order to leak in).
2. **A second pass is not a different building** — elements built later agree with the same elements built
   in one go.
3. **⚠⚠ THE ONE THAT COULD HAVE SUNK IT: the JOIN.** A wall's geometry is _not_ a function of the wall
   alone — `resolveJoins` clips its ends against its neighbours. So _"build wall A, never build wall B"_
   invites D68's exact silent-wrong shape: **a wall that should be mitred coming out with a plain cap,
   which nothing would flag.** Measured on the real shipped D52 wall (`@bunyan/types`, `{start,end}`,
   auto-mitring): a wall built while its corner partner is **never built** is **identical** to the same
   wall built in a full document.

   The reason is worth stating because it is what makes lazy build legal in general: **`resolveJoins`
   reads `scene.elements` — the RECIPE — never the built set.** The recipe is complete the moment the
   file is open. **Nothing in the geometry pipeline is a function of what happens to be in the heap.**

   ⚠ The existing scale fixture cannot see any of this: its walls are `{length,height}`-parameterised, so
   `baselineOf` returns `undefined` and `resolveJoins` early-returns (noted in the companion doc §1). **A
   join test needs a baseline wall, and that is why this one builds its own.**

### Q3 — Is it contract-shaping? **No — and less than that: the build half needs NO new API.**

| what lazy build needs                                 | what already ships                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| build a named subset from the recipe                  | **`DocumentContext.rebuildOnly(ids)`** — already shipped, already additive      |
| a whole-assembly unit (a window builds with its wall) | `rebuildOnly` already builds `affectedAssemblies`                               |
| release a solid's WASM handle                         | **`releaseShape`** — in the FROZEN protocol, and kernel-client already fires it |
| free everything at once                               | `DocumentContext.dispose()`                                                     |
| a state meaning "recipe present, solid not built"     | `ElementState.stale` (and today: `geometryOf(id) === undefined`)                |

**`rebuildOnly` is the lazy-build primitive, and it has been in the product since 2026-07-25** — shipped
for the Clean Delta so a 38-element delta would not cost a whole-model rebuild. _"Build what is named,
not what exists"_ is the same sentence a first paint needs. **D66's build half is a caller, not a
feature.**

---

## 2. ⚠⚠ The finding that actually shapes the design — and I predicted it wrong

The interesting question is not what a lazily-loaded document shows. It is **what it TELLS A TAKE-OFF
about the elements it did not build.**

I expected the shape this project has now met four times (Q17a, Q19, the `hostId` orphan, the belongs-to
cycle): **a short number wearing `basis: 'exact'` with every diagnostic empty.** Measured — 4 walls
authored, 1 built:

```
FULL   : 8 rows · 12,040,000,000 mm³ · basis exact · unmeasured 0
LAZY   : 2 rows ·  3,010,000,000 mm³ · basis exact · unmeasured 3   ← all three named
brokenRefs 0 · unbuildable 0
```

**The volume is 75% short and every missing element is named.** `projectQuantities` tests
`element.state !== 'valid'` **before** it tests `hasParts`, so an unbuilt element takes the `unmeasured`
branch by name; the silent `continue` is reached only by a pure void or a pure composite — the case it
was actually written for. **Entry 58's owner ruling — _"an element that cannot be measured is reported,
never zeroed and never silently dropped"_ — already covers the element lazy build creates.**

⇒ **That honest channel, not the timing, is what makes D66 shippable.** And it sets the design constraint,
because the same result read the other way says: **a lazily-loaded document answers a whole-model take-off
with every unbuilt element in `unmeasured` — truthful, and useless.**

> **⇒ THE HOOK D66 NEEDS IS NOT IN THE RENDERER. IT IS IN THE ENUMERATION.** An aggregate query must force
> the build of what it is about to measure. That is `rebuildOnly` under a different caller, and it is
> additive.

---

## 3. The design

**Three parts, and only the third is new code of any weight.**

**(a) The keep-live set — runtime policy, never persisted.** Which elements are built is computed from the
camera, the selection and the viewport. Persisting it would violate recipe-is-truth exactly as persisting
a mesh would. ⚠ **`scene.json` gains nothing. `BimObjectType` gains nothing. No frozen byte moves.**

**(b) First paint = `rebuildOnly(visible)`.** Ordered by container: the level the camera opens on, then
outward. **No new API.**

**(c) ⚠ FORCE-ON-MEASURE — the part that must not be forgotten, and the reason §2 exists.** Every
aggregate that quantifies over the model (`projectQuantities`, schedules, the Clean Delta, `save`) must
build what it is about to report, or declare it. Two acceptable shapes, and the design does **not** choose
between them here because one of them is an owner call:

- **FORCE (recommended).** The aggregate calls `rebuildOnly` on its own subject first. Correct by
  construction, and the cost lands on the export rather than the load — which is the trade the Clean
  Delta ruling already made in the other direction.
- **DECLARE.** Leave the shortfall in `unmeasured` and make the caller deal with it. Cheaper, already the
  behaviour, and **wrong for `save`** — a save that silently omits unbuilt elements is a data-loss bug,
  not a reporting one. _(⚠ Not measured here: whether `save` reads built state at all. **It should not** —
  it writes the recipe — but that is a claim, not a measurement, and the next session should check it
  before relying on this paragraph.)_

**(d) Eviction.** `releaseShape` on the parts of an element leaving the keep-live set, then drop it from
`#geometryByElement` so it reads as unbuilt. **The heap answer (§1a: 0.31 GB at 10k — FITS) means eviction
is not needed for memory.** It is needed only if the keep-live set is itself large enough to matter, which
at 0.31 GB it is not. ⇒ **Build lazily; evict later, or never.**

---

## 4. What this is NOT, and what is owed

- **⚠ It does not close §1a's cold-load row, and the row must not be re-coloured as though it does.** ~24 s
  for one storey of a 10k tower is better than ~3 min and is still not good. **The honest statement is
  "lazy build takes 64.5% off the first paint and the remainder needs `instantiate` or MT."**
- **Not measured here:** the 10k extrapolation (this is 54 elements; the per-element cost was flat across
  the two passes, but flatness at 54 is not flatness at 10,000 — `document-heap-scale.test.ts`'s
  least-squares approach is the pattern to copy), and whether `save` depends on built state (§3c).
- **Nothing here needs an owner ruling.** Every piece is additive; the one genuine choice (FORCE vs
  DECLARE) is a design call inside a package this seat owns — **except for `save`, where the conservative
  reading is that data loss is not a design call at all.**

## 5. Open questions for `open_rulings.md`

**None.** ⚠ Deliberately: D66's contract half is already ruled (reserve nothing), and everything above is
additive. **Adding a row here to look thorough would be the opposite of thorough** — the blocking table
already holds fourteen rulings, and a fifteenth that blocks nothing makes the four that block harder to
see.
