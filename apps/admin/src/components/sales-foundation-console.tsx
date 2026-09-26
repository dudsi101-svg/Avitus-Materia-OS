'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

type Lead = { id: string; title?: string; status: string };
type Opportunity = { id: string; leadId: string; title: string; status: string };
type ProductOption = {
  code: string;
  name: string;
  dataType: 'NUMBER' | 'TEXT' | 'ENUM' | 'BOOLEAN';
  required: boolean;
  unit?: string;
  choices?: string[];
};
type Product = { id: string; name: string; sku: string; productType: string; options: ProductOption[] };
type Configuration = {
  id: string;
  opportunityId: string;
  status: string;
  currentVersion: number;
  versions: Array<{ versionNumber: number; readinessIssues: string[] }>;
};
type PriceCalculation = {
  id: string;
  configurationVersionNumber: number;
  currency: string;
  targetMarginBps: number;
  totalCost: string;
  recommendedPrice: string;
};
type Quote = {
  id: string;
  quoteNumber: string;
  status: string;
  currency: string;
  currentVersion: number;
  versions: Array<{
    versionNumber: number;
    configurationVersionNumber: number;
    total: string;
    estimatedCost: string;
    marginAmount: string;
  }>;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const userId = process.env.NEXT_PUBLIC_DEV_USER_ID ?? '';
const organizationId = process.env.NEXT_PUBLIC_ORGANIZATION_ID ?? '';

function apiHeaders(): HeadersInit {
  return {
    'content-type': 'application/json',
    'x-avitus-user-id': userId,
    'x-avitus-organization-id': organizationId,
  };
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { ...apiHeaders(), ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  const body = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message ?? `API ${response.status}`);
  return body;
}

export function SalesFoundationConsole() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedLead, setSelectedLead] = useState('');
  const [opportunityTitle, setOpportunityTitle] = useState('');
  const [selectedOpportunity, setSelectedOpportunity] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [configurationData, setConfigurationData] = useState<Record<string, unknown>>({});
  const [lastConfiguration, setLastConfiguration] = useState<Configuration | null>(null);
  const [materialCost, setMaterialCost] = useState('5000.0000');
  const [laborCost, setLaborCost] = useState('2000.0000');
  const [transportCost, setTransportCost] = useState('500.0000');
  const [targetMarginBps, setTargetMarginBps] = useState('4000');
  const [lastPrice, setLastPrice] = useState<PriceCalculation | null>(null);
  const [lastQuote, setLastQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [leadRows, opportunityRows, productRows] = await Promise.all([
      api<Lead[]>('/leads'),
      api<Opportunity[]>('/opportunities'),
      api<Product[]>('/catalog/products'),
    ]);
    setLeads(leadRows);
    setOpportunities(opportunityRows);
    setProducts(productRows);
    setSelectedLead((current) => current || leadRows[0]?.id || '');
    setSelectedOpportunity((current) => current || opportunityRows[0]?.id || '');
    setSelectedProduct((current) => current || productRows[0]?.id || '');
  }, []);

  useEffect(() => {
    load().catch((value: unknown) => setError(value instanceof Error ? value.message : 'Load failed'));
  }, [load]);

  const product = useMemo(
    () => products.find((item) => item.id === selectedProduct) ?? null,
    [products, selectedProduct],
  );

  useEffect(() => {
    setConfigurationData({});
    setLastConfiguration(null);
    setLastPrice(null);
    setLastQuote(null);
  }, [selectedProduct]);

  async function createOpportunity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api<Opportunity>('/opportunities', {
        method: 'POST',
        body: JSON.stringify({ leadId: selectedLead, title: opportunityTitle, currency: 'PLN', probability: 25 }),
      });
      setOpportunityTitle('');
      setSelectedOpportunity(created.id);
      await load();
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Opportunity creation failed');
    } finally {
      setBusy(false);
    }
  }

  async function createConfiguration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api<Configuration>('/configurations', {
        method: 'POST',
        body: JSON.stringify({
          opportunityId: selectedOpportunity,
          productId: selectedProduct,
          configurationData,
          reason: 'Created from admin Command Center',
        }),
      });
      setLastConfiguration(created);
      setLastPrice(null);
      setLastQuote(null);
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Configuration creation failed');
    } finally {
      setBusy(false);
    }
  }

  async function createPriceCalculation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lastConfiguration) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api<PriceCalculation>('/pricing/calculations', {
        method: 'POST',
        body: JSON.stringify({
          configurationId: lastConfiguration.id,
          currency: 'PLN',
          targetMarginBps: Number(targetMarginBps),
          components: [
            { componentType: 'MATERIAL', label: 'Materiał', amount: materialCost },
            { componentType: 'LABOR', label: 'Robocizna', amount: laborCost },
            { componentType: 'TRANSPORT', label: 'Transport', amount: transportCost },
          ],
        }),
      });
      setLastPrice(created);
      setLastQuote(null);
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Price calculation failed');
    } finally {
      setBusy(false);
    }
  }

  async function createQuote() {
    if (!lastConfiguration || !lastPrice) return;
    setBusy(true);
    setError(null);
    try {
      const created = await api<Quote>('/quotes', {
        method: 'POST',
        body: JSON.stringify({
          opportunityId: lastConfiguration.opportunityId,
          configurationId: lastConfiguration.id,
          priceCalculationId: lastPrice.id,
        }),
      });
      setLastQuote(created);
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Quote creation failed');
    } finally {
      setBusy(false);
    }
  }

  function updateOption(option: ProductOption, rawValue: string, checked?: boolean) {
    setConfigurationData((current) => {
      const next = { ...current };
      if (option.dataType === 'BOOLEAN') next[option.code] = Boolean(checked);
      else if (rawValue === '') delete next[option.code];
      else if (option.dataType === 'NUMBER') next[option.code] = Number(rawValue);
      else next[option.code] = rawValue;
      return next;
    });
  }

  return (
    <section className="salesSection">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Sprint 1–2 · Sales & pricing foundation</p>
          <h2>Lead → Opportunity → Configuration → Pricing → Quote</h2>
        </div>
        <button className="secondary" onClick={() => load().catch(() => setError('Refresh failed'))}>
          Odśwież dane
        </button>
      </div>

      <div className="grid">
        <article className="panel">
          <h3>Nowa szansa sprzedażowa</h3>
          <form className="form" onSubmit={createOpportunity}>
            <label>
              Lead
              <select value={selectedLead} onChange={(event) => setSelectedLead(event.target.value)}>
                <option value="">Wybierz lead</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>{lead.title ?? lead.id} · {lead.status}</option>
                ))}
              </select>
            </label>
            <label>
              Nazwa szansy
              <input value={opportunityTitle} onChange={(event) => setOpportunityTitle(event.target.value)} placeholder="Stół dębowy — projekt salonu" />
            </label>
            <button disabled={busy || !selectedLead || !opportunityTitle.trim()} type="submit">Utwórz Opportunity</button>
          </form>
        </article>

        <article className="panel">
          <h3>Konfiguracja produktu</h3>
          <form className="form" onSubmit={createConfiguration}>
            <label>
              Opportunity
              <select value={selectedOpportunity} onChange={(event) => setSelectedOpportunity(event.target.value)}>
                <option value="">Wybierz opportunity</option>
                {opportunities.map((opportunity) => (
                  <option key={opportunity.id} value={opportunity.id}>{opportunity.title} · {opportunity.status}</option>
                ))}
              </select>
            </label>
            <label>
              Produkt
              <select value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)}>
                <option value="">Wybierz produkt</option>
                {products.map((item) => (
                  <option key={item.id} value={item.id}>{item.name} · {item.sku}</option>
                ))}
              </select>
            </label>

            {product?.options.map((option) => (
              <label key={option.code}>
                {option.name}{option.required ? ' *' : ''}{option.unit ? ` (${option.unit})` : ''}
                {option.dataType === 'ENUM' ? (
                  <select value={String(configurationData[option.code] ?? '')} onChange={(event) => updateOption(option, event.target.value)}>
                    <option value="">Wybierz</option>
                    {option.choices?.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
                  </select>
                ) : option.dataType === 'BOOLEAN' ? (
                  <input type="checkbox" checked={Boolean(configurationData[option.code])} onChange={(event) => updateOption(option, '', event.target.checked)} />
                ) : (
                  <input
                    type={option.dataType === 'NUMBER' ? 'number' : 'text'}
                    value={String(configurationData[option.code] ?? '')}
                    onChange={(event) => updateOption(option, event.target.value)}
                  />
                )}
              </label>
            ))}

            <button disabled={busy || !selectedOpportunity || !selectedProduct} type="submit">Zapisz Configuration v1</button>
          </form>

          {lastConfiguration ? (
            <div className="resultBox">
              <strong>{lastConfiguration.status}</strong>
              <span>wersja {lastConfiguration.currentVersion}</span>
              <small>{lastConfiguration.versions.at(-1)?.readinessIssues.join(', ') || 'Gotowa do wyceny'}</small>
            </div>
          ) : null}
        </article>
      </div>

      <div className="commercialFlow">
        <article className="panel">
          <h3>Kalkulacja ceny</h3>
          <p className="muted">Koszty są zapisywane jako dane historyczne. Cena jest przypięta do konkretnej wersji konfiguracji.</p>
          <form className="form" onSubmit={createPriceCalculation}>
            <label>Materiał PLN<input value={materialCost} onChange={(event) => setMaterialCost(event.target.value)} inputMode="decimal" /></label>
            <label>Robocizna PLN<input value={laborCost} onChange={(event) => setLaborCost(event.target.value)} inputMode="decimal" /></label>
            <label>Transport PLN<input value={transportCost} onChange={(event) => setTransportCost(event.target.value)} inputMode="decimal" /></label>
            <label>Docelowa marża (bps)<input value={targetMarginBps} onChange={(event) => setTargetMarginBps(event.target.value)} inputMode="numeric" /></label>
            <button disabled={busy || lastConfiguration?.status !== 'READY_FOR_PRICING'} type="submit">Przelicz cenę</button>
          </form>
          {lastPrice ? (
            <div className="resultBox">
              <strong>{lastPrice.recommendedPrice} {lastPrice.currency}</strong>
              <span>koszt {lastPrice.totalCost}</span>
              <small>Konfiguracja v{lastPrice.configurationVersionNumber} · marża {lastPrice.targetMarginBps / 100}%</small>
            </div>
          ) : null}
        </article>

        <article className="panel">
          <h3>Draft oferty</h3>
          <p className="muted">Sprint 2 tworzy wewnętrzny DRAFT. Wysłanie, VAT, rabaty i akceptacja klienta będą kontrolowanymi kolejnymi etapami.</p>
          <button disabled={busy || !lastPrice || !lastConfiguration} onClick={createQuote} type="button">Utwórz Quote v1</button>
          {lastQuote ? (
            <div className="resultBox">
              <strong>{lastQuote.quoteNumber}</strong>
              <span>{lastQuote.status}</span>
              <small>
                v{lastQuote.currentVersion} · {lastQuote.versions.at(-1)?.total} {lastQuote.currency} · marża {lastQuote.versions.at(-1)?.marginAmount}
              </small>
            </div>
          ) : null}
        </article>
      </div>

      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
