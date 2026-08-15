# RUNBOOK — the things that live on GitHub, not in the repo

**What this is.** Every control this project depends on that **cannot be expressed as a file in the
repository**: labels, branch protection, repository settings. A gate written in `scripts/` ships with
its own test and runs itself; the things here are clicked once by the owner, on an account, and then
nothing ever re-checks them. That asymmetry is the whole reason this file exists — it is the checklist
for a repository that has to be re-established, and the record of what was deliberately **not** done.

**Who runs it.** The owner, or `brahim` with an authenticated `gh` carrying admin on the repository.
`AGENTS.md §5` is the policy this implements; nothing here decides anything on its own.

---

## Reserved-class labels

The three owner-gated classes of `AGENTS.md §5`, as labels CI writes onto a PR
(`scripts/reserved-classes.mjs`, wired in `.github/workflows/ci.yml`). **CI fails if it decides a PR
needs one of these and cannot apply it**, so the labels must exist before the first PR that earns one.

```bash
gh label create needs-operator/contract-touching --color B60205 \
  --description "The frozen surface moved — the owner merges this, not the reviewing seat."
gh label create needs-operator/legal-figure --color D93F0B \
  --description "Touches CLA.md — a legal/contractual figure is never invented by a seat."
gh label create needs-operator/freeze --color 5319E7 \
  --description "Re-baselines the frozen surface — the P5 freeze itself."
```

⚠ **The three strings are asserted** by `tests/protocol/reserved-classes.test.ts` against
`RESERVED_CLASSES` in `scripts/reserved-classes.mjs`. Renaming one here without renaming it there is
caught by `pnpm docs:check`, not by a PR going quietly unlabelled.

**Status: DONE** — created 2026-08-15 on `Davidian-Abdo/Bunyan`.

---

## Branch protection

**Status: BLOCKED, and not by anything in this repository.** Measured 2026-08-15:

```
$ gh api repos/Davidian-Abdo/Bunyan/branches/main/protection
{"message":"Upgrade to GitHub Pro or make this repository public to enable this feature.","status":"403"}
$ gh api repos/Davidian-Abdo/Bunyan/rulesets
{"message":"Upgrade to GitHub Pro or make this repository public to enable this feature.","status":"403"}
```

Both the legacy protection API **and** the newer rulesets API are gated. `Bunyan` is a **private
repository on a free personal plan**, and branch protection on private repositories is a paid feature.
The token is not the problem — it carries `repo` + `admin:org`, and `viewerPermission` is `ADMIN`.

⚠ **This is a NEW blocker on `open_rulings.md` Q13, not the old one.** Q13's own recommendation was
_"not yet — take it the day Amer (or anyone) has their own account"_, because on a single-account repo
protection would block every merge. **That condition is now satisfied**: `narutousomaki741` exists with
push access, and `AGENTS.md §0`'s crossed-account pairing means every builder/reviewer pair already
differs by account. The account objection is gone; a billing/visibility one replaced it, and nobody had
measured that until this turn.

**Three ways forward, and the trade is the owner's:**

| Route                     | What it costs                                                                                                                                                                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Make the repo public**  | Free, and matches Entry 74's going-public work (AGPL-3.0, `NOTICE`, `CLA.md`). ⚠ But `AGENTS.md` calls the CLA a hard prerequisite for the first external PR, and **Q11** (`<LEGAL ENTITY>`) and **Q12** (a lawyer's read) are both still unruled. Going public invites the contribution the CLA is not ready to receive. |
| **Upgrade to GitHub Pro** | A billing step only the owner can take. Keeps the repository private. Then run the block below.                                                                                                                                                                                                                           |
| **Stay as-is**            | ⚠ Every merge stays advisory. `AGENTS.md §6`'s _"the author never merges their own entry"_ is enforced by protocol and by the reviewing seat's own account — not by GitHub refusing.                                                                                                                                      |

**When one of the first two happens, this is the whole of it.** `main` is the only protected branch.

```bash
gh api -X PUT repos/Davidian-Abdo/Bunyan/branches/main/protection \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "typecheck · lint · geometry harness",
      "PR shape · reserved classes"
    ]
  },
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false
  },
  "enforce_admins": false,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

⚠⚠ **`enforce_admins` IS `false` ON PURPOSE, AND IT IS NOT LAXNESS.** Two things in the protocol are
direct commits to `main` by design, and `true` would break both:

1. **`brahim`'s readiness sweep** — `docs/prompts/brahim-orchestrator.md` step 4a flips a `blocked`
   row to `ready`, and a `review` row to `done`, as a direct commit to `main`. `AGENTS.md §1.3` makes
   that explicit: _"a pure bookkeeping act is a direct commit to `main`."_ Under `enforce_admins: true`
   every status-cell flip becomes a PR, a review and a merge — ceremony for a turn that produces no
   handoff worth reading, which is the exact reason it was made a direct commit.
2. **The owner's own merge of a `contract-touching` PR.** GitHub refuses self-approval, so a PR the
   owner authored and the owner must merge has nobody left to approve it.

The self-merge that Q13 actually cares about (Entry 74) is blocked by
`required_approving_review_count: 1` **plus GitHub's own refusal to let an author approve their own
PR** — neither of which `enforce_admins` affects for a non-admin account. `narutousomaki741` has
`push`, not `admin`, so `amer` and `hmdnah` are held by the rule regardless.

⚠ **The `contexts` are check-RUN names, not job ids** — GitHub matches the string a run reports, which
is the `name:` field in `.github/workflows/ci.yml`. Rename a job there and this list must move in the
same commit, or the required check waits forever on a name nothing produces.

---

## What is deliberately not here

- **A CODEOWNERS file.** Reviewer routing is by `machine:`, not by path — `scripts/seats.mjs`'s
  `reviewerFor` resolves it, because the first item on a review checklist is _revert the fix and paste
  the red output_ and only one machine can do that for a browser claim. A path-based owner would be a
  second router that can disagree with the first.
- **Required checks on `task/*` branches.** CI runs on every `pull_request` already; protecting the
  branches work happens on would only stop a seat pushing to its own claim.
