import { describe, expect, it } from "vitest";

import {
  generateHbceIprCertificate,
  recomputeCertificatePayloadSha256,
  validateJokerC2OperationalCertificate
} from "@/lib/ipr-certificate-chain";

import { HBCE_IPR_PHASE_DEFINITIONS } from "@/lib/ipr-phase-map";

const subject = {
  entity_type: "HUMAN" as const,
  subject_ref: "a".repeat(64)
};

const issuedAt = "2026-11-13T12:00:00.000Z";

type BiometricState = {
  liveness_verified: boolean;
  face_match_status: "MATCHED" | "MANUAL_REVIEW";
  manual_review_required: boolean;
};

async function buildOperationalCertificate(
  biometric: BiometricState
) {
  let previous: Awaited<
    ReturnType<typeof generateHbceIprCertificate>
  >["certificate"] | null = null;

  for (const definition of HBCE_IPR_PHASE_DEFINITIONS) {
    const isOperational = definition.phase_number === 9;

    const phaseData = isOperational
      ? {
          test_fixture: true,
          certificate_id: "TEST-CERT-WP01-0001",
          ipr_id: "TEST-IPR-WP01-0001",
          subject_id: "TEST-SUBJECT-WP01-0001",
          card_serial: "TEST-CARD-WP01-0001",
          issued_at: issuedAt,
          valid_until: "2027-11-13T12:00:00.000Z",

          identity_snapshot: {
            display_name: "HBCE WP01 TEST SUBJECT",
            first_name: "HBCE",
            last_name: "TEST",
            email_verified: true,
            phone_verified: true,
            document_verified: true,
            liveness_verified: biometric.liveness_verified,

            biometric_liveness_snapshot: {
              biometric_verification_consent: true,
              liveness_verified: biometric.liveness_verified,
              liveness_status: biometric.liveness_verified
                ? "verified"
                : "manual_review",
              face_match_status: biometric.face_match_status,
              manual_review_required:
                biometric.manual_review_required,

              selfie_reference: "TEST-SELFIE-REFERENCE",
              selfie_sha256: "b".repeat(64),
              liveness_video_reference:
                "TEST-LIVENESS-VIDEO-REFERENCE",
              liveness_video_sha256: "c".repeat(64)
            }
          }
        }
      : {
          test_fixture: true
        };

    const result: Awaited<
      ReturnType<typeof generateHbceIprCertificate>
    > = await generateHbceIprCertificate({
      phase_number: definition.phase_number,
      phase_code: definition.phase_code,
      phase_status: "ACTIVE",
      next_required_phase: definition.next_required_phase,
      subject,
      previous_certificate: previous,
      previous_payload_sha256:
        previous?.hash_integrity.payload_sha256 ?? null,
      phase_data: phaseData,
      issued_at: issuedAt
    });

    previous = result.certificate;
  }

  if (!previous || previous.kind !== "IPR_OPERATIONAL_CERTIFICATE") {
    throw new Error(
      "WP01 fixture failed to produce operational certificate"
    );
  }

  /*
   * Recompute after fixture construction so this test exercises the
   * authority gate rather than failing earlier on hash integrity.
   */
  previous.hash_integrity.payload_sha256 =
    await recomputeCertificatePayloadSha256(previous);

  return previous;
}

describe("HBCE WP01 JOKER-C2 biometric authority gate", () => {
  it("denies MANUAL_REVIEW with liveness_verified=false", async () => {
    const certificate = await buildOperationalCertificate({
      liveness_verified: false,
      face_match_status: "MANUAL_REVIEW",
      manual_review_required: true
    });

    const result =
      await validateJokerC2OperationalCertificate(certificate);

    expect(result.decision).toBe("ACCESS_DENIED");
    expect(result.reason).toContain("liveness");
  });

  it("denies face MANUAL_REVIEW even when liveness is verified", async () => {
    const certificate = await buildOperationalCertificate({
      liveness_verified: true,
      face_match_status: "MANUAL_REVIEW",
      manual_review_required: true
    });

    const result =
      await validateJokerC2OperationalCertificate(certificate);

    expect(result.decision).toBe("ACCESS_DENIED");
    expect(result.reason.toLowerCase()).toContain("face");
  });

  it("grants only verified liveness plus MATCHED face with no pending manual review", async () => {
    const certificate = await buildOperationalCertificate({
      liveness_verified: true,
      face_match_status: "MATCHED",
      manual_review_required: false
    });

    const result =
      await validateJokerC2OperationalCertificate(certificate);

    expect(result.decision).toBe("ACCESS_GRANTED");
  });
});
