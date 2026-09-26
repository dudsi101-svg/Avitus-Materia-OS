# Fly.io deployment — minimalna checklista po stronie właściciela

Celem jest ograniczenie pracy ręcznej do minimum. Kod, Docker/Fly config, migracje, bootstrap produkcyjnej organizacji oraz skrypt pierwszego wdrożenia są przygotowane w repo.

## Zasada bezpieczeństwa

**Nie wysyłaj w czacie wartości sekretów, tokenów, haseł ani pełnego `DATABASE_URL`.** Screenshoty mogą pokazywać nazwy aplikacji, region i status, ale nie wartości sekretów.

## Stan obecny — zaakceptowany plan

- Fly.io pozostaje główną platformą uruchomieniową.
- home.pl pozostaje rejestratorem/DNS i miejscem obsługi poczty.
- `dzik-os-panel` pozostaje nietknięty.
- Avitus Materia dostaje własne aplikacje web/API oraz własny Fly Managed Postgres.
- region startowy: `fra` (Frankfurt).

Docelowe zasoby:
- `avitus-materia-web`
- `avitus-materia-api`
- `avitus-materia-db`

## Krok 1 — TERAZ: utwórz Managed Postgres

W otwartym ekranie Fly Managed Postgres ustaw:

- Name: `avitus-materia-db`
- Region: `fra` / Frankfurt
- Plan: `Basic`
- Storage: `10 GB`
- PostgreSQL: `17`
- PostGIS: wyłączony

Kliknij **Create cluster** i poczekaj, aż status będzie gotowy/healthy.

To jest jedyny krok, którego nie wykonujemy z repo bez dostępu do Twojego konta Fly.

## Krok 2 — pierwszy deployment zautomatyzowany skryptem

Po utworzeniu klastra pobierz najnowszy `main`, otwórz PowerShell w katalogu repo i uruchom:

```powershell
fly auth login
powershell -ExecutionPolicy Bypass -File .\scripts\fly-first-deploy.ps1
```

Skrypt sam:
- znajdzie `avitus-materia-db`,
- utworzy `avitus-materia-api` i `avitus-materia-web`, jeśli jeszcze nie istnieją,
- podepnie Managed Postgres do API i ustawi `DATABASE_URL`,
- wygeneruje stabilny UUID organizacji produkcyjnej,
- wygeneruje mocny sekret formularza bez zapisywania go na dysku,
- ustawi sekrety API i web,
- skonfiguruje prywatne połączenie web -> API przez `.internal`,
- wdroży najpierw API, potem web,
- wykona podstawowy smoke test `/ready` oraz strony `.fly.dev`.

Jeśli globalne nazwy aplikacji są zajęte, skrypt zatrzyma się zamiast tworzyć przypadkowe nazwy. Wtedy wybierzemy kontrolowany wariant i uruchomimy go z parametrami `-ApiApp` / `-WebApp`.

## Krok 3 — test przed DNS

Przed dotykaniem home.pl muszą działać:

```text
https://avitus-materia-api.fly.dev/health
https://avitus-materia-api.fly.dev/ready
https://avitus-materia-web.fly.dev
```

Dodatkowo wysyłamy jedno testowe zapytanie formularzem i potwierdzamy zapis w CRM/bazie.

## Krok 4 — automatyczny deployment z GitHub

Repo zawiera `.github/workflows/deploy-fly.yml`, ale deployment jest domyślnie wyłączony.

Po udanym pierwszym wdrożeniu ręcznym:

1. W Fly wygeneruj deployment token.
2. W GitHub -> Settings -> Secrets and variables -> Actions dodaj secret `FLY_API_TOKEN`.
3. W GitHub -> Actions variables dodaj `FLY_DEPLOY_ENABLED=true`.
4. Opcjonalnie ustaw `FLY_API_APP` i `FLY_WEB_APP`, jeśli nazwy różnią się od domyślnych.

Od tej chwili udany CI na `main` uruchomi deployment API, sprawdzi `/ready`, a potem wdroży web.

## Krok 5 — domena home.pl

Dopiero po poprawnym działaniu `.fly.dev`:

1. Dodajemy certyfikaty/hostnames Fly dla:
   - `avitus-materia.com`
   - `www.avitus-materia.com`
   - `api.avitus-materia.com`
2. Fly poda dokładne wymagania DNS.
3. W home.pl zmieniamy wyłącznie rekordy potrzebne dla strony/API.
4. Nie ruszamy rekordów pocztowych MX/SPF/DKIM/DMARC.

Po propagacji sprawdzamy SSL, domenę apex, `www`, API oraz pocztę.

## Co właściciel ma zrobić TERAZ

Dokończyć **Krok 1**: utworzyć `avitus-materia-db` zgodnie z parametrami powyżej. Po pojawieniu się ekranu gotowego klastra można wysłać screenshot bez sekretów. Resztę pierwszego deploymentu maksymalnie przejmuje skrypt w repo.
