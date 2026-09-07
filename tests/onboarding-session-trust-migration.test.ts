import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "db/migrations/0002_onboarding_session_trust.sql"
);

const baseMigrationPath = resolve(
  process.cwd(),
  "db/migrations/0001_onboarding_canonical_subject_state.sql"
);

const migration = readFileSync(migrationPath, "utf8");
const baseMigration = readFileSync(baseMigrationPath, "utf8");

describe("P003-D077 onboarding session trust migration", () => {
  it("records the three frozen predecessor design digests", () => {
    expect(migration).toContain(
      "128671705e783cf82e7e940f57936bc4fc2145ff49a841105fae9c6c7c13d74d"
    );

    expect(migration).toContain(
      "64bd71c77a56f4993fb935fd36d106003f12b2728060b4d5c9bb4b1f52d140d8"
    );

    expect(migration).toContain(
      "ba37aab67024e51d8d1b443294e7424fc7d39d462e65d6e28a7e363fe0043a3a"
    );
  });

  it("depends on the existing canonical onboarding binding", () => {
    expect(baseMigration).toContain(
      "UNIQUE (onboarding_id, subject_id)"
    );

    expect(migration).toMatch(
      /FOREIGN KEY\s*\(\s*onboarding_id,\s*subject_id\s*\)\s*REFERENCES hbce_onboardings\s*\(\s*onboarding_id,\s*subject_id\s*\)/s
    );
  });

  it("creates the append-only onboarding session relation", () => {
    expect(migration).toContain(
      "CREATE TABLE hbce_onboarding_sessions"
    );

    expect(migration).toContain(
      "session_id text PRIMARY KEY"
    );

    expect(migration).toContain(
      "onboarding_id text NOT NULL"
    );

    expect(migration).toContain(
      "subject_id text NOT NULL"
    );

    expect(migration).toContain(
      "issued_at timestamptz NOT NULL"
    );

    expect(migration).toContain(
      "absolute_expires_at timestamptz NOT NULL"
    );
  });

  it("stores only the SHA-256 digest of the opaque session token", () => {
    expect(migration).toContain(
      "token_sha256 text NOT NULL"
    );

    expect(migration).toContain(
      "UNIQUE (token_sha256)"
    );

    expect(migration).toContain(
      "token_sha256 ~ '^[0-9a-f]{64}$'"
    );

    expect(migration).not.toMatch(
      /\braw_token\b/i
    );

    expect(migration).not.toMatch(
      /\bsession_token\s+text\b/i
    );
  });

  it("allows only STARTED and CONTACT_VERIFIED issuance states", () => {
    expect(migration).toMatch(
      /issued_state IN\s*\(\s*'STARTED',\s*'CONTACT_VERIFIED'\s*\)/s
    );
  });

  it("requires CONTACT_VERIFIED sessions to rotate from a prior bound session", () => {
    expect(migration).toContain(
      "rotated_from_session_id text"
    );

    expect(migration).toMatch(
      /issued_state = 'STARTED'\s*AND rotated_from_session_id IS NULL/s
    );

    expect(migration).toMatch(
      /issued_state = 'CONTACT_VERIFIED'\s*AND rotated_from_session_id IS NOT NULL/s
    );

    expect(migration).toMatch(
      /FOREIGN KEY\s*\(\s*rotated_from_session_id,\s*onboarding_id,\s*subject_id\s*\)\s*REFERENCES hbce_onboarding_sessions/s
    );
  });

  it("prohibits a session from rotating from itself", () => {
    expect(migration).toContain(
      "rotated_from_session_id <> session_id"
    );
  });

  it("creates the append-only session event relation", () => {
    expect(migration).toContain(
      "CREATE TABLE hbce_onboarding_session_events"
    );

    expect(migration).toContain(
      "event_seq bigint NOT NULL"
    );

    expect(migration).toContain(
      "previous_event_hash text"
    );

    expect(migration).toContain(
      "event_hash text NOT NULL"
    );

    expect(migration).toContain(
      "event_payload_sha256 text NOT NULL"
    );

    expect(migration).toContain(
      "UNIQUE (session_id, event_seq)"
    );

    expect(migration).toContain(
      "UNIQUE (event_hash)"
    );
  });

  it("freezes the allowed session event vocabulary", () => {
    for (const eventType of [
      "SESSION_CREATED",
      "EMAIL_VERIFIED",
      "PHONE_VERIFIED",
      "CONTACT_VERIFIED",
      "SESSION_ACTIVITY",
      "SESSION_ROTATED",
      "SESSION_REVOKED",
      "SESSION_EXPIRED"
    ]) {
      expect(migration).toContain(`'${eventType}'`);
    }
  });

  it("requires sequence zero to be SESSION_CREATED with no predecessor", () => {
    expect(migration).toMatch(
      /event_seq = 0\s*AND event_type = 'SESSION_CREATED'\s*AND previous_event_hash IS NULL/s
    );
  });

  it("requires later events to carry a same-session predecessor hash", () => {
    expect(migration).toMatch(
      /event_seq > 0[\s\S]*previous_event_hash IS NOT NULL/
    );

    expect(migration).toMatch(
      /FOREIGN KEY\s*\(\s*session_id,\s*previous_event_hash\s*\)\s*REFERENCES hbce_onboarding_session_events\s*\(\s*session_id,\s*event_hash\s*\)/s
    );
  });

  it("reuses the canonical append-only mutation rejection function", () => {
    expect(baseMigration).toContain(
      "CREATE FUNCTION hbce_reject_append_only_mutation()"
    );

    expect(migration).toMatch(
      /CREATE TRIGGER hbce_onboarding_sessions_append_only[\s\S]*BEFORE UPDATE OR DELETE ON hbce_onboarding_sessions/
    );

    expect(migration).toMatch(
      /CREATE TRIGGER hbce_onboarding_session_events_append_only[\s\S]*BEFORE UPDATE OR DELETE ON hbce_onboarding_session_events/
    );

    const executions = migration.match(
      /EXECUTE FUNCTION hbce_reject_append_only_mutation\(\);/g
    );

    expect(executions).toHaveLength(2);
  });

  it("does not place contact or document data in session storage", () => {
    expect(migration).not.toMatch(
      /\bemail\b/i
    );

    expect(migration).not.toMatch(
      /\bphone\b/i
    );

    expect(migration).not.toMatch(
      /\bfirst_name\b/i
    );

    expect(migration).not.toMatch(
      /\blast_name\b/i
    );

    expect(migration).not.toMatch(
      /\bdocument_number\b/i
    );
  });

  it("requires cryptographic session event fields to use lowercase SHA-256 hexadecimal form", () => {
    expect(migration).toContain(
      "event_hash ~ '^[0-9a-f]{64}$'"
    );

    expect(migration).toContain(
      "event_payload_sha256 ~ '^[0-9a-f]{64}$'"
    );

    expect(migration).toContain(
      "previous_event_hash ~ '^[0-9a-f]{64}$'"
    );
  });

});
