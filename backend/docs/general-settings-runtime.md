# General Settings runtime contract

`src/utils/default-general-settings.js` is the authoritative inventory. Run
`npm run audit:general-settings` to produce the complete per-setting report with
visibility, activation timing, enforcement responsibility, and direct source
consumers. The command exits unsuccessfully if any retained setting has no
runtime consumer.

Runtime code reads settings through `SettingsPolicy`; public clients receive
only definitions marked `isPublic`. Environment-backed readiness metadata may
be returned, but secrets are never part of either settings response.

Google reCAPTCHA v2 is used only when
`grievanceSubmission.enableCaptcha` is enabled. The public settings endpoint
returns the site key and readiness, the complaint form obtains `captchaToken`,
and the complaint endpoint verifies that token with Google before validation or
persistence. The secret key remains server-side.

Retention is intentionally destructive for expired personal data: after
`privacy.dataRetentionMonths`, the worker anonymizes complainant PII, deletes
complaint and resolution files, keeps the operational grievance record, and
writes an audit event.
