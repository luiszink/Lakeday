# LAKE-EPIC-004 — Tasks: Attraction ingestion

Epic: [LAKE-EPIC-004](../epics/LAKE-EPIC-004-attraction-ingestion.md). Global [definition of done](../../agents/definition-of-done.md) applies. Order: 020 → (018 ∥ 019) → (021 ∥ 022) → 023.

---

## LAKE-020 — Research output schema in code

**Status:** done · **Phase:** MVP/M3 · **Parallel:** no (first in epic)

**Objective:** Implement the research-output contract as zod schemas with JSON-Schema export, exactly matching [research-output-schema.md](../../data/research-output-schema.md) v1.0.0.

**User story:** As a research agent, I want a machine-checkable contract so my output is validated identically everywhere (CLI, import endpoint, CI fixtures).

**Context:** [research-output-schema.md](../../data/research-output-schema.md) — this ticket makes the code authoritative; the doc gains a pointer note.

**In scope:** zod schemas for the evidence envelope, all sections, pipelineStep-dependent requirements (e.g. `en` localization only when `translated`); JSON-Schema export artifact (`packages/domain/schemas/research-output.schema.json`, generated, committed); semver handling (accept same-major); fixture examples (valid + systematically invalid).
**Out of scope:** import behaviour (LAKE-019), extra-schema validation rules (LAKE-019/021).

**Dependencies:** LAKE-009. **Files:** `packages/domain/src/research/schema.ts`, `packages/domain/schemas/*`, fixture JSONs.

**Approach:** zod-first, `zod-to-json-schema` for export; a generation test keeps the committed JSON Schema in sync.

**Domain rules:** `status=found` requires evidence; critical-field high confidence requires official-source evidence — encoded as refinements.
**API/DB/UI/DE-EN/A11y/Privacy:** n/a.

**Acceptance criteria:**
- [ ] All doc examples validate; each invalid fixture fails with a precise error path
- [ ] Generated JSON Schema is stable (CI diff check)
- [ ] Version acceptance: 1.x passes, 2.0 rejected with versioned error

**Tests:** Unit: fixture matrix (≥ 15 invalid cases). **Manual validation:** none.
**Commands:** `pnpm --filter domain test research-schema`. **Rollback:** pure code.

---

## LAKE-018 — Research validation CLI and conventions

**Status:** done · **Phase:** MVP/M3 · **Parallel:** yes (with 019)

**Objective:** `pnpm research:validate` CLI validating research JSON files against the schema plus static checks, and the `data/research/` directory conventions.

**User story:** As a human operating research agents, I want instant local validation so bad output never reaches the import endpoint.

**Context:** [research-workflow.md#tooling](../../data/research-workflow.md#tooling-minimal-by-design).

**In scope:** CLI (glob input, per-file per-field error report, exit codes for CI); static checks beyond schema: sector-bbox sanity, taxonomy code existence (reads seed data), evidence-URL shape; `data/research/README.md` documenting file naming (`{sector}/{candidate-slug}.json`) and workflow; CI job validating committed research files.
**Out of scope:** import (LAKE-019), prose-similarity guard (LAKE-021 — needs DB).

**Dependencies:** LAKE-020, LAKE-008. **Files:** `packages/domain/src/research/cli.ts` (or `tools/`), `data/research/README.md`, CI step.

**Approach:** thin CLI over the shared validators; human-readable + `--json` output.

**Acceptance criteria:**
- [ ] Valid fixture passes; each invalid fixture reports path-precise errors; exit codes correct
- [ ] Unknown taxonomy code and out-of-bbox coordinates caught
- [ ] CI validates `data/research/**` on every PR

**Domain rules / API / DB / UI / DE-EN / A11y / Privacy:** n/a.
**Tests:** Unit: CLI against fixtures. **Manual validation:** run against a hand-broken file.
**Commands:** `pnpm research:validate data/research/BS-01/*.json`. **Rollback:** tooling only.

---

## LAKE-019 — Research import endpoint

**Status:** done · **Phase:** MVP/M3 · **Parallel:** yes (with 018)

**Objective:** `POST /api/admin/import/research`: validate records, run duplicate detection, create/update DRAFT attractions with complete SourceRecords and FactProvenance, route flagged records to the review queue, and return per-record results.

**User story:** As an editor, I want research output to become reviewable drafts with full provenance so publication is a decision, not data entry.

**Context:** [research-workflow.md](../../data/research-workflow.md#step-details) steps 5–10, [api-contracts.md](../../architecture/api-contracts.md#admin-api-apiadmin-session--role-guarded-noindex-csrf-protected), [domain-model.md](../../architecture/domain-model.md#sourcerecord).

**In scope:** batch import (transactional per record); schema validation (LAKE-020) + beyond-schema rules from [research-output-schema.md#import-validation](../../data/research-output-schema.md#import-validation-beyond-schema) except prose guard (LAKE-021 plugs in); dedup via LAKE-011 (certain ⇒ update existing; strong ⇒ ChangeProposal `RESEARCH_IMPORT` + hold; distinct ⇒ create draft); evidence → SourceRecords (immutable) + FactProvenance per fact with refresh scheduling seeds; reviewFlags ⇒ proposals; scope enforcement (out-of-band without exception ⇒ reject); per-record result payload (created/updated/held/rejected + reasons); source-origin approval gate (LAKE-017).
**Out of scope:** UI (LAKE-022), translation execution (research pipeline does it), publishing (human, LAKE-015).

**Dependencies:** LAKE-020, LAKE-011, LAKE-014, LAKE-016 (proposal target), LAKE-017 (gate — may stub if 017 in flight). **Files:** `apps/web/app/api/admin/import/research/route.ts`, `packages/domain/src/research/import.ts` (pure orchestration logic), db write helpers.

**Approach:** pure decision function (record + db-context → ImportPlan) separated from the write executor — unit-test the decisions, integration-test the writes.

**Domain rules:** imports never touch PUBLISHED field values directly — changes to published attractions always go through ChangeProposals; drafts may be updated in place.
**API changes:** the endpoint. **DB changes:** none. **Migration:** none.
**UI states:** n/a (API; UI in 022). **DE/EN:** content flows through as-is; EN only accepted at `translated` step (schema-enforced).
**A11y:** n/a. **Privacy/security:** REVIEWER role; payload cap (5 MB); rate limit 10/h; audit log entry per import batch.

**Acceptance criteria:**
- [ ] Fixture batch: distinct→drafts with full provenance chains; certain-duplicate→updates existing draft; strong-candidate→held + proposal; invalid→rejected with machine-readable reasons
- [ ] Published-attraction change lands as proposal, never direct write (test)
- [ ] Per-record transactionality: one bad record doesn't poison the batch

**Tests:** Unit: ImportPlan decision matrix. Integration: full batch against Testcontainers incl. provenance-chain assertions. E2E: none (022 covers).
**Manual validation:** import a pilot-shaped sample on staging; inspect provenance in admin.
**Commands:** `pnpm test -g import`. **Rollback:** imports create drafts/proposals only — reversible by deletion; endpoint feature-flagged off if misbehaving.

---

## LAKE-021 — Copied-prose guard and rejection reporting

**Status:** open · **Phase:** MVP/M3 · **Parallel:** yes (after 019)

**Objective:** Enforce REQ-DATA-05 at import: reject summaries/descriptions too similar to any evidence quote (trigram similarity > 0.7), with clear per-field rejection reporting for agent retries.

**Context:** [research-output-schema.md#import-validation](../../data/research-output-schema.md#import-validation-beyond-schema), [provenance-and-licensing.md](../../data/provenance-and-licensing.md#content-licensing-our-output).

**In scope:** similarity check (pg_trgm against the record's own evidence quotes + sentence-level containment check); threshold config; rejection reason format (`field`, `matchedQuote`, `similarity`); wire into LAKE-019 validation chain; also expose as CLI check (best-effort local approximation, non-DB).
**Out of scope:** web-scale plagiarism detection (out of scope by design — evidence quotes are the risk surface).

**Dependencies:** LAKE-019. **Files:** `packages/domain/src/research/prose-guard.ts`, db helper.

**Acceptance criteria:**
- [ ] Fixture with copied sentence rejected naming the matched quote; original-prose fixture passes
- [ ] Paraphrase slightly above threshold rejected; clearly original text below threshold passes (calibration fixtures)
- [ ] Rejection payload machine-readable for agent retry loops

**Domain rules:** guard applies to `summary`/`description`/`practicalNotes`, both locales.
**API/DB/UI/DE-EN/A11y/Privacy:** rides on LAKE-019.
**Tests:** Unit: similarity calibration set. Integration: end-to-end rejection through the endpoint.
**Manual validation:** none. **Commands:** `pnpm test -g prose-guard`. **Rollback:** threshold config to `1.0` disables without deploy.

---

## LAKE-022 — Admin import UI

**Status:** open · **Phase:** MVP/M3 · **Parallel:** yes (after 019)

**Objective:** Admin screen to upload/paste research JSON, run the import, and review per-record results with links to created drafts and held proposals.

**User story:** As an editor, I want to run imports and understand every outcome without reading server logs.

**Context:** F-flow adjacent to F7; [research-workflow.md](../../data/research-workflow.md) step 10.

**In scope:** file upload (multi-file) + paste box; dry-run mode (validate only — calls the same chain without writes); result table (status, reasons, links); import-batch history (from audit log).
**Out of scope:** editing research JSON in-browser (files are git-versioned by convention).

**Dependencies:** LAKE-019, LAKE-013/014. **Files:** `apps/web/app/admin/import/**`.

**UI states:** idle/validating/importing (progress per record)/results; partial-failure clearly separated from success; dry-run visually distinct.
**DE/EN:** admin English. **A11y:** results table with row headers; status not color-only.
**Privacy/security:** REVIEWER role; client-side file size guard mirrors server cap.

**Acceptance criteria:**
- [ ] Dry-run of the invalid fixture set shows all rejections without writes
- [ ] Real import shows per-record outcomes with working links
- [ ] Batch history lists past imports with counts

**Domain rules / API / DB changes:** none beyond 019.
**Tests:** E2E: dry-run + import happy path with fixtures. Integration: none new. Unit: none significant.
**Manual validation:** upload pilot sample files on staging.
**Commands:** `pnpm test:e2e -g import-ui`. **Rollback:** UI only.

---

## LAKE-023 — Research pilot execution and retro

**Status:** open · **Phase:** MVP/M3 · **Parallel:** no (validation gate for the research operation)

**Objective:** Execute the pilot per [research-workflow.md#pilot-procedure](../../data/research-workflow.md#pilot-procedure): ~30 candidates across BS-01 (Konstanz), BS-14 (Meersburg), BS-06 (Stein am Rhein), through the full pipeline into **staging**, measure, and run the retro that green-lights (or revises) the workflow.

**User story:** As the team, we want proof that the research workflow produces publishable data at sustainable effort before scaling to 15 sectors.

**Context:** this is a **process-execution ticket** (research operation, not product code); prompts in [research/prompts/](../../research/prompts/attraction-discovery.md); exit criteria in the workflow spec.

**In scope:** run discovery→details→dedup→verification→translation prompts with an AI agent + human operator; commit outputs to `data/research/`; validate via CLI; import to staging; reviewers process the queue; record metrics (minutes/attraction, %verified, dedup precision/recall incl. the seeded near-duplicate, review rate, schema failures, translation spot-check); retro document with prompt/schema change proposals; publish a handful on staging for end-to-end verification.
**Out of scope:** production publishing, further sectors, prompt rewrites beyond retro proposals (follow-up tickets if needed).

**Dependencies:** LAKE-018…022, LAKE-016, LAKE-015. **Files:** `data/research/BS-01|BS-14|BS-06/*.json`, `docs/data/research-workflow.md` (retro appended or linked).

**Acceptance criteria:**
- [ ] ≥ 24 records complete the full pipeline; ≥ 3 published on staging in both locales
- [ ] All pilot metrics recorded against the exit criteria; pass/fail called explicitly
- [ ] Seeded near-duplicate caught; at least one scope-exception candidate exercised the exception path
- [ ] Retro outcomes filed (prompt revisions, schema issues, effort forecast)

**Domain rules / API / DB / UI:** none (process). **DE/EN:** translation step quality-checked by bilingual reviewer. **A11y:** n/a. **Privacy/security:** only public factual data researched; polite fetching per policy.
**Tests:** the pipeline's own validations. **Manual validation:** the retro is the validation.
**Commands:** `pnpm research:validate data/research/**/*.json`; admin import UI.
**Rollback:** staging-only data; wipe and rerun freely.
