### Entry 59 — 2026-07-26 — Zayd — **THE ASSERTED-BEHAVIOUR SWEEP (the judgement call Entry 58 raised; owner chose it over the freeze). IT FOUND TWO MORE CONSUMERS OF THE D65 EXCLUSION INVARIANT THAT NEVER OBEYED IT — AND THE SECOND CORRUPTS THE BUILT B-REP OF A WALL NOBODY EDITED. D68. 428 GREEN.**
**Task (owner):** the standing sweep Entry 58 asked for — *"which asserted behaviours have NO test that would fail without
them?"* — chosen in place of calling the freeze. Also owner-authorised: **push Entries 57+58**, done (`origin/main`
`6ec5139 → 2dd2215`; Amer had been two entries behind). `pnpm verify` **428/428**, real exit code captured (417 → +11).

- **⚠⚠ THE METHOD THAT WORKED, AND IT IS MECHANICAL — worth reusing verbatim.** Rather than re-reading prose, I took the
  rule D65 put *inside the frozen contract* (*"every consumer that AGGREGATES or PUBLISHES elements MUST exclude
  non-active options"*) and enumerated **every place in the codebase that iterates `scene.elements`** — 14 sites. Then I
  asked of each: *does this aggregate or publish?* Twelve correctly see everything (save/load per D43, the delete guards,
  the invalidator, `instancesOf`/`hostedBy`). **Two did not, and neither had ever been swept.**
- **⚠⚠ FINDING 1 — THE ROOM SOLVER (`assembleRoomInput`).** A Space's floor area is derived from its bounding walls, and
  the scan walked every element on the Level with no option filter. **Measured on a 4800×3800 room: 10,640,000 mm²
  reported where 18,240,000 is correct — a 42% under-report**, because one partition belonging to a scheme nobody will
  build crossed it. ⚠ **And the failure is worse in KIND than the double-count D65 predicted:** the corrupted number
  belongs to a room that is **entirely main-model**, and it is *smaller* than the truth — the direction nobody audits.
  D55's own words for this number: *"architecture's most-scheduled quantity"* (paint, ceilings, screed).
- **⚠⚠⚠ FINDING 2 — THE WALL-JOIN RESOLVER (`partnersAt`), AND IT IS THE SHARPER ONE: IT CORRUPTS THE BUILT B-REP, SO THE
  WRONG NUMBER ARRIVES WEARING `basis: 'exact'`.** The auto-join rule is *"exactly one coincident neighbour ⇒ miter; zero
  or a crowd of 2+ ⇒ the default cap"*, and an unfiltered scan turns that into **two** wrong answers:
  **(1) miter against a ghost** — a main-model wall miters itself against an option wall that will never be built;
  **(2) ⚠ THE AMBIGUITY FLIP, and it is vicious** — two main-model walls meet and correctly miter; the author adds a
  facade variant that happens to reach the same corner; each wall now counts **2** partners, the crowd reads as ambiguous,
  and **the miter is silently dropped.** ⇒ ***Adding a design option changes the geometry of a main-model corner
  elsewhere in the building that nobody touched.*** Measured: `expected [] to deeply equal [{end:'end', capLine…}]`.
  Mode 2 is **D67's shape exactly** — a rule that cannot see what an element hangs off gives a confidently wrong answer
  about an innocent third party.
- **⚠⚠ AND THE PATTERN IS A NEW ONE, NOT THE OLD DISEASE — THIS IS THE ENTRY'S REAL FINDING.** §1c-7's four prior
  occurrences were all *a claim written down and never implemented*. **These two are the opposite: the rule WAS
  implemented, correctly, and only in the consumers that existed the day it was written.** The chronology is the whole
  story — the room solver shipped **Entry 41 (07-18)**, the join resolver **Entry 42 (07-18)**; the invariant landed
  **Entry 53 (07-23)** and cascaded in **Entry 57 (07-25)**; Entry 58's sweep then fixed `enumerate.ts` and
  `cleandelta.ts` — **the two consumers that existed when the rule was written.** ⇒ **A CORRECTNESS RULE ADDED TO A
  MATURE CODEBASE MUST BE SWEPT BACKWARD OVER THE CODE THAT ALREADY EXISTS, NOT MERELY APPLIED FORWARD.** Writing the
  rule into the frozen contract (D65's whole point) guarantees the *next* consumer obeys it; it does nothing whatever
  about the ones already written. **Nobody had ever run that backward sweep, for any rule.**
- **⚠ A THIRD, SMALLER FINDING — THE SCOPE WAS SHARED BY COPY-PASTE.** The three-line block that resolves the option
  catalogue was **duplicated in `enumerate.ts` and `cleandelta.ts`**, and my fix was about to make it a third and fourth
  copy. That is the drift `isElementActive` was extracted to prevent, reappearing one level up: **the RULE was shared
  while the SCOPE THE RULE IS EVALUATED AGAINST was not** — and a consumer that assembles the scope slightly differently
  gets a slightly different answer from an identical rule (domain rule 10). ⇒ extracted **`optionScopeOf(scene, override)`**
  into `designoptions.ts` beside the rule it serves; all four consumers now call it.
- **FIXED (D68), all additive — no frozen byte moved, no `SCENE_SCHEMA_VERSION` bump, no field, no verb.**
  `assembleRoomInput` / `DocumentContext.roomMetrics` take an optional `RoomOptionSelection`; `resolveJoins` takes an
  optional `JoinOptionSelection`; both default to every set's primary, which is the whole of v1.0.0 (nothing authors an
  option yet) ⇒ **behaviour is unchanged for every existing document.** The join override path is filtered too (an
  override naming a non-active wall cannot force a join). ⚠ **`wallsJoinedTo` is DELIBERATELY left unfiltered and now
  says so in the code** — it is the INVALIDATOR, whose error directions are not symmetric: naming too many walls costs a
  rebuild that produces identical geometry, naming too few leaves a stale solid (0a's original `#touched` hole). *An
  undocumented asymmetry invites a wrong "fix" later.*
- **⚠ REVERT-VERIFIED, in the stronger order:** both tests were written and **measured failing against the unfixed code
  first** — room `expected 10640000 to be close to 18240000` (2 failures), joins 4 failures incl. mode 2's vanished
  miter — and only then fixed. `tests/room-option-cascade.test.ts` (5) + `tests/join-option-cascade.test.ts` (6), both
  pure (neither path reaches the kernel), plus the 8 real-OCCT `wall-joins` tests still green ⇒ the anti-fuse gate held.
- **➕ SAME SESSION — THE SECOND BACKWARD SWEEP: DOMAIN RULE 6 (THE CANONICAL RE-SORT / D8). ✅ RESULT: CLEAN, AND
  MEASURED RATHER THAN REASONED. DO NOT RE-AUDIT.** This was the rule I flagged as *"no test would fail if it were
  removed"* — the one whose whole purpose is to let v1.0.x multithreading turn on **without invalidating every saved
  file in the field**, and whose falsity is invisible on a single-threaded build. Two halves, both now answered:
  - **(a) THE CODE READS NO TRAVERSAL INDEX — verified by walking the chain, not by trusting the comment.** Faces sort
    on derivation → a structural signature built from the neighbours' **derivations** (strings, explicitly *not* their
    canonical indices, to avoid a circularity) → the D28 centroid. `canonOfFace` then falls out of that canonical order;
    `vertexSig` is built from **canonical** face indices; edges sort on derivation → an endpoint signature of those
    canonical indices → the centroid. **No comparator term anywhere reads an OCCT map index.** ⚠ I also checked the
    thing that would be undefined behaviour rather than a wrong answer: `rowLess` and `sameDerivation` compare **exactly
    the same seven fields**, so the comparator is a valid strict weak ordering and `std::sort` is not being misused.
  - **(b) ⚠⚠ AND THE SUITE *DOES* CATCH ITS REMOVAL — I MEASURED IT BY DELETING IT.** Neutered the face re-sort,
    rebuilt the kernel (~60 s, §1c-3), and ran the naming suite: **2 tests fail** — `naming-hard-topology`'s *"a GROOVE
    splits a face and both halves keep their identity through a resize"* and `naming-transform`'s *"refs the BOOLEAN
    itself owns — a split face, occurrence and all — survive a rotation"*. **Both are split-face cases, which is
    exactly right:** they are the shapes where several sub-shapes share a derivation and the sort is the only thing
    separating them. ⚠⚠ **AND THE FAILURE MODE IS THE ONE THE DESIGN PROMISES: `UNRESOLVED_SUBSHAPE_REF` — a
    REFUSAL, not a wrong name** (*"two sub-shapes resolved to the SAME identity — refusing rather than hand out a ref
    that names two things"*). Losing the normalisation does not silently misname anything; it makes the kernel decline.
    That is core_logic §5's *"fails loudly rather than inventing a name"* holding under a deliberate injury.
  - ⇒ **My Entry-59 claim that "no test would fail if the re-sort were removed" was WRONG, and measuring is what
    corrected it.** Rule 6 has real coverage and a safe failure mode; **the D8 multithreading unlock is not carrying a
    hidden identity risk.** Kernel source restored from backup and the committed `.wasm` restored byte-identical
    (`git checkout`, md5 `238a38e0…`); `pnpm verify` re-run green afterwards.
- **⚠ NOTED, NOT FIXED (deliberate, and neither is pre-freeze):** `agent.query()` has **no way to express the option
  question** — an agent asking *"how many load-bearing walls on level 2"* would count both schemes. It is a browse API
  rather than an aggregator, and **`agentApi` is versioned separately (D22) and does NOT inherit the P5 freeze**, so it
  is additive whenever the bodies land. And **`RoomSeparator` carries no `designOptionId`** — a separator cannot belong
  to an option; additive if ever wanted.
- **Box:** read/measure/build only; `pnpm verify` ×3 + targeted vitest; **nothing installed, no containers touched, no
  ports bound**; `/tmp` 10 MB; available RAM never below ~2.3 GB; **both live public sites up throughout**.
  ⚠ **The `format:check` trap bit again and was caught by capturing the real exit code** — a background job's reported
  status was the *wrapper's* 0, while pnpm had exited 1 on two unformatted files, **before the tests ever ran**.

**NEXT:**
- **Owner:** **the FREEZE (step 6) remains the owner's act and is unblocked** — D68 is additive and touched no frozen
  shape. ⚠ Entries 57+58 are now **pushed**; Entry 59 is owner-gated for commit/push as usual.
- **⚠⚠ THE JUDGEMENT CALL IS NOW ANSWERED WITH EVIDENCE, AND THE BACKWARD SWEEP SHOULD BE RUN ONCE PER LOAD-BEARING
  RULE, NOT ONCE PER SESSION.** Two rules were swept this session and they came back differently, which is the point:
  **the design-option invariant was broken in two places** (D68, above), and **domain rule 6 was clean and is now
  measured clean** (above — and measuring overturned my own written claim about it). ⚠ **A clean sweep is worth as much
  as a dirty one:** rule 6 is the D8/MT unlock, and it is now recorded as verified rather than assumed, so nobody
  re-audits it. **Still unswept: rule 12** (shared-on-style/unique-on-instance) · **rule 16's "a quantity can never
  double-count"** · **rule 5** (new views/formats/commands are additive registrations — the *views* half is untested).
  Each is cheap now and a three-product amendment after the freeze.
- **Zayd:** the schedules body (D58 row Ⓐ) · the join O(N²) endpoint index · the D29 cache bodies.
- **Amer:** unchanged — renderer batching/instancing, P4.5, FSA adapter, WebGPU, service worker/PWA, Cloudflare deploy.
