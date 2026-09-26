'use client';

import { FormEvent, useState } from 'react';

type SubmitState = 'idle' | 'sending' | 'success' | 'error';

export function InquiryForm() {
  const [state, setState] = useState<SubmitState>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setState('sending');
    setMessage('');

    try {
      const response = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          phone: data.get('phone'),
          projectType: data.get('projectType'),
          message: data.get('message'),
          companyWebsite: data.get('companyWebsite'),
        }),
      });
      const body = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok) throw new Error(body.message ?? 'Nie udało się wysłać zapytania.');
      form.reset();
      setState('success');
      setMessage('Zapytanie zostało zapisane. Wrócimy do Ciebie z kolejnym krokiem.');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Nie udało się wysłać zapytania.');
    }
  }

  return (
    <form className="inquiryForm" onSubmit={submit}>
      <div className="formGrid">
        <label>
          Imię i nazwisko
          <input name="name" autoComplete="name" required maxLength={120} />
        </label>
        <label>
          E-mail
          <input name="email" type="email" autoComplete="email" required maxLength={320} />
        </label>
        <label>
          Telefon <span className="optional">opcjonalnie</span>
          <input name="phone" type="tel" autoComplete="tel" maxLength={40} />
        </label>
        <label>
          Czego potrzebujesz?
          <select name="projectType" defaultValue="CUSTOM_FURNITURE">
            <option value="CUSTOM_FURNITURE">Mebel na zamówienie</option>
            <option value="TABLE">Stół / blat</option>
            <option value="INTERIOR">Elementy wnętrza</option>
            <option value="OLD_WOOD">Projekt ze starego drewna</option>
            <option value="OTHER">Inny projekt</option>
          </select>
        </label>
      </div>
      <label>
        Opisz projekt
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={3000}
          rows={6}
          placeholder="Wymiary, materiał, charakter wnętrza, oczekiwany termin — napisz tyle, ile już wiesz."
        />
      </label>
      <label className="honeypot" aria-hidden="true">
        Strona firmy
        <input name="companyWebsite" tabIndex={-1} autoComplete="off" />
      </label>
      <div className="formFooter">
        <p>To zapytanie trafia do systemu Avitus Materia jako nowy lead. Nie jest jeszcze zamówieniem ani wiążącą wyceną.</p>
        <button type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? 'Wysyłanie…' : 'Rozpocznij projekt'}
        </button>
      </div>
      {message ? <p className={state === 'success' ? 'formSuccess' : 'formError'}>{message}</p> : null}
    </form>
  );
}
