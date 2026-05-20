import Link from "next/link";

import { ONBOARDING_STEPS } from "@/lib/constants";
import type { OnboardingStep } from "@/lib/types";

import { StatusBadge } from "@/components/StatusBadge";

type OnboardingStepperProps = {
  currentStep?: OnboardingStep;
};

type StepState = "completed" | "current" | "pending" | "blocked";

function getCurrentStepIndex(currentStep: OnboardingStep | undefined): number {
  if (!currentStep) {
    return 0;
  }

  return ONBOARDING_STEPS.findIndex((item) => item.id === currentStep);
}

function getStepState(
  step: OnboardingStep,
  currentStep: OnboardingStep | undefined,
  index: number
): StepState {
  if (currentStep === "completed") {
    return "completed";
  }

  if (currentStep === "blocked") {
    return index === ONBOARDING_STEPS.length - 1 ? "blocked" : "pending";
  }

  const currentIndex = getCurrentStepIndex(currentStep);

  if (currentIndex === -1) {
    return index === 0 ? "current" : "pending";
  }

  if (step === currentStep) {
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
  return (
    <div className="hbce-stepper" aria-label="IPR onboarding sequence">
      {ONBOARDING_STEPS.map((step, index) => {
        const state = getStepState(step.id, currentStep, index);
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

            <StatusBadge status={getBadgeStatus(state)} label={getBadgeLabel(state)} />
          </Link>
        );
      })}
    </div>
  );
}
