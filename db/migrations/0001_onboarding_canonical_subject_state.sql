BEGIN;

CREATE TABLE hbce_subjects (
  subject_id text PRIMARY KEY,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,

  CONSTRAINT hbce_subjects_subject_id_nonempty
    CHECK (length(btrim(subject_id)) > 0),

  CONSTRAINT hbce_subjects_timestamp_order
    CHECK (updated_at >= created_at)
);

CREATE TABLE hbce_onboardings (
  onboarding_id text PRIMARY KEY,
  subject_id text NOT NULL UNIQUE,
  state_version text NOT NULL,
  revocation_state text NOT NULL DEFAULT 'clear',
  current_revision bigint,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,

  CONSTRAINT hbce_onboardings_subject_fk
    FOREIGN KEY (subject_id)
    REFERENCES hbce_subjects(subject_id),

  CONSTRAINT hbce_onboardings_id_nonempty
    CHECK (length(btrim(onboarding_id)) > 0),

  CONSTRAINT hbce_onboardings_version_v1
    CHECK (
      state_version =
      'HBCE-IPR-ONBOARDING-CANONICAL-SUBJECT-STATE-v1.0'
    ),

  CONSTRAINT hbce_onboardings_revocation_state_valid
    CHECK (
      revocation_state IN (
        'clear',
        'suspended',
        'revoked',
        'expired',
        'under_review'
      )
    ),

  CONSTRAINT hbce_onboardings_revision_valid
    CHECK (
      current_revision IS NULL OR
      current_revision >= 0
    ),

  CONSTRAINT hbce_onboardings_timestamp_order
    CHECK (updated_at >= created_at),

  CONSTRAINT hbce_onboardings_onboarding_subject_unique
    UNIQUE (onboarding_id, subject_id)
);

CREATE TABLE hbce_ipr_records (
  ipr_id text PRIMARY KEY,
  onboarding_id text NOT NULL,
  subject_id text NOT NULL,
  status text NOT NULL,
  hash_reference text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,

  CONSTRAINT hbce_ipr_records_onboarding_subject_fk
    FOREIGN KEY (onboarding_id, subject_id)
    REFERENCES hbce_onboardings(onboarding_id, subject_id),

  CONSTRAINT hbce_ipr_records_id_nonempty
    CHECK (length(btrim(ipr_id)) > 0),

  CONSTRAINT hbce_ipr_records_status_valid
    CHECK (
      status IN (
        'not_created',
        'pending',
        'verified',
        'rejected',
        'expired',
        'revoked',
        'suspended'
      )
    ),

  CONSTRAINT hbce_ipr_records_hash_nonempty
    CHECK (length(btrim(hash_reference)) > 0),

  CONSTRAINT hbce_ipr_records_timestamp_order
    CHECK (updated_at >= created_at),

  CONSTRAINT hbce_ipr_records_ipr_subject_unique
    UNIQUE (ipr_id, subject_id),

  CONSTRAINT hbce_ipr_records_ipr_subject_onboarding_unique
    UNIQUE (ipr_id, subject_id, onboarding_id)
);

CREATE TABLE hbce_ipr_cards (
  ipr_card_id text PRIMARY KEY,
  onboarding_id text NOT NULL,
  ipr_id text NOT NULL,
  subject_id text NOT NULL,
  card_serial text NOT NULL UNIQUE,
  status text NOT NULL,
  payload_sha256 text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,

  CONSTRAINT hbce_ipr_cards_ipr_subject_onboarding_fk
    FOREIGN KEY (ipr_id, subject_id, onboarding_id)
    REFERENCES hbce_ipr_records(ipr_id, subject_id, onboarding_id),

  CONSTRAINT hbce_ipr_cards_id_nonempty
    CHECK (length(btrim(ipr_card_id)) > 0),

  CONSTRAINT hbce_ipr_cards_serial_nonempty
    CHECK (length(btrim(card_serial)) > 0),

  CONSTRAINT hbce_ipr_cards_status_valid
    CHECK (
      status IN (
        'not_issued',
        'pending',
        'issued',
        'expired',
        'revoked',
        'suspended'
      )
    ),

  CONSTRAINT hbce_ipr_cards_hash_nonempty
    CHECK (length(btrim(payload_sha256)) > 0),

  CONSTRAINT hbce_ipr_cards_timestamp_order
    CHECK (updated_at >= created_at),

  CONSTRAINT hbce_ipr_cards_binding_unique
    UNIQUE (ipr_id, subject_id, card_serial),

  CONSTRAINT hbce_ipr_cards_full_binding_unique
    UNIQUE (
      ipr_card_id,
      ipr_id,
      subject_id,
      card_serial,
      onboarding_id
    )
);

CREATE TABLE hbce_operational_certificates (
  certificate_id text PRIMARY KEY,
  onboarding_id text NOT NULL,
  ipr_card_id text NOT NULL,
  ipr_id text NOT NULL,
  subject_id text NOT NULL,
  card_serial text NOT NULL,
  status text NOT NULL,
  scope text NOT NULL,
  payload_sha256 text NOT NULL UNIQUE,
  previous_payload_sha256 text NOT NULL,
  integrity_decision text NOT NULL,
  integrity_checked_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,

  CONSTRAINT hbce_operational_certificates_card_binding_fk
    FOREIGN KEY (
      ipr_card_id,
      ipr_id,
      subject_id,
      card_serial,
      onboarding_id
    )
    REFERENCES hbce_ipr_cards(
      ipr_card_id,
      ipr_id,
      subject_id,
      card_serial,
      onboarding_id
    ),

  CONSTRAINT hbce_operational_certificates_id_nonempty
    CHECK (length(btrim(certificate_id)) > 0),

  CONSTRAINT hbce_operational_certificates_status_valid
    CHECK (
      status IN (
        'not_created',
        'pending',
        'active',
        'expired',
        'revoked',
        'suspended'
      )
    ),

  CONSTRAINT hbce_operational_certificates_scope_valid
    CHECK (scope = 'JOKER_C2_ACCESS'),

  CONSTRAINT hbce_operational_certificates_payload_hash_nonempty
    CHECK (length(btrim(payload_sha256)) > 0),

  CONSTRAINT hbce_operational_certificates_previous_hash_nonempty
    CHECK (length(btrim(previous_payload_sha256)) > 0),

  CONSTRAINT hbce_operational_certificates_integrity_valid
    CHECK (integrity_decision = 'VALID'),

  CONSTRAINT hbce_operational_certificates_timestamp_order
    CHECK (updated_at >= created_at)
);

CREATE TABLE hbce_phase_certificates (
  onboarding_id text NOT NULL,
  subject_id text NOT NULL,
  phase_number smallint NOT NULL,
  certificate_hash text NOT NULL,
  accepted_at timestamptz NOT NULL,

  PRIMARY KEY (onboarding_id, phase_number),

  CONSTRAINT hbce_phase_certificates_onboarding_subject_fk
    FOREIGN KEY (onboarding_id, subject_id)
    REFERENCES hbce_onboardings(onboarding_id, subject_id),

  CONSTRAINT hbce_phase_certificates_phase_valid
    CHECK (phase_number BETWEEN 1 AND 9),

  CONSTRAINT hbce_phase_certificates_hash_nonempty
    CHECK (length(btrim(certificate_hash)) > 0)
);

CREATE TABLE hbce_revocations (
  revocation_id text PRIMARY KEY,
  onboarding_id text NOT NULL,
  subject_id text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  revocation_state text NOT NULL,
  reason_code text NOT NULL,
  issued_by text NOT NULL,
  issued_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,

  CONSTRAINT hbce_revocations_onboarding_subject_fk
    FOREIGN KEY (onboarding_id, subject_id)
    REFERENCES hbce_onboardings(onboarding_id, subject_id),

  CONSTRAINT hbce_revocations_id_nonempty
    CHECK (length(btrim(revocation_id)) > 0),

  CONSTRAINT hbce_revocations_target_type_valid
    CHECK (
      target_type IN (
        'ipr',
        'ipr_card',
        'certificate',
        'joker_c2_access',
        'onboarding_record',
        'hbce_ipr_phase_certificate',
        'hbce_ipr_operational_certificate'
      )
    ),

  CONSTRAINT hbce_revocations_target_id_nonempty
    CHECK (length(btrim(target_id)) > 0),

  CONSTRAINT hbce_revocations_state_valid
    CHECK (
      revocation_state IN (
        'clear',
        'suspended',
        'revoked',
        'expired',
        'under_review'
      )
    ),

  CONSTRAINT hbce_revocations_reason_nonempty
    CHECK (length(btrim(reason_code)) > 0),

  CONSTRAINT hbce_revocations_issuer_nonempty
    CHECK (length(btrim(issued_by)) > 0)
);

CREATE TABLE hbce_private_artifacts (
  artifact_id text PRIMARY KEY,
  onboarding_id text NOT NULL,
  subject_id text NOT NULL,
  artifact_kind text NOT NULL,
  blob_reference text NOT NULL UNIQUE,
  sha256 text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  created_at timestamptz NOT NULL,

  CONSTRAINT hbce_private_artifacts_onboarding_subject_fk
    FOREIGN KEY (onboarding_id, subject_id)
    REFERENCES hbce_onboardings(onboarding_id, subject_id),

  CONSTRAINT hbce_private_artifacts_id_nonempty
    CHECK (length(btrim(artifact_id)) > 0),

  CONSTRAINT hbce_private_artifacts_kind_valid
    CHECK (
      artifact_kind IN (
        'IDENTITY_DOCUMENT',
        'FISCAL_DOCUMENT',
        'PHOTO_EVIDENCE',
        'VIDEO_LIVENESS_EVIDENCE',
        'PHASE_CERTIFICATE',
        'OPERATIONAL_CERTIFICATE',
        'IPR_PDF'
      )
    ),

  CONSTRAINT hbce_private_artifacts_blob_reference_nonempty
    CHECK (length(btrim(blob_reference)) > 0),

  CONSTRAINT hbce_private_artifacts_sha256_nonempty
    CHECK (length(btrim(sha256)) > 0),

  CONSTRAINT hbce_private_artifacts_mime_nonempty
    CHECK (length(btrim(mime_type)) > 0),

  CONSTRAINT hbce_private_artifacts_size_valid
    CHECK (size_bytes >= 0)
);

CREATE TABLE hbce_subject_state_revisions (
  onboarding_id text NOT NULL,
  subject_id text NOT NULL,
  revision bigint NOT NULL,
  state_version text NOT NULL,
  canonical_state jsonb NOT NULL,
  canonical_state_sha256 text NOT NULL,
  created_at timestamptz NOT NULL,

  PRIMARY KEY (onboarding_id, revision),

  CONSTRAINT hbce_subject_state_revisions_onboarding_subject_fk
    FOREIGN KEY (onboarding_id, subject_id)
    REFERENCES hbce_onboardings(onboarding_id, subject_id),

  CONSTRAINT hbce_subject_state_revisions_revision_valid
    CHECK (revision >= 0),

  CONSTRAINT hbce_subject_state_revisions_version_valid
    CHECK (
      state_version =
      'HBCE-IPR-ONBOARDING-CANONICAL-SUBJECT-STATE-v1.0'
    ),

  CONSTRAINT hbce_subject_state_revisions_json_object
    CHECK (jsonb_typeof(canonical_state) = 'object'),

  CONSTRAINT hbce_subject_state_revisions_hash_nonempty
    CHECK (length(btrim(canonical_state_sha256)) > 0),

  CONSTRAINT hbce_subject_state_revisions_subject_match
    CHECK (canonical_state ->> 'subjectId' = subject_id),

  CONSTRAINT hbce_subject_state_revisions_onboarding_match
    CHECK (canonical_state ->> 'onboardingId' = onboarding_id),

  CONSTRAINT hbce_subject_state_revisions_version_match
    CHECK (canonical_state ->> 'version' = state_version),

  CONSTRAINT hbce_subject_state_revisions_revision_match
    CHECK (
      canonical_state ->> 'revision' = revision::text
    ),

  CONSTRAINT hbce_subject_state_revisions_binding_unique
    UNIQUE (onboarding_id, revision, subject_id)
);

ALTER TABLE hbce_onboardings
  ADD CONSTRAINT hbce_onboardings_current_revision_fk
  FOREIGN KEY (onboarding_id, current_revision)
  REFERENCES hbce_subject_state_revisions(onboarding_id, revision)
  DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE hbce_audit_events (
  event_id text PRIMARY KEY,
  onboarding_id text NOT NULL,
  subject_id text NOT NULL,
  revision bigint NOT NULL,
  event_type text NOT NULL,
  decision_state text NOT NULL,
  previous_event_hash text,
  event_hash text NOT NULL UNIQUE,
  event_payload_sha256 text NOT NULL,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL,

  CONSTRAINT hbce_audit_events_revision_subject_fk
    FOREIGN KEY (onboarding_id, revision, subject_id)
    REFERENCES hbce_subject_state_revisions(
      onboarding_id,
      revision,
      subject_id
    ),

  CONSTRAINT hbce_audit_events_id_nonempty
    CHECK (length(btrim(event_id)) > 0),

  CONSTRAINT hbce_audit_events_type_nonempty
    CHECK (length(btrim(event_type)) > 0),

  CONSTRAINT hbce_audit_events_decision_nonempty
    CHECK (length(btrim(decision_state)) > 0),

  CONSTRAINT hbce_audit_events_previous_hash_nonempty
    CHECK (
      previous_event_hash IS NULL OR
      length(btrim(previous_event_hash)) > 0
    ),

  CONSTRAINT hbce_audit_events_hash_nonempty
    CHECK (length(btrim(event_hash)) > 0),

  CONSTRAINT hbce_audit_events_payload_hash_nonempty
    CHECK (length(btrim(event_payload_sha256)) > 0)
);

CREATE FUNCTION hbce_reject_append_only_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'HBCE append-only relation % does not permit %',
    TG_TABLE_NAME,
    TG_OP;
END;
$$;

CREATE TRIGGER hbce_subject_state_revisions_append_only
BEFORE UPDATE OR DELETE ON hbce_subject_state_revisions
FOR EACH ROW
EXECUTE FUNCTION hbce_reject_append_only_mutation();

CREATE TRIGGER hbce_audit_events_append_only
BEFORE UPDATE OR DELETE ON hbce_audit_events
FOR EACH ROW
EXECUTE FUNCTION hbce_reject_append_only_mutation();

CREATE TRIGGER hbce_phase_certificates_append_only
BEFORE UPDATE OR DELETE ON hbce_phase_certificates
FOR EACH ROW
EXECUTE FUNCTION hbce_reject_append_only_mutation();

CREATE TRIGGER hbce_revocations_append_only
BEFORE UPDATE OR DELETE ON hbce_revocations
FOR EACH ROW
EXECUTE FUNCTION hbce_reject_append_only_mutation();

CREATE TRIGGER hbce_private_artifacts_append_only
BEFORE UPDATE OR DELETE ON hbce_private_artifacts
FOR EACH ROW
EXECUTE FUNCTION hbce_reject_append_only_mutation();

CREATE INDEX hbce_phase_certificates_latest_idx
  ON hbce_phase_certificates(onboarding_id, phase_number DESC);

CREATE INDEX hbce_revocations_target_idx
  ON hbce_revocations(target_type, target_id, issued_at DESC);

CREATE INDEX hbce_private_artifacts_subject_kind_idx
  ON hbce_private_artifacts(subject_id, artifact_kind, created_at DESC);

CREATE INDEX hbce_subject_state_revisions_subject_idx
  ON hbce_subject_state_revisions(subject_id, revision DESC);

CREATE INDEX hbce_audit_events_onboarding_idx
  ON hbce_audit_events(onboarding_id, revision, occurred_at);

COMMIT;
