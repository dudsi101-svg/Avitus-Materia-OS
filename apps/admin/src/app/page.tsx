import { ConfigurationRequestConsole } from '../components/configuration-request-console';
import { CustomerConsole } from '../components/customer-console';
import { LeadConsole } from '../components/lead-console';
import { SalesFoundationConsole } from '../components/sales-foundation-console';

export default function HomePage() {
  return (
    <main className="shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Avitus Materia OS · Sprint 7</p>
          <h1>Command Center</h1>
          <p>
            Commercial source of truth: Kreator → Lead → CustomerAccount → Opportunity → Configuration → Pricing → Draft Quote.
          </p>
        </div>
        <span className="status">Tożsamość klienta</span>
      </header>
      <ConfigurationRequestConsole />
      <LeadConsole />
      <CustomerConsole />
      <SalesFoundationConsole />
    </main>
  );
}
