# HANDOVERS — H- records handed to this repo for its steward to dispose

Append-only, one record per handover. Only `cleared:` is ever edited, by the steward who disposes it
(TheBeamstack/diwan `docs/seats/hamadi.md`, R22).

## H-20261011-15 Bunyan: the public repository description carries a stray `**`; proposed text removes it

- opened: 2026-10-11T10:38Z
- by: zayd
- from: Custodianship
- scope: item
- item: PR #65
- what: Bunyan's repository description, measured 2026-10-11T10:37Z, reads `browser-native, serverless parametric **BIM/CAD authoring platform for building design`, with an unpaired `**` before "BIM/CAD"; proposed replacement (84 characters): `browser-native, serverless parametric BIM/CAD authoring platform for building design`, the current text with the `**` removed and nothing else changed; the item is PR #65, the PR that carries this record, because no PR can set a repository description
- why: the `**` has no closing pair, so it is stray markup, not emphasis; README.md at main 07d8fc0 has no product sentence to draw a new text from, only the heading `# Bunyan` (line 1) and the `## Licence` section (lines 3-24), so the proposal keeps the current wording, which docs/INVARIANTS.md line 7 also uses ("a browser-native, serverless, parametric BIM/CAD authoring platform"); the description is set by the owner alone and this lane sets none (Custodianship `docs/INVARIANTS.md` §1-2)
- evidence: `gh api repos/TheBeamstack/Bunyan --jq .description`; `gh api -H 'Accept: application/vnd.github.raw' 'repos/TheBeamstack/Bunyan/contents/README.md?ref=07d8fc0'`; `gh api -H 'Accept: application/vnd.github.raw' 'repos/TheBeamstack/Bunyan/contents/docs/INVARIANTS.md?ref=07d8fc0'`
- need: route setting Bunyan's repository description to the proposed text to the owner as an owner action
- cleared: -
