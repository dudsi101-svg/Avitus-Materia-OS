'use client';

import { useCallback, useEffect, useState } from 'react';
import { CONFIGURATION_SELECTED_EVENT } from './sales-foundation-console';

type Choice = { label: string };
type CatalogOption = {
  code: string;
  displayOrder: number;
  name: string;
  unit?: string;
  dataType: string;
  presentation?: { choices?: Record<string, Choice> };
};
type CatalogProduct = { id: string; options: CatalogOption[] };
type Conversion = { opportunityId: string; configurationId: string; createdAt: string };
type ConfigurationRequest = {
  id: string;
  productId: string;
  productName: string;
  optionValues: Record<string, unknown>;
  configurationStatus: 'READY_FOR_PRICING' | 'INCOMPLETE';
  readinessIssues: string[];
  name: string;
  email: string;
  phone?: string;
  message?: string;
  createdAt: string;
  conversion?: Conversion;
};
type ConversionResult = { requestId: string; opportunityId: string; configurationId: string; configurationStatus: string };

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const userId = process.env.NEXT_PUBLIC_DEV_USER_ID ?? '';
const organizationId = process.env.NEXT_PUBLIC_ORGANIZATION_ID ?? '';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-avitus-user-id': userId,
      'x-avitus-organization-id': organizationId,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  const body = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(body.error?.message ?? `API ${response.status}`);
  return body;
}

function openInPricing(configurationId: string) {
  window.dispatchEvent(new CustomEvent(CONFIGURATION_SELECTED_EVENT, { detail: { configurationId } }));
  document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
}

/** Customer values in catalog display order; values for options no longer in the catalog go last. */
function orderedEntries(values: Record<string, unknown>, options: CatalogOption[]): Array<[string, unknown]> {
  const rank = new Map(options.map((option) => [option.code, option.displayOrder]));
  return Object.entries(values).sort(
    ([a], [b]) => (rank.get(a) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b) ?? Number.MAX_SAFE_INTEGER),
  );
}

function formatValue(option: CatalogOption | undefined, code: string, value: unknown): string {
  if (!option) return `${code}: ${String(value)}`;
  if (typeof value === 'string') return `${option.name}: ${option.presentation?.choices?.[value]?.label ?? value}`;
  if (typeof value === 'boolean') return `${option.name}: ${value ? 'tak' : 'nie'}`;
  return `${option.name}: ${String(value)}${option.unit ? ` ${option.unit}` : ''}`;
}

export function ConfigurationRequestConsole() {
  const [requests, setRequests] = useState<ConfigurationRequest[]>([]);
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [requestRows, productRows] = await Promise.all([
      api<ConfigurationRequest[]>('/configuration-requests'),
      api<CatalogProduct[]>('/catalog/products'),
    ]);
    setRequests(requestRows);
    setCatalog(productRows);
  }, []);

  useEffect(() => {
    load().catch((value: unknown) => setError(value instanceof Error ? value.message : 'Nie udało się wczytać zapytań'));
  }, [load]);

  async function convert(request: ConfigurationRequest) {
    setBusyId(request.id);
    setError(null);
    try {
      const result = await api<ConversionResult>(`/configuration-requests/${request.id}/convert`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setLastResult(result);
      await load();
      openInPricing(result.configurationId);
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Zamiana nie powiodła się');
    } finally {
      setBusyId(null);
    }
  }

  const pending = requests.filter((request) => !request.conversion).length;

  return (
    <section className="salesSection">
      <div className="sectionHeading">
        <div>
          <p className="eyebrow">Sprint 6 · Zapytania z kreatora</p>
          <h2>Co klienci skonfigurowali na stronie?</h2>
          <p className="muted">
            Jedno kliknięcie zamienia zapytanie w szansę sprzedaży z konfiguracją — dokładnie z wartościami wybranymi
            przez klienta — gotową do wyceny.
          </p>
        </div>
        <button className="secondary" onClick={() => load().catch(() => setError('Odświeżenie nie powiodło się'))}>
          Odśwież
        </button>
      </div>

      <article className="panel">
        <div className="row">
          <h3>Zapytania ({pending} do obsłużenia)</h3>
        </div>
        <div className="leadList">
          {requests.length === 0 ? (
            <p className="muted">Brak zapytań z kreatora.</p>
          ) : (
            requests.map((request) => {
              const options = catalog.find((product) => product.id === request.productId)?.options ?? [];
              return (
                <div className="lead requestRow" key={request.id}>
                  <div>
                    <strong>
                      {request.productName} · {request.name}
                    </strong>
                    <p>
                      {request.email}
                      {request.phone ? ` · ${request.phone}` : ''} · {new Date(request.createdAt).toLocaleString('pl-PL')}
                    </p>
                    <ul className="optionList">
                      {orderedEntries(request.optionValues, options).map(([code, value]) => (
                        <li key={code}>
                          {formatValue(
                            options.find((option) => option.code === code),
                            code,
                            value,
                          )}
                        </li>
                      ))}
                    </ul>
                    {request.message ? <p className="requestMessage">„{request.message}”</p> : null}
                    {request.readinessIssues.length > 0 ? (
                      <p className="muted">Brakuje: {request.readinessIssues.join(', ')}</p>
                    ) : null}
                  </div>
                  <div className="requestActions">
                    <span>{request.configurationStatus === 'READY_FOR_PRICING' ? 'Gotowe do wyceny' : 'Niekompletne'}</span>
                    {request.conversion ? (
                      <>
                        <small>
                          Szansa {request.conversion.opportunityId.slice(0, 8)} · konfiguracja{' '}
                          {request.conversion.configurationId.slice(0, 8)}
                        </small>
                        <button className="secondary" onClick={() => openInPricing(request.conversion!.configurationId)}>
                          Wyceń
                        </button>
                      </>
                    ) : (
                      <button disabled={busyId !== null} onClick={() => convert(request)}>
                        {busyId === request.id ? 'Tworzenie…' : 'Utwórz szansę sprzedaży'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {lastResult ? (
          <div className="resultBox">
            <strong>UTWORZONO</strong>
            <span>{lastResult.configurationStatus}</span>
            <small>
              Opportunity {lastResult.opportunityId.slice(0, 8)} · Configuration {lastResult.configurationId.slice(0, 8)} — załadowana do sekcji
              wyceny poniżej.
            </small>
          </div>
        ) : null}
      </article>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
