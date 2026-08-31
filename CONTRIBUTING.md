# Contributing to Bunyan

Thanks for your interest. Bunyan is a **Beamstack** project on the **BLF-Open**
tier of the
[Beamstack License Framework](https://github.com/TheBeamstack/beamstack-licensing).
Read `LICENSE` before you start.

## Getting set up

`pnpm install`, then `pnpm verify` (typecheck, lint, format check, the full
test suite, the re-seed gate, the docs gate — the exact CI step list). The
project's own conventions, architecture, and contract documents are read in
the order `AGENTS.md` and `current_state.md` describe; start there.

## Pull requests

- Keep changes focused; one topic per PR. Add or update tests for anything
  behavioural.
- Match the style and conventions of the surrounding code.
- Don't add a dependency under a copyleft or source-available licence without
  raising it first — see `NOTICE`.
- New source files carry the standard header (below).

## Legal terms for contributions

By submitting a contribution you agree to **all** of the following.

### 1. Contributor License Agreement

You must have the Bunyan CLA on file. See [`CLA.md`](CLA.md) — it is
Apache-ICLA-shaped: **you keep your copyright**, and you grant a perpetual,
worldwide, royalty-free licence to use your contribution **and to re-license
it under other terms, including proprietary or commercial terms**, plus a
patent licence. This is what keeps Bunyan's AGPL-3.0-only + commercial
dual-licensing model workable.

How to sign: open a pull request containing only the signature block from
`CLA.md`'s "How to sign" section, and reference it from your first code
contribution.

### 2. Developer Certificate of Origin

Every commit must be signed off (`git commit -s`):

```
Signed-off-by: Your Name <your.email@example.com>
```

certifying the [DCO 1.1](https://developercertificate.org/) — that you wrote
the contribution or have the right to submit it, and that you understand it
is public and recorded permanently.

### 3. No trademark rights

These terms grant you no right to use the "Beamstack" or "Bunyan" names or
the Beamstack logo beyond what `LICENSE` / `TRADEMARKS.md` already allow.

## Standard source-file header

```
// SPDX-FileCopyrightText: 2026 Beamstack <https://beam-stack.com>
// SPDX-License-Identifier: AGPL-3.0-only
```

## Questions

Licensing or commercial questions: **askdaoudi@gmail.com**.
