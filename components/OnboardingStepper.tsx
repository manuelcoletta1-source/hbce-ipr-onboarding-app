import Link from "next/link";

import { ONBOARDING_STEPS } from "@/lib/constants";
import type { OnboardingStep } from "@/lib/types";

import { StatusBadge } from "@/components/StatusBadge";

type OnboardingStepperProps = {
  currentStep?: OnboardingStep;
};

function getStepState(
  step: OnboardingStep,
  currentStep: OnboardingStep | undefined,
  index: number
): "completed" | "current" | "pending" {
  if (!currentStep) {
    return index === 0 ? "current" : "pending";
  }

  const currentIndex = ONBOARDING_STEPS.findIndex(
    (item) => item.id === currentStep
  );

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

export function OnboardingStepper({ currentStep }: OnboardingStepperProps) {
  return (
    <div className="hbce-stepper">
      {ONBOARDING_STEPS.map((step, index) => {
        const state = getStepState(step.id, currentStep, index);

        return (
          <Link className="hbce-step" href={step.route} key={step.id}>
            <span className="hbce-step__number">{step.number}</span>

            <span>
              <span className="hbce-step__title">{step.title}</span>
              <span className="hbce-step__text">{step.purpose}</span>
            </span>

            <StatusBadge
              status={
                state === "completed"
                  ? "approved"
                  : state === "current"
                    ? "in_progress"
                    : "pending"
              }
              label={
                state === "completed"
                  ? "Completed"
                  : state === "current"
                    ? "Current"
                    : "Pending"
              }
            />
          </Link>
        );
      })}
    </div>
  );
}
