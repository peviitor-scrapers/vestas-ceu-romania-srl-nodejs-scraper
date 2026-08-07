# Robots.txt Analysis — Vestas Careers

Sursa: https://careers.vestas.com/robots.txt

## Reguli

```
User-agent: *
Disallow: /applybutton/
Disallow: /talentcommunity/
Disallow: /mobile/talentcommunity/
Disallow: /emailsubscribe/
Disallow: /email/image/
Disallow: /services/
Disallow: /preapply/
Disallow: /error
Disallow: /unsubscribe/
Disallow: /reset/
```

## Interpretare

| Cale | Accesibil? | Ce conține |
|---|---|---|
| `/` | ✅ Permis | Tot site-ul (fără disallow global) |
| `/search/` | ✅ Permis | Pagina de căutare job-uri folosită de scraper |
| `/job/...` | ✅ Permis | Paginile individuale de job |
| `/applybutton/`, `/talentcommunity/`, etc. | ❌ Disallowed | Zone auxiliare, nefolosite de scraper |

## Recomandare

robots.txt NU este legal binding, dar reprezintă intenția proprietarului site-ului.

- Pagina de căutare (`/search/?q=&locationsearch=romania`) e **permisă** de robots.txt — este exact ce folosește scraper-ul.
- Paginile individuale de job sunt și ele permise. Noi nu le scraper-uim direct — doar le verificăm accesibilitatea (HEAD request) în teste.
- Scraperul curent face o singură cerere per run cu un singur User-Agent identificabil — comportament rezonabil, nu agresiv.

**Concluzie**: Risc minim. Pagina e publică, răspunde fără autentificare, permisă de robots.txt, iar scraperul e politicos (o singură cerere, User-Agent standard).
