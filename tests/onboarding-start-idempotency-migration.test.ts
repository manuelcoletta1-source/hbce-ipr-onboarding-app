import {
  readFileSync
} from "node:fs";

import {
  resolve
} from "node:path";

import {
  describe,
  expect,
  it
} from "vitest";

const migrationPath =
  resolve(
    process.cwd(),
    "db/migrations/0003_onboarding_start_idempotency_and_audit_hardening.sql"
  );

const baseMigrationPath =
  resolve(
    process.cwd(),
    "db/migrations/0001_onboarding_canonical_subject_state.sql"
  );

const sessionMigrationPath =
  resolve(
    process.cwd(),
    "db/migrations/0002_onboarding_session_trust.sql"
  );

const migration =
  readFileSync(
    migrationPath,
    "utf8"
  );

const baseMigration =
  readFileSync(
    baseMigrationPath,
    "utf8"
  );

const sessionMigration =
  readFileSync(
    sessionMigrationPath,
    "utf8"
  );

describe(
  "P003-D082R4 onboarding start idempotency migration",
  () => {
    it(
      "records the frozen start and canonical crypto digests",
      () => {
        expect(
          migration
        ).toContain(
          "ebd1e39b1fc11af6b03ca023c2a6f5b5b67df6a044c4df552935313239fe9fae"
        );

        expect(
          migration
        ).toContain(
          "aa8f53463fa7571a766109da226a5ca8f6e1867b519d202a0d1f560f21857588"
        );
      }
    );

    it(
      "is wrapped in one migration transaction",
      () => {
        expect(
          migration.match(
            /\bBEGIN;/g
          )
        ).toHaveLength(1);

        expect(
          migration.match(
            /\bCOMMIT;/g
          )
        ).toHaveLength(1);
      }
    );

    it(
      "creates the hash-only start request relation",
      () => {
        expect(
          migration
        ).toContain(
          "CREATE TABLE hbce_onboarding_start_requests"
        );

        expect(
          migration
        ).toContain(
          "idempotency_sha256 text PRIMARY KEY"
        );

        expect(
          migration
        ).toContain(
          "onboarding_id text NOT NULL"
        );

        expect(
          migration
        ).toContain(
          "subject_id text NOT NULL"
        );

        expect(
          migration
        ).toContain(
          "session_id text NOT NULL"
        );

        expect(
          migration
        ).toContain(
          "created_at timestamptz NOT NULL"
        );
      }
    );

    it(
      "requires the idempotency digest to be lowercase SHA-256 hexadecimal",
      () => {
        expect(
          migration
        ).toContain(
          "idempotency_sha256 ~ '^[0-9a-f]{64}$'"
        );
      }
    );

    it(
      "binds the start request to the canonical onboarding and subject",
      () => {
        expect(
          baseMigration
        ).toContain(
          "UNIQUE (onboarding_id, subject_id)"
        );

        expect(
          migration
        ).toMatch(
          /FOREIGN KEY\s*\(\s*onboarding_id,\s*subject_id\s*\)\s*REFERENCES hbce_onboardings\s*\(\s*onboarding_id,\s*subject_id\s*\)/s
        );
      }
    );

    it(
      "binds the start request to the exact session genealogy",
      () => {
        expect(
          sessionMigration
        ).toContain(
          "UNIQUE (session_id, onboarding_id, subject_id)"
        );

        expect(
          migration
        ).toMatch(
          /FOREIGN KEY\s*\(\s*session_id,\s*onboarding_id,\s*subject_id\s*\)\s*REFERENCES hbce_onboarding_sessions\s*\(\s*session_id,\s*onboarding_id,\s*subject_id\s*\)/s
        );
      }
    );

    it(
      "allows only one start request record for a session",
      () => {
        expect(
          migration
        ).toContain(
          "UNIQUE (session_id)"
        );
      }
    );

    it(
      "allows only one start request record for a canonical onboarding binding",
      () => {
        expect(
          migration
        ).toMatch(
          /UNIQUE\s*\(\s*onboarding_id,\s*subject_id\s*\)/s
        );
      }
    );

    it(
      "makes start request evidence append-only",
      () => {
        expect(
          baseMigration
        ).toContain(
          "CREATE FUNCTION hbce_reject_append_only_mutation()"
        );

        expect(
          migration
        ).toMatch(
          /CREATE TRIGGER hbce_onboarding_start_requests_append_only[\s\S]*BEFORE UPDATE OR DELETE ON hbce_onboarding_start_requests[\s\S]*EXECUTE FUNCTION hbce_reject_append_only_mutation\(\);/
        );
      }
    );

    it(
      "hardens canonical audit event hashes to lowercase SHA-256 hexadecimal",
      () => {
        expect(
          migration
        ).toContain(
          "event_hash ~ '^[0-9a-f]{64}$'"
        );

        expect(
          migration
        ).toContain(
          "event_payload_sha256 ~ '^[0-9a-f]{64}$'"
        );

        expect(
          migration
        ).toContain(
          "previous_event_hash ~ '^[0-9a-f]{64}$'"
        );
      }
    );

    it(
      "keeps genesis previous hash nullable",
      () => {
        expect(
          migration
        ).toMatch(
          /previous_event_hash IS NULL\s*OR previous_event_hash ~ '\^\[0-9a-f\]\{64\}\$'/s
        );
      }
    );

    it(
      "adds audit checks as NOT VALID before validating existing rows",
      () => {
        const notValidCount =
          migration.match(
            /\bNOT VALID;/g
          );

        expect(
          notValidCount
        ).toHaveLength(3);

        for (
          const constraint
          of [
            "hbce_audit_events_event_hash_format",
            "hbce_audit_events_payload_hash_format",
            "hbce_audit_events_previous_hash_format"
          ]
        ) {
          expect(
            migration
          ).toContain(
            `VALIDATE CONSTRAINT\n    ${constraint};`
          );
        }
      }
    );

    it(
      "fails closed on nonconforming existing audit rows by validating before commit",
      () => {
        const lastValidation =
          migration.lastIndexOf(
            "VALIDATE CONSTRAINT"
          );

        const commit =
          migration.lastIndexOf(
            "COMMIT;"
          );

        expect(
          lastValidation
        ).toBeGreaterThan(-1);

        expect(
          commit
        ).toBeGreaterThan(
          lastValidation
        );
      }
    );

    it(
      "does not store raw idempotency keys or onboarding PII",
      () => {
        expect(
          migration
        ).not.toMatch(
          /\braw_idempotency\b/i
        );

        expect(
          migration
        ).not.toMatch(
          /\bidempotency_key\s+text\b/i
        );

        expect(
          migration
        ).not.toMatch(
          /\bemail\s+text\b/i
        );

        expect(
          migration
        ).not.toMatch(
          /\bphone\s+text\b/i
        );

        expect(
          migration
        ).not.toMatch(
          /\bfirst_name\s+text\b/i
        );

        expect(
          migration
        ).not.toMatch(
          /\blast_name\s+text\b/i
        );

        expect(
          migration
        ).not.toMatch(
          /\bcountry\s+text\b/i
        );

        expect(
          migration
        ).not.toMatch(
          /\braw_token\b/i
        );
      }
    );

    it(
      "does not backfill or mutate canonical evidence",
      () => {
        expect(
          migration
        ).not.toMatch(
          /\bUPDATE\s+hbce_/i
        );

        expect(
          migration
        ).not.toMatch(
          /\bDELETE\s+FROM\s+hbce_/i
        );
      }
    );
  }
);
