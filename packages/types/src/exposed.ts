// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * ⚠⚠ **WHICH FACES A TRADE BILLS** — the shared half of `BuiltPart.exposedRefs` (D72, domain rule 15).
 *
 * D72 reserved the member and `core.wall` populated it; every other shipped Type owed its declaration and
 * meanwhile reported the solid's **total enclosing surface** — the number that came to 94.80 m² on a
 * 15 m² paintable wall face. Measured on the types that owed it (2026-07-27): a door frame over-reported
 * **1.71×**, a curtain panel **2.06×**, a mullion **3.03×**. Every one of those wore `basis: 'exact'`.
 *
 * **THE RULE, owner-ruled 2026-07-27 and it is ONE rule for every type:** *exposed = every face that is a
 * surface of the assembled thing.* A face buried against a neighbour — a wall layer against the next
 * layer, a mullion against the glazing it holds, a door leaf's edge inside its frame — is not a surface
 * of anything and is not billed. Nor is an end cap: nobody paints the end of a wall (that exclusion is
 * `core.wall`'s own and predates this file).
 *
 * ⚠ **WHY IT IS DECLARED PER TYPE AND CANNOT BE DERIVED.** "Exposed" depends on a layer's position in a
 * stack, on which side of a mullion the glass sits, on a column's nothing. The roll-up has nowhere to
 * read it from, which is exactly why D72 put the member on the Type rather than computing it centrally.
 * This file only removes the third copy of *"find the refs whose role is R"*; the judgement stays local
 * to each Type, where the AEC knowledge is.
 *
 * ⚠⚠ **AND THE ONE TRAP, CAUGHT IN D72's OWN IMPLEMENTATION: `exposedRefs: []` IS NOT "SAID NOTHING".**
 * An empty list is a Type declaring that this part's billable area is **zero** — a wall's buried middle
 * layer, whose right answer is 0 m². Absent means *"this Type has not declared yet"* and falls back to
 * the old whole-solid number. Conflating them re-introduces the exact over-report the member exists to
 * remove, on the one part that must read zero. `quantities()` distinguishes them; so must every caller.
 */

/**
 * The refs of the FACES carrying the named roles, in the order the roles were asked for.
 *
 * ⚠ Matched on the ROLE inside the token, never on a position in `refs`. The array is canonically
 * ordered by the kernel (D8) and **its order is not a contract** — the role name is (D26). Reading
 * `refs[1]` here would be precisely the positional-index identity the whole naming design refuses, and
 * it would keep working until the day a canonical re-sort moved something.
 *
 * ⚠ A role that is absent yields nothing rather than a fabricated ref: a degenerate profile must under-
 * report an area, never invent a face. (`measure(ref)` on an invented token is an
 * `UNRESOLVED_SUBSHAPE_REF` refusal, which is the safe direction, but the refusal would abort a whole
 * quantity take-off over what is really a missing declaration.)
 *
 * ⚠⚠ **`node` IS NOT OPTIONAL POLISH — A PART BUILT FROM TWO OPS OWNS FACES UNDER TWO NODE IDS.** The
 * door's frame is `outer − inner`, so it carries BOTH `…frame:outer/face/lateral.0` (buried in the
 * wall's reveal) and `…frame:inner/face/lateral.0` (the visible lining beside the leaf) — the same role,
 * opposite answers. Matching the role alone returns whichever the canonical order happened to put first
 * and would have billed the buried face: **1.20 m² of the wrong surface**, silently, wearing `exact`.
 */
export function facesWithRoles(
  refs: readonly string[],
  roles: readonly string[],
  options: { readonly node?: string } = {},
): readonly string[] {
  const prefix = options.node ?? '';
  const out: string[] = [];
  for (const role of roles) {
    const found = refs.find((ref) => ref.includes(`${prefix}/face/${role}`));
    if (found !== undefined) out.push(found);
  }
  return out;
}

/**
 * The two large faces of a box that lies in a FAÇADE plane — the pair perpendicular to depth (Y).
 *
 * Shared by the curtain wall's panel and mullion because both are authored in one local frame
 * (X = along the façade, Y = depth, Z = up, `curtainwall.ts`), so "the faces you see from outside and
 * inside" is `y-min`/`y-max` for both — a vertical mullion, a horizontal transom and a glazed panel
 * alike. The other four faces of each are buried: a mullion's `x` faces hold the glazing, its `z` faces
 * butt the mullions crossing it, and a panel's four edges sit inside the mullions that frame it.
 */
export const FACADE_FACE_ROLES: readonly string[] = ['y-min', 'y-max'];
