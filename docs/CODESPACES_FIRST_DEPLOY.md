# Pierwszy deployment Fly z GitHub Codespaces

Ta ścieżka minimalizuje ręczną konfigurację na komputerze właściciela. Wymaga tylko przeglądarki, konta GitHub i konta Fly.io.

## Warunek wstępny

Na Fly.io musi istnieć gotowy Managed Postgres:

- name: `avitus-materia-db`
- region: `fra`
- plan: `Basic`
- storage: `10 GB`
- PostgreSQL: 17

## Krok 1 — otwórz Codespaces

W repo `dudsi101-svg/Avitus-Materia-OS`:

1. Kliknij **Code**.
2. Wejdź w **Codespaces**.
3. Utwórz lub otwórz codespace dla gałęzi `main`.
4. Poczekaj na terminal.

## Krok 2 — uruchom jeden skrypt

```bash
git pull
bash scripts/fly-codespaces-first-deploy.sh
```

Skrypt sam:

- doinstaluje `flyctl`, jeśli nie jest dostępny,
- poprosi o logowanie Fly tylko jeśli sesja nie jest aktywna,
- znajdzie `avitus-materia-db`,
- utworzy `avitus-materia-api` i `avitus-materia-web`, jeśli ich nie ma,
- podepnie Managed Postgres do API,
- ustawi `DATABASE_URL`,
- ustawi stabilny UUID organizacji produkcyjnej,
- wygeneruje mocny sekret publicznego formularza wyłącznie w pamięci,
- zapisze sekret w Fly Secrets dla API i web,
- ustawi prywatne `web -> api` po `.internal`,
- wdroży API,
- sprawdzi `/ready`,
- wdroży web,
- sprawdzi adres `.fly.dev` strony.

## Krok 3 — po sukcesie

Powinny odpowiadać:

```text
https://avitus-materia-api.fly.dev/health
https://avitus-materia-api.fly.dev/ready
https://avitus-materia-web.fly.dev
```

Następnie wykonujemy jedno testowe wysłanie formularza i dopiero później konfigurujemy domeny oraz DNS w home.pl.

## Bezpieczeństwo

- Skrypt nie wyświetla ani nie zapisuje `PUBLIC_INQUIRY_API_KEY`.
- `DATABASE_URL` jest tworzony przez `fly mpg attach` i przechowywany jako Fly Secret.
- `dzik-os-panel` nie jest dotykany.
- Skrypt zatrzymuje się przy błędzie zamiast kontynuować częściowo nieudaną konfigurację.
