export function PlannerSkeleton() {
  return (
    <div className="app-shell" aria-busy="true">
      <aside className="sidebar" aria-hidden="true">
        <span className="brand">Training planner</span>
        <span className="section-kicker">ESPACIO DE ENTRENAMIENTO</span>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <span className="mobile-brand">Training planner</span>
          <p role="status">Recuperando tu sesión…</p>
        </header>
        <section className="view-section">
          <div className="page-heading">
            <h1>Mi semana.</h1>
          </div>
          <div
            className="planner-placeholder progress-panel"
            aria-hidden="true"
          />
          <div className="kpi-grid" aria-hidden="true">
            {[0, 1, 2, 3].map((index) => (
              <div className="planner-placeholder kpi-card" key={index} />
            ))}
          </div>
          <p>Preparando tu calendario y tus entrenamientos.</p>
        </section>
      </main>
    </div>
  );
}
