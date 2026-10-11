# HANDOVERS — H- records handed to this repo for its steward to dispose

Append-only, one record per handover. Only `cleared:` is ever edited, by the steward who disposes it
(TheBeamstack/diwan `docs/seats/hamadi.md`, R22).

## H-20261011-13 Bunyan: secret scanning, push protection, Dependabot alerts and Dependabot security updates are disabled on this public repo
- opened: 2026-10-11T10:04Z
- by: zayd
- from: Custodianship
- scope: item
- item: PR #64
- what: on public TheBeamstack/Bunyan every security_and_analysis feature reads disabled, `{"dependabot_security_updates":{"status":"disabled"},"secret_scanning":{"status":"disabled"},"secret_scanning_non_provider_patterns":{"status":"disabled"},"secret_scanning_push_protection":{"status":"disabled"},"secret_scanning_validity_checks":{"status":"disabled"}}`, and Dependabot alerts are off, GET dependabot/alerts answering 403 "Dependabot alerts are disabled for this repository."; the item is PR #64, the PR that carries this record, because no PR can address a repository setting
- why: with secret scanning and push protection off, a credential pushed to this public repo is neither blocked before it lands nor reported after; with Dependabot alerts off, no vulnerable dependency is reported and no security-update PR is opened, so the Custodianship lane's Dependabot triage has nothing to read here; each is a repository admin setting, enabled by the owner alone, and this lane changes none (Custodianship `docs/INVARIANTS.md` §1-2)
- evidence: `gh api repos/TheBeamstack/Bunyan --jq .security_and_analysis`; `gh api 'repos/TheBeamstack/Bunyan/dependabot/alerts?per_page=1'` → HTTP 403; `gh api -i repos/TheBeamstack/Bunyan/vulnerability-alerts` → 404 Not Found (204 when enabled); `gh api repos/TheBeamstack/Bunyan --jq .visibility` → public
- need: route enabling Dependabot alerts, Dependabot security updates, secret scanning and push protection on Bunyan to the owner as an owner action
- cleared: -
