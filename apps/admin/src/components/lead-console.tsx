'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

type Lead = {
  id: string;
  title?: string;
  source?: string;
  status: string;
  priority: string;
  createdAt: string;
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

export function LeadConsole() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('WEBSITE');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`${apiUrl}/leads`, { headers: headers(), cache: 'no-store' });
    if (!response.ok) throw new Error(`API ${response.status}`);
    setLeads((await response.json()) as Lead[]);
  }, []);

  useEffect(() => {
    load().catch((value: unknown) => setError(value instanceof Error ? value.message : 'Load failed'));
  }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/leads`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ title, source, priority: 'NORMAL' }),
      });
      const body = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? `API ${response.status}`);
      setTitle('');
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid">
      <article className="panel">
        <h2>Nowy lead</h2>
        <p className="muted">Organizacja: {organizationId || 'brak konfiguracji'}</p>
        <form onSubmit={submit} className="form">
          <label>
            Nazwa / potrzeba
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Stół dębowy 240 cm" />
          </label>
          <label>
            Źródło
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              <option>WEBSITE</option>
              <option>TIKTOK</option>
              <option>INSTAGRAM</option>
              <option>GOOGLE</option>
              <option>REFERRAL</option>
            </select>
          </label>
          <button type="submit" disabled={busy || !title.trim()}>
            {busy ? 'Zapisywanie…' : 'Utwórz lead'}
          </button>
          {error ? <p className="error">{error}</p> : null}
        </form>
      </article>

      <article className="panel">
        <div className="row">
          <h2>Leady</h2>
          <button className="secondary" onClick={() => load().catch(() => setError('Refresh failed'))}>
            Odśwież
          </button>
        </div>
        <div className="leadList">
          {leads.length === 0 ? <p className="muted">Brak leadów.</p> : null}
          {leads.map((lead) => (
            <div className="lead" key={lead.id}>
              <div>
                <strong>{lead.title ?? 'Bez nazwy'}</strong>
                <p>{lead.source ?? 'UNKNOWN'} · {lead.status}</p>
              </div>
              <span>{lead.priority}</span>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
