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

⚠⚠ **RULED 2026-08-15 — NEITHER (D87).** The repository stays private and unprotected, so **nothing on
GitHub's side refuses a self-approving merge**. The `agent-start.mjs` identity guard (`T-013`) is the
only enforcement. ⚠ **Q11 must be answered before this is revisited** — an unnamed CLA counterparty is
safe only while nothing external can arrive.

## Seat credentials

**Ruled 2026-08-15 (D87): env-scoped, never `gh auth switch`.** A seat whose GitHub account is not the
**machine's own default** reads a token file for its turn:

```bash
export GH_TOKEN=$(cat ~/.config/bunyan/<seat>.token)
```

The file is `~/.config/bunyan/<seat>.token`, mode **600**, and lives outside the repo — **per machine**,
never synced or committed. Each machine's `gh` default covers two of the five seats; the other two need
this export:

| Machine | Default identity (`GH_TOKEN` unset) | Needs a token file |
| --- | --- | --- |
| box | `Davidian-Abdo` — covers `zayd`, `brahim` | `hmdnah` (`narutousomaki741`) |
| pc | `Davidian-Abdo` — covers `khalihlna` | `amer` (`narutousomaki741`) |

⚠ **`gh auth switch` is rejected**: the active account is global in `hosts.yml`, and each machine runs
more than one seat, so a concurrent seat would inherit whichever identity was switched to last.
⚠⚠ **Verify before any write call** — `gh api user --jq .login` must equal the seat's account from
`node scripts/seats.mjs account <seat>`. A silent fallback to the default identity is a self-approval,
which is why `T-013` makes this a refusal rather than a convention.

The token needs scope `repo` (classic), or Contents read/write + Pull requests read/write + Metadata
read (fine-grained, scoped to this repository). The account must already be a collaborator with `push`.

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

## Self-hosted CI runner

**Ruled 2026-08-16 (D89).** Both CI jobs run on `bunyan-oracle-runner` (`runs-on: [self-hosted,
bunyan-oracle]` in `ci.yml`), not GitHub-hosted — GitHub-hosted minutes ran out and billing can't be
raised right now; going public for the free public-repo tier is blocked on Q11.

**The box:** owner-provisioned Oracle Cloud Ampere A1, arm64, 1 OCPU, 8GB RAM, Ubuntu 24.04. SSH as
`ubuntu`, key `devbox-hetzner` (this box's own `~/.ssh/id_ed25519.pub`). Registered under
`~/actions-runner`, running as a systemd service (`sudo ./svc.sh status|stop|start`, from that
directory) so it survives reboots and reconnects on its own.

**Why this carries no external-PR risk**, the usual reason GitHub warns against self-hosted runners: the
repo is private and single-owner (D87/Q13), so no stranger's fork can ever get a workflow to execute code
on it.

**To re-register** (token expires, or a new runner instance): `gh api -X POST
repos/Davidian-Abdo/Bunyan/actions/runners/registration-token --jq .token`, then on the runner box, from
`~/actions-runner`: `./config.sh --url https://github.com/Davidian-Abdo/Bunyan --token <token> --labels
bunyan-oracle,self-hosted,arm64 --name bunyan-oracle-runner --unattended --replace`, then `sudo
./svc.sh install && sudo ./svc.sh start`. Needs `gh` installed on the runner itself (not bundled — a
GitHub-hosted image has it, a bare self-hosted one does not; installed via the official apt repo, see
`cli.github.com/packages`) since `pr-shape`'s job calls it directly.

**To check it's alive:** `gh api repos/Davidian-Abdo/Bunyan/actions/runners --jq '.runners[]'` — expect
`status: online`.

## Deliberately absent

- **CODEOWNERS** — reviewer routing is by `machine:` (`scripts/seats.mjs`'s `reviewerFor`), and a
  path-based owner would be a second router that can disagree.
- **Protection on `task/*`** — CI already runs on every `pull_request`.
