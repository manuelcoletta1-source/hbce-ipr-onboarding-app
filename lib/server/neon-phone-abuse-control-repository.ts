import {
  neon
} from "@neondatabase/serverless";

import {
  PHONE_SEND_PHONE_LIMIT,
  PHONE_SEND_SESSION_LIMIT
} from "./onboarding-phone-abuse-control";

export const PHONE_ABUSE_CONTROL_DURABLE_PERSISTENCE_DESIGN_SHA256 =
  "4b16b5bd1df0f9bf7382ada75ff40b233cc2b2e23ef80a6ffc6f05eab8c3041b";

export const PHONE_ABUSE_CONTROL_WINDOW_SECONDS =
  600;

export const PHONE_CHALLENGE_ATTEMPT_LIMIT =
  5;

export type PhoneRateLimitScope =
  | "SEND_SESSION"
  | "SEND_PHONE"
  | "VERIFY_SESSION";

export type PhoneAbuseControlQueryRow =
  Record<string, unknown>;

export type PhoneAbuseControlQueryExecutor = (
  query: string,
  parameters: readonly unknown[]
) => Promise<
  readonly PhoneAbuseControlQueryRow[]
>;

export type PhoneAbuseControlTransactionStatement = {
  readonly query: string;
  readonly parameters: readonly unknown[];
};

export type PhoneAbuseControlTransactionOptions = {
  readonly isolationLevel: "ReadCommitted";
  readonly readOnly: false;
};

export type PhoneAbuseControlTransactionExecutor = (
  statements:
    readonly PhoneAbuseControlTransactionStatement[],
  options:
    PhoneAbuseControlTransactionOptions
) => Promise<
  readonly (
    readonly PhoneAbuseControlQueryRow[]
  )[]
>;

export type ConsumePhoneRateWindowInput = {
  readonly scope: PhoneRateLimitScope;
  readonly keyDigest: string;
  readonly now: string;
  readonly limit: number;
};

export type ConsumePhoneRateWindowResult =
  | {
      readonly status: "ALLOWED";
      readonly requestCount: number;
      readonly windowStartedAt: string;
      readonly expiresAt: string;
    }
  | {
      readonly status: "RATE_LIMITED";
      readonly retryAfterSeconds: number;
    };

export type ConsumePhoneSendRateWindowsInput = {
  readonly sessionKeyDigest: string;
  readonly phoneKeyDigest: string;
  readonly now: string;
};

export type ConsumePhoneSendRateWindowsResult =
  | {
      readonly status: "ALLOWED";
    }
  | {
      readonly status: "RATE_LIMITED";
      readonly retryAfterSeconds: number;
    };

export type RecordPhoneChallengeAttemptInput = {
  readonly challengeDigest: string;
  readonly sessionId: string;
  readonly phoneKeyDigest: string;
  readonly expiresAt: string;
  readonly now: string;
};

export type RecordPhoneChallengeAttemptResult =
  | {
      readonly status: "ATTEMPT_RECORDED";
      readonly attemptCount: number;
      readonly expiresAt: string;
    }
  | {
      readonly status: "ATTEMPT_LIMITED";
      readonly retryAfterSeconds: number;
    }
  | {
      readonly status: "CHALLENGE_CONSUMED";
    }
  | {
      readonly status: "CHALLENGE_EXPIRED";
    }
  | {
      readonly status: "CHALLENGE_BINDING_MISMATCH";
    };

export type ConsumePhoneChallengeSuccessInput = {
  readonly challengeDigest: string;
  readonly sessionId: string;
  readonly phoneKeyDigest: string;
  readonly expiresAt: string;
  readonly now: string;
};

export type ConsumePhoneChallengeSuccessResult =
  | {
      readonly status: "CONSUMED";
      readonly consumedAt: string;
    }
  | {
      readonly status: "DENIED";
    };

export interface PhoneAbuseControlRepository {
  consumeRateWindow(
    input: ConsumePhoneRateWindowInput
  ): Promise<ConsumePhoneRateWindowResult>;

  consumeSendRateWindows(
    input:
      ConsumePhoneSendRateWindowsInput
  ): Promise<
    ConsumePhoneSendRateWindowsResult
  >;

  recordChallengeAttempt(
    input: RecordPhoneChallengeAttemptInput
  ): Promise<RecordPhoneChallengeAttemptResult>;

  consumeChallengeSuccess(
    input: ConsumePhoneChallengeSuccessInput
  ): Promise<ConsumePhoneChallengeSuccessResult>;
}

export type NeonPhoneAbuseControlRepositoryErrorCode =
  | "DATABASE_URL_MISSING"
  | "INVALID_INPUT"
  | "DATABASE_FAILURE"
  | "INVALID_DATABASE_RESULT";

export class NeonPhoneAbuseControlRepositoryError
  extends Error
{
  readonly code:
    NeonPhoneAbuseControlRepositoryErrorCode;

  constructor(
    code:
      NeonPhoneAbuseControlRepositoryErrorCode,
    message: string
  ) {
    super(message);
    this.name =
      "NeonPhoneAbuseControlRepositoryError";
    this.code = code;
  }
}

const CONSUME_RATE_WINDOW_SQL = `
INSERT INTO hbce_phone_rate_limit_windows (
  scope,
  key_digest,
  window_started_at,
  expires_at,
  request_count,
  created_at,
  updated_at
)
VALUES (
  $1,
  $2,
  $3::timestamptz,
  $4::timestamptz,
  1,
  $3::timestamptz,
  $3::timestamptz
)
ON CONFLICT (scope, key_digest)
DO UPDATE SET
  window_started_at =
    CASE
      WHEN hbce_phone_rate_limit_windows.expires_at
           <= $3::timestamptz
      THEN $3::timestamptz
      ELSE hbce_phone_rate_limit_windows.window_started_at
    END,
  expires_at =
    CASE
      WHEN hbce_phone_rate_limit_windows.expires_at
           <= $3::timestamptz
      THEN $4::timestamptz
      ELSE hbce_phone_rate_limit_windows.expires_at
    END,
  request_count =
    CASE
      WHEN hbce_phone_rate_limit_windows.expires_at
           <= $3::timestamptz
      THEN 1
      ELSE hbce_phone_rate_limit_windows.request_count + 1
    END,
  updated_at = $3::timestamptz
WHERE
  hbce_phone_rate_limit_windows.expires_at
    <= $3::timestamptz
  OR hbce_phone_rate_limit_windows.request_count
    < $5
RETURNING
  scope,
  key_digest,
  window_started_at,
  expires_at,
  request_count
`;

const READ_RATE_WINDOW_SQL = `
SELECT
  scope,
  key_digest,
  window_started_at,
  expires_at,
  request_count
FROM hbce_phone_rate_limit_windows
WHERE scope = $1
  AND key_digest = $2
`;

const INSERT_SEND_SESSION_NEUTRAL_SQL = `
INSERT INTO hbce_phone_rate_limit_windows (
  scope,
  key_digest,
  window_started_at,
  expires_at,
  request_count,
  created_at,
  updated_at
)
VALUES (
  'SEND_SESSION',
  $1,
  $2::timestamptz,
  $3::timestamptz,
  0,
  $3::timestamptz,
  $3::timestamptz
)
ON CONFLICT (scope, key_digest)
DO NOTHING
RETURNING
  scope,
  key_digest
`;

const INSERT_SEND_PHONE_NEUTRAL_SQL = `
INSERT INTO hbce_phone_rate_limit_windows (
  scope,
  key_digest,
  window_started_at,
  expires_at,
  request_count,
  created_at,
  updated_at
)
VALUES (
  'SEND_PHONE',
  $1,
  $2::timestamptz,
  $3::timestamptz,
  0,
  $3::timestamptz,
  $3::timestamptz
)
ON CONFLICT (scope, key_digest)
DO NOTHING
RETURNING
  scope,
  key_digest
`;

const LOCK_SEND_SESSION_WINDOW_SQL = `
SELECT
  scope,
  key_digest
FROM hbce_phone_rate_limit_windows
WHERE scope = 'SEND_SESSION'
  AND key_digest = $1
FOR UPDATE
`;

const LOCK_SEND_PHONE_WINDOW_SQL = `
SELECT
  scope,
  key_digest
FROM hbce_phone_rate_limit_windows
WHERE scope = 'SEND_PHONE'
  AND key_digest = $1
FOR UPDATE
`;

const UPDATE_SEND_PAIR_SQL = `
WITH pair_state AS (
  SELECT
    count(*) AS pair_count,
    bool_and(
      expires_at <= $3::timestamptz
      OR (
        scope = 'SEND_SESSION'
        AND request_count < $5
      )
      OR (
        scope = 'SEND_PHONE'
        AND request_count < $6
      )
    ) AS pair_eligible
  FROM hbce_phone_rate_limit_windows
  WHERE (
    scope = 'SEND_SESSION'
    AND key_digest = $1
  )
  OR (
    scope = 'SEND_PHONE'
    AND key_digest = $2
  )
),
eligible_pair AS (
  SELECT 1
  FROM pair_state
  WHERE pair_count = 2
    AND pair_eligible
)
UPDATE hbce_phone_rate_limit_windows AS target
SET
  window_started_at =
    CASE
      WHEN target.expires_at <= $3::timestamptz
        THEN $3::timestamptz
      ELSE target.window_started_at
    END,
  expires_at =
    CASE
      WHEN target.expires_at <= $3::timestamptz
        THEN $4::timestamptz
      ELSE target.expires_at
    END,
  request_count =
    CASE
      WHEN target.expires_at <= $3::timestamptz
        THEN 1
      ELSE target.request_count + 1
    END,
  updated_at =
    $3::timestamptz
FROM eligible_pair
WHERE (
  target.scope = 'SEND_SESSION'
  AND target.key_digest = $1
)
OR (
  target.scope = 'SEND_PHONE'
  AND target.key_digest = $2
)
RETURNING
  target.scope,
  target.key_digest,
  target.window_started_at,
  target.expires_at,
  target.request_count
`;

const READ_SEND_PAIR_SQL = `
SELECT
  scope,
  key_digest,
  window_started_at,
  expires_at,
  request_count
FROM hbce_phone_rate_limit_windows
WHERE (
  scope = 'SEND_SESSION'
  AND key_digest = $1
)
OR (
  scope = 'SEND_PHONE'
  AND key_digest = $2
)
ORDER BY scope ASC
`;

const RECORD_CHALLENGE_ATTEMPT_SQL = `
INSERT INTO hbce_phone_challenge_usage (
  challenge_digest,
  session_id,
  phone_key_digest,
  expires_at,
  attempt_count,
  consumed_at,
  created_at,
  updated_at
)
VALUES (
  $1,
  $2,
  $3,
  $4::timestamptz,
  1,
  NULL,
  $5::timestamptz,
  $5::timestamptz
)
ON CONFLICT (challenge_digest)
DO UPDATE SET
  attempt_count =
    hbce_phone_challenge_usage.attempt_count + 1,
  updated_at =
    $5::timestamptz
WHERE
  hbce_phone_challenge_usage.session_id = $2
  AND hbce_phone_challenge_usage.phone_key_digest = $3
  AND hbce_phone_challenge_usage.expires_at = $4::timestamptz
  AND hbce_phone_challenge_usage.expires_at > $5::timestamptz
  AND hbce_phone_challenge_usage.consumed_at IS NULL
  AND hbce_phone_challenge_usage.attempt_count < 5
RETURNING
  challenge_digest,
  session_id,
  phone_key_digest,
  expires_at,
  attempt_count,
  consumed_at
`;

const READ_CHALLENGE_USAGE_SQL = `
SELECT
  challenge_digest,
  session_id,
  phone_key_digest,
  expires_at,
  attempt_count,
  consumed_at
FROM hbce_phone_challenge_usage
WHERE challenge_digest = $1
`;

const CONSUME_CHALLENGE_SUCCESS_SQL = `
UPDATE hbce_phone_challenge_usage
SET
  consumed_at = $5::timestamptz,
  updated_at = $5::timestamptz
WHERE challenge_digest = $1
  AND session_id = $2
  AND phone_key_digest = $3
  AND expires_at = $4::timestamptz
  AND expires_at > $5::timestamptz
  AND consumed_at IS NULL
  AND attempt_count BETWEEN 1 AND 5
RETURNING
  challenge_digest,
  consumed_at
`;

const SHA256_HEX_PATTERN =
  /^[0-9a-f]{64}$/;

const RATE_SCOPES =
  new Set<PhoneRateLimitScope>([
    "SEND_SESSION",
    "SEND_PHONE",
    "VERIFY_SESSION"
  ]);

function invalidInput(
  message: string
): never {
  throw new NeonPhoneAbuseControlRepositoryError(
    "INVALID_INPUT",
    message
  );
}

function requireDigest(
  value: string,
  name: string
): string {
  if (!SHA256_HEX_PATTERN.test(value)) {
    invalidInput(
      `${name} must be a lowercase SHA-256 hexadecimal digest.`
    );
  }

  return value;
}

function requireSessionId(
  value: string
): string {
  const normalized =
    value.trim();

  if (normalized.length === 0) {
    invalidInput(
      "sessionId must be a non-empty canonical server session identifier."
    );
  }

  return normalized;
}

function requireCanonicalIso(
  value: string,
  name: string
): {
  readonly iso: string;
  readonly milliseconds: number;
} {
  const parsed =
    new Date(value);

  const milliseconds =
    parsed.getTime();

  if (
    !Number.isFinite(milliseconds) ||
    parsed.toISOString() !== value
  ) {
    invalidInput(
      `${name} must be canonical ISO-8601 UTC.`
    );
  }

  return {
    iso: value,
    milliseconds
  };
}

function requireLimit(
  value: number
): number {
  if (
    !Number.isInteger(value) ||
    value < 1
  ) {
    invalidInput(
      "limit must be a positive integer."
    );
  }

  return value;
}

function requireRateScope(
  value: PhoneRateLimitScope
): PhoneRateLimitScope {
  if (!RATE_SCOPES.has(value)) {
    invalidInput(
      "scope is not a supported PHONE rate-limit scope."
    );
  }

  return value;
}

function readInteger(
  value: unknown,
  name: string
): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" &&
          /^[0-9]+$/.test(value)
        ? Number(value)
        : Number.NaN;

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 0
  ) {
    throw new NeonPhoneAbuseControlRepositoryError(
      "INVALID_DATABASE_RESULT",
      `Neon returned invalid ${name}.`
    );
  }

  return parsed;
}

function readString(
  value: unknown,
  name: string
): string {
  if (
    typeof value !== "string" ||
    value.length === 0
  ) {
    throw new NeonPhoneAbuseControlRepositoryError(
      "INVALID_DATABASE_RESULT",
      `Neon returned invalid ${name}.`
    );
  }

  return value;
}

function readIso(
  value: unknown,
  name: string
): string {
  const parsed =
    value instanceof Date
      ? value
      : typeof value === "string"
        ? new Date(value)
        : null;

  if (
    !parsed ||
    !Number.isFinite(parsed.getTime())
  ) {
    throw new NeonPhoneAbuseControlRepositoryError(
      "INVALID_DATABASE_RESULT",
      `Neon returned invalid ${name}.`
    );
  }

  return parsed.toISOString();
}

function readNullableIso(
  value: unknown,
  name: string
): string | null {
  if (value === null) {
    return null;
  }

  return readIso(
    value,
    name
  );
}

function retryAfterSeconds(
  nowMilliseconds: number,
  expiresAtIso: string
): number {
  const expiresAtMilliseconds =
    new Date(expiresAtIso).getTime();

  if (!Number.isFinite(expiresAtMilliseconds)) {
    throw new NeonPhoneAbuseControlRepositoryError(
      "INVALID_DATABASE_RESULT",
      "Neon returned an invalid expiry boundary."
    );
  }

  return Math.max(
    1,
    Math.ceil(
      (
        expiresAtMilliseconds -
        nowMilliseconds
      ) / 1000
    )
  );
}

function mapDatabaseFailure(
  error: unknown
): never {
  if (
    error instanceof
      NeonPhoneAbuseControlRepositoryError
  ) {
    throw error;
  }

  throw new NeonPhoneAbuseControlRepositoryError(
    "DATABASE_FAILURE",
    "PHONE abuse-control persistence failed."
  );
}

let defaultExecutor:
  PhoneAbuseControlQueryExecutor | null =
  null;

function getDefaultExecutor():
  PhoneAbuseControlQueryExecutor {
  if (defaultExecutor) {
    return defaultExecutor;
  }

  const connectionString =
    process.env.DATABASE_URL;

  if (!connectionString) {
    throw new NeonPhoneAbuseControlRepositoryError(
      "DATABASE_URL_MISSING",
      "DATABASE_URL is required when PHONE abuse-control persistence is first used."
    );
  }

  const sql =
    neon(connectionString);

  defaultExecutor =
    async (
      query,
      parameters
    ) => {
      const rows =
        await sql.query(
          query,
          [...parameters]
        );

      return rows as readonly
        PhoneAbuseControlQueryRow[];
    };

  return defaultExecutor;
}

let defaultTransactionExecutor:
  PhoneAbuseControlTransactionExecutor | null =
    null;

function getDefaultTransactionExecutor():
  PhoneAbuseControlTransactionExecutor {
  if (defaultTransactionExecutor) {
    return defaultTransactionExecutor;
  }

  const connectionString =
    process.env.DATABASE_URL;

  if (!connectionString) {
    throw new NeonPhoneAbuseControlRepositoryError(
      "DATABASE_URL_MISSING",
      "DATABASE_URL is required when PHONE abuse-control transaction persistence is first used."
    );
  }

  const sql =
    neon(connectionString);

  defaultTransactionExecutor =
    async (
      statements,
      options
    ) => {
      const results =
        await sql.transaction(
          (transaction) =>
            statements.map(
              (statement) =>
                transaction.query(
                  statement.query,
                  [
                    ...statement.parameters
                  ]
                )
            ),
          {
            isolationLevel:
              options.isolationLevel,
            readOnly:
              options.readOnly
          }
        );

      return results as unknown as readonly (
        readonly PhoneAbuseControlQueryRow[]
      )[];
    };

  return defaultTransactionExecutor;
}

function requireSendPairDigest(
  value: string,
  name: string
): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{64}$/.test(value)
  ) {
    throw new NeonPhoneAbuseControlRepositoryError(
      "INVALID_INPUT",
      `${name} must be a lowercase SHA-256 hexadecimal digest.`
    );
  }

  return value;
}

function requireSendPairNow(
  value: string
): {
  readonly iso: string;
  readonly milliseconds: number;
} {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value !== value.trim()
  ) {
    throw new NeonPhoneAbuseControlRepositoryError(
      "INVALID_INPUT",
      "now must be canonical ISO-8601 UTC."
    );
  }

  const parsed =
    new Date(value);

  const milliseconds =
    parsed.getTime();

  if (
    !Number.isFinite(milliseconds) ||
    parsed.toISOString() !== value
  ) {
    throw new NeonPhoneAbuseControlRepositoryError(
      "INVALID_INPUT",
      "now must be canonical ISO-8601 UTC."
    );
  }

  return {
    iso: value,
    milliseconds
  };
}

function assertSendLockRow(
  rows:
    readonly PhoneAbuseControlQueryRow[],
  expectedScope:
    "SEND_SESSION" | "SEND_PHONE",
  expectedDigest: string
): void {
  if (rows.length !== 1) {
    throw new NeonPhoneAbuseControlRepositoryError(
      "INVALID_DATABASE_RESULT",
      "Neon did not return exactly one locked PHONE SEND rate-window row."
    );
  }

  const row =
    rows[0];

  if (!row) {
    throw new NeonPhoneAbuseControlRepositoryError(
      "INVALID_DATABASE_RESULT",
      "Neon returned an empty PHONE SEND lock row."
    );
  }

  const scope =
    readString(
      row.scope,
      "PHONE SEND lock scope"
    );

  const keyDigest =
    readString(
      row.key_digest,
      "PHONE SEND lock digest"
    );

  if (
    scope !== expectedScope ||
    keyDigest !== expectedDigest
  ) {
    throw new NeonPhoneAbuseControlRepositoryError(
      "INVALID_DATABASE_RESULT",
      "Neon returned a mismatching PHONE SEND lock binding."
    );
  }
}

type PhoneSendRateWindowState = {
  readonly scope:
    "SEND_SESSION" | "SEND_PHONE";
  readonly keyDigest: string;
  readonly expiresAt: string;
  readonly requestCount: number;
};

function parseSendPairRows(
  rows:
    readonly PhoneAbuseControlQueryRow[],
  sessionKeyDigest: string,
  phoneKeyDigest: string
): {
  readonly session:
    PhoneSendRateWindowState;
  readonly phone:
    PhoneSendRateWindowState;
} {
  if (rows.length !== 2) {
    throw new NeonPhoneAbuseControlRepositoryError(
      "INVALID_DATABASE_RESULT",
      "Neon did not return the exact PHONE SEND rate-window pair."
    );
  }

  let session:
    PhoneSendRateWindowState | null =
      null;

  let phone:
    PhoneSendRateWindowState | null =
      null;

  for (const row of rows) {
    const scope =
      readString(
        row.scope,
        "PHONE SEND rate-window scope"
      );

    const keyDigest =
      readString(
        row.key_digest,
        "PHONE SEND rate-window digest"
      );

    const expiresAt =
      readIso(
        row.expires_at,
        "PHONE SEND rate-window expiry"
      );

    const requestCount =
      readInteger(
        row.request_count,
        "PHONE SEND rate-window request count"
      );

    if (scope === "SEND_SESSION") {
      if (
        session ||
        keyDigest !== sessionKeyDigest
      ) {
        throw new NeonPhoneAbuseControlRepositoryError(
          "INVALID_DATABASE_RESULT",
          "Neon returned an invalid PHONE SEND session-window binding."
        );
      }

      session = {
        scope,
        keyDigest,
        expiresAt,
        requestCount
      };

      continue;
    }

    if (scope === "SEND_PHONE") {
      if (
        phone ||
        keyDigest !== phoneKeyDigest
      ) {
        throw new NeonPhoneAbuseControlRepositoryError(
          "INVALID_DATABASE_RESULT",
          "Neon returned an invalid PHONE SEND phone-window binding."
        );
      }

      phone = {
        scope,
        keyDigest,
        expiresAt,
        requestCount
      };

      continue;
    }

    throw new NeonPhoneAbuseControlRepositoryError(
      "INVALID_DATABASE_RESULT",
      "Neon returned an unsupported PHONE SEND rate-window scope."
    );
  }

  if (!session || !phone) {
    throw new NeonPhoneAbuseControlRepositoryError(
      "INVALID_DATABASE_RESULT",
      "Neon did not return both PHONE SEND rate-window scopes."
    );
  }

  return {
    session,
    phone
  };
}

export class NeonPhoneAbuseControlRepository
  implements PhoneAbuseControlRepository
{
  private readonly executor:
    PhoneAbuseControlQueryExecutor;

  private readonly transactionExecutor:
    PhoneAbuseControlTransactionExecutor;

  constructor(
    executor:
      PhoneAbuseControlQueryExecutor =
        (...args) =>
          getDefaultExecutor()(...args),
    transactionExecutor:
      PhoneAbuseControlTransactionExecutor =
        (...args) =>
          getDefaultTransactionExecutor()(
            ...args
          )
  ) {
    this.executor = executor;

    this.transactionExecutor =
      transactionExecutor;
  }

  async consumeRateWindow(
    input: ConsumePhoneRateWindowInput
  ): Promise<ConsumePhoneRateWindowResult> {
    const scope =
      requireRateScope(input.scope);

    const keyDigest =
      requireDigest(
        input.keyDigest,
        "keyDigest"
      );

    const now =
      requireCanonicalIso(
        input.now,
        "now"
      );

    const limit =
      requireLimit(input.limit);

    const expiresAt =
      new Date(
        now.milliseconds +
          PHONE_ABUSE_CONTROL_WINDOW_SECONDS *
            1000
      ).toISOString();

    try {
      const rows =
        await this.executor(
          CONSUME_RATE_WINDOW_SQL,
          [
            scope,
            keyDigest,
            now.iso,
            expiresAt,
            limit
          ]
        );

      if (rows.length > 1) {
        throw new NeonPhoneAbuseControlRepositoryError(
          "INVALID_DATABASE_RESULT",
          "Neon returned multiple PHONE rate-window rows."
        );
      }

      const row =
        rows[0];

      if (row) {
        const requestCount =
          readInteger(
            row.request_count,
            "request_count"
          );

        if (
          requestCount < 1 ||
          requestCount > limit
        ) {
          throw new NeonPhoneAbuseControlRepositoryError(
            "INVALID_DATABASE_RESULT",
            "Neon returned an impossible PHONE rate-window request count."
          );
        }

        return {
          status: "ALLOWED",
          requestCount,
          windowStartedAt:
            readIso(
              row.window_started_at,
              "window_started_at"
            ),
          expiresAt:
            readIso(
              row.expires_at,
              "expires_at"
            )
        };
      }

      const existingRows =
        await this.executor(
          READ_RATE_WINDOW_SQL,
          [
            scope,
            keyDigest
          ]
        );

      if (existingRows.length !== 1) {
        throw new NeonPhoneAbuseControlRepositoryError(
          "INVALID_DATABASE_RESULT",
          "Neon could not resolve the denied PHONE rate window."
        );
      }

      const existing =
        existingRows[0]!;

      const existingScope =
        readString(
          existing.scope,
          "scope"
        );

      const existingDigest =
        readString(
          existing.key_digest,
          "key_digest"
        );

      if (
        existingScope !== scope ||
        existingDigest !== keyDigest
      ) {
        throw new NeonPhoneAbuseControlRepositoryError(
          "INVALID_DATABASE_RESULT",
          "Neon returned a mismatched PHONE rate window."
        );
      }

      const existingCount =
        readInteger(
          existing.request_count,
          "request_count"
        );

      if (existingCount < limit) {
        throw new NeonPhoneAbuseControlRepositoryError(
          "INVALID_DATABASE_RESULT",
          "Neon denied a PHONE rate window below its configured limit."
        );
      }

      const existingExpiry =
        readIso(
          existing.expires_at,
          "expires_at"
        );

      return {
        status: "RATE_LIMITED",
        retryAfterSeconds:
          retryAfterSeconds(
            now.milliseconds,
            existingExpiry
          )
      };
    } catch (error) {
      mapDatabaseFailure(error);
    }
  }

  async consumeSendRateWindows(
    input:
      ConsumePhoneSendRateWindowsInput
  ): Promise<
    ConsumePhoneSendRateWindowsResult
  > {
    const sessionKeyDigest =
      requireSendPairDigest(
        input.sessionKeyDigest,
        "sessionKeyDigest"
      );

    const phoneKeyDigest =
      requireSendPairDigest(
        input.phoneKeyDigest,
        "phoneKeyDigest"
      );

    const now =
      requireSendPairNow(
        input.now
      );

    const neutralWindowStartedAt =
      new Date(
        now.milliseconds -
          PHONE_ABUSE_CONTROL_WINDOW_SECONDS *
            1000
      ).toISOString();

    const nextExpiresAt =
      new Date(
        now.milliseconds +
          PHONE_ABUSE_CONTROL_WINDOW_SECONDS *
            1000
      ).toISOString();

    let results:
      readonly (
        readonly PhoneAbuseControlQueryRow[]
      )[];

    try {
      results =
        await this.transactionExecutor(
          [
            {
              query:
                INSERT_SEND_SESSION_NEUTRAL_SQL,
              parameters: [
                sessionKeyDigest,
                neutralWindowStartedAt,
                now.iso
              ]
            },
            {
              query:
                INSERT_SEND_PHONE_NEUTRAL_SQL,
              parameters: [
                phoneKeyDigest,
                neutralWindowStartedAt,
                now.iso
              ]
            },
            {
              query:
                LOCK_SEND_SESSION_WINDOW_SQL,
              parameters: [
                sessionKeyDigest
              ]
            },
            {
              query:
                LOCK_SEND_PHONE_WINDOW_SQL,
              parameters: [
                phoneKeyDigest
              ]
            },
            {
              query:
                UPDATE_SEND_PAIR_SQL,
              parameters: [
                sessionKeyDigest,
                phoneKeyDigest,
                now.iso,
                nextExpiresAt,
                PHONE_SEND_SESSION_LIMIT,
                PHONE_SEND_PHONE_LIMIT
              ]
            },
            {
              query:
                READ_SEND_PAIR_SQL,
              parameters: [
                sessionKeyDigest,
                phoneKeyDigest
              ]
            }
          ],
          {
            isolationLevel:
              "ReadCommitted",
            readOnly:
              false
          }
        );
    } catch (error) {
      mapDatabaseFailure(error);
    }

    if (results.length !== 6) {
      throw new NeonPhoneAbuseControlRepositoryError(
        "INVALID_DATABASE_RESULT",
        "Neon returned an invalid PHONE SEND transaction result count."
      );
    }

    const sessionLockRows =
      results[2];

    const phoneLockRows =
      results[3];

    const updatedRows =
      results[4];

    const readbackRows =
      results[5];

    if (
      !sessionLockRows ||
      !phoneLockRows ||
      !updatedRows ||
      !readbackRows
    ) {
      throw new NeonPhoneAbuseControlRepositoryError(
        "INVALID_DATABASE_RESULT",
        "Neon returned an incomplete PHONE SEND transaction result shape."
      );
    }

    assertSendLockRow(
      sessionLockRows,
      "SEND_SESSION",
      sessionKeyDigest
    );

    assertSendLockRow(
      phoneLockRows,
      "SEND_PHONE",
      phoneKeyDigest
    );

    if (
      updatedRows.length !== 0 &&
      updatedRows.length !== 2
    ) {
      throw new NeonPhoneAbuseControlRepositoryError(
        "INVALID_DATABASE_RESULT",
        "PHONE SEND pair update was not all-or-nothing."
      );
    }

    if (updatedRows.length === 2) {
      const updated =
        parseSendPairRows(
          updatedRows,
          sessionKeyDigest,
          phoneKeyDigest
        );

      if (
        updated.session.requestCount >
          PHONE_SEND_SESSION_LIMIT ||
        updated.phone.requestCount >
          PHONE_SEND_PHONE_LIMIT
      ) {
        throw new NeonPhoneAbuseControlRepositoryError(
          "INVALID_DATABASE_RESULT",
          "PHONE SEND pair update exceeded a configured limit."
        );
      }
    }

    const state =
      parseSendPairRows(
        readbackRows,
        sessionKeyDigest,
        phoneKeyDigest
      );

    if (updatedRows.length === 2) {
      if (
        state.session.requestCount >
          PHONE_SEND_SESSION_LIMIT ||
        state.phone.requestCount >
          PHONE_SEND_PHONE_LIMIT
      ) {
        throw new NeonPhoneAbuseControlRepositoryError(
          "INVALID_DATABASE_RESULT",
          "PHONE SEND readback exceeded a configured limit."
        );
      }

      return {
        status:
          "ALLOWED"
      };
    }

    const retryCandidates:
      number[] =
        [];

    const collectRetry = (
      stateValue:
        PhoneSendRateWindowState,
      limit: number
    ): void => {
      const expiryMilliseconds =
        new Date(
          stateValue.expiresAt
        ).getTime();

      if (
        expiryMilliseconds >
          now.milliseconds &&
        stateValue.requestCount >= limit
      ) {
        retryCandidates.push(
          retryAfterSeconds(
            now.milliseconds,
            stateValue.expiresAt
          )
        );
      }
    };

    collectRetry(
      state.session,
      PHONE_SEND_SESSION_LIMIT
    );

    collectRetry(
      state.phone,
      PHONE_SEND_PHONE_LIMIT
    );

    if (
      retryCandidates.length === 0
    ) {
      throw new NeonPhoneAbuseControlRepositoryError(
        "INVALID_DATABASE_RESULT",
        "PHONE SEND pair denial did not contain an exhausted active scope."
      );
    }

    return {
      status:
        "RATE_LIMITED",
      retryAfterSeconds:
        Math.max(
          ...retryCandidates
        )
    };
  }

  async recordChallengeAttempt(
    input: RecordPhoneChallengeAttemptInput
  ): Promise<RecordPhoneChallengeAttemptResult> {
    const challengeDigest =
      requireDigest(
        input.challengeDigest,
        "challengeDigest"
      );

    const sessionId =
      requireSessionId(
        input.sessionId
      );

    const phoneKeyDigest =
      requireDigest(
        input.phoneKeyDigest,
        "phoneKeyDigest"
      );

    const expiresAt =
      requireCanonicalIso(
        input.expiresAt,
        "expiresAt"
      );

    const now =
      requireCanonicalIso(
        input.now,
        "now"
      );

    if (
      expiresAt.milliseconds <=
      now.milliseconds
    ) {
      return {
        status: "CHALLENGE_EXPIRED"
      };
    }

    try {
      const rows =
        await this.executor(
          RECORD_CHALLENGE_ATTEMPT_SQL,
          [
            challengeDigest,
            sessionId,
            phoneKeyDigest,
            expiresAt.iso,
            now.iso
          ]
        );

      if (rows.length > 1) {
        throw new NeonPhoneAbuseControlRepositoryError(
          "INVALID_DATABASE_RESULT",
          "Neon returned multiple PHONE challenge-attempt rows."
        );
      }

      const row =
        rows[0];

      if (row) {
        const attemptCount =
          readInteger(
            row.attempt_count,
            "attempt_count"
          );

        if (
          attemptCount < 1 ||
          attemptCount >
            PHONE_CHALLENGE_ATTEMPT_LIMIT
        ) {
          throw new NeonPhoneAbuseControlRepositoryError(
            "INVALID_DATABASE_RESULT",
            "Neon returned an impossible PHONE challenge attempt count."
          );
        }

        return {
          status: "ATTEMPT_RECORDED",
          attemptCount,
          expiresAt:
            readIso(
              row.expires_at,
              "expires_at"
            )
        };
      }

      const existingRows =
        await this.executor(
          READ_CHALLENGE_USAGE_SQL,
          [
            challengeDigest
          ]
        );

      if (existingRows.length !== 1) {
        throw new NeonPhoneAbuseControlRepositoryError(
          "INVALID_DATABASE_RESULT",
          "Neon could not resolve denied PHONE challenge usage."
        );
      }

      const existing =
        existingRows[0]!;

      const existingSessionId =
        readString(
          existing.session_id,
          "session_id"
        );

      const existingPhoneDigest =
        readString(
          existing.phone_key_digest,
          "phone_key_digest"
        );

      const existingExpiry =
        readIso(
          existing.expires_at,
          "expires_at"
        );

      if (
        existingSessionId !== sessionId ||
        existingPhoneDigest !==
          phoneKeyDigest ||
        existingExpiry !== expiresAt.iso
      ) {
        return {
          status:
            "CHALLENGE_BINDING_MISMATCH"
        };
      }

      const consumedAt =
        readNullableIso(
          existing.consumed_at,
          "consumed_at"
        );

      if (consumedAt !== null) {
        return {
          status: "CHALLENGE_CONSUMED"
        };
      }

      const existingExpiryMilliseconds =
        new Date(
          existingExpiry
        ).getTime();

      if (
        existingExpiryMilliseconds <=
        now.milliseconds
      ) {
        return {
          status: "CHALLENGE_EXPIRED"
        };
      }

      const attemptCount =
        readInteger(
          existing.attempt_count,
          "attempt_count"
        );

      if (
        attemptCount >=
        PHONE_CHALLENGE_ATTEMPT_LIMIT
      ) {
        return {
          status: "ATTEMPT_LIMITED",
          retryAfterSeconds:
            retryAfterSeconds(
              now.milliseconds,
              existingExpiry
            )
        };
      }

      throw new NeonPhoneAbuseControlRepositoryError(
        "INVALID_DATABASE_RESULT",
        "Neon denied a PHONE challenge attempt without a valid denial state."
      );
    } catch (error) {
      mapDatabaseFailure(error);
    }
  }

  async consumeChallengeSuccess(
    input: ConsumePhoneChallengeSuccessInput
  ): Promise<ConsumePhoneChallengeSuccessResult> {
    const challengeDigest =
      requireDigest(
        input.challengeDigest,
        "challengeDigest"
      );

    const sessionId =
      requireSessionId(
        input.sessionId
      );

    const phoneKeyDigest =
      requireDigest(
        input.phoneKeyDigest,
        "phoneKeyDigest"
      );

    const expiresAt =
      requireCanonicalIso(
        input.expiresAt,
        "expiresAt"
      );

    const now =
      requireCanonicalIso(
        input.now,
        "now"
      );

    if (
      expiresAt.milliseconds <=
      now.milliseconds
    ) {
      return {
        status: "DENIED"
      };
    }

    try {
      const rows =
        await this.executor(
          CONSUME_CHALLENGE_SUCCESS_SQL,
          [
            challengeDigest,
            sessionId,
            phoneKeyDigest,
            expiresAt.iso,
            now.iso
          ]
        );

      if (rows.length === 0) {
        return {
          status: "DENIED"
        };
      }

      if (rows.length !== 1) {
        throw new NeonPhoneAbuseControlRepositoryError(
          "INVALID_DATABASE_RESULT",
          "Neon returned multiple PHONE challenge-consumption rows."
        );
      }

      return {
        status: "CONSUMED",
        consumedAt:
          readIso(
            rows[0]!.consumed_at,
            "consumed_at"
          )
      };
    } catch (error) {
      mapDatabaseFailure(error);
    }
  }
}

export function createNeonPhoneAbuseControlRepository(
  executor?:
    PhoneAbuseControlQueryExecutor,
  transactionExecutor?:
    PhoneAbuseControlTransactionExecutor
): PhoneAbuseControlRepository {
  return new NeonPhoneAbuseControlRepository(
    executor,
    transactionExecutor
  );
}
