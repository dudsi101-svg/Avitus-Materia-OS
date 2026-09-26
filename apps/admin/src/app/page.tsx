import { LeadConsole } from '../components/lead-console';

export default function HomePage() {
  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Avitus Materia OS · Sprint 0</p>
          <h1>Command Center</h1>
          <p>Vertical slice: organization context → Lead → audit + domain event.</p>
        </div>
        <span className="status">Foundation</span>
      </header>
      <LeadConsole />
    </main>
  );
}
