-- HBCE PHONE SEND multi-scope atomicity support.
-- Canonical design SHA-256:
-- ecad0d1ed8add7be806c3f884c591a35392db82ec04bd944b1ad32ba1c151868
--
-- request_count = 0 is reserved for an already-expired neutral
-- lock placeholder. It represents no consumed request.

ALTER TABLE hbce_phone_rate_limit_windows
  DROP CONSTRAINT
    hbce_phone_rate_limit_windows_request_count_valid;

ALTER TABLE hbce_phone_rate_limit_windows
  ADD CONSTRAINT
    hbce_phone_rate_limit_windows_request_count_valid
  CHECK (
    request_count >= 0
  );

ALTER TABLE hbce_phone_rate_limit_windows
  ADD CONSTRAINT
    hbce_phone_rate_limit_windows_zero_count_neutral
  CHECK (
    request_count > 0
    OR expires_at <= updated_at
  );
