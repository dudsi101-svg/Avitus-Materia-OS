'use client';

import { FormEvent, useMemo, useState } from 'react';
import {
  choiceLabel,
  initialValues,
  numberStep,
  type PublicOption,
  type PublicProduct,
} from '../lib/configurator';

type Values = Record<string, string | number>;
type SubmitState = 'idle' | 'sending' | 'success' | 'error';

const WOOD: Record<string, { light: string; dark: string; grain: string }> = {
  STARY_DAB: { light: '#7a5535', dark: '#4f3522', grain: 'rgba(24,14,8,.35)' },
  DAB: { light: '#d4aa72', dark: '#b3874f', grain: 'rgba(90,58,28,.28)' },
  ODZYSK: { light: '#9a7048', dark: '#5e4129', grain: 'rgba(30,18,10,.4)' },
};

function Schematic({ product, values }: { product: PublicProduct; values: Values }) {
  const width = Number(values.width_cm ?? 200);
  const depth = Number(values.depth_cm ?? 90);
  const wood = WOOD[String(values.material)] ?? WOOD.DAB!;
  const base = String(values.base ?? 'DO_USTALENIA');
  const isCabinet = product.slug.startsWith('komoda');

  // One shared scale so proportions between products and sizes stay truthful.
  const scale = 1.7;
  const w = width * scale;
  const d = depth * scale;
  const cx = 320;
  const topY = 34;
  const x = cx - w / 2;
  const elevationY = topY + d + 70;
  const bodyH = isCabinet ? 92 : 12;
  const legH = isCabinet ? 18 : 78;
  const legW = base === 'DREWNO' ? 16 : 8;
  const legInset = Math.min(40, w * 0.12);
  const legFill = base === 'STAL_CZARNA' ? '#2d2b29' : base === 'DREWNO' ? wood.dark : 'none';
  const legStroke = base === 'DO_USTALENIA' ? 'var(--am-gold-light)' : 'rgba(217,183,127,.45)';
  const viewH = elevationY + bodyH + legH + 40;
  const label = `${product.name}: ${width} × ${depth} cm, ${choiceLabel(String(values.material))}, podstawa ${choiceLabel(base).toLowerCase()}`;

  return (
    <svg className="amSchematic" viewBox={`0 0 640 ${viewH}`} role="img" aria-label={label}>
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
      <rect x={x} y={topY} width={w} height={d} fill="url(#amWood)" rx={isCabinet ? 1 : 3} />
      <rect x={x} y={topY} width={w} height={d} fill="url(#amGrain)" rx={isCabinet ? 1 : 3} />
      <rect
        x={x}
        y={topY}
        width={w}
        height={d}
        fill="none"
        stroke="var(--am-gold-light)"
        strokeOpacity=".55"
        rx={isCabinet ? 1 : 3}
      />
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
      <line
        x1="40"
        x2="600"
        y1={elevationY + bodyH + legH}
        y2={elevationY + bodyH + legH}
        stroke="rgba(217,183,127,.25)"
      />
    </svg>
  );
}

function OptionField({
  option,
  value,
  onChange,
}: {
  option: PublicOption;
  value: string | number | undefined;
  onChange: (value: string | number) => void;
}) {
  if (option.dataType === 'NUMBER') {
    const min = Number(option.minValue ?? 0);
    const max = Number(option.maxValue ?? 1000);
    const numeric = Number(value ?? min);
    return (
      <label className="amField">
        <span className="amFieldHead">
          {option.name}
          <strong>
            {numeric} {option.unit ?? ''}
          </strong>
        </span>
        <input
          type="range"
          min={min}
          max={max}
          step={numberStep(option)}
          value={numeric}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-valuetext={`${numeric} ${option.unit ?? ''}`}
        />
        <span className="amFieldRange">
          <span>
            {min} {option.unit}
          </span>
          <span>
            {max} {option.unit}
          </span>
        </span>
      </label>
    );
  }
  if (option.dataType === 'ENUM' && option.choices) {
    return (
      <fieldset className="amField">
        <legend className="amFieldHead">{option.name}</legend>
        <div className="amChips">
          {option.choices.map((choice) => (
            <label key={choice} className={value === choice ? 'amChip amChipActive' : 'amChip'}>
              <input
                type="radio"
                name={option.code}
                value={choice}
                checked={value === choice}
                onChange={() => onChange(choice)}
              />
              {choiceLabel(choice)}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }
  return null;
}

export function Configurator({ products }: { products: PublicProduct[] }) {
  const [productId, setProductId] = useState(products[0]!.id);
  const product = products.find((candidate) => candidate.id === productId) ?? products[0]!;
  const [valuesByProduct, setValuesByProduct] = useState<Record<string, Values>>(() =>
    Object.fromEntries(products.map((candidate) => [candidate.id, initialValues(candidate)])),
  );
  const values = valuesByProduct[product.id] ?? {};
  const [state, setState] = useState<SubmitState>('idle');
  const [feedback, setFeedback] = useState('');

  const options = useMemo(
    () => [...product.options].sort((a, b) => a.displayOrder - b.displayOrder),
    [product],
  );

  function setValue(code: string, value: string | number) {
    setValuesByProduct((current) => ({
      ...current,
      [product.id]: { ...current[product.id], [code]: value },
    }));
    if (state !== 'sending') setState('idle');
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
        <p className="v04Tag">Kreator v2 · krok 1 z 2</p>
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
        {options.map((option) => (
          <OptionField
            key={option.id}
            option={option}
            value={values[option.code]}
            onChange={(value) => setValue(option.code, value)}
          />
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
              <dd>
                {option.dataType === 'ENUM'
                  ? choiceLabel(String(values[option.code] ?? '—'))
                  : `${values[option.code] ?? '—'} ${option.unit ?? ''}`}
              </dd>
            </div>
          ))}
        </dl>
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
