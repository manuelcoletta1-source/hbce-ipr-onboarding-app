import {
  describe,
  expect,
  it
} from "vitest";
import {
  readFileSync
} from "node:fs";
import {
  resolve
} from "node:path";

const MIGRATION_PATH =
  "db/migrations/0004_phone_abuse_control.sql";

const migration = readFileSync(
  resolve(process.cwd(), MIGRATION_PATH),
  "utf8"
);

describe(
  "HBCE phone abuse-control migration",
  () => {
    it(
      "records the canonical durable persistence design digest",
      () => {
        expect(migration).toContain(
          "DESIGN_SHA256=4b16b5bd1df0f9bf7382ada75ff40b233cc2b2e23ef80a6ffc6f05eab8c3041b"
        );
      }
    );

    it(
      "creates the exact three-scope rate-window table",
      () => {
        expect(migration).toContain(
          "CREATE TABLE hbce_phone_rate_limit_windows"
        );

        expect(migration).toContain(
          "PRIMARY KEY (scope, key_digest)"
        );

        for (
          const scope of [
            "SEND_SESSION",
            "SEND_PHONE",
            "VERIFY_SESSION"
          ]
        ) {
          expect(migration).toContain(
            `'${scope}'`
          );
        }
      }
    );

    it(
      "requires lowercase SHA-256 rate-limit keys",
      () => {
        expect(migration).toMatch(
          /hbce_phone_rate_limit_windows_key_digest_format[\s\S]*key_digest ~ '\^\[0-9a-f\]\{64\}\$'/
        );
      }
    );

    it(
      "creates challenge usage with canonical session binding",
      () => {
        expect(migration).toContain(
          "CREATE TABLE hbce_phone_challenge_usage"
        );

        expect(migration).toContain(
          "challenge_digest text PRIMARY KEY"
        );

        expect(migration).toMatch(
          /FOREIGN KEY \(session_id\)[\s\S]*REFERENCES hbce_onboarding_sessions\(session_id\)/
        );
      }
    );

    it(
      "freezes challenge attempts to the zero through five range",
      () => {
        expect(migration).toContain(
          "attempt_count BETWEEN 0 AND 5"
        );
      }
    );

    it(
      "permits one-time consumption state without making operational tables append-only",
      () => {
        expect(migration).toContain(
          "consumed_at timestamptz"
        );

        expect(migration).not.toMatch(
          /hbce_phone_rate_limit_windows_append_only/
        );

        expect(migration).not.toMatch(
          /hbce_phone_challenge_usage_append_only/
        );
      }
    );

    it(
      "contains no raw phone, OTP, challenge-token or session-token columns",
      () => {
        const normalized =
          migration.toLowerCase();

        expect(normalized).not.toContain(
          "phone_number"
        );

        expect(normalized).not.toContain(
          "otp_code"
        );

        expect(normalized).not.toContain(
          "challenge_token"
        );

        expect(normalized).not.toContain(
          "session_token"
        );
      }
    );

    it(
      "indexes expiry and challenge session lookup surfaces",
      () => {
        expect(migration).toContain(
          "CREATE INDEX hbce_phone_rate_limit_windows_expiry_idx"
        );

        expect(migration).toContain(
          "CREATE INDEX hbce_phone_challenge_usage_expiry_idx"
        );

        expect(migration).toContain(
          "CREATE INDEX hbce_phone_challenge_usage_session_idx"
        );
      }
    );

    it(
      "makes cleanup non-normative by expressing expiry in stored state",
      () => {
        expect(migration).toContain(
          "expires_at timestamptz NOT NULL"
        );

        expect(migration).toContain(
          "Expiry semantics never depend on physical cleanup having occurred."
        );
      }
    );
  }
);
