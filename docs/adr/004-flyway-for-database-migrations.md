# ADR 004: Flyway for database migrations

**Status:** accepted

> The decision is mine. The code that implements it was written with Claude Code as an AI pair programmer, from my step descriptions, and I reviewed it in the pull request.

## Context

The project grew in steps, and almost every step changed the database: first resumes, then applications, then users, analyses, the demo flag, status history. The tables on my machine, in CI and on anyone else's machine have to end up identical, and a change has to be reviewable like code.

## Decision

I decided that the schema is defined only by versioned SQL files, run by Flyway when the application starts (`src/main/resources/db/migration`, `V1` to `V6` today). Hibernate does not create or change tables: it is set to `ddl-auto: validate` and only checks that the tables match the entities.

A migration that has been merged is never edited. A change is a new file.

## Alternatives

- **Let Hibernate create the tables (`ddl-auto: update`).** No SQL to write, but the schema would depend on what Hibernate guesses, changes would not be visible in review, and things Hibernate cannot express would be impossible.
- **Liquibase.** Does the same job with changelogs in XML or YAML. Plain SQL files are easier to read and I wanted to write the SQL myself.
- **Manual SQL scripts.** No tool, but nothing guarantees that every database has run the same scripts in the same order.

## Consequences

- Starting the app on an empty database produces the full schema, in CI as well as locally.
- The schema history is readable in the repository, one file per step.
- Features that live in the database are possible: the check constraint on the status, the partial unique index that allows only one demo user, and the trigger that refuses to delete or change the demo user (`V5`).
- Data migrations are part of the same files. `V6` fills the new status history for applications that already existed, and only with what is really known about them.
- A mistake in a merged migration cannot be fixed by editing it. It needs a new migration.
- If an entity and its table disagree, the application does not start. That is intended: the error appears at start-up, not later in a request.
