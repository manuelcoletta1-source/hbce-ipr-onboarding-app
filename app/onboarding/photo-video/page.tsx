import Link from "next/link";

import { ROUTES, SECURITY_BOUNDARY_TEXT } from "@/lib/constants";

import { BoundaryNotice } from "@/components/BoundaryNotice";
import { OnboardingStepper } from "@/components/OnboardingStepper";
import { StatusBadge } from "@/components/StatusBadge";

const PHOTO_VIDEO_STATE_ITEMS = [
  {
    label: "Photo evidence",
    status: "submitted"
  },
  {
    label: "Video evidence",
    status: "submitted"
  },
  {
    label: "Liveness state",
    status: "manual_review"
  },
  {
    label: "IPR Verified",
    status: "denied"
  },
  {
    label: "JOKER-C2 access",
    status: "denied"
  }
] as const;

const PHOTO_VIDEO_BOUNDARIES = [
  "Real photos must not be committed to this repository.",
  "Real videos must not be committed to this repository.",
  "Biometric templates must not be stored in public routes.",
  "Face templates must not be generated or exposed by this MVP page.",
  "Liveness recordings must remain in protected processing environments.",
  "Photo/video verification prepares review only.",
  "Photo/video verification does not issue IPR Verified status.",
  "Photo/video verification does not issue an IPR Card.",
  "Photo/video verification does not activate the operational certificate.",
  "JOKER-C2 access remains denied by default."
] as const;

const PHOTO_VIDEO_EVIDENCE_ITEMS = [
  "Protected photo reference",
  "Protected video reference",
  "Photo SHA-256 reference",
  "Video SHA-256 reference",
  "Photo verification status",
  "Video verification status",
  "Liveness review status",
  "Manual review requirement"
] as const;

const PHOTO_VIDEO_REVIEW_RULES = [
  "The subject must already have completed fiscal identity evidence.",
  "The subject must already have submitted official identity document evidence.",
  "The photo reference must point to protected storage in production.",
  "The video reference must point to protected storage in production.",
  "The liveness state must remain pending or under manual review until operator validation.",
  "The onboarding case can move to privacy and compliance, but cannot self-approve."
] as const;

export default function OnboardingPhotoVideoPage() {
  return (
    <div className="hbce-container">
      <section className="hbce-hero">
        <p className="hbce-kicker">Step 04 · Photo / Video Liveness</p>

        <h1 className="hbce-title">
          Prepare photo, video and liveness verification state.
        </h1>

        <p className="hbce-lead">
          This page prepares the photo/video evidence layer required before
          privacy compliance and HBCE review. The MVP does not process real
          photos, real videos, biometric templates, face templates or production
          liveness recordings.
        </p>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--2">
          <div className="hbce-card">
            <p className="hbce-kicker">Verification evidence</p>
            <h2>Prepare protected photo/video metadata</h2>

            <p>
              In production, this step must connect to protected storage,
              authorized verification providers and lawful identity verification
              workflows. In this MVP, the page records only the operational
              metadata required to prepare the onboarding case for the next
              certificate phase.
            </p>

            <form className="hbce-form">
              <div className="hbce-field">
                <label className="hbce-label" htmlFor="photo_reference">
                  Protected photo reference
                </label>
                <input
                  autoComplete="off"
                  className="hbce-input hbce-mono"
                  id="photo_reference"
                  name="photo_reference"
                  placeholder="protected_photo_reference_demo"
                  type="text"
                />
              </div>

              <div className="hbce-field">
                <label className="hbce-label" htmlFor="video_reference">
                  Protected video reference
                </label>
                <input
                  autoComplete="off"
                  className="hbce-input hbce-mono"
                  id="video_reference"
                  name="video_reference"
                  placeholder="protected_video_reference_demo"
                  type="text"
                />
              </div>

              <div className="hbce-grid hbce-grid--2">
                <div className="hbce-field">
                  <label className="hbce-label" htmlFor="photo_hash">
                    Photo SHA-256 reference
                  </label>
                  <input
                    autoComplete="off"
                    className="hbce-input hbce-mono"
                    id="photo_hash"
                    name="photo_hash"
                    placeholder="sha256_demo_photo_hash"
                    type="text"
                  />
                </div>

                <div className="hbce-field">
                  <label className="hbce-label" htmlFor="video_hash">
                    Video SHA-256 reference
                  </label>
                  <input
                    autoComplete="off"
                    className="hbce-input hbce-mono"
                    id="video_hash"
                    name="video_hash"
                    placeholder="sha256_demo_video_hash"
                    type="text"
                  />
                </div>
              </div>

              <div className="hbce-grid hbce-grid--2">
                <div className="hbce-field">
                  <label
                    className="hbce-label"
                    htmlFor="photo_verification_status"
                  >
                    Photo verification status
                  </label>
                  <select
                    className="hbce-select"
                    id="photo_verification_status"
                    name="photo_verification_status"
                  >
                    <option value="submitted">Submitted</option>
                    <option value="manual_review">Manual review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="hbce-field">
                  <label
                    className="hbce-label"
                    htmlFor="video_verification_status"
                  >
                    Video verification status
                  </label>
                  <select
                    className="hbce-select"
                    id="video_verification_status"
                    name="video_verification_status"
                  >
                    <option value="submitted">Submitted</option>
                    <option value="manual_review">Manual review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div className="hbce-field">
                <label className="hbce-label" htmlFor="liveness_status">
                  Liveness review status
                </label>
                <select
                  className="hbce-select"
                  id="liveness_status"
                  name="liveness_status"
                >
                  <option value="manual_review">Manual review</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <BoundaryNotice title="Manual review required" tone="warning">
                Photo/video metadata can prepare the onboarding case for privacy
                and HBCE review, but it cannot self-approve the subject, issue
                IPR Verified status, issue an IPR Card or unlock JOKER-C2
                access.
              </BoundaryNotice>

              <div className="hbce-actions">
                <Link className="hbce-btn" href={ROUTES.onboardingDocuments}>
                  Back to Official ID Document
                </Link>

                <Link
                  className="hbce-btn hbce-btn--primary"
                  href={ROUTES.onboardingPhase5}
                >
                  Continue to Privacy & Compliance
                </Link>
              </div>
            </form>
          </div>

          <div className="hbce-card hbce-card--soft">
            <p className="hbce-kicker">Verification state</p>
            <h2>Photo/video verification prepares review, not access.</h2>

            <p>
              Photo and video verification are evidence preparation layers. They
              do not directly issue IPR Verified status, issue the IPR Card,
              activate the operational certificate or grant access to JOKER-C2.
            </p>

            <div className="hbce-card-preview__meta">
              {PHOTO_VIDEO_STATE_ITEMS.map((item) => (
                <div className="hbce-meta" key={item.label}>
                  <span className="hbce-meta__label">{item.label}</span>
                  <span className="hbce-meta__value">
                    <StatusBadge status={item.status} />
                  </span>
                </div>
              ))}
            </div>

            <div className="hbce-divider" />

            <h3>Expected evidence layer</h3>
            <ul className="hbce-list">
              {PHOTO_VIDEO_EVIDENCE_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <div className="hbce-divider" />

            <h3>Review rules</h3>
            <ul className="hbce-list">
              {PHOTO_VIDEO_REVIEW_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>

            <div className="hbce-divider" />

            <h3>Security boundaries</h3>
            <ul className="hbce-list">
              {PHOTO_VIDEO_BOUNDARIES.map((boundary) => (
                <li key={boundary}>{boundary}</li>
              ))}
            </ul>

            <div className="hbce-divider" />

            <BoundaryNotice title="Photo / video security boundary" tone="danger">
              {SECURITY_BOUNDARY_TEXT} Real photos, real videos, biometric
              templates, liveness recordings and face templates must not be
              committed to this repository or exposed in public routes.
            </BoundaryNotice>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-card">
          <h2>Current onboarding position</h2>
          <OnboardingStepper currentStep="phase_4_liveness" />
        </div>
      </section>
    </div>
  );
}
