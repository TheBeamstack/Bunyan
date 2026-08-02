# Entry 74 | 2026-08-02 | Zayd — the going-public housekeeping: `LICENSE`, the CLA, the attribution notices

**The one-line version.** The last item on §3's NOT BUILT list that **blocks going public** is done:
Bunyan now carries an AGPL-3.0 `LICENSE`, a `NOTICE` discharging the obligations that OCCT and planegcs
actually impose, the verbatim third-party licence texts in `licenses/`, and a `CLA.md` — plus the
machine-readable `license` field that ten manifests were missing. No source package touched, no test
changed, no contract byte moved.

**Why it is its own commit and its own PR.** Entries 64+65's lesson, restated in the TASK. This diff is
all prose and manifests; intermingling it with a code entry makes both unreviewable.

---

## What was actually delivered

| File | What it is | Provenance |
| --- | --- | --- |
| `LICENSE` | GNU AGPL v3, **verbatim**, 661 lines | downloaded from `gnu.org/licenses/agpl-3.0.txt`, sha256 `0d96a4ff…9abcb0` |
| `NOTICE` | the third-party attribution notice | written here |
| `licenses/OCCT-LICENSE_LGPL_21.txt` | LGPL 2.1, verbatim | copied from the OCCT 7.9.3 source tree we actually build |
| `licenses/OCCT_LGPL_EXCEPTION.txt` | the Open CASCADE exception, verbatim | same source tree |
| `licenses/planegcs-LICENSE.txt` | LGPL 2.1, verbatim | copied from the installed `@salusoft89/planegcs@1.2.0` |
| `CLA.md` | Individual Contributor License Agreement | written here, Apache ICLA shape |
| `.prettierignore` | four defensive lines + why | see the measurement below |
| 10 × `package.json` | `"license": "AGPL-3.0-only"` | every workspace manifest had **none** |

⚠ **The licence texts are COPIES OF THE ARTIFACT, NOT OF THE MANUAL** (§1c-9). The OCCT texts come out
of `~/occt-wasm-spike/occt/`, which is the tree the committed `.wasm` was built from — not from a web
page about OCCT. The planegcs text comes out of the installed package, not from its GitHub README.

## FINDING 1 — the licence obligations are NOT symmetric, and only one of them is ours to discharge

The TASK said "the OCCT + planegcs attribution notices" as though they were one job. They are not, and
writing them as one would have produced a notice that is wrong in both directions.

| | **OCCT 7.9.3** | **planegcs 1.2.0** |
| --- | --- | --- |
| Licence | LGPL-2.1 **+ the Open CASCADE exception** | LGPL-2.0-or-later |
| How we consume it | our C++ **statically linked** against its static libs | ordinary **npm dependency**, its own WASM module |
| Do we redistribute a binary of it? | **YES** — `packages/kernel-occt/wasm/bunyan-kernel.wasm` is committed | **NO** — npm fetches it from upstream |
| Modified by us? | no (upstream tag `V7_9_3`, unpatched) | no |
| What we must do | a **prominent notice**, plus discharge LGPL §6 relinking | ordinary attribution |

**The Open CASCADE exception is conditional, and the condition is a notice.** Its text: relief is
granted *"provided that you give prominent notice in supporting documentation to this code that it
makes use of or is based on facilities provided by the Open CASCADE Technology software."* So `NOTICE`
states that sentence explicitly and in those terms, rather than merely listing OCCT in a table of
dependencies. A table would not have satisfied the condition the exception is granted on.

**The static link is the part that needed thought, and D15 already ruled it.** Statically linking an
LGPL library engages §6 — recipients must be able to modify the library and relink. D15 records the
LGPL side-module task as **CANCELLED**, on the reasoning *"public source discharges relink; the static
link STANDS."* `NOTICE` now writes that reasoning down where a recipient can check it: upstream
unmodified at a named tag, our kernel source in-repo, and the reproducible recipe in
`tools/kernel-build/` with the build id `occt-7.9.3-emcc-6.0.2` pinning the combination. That is the
discharge, and it is only true because the recipe is committed — which it is.

⚠ For planegcs the honest statement is the *narrower* one, and the draft I nearly wrote overclaimed.
We ship no planegcs binary. Saying "Bunyan redistributes planegcs under the LGPL" would have been a
false statement about our own distribution.

## FINDING 2 — every workspace manifest declared no licence at all

Ten `package.json` files, `"license": undefined` in all ten. All are `private: true`, so nothing was
being published wrongly — but the manifest is what tooling reads, and a repository whose `LICENSE` file
and whose manifests disagree is the §1c-7 shape in a new place. Set to the SPDX identifier
**`AGPL-3.0-only`** (not the deprecated bare `AGPL-3.0`) across all ten.

## FINDING 3 — ⚠ I put a claim in `.prettierignore` that measurement then refuted

The TASK's own warning is that `.prettierignore` lists paths and a prose file needs its line in the
same commit. I added four lines and wrote a comment asserting that `CLA.md` "IS markdown and prettier
would reflow it."

**Then I measured it, and it was false.** Running `prettier --ignore-path /dev/null --check` on each
file, with the ignore deliberately disabled:

```
LICENSE                        no parser inferred -> ERRORS if named, SKIPPED under `--check .`
NOTICE                         same
licenses/planegcs-LICENSE.txt  same (.txt has no prettier parser)
CLA.md                         "All matched files use Prettier code style!"  <- already conforms
```

So **none of the four lines changes anything today.** `format:check` runs `prettier --check .`, which
skips extensionless and `.txt` files by inference, and `CLA.md` as committed happens to conform. The
comment now says exactly that, with the command that produced it, and states the two futures the lines
are actually defending: a rename to `LICENSE.md`, and the next `CLA.md` edit that leaves it
non-conforming.

This is Entry 73's lesson arriving one entry later and pointing at me: **I wrote a plausible claim about
a file's behaviour instead of running the one command that settles it.** Cost: about ninety seconds.
The line would have sat in the repo indefinitely otherwise, and it is exactly the kind of statement
nobody re-reads.

## What is deliberately NOT here

- **No `CONTRIBUTING.md`.** Out of scope; the TASK named three artifacts. The CLA carries its own
  signing procedure, so nothing is unusable without it.
- **No `SECURITY.md`, no issue templates, no code of conduct.** Also going-public furniture, also not
  asked for, and none of them blocks the licence question.
- **No copyright headers in source files.** A repo-wide header sweep is a large mechanical diff that
  would swamp this one, and the AGPL does not require per-file headers. Worth doing; worth doing alone.
- **`licenses/` is not wired into any build or bundle.** The web app does not surface an
  "open source licences" screen. That is Amer's layer and a real v1.0.0 item — flagged, not built.

## ⚠⚠ TWO THINGS ONLY THE OWNER CAN CLOSE, AND THEY ARE NOW `open_rulings.md` Q11 AND Q12

Both are inside `CLA.md`, marked at the top of the file so no one signs it unaware:

1. **`<LEGAL ENTITY>` is a placeholder.** A CLA is an agreement *with somebody*. The counterparty is
   either the owner as a natural person or a company that does not exist yet, and I cannot invent
   either. Every occurrence is marked.
2. **No lawyer has read it.** It follows the Apache ICLA structure — the conventional shape for this
   exact situation — and §2's grant is written to do what D15 needs (relicensing under terms of the
   project's choosing, which is what makes AGPL + commercial possible). That is a sound draft, not
   advice. It must be reviewed before the first external contribution, which is the first moment it
   has to hold.

Neither blocks anything today: there are no external contributors, and this file existing is what stops
one arriving before the agreement does.

## Verification

- `pnpm verify` — **all six gates, real exit code 0**, read directly. **630 green, 78 files.**
- Suite count unchanged, as it must be: this entry adds no test because it changes no behaviour. The
  claim it makes about the world — that the licence texts are verbatim — is verified by construction
  (they are copied, not typed) and by the sha256 recorded above.
- `tests/freeze-boundary.test.ts` green ⇒ **RISK: additive.** No frozen byte, no `SCENE_SCHEMA_VERSION`
  bump, no field, no verb.
- ⚠ **No revert-verification, and that is correct rather than a gap.** §1b's rule is that *a fix
  without a test that fails in its absence is an assertion* — it governs fixes. There is no behaviour
  here to revert. The one empirical claim I did make (Finding 3) was measured with the ignore disabled,
  which is the same move in the same spirit.
