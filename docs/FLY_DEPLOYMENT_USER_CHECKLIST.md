# Fly.io deployment — minimalna checklista po stronie właściciela

Celem jest ograniczenie pracy ręcznej do minimum. Kod, Docker/Fly config, migracje i bootstrap są przygotowywane w repo. Po stronie właściciela zostają tylko operacje wymagające dostępu do kont Fly.io i home.pl.

## Zasada bezpieczeństwa

**Nie wysyłaj w czacie wartości sekretów, tokenów, haseł ani pełnego `DATABASE_URL`.** Screenshoty powinny pokazywać nazwy aplikacji/region/status, ale nie wartości sekretów.

## Etap A — 2 minuty: pokaż aktualny stan Fly

1. Otwórz dashboard Fly.io.
2. Wejdź do organizacji, w której ma działać Avitus Materia.
3. Zrób screenshot widoku pokazującego istniejące Apps oraz Managed Postgres (jeśli jest).
4. Wyślij screenshot do rozmowy.

Na podstawie tego ustalimy, czy wykorzystujemy istniejące zasoby czy tworzymy nowe. **Na tym etapie niczego nie usuwaj i nie twórz w ciemno.**

## Etap B — jeśli brakuje zasobów

Docelowo potrzebujemy tylko:
- jednego Fly App dla strony (`web`),
- jednego Fly App dla API (`api`),
- jednego Fly Managed Postgres cluster.

Preferowany region startowy: `fra` (Frankfurt), chyba że istniejący Avitus stack działa już w innym wspieranym regionie europejskim. API i baza powinny być w tym samym regionie.

Proponowane nazwy:
- `avitus-materia-web`
- `avitus-materia-api`
- baza/cluster: `avitus-materia-db`

Nazwy aplikacji Fly są globalnie unikalne; jeśli zajęte, wybierzemy najbliższy wariant.

## Etap C — sekrety

API potrzebuje:
- `DATABASE_URL` — ustawiony przez attach Managed Postgres,
- `PUBLIC_INQUIRY_ORGANIZATION_ID` — stabilny UUID produkcyjnej organizacji,
- `PUBLIC_INQUIRY_API_KEY` — mocny losowy sekret.

Web potrzebuje:
- `AVITUS_API_URL=http://<API_APP>.internal:4000`,
- `PUBLIC_INQUIRY_API_KEY` — dokładnie ten sam sekret co API.

Nie publikujemy `PUBLIC_INQUIRY_API_KEY` jako `NEXT_PUBLIC_*`.

## Etap D — pierwszy deployment

Deployment wykonujemy z repo/GitHub Codespaces albo terminala z `flyctl`:

```bash
fly auth login
fly apps list
fly mpg list
```

Po potwierdzeniu nazw zasobów:

```bash
fly deploy -c fly.api.toml -a <API_APP>
fly deploy -c fly.web.toml -a <WEB_APP>
```

Najpierw API, potem web.

Przed zmianą DNS sprawdzamy:
- `https://<API_APP>.fly.dev/health`
- `https://<API_APP>.fly.dev/ready`
- `https://<WEB_APP>.fly.dev`
- jedno testowe zapytanie z formularza.

## Etap E — domena home.pl

Dopiero gdy `.fly.dev` działa poprawnie:

1. Dodajemy w Fly certyfikaty/hostnames:
   - `avitus-materia.com`
   - `www.avitus-materia.com`
   - `api.avitus-materia.com`
2. Fly pokaże wymagane rekordy DNS.
3. W home.pl wchodzimy:
   - Domeny
   - `Avitus-Materia.com`
   - Hosting DNS
   - Opcje
   - Zarządzaj rekordami DNS
4. Wpisujemy **dokładnie** wartości podane przez Fly.
5. Nie ruszamy rekordów pocztowych MX/SPF/DKIM/DMARC.

## Etap F — test końcowy

Po propagacji DNS:
- strona działa na `https://avitus-materia.com`,
- SSL jest aktywny,
- `api.avitus-materia.com/health` i `/ready` odpowiadają,
- formularz tworzy CRM Lead,
- poczta nadal działa,
- mobile i desktop są sprawdzone.

## Co właściciel ma zrobić TERAZ

Tylko **Etap A**: otworzyć Fly.io i wysłać screenshot organizacji z listą obecnych Apps/Managed Postgres. Reszty na razie nie klikaj — wykorzystamy to, co już istnieje, jeśli się nadaje.
