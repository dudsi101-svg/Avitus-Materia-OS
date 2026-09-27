'use client';

import { useMemo, useState } from 'react';

export function ConfiguratorLite() {
  const [family, setFamily] = useState('STOL');
  const [material, setMaterial] = useState('STARY_DAB');
  const [width, setWidth] = useState(220);
  const [depth, setDepth] = useState(100);
  const [base, setBase] = useState('STAL_CZARNA');

  const summary = useMemo(() => {
    const familyLabel = family === 'STOL' ? 'Stół / blat' : family === 'KOMODA' ? 'Komoda / szafka' : 'Projekt indywidualny';
    const materialLabel = material === 'STARY_DAB' ? 'stary dąb' : material === 'DAB' ? 'naturalny dąb' : 'drewno z odzysku';
    const baseLabel = base === 'STAL_CZARNA' ? 'stal czarna' : base === 'DREWNO' ? 'drewno' : 'do ustalenia';
    return `${familyLabel} · ${width} × ${depth} cm · ${materialLabel} · ${baseLabel}`;
  }, [family, material, width, depth, base]);

  return (
    <div className="v04ConfigGrid">
      <div className="v04ConfigPanel">
        <p className="v04Tag">Kreator v1</p>
        <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 400, fontSize: '2.7rem', margin: '0 0 28px' }}>Ustalmy punkt startowy.</h2>
        <label>
          Typ projektu
          <select value={family} onChange={(event) => setFamily(event.target.value)}>
            <option value="STOL">Stół / blat</option>
            <option value="KOMODA">Komoda / szafka</option>
            <option value="INDYWIDUALNY">Projekt indywidualny</option>
          </select>
        </label>
        <label>
          Materiał
          <select value={material} onChange={(event) => setMaterial(event.target.value)}>
            <option value="STARY_DAB">Stary dąb</option>
            <option value="DAB">Naturalny dąb</option>
            <option value="ODZYSK">Drewno z odzysku</option>
          </select>
        </label>
        <label>
          Szerokość: {width} cm
          <input type="range" min="80" max="320" step="10" value={width} onChange={(event) => setWidth(Number(event.target.value))} />
        </label>
        <label>
          Głębokość: {depth} cm
          <input type="range" min="40" max="140" step="5" value={depth} onChange={(event) => setDepth(Number(event.target.value))} />
        </label>
        <label>
          Konstrukcja / podstawa
          <select value={base} onChange={(event) => setBase(event.target.value)}>
            <option value="STAL_CZARNA">Stal czarna</option>
            <option value="DREWNO">Drewno</option>
            <option value="DO_USTALENIA">Do ustalenia</option>
          </select>
        </label>
        <p style={{ color: 'var(--am-muted)', lineHeight: 1.7, marginTop: 28 }}>
          Ten etap nie udaje jeszcze automatycznej wyceny. Najpierw budujemy poprawny model konfiguracji; wycena zostanie podłączona do danych historycznych i reguł kosztowych Avitus Materia OS.
        </p>
      </div>
      <div className="v04ConfigPreview">
        <div className="v04Schematic" aria-hidden="true" />
        <div className="v04ConfigMeta">
          <span>{summary}</span>
          <span>wersja robocza</span>
        </div>
      </div>
    </div>
  );
}
