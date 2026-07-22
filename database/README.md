# GRM database lifecycle

`database.sql` is the canonical fresh-install baseline. It contains the complete
runtime schema and allowlisted reference data, but no administrators, password
hashes, sessions, grievances, attachments, audit events, notifications, report
history, or sequence history.

## Fresh installation

Start the backend and open the admin panel at `/install`. The installer creates
the configured database when necessary, imports the baseline, creates the first
Super Admin, validates the schema, writes the environment files, and finally
creates `backend/install.lock`.

The reset option deletes every GRM-managed table in the selected database. With
reset disabled, the installer refuses a target that already contains GRM tables.

## Existing database upgrades

Back up the database, configure `backend/.env`, then run:

```powershell
cd backend
npm run migrate:all
```

Migration history is stored in `schema_migrations`. The schema-contract repair
migration adds `complaints.resolution_summary` even when the older historical
migration records are already present.

## Verification

```powershell
cd backend
npm run verify:database-install
```

The verifier creates a uniquely named disposable database, exercises fresh
installation, locking, reset and upgrade behavior, runs every SQL migration
twice, and removes only that disposable database in a `finally` cleanup.

The SQL uses the common MariaDB 10.4/MySQL 8 syntax subset. The baseline generator
is allowlist-based and should only be rerun intentionally when approved master
data or schema metadata changes.

