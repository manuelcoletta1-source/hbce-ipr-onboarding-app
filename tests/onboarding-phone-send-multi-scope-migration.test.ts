import {
  readFileSync
} from "node:fs";

import {
  describe,
  expect,
  it
} from "vitest";

const migration =
  readFileSync(
    "db/migrations/0005_phone_send_multi_scope_atomicity.sql",
    "utf8"
  );

describe(
  "HBCE PHONE SEND multi-scope atomicity migration",
  () => {
    it("records the canonical design digest", () => {
      expect(migration).toContain(
        "ecad0d1ed8add7be806c3f884c591a35392db82ec04bd944b1ad32ba1c151868"
      );
    });

    it("changes the request count floor to zero", () => {
      expect(migration).toMatch(
        /request_count\s*>=\s*0/
      );

      expect(migration).not.toMatch(
        /request_count\s*>=\s*1/
      );
    });

    it("restricts zero to an expired neutral row", () => {
      expect(migration).toMatch(
        /request_count\s*>\s*0[\s\S]*OR[\s\S]*expires_at\s*<=\s*updated_at/
      );
    });

    it("does not create another table", () => {
      expect(migration).not.toMatch(
        /CREATE\s+TABLE/i
      );
    });

    it("does not introduce advisory locking", () => {
      expect(migration).not.toMatch(
        /pg_advisory/i
      );
    });

    it("contains no raw contact authority columns", () => {
      expect(migration).not.toMatch(
        /\bphone_number\b/i
      );

      expect(migration).not.toMatch(
        /\bchallenge_token\b/i
      );

      expect(migration).not.toMatch(
        /\bsession_token\b/i
      );
    });
  }
);
