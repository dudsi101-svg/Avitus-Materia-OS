import { LeadConsole } from '../components/lead-console';
import { SalesFoundationConsole } from '../components/sales-foundation-console';

export default function HomePage() {
  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Avitus Materia OS · Sprint 1</p>
          <h1>Command Center</h1>
          <p>Sales source of truth: Lead → Opportunity → Product → Configuration.</p>
        </div>
        <span className="status">Sales foundation</span>
      </header>
      <LeadConsole />
      <SalesFoundationConsole />
    </main>
  );
}
