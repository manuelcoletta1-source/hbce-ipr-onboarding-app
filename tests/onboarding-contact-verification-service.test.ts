import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  OnboardingSessionEventCommandError,
  type OnboardingSessionEventCommands
} from "../lib/server/neon-onboarding-session-event-commands";

import type {
  OnboardingSessionRepository,
  OnboardingSessionTrustState
} from "../lib/server/neon-onboarding-session-repository";

import type {
  OnboardingSessionAuthority
} from "../lib/server/onboarding-session-authority";

import {
  OnboardingContactVerificationService,
  OnboardingContactVerificationServiceError,
  type OnboardingContactVerificationDependencies
} from "../lib/server/onboarding-contact-verification-service";

const NOW =
  "2026-09-05T10:00:00.000Z";

const ABSOLUTE_EXPIRES_AT =
  "2026-09-05T18:00:00.000Z";

const AUTHORITY:
  OnboardingSessionAuthority = {
    sessionId:
      "session_started_001",
    onboardingId:
      "onb_001",
    subjectId:
      "sub_001",
    issuedState:
      "STARTED"
  };

const EMAIL_EVIDENCE =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const PHONE_EVIDENCE =
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const ROTATED_TOKEN_SHA256 =
  "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc";

const ROTATED_RAW_TOKEN =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

const NEW_UUID =
  "11111111-1111-4111-8111-111111111111";

const NEW_SESSION_ID =
  `session_${NEW_UUID}`;

function trustState(
  overrides:
    Partial<OnboardingSessionTrustState> = {}
): OnboardingSessionTrustState {
  return {
    session: {
      sessionId:
        AUTHORITY.sessionId,
      onboardingId:
        AUTHORITY.onboardingId,
      subjectId:
        AUTHORITY.subjectId,
      tokenSha256:
        "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
      issuedState:
        "STARTED",
      issuedAt:
        NOW,
      absoluteExpiresAt:
        ABSOLUTE_EXPIRES_AT,
      rotatedFromSessionId:
        null,
      createdAt:
        NOW
    },

    emailVerified:
      false,

    phoneVerified:
      false,

    contactVerified:
      false,

    rotated:
      false,

    revoked:
      false,

    expiredEvent:
      false,

    lastActivityAt:
      NOW,

    ...overrides
  };
}

function createHarness(
  canonical:
    OnboardingSessionTrustState =
      trustState()
) {
  const getBySessionId =
    vi.fn<
      Pick<
        OnboardingSessionRepository,
        "getBySessionId"
      >["getBySessionId"]
    >();

  getBySessionId.mockResolvedValue(
    canonical
  );

  const recordContactVerificationEvent =
    vi.fn<
      Pick<
        OnboardingSessionEventCommands,
        "recordContactVerificationEvent"
      >["recordContactVerificationEvent"]
    >();

  recordContactVerificationEvent
    .mockResolvedValue({
      eventId:
        "evt_session_factor_001",
      sessionId:
        AUTHORITY.sessionId,
      eventSeq:
        1,
      eventType:
        "EMAIL_VERIFIED",
      previousEventHash:
        "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      eventHash:
        "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      eventPayloadSha256:
        EMAIL_EVIDENCE,
      occurredAt:
        NOW,
      createdAt:
        NOW
    });

  const rotateToContactVerified =
    vi.fn<
      Pick<
        OnboardingSessionEventCommands,
        "rotateToContactVerified"
      >["rotateToContactVerified"]
    >();

  rotateToContactVerified
    .mockResolvedValue({
      sessionId:
        NEW_SESSION_ID,
      onboardingId:
        AUTHORITY.onboardingId,
      subjectId:
        AUTHORITY.subjectId,
      tokenSha256:
        ROTATED_TOKEN_SHA256,
      issuedState:
        "CONTACT_VERIFIED",
      issuedAt:
        NOW,
      absoluteExpiresAt:
        ABSOLUTE_EXPIRES_AT,
      rotatedFromSessionId:
        AUTHORITY.sessionId,
      createdAt:
        NOW
    });

  const clock =
    vi.fn<
      OnboardingContactVerificationDependencies[
        "clock"
      ]
    >();

  clock.mockReturnValue(
    new Date(NOW)
  );

  const uuidSource =
    vi.fn<
      OnboardingContactVerificationDependencies[
        "uuidSource"
      ]
    >();

  uuidSource.mockReturnValue(
    NEW_UUID
  );

  const tokenGenerator =
    vi.fn<
      OnboardingContactVerificationDependencies[
        "tokenGenerator"
      ]
    >();

  tokenGenerator.mockReturnValue({
    rawToken:
      ROTATED_RAW_TOKEN,
    tokenSha256:
      ROTATED_TOKEN_SHA256
  });

  const dependencies:
    OnboardingContactVerificationDependencies = {
      repository: {
        getBySessionId
      },

      eventCommands: {
        recordContactVerificationEvent,
        rotateToContactVerified
      },

      clock,
      uuidSource,
      tokenGenerator
    };

  const service =
    new OnboardingContactVerificationService(
      dependencies
    );

  return {
    service,
    getBySessionId,
    recordContactVerificationEvent,
    rotateToContactVerified,
    clock,
    uuidSource,
    tokenGenerator
  };
}

describe(
  "P003-D083R3R3 contact verification service",
  () => {
    it(
      "records minimized EMAIL_VERIFIED evidence against the server authority session",
      async () => {
        const harness =
          createHarness();

        await expect(
          harness.service.recordFactor(
            AUTHORITY,
            {
              factor:
                "EMAIL_VERIFIED",
              verificationEvidenceSha256:
                EMAIL_EVIDENCE
            }
          )
        ).resolves.toEqual({
          status:
            "FACTOR_RECORDED"
        });

        expect(
          harness.recordContactVerificationEvent
        ).toHaveBeenCalledWith({
          sessionId:
            AUTHORITY.sessionId,

          eventType:
            "EMAIL_VERIFIED",

          occurredAt:
            NOW,

          createdAt:
            NOW,

          payload: {
            kind:
              "HBCE_EMAIL_VERIFIED_V1",
            channel:
              "EMAIL_OTP",
            verificationEvidenceSha256:
              EMAIL_EVIDENCE
          }
        });

        expect(
          JSON.stringify(
            harness
              .recordContactVerificationEvent
              .mock.calls[0]?.[0]
              .payload
          )
        ).not.toContain(
          "test@example.com"
        );

        expect(
          harness.rotateToContactVerified
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "records minimized PHONE_VERIFIED evidence",
      async () => {
        const harness =
          createHarness();

        await expect(
          harness.service.recordFactor(
            AUTHORITY,
            {
              factor:
                "PHONE_VERIFIED",
              verificationEvidenceSha256:
                PHONE_EVIDENCE
            }
          )
        ).resolves.toEqual({
          status:
            "FACTOR_RECORDED"
        });

        expect(
          harness.recordContactVerificationEvent
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            eventType:
              "PHONE_VERIFIED",
            payload: {
              kind:
                "HBCE_PHONE_VERIFIED_V1",
              channel:
                "SMS_OTP",
              verificationEvidenceSha256:
                PHONE_EVIDENCE
            }
          })
        );
      }
    );

    it(
      "rejects non-STARTED authority before any dependency access",
      async () => {
        const harness =
          createHarness();

        const contactAuthority:
          OnboardingSessionAuthority = {
            ...AUTHORITY,
            issuedState:
              "CONTACT_VERIFIED"
          };

        await expect(
          harness.service.recordFactor(
            contactAuthority,
            {
              factor:
                "EMAIL_VERIFIED",
              verificationEvidenceSha256:
                EMAIL_EVIDENCE
            }
          )
        ).rejects.toMatchObject({
          code:
            "AUTHORITY_INVALID"
        });

        expect(
          harness.recordContactVerificationEvent
        ).not.toHaveBeenCalled();

        expect(
          harness.getBySessionId
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects invalid factor evidence before event append",
      async () => {
        const harness =
          createHarness();

        await expect(
          harness.service.recordFactor(
            AUTHORITY,
            {
              factor:
                "EMAIL_VERIFIED",
              verificationEvidenceSha256:
                "not-a-digest"
            }
          )
        ).rejects.toMatchObject({
          code:
            "FACTOR_DENIED"
        });

        expect(
          harness.recordContactVerificationEvent
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "reclassifies EVENT_COMMAND_DENIED as an already-recorded factor only from canonical readiness",
      async () => {
        const harness =
          createHarness(
            trustState({
              emailVerified:
                true
            })
          );

        harness
          .recordContactVerificationEvent
          .mockRejectedValue(
            new OnboardingSessionEventCommandError(
              "EVENT_COMMAND_DENIED",
              "denied"
            )
          );

        await expect(
          harness.service.recordFactor(
            AUTHORITY,
            {
              factor:
                "EMAIL_VERIFIED",
              verificationEvidenceSha256:
                EMAIL_EVIDENCE
            }
          )
        ).resolves.toEqual({
          status:
            "FACTOR_ALREADY_RECORDED"
        });

        expect(
          harness.getBySessionId
        ).toHaveBeenCalledWith(
          AUTHORITY.sessionId
        );
      }
    );

    it(
      "keeps EVENT_COMMAND_DENIED as FACTOR_DENIED when canonical duplicate evidence is absent",
      async () => {
        const harness =
          createHarness(
            trustState({
              emailVerified:
                false
            })
          );

        harness
          .recordContactVerificationEvent
          .mockRejectedValue(
            new OnboardingSessionEventCommandError(
              "EVENT_COMMAND_DENIED",
              "denied"
            )
          );

        await expect(
          harness.service.recordFactor(
            AUTHORITY,
            {
              factor:
                "EMAIL_VERIFIED",
              verificationEvidenceSha256:
                EMAIL_EVIDENCE
            }
          )
        ).rejects.toMatchObject({
          code:
            "FACTOR_DENIED"
        });
      }
    );

    it(
      "returns CONTACT_NOT_READY without token generation or rotation when either canonical factor is missing",
      async () => {
        const harness =
          createHarness(
            trustState({
              emailVerified:
                true,
              phoneVerified:
                false
            })
          );

        await expect(
          harness.service.finalizeContact(
            AUTHORITY
          )
        ).resolves.toEqual({
          status:
            "CONTACT_NOT_READY"
        });

        expect(
          harness.tokenGenerator
        ).not.toHaveBeenCalled();

        expect(
          harness.uuidSource
        ).not.toHaveBeenCalled();

        expect(
          harness.rotateToContactVerified
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "atomically requests CONTACT_VERIFIED rotation and returns only the new raw token",
      async () => {
        const harness =
          createHarness(
            trustState({
              emailVerified:
                true,
              phoneVerified:
                true
            })
          );

        const result =
          await harness.service
            .finalizeContact(
              AUTHORITY
            );

        expect(
          result
        ).toEqual({
          status:
            "CONTACT_VERIFIED",
          rawToken:
            ROTATED_RAW_TOKEN
        });

        expect(
          Object.keys(result).sort()
        ).toEqual([
          "rawToken",
          "status"
        ]);

        expect(
          harness.rotateToContactVerified
        ).toHaveBeenCalledWith({
          sourceSessionId:
            AUTHORITY.sessionId,

          newSessionId:
            NEW_SESSION_ID,

          newTokenSha256:
            ROTATED_TOKEN_SHA256,

          issuedAt:
            NOW,

          absoluteExpiresAt:
            ABSOLUTE_EXPIRES_AT,

          createdAt:
            NOW,

          contactVerifiedPayload: {
            kind:
              "HBCE_CONTACT_VERIFIED_V1"
          },

          rotatedPayload: {
            kind:
              "HBCE_CONTACT_VERIFIED_ROTATION_V1"
          },

          newSessionCreatedPayload: {
            kind:
              "HBCE_CONTACT_VERIFIED_SESSION_V1",
            issuedState:
              "CONTACT_VERIFIED"
          }
        });
      }
    );

    it(
      "does not map ROTATION_DENIED directly to CONTACT_NOT_READY",
      async () => {
        const preState =
          trustState({
            emailVerified:
              true,
            phoneVerified:
              true
          });

        const postState =
          trustState({
            emailVerified:
              true,
            phoneVerified:
              true
          });

        const harness =
          createHarness(
            preState
          );

        harness
          .getBySessionId
          .mockResolvedValueOnce(
            preState
          )
          .mockResolvedValueOnce(
            postState
          );

        harness
          .rotateToContactVerified
          .mockRejectedValue(
            new OnboardingSessionEventCommandError(
              "ROTATION_DENIED",
              "denied"
            )
          );

        await expect(
          harness.service.finalizeContact(
            AUTHORITY
          )
        ).rejects.toMatchObject({
          code:
            "FINALIZATION_DENIED"
        });

        expect(
          harness.getBySessionId
        ).toHaveBeenCalledTimes(
          2
        );
      }
    );

    it(
      "reclassifies ROTATION_DENIED as CONTACT_NOT_READY only after canonical post-read shows a missing factor",
      async () => {
        const preState =
          trustState({
            emailVerified:
              true,
            phoneVerified:
              true
          });

        const postState =
          trustState({
            emailVerified:
              true,
            phoneVerified:
              false
          });

        const harness =
          createHarness(
            preState
          );

        harness
          .getBySessionId
          .mockResolvedValueOnce(
            preState
          )
          .mockResolvedValueOnce(
            postState
          );

        harness
          .rotateToContactVerified
          .mockRejectedValue(
            new OnboardingSessionEventCommandError(
              "ROTATION_DENIED",
              "denied"
            )
          );

        await expect(
          harness.service.finalizeContact(
            AUTHORITY
          )
        ).resolves.toEqual({
          status:
            "CONTACT_NOT_READY"
        });
      }
    );

    it(
      "reclassifies a concurrent terminal transition after ROTATION_DENIED as AUTHORITY_INVALID",
      async () => {
        const preState =
          trustState({
            emailVerified:
              true,
            phoneVerified:
              true
          });

        const postState =
          trustState({
            emailVerified:
              true,
            phoneVerified:
              true,
            rotated:
              true
          });

        const harness =
          createHarness(
            preState
          );

        harness
          .getBySessionId
          .mockResolvedValueOnce(
            preState
          )
          .mockResolvedValueOnce(
            postState
          );

        harness
          .rotateToContactVerified
          .mockRejectedValue(
            new OnboardingSessionEventCommandError(
              "ROTATION_DENIED",
              "denied"
            )
          );

        await expect(
          harness.service.finalizeContact(
            AUTHORITY
          )
        ).rejects.toMatchObject({
          code:
            "AUTHORITY_INVALID"
        });
      }
    );

    it(
      "maps rotation EVENT_CONFLICT to FINALIZATION_DENIED",
      async () => {
        const harness =
          createHarness(
            trustState({
              emailVerified:
                true,
              phoneVerified:
                true
            })
          );

        harness
          .rotateToContactVerified
          .mockRejectedValue(
            new OnboardingSessionEventCommandError(
              "EVENT_CONFLICT",
              "conflict"
            )
          );

        await expect(
          harness.service.finalizeContact(
            AUTHORITY
          )
        ).rejects.toMatchObject({
          code:
            "FINALIZATION_DENIED"
        });
      }
    );

    it(
      "fails closed when canonical readiness cannot be read",
      async () => {
        const harness =
          createHarness();

        harness
          .getBySessionId
          .mockRejectedValue(
            new Error(
              "database unavailable"
            )
          );

        await expect(
          harness.service.finalizeContact(
            AUTHORITY
          )
        ).rejects.toBeInstanceOf(
          OnboardingContactVerificationServiceError
        );

        await expect(
          harness.service.finalizeContact(
            AUTHORITY
          )
        ).rejects.toMatchObject({
          code:
            "DEPENDENCY_FAILURE"
        });
      }
    );

    it(
      "rejects canonical identity mismatch as AUTHORITY_INVALID",
      async () => {
        const harness =
          createHarness(
            trustState({
              session: {
                ...trustState().session,
                subjectId:
                  "sub_other"
              }
            })
          );

        await expect(
          harness.service.finalizeContact(
            AUTHORITY
          )
        ).rejects.toMatchObject({
          code:
            "AUTHORITY_INVALID"
        });

        expect(
          harness.rotateToContactVerified
        ).not.toHaveBeenCalled();
      }
    );
  }
);
