-- HBCE IPR Onboarding
-- P003-D077
--
-- Trust root design:
-- 128671705e783cf82e7e940f57936bc4fc2145ff49a841105fae9c6c7c13d74d
--
-- Session persistence design:
-- 64bd71c77a56f4993fb935fd36d106003f12b2728060b4d5c9bb4b1f52d140d8
--
-- Session numeric policy:
-- ba37aab67024e51d8d1b443294e7424fc7d39d462e65d6e28a7e363fe0043a3a

BEGIN;

CREATE TABLE hbce_onboarding_sessions (
  session_id text PRIMARY KEY,
  onboarding_id text NOT NULL,
  subject_id text NOT NULL,
  token_sha256 text NOT NULL,
  issued_state text NOT NULL,
  issued_at timestamptz NOT NULL,
  absolute_expires_at timestamptz NOT NULL,
  rotated_from_session_id text,
  created_at timestamptz NOT NULL,

  CONSTRAINT hbce_onboarding_sessions_onboarding_subject_fk
    FOREIGN KEY (onboarding_id, subject_id)
    REFERENCES hbce_onboardings(onboarding_id, subject_id),

  CONSTRAINT hbce_onboarding_sessions_binding_unique
    UNIQUE (session_id, onboarding_id, subject_id),

  CONSTRAINT hbce_onboarding_sessions_token_sha256_unique
    UNIQUE (token_sha256),

  CONSTRAINT hbce_onboarding_sessions_session_id_nonempty
    CHECK (length(btrim(session_id)) > 0),

  CONSTRAINT hbce_onboarding_sessions_onboarding_id_nonempty
    CHECK (length(btrim(onboarding_id)) > 0),

  CONSTRAINT hbce_onboarding_sessions_subject_id_nonempty
    CHECK (length(btrim(subject_id)) > 0),

  CONSTRAINT hbce_onboarding_sessions_token_sha256_format
    CHECK (token_sha256 ~ '^[0-9a-f]{64}$'),

  CONSTRAINT hbce_onboarding_sessions_issued_state_valid
    CHECK (
      issued_state IN (
        'STARTED',
        'CONTACT_VERIFIED'
      )
    ),

  CONSTRAINT hbce_onboarding_sessions_absolute_expiry_valid
    CHECK (absolute_expires_at > issued_at),

  CONSTRAINT hbce_onboarding_sessions_rotation_shape
    CHECK (
      (
        issued_state = 'STARTED'
        AND rotated_from_session_id IS NULL
      )
      OR
      (
        issued_state = 'CONTACT_VERIFIED'
        AND rotated_from_session_id IS NOT NULL
      )
    ),

  CONSTRAINT hbce_onboarding_sessions_rotation_binding_fk
    FOREIGN KEY (
      rotated_from_session_id,
      onboarding_id,
      subject_id
    )
    REFERENCES hbce_onboarding_sessions(
      session_id,
      onboarding_id,
      subject_id
    ),

  CONSTRAINT hbce_onboarding_sessions_no_self_rotation
    CHECK (
      rotated_from_session_id IS NULL
      OR rotated_from_session_id <> session_id
    )
);

CREATE TABLE hbce_onboarding_session_events (
  event_id text PRIMARY KEY,
  session_id text NOT NULL,
  event_seq bigint NOT NULL,
  event_type text NOT NULL,
  previous_event_hash text,
  event_hash text NOT NULL,
  event_payload_sha256 text NOT NULL,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,

  CONSTRAINT hbce_onboarding_session_events_session_fk
    FOREIGN KEY (session_id)
    REFERENCES hbce_onboarding_sessions(session_id),

  CONSTRAINT hbce_onboarding_session_events_sequence_unique
    UNIQUE (session_id, event_seq),

  CONSTRAINT hbce_onboarding_session_events_hash_unique
    UNIQUE (event_hash),

  CONSTRAINT hbce_onboarding_session_events_session_hash_unique
    UNIQUE (session_id, event_hash),

  CONSTRAINT hbce_onboarding_session_events_event_id_nonempty
    CHECK (length(btrim(event_id)) > 0),

  CONSTRAINT hbce_onboarding_session_events_sequence_valid
    CHECK (event_seq >= 0),

  CONSTRAINT hbce_onboarding_session_events_type_valid
    CHECK (
      event_type IN (
        'SESSION_CREATED',
        'EMAIL_VERIFIED',
        'PHONE_VERIFIED',
        'CONTACT_VERIFIED',
        'SESSION_ACTIVITY',
        'SESSION_ROTATED',
        'SESSION_REVOKED',
        'SESSION_EXPIRED'
      )
    ),

  CONSTRAINT hbce_onboarding_session_events_hash_nonempty
    CHECK (length(btrim(event_hash)) > 0),

  CONSTRAINT hbce_onboarding_session_events_hash_format
    CHECK (event_hash ~ '^[0-9a-f]{64}$'),

  CONSTRAINT hbce_onboarding_session_events_payload_hash_nonempty
    CHECK (length(btrim(event_payload_sha256)) > 0),

  CONSTRAINT hbce_onboarding_session_events_payload_hash_format
    CHECK (event_payload_sha256 ~ '^[0-9a-f]{64}$'),

  CONSTRAINT hbce_onboarding_session_events_chain_shape
    CHECK (
      (
        event_seq = 0
        AND event_type = 'SESSION_CREATED'
        AND previous_event_hash IS NULL
      )
      OR
      (
        event_seq > 0
        AND event_type <> 'SESSION_CREATED'
        AND previous_event_hash IS NOT NULL
        AND previous_event_hash ~ '^[0-9a-f]{64}$'
      )
    ),

  CONSTRAINT hbce_onboarding_session_events_timestamp_order
    CHECK (created_at >= occurred_at),

  CONSTRAINT hbce_onboarding_session_events_previous_hash_fk
    FOREIGN KEY (session_id, previous_event_hash)
    REFERENCES hbce_onboarding_session_events(
      session_id,
      event_hash
    )
);

CREATE TRIGGER hbce_onboarding_sessions_append_only
BEFORE UPDATE OR DELETE ON hbce_onboarding_sessions
FOR EACH ROW
EXECUTE FUNCTION hbce_reject_append_only_mutation();

CREATE TRIGGER hbce_onboarding_session_events_append_only
BEFORE UPDATE OR DELETE ON hbce_onboarding_session_events
FOR EACH ROW
EXECUTE FUNCTION hbce_reject_append_only_mutation();

CREATE INDEX hbce_onboarding_sessions_onboarding_idx
  ON hbce_onboarding_sessions(
    onboarding_id,
    issued_at DESC
  );

CREATE INDEX hbce_onboarding_sessions_subject_idx
  ON hbce_onboarding_sessions(
    subject_id,
    issued_at DESC
  );

CREATE INDEX hbce_onboarding_session_events_session_idx
  ON hbce_onboarding_session_events(
    session_id,
    event_seq DESC
  );

COMMIT;
