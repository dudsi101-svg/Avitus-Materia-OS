'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  choiceLabel,
  formatValue,
  fromSearchParams,
  groupOptions,
  initialValues,
  numberStep,
  sortedOptions,
  toSearchParams,
  type OptionValue,
  type PublicOption,
  type PublicProduct,
  type Values,
} from '../lib/configurator';

type SubmitState = 'idle' | 'sending' | 'success' | 'error';

const WOOD: Record<string, { light: string; dark: string; grain: string }> = {
  STARY_DAB: { light: '#7a5535', dark: '#4f3522', grain: 'rgba(24,14,8,.35)' },
  DAB: { light: '#d4aa72', dark: '#b3874f', grain: 'rgba(90,58,28,.28)' },
  ODZYSK: { light: '#9a7048', dark: '#5e4129', grain: 'rgba(30,18,10,.4)' },
};

// Finish is shown as a tone overlay on the wood.
const FINISH_OVERLAY: Record<string, { color: string; opacity: number }> = {
  OLEJ_DYMIONY: { color: '#120b06', opacity: 0.28 },
  BEZ_WYKONCZENIA: { color: '#f2ebde', opacity: 0.12 },
};

const SCALE = 1.7; // px per cm; one scale keeps proportions truthful across products and sizes.
const TABLE_HEIGHT_CM = 75;
const CABINET_LEG_CM = 10;

/** Top-view outline; a natural edge follows an irregular line along both long sides. */
function topOutline(x: number, y: number, w: number, d: number, natural: boolean): string {
  if (!natural) return `M${x} ${y} H${x + w} V${y + d} H${x} Z`;
  const waves = Math.max(3, Math.round(w / 90));
  const seg = w / waves;
  let path = `M${x} ${y + 4}`;
  for (let i = 0; i < waves; i += 1) {
    const x0 = x + i * seg;
    path += ` C${x0 + seg * 0.3} ${y - 3 + (i % 2) * 5}, ${x0 + seg * 0.7} ${y + 8 - (i % 2) * 6}, ${x0 + seg} ${y + 3 + (i % 2) * 2}`;
  }
  path += ` L${x + w} ${y + d - 4}`;
  for (let i = waves - 1; i >= 0; i -= 1) {
    const x1 = x + i * seg;
    path += ` C${x1 + seg * 0.7} ${y + d + 3 - (i % 2) * 5}, ${x1 + seg * 0.3} ${y + d - 7 + (i % 2) * 6}, ${x1} ${y + d - 3 - (i % 2) * 2}`;
  }
  return `${path} Z`;
}

function Schematic({ product, values }: { product: PublicProduct; values: Values }) {
  const width = Number(values.width_cm ?? 200);
  const depth = Number(values.depth_cm ?? 90);
  const isCabinet = product.slug.startsWith('komoda');
  const wood = WOOD[String(values.material)] ?? WOOD.DAB!;
  const overlay = FINISH_OVERLAY[String(values.finish)];
  const base = String(values.base ?? 'DO_USTALENIA');
  const natural = values.edge === 'NATURALNA';

  const w = width * SCALE;
  const d = depth * SCALE;
  const cx = 320;
  const topY = 34;
  const x = cx - w / 2;
  const elevationY = topY + d + 70;
  const legCm = isCabinet ? CABINET_LEG_CM : TABLE_HEIGHT_CM - Number(values.thickness_cm ?? 4);
  const bodyCm = isCabinet
    ? Number(values.height_cm ?? 80) - CABINET_LEG_CM
    : Number(values.thickness_cm ?? 4);
  const bodyH = Math.max(5, bodyCm * SCALE);
  const legH = legCm * SCALE;
  const legW = base === 'DREWNO' ? 16 : 8;
  const legInset = Math.min(40, w * 0.12);
  const legFill = base === 'STAL_CZARNA' ? '#2d2b29' : base === 'DREWNO' ? wood.dark : 'none';
  const legStroke = base === 'DO_USTALENIA' ? 'var(--am-gold-light)' : 'rgba(217,183,127,.45)';
  const floorY = elevationY + bodyH + legH;
  const viewH = floorY + 44;
  const outline = topOutline(x, topY, w, d, natural && !isCabinet);
  const label = sortedOptions(product)
    .map((option) => `${option.name}: ${formatValue(option, values[option.code])}`)
    .join(', ');

  return (
    <svg
      className="amSchematic"
      viewBox={`0 0 640 ${viewH}`}
      role="img"
      aria-label={`${product.name}. ${label}`}
    >
      <defs>
        <linearGradient id="amWood" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={wood.light} />
          <stop offset="1" stopColor={wood.dark} />
        </linearGradient>
        <pattern id="amGrain" width="160" height="22" patternUnits="userSpaceOnUse">
          <path d="M0 6 C 40 3, 80 9, 160 5" fill="none" stroke={wood.grain} strokeWidth="1" />
          <path
            d="M0 15 C 50 18, 110 12, 160 16"
            fill="none"
            stroke={wood.grain}
            strokeWidth=".7"
          />
        </pattern>
      </defs>

      <text x="20" y="20" className="amSchematicCaption">
        WIDOK Z GÓRY
      </text>
      <path d={outline} fill="url(#amWood)" />
      <path d={outline} fill="url(#amGrain)" />
      {overlay ? <path d={outline} fill={overlay.color} fillOpacity={overlay.opacity} /> : null}
      <path d={outline} fill="none" stroke="var(--am-gold-light)" strokeOpacity=".55" />
      <line x1={x} x2={x + w} y1={topY + d + 18} y2={topY + d + 18} className="amDimension" />
      <text x={cx} y={topY + d + 36} textAnchor="middle" className="amDimensionText">
        {width} cm
      </text>
      <line x1={x + w + 18} x2={x + w + 18} y1={topY} y2={topY + d} className="amDimension" />
      <text x={x + w + 26} y={topY + d / 2 + 4} className="amDimensionText">
        {depth} cm
      </text>

      <text x="20" y={elevationY - 14} className="amSchematicCaption">
        WIDOK Z PRZODU
      </text>
      <rect x={x} y={elevationY} width={w} height={bodyH} fill="url(#amWood)" />
      <rect x={x} y={elevationY} width={w} height={bodyH} fill="url(#amGrain)" />
      {overlay ? (
        <rect
          x={x}
          y={elevationY}
          width={w}
          height={bodyH}
          fill={overlay.color}
          fillOpacity={overlay.opacity}
        />
      ) : null}
      {isCabinet ? (
        <line
          x1={cx}
          x2={cx}
          y1={elevationY + 8}
          y2={elevationY + bodyH - 8}
          stroke={wood.grain}
          strokeWidth="2"
        />
      ) : null}
      {[x + legInset, x + w - legInset - legW].map((legX) => (
        <rect
          key={legX}
          x={legX}
          y={elevationY + bodyH}
          width={legW}
          height={legH}
          fill={legFill}
          stroke={legStroke}
          strokeDasharray={base === 'DO_USTALENIA' ? '4 4' : undefined}
        />
      ))}
      <line x1="40" x2="600" y1={floorY} y2={floorY} stroke="rgba(217,183,127,.25)" />
      {isCabinet || values.thickness_cm !== undefined ? (
        <text
          x={x + w + 14}
          y={elevationY + Math.max(bodyH, 14) / 2 + 5}
          className="amDimensionText"
        >
          {isCabinet ? `${values.height_cm ?? '—'} cm wys.` : `${values.thickness_cm} cm`}
        </text>
      ) : null}
    </svg>
  );
}

function OptionField({
  option,
  value,
  onChange,
}: {
  option: PublicOption;
  value: OptionValue | undefined;
  onChange: (value: OptionValue) => void;
}) {
  const hint = option.presentation?.hint ? (
    <span className="amFieldHint">{option.presentation.hint}</span>
  ) : null;

  if (option.dataType === 'NUMBER') {
    const min = Number(option.minValue ?? 0);
    const max = Number(option.maxValue ?? 1000);
    const numeric = Number(value ?? min);
    return (
      <label className="amField">
        <span className="amFieldHead">
          {option.name}
          <strong>{formatValue(option, numeric)}</strong>
        </span>
        <input
          type="range"
          min={min}
          max={max}
          step={numberStep(option)}
          value={numeric}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-valuetext={formatValue(option, numeric)}
        />
        <span className="amFieldRange">
          <span>{formatValue(option, min)}</span>
          <span>{formatValue(option, max)}</span>
        </span>
        {hint}
      </label>
    );
  }

  if (option.dataType === 'ENUM' && option.choices) {
    const selected =
      typeof value === 'string' ? option.presentation?.choices?.[value]?.description : undefined;
    return (
      <fieldset className="amField">
        <legend className="amFieldHead">{option.name}</legend>
        <div className="amChips">
          {option.choices.map((choice) => {
            const swatch = option.presentation?.choices?.[choice]?.swatch;
            return (
              <label key={choice} className={value === choice ? 'amChip amChipActive' : 'amChip'}>
                <input
                  type="radio"
                  name={option.code}
                  value={choice}
                  checked={value === choice}
                  onChange={() => onChange(choice)}
                />
                {swatch ? (
                  <span className="amSwatch" style={{ background: swatch }} aria-hidden="true" />
                ) : null}
                {choiceLabel(option, choice)}
              </label>
            );
          })}
        </div>
        {selected ? <span className="amFieldHint">{selected}</span> : hint}
      </fieldset>
    );
  }

  if (option.dataType === 'BOOLEAN') {
    return (
      <label className="amField amToggle">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span>{option.name}</span>
        {hint}
      </label>
    );
  }

  return (
    <label className="amField">
      <span className="amFieldHead">{option.name}</span>
      <input
        className="amTextInput"
        maxLength={200}
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint}
    </label>
  );
}

export function Configurator({ products }: { products: PublicProduct[] }) {
  const [productId, setProductId] = useState(products[0]!.id);
  const product = products.find((candidate) => candidate.id === productId) ?? products[0]!;
  const [valuesByProduct, setValuesByProduct] = useState<Record<string, Values>>(() =>
    Object.fromEntries(products.map((candidate) => [candidate.id, initialValues(candidate)])),
  );
  const values = valuesByProduct[product.id] ?? {};
  const [restored, setRestored] = useState(false);
  const [state, setState] = useState<SubmitState>('idle');
  const [feedback, setFeedback] = useState('');
  const [linkNote, setLinkNote] = useState('');

  const groups = useMemo(() => groupOptions(product), [product]);
  const options = useMemo(() => sortedOptions(product), [product]);

  // Restore a shared configuration from the URL once, after hydration.
  useEffect(() => {
    const shared = fromSearchParams(products, new URLSearchParams(window.location.search));
    if (shared) {
      setProductId(shared.product.id);
      setValuesByProduct((current) => ({ ...current, [shared.product.id]: shared.values }));
    }
    setRestored(true);
  }, [products]);

  // Keep the URL in sync so the configuration can be bookmarked or shared.
  useEffect(() => {
    if (!restored) return;
    const query = toSearchParams(product, values).toString();
    window.history.replaceState(null, '', `${window.location.pathname}?${query}`);
  }, [restored, product, values]);

  function setValue(code: string, value: OptionValue) {
    setValuesByProduct((current) => ({
      ...current,
      [product.id]: { ...current[product.id], [code]: value },
    }));
    setLinkNote('');
    if (state !== 'sending') setState('idle');
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkNote('Link skopiowany — możesz wrócić do tej konfiguracji albo komuś ją wysłać.');
    } catch {
      setLinkNote('Skopiuj adres z paska przeglądarki — zawiera całą konfigurację.');
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setState('sending');
    setFeedback('');
    try {
      const response = await fetch('/api/configurator-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          values,
          name: data.get('name'),
          email: data.get('email'),
          phone: data.get('phone'),
          message: data.get('message'),
          companyWebsite: data.get('companyWebsite'),
        }),
      });
      const body = (await response.json()) as { message?: string; reference?: string };
      if (!response.ok) throw new Error(body.message ?? 'Nie udało się zapisać konfiguracji.');
      form.reset();
      setState('success');
      setFeedback(
        `Konfiguracja zapisana${body.reference ? ` (nr ${body.reference.slice(0, 8).toUpperCase()})` : ''}. Wrócimy z propozycją i wyceną.`,
      );
    } catch (error) {
      setState('error');
      setFeedback(error instanceof Error ? error.message : 'Nie udało się zapisać konfiguracji.');
    }
  }

  return (
    <div className="amConfigurator">
      <div className="amConfigControls">
        <p className="v04Tag">Kreator · krok 1 z 2</p>
        <h2 className="amConfigTitle">Ustalmy punkt startowy.</h2>
        <div className="amProductTabs" role="tablist" aria-label="Typ projektu">
          {products.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              role="tab"
              aria-selected={candidate.id === product.id}
              className={
                candidate.id === product.id ? 'amProductTab amProductTabActive' : 'amProductTab'
              }
              onClick={() => setProductId(candidate.id)}
            >
              {candidate.name}
            </button>
          ))}
        </div>
        {product.description ? <p className="amProductDescription">{product.description}</p> : null}
        {groups.map(({ group, options: groupOptionsList }) => (
          <section key={group} className="amGroup" aria-label={group}>
            <h3 className="amGroupTitle">{group}</h3>
            {groupOptionsList.map((option) => (
              <OptionField
                key={option.id}
                option={option}
                value={values[option.code]}
                onChange={(value) => setValue(option.code, value)}
              />
            ))}
          </section>
        ))}
      </div>

      <div className="amConfigStage">
        <Schematic product={product} values={values} />
        <dl className="amSummary">
          <div>
            <dt>Projekt</dt>
            <dd>{product.name}</dd>
          </div>
          {options.map((option) => (
            <div key={option.id}>
              <dt>{option.name}</dt>
              <dd>{formatValue(option, values[option.code])}</dd>
            </div>
          ))}
        </dl>
        <div className="amShare">
          <button type="button" className="v04Button v04ButtonGhost" onClick={copyLink}>
            Kopiuj link do konfiguracji
          </button>
          {linkNote ? (
            <span className="amFieldHint" role="status">
              {linkNote}
            </span>
          ) : null}
        </div>
      </div>

      <form className="amRequestForm" onSubmit={submit}>
        <p className="v04Tag">Krok 2 z 2 · wyślij konfigurację</p>
        <p className="amHonest">
          Rysunek pokazuje proporcje, nie gotowy projekt techniczny. Cenę przygotujemy na podstawie
          tej konfiguracji — nie pokazujemy automatycznych kwot, dopóki nie są oparte na prawdziwych
          kosztach.
        </p>
        <div className="amRequestGrid">
          <label>
            Imię i nazwisko
            <input name="name" autoComplete="name" required minLength={2} maxLength={120} />
          </label>
          <label>
            E-mail
            <input name="email" type="email" autoComplete="email" required maxLength={320} />
          </label>
          <label>
            <span>
              Telefon <span className="optional">opcjonalnie</span>
            </span>
            <input name="phone" type="tel" autoComplete="tel" maxLength={40} />
          </label>
          <label>
            <span>
              Uwagi <span className="optional">opcjonalnie</span>
            </span>
            <input name="message" maxLength={3000} placeholder="np. do jadalni na 8 osób" />
          </label>
        </div>
        <label className="honeypot" aria-hidden="true">
          Strona firmy
          <input name="companyWebsite" tabIndex={-1} autoComplete="off" />
        </label>
        <button type="submit" className="v04Button v04ButtonPrimary" disabled={state === 'sending'}>
          {state === 'sending' ? 'Zapisywanie…' : 'Wyślij konfigurację'}
        </button>
        {feedback ? (
          <p className={state === 'success' ? 'formSuccess' : 'formError'} role="status">
            {feedback}
          </p>
        ) : null}
      </form>
    </div>
  );
}
