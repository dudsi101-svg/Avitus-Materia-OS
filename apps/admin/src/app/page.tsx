import { LeadConsole } from '../components/lead-console';
import { SalesFoundationConsole } from '../components/sales-foundation-console';

export default function HomePage() {
  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Avitus Materia OS · Sprint 2</p>
          <h1>Command Center</h1>
          <p>Commercial source of truth: Lead → Opportunity → Configuration → Pricing → Draft Quote.</p>
        </div>
        <span className="status">Commercial foundation</span>
      </header>
      <LeadConsole />
      <SalesFoundationConsole />
    </main>
  );
}
