# Miqdar — Normative Register (the code corpus, per jurisdiction)

**What this is.** The authoritative list of *which normative document, in which edition* each Miqdar code
module implements. It resolves **O-M4** and is the data behind the spec's §5.2 matrix — the spec table
now **points here** rather than restating editions, so there is exactly one place to correct.

**Who owns it.** The **owner (Architect)** — he is the domain authority. This file is written to be
**revised and edited by him**. Every row carries a `Confidence` and an `Owner ruling` column: the agent
fills the first, the owner fills the second.

**Status:** ⚠ **PROVISIONAL — agent-compiled from public web sources on 2026-07-13, not yet
owner-ratified.** No row here may be relied on for a shipped code module until its `Owner ruling` cell
says so. This is deliberate: **a wrong-but-plausible compliance result is worse than no result**
(Miqdar principle 7), and that principle starts at the edition number.

**Gate:** O-M4 closes — and this register is ratified — **before milestone S3** (`Miqdar_v1.0.0_spec.md`
§13), because S3 is where the clause libraries and their signed corpora are actually built.

**Confidence legend**
- **A — verified**: the document, its edition and its legal force are confirmed by an official or
  near-official source (ministry, standards body, official gazette).
- **B — probable**: consistently reported by multiple credible secondary sources (universities,
  professional press); the exact legal instrument is not confirmed.
- **C — practice, not law**: this is what bureaux actually use, and there is no national code compelling
  it. **These rows are the dangerous ones** — see §3.

---

## 1. ⚠ THREE FINDINGS THAT CHANGE THE SPEC (read before the tables)

### F1 — Algeria's seismic code has been REPLACED. `RPA 99 / version 2003` is superseded.

A new **DTR B.C. 2.48 — "RPA 2024"** (Règles Parasismiques Algériennes) was **approved by the CTP
(Commission Technique Permanente) on 15 May 2024**, continues the RPA 81/88/99 lineage, and **abrogates
RPA 99 / version 2003**; it applies to new project studies from a few months after publication. It was
motivated by ~20 years of practice and the lessons of the Béjaïa (2021, 2022), Mila (2020), Alger (2014)
and Médéa (2016) earthquakes; reported changes include the seismic zoning and the treatment of complex
configurations.

**Consequence:** the spec's M8 ruling names **RPA 99/2003** — which is, on this evidence, **the code
Miqdar must NOT ship as its primary Algerian seismic module.** Miqdar starts development after Bunyan
v1.0.0 (i.e. no earlier than 2026–27); by then RPA 2024 is the code a bureau d'études is legally
obliged to use, and RPA 99/2003 is a *legacy* module (valuable for checking existing/ongoing projects,
exactly like BAEL — see F2, and O-M5).

> **Owner decision required (new — O-M10):** Is Algeria's v1.0.0 seismic module **RPA 2024** (with RPA
> 99/2003 as a legacy registration), or the reverse? Confidence **B** — corroborated by multiple Algerian
> professional/academic sources, but I have **not** read the *Journal Officiel* decree that gives it
> force, nor the document itself. **Do not act on this row without confirming that decree.**

### F2 — Morocco has NO national reinforced-concrete design code. The spec's Morocco RC row is fiction.

The spec §5.2 says Morocco RC = *"EC2-based practice (NM adoptions where published)"*. The evidence says
otherwise: **in the absence of a national RC calculation regulation, Moroccan practice runs on the French
`BAEL 91 (révisé 99)`** (with `CCBA 68` as its legacy predecessor). IMANOR *has* published NM EN 1992
parts as **standards**, but a published standard is not the same thing as *the design regulation the
bureau de contrôle expects*. A national Moroccan RC code was still **in study** as of late 2023 (the
ministry was weighing three options: adopt BAEL, adopt Eurocode, or write a Moroccan code), and I found
**no evidence that it has been promulgated.**

**Consequence — this inverts O-M5.** The spec files **BAEL 91 as an optional *legacy* pack, "1.0.x, not
v1.0.0"**. If Moroccan RC design is *actually done in BAEL 91-99*, then **BAEL is not a legacy pack — it
is the Morocco RC module**, and shipping "Morocco" without it means shipping a Morocco no Moroccan bureau
can use. That is a v1.0.0 scope question, not a 1.0.x nice-to-have.

> **Owner decision required (O-M5, re-opened):** For a Casablanca bureau d'études in 2027, what do you
> actually design an RC beam with — BAEL 91-99, or NM EN 1992? **You know this better than any source I
> can reach.** Your answer sets whether BAEL is v1.0.0 core or 1.0.x.

### F3 — France: the Eurocodes Miqdar would ship are being withdrawn by **30 March 2028**.

The **second generation of the Eurocodes** is being published now (e.g. `EN 1992-1-1:2023`). Per the
CEN/JRC timetable: **all 2nd-gen Eurocodes + their National Annexes are to be published by 30 September
2027**, and the **first generation is withdrawn by 30 March 2028** — with a coexistence window between
those two dates.

**Consequence:** Miqdar development *starts* after Bunyan v1.0.0. A France module built against 1st-gen
EC2/EC3/EC8 + NA-FR is being built against a corpus with a **short and known shelf life**, and the
France validation corpus (§10 tier 4 — the least-automatable work in the product) would have to be
**built twice**. This is not a reason to drop France; it is a reason to decide *deliberately*, now,
which generation the France module targets — and it is an argument for M14 (NA/interpretation values as
versioned **data packs**, never buried constants) being load-bearing rather than tidy.

> **Owner decision required (new — O-M11):** France v1.0.0 → 1st-gen Eurocodes (what today's bureaux use,
> withdrawn ~2028), 2nd-gen (what they will use, NAs not final until 2027), or **both, as two editions of
> one registration** (the honest answer the `(jurisdiction, domain, edition)` key was designed for)?

---

## 2. The register

Legal-force column: what actually *compels* the document. Blank = not established.

### 2.1 Algeria 🇩🇿 — DTR system (Ministère de l'Habitat / CTP; CNERIB)

| Domain | Document | Edition / ref | Legal instrument | Conf. | Owner ruling |
|---|---|---|---|---|---|
| **Seismic** | **RPA 2024** — Règles Parasismiques Algériennes | **DTR B.C. 2.48**, approved by CTP **15 May 2024**; **abrogates RPA 99/v2003** | JO decree — ⚠ **not read; confirm** | **B** | _______ |
| Seismic (legacy) | RPA 99 / version 2003 | DTR B.C. 2.48 (superseded) | approved CTP 04 Dec 1999; v2003 revision | **A** | _______ |
| **Concrete (RC)** | **CBA 93** — Règles de conception et de calcul des structures en béton armé | **DTR B.C. 2.41** | Ministère de l'Habitat DTR | **B** | _______ |
| **Steel** | **CCM 97** — Règles de conception et de calcul des structures en acier | **DTR B.C. 2.44** | arrêté of **10 Dec 1998** | **B** | _______ |
| **Wind / Snow** | **RNV — version 2013** (revision of RNV 99) | **DTR C 2-4.7** | CTP-supervised revision, CNERIB | **B** | _______ |
| Loads (permanent/variable) | DTR B.C. 2.2 — Charges permanentes et charges d'exploitation | — | ⚠ **not researched** | — | _______ |
| **Prestressed** | ⚠ **NO ALGERIAN PC CODE IDENTIFIED** | — | — | — | **⚠ O-M4/O-M3: what governs PC in Algeria? BPEL 91? Eurocode? Spec §5.2 already leaves this "(scope under O-M4)".** |

### 2.2 Morocco 🇲🇦 — decree-backed RPS + French-heritage practice

| Domain | Document | Edition / ref | Legal instrument | Conf. | Owner ruling |
|---|---|---|---|---|---|
| **Seismic** | **RPS 2000 — version 2011** | 5 zones (Za and Zv maps), soil velocity parameter | **décret n° 2-12-682 (28 May 2013)**, amending décret n° 2-02-177 (22 Feb 2002) | **A** | _______ |
| **Concrete (RC)** | ⚠ **NO NATIONAL CODE.** Practice = **BAEL 91 révisé 99** (legacy: CCBA 68). IMANOR has published **NM EN 1992** parts as *standards*; a national RC regulation was **in study** (2023), promulgation **not confirmed** | — | **none compelling a method** | **C** | **⚠ See F2 — this is the row that decides whether BAEL is v1.0.0 core.** |
| **Steel** | Practice: EC3 / NM EN 1993 (spec's assumption) | — | ⚠ **not verified** | **C** | _______ |
| **Prestressed** | Practice: BPEL 91 heritage (spec's assumption) | — | ⚠ **not verified** | **C** | _______ |
| **Wind / Snow** | **NV 65** (French rules) applied with a **Moroccan wind-zone map** (5 zones); no confirmed mandatory NM EN 1991-1-4 | — | ⚠ **practice, not confirmed law** | **C** | _______ |

### 2.3 France 🇫🇷 — Eurocodes + NF National Annexes

| Domain | Document | Edition / ref | Legal instrument | Conf. | Owner ruling |
|---|---|---|---|---|---|
| **Concrete (RC)** | EC2 — NF EN 1992-1-1 + **NA-FR** | ⚠ **1st gen vs 2nd gen (`EN 1992-1-1:2023`) — see F3** | — | **B** | **⚠ O-M11** |
| **Steel** | EC3 — NF EN 1993 + NA-FR | ⚠ same generation question | — | **B** | **⚠ O-M11** |
| **Seismic** | EC8 — NF EN 1998 + NA-FR | ⚠ same generation question | — | **B** | **⚠ O-M11** |
| **Prestressed** | EC2 PC clauses + NA-FR (BAEL/**BPEL 91** withdrawn in FR) | ⚠ same generation question | — | **B** | **⚠ O-M11** |
| **Wind / Snow / Loads** | EC1 — NF EN 1991 + NA-FR | ⚠ same generation question | — | **B** | **⚠ O-M11** |
| **Withdrawal timetable** | 2nd-gen Eurocodes + NAs published by **30 Sep 2027**; **1st gen withdrawn by 30 Mar 2028**; coexistence between those dates | — | CEN / JRC timetable | **B** | — |

---

## 3. ⚠ The structural problem this register exposes (worth more than any single row)

**Five of the sixteen rows above are confidence "C" — *practice, not law*.** Morocco's RC, steel, PC and
wind rows, in particular, describe **what engineers do**, not what a document compels. That is a
different kind of input than "EC2 §6.2.3", and it changes what Miqdar can honestly claim:

- A **code module** can cite a clause. A **practice module** cannot — there is no clause id, and §5.1's
  contract requires *"every emitted `CheckResult` cites its clause id"* (M12).
- So a "Morocco RC" module is really **"BAEL 91-99, as applied in Morocco"** (real clauses, French
  document) **plus Moroccan seismic (RPS 2011)** — *not* a Moroccan RC code. **The spec should say this,
  and the *note de calcul* should print it**, because a bureau de contrôle will ask precisely this
  question, and a vague answer is the "wrong-but-plausible" failure mode the whole product is built to
  refuse.

This is not a defect in the plan; it is the actual shape of the Maghreb market, and it is **exactly the
kind of thing the owner knows and the internet does not**. It needs his ruling, not more searching.

---

## 4. Sources

Agent-compiled, 2026-07-13. These are **secondary sources** (universities, professional portals,
document repositories) — no official gazette was read. Treated accordingly in the Confidence column.

- Algeria RPA 2024 — [GCAlgerie: Règles Parasismiques Algériennes RPA 2024 (version finale)](https://www.gcalgerie.com/regles-parasismiques-algeriennes-rpa-2024-version-finale/) · [RPA-2024.pdf (tarekdata)](https://www.tarekdata.com/FR/documents/normes/RPA-2024.pdf) · [Normes Algériennes (tarekdata)](https://www.tarekdata.com/FR/Normes-Algeriennes-RPA-2024.html)
- Algeria RPA 99/2003 — [RPA99-2003.pdf (DTR B.C. 2.48)](https://www.tarekdata.com/FR/documents/normes/RPA99-2003.pdf)
- Algeria CBA 93 — [DTR B.C. 2-41 (Univ. Batna 2)](https://staff.univ-batna2.dz/sites/default/files/bouglada_mohammedsalah/files/cba-93.pdf)
- Algeria CCM 97 — [DTR B.C. 2.44 CCM 97](https://www.scribd.com/document/365517694/DTR-B-C-2-44-CCM97-Regles-de-conception-et-de-calcul-des-structures-en-Acier-pdf)
- Algeria RNV 2013 — [CNERIB: DTR C 2-4.7 (2013), extrait](https://www.cnerib.edu.dz/images/pdf/dtr_guides/DTR_C_2-47_2013_extrait.pdf) · [GCAlgerie: RNV 2013](https://www.gcalgerie.com/reglement-neige-et-vent-rnv-2013-dtr-c-2-47/)
- Morocco RPS 2000 v2011 — [Règlement de construction parasismique (Ordre des Architectes)](https://ordrearchicentre.org/wp-content/uploads/2020/05/REGLEMENT-DE-CONSTRUCTION-PARASISMIQUE.pdf) · [Décret n° 2-12-682 du 28 mai 2013 (MHPV)](http://www.mhpv.gov.ma/fr/5127-2/)
- Morocco RC (no national code; BAEL in practice; new rules in study) — [Médias24, 22 Oct 2023](https://medias24.com/2023/10/22/de-nouvelles-regles-marocaines-de-calcul-du-beton-arme-bientot-en-vigueur/) · [LesEco: vers l'harmonisation des méthodes de calcul](https://leseco.ma/maroc/beton-arme-vers-lharmonisation-des-methodes-de-calcul.html) · [IMANOR: NM EN 1992-1-2](https://www.imanor.gov.ma/Norme/nm-en-1992-1-2/)
- Morocco wind — [NV65 with Moroccan wind map](https://www.academia.edu/8886578/Calcul_des_charges_dues_au_vent_Maroc)
- Eurocodes 2nd generation & withdrawal — [JRC: Timeline for the Eurocodes second generation](https://eurocodes.jrc.ec.europa.eu/2nd-generation-evolution/timeline-eurocodes-second-generation) · [JRC: Second Generation of the Eurocodes](https://eurocodes.jrc.ec.europa.eu/second-generation-eurocodes) · [Buildwise: la nouvelle génération d'Eurocodes](https://www.buildwise.be/fr/nouvelles/nouvelle-generation-eurocodes/)
