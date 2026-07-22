# GRM Project Technical Audit Report

Audit date: 22 July 2026  
Repository: `mhd-belize-website`  
Scope: database, backend, public frontend, admin frontend, configuration, workers, reports, uploads, notifications, security, documentation, and tests. The specifically excluded workflows were not assessed.

## 1. Executive Summary

The project has a recognizable three-tier design, parameterized SQL, runtime master data, transactional ticket allocation, department-scoped reads, authenticated attachment downloads, durable notification/report queues, and a meaningful automated unit-test base. The ticket-number implementation is the strongest business-critical component: `ticket_number_settings` plus row-locked `ticket_sequences` is authoritative, preview does not consume a sequence, ticket allocation occurs in the same transaction as grievance creation, and `complaints.token_number` is unique.

The supplied project is nevertheless **not deployable or suitable for UAT**. A fresh install is not reproducible: `database/database.sql` creates foreign keys to tables that have not yet been created, does not disable foreign-key checks, and the installer then requires SQL migrations that are absent from the repository. The dump says those migrations were applied even though its resulting schema still lacks `complaints.resolution_summary`, a column required by grievance detail, public tracking, and resolution transitions. The status-change controller also references an undeclared `ConfigurationModel`, so the principal lifecycle endpoint fails before applying any transition.

The workflow is materially incomplete. There is no `Assigned` status or explicit department acceptance action, transition-level permissions are not enforced, resolution review is represented only by a complaint-level summary/status comment/document, and there is no structured additional-information request/response workflow. The supplied SQL is an operational dump containing administrator identities/password hashes, session identifiers, audit history, citizen PII, attachments, and report history; it must not be used as a distributable production schema or seed.

Five Critical, eight High, eight Medium, and five Low findings are recorded below. The recommended verdict is **Ready for development only**.

## 2. Overall Readiness Score

| Area | Score / 100 | Basis |
| --- | ---: | --- |
| Database design | 42 | Good master/FK direction and transactional tables, but the supplied schema is not reproducible, lacks a runtime-required column, contains legacy mirrors and operational data, and omits key workflow entities. |
| Backend APIs | 52 | Parameterized queries, transactions, rate limits, and validation are present; the lifecycle endpoint and installer are broken and mutation authorization is inconsistent. |
| Frontend implementation | 66 | Public/admin forms consume runtime options and tests/lint pass; workflow controls are incomplete, some authorization-aware UX is missing, and text still describes a legacy ticket format. |
| Workflow completeness | 30 | Submission, assignment fields, status history, due dates, and comments exist; assigned/acceptance, pending-information exchange, and structured resolution review do not. |
| Role and permission security | 55 | Backend permission middleware and department-scoped reads exist; intake uses view permission and transition-specific permissions are not enforced. |
| Data privacy | 33 | Identification encryption/masking code exists, but the runtime key is absent, non-phone PII is broadly returned, retention can affect open cases, and the SQL dump contains operational PII/auth data. |
| Ticket-number reliability | 88 | Transactional, locked, unique, permanent, preview-safe generation; legacy mechanisms and a dump/config format mismatch remain. |
| Notifications | 61 | Durable outbox, idempotency index, retry/backoff, and leases exist; event coverage and business idempotency are incomplete. |
| Reporting | 54 | Scoped queued exports and owner-only downloads exist; default Admin export is contradictory, redaction is incomplete, failed jobs do not retry, and generated files lack retention. |
| Testing | 48 | 191 tests passed across the three applications, but one backend test failed and core lifecycle/database integration cases are absent. |
| Deployment readiness | 28 | Missing migrations, non-importable schema ordering, stale deployment docs, no deployment manifests, and no production health/observability implementation. |
| **Overall readiness** | **48** | Strong foundations are outweighed by install, schema, workflow, authorization, privacy, and integration-test blockers. |

Scoring is based on the supplied files and local verification only. External infrastructure, backups, TLS termination, virus scanning, monitoring, and restoration procedures were **not confirmed from the current project files**.

## 3. Project Architecture Found

| Layer | Implementation found |
| --- | --- |
| Public UI | React 19/Vite in `frontend`; public settings/catalog/directory consumption, grievance submission, upload, confirmation/QR, and ticket/contact status lookup. |
| Administrative UI | React 19/Vite in `admin-panel`; bearer-token session, permission/role route guards, grievance list/detail/lifecycle actions, configuration, reports, settings, users, roles, and audit logs. |
| API | Express 5 in `backend/src/server.js`; controllers, SQL models/repositories, services, validators, permission middleware, upload middleware, and rate limiters. |
| Data access | `mysql2/promise`; parameterized SQL with service/model transactions rather than an ORM. |
| Background work | In-process one-minute worker with database leases for notifications, reports, due-date processing, auto-close, escalation, and retention. |
| Persistence | MySQL tables in `database/database.sql`; attachment/report binaries on local disk with database metadata. |
| Authentication | bcrypt passwords, HS256 JWT, DB-backed revocable sessions, optional email OTP/recovery codes, lockout, password-age enforcement. |
| Authorization | Role permissions refreshed from the database on every protected request; all-system or one-department grievance scope. |
| Configuration | Database-backed general settings with an in-process cache and change log; separate ticket settings/sequence log; environment-backed secrets. |

The backend largely separates controller, service/repository/model concerns, although business rules remain split between controllers, SQL models, configuration rows, and the admin UI. There is no citizen account/session model; citizen tracking is a rate-limited public verification endpoint.

## 4. Database and Code Consistency

### Confirmed consistency

- Runtime creation writes `status_id` and `priority_id`, and list/detail/dashboard/report queries join `complaint_statuses` and `complaint_priorities` (`backend/src/models/complaint.model.js:68-79,250-271,343-374`).
- Department-scoped grievance, dashboard, attachment, resolution-document, and report queries filter by `assigned_department_id` (`backend/src/utils/access-scope.js:5-24`; `backend/src/models/complaint.model.js:190-195,426-431`; `backend/src/models/lifecycle.model.js:241-251`; `backend/src/controllers/report.controller.js:21-41`).
- Identification storage fields used in code exist in the supplied schema: encrypted value, deterministic HMAC, and last four (`database/database.sql:872-874`; `backend/src/controllers/public-complaint.controller.js:423-430`).
- The current report query's previously failing `identification_number_last4` now exists in the supplied schema. Historical failures at `database/database.sql:1491-1492` are followed by a completed job at line 1490; this specific column problem appears corrected.

### Confirmed inconsistency

- `complaints.resolution_summary` is selected and updated by runtime code but is absent from `database/database.sql:844-907`.
- `schema_migrations` claims the complaints and lifecycle migrations were applied (`database/database.sql:1842-1861`) while the resulting schema contradicts that claim.
- All ten SQL migration files directly referenced by scripts/installer are absent from `database/migrations/`; the backend test fails for the same reason.
- Legacy `complaints.status`, `complaints.ticket_priority`, and `complaints.office_initial_classification` remain while runtime logic uses IDs/master rows. They are nullable and are not written by the current create/transition/assignment paths.
- `gender_key` exists (`database/database.sql:867`) but creation never writes it and the admin API hardcodes `gender: null` (`backend/src/controllers/complaint.controller.js:126-130`).
- The dump contains two indexes on `complaints.assigned_department_id` and two unique indexes on `departments.code` (`database/database.sql:915,925,1090-1091`).

## 5. Correctly Implemented Features

- Ticket allocation uses a unique period row locked with `FOR UPDATE`, checks existing permanent tickets, updates the sequence, and participates in the grievance transaction (`backend/src/services/ticket-number-generator.service.js:33-67`; `backend/src/repositories/ticket-sequence.repository.js:15-31,53-58`; `backend/src/models/complaint.model.js:54-68,161-169`).
- Ticket preview reads sequence state but does not mutate it (`backend/src/services/ticket-settings.service.js:67-100`); concurrency and rollback tests pass (`backend/test/ticket-number.test.js`).
- Existing ticket numbers are not rewritten during assignment/reassignment/status changes; only `token_number` creation writes were found.
- Backend reads current role permissions and active role/user state for every protected request, so stale JWT permission claims are not authoritative (`backend/src/middlewares/auth.middleware.js:28-74`).
- JWT secrets fail closed when weak/placeholder, JWT algorithms are restricted to HS256, sessions are server-side revocable, and password/session policy is consulted at runtime (`backend/src/config/jwt.js:1-20`; `backend/src/middlewares/auth.middleware.js:18-77`).
- Public and admin complaint input is validated against active database configuration, including conditional contact/affected-person fields (`backend/src/controllers/public-complaint.controller.js:138-178,271-379`).
- SQL inputs are parameterized in the reviewed grievance, lifecycle, notification, report, settings, authentication, and audit paths.
- Upload validation checks configured extension plus MIME plus a file signature, enforces count/size, uses path containment/no-follow checks, and does not store file blobs in MySQL (`backend/src/middlewares/complaint-upload.middleware.js:31-106`; `backend/src/utils/safe-upload-file.js:12-81`).
- Complaint attachments are not statically exposed; authenticated downloads reapply department scope and path containment (`backend/src/controllers/complaint.controller.js:429-506`).
- Public tracking constructs an allowlist response and, by default, verifies ticket plus phone (`backend/src/controllers/public-complaint.controller.js:675-753`; `database/database.sql:1977-1978,2038`).
- General settings changes use a transaction, clear the cache, and create old/new/change-reason records (`backend/src/services/settings.service.js:79-139`; `backend/src/models/settings.model.js:67-99`).
- Notification outbox and dashboard notifications have unique idempotency keys; delivery has retry/backoff and stale-processing recovery (`backend/src/models/notification.model.js:61-103`; `database/database.sql:1204-1229`).
- Due dates use one timezone-aware working-day/holiday calendar; the worker treats overdue as timestamps/derived reporting rather than a primary status (`backend/src/services/due-date.service.js`; `backend/src/services/runtime-worker.service.js:48-127`).
- Reports are queued, scoped before job creation, limited, owner-protected on retrieval/download, and path-contained (`backend/src/controllers/report.controller.js:14-92`; `backend/src/models/report.model.js:55-79`).

## 6. Critical Issues

### GRM-DB-001 — Fresh installation and migration chain cannot be reproduced

| Field | Details |
| --- | --- |
| Issue ID | GRM-DB-001 |
| Severity | Critical |
| Area | Database / Deployment |
| Description | The base SQL starts by creating an FK to `admin_users` before that table exists and never disables FK checks. The installer subsequently requires absent migration files. |
| Evidence | `database/database.sql:1-24`; no `FOREIGN_KEY_CHECKS` directive; `backend/src/services/install.service.js:21-28,354-369`; `backend/scripts/apply-ticket-number-migration.js:8,27`; backend test failure `ENOENT ... database/migrations/20260727_complaint_enum_normalization.sql`. |
| Current Behaviour | A clean install can fail during base schema import and, if it gets past that, must fail when the first missing migration is checked/read. |
| Expected Behaviour | One clean, ordered, idempotent install path that produces the schema expected by the current code. |
| Risk | Production outage; irreproducible environments; partial destructive reset when installer reset is enabled. |
| Recommended Fix | Create a clean schema/seed split, order parent tables before children or add constraints after table creation, restore/version every migration, and make CI import into an empty MySQL database. Do not mark migrations applied unless their postconditions pass. |
| Affected Files | `database/database.sql`; missing `database/migrations/*.sql`; `backend/src/services/install.service.js`; `backend/scripts/migrate-all.js`; migration scripts. |
| Database Change | Rebuild canonical baseline plus complete migration history; add schema-version/postcondition checks. |
| Testing Required | Empty-database installer test; migrate-from-supported-version test; repeat/idempotency test; failure rollback/recovery test. |

### GRM-DB-002 — Runtime-required `resolution_summary` column is absent

| Field | Details |
| --- | --- |
| Issue ID | GRM-DB-002 |
| Severity | Critical |
| Area | Database / API / Workflow |
| Description | The runtime selects and updates `complaints.resolution_summary`, but the supplied table definition does not include it. |
| Evidence | Absent from `database/database.sql:844-907`; selected at `backend/src/models/complaint.model.js:358,400`; updated at `backend/src/models/lifecycle.model.js:106-114`; expected by `backend/src/controllers/complaint.controller.js:136` and public tracking at `backend/src/controllers/public-complaint.controller.js:702`. |
| Current Behaviour | Complaint detail and public tracking queries fail with unknown-column errors; a resolution transition fails and rolls back. |
| Expected Behaviour | The deployed schema contains every runtime column before the server accepts traffic. |
| Risk | Core admin grievance detail outage and broken resolution/public tracking. |
| Recommended Fix | Add an idempotent migration for the column (or, preferably, introduce the structured resolution tables described in GRM-WF-004), update the canonical baseline, and validate all SQL projections against an imported schema. |
| Affected Files | `database/database.sql`; `backend/scripts/apply-complaints-migration.js:70-173`; complaint/lifecycle models and controllers. |
| Database Change | At minimum `complaints.resolution_summary TEXT NULL`; preferred normalized resolution/submission/review model. |
| Testing Required | Real-MySQL detail, public tracking, resolved, returned, and closed integration tests. |

### GRM-SEC-001 — Distributable SQL contains operational credentials and sensitive records

| Field | Details |
| --- | --- |
| Issue ID | GRM-SEC-001 |
| Severity | Critical |
| Area | Security / Data Privacy / Database |
| Description | `database.sql` is an operational dump, not a sanitized schema/seed. It includes administrator emails/phones/password hashes/profile paths, session identifiers, detailed authentication/audit history, citizen names/contact/address/witness/complaint data, attachment names, and report snapshots/history. |
| Evidence | `database/database.sql:28` (audit data), `:249` (auth events), `:333-346` (sessions), `:490-492` (admin users), `:583-589` (attachments), `:942-946` (citizen grievances), `:1489-1492` (report jobs/settings snapshots). |
| Current Behaviour | Anyone receiving the repository/dump receives sensitive operational data and seeded administrative account hashes. Fresh environments inherit those records before the installer upserts a super-admin. |
| Expected Behaviour | Version control contains schema and non-sensitive reference seeds only; operational dumps are encrypted, access-controlled, and excluded. |
| Risk | Citizen PII exposure, credential attack surface, privacy breach, and non-production environments sending/acting on copied records. |
| Recommended Fix | Immediately remove and rotate exposed operational artifacts/secrets/accounts as applicable; replace with sanitized synthetic seeds; purge repository history where this dump has been shared; add secret/PII scanning. |
| Affected Files | `database/database.sql`; repository history; installation/seeding documentation. |
| Database Change | Separate DDL, reference seeds, and private operational backup; no production rows in source-controlled seed. |
| Testing Required | Automated seed PII/credential scanner and clean-install assertion that no operational users/sessions/grievances exist. |

### GRM-AUTH-001 — Administrative intake is authorized by read permission

| Field | Details |
| --- | --- |
| Issue ID | GRM-AUTH-001 |
| Severity | Critical |
| Area | API / Frontend / Security |
| Description | `POST /api/complaints/intake` has no create/intake permission. The router-wide requirement is only `grievances.view_all` or `grievances.view_department`; the frontend route uses the same read permissions. No grievance-create permission exists. |
| Evidence | `backend/src/routes/complaint.routes.js:27-48`; `admin-panel/src/App.jsx:84-95`; no `grievances.create`/`grievances.intake` definition found in schema or permission migration. |
| Current Behaviour | Any department user able to view grievances, including the default Ministry User, can create a walk-in administrative record and attribute office fields to their account. |
| Expected Behaviour | A dedicated `grievances.create_intake` permission and explicit role/policy checks protect this mutation. |
| Risk | Unauthorized record creation, polluted audit/reporting data, and potential abuse of notification/ticket allocation. |
| Recommended Fix | Add a dedicated permission; require it in API and route UI; validate allowed intake role and department; audit the complete intake origin. |
| Affected Files | permission migration/baseline; `backend/src/routes/complaint.routes.js`; `backend/src/controllers/public-complaint.controller.js`; `admin-panel/src/App.jsx`; navigation. |
| Database Change | Add permission and intended role mappings. |
| Testing Required | API matrix for Super Admin/Admin/Ministry/no-permission; ensure view permission alone receives 403. |

### GRM-PRIV-001 — Retention can anonymize unresolved grievances

| Field | Details |
| --- | --- |
| Issue ID | GRM-PRIV-001 |
| Severity | Critical |
| Area | Data Privacy / Background Job |
| Description | Retention selects any non-anonymized complaint whose `COALESCE(closed_at, created_at)` is old enough; it does not require a closed/final status. Attachments and citizen identifiers can therefore be removed from an open long-running case. |
| Evidence | `backend/src/services/runtime-worker.service.js:160-188`. |
| Current Behaviour | Once an open complaint exceeds `privacy.dataRetentionMonths`, it is anonymized and its attachment metadata deleted. File deletion then occurs after the database commit. |
| Expected Behaviour | Retention starts from a legally approved final/closure date, excludes holds/open cases, preserves required evidence, and is fully recoverable/auditable. |
| Risk | Data/evidence loss in an active grievance and inability to investigate or resolve it. |
| Recommended Fix | Require eligible final status plus closed/anonymization schedule; add legal hold, preview, dry run, counts, and approval; coordinate file/DB deletion with recoverable quarantine. |
| Affected Files | `backend/src/services/runtime-worker.service.js`; settings definitions; complaint/attachment schema. |
| Database Change | Add retention eligibility/hold/scheduled/purged metadata and durable purge log. |
| Testing Required | Open/closed/returned/legal-hold boundary tests, file-deletion failure recovery, and retention audit reconciliation. |

## 7. High-Priority Issues

### GRM-WF-001 — Status-change endpoint fails before transition logic

| Field | Details |
| --- | --- |
| Issue ID | GRM-WF-001 |
| Severity | High |
| Area | API / Workflow |
| Description | `changeStatus` calls `ConfigurationModel.listWorkflow()` without importing `ConfigurationModel`. Its assignment prerequisite also compares the status key to `"in progress"` instead of `"in_progress"`. |
| Evidence | Imports at `backend/src/controllers/lifecycle.controller.js:1-9`; use at `:116`; bad comparison at `:131-133`. |
| Current Behaviour | Every status request reaches a `ReferenceError`; after adding the import, the department-acceptance prerequisite still never matches the current key. |
| Expected Behaviour | Status transitions execute and enforce configured prerequisites. |
| Risk | Entire post-submission lifecycle is unusable; an eventual partial fix leaves an authorization/business-rule bypass. |
| Recommended Fix | Import the model; compare immutable keys; move prerequisite checks into the transactional transition service and lock/re-read the complaint there. |
| Affected Files | `backend/src/controllers/lifecycle.controller.js`; `backend/src/models/lifecycle.model.js`. |
| Database Change | None for import; transition-policy metadata may be required for the full fix. |
| Testing Required | Endpoint integration test for every permitted/denied transition and unassigned acceptance attempt. |

### GRM-AUTH-002 — Transition-specific permissions are not enforced

| Field | Details |
| --- | --- |
| Issue ID | GRM-AUTH-002 |
| Severity | High |
| Area | Security / Workflow / API |
| Description | The status route accepts any one of update/submit-resolution/approve-resolution/close permissions, then `changeStatus` mostly checks only review, close, and reopen. It never requires submit-resolution for resolving or approve-resolution for returning/approving, rejecting, or duplicating. |
| Evidence | `backend/src/routes/complaint.routes.js:52`; `backend/src/controllers/lifecycle.controller.js:110-151`; default Ministry User has `grievances.update_status` and `grievances.submit_resolution` at `backend/scripts/apply-role-permissions-migration.js:240-249`. |
| Current Behaviour | A user with generic update permission can use any database transition exposed from the current state, including review decisions not intended for that role. |
| Expected Behaviour | Each business action maps to an explicit permission, allowed role, scope, prerequisite, and transition. |
| Risk | Ministry users may reject/duplicate/return cases or bypass resolution-review separation. |
| Recommended Fix | Replace generic status mutation with action endpoints or a server-side action policy map; enforce permissions inside the transaction, not only at route/UI level. |
| Affected Files | complaint routes; lifecycle controller/model; permission seeds; admin workflow UI. |
| Database Change | Optionally add action/permission metadata to transition configuration. |
| Testing Required | Full role × state × action matrix, including crafted API calls not offered by the UI. |

### GRM-WF-002 — Assigned/acceptance state is missing and transition matrix is unsafe

| Field | Details |
| --- | --- |
| Issue ID | GRM-WF-002 |
| Severity | High |
| Area | Workflow / Database |
| Description | Status master data has no `assigned` status. Assignment only changes department/officer/priority. The transition seed allows unusual paths such as In Progress→Returned, Under Review→Returned, Pending Information→Resolved, and Returned→Resolved, while department acceptance is not a distinct audited action. |
| Evidence | statuses `database/database.sql:831-840`; transitions `:2166-2183`; assignment update `backend/src/models/lifecycle.model.js:69-90`. |
| Current Behaviour | Assignment and acceptance cannot be distinguished; processing can skip intended review/acceptance and resolution rework. |
| Expected Behaviour | New→Under Review→Assigned→In Progress; Returned→In Progress; explicit accept/reject/duplicate/admin-resolution decisions. |
| Risk | Incorrect case state, unreliable SLA/reporting, and weak accountability. |
| Recommended Fix | Add immutable `assigned`, define explicit action transitions/guards, migrate open records using assignment history, and prohibit unsafe paths. |
| Affected Files | canonical schema/migration; configuration seeds/model; lifecycle service/controller; dashboard/UI filters; notifications/reports. |
| Database Change | Add status and revised transition/action data; backfill carefully without changing ticket numbers. |
| Testing Required | Transition graph validation and end-to-end happy/return/reopen/reject/duplicate paths. |

### GRM-WF-003 — Resolution workflow is not a reviewable entity

| Field | Details |
| --- | --- |
| Issue ID | GRM-WF-003 |
| Severity | High |
| Area | Workflow / Database / Privacy |
| Description | Resolution is only one complaint-level summary, a status-history comment, and documents. There are no action-taken/citizen-response/internal-remarks/submitted-by/review-status/reviewer/review-note/version fields. Returned resolutions overwrite/retain the same summary. |
| Evidence | `backend/src/models/lifecycle.model.js:93-129`; `database/database.sql:769-783,790-806`; missing column noted in GRM-DB-002; public option at `backend/src/controllers/public-complaint.controller.js:702`. |
| Current Behaviour | Admin approval versus ministry submission is inferred from statuses; revisions and review decisions are not separately preserved. If “Resolution Summary” is enabled publicly, a returned/unapproved summary can remain visible. |
| Expected Behaviour | Versioned resolution submissions with private/public fields, explicit review decision, approver, timestamps, notes, and document visibility. |
| Risk | Internal/unapproved content exposure, lost revision history, and inability to prove who approved the final citizen response. |
| Recommended Fix | Add `complaint_resolutions` plus versioned documents and review records; publish only an approved citizen-visible response; preserve returned versions. |
| Affected Files | schema/migrations; lifecycle model/controller; public tracking; notifications; admin/public UI; reports. |
| Database Change | New resolution, review, and resolution-document visibility/version tables/columns. |
| Testing Required | submit/return/revise/approve/close/public-visibility tests with role and document checks. |

### GRM-WF-004 — Pending Information is only a status

| Field | Details |
| --- | --- |
| Issue ID | GRM-WF-004 |
| Severity | High |
| Area | Workflow / Database / Notifications |
| Description | No entity/API/UI stores an information request, requester, reason, deadline, citizen response, response attachments, response date, status, or history. There is no citizen response endpoint. |
| Evidence | Only status at `database/database.sql:835`; no matching request/response table among table declarations `:1-2164`; public routes contain only submit and status lookup (`backend/src/routes/public.routes.js:21-37`). |
| Current Behaviour | Staff can change the label to Pending Information and add an internal/status comment, but citizens cannot see/respond to a structured request and staff cannot resume from an auditable response. |
| Expected Behaviour | Complete request-response lifecycle with public/internal separation and notifications to both parties. |
| Risk | Cases stall, sensitive requests may be put in generic comments, and history/SLAs cannot be proven. |
| Recommended Fix | Add request/response entities, expiring citizen verification token or authenticated citizen flow, attachment visibility, transitions, deadlines, and notifications. |
| Affected Files | schema/migrations; lifecycle/public routes/controllers/models; notifications; public/admin UI; worker. |
| Database Change | New information request, response, attachment, and status/history tables. |
| Testing Required | request/notify/respond/notify/resume/history/expiry/authorization tests. |

### GRM-PRIV-002 — PII capability and masking are incomplete

| Field | Details |
| --- | --- |
| Issue ID | GRM-PRIV-002 |
| Severity | High |
| Area | Security / Data Privacy / API |
| Description | The reviewed runtime `.env` has no `PII_ENCRYPTION_KEY`; identification capture will fail if used/required. `grievances.view_pii` governs identification decryption and phone masking only; email, address, witness data, signature, names, and office detail are returned to every in-scope viewer. |
| Evidence | `backend/src/services/pii.service.js:3-13`; current capability check `backend/src/services/settings-policy.service.js:14,26-35`; responses `backend/src/controllers/complaint.controller.js:50-84,86-110,126-163`; local non-secret env check: PII key absent. |
| Current Behaviour | Enabling required identification breaks named intake; department viewers receive multiple plaintext PII fields regardless of `grievances.view_pii`. Retention also leaves potentially identifying free text. |
| Expected Behaviour | Production refuses startup/feature enablement without the key; all sensitive fields have explicit least-privilege projections and masking. |
| Risk | Broken submissions and excessive citizen-data disclosure. |
| Recommended Fix | Provision/rotate a dedicated key through a secret manager; fail readiness when required; classify every field; create summary/detail/PII projections; mask email/address/witness/signature and sanitize exports/logs. |
| Affected Files | environment/deployment; PII/settings services; complaint controller/model; reports; admin UI. |
| Database Change | Consider encryption/hash/last4 for other identifiers and data-classification/consent metadata. |
| Testing Required | PII capability startup tests and role-by-field response snapshots, including reports/audit/logging. |

### GRM-REP-001 — Report authorization and privacy policy conflict

| Field | Details |
| --- | --- |
| Issue ID | GRM-REP-001 |
| Severity | High |
| Area | Report / Security / Privacy |
| Description | General settings allow Admin export and the controller reports it enabled, but the route also requires `reports.export`, which the default Admin role does not receive. Export masking leaves names/emails visible when “mask sensitive data” is true; generated files have no expiry/cleanup. |
| Evidence | `backend/src/routes/report.routes.js:10,12`; `backend/src/controllers/report.controller.js:10-18,52-68`; Admin seed `backend/scripts/apply-role-permissions-migration.js:214-239`; report columns/masking `backend/src/services/report.service.js:33-55`; output persistence `:119-148`. |
| Current Behaviour | Default Admin sees export enabled but receives 403; Super Admin exports include names/emails when citizen detail is enabled; completed files persist indefinitely. |
| Expected Behaviour | One authoritative policy, complete redaction, scoped export, and controlled report-file retention. |
| Risk | Broken operational reporting and long-lived sensitive export files. |
| Recommended Fix | Align permission seed/controller/UI; define per-field export entitlement; mask/remove all classified PII; encrypt or short-retain outputs and log purge/download events. |
| Affected Files | report routes/controller/service/model; settings; role permission migration; Reports UI; worker. |
| Database Change | Add report expiry/purge/download metadata and optional immutable scope snapshot. |
| Testing Required | Admin/Ministry/Super Admin export matrix, PII snapshots, expiry/purge, and owner/download tests. |

### GRM-AUD-001 — Critical workflow audit records are best-effort and lack change evidence

| Field | Details |
| --- | --- |
| Issue ID | GRM-AUD-001 |
| Severity | High |
| Area | Audit / Workflow / Security |
| Description | Assignment/status/due/reassignment mutations commit first; audit is then attempted and errors are swallowed. Audit rows contain a generic message and resource ID but no old/new value, reason, transition, assignment target, or resolution decision. Comment and attachment download events are not audited. |
| Evidence | `backend/src/controllers/lifecycle.controller.js:34-45,63-71,95-106,148-152,159-164,186-218`; audit schema `database/database.sql:1-24`; model insert `backend/src/models/audit-log.model.js:32-51`. |
| Current Behaviour | Business changes can succeed without an audit record; surviving records cannot reconstruct exact before/after state. |
| Expected Behaviour | Audit insert shares the business transaction or uses a durable outbox and records masked before/after/action/reason evidence. |
| Risk | Non-repudiation and compliance failure; incomplete incident investigation. |
| Recommended Fix | Create transactional audit event/outbox with structured JSON old/new/reason; cover every required action and downloads; mask PII and make logs append-only. |
| Affected Files | lifecycle/comment/download controllers and models; audit service/model/schema; settings/ticket log integration. |
| Database Change | Add old/new/reason/correlation fields or separate append-only audit-event payload table. |
| Testing Required | Forced audit failure rollback/outbox test and event-content coverage for every critical mutation. |

## 8. Medium-Priority Issues

### GRM-FILE-001 — Attachment metadata and malware controls are incomplete

| Field | Details |
| --- | --- |
| Issue ID | GRM-FILE-001 |
| Severity | Medium |
| Area | Security / Database |
| Description | Filenames use timestamp plus `Math.random`; attachment rows lack uploader, upload source, visibility, checksum, scan status, deletion/quarantine metadata, and storage provider key. ZIP-based Office validation checks only a ZIP signature. |
| Evidence | `backend/src/middlewares/complaint-upload.middleware.js:19-24`; `backend/src/config/attachment-types.js:35-42`; tables `database/database.sql:567-579,769-784`. |
| Current Behaviour | Files are safely path-contained and not public, but provenance/integrity/visibility/scan lifecycle cannot be enforced or audited. |
| Expected Behaviour | Cryptographically random names, checksum, malware quarantine/scan, uploader/source and explicit visibility/deletion state. |
| Risk | Malware handling and evidentiary integrity gaps; difficult cloud migration. |
| Recommended Fix | Use `crypto.randomUUID/randomBytes`; add SHA-256 and scan pipeline; store outside web root/object storage; model visibility and soft delete. |
| Affected Files | upload middleware, attachment models/schema, worker/download controllers. |
| Database Change | Add provenance, visibility, checksum, scan, storage-provider, and deletion fields. |
| Testing Required | collision, malformed Office archive, quarantine, checksum, visibility, scan failure, and deletion tests. |

### GRM-NOT-001 — Notification event coverage and idempotency are incomplete

| Field | Details |
| --- | --- |
| Issue ID | GRM-NOT-001 |
| Severity | Medium |
| Area | Notifications / Workflow |
| Description | There are no events for information requested/received or approved citizen-visible resolution. Manual lifecycle event keys contain `Date.now()`, so semantically repeated assignments/updates are not deduplicated by business version. Resolution has dashboard but no email template. |
| Evidence | event map/recipients `backend/src/services/notification.service.js:6-29,31-78`; event key `backend/src/controllers/lifecycle.controller.js:38-45`; templates `database/database.sql:1252-1266`. |
| Current Behaviour | Queue retry is sound, but required recipients/events can be missed or duplicated across repeated business actions. |
| Expected Behaviour | Domain-event IDs/versions drive exactly-once admission for every required event and visibility-safe template. |
| Risk | Citizens/staff miss actionable updates or receive duplicates. |
| Recommended Fix | Emit events transactionally using history/resolution/request IDs; add missing templates/toggles/recipient validation and dead-letter operations. |
| Affected Files | notification service/model/schema/templates; lifecycle/public flows; worker. |
| Database Change | Add domain-event/outbox correlation and optional dead-letter/retry metadata. |
| Testing Required | All required event/recipient/toggle/retry/idempotency/template-variable tests. |

### GRM-DB-003 — Legacy sources of truth and redundant database objects remain

| Field | Details |
| --- | --- |
| Issue ID | GRM-DB-003 |
| Severity | Medium |
| Area | Database / Maintenance |
| Description | `complaints.status`/`ticket_priority` duplicate ID masters; `office_initial_classification` duplicates its ID; `complaint_reference_sequences` and `buildComplaintToken` are legacy; duplicate department indexes exist; ticket log actor columns lack FKs. |
| Evidence | `database/database.sql:850-856,900-901,755-765,915,925,1090-1091,2079-2095,2101-2124`; legacy builder `backend/src/models/complaint.model.js:5-37`. |
| Current Behaviour | Current runtime uses status/priority IDs and `ticket_sequences`, but legacy objects can drift and confuse migrations/support. |
| Expected Behaviour | One authoritative source per concept and explicit archival/removal of legacy objects after compatibility verification. |
| Risk | Data inconsistency and incorrect ad-hoc/report queries. |
| Recommended Fix | Backfill/validate, stop all legacy reads, archive/drop mirrors and old sequence table in a later migration; remove duplicate indexes and add missing actor FKs where retention semantics permit. |
| Affected Files | schema/migrations; complaint model/tests; ticket migration; documentation. |
| Database Change | Drop/archive listed legacy columns/table/indexes after validation; add actor FKs. |
| Testing Required | Drift detection and migration rollback/compatibility tests. |

### GRM-ORG-001 — Access model supports only one department per user

| Field | Details |
| --- | --- |
| Issue ID | GRM-ORG-001 |
| Severity | Medium |
| Area | Database / Authorization |
| Description | `admin_users.department_id` is singular; there is no `ministries` or `user_department_access` table. “Ministry User” behaves as a department user. Ministry-wide access is only possible by granting system-wide `grievances.view_all`. |
| Evidence | `database/database.sql:463-485`; `backend/src/utils/access-scope.js:5-24`; department filter `backend/src/models/complaint.model.js:190-195`. |
| Current Behaviour | One department, or all departments; no safe multi-department subset/ministry scope. |
| Expected Behaviour | Explicit one/many department membership and, if multiple ministries are in scope, ministry hierarchy/scope. |
| Risk | Role proliferation or overbroad access when users cover multiple departments. |
| Recommended Fix | For current single-ministry scope, absence of `ministries` is acceptable; add a user-department join table before multi-department users are required. Add ministries only when multi-ministry tenancy is approved. |
| Affected Files | schema, auth/access scope, user admin, all scoped queries/reports/notifications. |
| Database Change | `user_department_access`; optional `ministries` and `departments.ministry_id`. |
| Testing Required | one/many/no/all department and reassignment boundary tests. |

### GRM-SLA-001 — SLA recalculation rules are partial

| Field | Details |
| --- | --- |
| Issue ID | GRM-SLA-001 |
| Severity | Medium |
| Area | Workflow / Settings |
| Description | Initial due date, holiday exclusion, reminders, overdue, escalation, extensions, and bulk recalculation exist. Priority and reassignment changes do not trigger/review SLA recalculation and there are no priority-specific SLA rules. Due-date history is only request rows/generic audit. |
| Evidence | initial calculation `backend/src/models/complaint.model.js:61-65`; assignment changes priority only `backend/src/models/lifecycle.model.js:78-90`; reassignment `:164-171`; worker `backend/src/services/runtime-worker.service.js:48-127`; bulk recalculation `backend/src/controllers/lifecycle.controller.js:222-279`. |
| Current Behaviour | Overdue is both persisted (`overdue_at`, `is_escalated`) and also calculated from `due_at` in filters/dashboard; state can lag until the worker runs. |
| Expected Behaviour | One documented SLA policy with explicit recalculation decisions/history and overdue derived from due/status (persist event timestamp only when needed). |
| Risk | Inconsistent deadlines, overdue counts, and escalation after operational changes. |
| Recommended Fix | Define priority/category rules, transactionally record due-date versions and recalculation reason; use `due_at < now AND open` as truth, retaining `overdue_at` as first-overdue evidence. |
| Affected Files | due-date service, lifecycle model/controller, worker, dashboard/report queries, settings/schema. |
| Database Change | SLA rule and due-date history tables/columns. |
| Testing Required | priority/reassignment/holiday/settings-change/reopen/extension/worker-lag scenarios. |

### GRM-REP-002 — Report job correctness and failure handling need hardening

| Field | Details |
| --- | --- |
| Issue ID | GRM-REP-002 |
| Severity | Medium |
| Area | Report / Security |
| Description | `dateTo` uses `< YYYY-MM-DD 23:59:59`, CSV export does not neutralize formula prefixes, and generation errors immediately mark jobs failed with no retry count/backoff. Historical failed jobs remain but no operator retry action exists. |
| Evidence | `backend/src/models/report.model.js:55-77`; CSV `backend/src/services/report.service.js:12-13,65-69`; failure `:119-149`; historical failures `database/database.sql:1491-1492`. |
| Current Behaviour | The final second can be excluded, crafted text can become a spreadsheet formula in CSV, and transient failures are terminal. |
| Expected Behaviour | Half-open next-day date range, formula-safe exports, bounded retries/dead-letter and operator-visible failure/retry. |
| Risk | Incorrect totals, CSV injection, and avoidable failed reports. |
| Recommended Fix | Use `< nextDayStart`; prefix dangerous CSV cells; add attempts/available-at/backoff and retry/cancel/purge operations. |
| Affected Files | report model/service/controller/schema/UI. |
| Database Change | Attempts, retry scheduling, expiry/purge, and optional checksum fields. |
| Testing Required | timezone/date boundary, formula injection, transient retry, permanent failure, and large export tests. |

### GRM-AUTH-003 — Request-decision models do not apply complaint scope

| Field | Details |
| --- | --- |
| Issue ID | GRM-AUTH-003 |
| Severity | Medium |
| Area | Authorization / Workflow |
| Description | Reassignment and due-date decision endpoints fetch a request by ID and decide it without joining the complaint to `getGrievanceScope`. Defaults currently reserve decision permissions for broad Admins, but customized department roles can become cross-department decision authorities. |
| Evidence | routes `backend/src/routes/complaint.routes.js:41-42`; controller `backend/src/controllers/lifecycle.controller.js:95-107,196-219`; model `backend/src/models/lifecycle.model.js:148-174,184-207`. |
| Current Behaviour | Permission is checked, resource scope is not. |
| Expected Behaviour | Permission and object-level scope are independently required for every mutation. |
| Risk | Future/custom roles can approve another department's requests by guessing IDs. |
| Recommended Fix | Join/lock request plus complaint with explicit all/department decision scope; use distinct request-versus-approve permissions. |
| Affected Files | lifecycle routes/controller/model; permission definitions. |
| Database Change | None required; optional decision-scope metadata. |
| Testing Required | cross-department ID tests for custom department decision roles. |

### GRM-DEP-001 — Production operations and documentation are not executable as written

| Field | Details |
| --- | --- |
| Issue ID | GRM-DEP-001 |
| Severity | Medium |
| Area | Deployment / Documentation / API |
| Description | README refers to nonexistent `schema.sql`, `seed.sql`, migrations, and `pm2 start server.js`; there are no deployment manifests/CI workflows. Server has a public `/db-test`, no centralized error handler, no graceful shutdown/readiness endpoint, and only console logging. |
| Evidence | `README.md:432-440,530-540,817-848`; actual entry `backend/package.json` and `backend/src/server.js:101-124`; public diagnostic `backend/src/server.js:103-119`; no Docker/PM2/service/CI files found. |
| Current Behaviour | Operators cannot follow the documented install/deploy process reliably; health and failures are not production-grade. |
| Expected Behaviour | Versioned build/migrate/start/runbook, least-information health endpoints, structured logs/metrics, graceful shutdown, backups and restore tests. |
| Risk | Deployment errors, poor incident response, and accidental database detail exposure in development responses. |
| Recommended Fix | Rewrite runbook from executable commands; add CI, schema import test, process manifest/container as appropriate, `/live`/`/ready`, structured logging, shutdown, monitoring and backup restoration procedure. Remove or protect `/db-test`. |
| Affected Files | README/docs; server bootstrap; deployment/CI files. |
| Database Change | None; migration/backup procedures required. |
| Testing Required | CI clean build/test/migrate/start smoke; readiness failure; SIGTERM; backup restore exercise. |

## 9. Low-Priority Improvements

### GRM-DATA-001 — Gender field is dead/inconsistent

| Field | Details |
| --- | --- |
| Issue ID | GRM-DATA-001 |
| Severity | Low |
| Area | Database / Frontend |
| Description | `gender_key` exists but no active form/API write uses it; admin responses return `gender: null`. |
| Evidence | `database/database.sql:867`; `backend/src/controllers/complaint.controller.js:126-130`; no frontend field reference. |
| Current Behaviour | Column remains empty and cannot be validated against configured options. |
| Expected Behaviour | Either an explicitly optional configured field with validation/privacy rules or removal. |
| Risk | Schema/UI confusion and misleading analytics expectations. |
| Recommended Fix | Confirm business need; add a configured option group and validation or remove in a later cleanup migration. |
| Affected Files | schema, form options, public/admin form, report/API projections. |
| Database Change | Add FK/option relation or drop unused column. |
| Testing Required | Optional/required/invalid-value tests if retained. |

### GRM-TKT-001 — Legacy ticket helper and UI text contradict authoritative format

| Field | Details |
| --- | --- |
| Issue ID | GRM-TKT-001 |
| Severity | Low |
| Area | Code Quality / Frontend |
| Description | Unused `buildComplaintToken` emits `GRM-YEAR-MONTH-####`, and the admin receipt describes that format, while stored settings specify `{PREFIX}-{YEAR}-{SEQUENCE}` with six digits. |
| Evidence | `backend/src/models/complaint.model.js:5-37`; `admin-panel/src/pages/AdminGrievanceForm.jsx:332-336`; `database/database.sql:2128-2129`. |
| Current Behaviour | Runtime generation is correct, but tests/support/UI can communicate the legacy format. |
| Expected Behaviour | All examples use the ticket settings service and current preview. |
| Risk | User/support confusion. |
| Recommended Fix | Remove/deprecate legacy helper and render format text from public ticket example/settings. |
| Affected Files | complaint model/test; admin form. |
| Database Change | None. |
| Testing Required | UI example matches configured preview. |

### GRM-UI-001 — Lifecycle controls are not capability-aware

| Field | Details |
| --- | --- |
| Issue ID | GRM-UI-001 |
| Severity | Low |
| Area | Frontend |
| Description | Assignment/status/comment/due-date controls are mostly shown from global settings/transitions rather than the signed-in user's action permissions. Backend checks still apply. |
| Evidence | `admin-panel/src/pages/ManageGrievances.jsx:903-948`; UI receives policy but not a per-record action capability projection. |
| Current Behaviour | Users can see/submit actions that return 403, and generic transition dropdowns obscure business actions. |
| Expected Behaviour | API supplies per-record allowed actions; UI renders only those actions with reason/help text. |
| Risk | Confusing UX and support load, not a direct security bypass. |
| Recommended Fix | Add server-derived capabilities to complaint detail and render action-specific controls. |
| Affected Files | complaint/lifecycle controller; ManageGrievances. |
| Database Change | None unless action metadata is stored. |
| Testing Required | role-specific component tests plus backend 403 assertions. |

### GRM-CODE-001 — Dead dependencies/helpers and naming debt remain

| Field | Details |
| --- | --- |
| Issue ID | GRM-CODE-001 |
| Severity | Low |
| Area | Code Quality |
| Description | `morgan` and `cookie-parser` are dependencies but unused; legacy helper/env names remain; “complaint” and “grievance” naming is mixed throughout APIs and UI. |
| Evidence | `backend/package.json`; `backend/src/server.js`; `backend/src/models/complaint.model.js:5-37`; `/api/complaints` versus grievance UI. |
| Current Behaviour | No functional failure, but maintenance/search/documentation are harder. |
| Expected Behaviour | Minimal dependencies and one documented domain vocabulary/API compatibility strategy. |
| Risk | Maintenance and onboarding cost. |
| Recommended Fix | Remove unused packages/code after coverage; document `complaint` as storage/API compatibility name or version to grievance naming. |
| Affected Files | package manifests, model/tests, docs/routes. |
| Database Change | None. |
| Testing Required | Dependency audit and regression suite. |

### GRM-DB-004 — Query-oriented indexes and FK retention policy need review

| Field | Details |
| --- | --- |
| Issue ID | GRM-DB-004 |
| Severity | Low |
| Area | Database / Performance |
| Description | `index_complaints_status_created` indexes only `created_at`; common filters/order use `(status_id, created_at)`, `(priority_id, created_at)`, department/status/due combinations. Several log actor fields are indexed but not constrained. |
| Evidence | `database/database.sql:910-928,2091-2094`; query patterns `backend/src/models/complaint.model.js:207-233,250-270`; dashboard queries `backend/src/models/dashboard.model.js`. |
| Current Behaviour | Correctness is unaffected at current small volume; larger datasets may scan/sort unnecessarily and actor integrity is inconsistent. |
| Expected Behaviour | Indexes are derived from measured query plans and FK/delete retention policy is explicit. |
| Risk | Performance degradation and orphaned actor references. |
| Recommended Fix | Run `EXPLAIN` on production-sized synthetic data, remove duplicates, add only validated composites, and define SET NULL/restrict retention for log actors. |
| Affected Files | schema/migrations and query documentation. |
| Database Change | Targeted index/FK migration after measurement. |
| Testing Required | Query-plan/performance regression and FK deletion tests. |

## 10. Ticket Number Audit

| Question | Finding |
| --- | --- |
| Authoritative ticket-number mechanism | `ticket_number_settings` + `ticket_sequences` + `ticket-number-generator.service.js`. |
| Legacy mechanism | `complaint_reference_sequences`, `ComplaintModel.buildComplaintToken`, `COMPLAINT_TOKEN_PREFIX`, and old `GRM-YEAR-MONTH-####` rows. The old table is consulted only while initializing the new sequence migration. |
| More than one active runtime allocator | No. Current grievance creation calls only `generateTicketNumber` (`backend/src/models/complaint.model.js:66`). |
| Conflict found | Yes, historical/config presentation conflict: stored complaints and `ticket_sequences.last_generated_ticket` show `GRM-2026-07-0004`, while settings specify `{PREFIX}-{YEAR}-{SEQUENCE}`, six digits, yearly reset (`database/database.sql:943-946,2128-2150`). The legacy helper/UI still show month/four digits. |
| Current generated format | With the supplied settings and current code: `GRM-2026-000005` for the next available 2026 sequence, subject to actual database state at allocation time. This is derived from settings; it was not generated against the live database during the read-only audit. |
| Configured format | `GRM-{YEAR}-{SEQUENCE}`, uppercase, `-`, four-digit year, six-digit padded sequence, yearly reset. |
| Sequence reset | Yearly; period key is timezone-aware, e.g. `GRM:2026` (`backend/src/utils/ticket-period-helper.js`; `database/database.sql:2149-2150`). |
| Preview consumes sequence | No. It reads `currentSequence`/`nextSequence` and formats examples without sequence update (`backend/src/services/ticket-settings.service.js:67-100`). |
| Concurrent duplicate protection | Strong: unique `complaints.token_number`, a unique `sequence_key`, `INSERT IGNORE` plus `SELECT ... FOR UPDATE`, existence check, and same-transaction allocation. The concurrency unit test passes. |
| Same transaction as grievance | Yes (`backend/src/models/complaint.model.js:54-68,161-169`). A failed complaint insert rolls back the sequence increment. |
| Existing tickets editable | No edit path was found. Settings changes explicitly apply to future tickets only (`backend/src/services/ticket-settings.service.js:160-168`). |
| Reassignment changes ticket | No; assignment/reassignment SQL updates only assignment/officer/priority (`backend/src/models/lifecycle.model.js:78-90,164-171`). |
| Global uniqueness | Enforced by `unique_complaints_token_number` (`database/database.sql:909`). Formats containing contextual codes are still checked globally. |
| Deleted/rejected/duplicate reuse | Rejected/duplicate records retain tickets. Reset checks the proposed next ticket, and generation skips any existing ticket. There is no complaint delete endpoint. Physical deletion outside the application could permit reuse after reset; prohibit/guard it operationally. |

Recommended final mechanism: retain the current authoritative mechanism and standardize future numbers as `GRM-{YEAR}-{SEQUENCE}` (example `GRM-2026-000145`). Preserve all existing ticket numbers permanently. Remove legacy allocation code/table only after a migration proves no runtime consumer remains. Restrict reset to Super Admin (already implemented), require a reason, log it transactionally, and add a database/CI invariant that ticket format changes never rewrite `complaints.token_number`.

## 11. Grievance Workflow Audit

### Action coverage

| Action | Status | Evidence / gap |
| --- | --- | --- |
| Submit grievance | Implemented but deployment-blocked | Public/admin validation, attachments, transactional ticket/grievance/history at `public-complaint.controller.js:461-671` and `complaint.model.js:50-173`; install/schema blockers apply. |
| Admin review | Partial | `new→under_review` plus `grievances.review_new`; no structured review record/checklist. |
| Accept grievance | Missing | No action/entity/status; direct transition to In Progress. |
| Reject grievance | Partial/unsafe | Status/transition exists, but generic update permission can invoke it. |
| Mark duplicate | Partial/unsafe | Status/transition exists; no `duplicate_of_complaint_id`, duplicate reason, or relationship; generic update permission can invoke it. |
| Assign department | Implemented | Transactional complaint update/history, but no Assigned status and intake permission issue. |
| Assign officer | Implemented | Officer must be active and in target department (`lifecycle.model.js:58-66`). |
| Set priority | Partial | Assignment can set master priority; no standalone priority history/SLA recalculation. |
| Set due date | Implemented/partial | Initial calculation, request/decision/direct update and bulk recalculation; incomplete change history/recalculation triggers. |
| Start processing | Broken | Intended status endpoint fails; no distinct accept action. |
| Request additional information | Missing | Only a status. |
| Resume processing | Partial | Configured `pending_information→in_progress`; no citizen response linkage. |
| Add progress note | Internal only | `complaint_internal_comments`; no citizen-visible progress entity. |
| Upload document | Intake/resolution only | No later general progress/citizen-response upload endpoint or visibility model. |
| Submit resolution | Broken/incomplete | Status endpoint error, missing column, and no structured resolution version. |
| Return resolution | Partial/unsafe | Status transition/notification exist, but no review record and weak transition permission. |
| Approve resolution | Not distinct | Inferred by moving Resolved to Closed; `grievances.approve_resolution` is not enforced. |
| Close grievance | Partial | Explicit close permission/role check exists; status endpoint/schema blockers apply. |
| Reopen grievance | Partial | Closed→In Progress with settings/role checks; no required reason policy beyond generic comment. |
| Reassign grievance | Implemented/partial | Direct/request/decision/history; decision object scope and SLA recalculation gaps. |
| Escalate overdue grievance | Implemented/partial | Worker adds event/timestamp/flag and notification; no escalation owner/level/acknowledgement/resolution entity. |

### Transition assessment

Expected safe core transitions are not represented accurately. `Assigned` is missing. The supplied table permits:

- Valid/expected: New→Under Review, New/Under Review→Rejected/Duplicate, Under Review→In Progress (only as a temporary substitute for Assigned), In Progress→Pending Information/Resolved, Pending Information→In Progress, Resolved→Returned/Closed, Returned→In Progress, Closed→In Progress.
- Unsafe or unsupported by the stated process: In Progress→Returned, Under Review→Returned, Pending Information→Resolved, Returned→Resolved, Resolved→In Progress.
- Missing: Under Review→Assigned, Assigned→In Progress, explicit Admin approve-resolution action separate from close, explicit reassignment acceptance where required.

Backend validation does consult `workflow_transitions` transactionally (`backend/src/models/lifecycle.model.js:50-55,93-103`); it is not only a frontend dropdown. However, because the transition table itself is unsafe and action-specific permissions are not enforced, database configurability is not a sufficient policy boundary.

Status history is created for initial and subsequent transitions. Notifications are driven by the target status's `notification_event`; some transitions therefore have generic or wrong recipient semantics. Audit history is separate and best-effort.

## 12. Resolution Workflow Audit

Structured storage coverage:

| Required datum | Current storage |
| --- | --- |
| Resolution summary | Referenced as `complaints.resolution_summary`, missing from supplied schema. |
| Action taken | Missing. |
| Citizen-visible response | Not separate; optional public tracking exposes the same summary. |
| Internal remarks | Generic internal comment/status comment only. |
| Submitted by/date | Can be inferred from `complaint_status_history.changed_by/created_at`, not bound to a resolution version. |
| Review status | Inferred from grievance status, not stored on resolution. |
| Reviewed by/date | Can only be inferred from later status history. |
| Admin review note | Generic status comment. |
| Supporting documents | `complaint_resolution_documents`, but no version/visibility/review state. |

Ministry submission, Admin return/approval, returned-actionability, public approval gating, and document visibility are therefore not reliably represented. This is a High-priority schema and domain-model gap (GRM-WF-003), not merely a UI omission.

## 13. Role and Permission Audit

| Role | Effective design found | Assessment |
| --- | --- | --- |
| Super Admin | Middleware bypass plus system-wide scope; settings/ticket mutations restricted by live role checks. | Broad intended access. Super Admin bypass makes protection of that role/account especially important. |
| Admin | Default `grievances.view_all`, review/assign/reassign/update/notes/submit/approve/close; limited settings/audit/reports. | Close to intended, but Admin export is contradictory and approval permission is not action-enforced. |
| Ministry User | Default one-department view/update/notes/reassignment-request/submit-resolution/report-view/own-audit. | Read queries are department-scoped; status mutation is overly generic; intake is incorrectly available; no multi-department support. |
| Citizen | No role/account. Public submission and ticket-plus-verification status lookup only. | Acceptable for simple public tracking, insufficient for additional-information responses and protected citizen documents. |

Backend authorization is generally present for users/roles/settings/configuration/reports/attachments. Hiding navigation is not treated as the main control. Important exceptions are GRM-AUTH-001, GRM-AUTH-002, and GRM-AUTH-003.

Ministry/department representation is one Ministry with multiple departments in practice. No ministries table is acceptable only while the deployment is intentionally single-ministry. A user can have one department or all-system permission, not multiple departments or a safe ministry-wide subset.

## 14. Citizen Data and Privacy Audit

- Identification numbers use AES-256-GCM with random IV and deterministic HMAC-SHA-256 for matching, with last-four storage (`backend/src/services/pii.service.js:15-49`). The key is environment-based rather than stored in MySQL. The same derived key is used for encryption and HMAC; cryptographic key separation would be preferable.
- Current runtime capability is not ready: the local backend environment has no PII encryption key. Values were not printed or copied during this audit.
- Full identification is returned only with `grievances.view_pii`; otherwise last four is shown. Phone can be masked from settings. Email, address, witness data, names, signatures, and free text are not governed by the same permission.
- Public tracking returns only a configured allowlist. Defaults include ticket, dates, assigned department, and current status. It does not expose internal comments, assignment notes, audit fields, IP/user-agent, DB ID, contact fields, or attachments.
- Public tracking does not mask fields because default/current allowed fields contain no citizen PII. If configuration is broadened to Resolution Summary, approval/public-visibility is not enforced.
- Full phone/email/address are stored plaintext. This may be operationally necessary, but at-rest protection, field-level access, export rules, backups, and key management must be documented and tested.
- Identification values are not deliberately logged by reviewed runtime code. Audit messages are ID-only. Development error messages can include SQL/config errors but not the request body.
- The source-controlled SQL dump itself violates the privacy boundary (GRM-SEC-001).

## 15. Attachment Security Audit

| Control | Finding |
| --- | --- |
| MIME and extension | Both must match the same configured registry type. |
| File signature | Checked for PDF/JPEG/PNG/OLE/ZIP; Office container structure not checked. |
| File size/count | Server-enforced from current settings; Multer and bounded read both enforce size. |
| Filename | Original extension with timestamp/`Math.random`; path pattern and basename containment enforced. Not cryptographically random. |
| Path traversal/symlink | Strong generated-name/path containment; no-follow/lstat protections where supported. |
| Authorization | Complaint/resolution downloads require authenticated broad route permission and reapply department scope. No public download route exists. |
| Visibility | Not modeled; all complaint/resolution documents are internal to authenticated in-scope staff. Citizen-visible documents are unsupported. |
| Virus scan | Not confirmed from current project files. |
| Checksum | Not stored. |
| Uploader/source | Resolution uploader stored; complaint attachment uploader/source not stored. |
| Deleted-file handling | Retention hard-deletes metadata then attempts disk delete; no quarantine/soft delete/reconciliation. |
| Cloud readiness | Storage path is local-disk-specific; provider/bucket/object/checksum metadata absent. |
| Blob storage | Files are not stored in MySQL; only metadata/path are stored. |

No public ticket-tracking attachment download was found. Authenticated download events are not audited.

## 16. Notifications Audit

| Event | Coverage |
| --- | --- |
| Grievance submitted | Admin/Super Admin dashboard/email by toggles; citizen email acknowledgement when enabled and email exists. |
| Grievance assigned | Assigned-department users dashboard/email. No citizen assignment update. |
| Status updated | Citizen email for generic `status_change`; no dashboard recipient for generic changes. |
| Additional information requested | Missing. |
| Citizen information received | Missing. |
| Due date approaching | Assigned-department dashboard/email, idempotent by complaint/due-date version. |
| Overdue/escalated | Assigned-department dashboard/email, idempotent by due version/escalation key. |
| Resolution submitted | Admin dashboard only in supplied templates; no Admin email template. |
| Resolution returned | Assigned-department dashboard/email. |
| Grievance closed | Admin dashboard/email and citizen email. |

The queue has unique idempotency keys, attempts, retry backoff, terminal failed status, and stale-processing recovery. Recipient emails are drawn from complaint/admin records and templates are validated elsewhere against known variables. Payloads include name/email destination and are stored in plaintext JSON; access to the outbox/database must therefore be restricted. There is no dead-letter UI/manual retry or queue metrics/alerting confirmed.

## 17. Reports Audit

- Query joins use one-to-one master/department tables and do not join attachments/history, so duplicate grievance rows are not introduced by the reviewed export query.
- Ministry scope is forced to the user's department at job creation; users can only retrieve/download their own jobs except Super Admin.
- Status/priority filters resolve active master records before queueing.
- Historical `identification_number_last4` failures are evidenced in the dump and appear corrected in the supplied current schema/query. No other historical failure cause is present.
- `dateTo`, CSV formula safety, retry handling, export retention, permission contradiction, and PII masking issues are covered by GRM-REP-001/002.
- Maximum records is setting-controlled (current 10,000), and generation is asynchronous. The implementation loads the entire bounded result into memory, which is acceptable only after performance testing at the configured maximum.
- Description is selected by the report model but not included in current columns. This is unnecessary sensitive-data retrieval and should be removed unless a report explicitly needs it (`backend/src/models/report.model.js:65-75`).

## 18. System Settings Audit

General Settings are actively consumed by public availability/forms, assignment, due dates, workflow, notifications, security, privacy, dashboard, reports, and branding. `backend/src/config/settings-consumers.js` includes a guard test that every retained default has a consumer; that test passed.

Changes use transactional row locks and change logs, then clear the in-process cache (`backend/src/services/settings.service.js:79-139`). Reads are permission-protected; mutations/uploads/reset are Super Admin only, while Admin read-only access is allowed and Ministry is denied (`backend/src/routes/settings.routes.js:38-110` and settings access middleware tests).

Ticket settings are separately stored/logged and Super Admin-only for mutation/reset. Status, priority, transition, notification-template, SLA holiday, form-option, category and routing configuration use permission-protected configuration APIs. These changes use generic audit events rather than detailed old/new central audit records.

SMTP passwords, JWT, PII, reCAPTCHA, and OTP pepper remain environment secrets, which is preferable to general settings. Encryption of sensitive database settings is not currently exercised (`is_encrypted` values are false); if sensitive values are later introduced, encryption implementation is **not confirmed from the current project files**.

The settings cache is process-local. Multi-instance deployments rely on short/version-aware behavior and will not receive an explicit cross-instance invalidation event; validate or replace with shared version polling/cache invalidation before horizontal scaling.

## 19. Security Audit

### Strong controls found

- bcrypt password hashing and configurable complexity/expiry/lockout.
- JWT secret strength validation, algorithm pinning, expiry, DB session checks/revocation, current user/role/permission refresh, optional 2FA/recovery codes.
- Helmet, CORS allowlist, JSON limit, API and endpoint-specific rate limiting.
- Parameterized SQL throughout reviewed runtime paths.
- React's default text escaping and email-template HTML escaping; no runtime `dangerouslySetInnerHTML` use found in the grievance paths reviewed.
- Upload path/type/size/signature controls and authenticated file/report downloads.
- Settings and ticket mutation role checks beyond frontend navigation.

### High-risk security findings

- Operational PII/auth data in source-controlled SQL (GRM-SEC-001).
- Read permission authorizes administrative intake mutation (GRM-AUTH-001).
- Transition-specific authorization missing (GRM-AUTH-002).
- Incomplete PII capability/projection and missing runtime encryption key (GRM-PRIV-002).
- Open-case retention data loss (GRM-PRIV-001).

### Other security observations

- Admin JWT is stored in `localStorage` (`admin-panel/src/services/api.js:9-14`, `Login.jsx:31-32`). This increases impact of any admin-origin XSS. Prefer an HttpOnly, Secure, SameSite cookie with CSRF protection or a carefully designed short-lived in-memory token/refresh flow. No refresh-token implementation exists.
- CSRF is not applicable to bearer headers by default; it becomes required if cookie authentication is adopted.
- CORS uses `[FRONTEND_URL, ADMIN_URL]` and credentials. Production startup should validate both URLs rather than relying on operator correctness.
- Global JSON limit is 10 MB while multipart has per-file settings. Add overall multipart field/body limits and a centralized JSON error response handler.
- `/db-test` is public and returns database error text in all environments (`backend/src/server.js:103-119`). Remove/protect it and expose least-information readiness instead.
- No Content Security Policy for the separately served Vite static sites was confirmed. API Helmet headers do not automatically configure the frontend hosting layer.
- Dependency vulnerability status was not checked with an online advisory database during this audit; not confirmed from current files.

## 20. Testing Gaps

### Verification run

| Command | Result |
| --- | --- |
| `backend: npm test` | 156 tests: 153 passed, 1 failed, 2 skipped. Failure: missing `database/migrations/20260727_complaint_enum_normalization.sql`; symlink and one migration compatibility test skipped. |
| `frontend: npm test` | 5 files, 11 tests passed. |
| `admin-panel: npm test` | 12 files, 27 tests passed. |
| `frontend: npm run lint` | Passed. |
| `admin-panel: npm run lint` | Passed. |

No project files were changed by these verification commands. Production builds were not run because they generate repository-local `dist` artifacts and the task required a read-only application audit.

### Missing critical coverage

- Import canonical schema into an empty real MySQL database and execute all migrations.
- Run the API against that schema; query every model projection to catch `resolution_summary`-class errors.
- Exercise the real status endpoint; current unit tests do not catch the undeclared model import.
- Full role × action × state × department authorization matrix, including direct crafted requests.
- Assigned/acceptance, reject, duplicate linkage, resolution submit/return/revise/approve/close/reopen.
- Structured pending-information request/citizen response (feature absent).
- Transaction rollback across ticket, grievance, attachments, history, audit/outbox.
- Attachment download audit, malware/quarantine/checksum, and cross-department document authorization.
- Retention with open/final/legal-hold cases and disk/DB failure reconciliation.
- Notification recipient/event/idempotency integration using a transactional domain event.
- Report redaction, Admin export permission, date boundaries, CSV injection, retry and purge.
- Backup/restore, production readiness, graceful shutdown, multi-instance worker lease and settings cache behavior.

## 21. Unused or Legacy Database Objects

| Object | Assessment | Recommendation |
| --- | --- | --- |
| `complaint_reference_sequences` | Legacy monthly allocator; only ticket migration reads its maximum. | Archive/drop after migrated sequence floor and compatibility verification. |
| `complaints.status` | Legacy mirror; current runtime uses `status_id` plus master join. | Validate no external consumers, then drop. |
| `complaints.ticket_priority` | Legacy mirror; current runtime uses `priority_id`. | Validate no external consumers, then drop. |
| `complaints.office_initial_classification` | Legacy display mirror; current runtime uses ID/master join with fallback. | Backfill ID, validate, then drop fallback column. |
| `complaints.gender_key` | Present but not written/read meaningfully. | Implement with configured validation/privacy or remove. |
| `ComplaintModel.buildComplaintToken` | Legacy code/test format, not active allocator. | Remove after updating UI/tests/docs. |
| `admin_auth_events` | Legacy auth audit table while `admin_audit_logs` is active; current runtime writes the latter. | Confirm no reporting dependency, archive under retention policy, then remove or document. |
| Duplicate assigned-department/code indexes | Redundant. | Remove after comparing index definitions and live query plans. |

Database columns such as `anonymized_at`, `overdue_at`, `is_escalated`, IP/user-agent, settings history, leases, and job fields are used by workers/audit and are not classified as unused.

## 22. Missing Tables or Features

| Missing object/feature | Priority | Purpose |
| --- | --- | --- |
| Canonical ordered baseline plus complete migration files | Critical | Reproducible deployment. |
| Structured/versioned `complaint_resolutions` and reviews | High | Submit/return/revise/approve with private/public content. |
| Additional-information requests/responses/attachments | High | Complete Pending Information workflow. |
| Duplicate grievance link (`duplicate_of_complaint_id`) and decision metadata | High | Trace duplicate decisions without losing permanent tickets. |
| Explicit workflow action/permission policy | High | Secure state transitions. |
| Due-date/SLA history and optional rules | Medium | Recalculation/audit by priority/category/change. |
| Attachment provenance/visibility/checksum/scan/deletion metadata | Medium | File security and public/internal separation. |
| User-to-many-departments access | Medium when required | Multi-department staff scope. |
| Ministry hierarchy | Future, only if multi-ministry scope is approved | Ministry-wide versus department scope. |
| Durable domain event/audit outbox | High | Transactional audit and notification admission. |
| Report expiry/purge/retry metadata | Medium | Privacy and operational recovery. |
| Legal hold/retention schedule/purge log | Critical before automatic retention | Prevent active/evidentiary data loss. |

## 23. Recommended Fixing Order

### Phase 1 — Critical Production Blockers

| Priority | Affected area | Required files | DB migration | Complexity | Dependency | Validation test |
| --- | --- | --- | --- | --- | --- | --- |
| P0 | Sanitize operational dump and rotate exposed artifacts | `database/database.sql`, history, seed process | Rebuild baseline/seeds | Large | Security/privacy owner | PII/credential scan returns clean; fresh seed has no operational rows. |
| P0 | Restore canonical migrations and make empty install atomic/reproducible | database migrations, installer, migrate-all | Yes | Large | Sanitized baseline | CI creates empty DB, installs, validates columns/FKs, starts API. |
| P0 | Repair schema/runtime contract including resolution column | baseline/migration, complaint/lifecycle models | Yes | Medium pending resolution design | Migration chain | Real-DB detail/public/lifecycle SQL smoke. |
| P0 | Fix status controller import and transactional policy | lifecycle controller/model | Possibly | Medium | Schema contract | All status endpoint tests pass. |
| P0 | Protect administrative intake with create permission | permissions, routes, UI | Permission seed | Small | Migration chain | Ministry/view-only gets 403; intended role succeeds. |
| P0 | Disable unsafe retention until redesigned | worker/settings | Yes for full solution | Medium | Privacy/legal decision | Open case never anonymized; final eligible case follows approved policy. |

### Phase 2 — Before User Acceptance Testing

| Priority | Affected area | Required files | DB migration | Complexity | Dependency | Validation test |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | Define action-specific transition policy and add Assigned/acceptance | schema/configuration/lifecycle/UI | Yes | Large | Product workflow sign-off | Full state/action/role matrix. |
| P1 | Implement versioned resolution review/public visibility | schema/lifecycle/public/admin/notifications | Yes | Large | Transition policy | Submit→return→revise→approve→close and public gating. |
| P1 | Implement pending-information exchange | schema/public/lifecycle/UI/notifications | Yes | Large | Citizen verification design | Request/respond/resume with history and attachments. |
| P1 | Enforce full PII projections and provision key | deployment, controllers/models/reports/UI | Maybe | Medium | Data classification | Role-by-field API/export snapshots. |
| P1 | Make audit transactional and structured | audit/domain models/controllers | Yes | Large | Action model | Mutation cannot lose audit; old/new/reason verified. |
| P1 | Align Admin report export and redaction | report/role/settings/UI | Yes for permission/metadata | Medium | PII policy | Export role/privacy/date/CSV suite. |

### Phase 3 — Before Production Go-Live

| Priority | Affected area | Required files | DB migration | Complexity | Dependency | Validation test |
| --- | --- | --- | --- | --- | --- | --- |
| P2 | Harden files with crypto names, checksum, scan/quarantine, visibility | upload/storage/download/worker | Yes | Large | Storage/AV decision | Malware/quarantine/checksum/access suite. |
| P2 | Complete notification events, retries, monitoring | domain outbox/templates/worker | Yes | Medium | Workflow entities | Recipient/idempotency/failure alert tests. |
| P2 | Report retention/retry and output encryption/access | reports/worker/deployment | Yes | Medium | Privacy policy | Retry/purge/download audit tests. |
| P2 | Production bootstrap/health/logs/graceful shutdown/CI | server, manifests, docs | No | Medium | Hosting choice | Build/migrate/start/readiness/SIGTERM smoke. |
| P2 | Backup, encrypted offsite storage, restore drill, monitoring/runbooks | infrastructure/docs | No | Medium | Operations owner | Recorded restoration and alert exercise. |
| P2 | Dependency/security review and frontend CSP | manifests/hosting | No | Small/Medium | Deployment platform | Advisory scan and browser header test. |

### Phase 4 — Future Enhancements

| Priority | Affected area | Required files | DB migration | Complexity | Dependency | Validation test |
| --- | --- | --- | --- | --- | --- | --- |
| P3 | Multi-department user access | auth/scope/all scoped queries/UI | Yes | Large | Confirmed business need | Multi-department isolation suite. |
| P3 | Ministry hierarchy/multi-tenancy | organization/auth/reporting | Yes | Large | Multi-ministry mandate | Tenant/ministry/department isolation. |
| P3 | Remove legacy mirrors/sequence/helper/indexes | schema/models/docs | Yes | Medium | External-consumer inventory | Drift-free migration and query regression. |
| P3 | Shared cache/eventing and independent workers | settings/worker/deployment | Maybe | Medium | Horizontal scale | Multi-instance consistency/lease load test. |

## 24. Production Readiness Checklist

| Check | Status |
| --- | --- |
| Sanitized, importable canonical schema | **Fail** |
| Complete versioned migrations | **Fail** |
| Empty install and upgrade tested in CI | **Fail** |
| Grievance submission transaction | Partial — code is sound; deployment/schema blockers remain |
| Permanent, concurrent-safe ticket numbers | **Pass** with legacy cleanup recommended |
| Complete status/action transition policy | **Fail** |
| Assigned/department acceptance | **Fail** |
| Structured resolution review and public gating | **Fail** |
| Pending-information request/response | **Fail** |
| Backend RBAC plus object scope for every mutation | **Fail** |
| One-department Ministry isolation for reads/downloads/reports | **Pass** in reviewed default paths |
| Multi-department/ministry-wide subset access | Not supported |
| PII key provisioned and startup-validated | **Fail** in reviewed local runtime |
| PII masking/export classification complete | **Fail** |
| Public tracking allowlist/contact verification | **Pass** for current default configuration |
| Upload extension/MIME/size/signature/path checks | **Pass** |
| Malware scan/checksum/visibility/deletion lifecycle | **Fail** |
| Durable notification queue/retry | Partial |
| Required notification event coverage | **Fail** |
| Scoped queued reports and owner-only download | **Pass** |
| Report permission/redaction/retention/retry | **Fail** |
| Working-day/holiday due dates and overdue worker | **Pass/Partial** |
| Safe legal retention/hold/purge | **Fail** |
| Transactional structured audit for critical actions | **Fail** |
| Backend/frontend/admin automated suites green | **Fail** — backend has one missing-file failure |
| Real-MySQL API integration and end-to-end workflow tests | **Fail** |
| Production build/deploy manifest and accurate runbook | **Fail** |
| Health/readiness, structured logs, metrics, graceful shutdown | **Fail** |
| TLS/CSP/firewall/secret-manager configuration verified | Not confirmed from current project files |
| Automated backups and restore drill verified | Not confirmed from current project files |

## 25. Final Verdict

**Ready for development only**

The project contains several good implementation foundations, especially transactional ticket generation, parameterized data access, live permission refresh, department-scoped reads, input/upload controls, settings consumption, and durable worker queues. It is not ready for internal testing/UAT because a clean environment cannot be installed from the supplied files, core complaint detail/resolution SQL does not match the schema, and the lifecycle status endpoint is broken. Even after those immediate defects, the assigned/acceptance, resolution review, pending-information, transition authorization, PII, audit, retention, and production-operations gaps must be resolved before go-live.

Issue totals:

- Critical: **5**
- High: **8**
- Medium: **8**
- Low: **5**

Top five required fixes:

1. Remove operational data from source control, sanitize the baseline, and rotate/revoke exposed artifacts as applicable.
2. Restore every migration and make a clean MySQL install/upgrade pass in CI.
3. Align the schema with runtime SQL and repair the broken status endpoint.
4. Implement an explicit, permissioned Assigned→processing→resolution-review workflow plus Pending Information exchange.
5. Redesign PII projection, audit, attachment/report retention, and open-case retention before accepting production data.
