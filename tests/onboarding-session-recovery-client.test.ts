import {
  describe,
  expect,
  it,
  vi
} from "vitest";

import {
  ONBOARDING_SESSION_RECOVERY_ENDPOINT,
  recoverOnboardingSessionOnce,
  runWithOnboardingSessionRecovery
} from "../lib/client/onboarding-session-recovery";

import type {
  OnboardingSessionOperation,
  OnboardingSessionRecoveryFetch
} from "../lib/client/onboarding-session-recovery";

function jsonResponse(
  payload: unknown,
  status: number
): Response {
  return new Response(
    JSON.stringify(payload),
    {
      status,

      headers: {
        "Content-Type":
          "application/json"
      }
    }
  );
}

function unauthorizedResponse():
  Response {
  return jsonResponse(
    {
      ok: false,
      reason:
        "SESSION_UNAUTHORIZED",
      message:
        "A valid onboarding session is required."
    },
    401
  );
}

describe(
  "P003-D10D4 recovery client",
  () => {
    it(
      "posts exactly one empty recovery request with same-origin credentials",
      async () => {
        const fetchMock =
          vi.fn<
            OnboardingSessionRecoveryFetch
          >()
            .mockResolvedValue(
              jsonResponse(
                {
                  ok: true,
                  recovery_status:
                    "recovered",
                  onboarding_status:
                    "started"
                },
                200
              )
            );

        const result =
          await recoverOnboardingSessionOnce(
            fetchMock
          );

        expect(result).toEqual({
          recovered: true,
          reason: null
        });

        expect(
          fetchMock
        ).toHaveBeenCalledTimes(1);

        expect(
          fetchMock
        ).toHaveBeenCalledWith(
          ONBOARDING_SESSION_RECOVERY_ENDPOINT,
          {
            method: "POST",
            credentials:
              "same-origin",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: "{}"
          }
        );
      }
    );

    it(
      "fails closed on a malformed 200 recovery payload",
      async () => {
        const fetchMock =
          vi.fn<
            OnboardingSessionRecoveryFetch
          >()
            .mockResolvedValue(
              jsonResponse(
                {
                  ok: true,
                  recovery_status:
                    "recovered",
                  onboarding_status:
                    "started",
                  unexpected: true
                },
                200
              )
            );

        await expect(
          recoverOnboardingSessionOnce(
            fetchMock
          )
        ).resolves.toEqual({
          recovered: false,
          reason:
            "RECOVERY_REQUEST_FAILED"
        });

        expect(
          fetchMock
        ).toHaveBeenCalledTimes(1);
      }
    );

    it.each(
      [
        [
          401,
          "SESSION_UNAUTHORIZED"
        ],
        [
          403,
          "REQUEST_FORBIDDEN"
        ],
        [
          409,
          "SESSION_NOT_RECOVERABLE"
        ],
        [
          503,
          "RECOVERY_DEPENDENCY_FAILURE"
        ]
      ] as const
    )(
      "does not retry recovery after HTTP %s",
      async (
        status,
        reason
      ) => {
        const fetchMock =
          vi.fn<
            OnboardingSessionRecoveryFetch
          >()
            .mockResolvedValue(
              jsonResponse(
                {
                  ok: false,
                  reason,
                  message:
                    "Recovery failed."
                },
                status
              )
            );

        await expect(
          recoverOnboardingSessionOnce(
            fetchMock
          )
        ).resolves.toEqual({
          recovered: false,
          reason
        });

        expect(
          fetchMock
        ).toHaveBeenCalledTimes(1);
      }
    );

    it(
      "does not retry recovery after a network failure",
      async () => {
        const fetchMock =
          vi.fn<
            OnboardingSessionRecoveryFetch
          >()
            .mockRejectedValue(
              new Error(
                "network unavailable"
              )
            );

        await expect(
          recoverOnboardingSessionOnce(
            fetchMock
          )
        ).resolves.toEqual({
          recovered: false,
          reason:
            "RECOVERY_NETWORK_FAILURE"
        });

        expect(
          fetchMock
        ).toHaveBeenCalledTimes(1);
      }
    );

    it(
      "does not attempt recovery for a non-401 operation response",
      async () => {
        const operation =
          vi.fn<
            OnboardingSessionOperation
          >()
            .mockResolvedValue(
              jsonResponse(
                {
                  ok: false,
                  reason:
                    "INVALID_EMAIL"
                },
                400
              )
            );

        const recoveryFetch =
          vi.fn<
            OnboardingSessionRecoveryFetch
          >();

        const result =
          await runWithOnboardingSessionRecovery(
            operation,
            "retry-after-recovery",
            recoveryFetch
          );

        expect(
          operation
        ).toHaveBeenCalledTimes(1);

        expect(
          recoveryFetch
        ).not.toHaveBeenCalled();

        expect(
          result.recoveryAttempted
        ).toBe(false);

        expect(
          result.retried
        ).toBe(false);
      }
    );

    it(
      "does not attempt recovery for a different 401 reason",
      async () => {
        const operation =
          vi.fn<
            OnboardingSessionOperation
          >()
            .mockResolvedValue(
              jsonResponse(
                {
                  ok: false,
                  reason:
                    "OTHER_UNAUTHORIZED"
                },
                401
              )
            );

        const recoveryFetch =
          vi.fn<
            OnboardingSessionRecoveryFetch
          >();

        const result =
          await runWithOnboardingSessionRecovery(
            operation,
            "retry-after-recovery",
            recoveryFetch
          );

        expect(
          operation
        ).toHaveBeenCalledTimes(1);

        expect(
          recoveryFetch
        ).not.toHaveBeenCalled();

        expect(
          result.recoveryAttempted
        ).toBe(false);
      }
    );

    it(
      "recovers once and retries a send operation exactly once",
      async () => {
        const operation =
          vi.fn<
            OnboardingSessionOperation
          >()
            .mockResolvedValueOnce(
              unauthorizedResponse()
            )
            .mockResolvedValueOnce(
              jsonResponse(
                {
                  ok: true
                },
                200
              )
            );

        const recoveryFetch =
          vi.fn<
            OnboardingSessionRecoveryFetch
          >()
            .mockResolvedValue(
              jsonResponse(
                {
                  ok: true,
                  recovery_status:
                    "recovered",
                  onboarding_status:
                    "started"
                },
                200
              )
            );

        const result =
          await runWithOnboardingSessionRecovery(
            operation,
            "retry-after-recovery",
            recoveryFetch
          );

        expect(
          operation
        ).toHaveBeenCalledTimes(2);

        expect(
          recoveryFetch
        ).toHaveBeenCalledTimes(1);

        expect(
          result.recoveryAttempted
        ).toBe(true);

        expect(
          result.recovered
        ).toBe(true);

        expect(
          result.retried
        ).toBe(true);

        expect(
          result.response.status
        ).toBe(200);
      }
    );

    it(
      "never performs a second recovery when the single send retry is also unauthorized",
      async () => {
        const operation =
          vi.fn<
            OnboardingSessionOperation
          >()
            .mockResolvedValueOnce(
              unauthorizedResponse()
            )
            .mockResolvedValueOnce(
              unauthorizedResponse()
            );

        const recoveryFetch =
          vi.fn<
            OnboardingSessionRecoveryFetch
          >()
            .mockResolvedValue(
              jsonResponse(
                {
                  ok: true,
                  recovery_status:
                    "recovered",
                  onboarding_status:
                    "started"
                },
                200
              )
            );

        const result =
          await runWithOnboardingSessionRecovery(
            operation,
            "retry-after-recovery",
            recoveryFetch
          );

        expect(
          operation
        ).toHaveBeenCalledTimes(2);

        expect(
          recoveryFetch
        ).toHaveBeenCalledTimes(1);

        expect(
          result.response.status
        ).toBe(401);
      }
    );

    it(
      "recovers verify authority without replaying the old session-bound challenge",
      async () => {
        const operation =
          vi.fn<
            OnboardingSessionOperation
          >()
            .mockResolvedValue(
              unauthorizedResponse()
            );

        const recoveryFetch =
          vi.fn<
            OnboardingSessionRecoveryFetch
          >()
            .mockResolvedValue(
              jsonResponse(
                {
                  ok: true,
                  recovery_status:
                    "recovered",
                  onboarding_status:
                    "started"
                },
                200
              )
            );

        const result =
          await runWithOnboardingSessionRecovery(
            operation,
            "recover-without-retry",
            recoveryFetch
          );

        expect(
          operation
        ).toHaveBeenCalledTimes(1);

        expect(
          recoveryFetch
        ).toHaveBeenCalledTimes(1);

        expect(
          result.recoveryAttempted
        ).toBe(true);

        expect(
          result.recovered
        ).toBe(true);

        expect(
          result.retried
        ).toBe(false);
      }
    );

    it(
      "does not retry the original operation when recovery fails",
      async () => {
        const operation =
          vi.fn<
            OnboardingSessionOperation
          >()
            .mockResolvedValue(
              unauthorizedResponse()
            );

        const recoveryFetch =
          vi.fn<
            OnboardingSessionRecoveryFetch
          >()
            .mockResolvedValue(
              jsonResponse(
                {
                  ok: false,
                  reason:
                    "SESSION_NOT_RECOVERABLE"
                },
                409
              )
            );

        const result =
          await runWithOnboardingSessionRecovery(
            operation,
            "retry-after-recovery",
            recoveryFetch
          );

        expect(
          operation
        ).toHaveBeenCalledTimes(1);

        expect(
          recoveryFetch
        ).toHaveBeenCalledTimes(1);

        expect(
          result.recovered
        ).toBe(false);

        expect(
          result.retried
        ).toBe(false);

        expect(
          result.recoveryFailureReason
        ).toBe(
          "SESSION_NOT_RECOVERABLE"
        );
      }
    );
  }
);
