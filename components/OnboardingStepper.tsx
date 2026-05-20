import Link from "next/link";

import { ONBOARDING_STEPS } from "@/lib/constants";
import type { OnboardingStep } from "@/lib/types";

import { StatusBadge } from "@/components/StatusBadge";

type OnboardingStepperProps = {
  currentStep?: OnboardingStep;
};

type StepState = "completed" | "current" | "pending" | "blocked";

function normalizeCurrentStep(
  currentStep: OnboardingStep | undefined
): OnboardingStep | undefined {
  if (!currentStep) {
    return undefined;
  }

  switch (currentStep) {
    case "start":
      return "phase_1_subject";
    case "identity":
      return "phase_1_subject";
    case "fiscal":
      return "phase_2_fiscal_identity";
    case "documents":
      return "phase_3_official_document";
    case "photo_video":
      return "phase_4_liveness";
    case "review":
      return "phase_6_review_pending";
    case "ipr_card":
      return "phase_8_ipr_card";
    case "certificate":
      return "phase_9_operational_certificate";
    default:
      return currentStep;
  }
}

function getCurrentStepIndex(currentStep: OnboardingStep | undefined): number {
  const normalizedStep = normalizeCurrentStep(currentStep);

  if (!normalizedStep) {
    return 0;
  }

  return ONBOARDING_STEPS.findIndex((item) => item.id === normalizedStep);
}

function getStepState(
  step: OnboardingStep,
  currentStep: OnboardingStep | undefined,
  index: number
): StepState {
  const normalizedStep = normalizeCurrentStep(currentStep);

  if (normalizedStep === "completed") {
    return "completed";
  }

  if (normalizedStep === "blocked") {
    return index === ONBOARDING_STEPS.length - 1 ? "blocked" : "pending";
  }

  const currentIndex = getCurrentStepIndex(normalizedStep);

  if (currentIndex === -1) {
    return index === 0 ? "current" : "pending";
  }

  if (step === normalizedStep) {
    return "current";
  }

  if (index < currentIndex) {
    return "completed";
  }

  return "pending";
}

function getBadgeStatus(state: StepState) {
  if (state === "completed") {
    return "approved";
  }

  if (state === "current") {
    return "in_progress";
  }

  if (state === "blocked") {
    return "rejected";
  }

  return "pending";
}

function getBadgeLabel(state: StepState): string {
  if (state === "completed") {
    return "Completed";
  }

  if (state === "current") {
    return "Current";
  }

  if (state === "blocked") {
    return "Blocked";
  }

  return "Pending";
}

export function OnboardingStepper({ currentStep }: OnboardingStepperProps) {
  const normalizedStep = normalizeCurrentStep(currentStep);

  return (
    <div className="hbce-stepper" aria-label="HBCE IPR certificate chain">
      {ONBOARDING_STEPS.map((step, index) => {
        const state = getStepState(step.id, normalizedStep, index);
        const isCurrent = state === "current";

        return (
          <Link
            aria-current={isCurrent ? "step" : undefined}
            className={`hbce-step hbce-step--${state}`}
            href={step.route}
            key={step.id}
          >
            <span className="hbce-step__number">{step.number}</span>

            <span>
              <span className="hbce-step__title">{step.title}</span>
              <span className="hbce-step__text">{step.purpose}</span>
            </span>

            <StatusBadge
              status={getBadgeStatus(state)}
              label={getBadgeLabel(state)}
            />
          </Link>
        );
      })}
    </div>
  );
}
