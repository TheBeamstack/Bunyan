# RUNBOOK — the controls that live on GitHub, not in the repo

Labels, branch protection and repository settings: clicked once on an account, with nothing in the repo
re-checking them afterwards. Run by the owner, or by `brahim` with `gh` authenticated as an admin.
`AGENTS.md §5` is the policy this implements.

## Reserved-class labels

CI's `pr-shape` job (`scripts/reserved-classes.mjs`) writes these and **fails if it cannot**, so they must
exist before the first PR that earns one.

```bash
gh label create needs-operator/contract-touching --color B60205 \
  --description "The frozen surface moved — the owner merges this, not the reviewing seat."
gh label create needs-operator/legal-figure --color D93F0B \
  --description "Touches CLA.md — a legal/contractual figure is never invented by a seat."
gh label create needs-operator/freeze --color 5319E7 \
  --description "Re-baselines the frozen surface — the P5 freeze itself."
```

**Status: done** (2026-08-15). `tests/protocol/reserved-classes.test.ts` asserts these three strings match
`RESERVED_CLASSES`, so a rename in one place fails `pnpm docs:check`.

## Branch protection

**Status: blocked by the repository's plan, not by anything in the repo.** Both APIs return
`403 — "Upgrade to GitHub Pro or make this repository public"`:

```
gh api repos/Davidian-Abdo/Bunyan/branches/main/protection
gh api repos/Davidian-Abdo/Bunyan/rulesets
```

`Bunyan` is private on a free personal plan; the token is `ADMIN`, so access is not the issue. This
supersedes `open_rulings.md` Q13's original objection — a second account now exists, so the question is
**public, Pro, or neither**. ⚠ Going public invites the first external PR, and Q11/Q12 (`CLA.md`'s
counterparty and a lawyer's read) are unruled.

Run this the day either changes:

```bash
gh api -X PUT repos/Davidian-Abdo/Bunyan/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["typecheck · lint · geometry harness", "PR shape · reserved classes"]
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

⚠ **`enforce_admins: false` is required, not lax.** Two protocol acts are direct commits to `main`:
`brahim`'s readiness sweep (`AGENTS.md §1.3`) and the owner's merge of a `contract-touching` PR they
authored, which no one else can approve. The self-merge Q13 targets is held by
`required_approving_review_count: 1` plus GitHub's self-approval refusal, which bind `push`-only accounts
regardless.

⚠ `contexts` are check-**run** names (`name:` in `ci.yml`); renaming a job there strands the required check.

## Deliberately absent

- **CODEOWNERS** — reviewer routing is by `machine:` (`scripts/seats.mjs`'s `reviewerFor`), and a
  path-based owner would be a second router that can disagree.
- **Protection on `task/*`** — CI already runs on every `pull_request`.
