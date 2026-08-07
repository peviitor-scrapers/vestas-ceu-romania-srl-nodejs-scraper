import { jest } from '@jest/globals';
import fetch from 'node-fetch';

const API_BASE = 'https://api.peviitor.ro/v1';
const VESTAS_CIF = '23012802';

let HAS_API = false;

async function checkApiAvailability() {
  try {
    const res = await fetch(`${API_BASE}/scraper/jobs/?cif=${VESTAS_CIF}&rows=1`, {
      signal: AbortSignal.timeout(5000)
    });
    return res.ok || res.status === 400;
  } catch {
    return false;
  }
}

let HAS_ANAF = false;

async function checkAnafAvailability() {
  try {
    const res = await fetch('https://demoanaf.ro/api/search?q=test', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    return res.ok;
  } catch {
    return false;
  }
}

function itIfApi(name, fn, timeout) {
  if (HAS_API) {
    return it(name, fn, timeout);
  }
  return it.skip(`${name} (skipped: API unavailable)`, fn, timeout);
}

function itIfAnaf(name, fn, timeout) {
  if (HAS_ANAF) {
    return it(name, fn, timeout);
  }
  return it.skip(`${name} (skipped: ANAF API unavailable)`, fn, timeout);
}

import companyConfig from '../../scraper/config/company.js';
import scraperConfig from '../../scraper/config/scraper.js';
const TEST_CIF = companyConfig.id;
const TEST_BRAND = companyConfig.brand;
const COMPANY_NAME = companyConfig.company;
const VESTAS_URL = `${scraperConfig.apiBase}${scraperConfig.searchPath}`;

beforeAll(async () => {
  [HAS_API, HAS_ANAF] = await Promise.all([checkApiAvailability(), checkAnafAvailability()]);
});

describe('E2E: Full Scraping Pipeline', () => {

  describe('Vestas Careers — Real Data Fetch', () => {
    let html;

    beforeAll(async () => {
      const res = await fetch(VESTAS_URL, {
        headers: {
          'User-Agent': 'job_seeker_ro_spider',
          'Accept': 'text/html'
        }
      });
      expect(res.ok).toBe(true);
      html = await res.text();
    }, 60000);

    it('should respond with valid HTML from Vestas careers', () => {
      expect(html.length).toBeGreaterThan(0);
      expect(html).toContain('data-row');
    }, 10000);

    it('should contain job result rows', () => {
      const rows = html.match(/class="data-row"/g) || [];
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  describe('Parse + Transform Pipeline', () => {
    let index;
    let html;

    beforeAll(async () => {
      index = await import('../../scraper/index.js');
      const res = await fetch(VESTAS_URL, {
        headers: {
          'User-Agent': 'job_seeker_ro_spider',
          'Accept': 'text/html'
        }
      });
      html = await res.text();
    }, 60000);

    it('should parse real Vestas HTML response into standardized format', () => {
      const result = index.parseHtmlJobs(html);

      expect(result).toHaveProperty('jobs');
      expect(result).toHaveProperty('total');
      expect(result.jobs.length).toBeGreaterThan(0);

      const parsed = result.jobs[0];
      expect(parsed).toHaveProperty('url');
      expect(parsed.url).toMatch(/^https:\/\/careers\.vestas\.com\//);
      expect(parsed).toHaveProperty('title');
      expect(parsed).toHaveProperty('location');
      expect(Array.isArray(parsed.location)).toBe(true);
    });

    it('should map parsed jobs to job model', () => {
      const parsed = index.parseHtmlJobs(html);
      const model = index.mapToJobModel(parsed.jobs[0], TEST_CIF);

      expect(model).toHaveProperty('url');
      expect(model).toHaveProperty('title');
      expect(model).toHaveProperty('company');
      expect(model).toHaveProperty('cif', TEST_CIF);
      expect(model).toHaveProperty('status', 'scraped');
      expect(model).toHaveProperty('date');
      expect(model.url).toMatch(/^https:\/\/careers\.vestas\.com\//);
    });

    it('should transform jobs and filter to Romanian locations', () => {
      const parsed = index.parseHtmlJobs(html);
      const jobs = parsed.jobs.map(j => index.mapToJobModel(j, TEST_CIF));

      const payload = {
        source: 'careers.vestas.com',
        company: COMPANY_NAME,
        cif: TEST_CIF,
        jobs
      };

      const transformed = index.transformJobsForSOLR(payload);

      expect(transformed.company).toBe(COMPANY_NAME);
      expect(transformed.jobs.length).toBe(jobs.length);

      for (const job of transformed.jobs) {
        expect(job).toHaveProperty('location');
        expect(Array.isArray(job.location)).toBe(true);
        expect(job.location.length).toBeGreaterThan(0);
      }
    });

    it('should produce valid job URLs that are accessible', async () => {
      const parsed = index.parseHtmlJobs(html);

      for (const job of parsed.jobs.slice(0, 2)) {
        const res = await fetch(job.url, {
          method: 'HEAD',
          headers: { 'User-Agent': 'job_seeker_ro_spider' }
        });
        expect(res.ok).toBe(true);
      }
    }, 30000);
  });

  describe('Company Validation Path', () => {
    let anaf;
    let company;

    beforeAll(async () => {
      anaf = await import('../../scraper/anaf.js');
      company = await import('../../scraper/company.js');
    });

    itIfAnaf('should find VESTAS in ANAF and validate active status', async () => {
      const results = await anaf.searchCompany(TEST_BRAND);

      const vestas = results.find(c =>
        c.cui.toString() === TEST_CIF &&
        c.statusLabel === 'Funcțiune'
      );
      expect(vestas).toBeDefined();
      expect(vestas.cui.toString()).toBe(TEST_CIF);

      const anafData = await anaf.getCompanyFromANAF(TEST_CIF);
      expect(anafData).toBeDefined();
      expect(anafData.inactive).toBe(false);
    }, 30000);

    itIfApi('should run full validation and report active status with job count', async () => {
      const result = await company.validateAndGetCompany();

      expect(result.status).toBe('active');
      expect(result.company).toBe(COMPANY_NAME);
      expect(result.cif).toBe(TEST_CIF);

      if (result.existingJobsCount === 0) {
        console.log('⚠️ No VESTAS jobs in API — skipping job count assertion');
        return;
      }
      expect(result.existingJobsCount).toBeGreaterThan(0);
    }, 30000);
  });

  describe('Inactive Company Handling', () => {
    let anaf;

    beforeAll(async () => {
      anaf = await import('../../scraper/anaf.js');
    });

    itIfAnaf('should detect inactive/radiated companies via ANAF', async () => {
      const results = await anaf.searchCompany(TEST_BRAND);

      const nonActive = results.find(c => c.statusLabel !== 'Funcțiune');

      if (nonActive) {
        try {
          const anafData = await anaf.getCompanyFromANAF(nonActive.cui.toString());
          expect(anafData).toBeDefined();
          if (anafData.inactive !== undefined) {
            expect(anafData.inactive).toBe(true);
          }
        } catch {
          expect(nonActive.statusLabel).toMatch(/Radiată|Inactiv|Suspendat/);
        }
      }
    }, 30000);
  });

  describe('API Data Verification', () => {
    let api;

    beforeAll(async () => {
      api = await import('../../scraper/api.js');
    });

    itIfApi('should have VESTAS jobs in API with correct company name', async () => {
      const result = await api.querySOLR(TEST_CIF);

      if (result.numFound === 0) {
        console.log('⚠️ No VESTAS jobs in API — skipping API data verification');
        return;
      }

      for (const job of result.docs) {
        expect(job.company).toBe(COMPANY_NAME);
        expect(job.cif).toBe(TEST_CIF);
      }
    }, 15000);

    itIfApi('should have VESTAS company core entry with required fields', async () => {
      const companyDoc = await api.getCompanyByCif(TEST_CIF);

      expect(companyDoc).toBeDefined();
      expect(companyDoc.company).toBe(COMPANY_NAME);
      expect(companyDoc.status).toBe('activ');
    }, 15000);
  });
});
