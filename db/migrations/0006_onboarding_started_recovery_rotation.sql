BEGIN;

ALTER TABLE hbce_onboarding_sessions
  DROP CONSTRAINT hbce_onboarding_sessions_rotation_shape;

ALTER TABLE hbce_onboarding_sessions
  ADD CONSTRAINT hbce_onboarding_sessions_rotation_shape
  CHECK (
    issued_state = 'STARTED'
    OR
    (
      issued_state = 'CONTACT_VERIFIED'
      AND rotated_from_session_id IS NOT NULL
    )
  );

COMMIT;
