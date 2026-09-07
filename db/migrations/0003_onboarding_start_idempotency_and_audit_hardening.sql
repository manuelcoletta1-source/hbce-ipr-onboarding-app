BEGIN;

-- P003-D082R1 frozen start design:
-- ebd1e39b1fc11af6b03ca023c2a6f5b5b67df6a044c4df552935313239fe9fae
--
-- P003-D082R3 certified canonical audit crypto:
-- aa8f53463fa7571a766109da226a5ca8f6e1867b519d202a0d1f560f21857588
--
-- This migration contains schema only.
-- It stores no raw idempotency key, session token, contact data or PII.

CREATE TABLE hbce_onboarding_start_requests (
  idempotency_sha256 text PRIMARY KEY,
  onboarding_id text NOT NULL,
  subject_id text NOT NULL,
  session_id text NOT NULL,
  created_at timestamptz NOT NULL,

  CONSTRAINT hbce_onboarding_start_requests_idempotency_sha256_format
    CHECK (
      idempotency_sha256 ~ '^[0-9a-f]{64}$'
    ),

  CONSTRAINT hbce_onboarding_start_requests_onboarding_subject_fk
    FOREIGN KEY (
      onboarding_id,
      subject_id
    )
    REFERENCES hbce_onboardings(
      onboarding_id,
      subject_id
    ),

  CONSTRAINT hbce_onboarding_start_requests_session_binding_fk
    FOREIGN KEY (
      session_id,
      onboarding_id,
      subject_id
    )
    REFERENCES hbce_onboarding_sessions(
      session_id,
      onboarding_id,
      subject_id
    ),

  CONSTRAINT hbce_onboarding_start_requests_session_unique
    UNIQUE (session_id),

  CONSTRAINT hbce_onboarding_start_requests_onboarding_subject_unique
    UNIQUE (
      onboarding_id,
      subject_id
    )
);

CREATE TRIGGER hbce_onboarding_start_requests_append_only
BEFORE UPDATE OR DELETE ON hbce_onboarding_start_requests
FOR EACH ROW
EXECUTE FUNCTION hbce_reject_append_only_mutation();

ALTER TABLE hbce_audit_events
  ADD CONSTRAINT hbce_audit_events_event_hash_format
  CHECK (
    event_hash ~ '^[0-9a-f]{64}$'
  )
  NOT VALID;

ALTER TABLE hbce_audit_events
  ADD CONSTRAINT hbce_audit_events_payload_hash_format
  CHECK (
    event_payload_sha256 ~ '^[0-9a-f]{64}$'
  )
  NOT VALID;

ALTER TABLE hbce_audit_events
  ADD CONSTRAINT hbce_audit_events_previous_hash_format
  CHECK (
    previous_event_hash IS NULL
    OR previous_event_hash ~ '^[0-9a-f]{64}$'
  )
  NOT VALID;

ALTER TABLE hbce_audit_events
  VALIDATE CONSTRAINT
    hbce_audit_events_event_hash_format;

ALTER TABLE hbce_audit_events
  VALIDATE CONSTRAINT
    hbce_audit_events_payload_hash_format;

ALTER TABLE hbce_audit_events
  VALIDATE CONSTRAINT
    hbce_audit_events_previous_hash_format;

COMMIT;
