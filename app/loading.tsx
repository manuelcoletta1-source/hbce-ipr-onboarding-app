export default function LoadingPage() {
  return (
    <div className="hbce-container">
      <section className="hbce-hero" aria-busy="true" aria-live="polite">
        <p className="hbce-kicker">Loading operational gateway</p>

        <h1 className="hbce-title">Preparing the IPR onboarding route.</h1>

        <p className="hbce-lead">
          HBCE IPR Onboarding App is loading the requested operational identity
          surface. The runtime remains fail-closed while the route is being
          prepared.
        </p>
      </section>

      <section className="hbce-section">
        <div className="hbce-grid hbce-grid--3">
          <div className="hbce-card">
            <h2>Identity state</h2>
            <p>
              Operational identity state is not assumed during loading. Verified
              IPR status must be explicitly evaluated.
            </p>
          </div>

          <div className="hbce-card">
            <h2>Access state</h2>
            <p>
              JOKER-C2 access remains denied by default until verified IPR,
              issued IPR Card, active certificate and clear revocation state are
              present.
            </p>
          </div>

          <div className="hbce-card">
            <h2>Security state</h2>
            <p>
              Loading state does not authorize runtime access, certificate
              activation or operational identity issuance.
            </p>
          </div>
        </div>
      </section>

      <section className="hbce-section">
        <div className="hbce-notice" role="status">
          <strong>Fail-closed loading boundary</strong>
          <div className="hbce-small" style={{ marginTop: "8px" }}>
            The interface is loading. No operational access decision is created
            from a loading state.
          </div>
        </div>
      </section>
    </div>
  );
}
