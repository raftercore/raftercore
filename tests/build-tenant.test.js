import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { APP_FILES, NEVER, RENAME, TENANT_SCAFFOLD } = require('../build-tenant.js');

const applyFor = (map) => (s) => map.strings.reduce((acc, [re, rep]) => acc.replace(re, rep), s);

/* The rename table is two halves that have to agree: RENAME.files decides what
 * lands on disk, RENAME.strings rewrites references inside the files. When they
 * disagree the build still succeeds and the site 404s, which is the worst
 * possible failure shape -- so assert they agree. */
describe('RENAME: filenames on disk match in-file references', () => {
  for (const tenant of Object.keys(RENAME)) {
    const map = RENAME[tenant];
    const apply = applyFor(map);

    for (const [from, to] of Object.entries(map.files)) {
      it(`${tenant}: a link to ${from} rewrites to ${to}`, () => {
        expect(apply(from)).toBe(to);
      });
      it(`${tenant}: ${to} is lowercase (hosts are case-sensitive)`, () => {
        expect(to).toBe(to.toLowerCase());
      });
    }
  }
});

/* "Powered by RafterCore" is a term of the licence agreement. The bare
 * RafterCore -> LegacyCore rule would eat it without the sentinel dance. */
describe('RENAME: licence attribution survives', () => {
  for (const tenant of Object.keys(RENAME)) {
    const map = RENAME[tenant];
    const apply = applyFor(map);

    it(`${tenant}: keeps the attribution intact`, () => {
      expect(apply('Powered by RafterCore')).toBe('Powered by RafterCore');
      expect(apply('<footer>Powered by RafterCore</footer>'))
        .toBe('<footer>Powered by RafterCore</footer>');
    });
    it(`${tenant}: still renames a bare product mention`, () => {
      expect(apply('RafterCore')).not.toContain('RafterCore');
      expect(apply('PurlinCore')).not.toContain('PurlinCore');
      expect(apply('HomeGirder')).not.toContain('HomeGirder');
    });
    it(`${tenant}: leaves no sentinel behind`, () => {
      expect(apply('Powered by RafterCore and RafterCore')).not.toContain('\u0000');
      expect(apply('Powered by RafterCore and RafterCore'))
        .toBe('Powered by RafterCore and LegacyCore');
    });
  }
});

/* Tenant scaffolds must not ride into the RafterCore build via the marketing
 * sweep: the drafts carry DRAFT-NOT-FOR-PUBLICATION and fail the build, and
 * tenant-index.html would put a licensee's launcher on raftercore.com. */
describe('tenant scaffolds are excluded from the marketing sweep', () => {
  for (const f of ['tenant-index.html', 'tenant-privacy.html',
                   'tenant-terms.html', 'tenant-optout.html']) {
    it(`${f} matches TENANT_SCAFFOLD`, () => {
      expect(TENANT_SCAFFOLD.test(f)).toBe(true);
    });
  }
  it('a real marketing page does not match', () => {
    for (const f of ['index.html', 'storm.html', 'terms.html', 'pricing.html']) {
      expect(TENANT_SCAFFOLD.test(f)).toBe(false);
    }
  });
  it('scaffolds stay out of NEVER, so they can return to APP_FILES later', () => {
    const blocked = (rel) => NEVER.some((re) => re.test(rel));
    expect(blocked('tenant-privacy.html')).toBe(false);
    expect(blocked('tenant-terms.html')).toBe(false);
  });
});

/* The two drafts are out of APP_FILES until counsel's text lands. If someone
 * puts them back while the sentinel is still in the file the build fails --
 * this says so at test time instead. */
describe('APP_FILES', () => {
  it('does not ship the unwritten legal scaffolds', () => {
    expect(APP_FILES).not.toContain('tenant-privacy.html');
    expect(APP_FILES).not.toContain('tenant-terms.html');
  });
  it('still ships the working opt-out page', () => {
    expect(APP_FILES).toContain('tenant-optout.html');
  });
  it('lists no file twice', () => {
    expect(new Set(APP_FILES).size).toBe(APP_FILES.length);
  });
});
