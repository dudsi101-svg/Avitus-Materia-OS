# Website Stage 1 — avitus-materia.com as information + marketing source

**Owner lane:** Claude (`claude/gallant-bardeen-5rkqfd`)
**Started:** 2026-11-14
**Context:** The owner confirmed that the Drakkar workshop brand is being fully rebranded to Avitus Materia. The website is delivered in stages:
1. **Stage 1 (this document):** the website as the trustworthy information and marketing source of the brand.
2. Later stages: the website is joined with Avitus Materia OS into a management + sales system (configurator, quotes, customer portal).

The owner granted a working mandate on 2026-11-14: Claude plans the stages, records them in `docs/`, works "build first, then show" (preview + screenshots), and challenges positioning that does not serve sales. Public prices, legal commitments (terms, warranty), DNS/e-mail changes and any spending remain owner decisions.

## Live audit — 2026-11-14 (read-only)

Hosting: `avitus-materia.com` and `www.avitus-materia.com` are served by the Fly.io web app (`server: Fly`, Next.js prerender), i.e. the code in `apps/web`. `api.avitus-materia.com/ready` returns 200. No separate hosting was found behind the domain.

| # | Finding | Severity | Evidence |
|---|---|---|---|
| A1 | All realization and hero images are hotlinked from the legacy WordPress site `stolarnia-drakkar.pl/wp-content/uploads/...`. If that site is switched off, the new site loses every photo; it also leaks the legacy brand in network requests. | Critical | `apps/web/src/lib/realizations.ts`, `apps/web/src/app/page.tsx:29` |
| A2 | Public contact e-mail is still `biuro@stolarnia-drakkar.pl` (header/footer, home, contact). | High | `site-footer.tsx:31`, `kontakt/page.tsx:31`, `page.tsx:135` |
| A3 | Realization cards carry only placeholder copy ("Prawdziwa realizacja z archiwum pracowni."), no real descriptions, dimensions or materials. The structured inventory in `data/media/realizations.json` (Drive folder source) is not used by the site and its facts are mostly `TO_CONFIRM`. | High | live `/realizacje` text |
| A4 | `/kreator` still renders `ConfiguratorLite` demo ("wersja robocza", no submission). R17 remains open in production after PR #39–#41. | High | live `/kreator` screenshot |
| A5 | `robots.txt` and `sitemap.xml` return 404. | Medium | live probe |
| A6 | No canonical URL; `www` and apex both return 200 (duplicate content) — no redirect. | Medium | live probe |
| A7 | No `og:image`; `twitter:card=summary` only — shared links have no picture. | Medium | page head |
| A8 | No structured data (LocalBusiness / FurnitureStore), no Google Search Console / analytics evidence. | Medium | page head |
| A9 | No privacy policy / cookie information page, though the site collects inquiries (personal data). | High (legal) | navigation |
| A10 | Design direction (ivory / charcoal / bronze, serif display) is implemented and coherent; mobile has no horizontal overflow on audited pages. | OK | screenshots |

The Drive folder referenced by `data/media/realizations.json` (`1kDFHCBQ…`) was not visible through the connected Google Drive account in this session — either a different owner or not shared.

## Stage 1 scope (proposed)

Goal: a site a prospective client can trust and act on, with no dependency on the Drakkar brand or its infrastructure.

### 1A — Independence and hygiene (no owner input needed)
- Self-host realization/hero images in the repo/build (optimized, `next/image`), remove all `stolarnia-drakkar.pl` asset URLs. *Needs the original photos — from the Drive folder or the legacy site.*
- `robots.txt`, `sitemap.xml`, canonical URLs, `www → apex` 301, `metadataBase`, OG image.
- LocalBusiness structured data (name, address, phone — values already public on the site).
- Hide `/kreator` from navigation and the sitemap until it is functional (Stage 2), or present it clearly as a guided inquiry. Decision default: hide; inquiry form on `/kontakt` stays the conversion path.

### 1B — Content (needs owner facts)
- Real realization pages (`/realizacje/[code]`): photos, what/for whom, material, finish, dimensions where known. Only confirmed facts; `TO_CONFIRM` facts are not published.
- Offer clarity: what we make, region, process steps, typical lead time, warranty.
- About page grounded in real people/workshop (owner decides how personal).
- Rebrand note for returning Drakkar clients ("Stolarnia Drakkar is now Avitus Materia") — wording depends on whether the legal entity changes.

### 1C — Trust and legal
- Privacy policy and inquiry-form consent notice (draft by Claude; owner/lawyer approves — not legal advice).
- New contact e-mail on the Avitus domain (owner sets up mailbox/DNS).

### 1D — Migration of the legacy site
- Inventory of `stolarnia-drakkar.pl` URLs → 301 redirects to matching Avitus pages once the old domain points here; keep Google ranking.
- Google Business Profile rename (owner action with prepared checklist).

## Owner inputs still open
| ID | Question | Blocks |
|---|---|---|
| Q1 | New public e-mail address on avitus-materia.com (does the mailbox exist?) | A2 |
| Q2 | Access to original photos (share Drive folder `1kDFHCBQ…` with the connected account, or a new folder) | A1, A3 |
| Q3 | Does the legal entity/company name/NIP change, or only the brand? | 1B rebrand note, 1C |
| Q4 | Who controls `stolarnia-drakkar.pl` (domain + WordPress hosting) and how long it stays online | A1 urgency, 1D |
| Q5 | Analytics: GA4 or privacy-friendly (Plausible/Umami)? Search Console owner | A8 |

## Network note
This session's cloud environment `avitus-materia-os` allows only `avitus-materia.com`, `www.` and `api.`. `stolarnia-drakkar.pl` is blocked, so legacy images cannot be fetched from here until the host is allowed.
