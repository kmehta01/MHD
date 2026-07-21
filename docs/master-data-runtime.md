# Complaint master-data runtime contract

Stable IDs are stored on complaints and immutable keys are used for semantic behavior. Display names are presentation data and may be renamed safely. Legacy `complaints.status` and `complaints.ticket_priority` columns are compatibility mirrors only.

| Master data | Runtime consumers and enforcement | Dependencies / deactivation | Activation |
|---|---|---|---|
| Departments | Public/admin intake, assignment, routing, access scope, dashboard, reports | Blocked while assigned to an active user or active complaint | Immediate |
| Categories | Public/admin intake, routing, reports | Department mapping is enforced by the submission API; blocked while used by an active complaint | Immediate |
| Locations | Public/admin intake, routing, reports | Blocked while used by an active complaint | Immediate |
| Statuses | Lifecycle transitions, filters, dashboards, notifications, due-date workers, retention, reports | Stable key is immutable. Required system behavior is protected. Deactivation is blocked by active complaints, transitions, or General Settings defaults | Immediate; workers on next cycle |
| Priorities | Assignment, filters, dashboards, reports | Stable key is immutable. Deactivation is blocked by active complaints or General Settings defaults | Immediate |
| Transitions | Lifecycle API, admin action selector, auto-close | Both endpoints must be active statuses; self-transitions are rejected | Immediate |
| Department-category mappings | Public/admin category selector and submission API | A missing/inactive mapping rejects submission even if a client bypasses the UI | Immediate |

`workflow.defaultNewGrievanceStatus` and `assignment.defaultAssignmentPriority` store stable keys and are validated against active master records. Public catalog responses expose active display data and category `departmentIds`; authenticated complaint options additionally expose workflow behavior metadata and transitions.

The migration `20260721_master_data_runtime.sql` is repeatable. It backfills department codes, maps every initially active category to every active department, assigns `UNCATEGORIZED` to legacy complaints without a category while retaining `issue_type`, converts legacy enums to nullable compatibility text, and adds indexed complaint foreign keys through the schema-compatible migration runner.
