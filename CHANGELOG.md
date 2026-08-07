# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-07

### Added
- Initial release — derived from [epam-systems-international-srl-nodejs-scraper](https://github.com/sebiboga/epam-systems-international-srl-nodejs-scraper) (template).
- VESTAS CEU ROMANIA S.R.L. identity (CIF: 23012802) in `scraper/config/company.json` and `docs/company.json`.
- HTML/cheerio scraping of Vestas Careers (SuccessFactors): `scraper/index.js` (`fetchJobsHtml`/`parseHtmlJobs`).
- Unit, integration, E2E and consistency tests updated for VESTAS.
- `tests/validate-vestas-jobs.js` job URL validator (multi-mode: `--head`, `--content`, `--browser`).
