#!/usr/bin/env node
/* ============================================================
 * build-tenant.js — assemble the publish folder for one deployment
 *
 * WHY THIS EXISTS
 *
 * netlify.toml sets `publish = "."`, which ships the entire working
 * directory. That is workable for raftercore.com because the repo IS the
 * website, and 39 forced-404 rules plus security-scan.js hold the line on
 * internal files.
 *
 * It does not survive a second tenant. Deploying this repo to
 * legacy.raftercore.app as-is would serve RafterCore's whole marketing site off
 * Legacy's domain — 56 root HTML pages including pricing, the competitor
 * comparison pages, the storm.html lead marketplace, and terms.html,
 * msa.html and dpa.html. A licensee's customers would land on the
 * licensor's sales funnel and legal agreements.
 *
 * So the publish folder stops being the repo and becomes a built artifact.
 * Both sites move to `publish = "dist"`. A tenant build copies only the app
 * surface; the RafterCore build copies the marketing site as well.
 *
 * This also retires a class of bug rather than guarding against it. Today an
 * internal file is public unless a forced rule hides it — the scan exists
 * because the default is exposure. With a built dist/, a file is private
 * unless this script copies it. Keep security-scan.js as the backstop, but
 * it should stop being the only thing standing between a migration file and
 * the open internet.
 *
 *   node build-tenant.js            -> reads TENANT env, defaults raftercore
 *   node build-tenant.js legacy     -> explicit
 * ============================================================ */

const fs   = require('fs');
const path = require('path');

const TENANT = (process.argv[2] || process.env.TENANT || 'raftercore').toLowerCase();
const OUT    = path.join(__dirname, 'dist');

/* The app surface. Every tenant gets these. Names are the current ones; the
 * rename to LegacyCore / LegacyCRM happens at copy time via RENAME below. */
/* The app surface. Every tenant gets these. Names are the current ones; the
 * rename to LegacyCore / LegacyCRM happens at copy time via RENAME below.
 *
 * The last two are not marketing. A licensee needs them because the apps
 * collect homeowner names, addresses, phone numbers and signatures, and the
 * automations can send email and SMS. They are the minimum functional legal
 * surface, not a website.
 *
 * TODO(legal): restore 'tenant-privacy.html' and 'tenant-terms.html' here.
 * They are scaffolds carrying the DRAFT-NOT-FOR-PUBLICATION sentinel, and the
 * sentinel check below refuses to publish while it is present — which failed
 * BOTH the legacy and the raftercore build, so leaving them listed would take
 * raftercore.com's own deploy down once publish = "dist" lands. The owner is
 * getting the real text from counsel; when it arrives, drop the sentinel and
 * add these two lines back. Until then a tenant has no privacy policy or
 * terms at /tenant-privacy.html or /tenant-terms.html, and any footer or
 * email linking to them will 404. */
const APP_FILES = [
  'purlincore.html',
  'homegirder.html',
  'RafterCore-Merchant.html',
  'RafterCore-Customer.html',
  'RafterCore-Owner.html',
  'estimate.html',
  'estimate-sign.html',
  'proposal.html',
  'change-order.html',
  'gcal_callback.html',
  '404.html',
  'tenant-optout.html',       // working opt-out, see optout-action-patch.md
  'delete-account.html',      // data deletion request route
];

/* Directories copied wholesale for every tenant. */
const APP_DIRS = ['assets', 'brand', 'img'];

/* Licensees get the apps and nothing else — no marketing site. That leaves
 * the site root with nothing to serve, and a 404 at `/` is a bad front door
 * for a tool people sign into every morning.
 *
 * `tenant-index.html` is that front door: a sign-in launcher for the three
 * apps, no marketing copy, no claims. It ships as index.html on tenant
 * builds only. RafterCore keeps its own index.html from the marketing site.
 *
 * It also carries the ROC number. A launcher is arguably not advertising
 * under A.R.S. 32-1124(B), but the Registrar reads "prominently" as the home
 * page rather than the footer, and putting it on the one page that is
 * unambiguously the home page costs nothing. */
const TENANT_ROOT = 'tenant-index.html';

/* RafterCore-only. The marketing site, the lead marketplace, the legal pages
 * that are RafterCore's agreements with ITS customers, and the licensee-
 * facing sales material. None of it belongs on a tenant domain. */
const RAFTERCORE_ONLY_GLOB = /\.html$/;

/* Tenant scaffolds sit at the repo root but are not RafterCore pages, and the
 * marketing sweep below copies every root .html that NEVER does not block.
 * Two consequences, both on the RafterCore build:
 *
 *   - tenant-privacy.html and tenant-terms.html come back into dist/ carrying
 *     DRAFT-NOT-FOR-PUBLICATION, so the sentinel check fails raftercore's own
 *     build. Dropping them from APP_FILES alone does not prevent this; the
 *     sweep re-adds them.
 *   - tenant-index.html is copied verbatim, because RENAME has no 'raftercore'
 *     key, which would serve Legacy's branded launcher on raftercore.com at
 *     /tenant-index.html.
 *
 * Tenant builds get these through APP_FILES and TENANT_ROOT, never the sweep,
 * so excluding them here costs a tenant nothing. Kept separate from NEVER on
 * purpose: NEVER is also enforced against dist/ by the leaked-files check, and
 * listing them there would fail the build once the real legal text lands and
 * tenant-privacy.html and tenant-terms.html return to APP_FILES. */
const TENANT_SCAFFOLD = /^tenant-.*\.html$/;

/* Never copied anywhere, tenant or not. Source, tests, schemas, migrations,
 * internal docs, build tooling. These are the files the 39 forced-404 rules
 * currently chase. */
const NEVER = [
  /^functions[\/\\]/, /^tests[\/\\]/, /^docs[\/\\]/, /^node_modules[\/\\]/,
  /^\.git/, /^dist[\/\\]/,
  /\.sql$/i, /\.md$/i, /\.test\.js$/i,
  /^security-scan\.js$/, /^schema-scan\.js$/, /^clean-stale\.js$/,
  /^stamp-build\.js$/, /^build-tenant\.js$/,
  /^package(-lock)?\.json$/, /^netlify\.toml$/, /^vitest\.config/,
  /^RafterCore-Website-V3\.html$/,   // stale copy, already 404'd
  /^reviews\.html$/,                  // internal playbook
  /^deploy_inspect[\/\\]/,            // stale app copies
  /-SECURE\.html$/,                   // ditto
];

/* Product renames per tenant. Applied to filenames and to the in-file
 * strings, so a tenant deployment carries no RafterCore product names except
 * the attribution the license agreement requires. */
const RENAME = {
  legacy: {
    files: {
      'purlincore.html':          'legacycrm.html',
      'homegirder.html':          'legacyfield.html',
      'RafterCore-Merchant.html': 'legacycore-merchant.html',
      'RafterCore-Customer.html': 'legacycore-customer.html',
      'RafterCore-Owner.html':    'legacycore-owner.html',
    },
    // Order matters: longest first, or "RafterCore" eats "RafterCore-Merchant".
    strings: [
      [/RafterCore-Merchant/g, 'LegacyCore-Merchant'],
      [/RafterCore-Customer/g, 'LegacyCore-Customer'],
      [/RafterCore-Owner/g,    'LegacyCore-Owner'],
      [/PurlinCore/g,          'LegacyCRM'],
      [/HomeGirder/g,          'LegacyField'],
      [/purlincore\.html/g,    'legacycrm.html'],
      [/homegirder\.html/g,    'legacyfield.html'],
      [/RafterCore Roofing/g,  'Legacy Construction and Roofing'],
      // Bare "RafterCore" is LAST and deliberately NOT global-replaced —
      // "Powered by RafterCore" is a term of the license agreement and the
      // attribution has to survive the build. Handled by keeping the phrase
      // intact before the bare replacement runs.
      [/Powered by RafterCore/g, '\u0000ATTRIB\u0000'],
      [/RafterCore/g,            'LegacyCore'],
      [/\u0000ATTRIB\u0000/g,    'Powered by RafterCore'],
    ],
  },
};

function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }

function blocked(rel) { return NEVER.some((re) => re.test(rel)); }

function copyDir(src, destRoot, relBase = '') {
  if (!fs.existsSync(src)) return 0;
  let n = 0;
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const rel = path.join(relBase, e.name);
    if (blocked(rel)) continue;
    const from = path.join(src, e.name);
    const to   = path.join(destRoot, rel);
    if (e.isDirectory()) { n += copyDir(from, destRoot, rel); }
    else { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); n++; }
  }
  return n;
}

function copyFile(name, tenant) {
  const from = path.join(__dirname, name);
  if (!fs.existsSync(from)) { console.warn(`  skip (missing): ${name}`); return false; }

  const map    = RENAME[tenant];
  const target = (map && map.files[name]) || name;
  const to     = path.join(OUT, target);
  fs.mkdirSync(path.dirname(to), { recursive: true });

  if (map && /\.(html|js|css)$/i.test(name)) {
    let s = fs.readFileSync(from, 'utf8');
    for (const [re, rep] of map.strings) s = s.replace(re, rep);
    fs.writeFileSync(to, s);
  } else {
    fs.copyFileSync(from, to);
  }
  return true;
}

function main() {
  console.log(`build-tenant: ${TENANT}`);
  rmrf(OUT);
  fs.mkdirSync(OUT, { recursive: true });

  let files = 0;
  for (const f of APP_FILES) if (copyFile(f, TENANT)) files++;
  for (const d of APP_DIRS)  files += copyDir(path.join(__dirname, d), OUT, d);

  if (TENANT === 'raftercore') {
    // The marketing site ships only on the RafterCore deployment.
    for (const e of fs.readdirSync(__dirname, { withFileTypes: true })) {
      if (!e.isFile() || blocked(e.name)) continue;
      if (!RAFTERCORE_ONLY_GLOB.test(e.name)) continue;
      if (TENANT_SCAFFOLD.test(e.name)) continue;
      if (fs.existsSync(path.join(OUT, e.name))) continue;  // already copied
      if (copyFile(e.name, TENANT)) files++;
    }
  } else {
    // Check for leaked marketing pages BEFORE the launcher is written.
    // Running it afterwards flags the launcher itself, since it lands as
    // index.html — which is exactly what the check is looking for.
    const marketing = ['index.html', 'storm.html', 'terms.html', 'msa.html',
                       'dpa.html', 'book.html', 'pricing.html', 'contact.html',
                       'case-studies.html', 'academy.html', 'best-roofing-software.html'];
    const found = marketing.filter((f) => fs.existsSync(path.join(OUT, f)));
    if (found.length) {
      console.error(`build-tenant: refusing to publish, RafterCore marketing in a tenant build: ${found.join(', ')}`);
      process.exit(1);
    }

    // Licensees get the launcher as their root. Renames apply, so the same
    // source file serves every tenant.
    const src = path.join(__dirname, TENANT_ROOT);
    if (!fs.existsSync(src)) {
      console.error(`build-tenant: ${TENANT_ROOT} is missing — a tenant build has no root page.`);
      process.exit(1);
    }
    let s = fs.readFileSync(src, 'utf8');
    const map = RENAME[TENANT];
    if (map) for (const [re, rep] of map.strings) s = s.replace(re, rep);
    fs.writeFileSync(path.join(OUT, 'index.html'), s);
    files++;
  }

  // Fail loudly rather than shipping a tenant site with the wrong contents.
  const leaked = fs.readdirSync(OUT).filter((f) => blocked(f));
  if (leaked.length) {
    console.error(`build-tenant: refusing to publish, blocked files in dist: ${leaked.join(', ')}`);
    process.exit(1);
  }
  // A placeholder privacy policy on a live site is worse than none: it is a
  // published statement about how personal data is handled, and it is false.
  // The scaffolds carry a sentinel; this refuses to ship while it is there.
  const drafts = fs.readdirSync(OUT)
    .filter((f) => f.endsWith('.html'))
    .filter((f) => fs.readFileSync(path.join(OUT, f), 'utf8').includes('DRAFT-NOT-FOR-PUBLICATION'));
  if (drafts.length) {
    console.error(`build-tenant: refusing to publish, unwritten legal pages: ${drafts.join(', ')}`);
    console.error('  Replace the text, then remove the DRAFT-NOT-FOR-PUBLICATION sentinel.');
    process.exit(1);
  }

  if (TENANT !== 'raftercore' && !fs.existsSync(path.join(OUT, 'index.html'))) {
    console.error('build-tenant: tenant build has no root page.');
    process.exit(1);
  }

  console.log(`build-tenant: ${files} files -> dist/`);
}

main();
