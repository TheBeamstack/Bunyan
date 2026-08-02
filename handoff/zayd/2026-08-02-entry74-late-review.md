# Entry 76 — 2026-08-02 — Zayd

## Entry 74 reviewed late: `NOTICE` said seven shipped dependencies were build-time only

---

## 0. What this session was

Two halves, and the second exists because of the first.

**Step 3 — I reviewed PR #3 (Entry 75) and merged it.** That is the protocol working for the first
time: Entry 75 deliberately left its own PR open, and a later session — this one — reviewed and
merged it. One defect found and fixed on its branch (§1).

**Step 6 — the TASK.** Q1–Q3 are still unruled (a **seventh** session), so `Zayd_Prompt.md` §2's
fallback applied: **review Entry 74 late**, because it is on `main` having never been read by a
second party. It named two claims for "a checker who never came". Both were checkable. **One was
false** (§2).

---

## 1. Reviewing Entry 75 — the guard was blind to prettier's line wrap

Entry 75 added `docs:check`'s rule that *only the newest §7 entry may say `AWAITING REVIEW`*, so an
author who merges their own PR is caught at the next entry. The rule is right. **Its implementation
could not see most of the text it was checking.**

`parseAbstracts` stored each field as the remainder of its `- **NAME:**` line and **dropped every
continuation line**. These documents are prettier-formatted at `printWidth: 100`, so **the line
break is placed by sentence length, not by the author.**

Measured, on the real file, before the fix — Entry 74's `REVIEW:` rewritten as:

```
- **REVIEW:** ⚠ This entry is the currently open PR and the next session merges it at step 3 —
  **AWAITING REVIEW.**
```

…passed `prettier --check` **and left `docs:check` fully GREEN.** A stale marker sitting on `main`,
which is the exact condition the guard exists to make impossible.

**Fixed** with `fieldsFull` on `parseAbstracts` (the whole indented bullet, continuation lines
joined back on) plus a regression test. Test-first: RED before the fix, GREEN after, and the
identical corruption applied to the real file now fails loudly.

⚠ Deliberately **not** the abstract's `raw` text. Entry 75's own `VERIFIED:` field discusses the
marker in prose (*"restore Entry 74's stale `AWAITING REVIEW`"*), so a raw-text match would fire on
the very entry that introduced the guard, the moment it stopped being newest.

> **The transferable part, and it is Entry 75's own lesson one level down.** Entry 75 fixed *"a rule
> that lived only in a design doc"* by writing it into the prompt **and** backing it with a machine
> check — correct, and the right instinct. But the machine check inherited a parser written for a
> different question (*is this field present and non-empty?*), where first-line-only was perfectly
> adequate. **A guard is only as good as the text it is allowed to see.** When you convert a rule
> into a test, check what the test actually *reads*, not just what it asserts.

Also fixed there: **Q11/Q12/Q13 in `open_rulings.md` were not table rows.** Each sat behind a blank
line, so markdown parsed them as paragraphs of literal pipe-text — three open rulings rendering as
raw `|`-strings in the one document the owner reads to issue rulings. Proof they were not a table:
`prettier --check` was content before, and demanded a reformat the instant the blank lines were
removed.

---

## 2. THE TASK — Entry 74's `NOTICE`, read against the artifacts

Entry 74 shipped the going-public housekeeping: `LICENSE` (AGPL-3.0), `NOTICE`, `licenses/`,
`CLA.md`, and a `license` field in all ten manifests. Its own hand-off flagged two claims for a
reviewer: that `NOTICE` makes **legal claims** about how we consume OCCT and planegcs, and that its
**dependency sweep was reasoned from the two dependencies it already knew about** rather than run
against the lockfile.

### 2a. ⚠⚠ The defect: `NOTICE` §3 was false

The section read:

> "The remaining dependencies are build- and test-time only (TypeScript, Vite, Vitest, ESLint,
> Prettier and their transitive dependencies) under permissive licences, **and are not redistributed
> as part of Bunyan.**"

`pnpm licenses list --prod` — **the instrument Entry 74's own text named as authoritative, and which
nobody had run** — reports **eight** production packages, not two:

| Package        | Version | Licence           | How it arrives                     |
| -------------- | ------- | ----------------- | ---------------------------------- |
| `@salusoft89/planegcs` | 1.2.0 | LGPL-2.0-or-later | `@bunyan/sketch-solver` (attributed) |
| `react`        | 18.3.1  | MIT               | `apps/web`                         |
| `react-dom`    | 18.3.1  | MIT               | `apps/web`                         |
| `three`        | 0.171.0 | MIT               | `apps/web`                         |
| `fflate`       | 0.8.3   | MIT               | `@bunyan/document` (writes the zipped `.bnn`) |
| `scheduler`    | 0.23.2  | MIT               | transitively, through React        |
| `js-tokens`    | 4.0.0   | MIT               | transitively, through React        |
| `loose-envify` | 1.4.0   | MIT               | transitively, through React        |

**Seven MIT-licensed packages ship inside the built browser bundle, and none of them was
attributed.** MIT requires its copyright notice and permission notice to travel with "all copies or
substantial portions of the Software". So the file whose entire job is to prevent an attribution
defect contained one — and asserted the opposite in writing.

Verified against the manifests directly, not just the tool: `react`, `react-dom`, `three` are
`dependencies` (not `devDependencies`) of `apps/web`; `fflate` is a `dependency` of
`@bunyan/document`.

**FIXED:**

- the seven licence texts copied out of the installed packages into `licenses/` — **the artifacts,
  never a web page**, which is Entry 74's own stated principle and the right one;
- `NOTICE` §3 rewritten to name all seven with their copyright lines and licence paths, §4 now
  carries the (true) build-time-only statement, and a new **§5 records the correction** rather than
  quietly overwriting a false claim in a legal document;
- **`tests/notice-attribution.test.ts`** — the durable half, §2c.

### 2b. ⚠ The second, smaller claim: "the pinned toolchain version"

`NOTICE` §1 said the recipe carries "compiler flags, the OCCT configuration, and **the pinned
toolchain version**", and that the build id `occt-7.9.3-emcc-6.0.2` "**pins** the exact
combination". Read against the artifacts, neither is true:

- `tools/kernel-build/README.md` invokes the toolchain as **`emscripten/emsdk:latest`** — a mutable
  tag. A rebuild today need not use the compiler that produced the committed module.
- `OCCT_BUILD_ID` is a **hand-maintained string constant** at `packages/kernel-occt/src/kernel.ts:52`,
  not a value read back out of the artifact. Four tests assert the build id — all against that same
  constant, so a toolchain drift is asserted against itself and **nothing would catch it**.

⚠ **This is not a licence defect and I did not report it as one.** LGPL 2.1 §6 requires that a
recipient be able to modify the Library and relink; `:latest` satisfies that. It is a
*reproducibility* claim that overstates the artifact. `NOTICE` now says so plainly — including that
the build id **records** rather than pins — and the digest pin is **Q14**, deliberately not done
here: it changes `link.sh`/`README.md`, which Entry 75 just placed behind the re-seed gate, so it
wants its own diff and a rebuild to confirm the digest.

### 2c. The fix that outlives this session: `tests/notice-attribution.test.ts`

The corrected prose is not the deliverable. **`NOTICE` is a claim about the artifact, and this
repo's ledger scores unenforced claims at nine dirty out of eighteen.** The new test walks the
**real installed runtime closure** — each workspace manifest's `dependencies` (never
`devDependencies`, never `workspace:*` siblings), then transitively through pnpm's own link layout —
and requires every package it finds to be attributed in `NOTICE` with its licence text present in
`licenses/`.

Five assertions, including two aimed at its own weak spots:

- it fails if the walk finds fewer than 8 packages, because **every other assertion quantifies over
  that set** and an empty walk would pass everything vacuously (§1c-7's shape exactly);
- it fails if `NOTICE` attributes a *build-time* package as if it shipped — the inverse error, which
  pads the list and hides a real omission inside it.

⚠ **The check is the licence-text citation, not the bare package name, and that correction came out
of testing my own test.** A substring match on the name passes on prose: "three" occurs in the
sentence naming the direct dependencies, and "react" is a substring of "react-dom". **Measured —
deleting `three`'s entire attribution block left `notice.includes('three')` TRUE and the gate
green.** Requiring `licenses/<name>-LICENSE.txt` ties the name to an artifact and cannot be
satisfied by a passing mention.

**REVERT-VERIFIED 3 WAYS**, each firing exactly its own assertion:

1. remove `three`'s licence citation from `NOTICE` → RED, *"three@0.171.0 (MIT) is a RUNTIME
   dependency … but NOTICE does not attribute it"*;
2. delete `licenses/three-LICENSE.txt` → RED **twice**, independently (the text-exists assertion and
   the cited-path-exists assertion);
3. **the realistic one** — add `vitest` as a runtime dependency in the root manifest → RED naming
   `vitest@2.1.9`, which is precisely the future mistake this gate exists to stop.

### 2d. Checked and found SOUND — reported so nobody re-does it

- **The OCCT static-link description is accurate.** `link.sh` compiles `/work/src/kernel.cpp` and
  links the OCCT static archives into one module; there is no `--pre-js`/`--post-js` or response
  file, and `configure.sh` is self-contained. The prominent-notice obligation is discharged in the
  words the exception asks for.
- **planegcs is described correctly**, including the honest parenthetical that the package declares
  `LGPL-2.0-or-later` while shipping the LGPL 2.1 text — I confirmed both halves.
- **The re-seed-gate half of Entry 74** was already re-verified by Entry 75's extension of
  `tests/reseed-gate.test.ts`. The prose was indeed where the unchecked risk sat, exactly as the
  hand-off predicted.

---

## 3. Verification

`pnpm verify` — **644 green across 210 suites, all six gates, real exit code 0** (baseline 638 at
Entry 75: +5 from `notice-attribution`, +1 from the wrapped-marker regression test).
`freeze-boundary` green ⇒ **RISK: additive**: no frozen byte, no `SCENE_SCHEMA_VERSION` bump, no field or verb on a frozen shape. No
kernel C++ change and no WASM rebuild.

---

## 4. What is owed

- **Q1–Q3 still block the plan/section unit — a seventh session.** Unchanged, and still the single
  most valuable thing the owner can unblock.
- **Q14 (new)** — pin the emsdk image by digest so the kernel build is byte-reproducible.
- **Q13** (branch protection), **Q11/Q12** (the CLA's counterparty and a lawyer's read) stand.
- **Amer:** an "open source licences" screen is his layer and is still unbuilt. It now has a real
  list to render — `NOTICE` §3 — where before it would have shown two entries and been wrong.

---

## 5. The lesson

**Entry 74's defect was not that it got a licence wrong. It is that it reasoned about a set instead
of counting it.** §1c-8 already says this in its second mechanical form — *when a rule quantifies
over a SET, COUNT the set rather than reading the code that implements one member of it* — and an
attribution notice quantifies over every dependency that ships. The sweep was performed against the
two dependencies that were already in the author's head.

⚠ And the reason it survived to `main` is the other half: **the entry flagged both claims for a
reviewer, and then merged itself, so the reviewer never came.** A flag addressed to nobody is not a
control. Entry 75 fixed the merging; this entry is what the fix was *for*.

⇒ **The rule I would keep: if you write "a reviewer should check X", you have just admitted X is
unchecked — so either check it before you commit, or make it a test.** Prose that asks someone else
to verify a claim is the weakest artifact in this repo, and it is now zero-for-two.
