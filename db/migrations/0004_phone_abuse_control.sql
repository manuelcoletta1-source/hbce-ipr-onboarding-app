-- HBCE PHONE ABUSE CONTROL DURABLE PERSISTENCE V1
-- DESIGN_SHA256=4b16b5bd1df0f9bf7382ada75ff40b233cc2b2e23ef80a6ffc6f05eab8c3041b
--
-- Operational abuse-control state is intentionally mutable.
-- Expiry semantics never depend on physical cleanup having occurred.

CREATE TABLE hbce_phone_rate_limit_windows (
  scope text NOT NULL,
  key_digest text NOT NULL,
  window_started_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  request_count integer NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,

  PRIMARY KEY (scope, key_digest),

  CONSTRAINT hbce_phone_rate_limit_windows_scope_valid
    CHECK (
      scope IN (
        'SEND_SESSION',
        'SEND_PHONE',
        'VERIFY_SESSION'
      )
    ),

  CONSTRAINT hbce_phone_rate_limit_windows_key_digest_format
    CHECK (
      key_digest ~ '^[0-9a-f]{64}$'
    ),

  CONSTRAINT hbce_phone_rate_limit_windows_request_count_valid
    CHECK (
      request_count >= 1
    ),

  CONSTRAINT hbce_phone_rate_limit_windows_expiry_valid
    CHECK (
      expires_at > window_started_at
    ),

  CONSTRAINT hbce_phone_rate_limit_windows_created_updated_order
    CHECK (
      updated_at >= created_at
    )
);

CREATE TABLE hbce_phone_challenge_usage (
  challenge_digest text PRIMARY KEY,
  session_id text NOT NULL,
  phone_key_digest text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempt_count integer NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,

  CONSTRAINT hbce_phone_challenge_usage_session_fk
    FOREIGN KEY (session_id)
    REFERENCES hbce_onboarding_sessions(session_id),

  CONSTRAINT hbce_phone_challenge_usage_challenge_digest_format
    CHECK (
      challenge_digest ~ '^[0-9a-f]{64}$'
    ),

  CONSTRAINT hbce_phone_challenge_usage_phone_key_digest_format
    CHECK (
      phone_key_digest ~ '^[0-9a-f]{64}$'
    ),

  CONSTRAINT hbce_phone_challenge_usage_session_nonempty
    CHECK (
      length(btrim(session_id)) > 0
    ),

  CONSTRAINT hbce_phone_challenge_usage_attempt_count_valid
    CHECK (
      attempt_count BETWEEN 0 AND 5
    ),

  CONSTRAINT hbce_phone_challenge_usage_expiry_valid
    CHECK (
      expires_at > created_at
    ),

  CONSTRAINT hbce_phone_challenge_usage_created_updated_order
    CHECK (
      updated_at >= created_at
    ),

  CONSTRAINT hbce_phone_challenge_usage_consumption_time_valid
    CHECK (
      consumed_at IS NULL
      OR (
        consumed_at >= created_at
        AND consumed_at < expires_at
      )
    )
);

CREATE INDEX hbce_phone_rate_limit_windows_expiry_idx
  ON hbce_phone_rate_limit_windows(expires_at);

CREATE INDEX hbce_phone_challenge_usage_expiry_idx
  ON hbce_phone_challenge_usage(expires_at);

CREATE INDEX hbce_phone_challenge_usage_session_idx
  ON hbce_phone_challenge_usage(session_id, expires_at);
