import { jest } from '@jest/globals';

describe('index.js Component Tests', () => {
  let index;

  beforeAll(async () => {
    index = await import('../../scraper/index.js');
  });

  describe('transformJobsForSOLR', () => {
    it('should filter locations to only Romanian cities', () => {
      const payload = {
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', location: ['România'] },
          { url: 'https://test.com/2', title: 'Job 2', location: ['Bucharest'] },
          { url: 'https://test.com/3', title: 'Job 3', location: ['Bulgaria'] },
          { url: 'https://test.com/4', title: 'Job 4', location: ['Cluj-Napoca'] },
          { url: 'https://test.com/5', title: 'Job 5', location: [] }
        ]
      };

      const result = index.transformJobsForSOLR(payload);

      expect(result.jobs[0].location).toEqual(['România']);
      expect(result.jobs[1].location).toEqual(['Bucharest']);
      expect(result.jobs[2].location).toEqual(['România']);
      expect(result.jobs[3].location).toEqual(['Cluj-Napoca']);
      expect(result.jobs[4].location).toEqual(['România']);
    });

    it('should keep company uppercase', () => {
      const payload = {
        source: 'careers.vestas.com',
        company: 'vestas ceu romania s.r.l.',
        cif: '23012802',
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', company: 'vestas ceu', cif: '23012802' }
        ]
      };

      const result = index.transformJobsForSOLR(payload);

      expect(result.company).toBe('VESTAS CEU ROMANIA S.R.L.');
    });

    it('should normalize workmode values', () => {
      const payload = {
        jobs: [
          { url: 'https://test.com/1', title: 'Job 1', workmode: 'Remote' },
          { url: 'https://test.com/2', title: 'Job 2', workmode: 'ON-SITE' },
          { url: 'https://test.com/3', title: 'Job 3', workmode: 'Hybrid' },
          { url: 'https://test.com/4', title: 'Job 4', workmode: 'hybrid' }
        ]
      };

      const result = index.transformJobsForSOLR(payload);

      expect(result.jobs[0].workmode).toBe('remote');
      expect(result.jobs[1].workmode).toBe('on-site');
      expect(result.jobs[2].workmode).toBe('hybrid');
      expect(result.jobs[3].workmode).toBe('hybrid');
    });

    it('should handle empty jobs array', () => {
      const result = index.transformJobsForSOLR({ jobs: [] });
      expect(result.jobs).toEqual([]);
    });
  });

  describe('mapToJobModel', () => {
    it('should map raw job to job model format', () => {
      const rawJob = {
        url: 'https://careers.vestas.com/job/Field-Supervisor/1376537733/',
        title: 'Field Supervisor',
        location: ['Bârlad'],
        tags: ['wind', 'turbine'],
        workmode: 'on-site'
      };

      const COMPANY_NAME = 'VESTAS CEU ROMANIA S.R.L.';
      const COMPANY_CIF = '23012802';

      const result = index.mapToJobModel(rawJob, COMPANY_CIF, COMPANY_NAME);

      expect(result.url).toBe(rawJob.url);
      expect(result.title).toBe(rawJob.title);
      expect(result.company).toBe(COMPANY_NAME);
      expect(result.cif).toBe(COMPANY_CIF);
      expect(result.location).toEqual(rawJob.location);
      expect(result.tags).toEqual(rawJob.tags);
      expect(result.workmode).toBe(rawJob.workmode);
      expect(result.status).toBe('scraped');
      expect(result.date).toBeDefined();
    });

    it('should remove undefined fields', () => {
      const rawJob = {
        url: 'https://test.com/1',
        title: 'Job 1'
      };

      const result = index.mapToJobModel(rawJob, '23012802');

      expect(result.location).toBeUndefined();
      expect(result.tags).toBeUndefined();
      expect(result.workmode).toBeUndefined();
    });

    it('should handle missing title', () => {
      const rawJob = { url: 'https://test.com/1' };

      const result = index.mapToJobModel(rawJob, '23012802');

      expect(result.title).toBeUndefined();
      expect(result.url).toBe('https://test.com/1');
    });
  });

  describe('parseHtmlJobs', () => {
    const htmlFixture = `
      <table class="searchResults">
        <tbody>
          <tr class="data-row">
            <td class="colTitle">
              <span class="jobTitle hidden-phone">
                <a href="/job/Barlad-Field-Supervisor-Barlad-VS/1376537733/" class="jobTitle-link">Field Supervisor | Barlad</a>
              </span>
            </td>
            <td class="colLocation hidden-phone">
              <span class="jobLocation">Barlad, VS, RO</span>
            </td>
            <td class="colDepartment hidden-phone"><span class="jobDepartment">Field Operations</span></td>
          </tr>
          <tr class="data-row">
            <td class="colTitle">
              <span class="jobTitle hidden-phone">
                <a href="/job/Bucharest-Site-Manager-Romania-Bucu/1395165533/" class="jobTitle-link">Site Manager | Romania</a>
              </span>
            </td>
            <td class="colLocation hidden-phone">
              <span class="jobLocation">Bucharest, Bucuresti, RO</span>
            </td>
            <td class="colDepartment hidden-phone"><span class="jobDepartment">Construction</span></td>
          </tr>
          <tr class="data-row">
            <td class="colTitle">
              <span class="jobTitle hidden-phone">
                <a href="/job/Bucharest-Sales-Manager-Bucu-12095/1398848633/" class="jobTitle-link">Sales Manager</a>
              </span>
            </td>
            <td class="colLocation hidden-phone">
              <span class="jobLocation">Bucharest, Bucuresti, RO, 12095</span>
            </td>
            <td class="colDepartment hidden-phone"><span class="jobDepartment">Sales</span></td>
          </tr>
        </tbody>
      </table>
    `;

    it('should parse HTML rows into jobs', () => {
      const result = index.parseHtmlJobs(htmlFixture);

      expect(result.jobs).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('should extract title and strip the | City suffix', () => {
      const result = index.parseHtmlJobs(htmlFixture);

      expect(result.jobs[0].title).toBe('Field Supervisor');
      expect(result.jobs[1].title).toBe('Site Manager');
    });

    it('should build absolute URLs from relative hrefs', () => {
      const result = index.parseHtmlJobs(htmlFixture);

      expect(result.jobs[0].url).toBe('https://careers.vestas.com/job/Barlad-Field-Supervisor-Barlad-VS/1376537733/');
    });

    it('should extract Romanian city locations with diacritics', () => {
      const result = index.parseHtmlJobs(htmlFixture);

      expect(result.jobs[0].location).toEqual(['Bârlad']);
      expect(result.jobs[1].location).toEqual(['București']);
      expect(result.jobs[2].location).toEqual(['București']);
    });

    it('should handle empty HTML', () => {
      const result = index.parseHtmlJobs('');
      expect(result.jobs).toEqual([]);
    });

    it('should handle missing data-row elements', () => {
      const result = index.parseHtmlJobs('<html><body><p>No jobs</p></body></html>');
      expect(result.jobs).toEqual([]);
    });
  });
});
