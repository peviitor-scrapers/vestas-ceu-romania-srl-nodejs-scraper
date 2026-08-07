# job_seeker_ro_spider

**job_seeker_ro_spider** — scraper pentru job-urile VESTAS CEU ROMANIA din România.

Extrage anunțurile de pe [Vestas Careers](https://careers.vestas.com/search/?q=&locationsearch=romania) și le publică în [peviitor.ro](https://peviitor.ro) prin API-ul Peviitor.

> **🌱 Derived scraper.** Acest repo este derivat din template-ul [epam-systems-international-srl-nodejs-scraper](https://github.com/sebiboga/epam-systems-international-srl-nodejs-scraper).

## Identificare

Toate request-urile HTTP folosesc User-Agent-ul:

```
job_seeker_ro_spider
```

## Ce face

1. **Validează compania** — interoghează API-ul public ANAF ([demoanaf.ro](https://demoanaf.ro)) după CIF-ul VESTAS (23012802) și verifică:
   - Denumirea oficială: VESTAS CEU ROMANIA S.R.L.
   - Status: activ/inactiv/radiat
   - Adresa completă din registrul comerțului
2. **Cross-validează cu Peviitor** — verifică existența companiei în API-ul Peviitor
3. **Scrape-uiește job-urile** — extrage lista completă de job-uri din pagina publică Vestas Careers (SuccessFactors), filtrat pe România
4. **Transformă datele** — normalizează locațiile (doar orașe românești), tag-urile (lowercase), workmode-ul (remote/on-site/hybrid)
5. **Stochează în Peviitor** — upsert prin API-ul Peviitor (job-uri și date companie)
6. **Generează jobs.md** — fișier markdown cu informații companie + toate job-urile curente

## API-uri folosite

| API | URL | Autentificare |
|---|---|---|
| Vestas Careers | `https://careers.vestas.com/search/...` | Public |
| ANAF (demoanaf) | `https://demoanaf.ro/api/...` | Public |
| Peviitor | `https://api.peviitor.ro/v1/company/` | Public |

## Robots.txt

Vestas Careers este o aplicație SuccessFactors (jobs2web). Pentru analiza completă a `robots.txt`, vezi [ai/ROBOTS.md](../ai/ROBOTS.md).

Scraper-ul face o singură cerere per run cu un singur User-Agent identificabil. Paginile individuale de job sunt doar verificate (HEAD request), nu parse-uite.

## Testare

```bash
# Toate testele
npm test

# Doar unitare
npm run test:unit

# Doar integrare (necesită ANAF live, Peviitor API conditional)
npm run test:integration

# Doar E2E (site real Vestas + ANAF + Peviitor)
npm run test:e2e
```

Testele Peviitor API folosesc `itIfApi` — se auto-skip dacă API-ul Peviitor nu e disponibil.
