# RUNBOOK — the controls that live on GitHub, not in the repo

**What it is, and who reads it when.** The account-side settings nothing in the repo re-checks: labels,
branch protection, seat credentials, the CI runner. Read by the owner, or by `brahim` with `gh`
authenticated as an admin, when one of them needs setting or has failed. `AGENTS.md §5` is the policy
this implements.

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

**Status: unavailable, and ⚠⚠ RULED 2026-08-15 — NEITHER (D87).** Both
`gh api repos/TheBeamstack/Bunyan/branches/main/protection` and `…/rulesets` return
`403 — "Upgrade to GitHub Pro or make this repository public"`; the token is `ADMIN`, so the plan is the
blocker, not access. The repo stays private and unprotected, so **nothing on GitHub's side refuses a
self-approving merge** — diwan's `require_identity` (`scripts/protocol.py`) is the only enforcement.
⚠ **Q11 must be answered before this is revisited**: an unnamed CLA counterparty is safe only while
nothing external can arrive.

## Seat credentials

**Ruled 2026-08-15 (D87): env-scoped, never `gh auth switch`.** A seat whose GitHub account is not the
**machine's own default** reads a token file for its turn:

```bash
export GH_TOKEN=$(cat ~/.config/beamstack/<account>.token)
```

The file is `~/.config/beamstack/<account>.token` (diwan's `seat_credential`, named by the seat's
ACCOUNT), mode **600**, and lives outside the repo — **per machine**, never synced or committed. Each machine's `gh` default covers two of the five seats; the other two need
this export:

| Machine | Default identity (`GH_TOKEN` unset)       | Needs a token file            |
| ------- | ----------------------------------------- | ----------------------------- |
| box     | `Davidian-Abdo` — covers `zayd`, `brahim` | `hmdnah` (`narutousomaki741`) |
| pc      | `Davidian-Abdo` — covers `khalihlna`      | `amer` (`narutousomaki741`)   |

⚠ **`gh auth switch` is rejected**: the active account is global in `hosts.yml`, and each machine runs
more than one seat, so a concurrent seat would inherit whichever identity was switched to last.
⚠⚠ **Verify before any write call** — `gh api user --jq .login` must equal
the seat's account in `docs/seats/README.md`. A silent fallback to the default identity is a self-approval,
which is why `T-013` makes it a refusal rather than a convention.

The token needs scope `repo` (classic), or Contents read/write + Pull requests read/write + Metadata
read (fine-grained, scoped to this repository). The account must already be a collaborator with `push`.

Run this the day either changes:

```bash
gh api -X PUT repos/TheBeamstack/Bunyan/branches/main/protection --input - <<'JSON'
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

## CI runner

**Ruled 2026-09-14 (D91).** Both CI jobs run on GitHub-hosted arm64, `runs-on: ${{ vars.CI_RUNNER ||
'ubuntu-24.04-arm' }}` in `ci.yml`: the repo is public, so it uses the free public-repo tier, and a
self-hosted runner on a public repo would execute fork PRs on owner hardware. A repository variable
`CI_RUNNER` overrides the label.

**To check a run:** `gh pr checks <n> --repo TheBeamstack/Bunyan`.

## Deliberately absent

- **CODEOWNERS** — reviewer routing is diwan's `reviewer_for` (`scripts/protocol.py`), and a
  path-based owner would be a second router that can disagree.
- **Protection on `task/*`** — CI already runs on every `pull_request`.
