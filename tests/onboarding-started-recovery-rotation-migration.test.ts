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

const baseMigration =
  readFileSync(
    resolve(
      process.cwd(),
      "db/migrations/0002_onboarding_session_trust.sql"
    ),
    "utf8"
  );

const migration =
  readFileSync(
    resolve(
      process.cwd(),
      "db/migrations/0006_onboarding_started_recovery_rotation.sql"
    ),
    "utf8"
  );

function normalizeSql(
  sql: string
): string {
  return sql
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

const base =
  normalizeSql(
    baseMigration
  );

const evolved =
  normalizeSql(
    migration
  );

describe(
  "HBCE STARTED recovery rotation schema evolution",
  () => {
    it(
      "is one forward-only migration transaction",
      () => {
        const lines =
          migration
            .split(/\r?\n/)
            .map(
              line =>
                line.trim()
            );

        expect(
          lines.filter(
            line =>
              line === "BEGIN;"
          )
        ).toHaveLength(
          1
        );

        expect(
          lines.filter(
            line =>
              line === "COMMIT;"
          )
        ).toHaveLength(
          1
        );

        expect(
          evolved.includes(
            "ROLLBACK"
          )
        ).toBe(
          false
        );
      }
    );

    it(
      "replaces only the historical rotation-shape constraint",
      () => {
        expect(
          evolved
        ).toContain(
          "ALTER TABLE hbce_onboarding_sessions DROP CONSTRAINT hbce_onboarding_sessions_rotation_shape;"
        );

        expect(
          evolved
        ).toContain(
          "ALTER TABLE hbce_onboarding_sessions ADD CONSTRAINT hbce_onboarding_sessions_rotation_shape"
        );

        expect(
          evolved
            .split(
              "DROP CONSTRAINT"
            )
            .length - 1
        ).toBe(
          1
        );

        expect(
          evolved
            .split(
              "ADD CONSTRAINT"
            )
            .length - 1
        ).toBe(
          1
        );
      }
    );

    it(
      "allows a root STARTED session with no rotation parent",
      () => {
        expect(
          evolved
        ).toContain(
          "CHECK ( issued_state = 'STARTED' OR"
        );

        expect(
          evolved
        ).not.toContain(
          "issued_state = 'STARTED' AND rotated_from_session_id IS NULL"
        );
      }
    );

    it(
      "allows a recovery STARTED session with a bound rotation parent",
      () => {
        expect(
          evolved
        ).toContain(
          "issued_state = 'STARTED' OR"
        );

        expect(
          evolved
        ).not.toContain(
          "issued_state = 'STARTED' AND rotated_from_session_id"
        );
      }
    );

    it(
      "still requires CONTACT_VERIFIED sessions to have a rotation parent",
      () => {
        expect(
          evolved
        ).toContain(
          "issued_state = 'CONTACT_VERIFIED' AND rotated_from_session_id IS NOT NULL"
        );
      }
    );

    it(
      "does not alter the same-subject and same-onboarding parent binding foreign key",
      () => {
        expect(
          base
        ).toContain(
          "FOREIGN KEY ( rotated_from_session_id, onboarding_id, subject_id ) REFERENCES hbce_onboarding_sessions( session_id, onboarding_id, subject_id )"
        );

        expect(
          evolved
        ).not.toContain(
          "hbce_onboarding_sessions_rotation_binding_fk"
        );
      }
    );

    it(
      "does not alter the self-rotation prohibition",
      () => {
        expect(
          base
        ).toContain(
          "rotated_from_session_id IS NULL OR rotated_from_session_id <> session_id"
        );

        expect(
          evolved
        ).not.toContain(
          "hbce_onboarding_sessions_no_self_rotation"
        );
      }
    );

    it(
      "does not alter append-only enforcement or session evidence",
      () => {
        expect(
          base
        ).toContain(
          "CREATE TRIGGER hbce_onboarding_sessions_append_only BEFORE UPDATE OR DELETE ON hbce_onboarding_sessions"
        );

        expect(
          base
        ).toContain(
          "CREATE TRIGGER hbce_onboarding_session_events_append_only BEFORE UPDATE OR DELETE ON hbce_onboarding_session_events"
        );

        expect(
          evolved
        ).not.toContain(
          "INSERT INTO"
        );

        expect(
          evolved
        ).not.toContain(
          "UPDATE hbce_"
        );

        expect(
          evolved
        ).not.toContain(
          "DELETE FROM"
        );

        expect(
          evolved
        ).not.toContain(
          "TRUNCATE"
        );

        expect(
          evolved
        ).not.toContain(
          "DROP TRIGGER"
        );

        expect(
          evolved
        ).not.toContain(
          "ALTER TRIGGER"
        );
      }
    );
  }
);
