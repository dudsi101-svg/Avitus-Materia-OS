'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

type Lead = { id: string; title?: string; status: string };
type Opportunity = { id: string; title: string; status: string };
type Customer = {
  id: string;
  accountType: string;
  status: string;
  subject: { kind: 'PERSON' | 'COMPANY'; displayName: string };
  contacts: Array<{ contactType: string; value: string; isPrimary: boolean }>;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const userId = process.env.NEXT_PUBLIC_DEV_USER_ID ?? '';
const organizationId = process.env.NEXT_PUBLIC_ORGANIZATION_ID ?? '';

function headers(): HeadersInit {
  return {
    'content-type': 'application/json',
    'x-avitus-user-id': userId,
    'x-avitus-organization-id': organizationId,
  };
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  const body = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message ?? `API ${response.status}`);
  return body;
}

export function CustomerConsole() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedLead, setSelectedLead] = useState('');
  const [selectedOpportunity, setSelectedOpportunity] = useState('');
  const [lastCreated, setLastCreated] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [customerRows, leadRows, opportunityRows] = await Promise.all([
      api<Customer[]>('/customers'),
      api<Lead[]>('/leads'),
      api<Opportunity[]>('/opportunities'),
    ]);
    setCustomers(customerRows);
    setLeads(leadRows);
    setOpportunities(opportunityRows);
    setSelectedLead((current) => current || leadRows[0]?.id || '');
    setSelectedOpportunity((current) => current || opportunityRows[0]?.id || '');
  }, []);

  useEffect(() => {
    load().catch((value: unknown) => setError(value instanceof Error ? value.message : 'Customer load failed'));
  }, [load]);

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const contacts = [
        { contactType: 'EMAIL', value: email, isPrimary: true },
        ...(phone.trim() ? [{ contactType: 'PHONE', value: phone, isPrimary: true }] : []),
      ];
      const customer = await api<Customer>('/customers/person-accounts', {
        method: 'POST',
        body: JSON.stringify({ firstName, lastName, contacts }),
      });
      if (selectedLead) {
        await api(`/customers/${customer.id}/link/lead/${selectedLead}`, { method: 'POST' });
      }
      if (selectedOpportunity) {
        await api(`/customers/${customer.id}/link/opportunity/${selectedOpportunity}`, { method: 'POST' });
      }
      setLastCreated(customer);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Customer creation failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="salesSection">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Sprint 4 · Customer identity</p>
          <h2>Kto faktycznie kupuje?</h2>
          <p className="muted">Kontakt klienta staje się trwałą daną biznesową, a nie tekstem ukrytym w leadzie lub wiadomości.</p>
        </div>
        <button className="secondary" onClick={() => load().catch(() => setError('Refresh failed'))}>Odśwież</button>
      </div>

      <div className="grid">
        <article className="panel">
          <h3>Nowe konto klienta B2C</h3>
          <form className="form" onSubmit={createCustomer}>
            <label>Imię<input value={firstName} onChange={(event) => setFirstName(event.target.value)} /></label>
            <label>Nazwisko<input value={lastName} onChange={(event) => setLastName(event.target.value)} /></label>
            <label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="klient@example.com" /></label>
            <label>Telefon międzynarodowy<input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+48 501 234 567" /></label>
            <label>
              Powiąż z Lead
              <select value={selectedLead} onChange={(event) => setSelectedLead(event.target.value)}>
                <option value="">Bez powiązania</option>
                {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.title ?? lead.id} · {lead.status}</option>)}
              </select>
            </label>
            <label>
              Powiąż z Opportunity
              <select value={selectedOpportunity} onChange={(event) => setSelectedOpportunity(event.target.value)}>
                <option value="">Bez powiązania</option>
                {opportunities.map((opportunity) => <option key={opportunity.id} value={opportunity.id}>{opportunity.title} · {opportunity.status}</option>)}
              </select>
            </label>
            <button disabled={busy || !firstName.trim() || !lastName.trim() || !email.trim()} type="submit">Utwórz i powiąż klienta</button>
          </form>
          {lastCreated ? <div className="resultBox"><strong>{lastCreated.subject.displayName}</strong><span>{lastCreated.status}</span><small>CustomerAccount {lastCreated.id.slice(0, 8)}</small></div> : null}
        </article>

        <article className="panel">
          <h3>Rejestr klientów</h3>
          <div className="leadList">
            {customers.length === 0 ? <p className="muted">Brak kont klientów.</p> : customers.map((customer) => (
              <div className="lead" key={customer.id}>
                <div>
                  <strong>{customer.subject.displayName}</strong>
                  <p>{customer.accountType} · {customer.contacts.find((contact) => contact.isPrimary)?.value ?? 'brak kontaktu'}</p>
                </div>
                <span>{customer.status}</span>
              </div>
            ))}
          </div>
        </article>
      </div>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
