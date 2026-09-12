/* ============================================================
 * legacy-theme.js — tenant identity for LegacyCore and LegacyCRM
 *
 * One file per deployment. In the silo model every tenant gets its own
 * Netlify site, so branding needs no database columns — this object is the
 * single source of truth and the apps read from it instead of carrying
 * hardcoded strings.
 *
 *   RafterCore (homeowner + merchant portal) -> LegacyCore
 *   PurlinCore (estimating, canvass, CRM)    -> LegacyCRM
 *   HomeGirder (field module inside the CRM) -> LegacyField   [placeholder]
 *
 * ── THE PALETTE IS NOW MEASURED, NOT GUESSED ────────────────────────────
 * Both logo files were sampled. The white knockout is #FFFFFF on
 * transparent. The black-background version is #FFFFFF on #000000 — 258
 * distinct values, all greyscale, maximum saturation 0.017, which is JPEG
 * compression noise. Zero pixels carry any hue.
 *
 * Legacy's identity is achromatic. So this one is too.
 *
 * White is the brand. Colour appears only where it carries meaning — a
 * passed check, a warning, a failure — and nowhere else. Three reasons: it
 * is faithful to the only asset that exists; it separates Legacy from
 * RafterCore gold completely on a shared screen, which matters when both
 * companies sell in the same metro; and when nothing is decorative colour,
 * a red actually means something.
 *
 * If Legacy later produces a brand colour it belongs in `accent` below and
 * nothing else changes. Keeping it null is a position, not a gap.
 * ============================================================ */

export const TENANT = {
  id: 'legacy',

  legalName: 'Legacy Construction and Roofing LLC',
  tradeName: 'Legacy Construction and Roofing',
  short:     'Legacy',

  // `split` drives the two-tone wordmark: first half white, second half
  // stepped back to --t3. Not coloured up — there is no colour to use.
  products: {
    portal: { name: 'LegacyCore',  split: ['LEGACY', 'CORE']  },
    crm:    { name: 'LegacyCRM',   split: ['LEGACY', 'CRM']   },
    field:  { name: 'LegacyField', split: ['LEGACY', 'FIELD'] },
  },

  poweredBy: true,
  poweredByText: 'Powered by RafterCore',

  phone:     '(623) 267-5839',
  phoneHref: 'tel:+16232675839',
  email:     'info@legacypros.io',
  website:   'https://legacypros.io',
  address:   '9299 W Olive Ave STE 402, Peoria, AZ 85345',

  // Verified against the AZ ROC contractor search, 11 Sep 2026: Active,
  // Peoria AZ 85345. Officers of record are Jhonatan Castro (Manager,
  // Qualifying Party) and Blake Allen Hahn (Manager, Member).
  //
  // A.R.S. 32-1124(B) puts this number on advertising, bids, estimates and
  // correspondence; 32-1158(A) puts it in every contract over $1,000. The
  // ROC reads "prominently" as the home page, not the footer.
  licenseNo:       '366573',
  licenseClass:    'KB-2 Dual Residential and Small Commercial',
  licenseState:    'AZ',
  qualifyingParty: 'Jhonatan Castro',
  licenseVerified: '2026-09-11',

  // KB-2 carries the scope of a B-2 General Small Commercial plus a B-
  // General Residential licence. It is a general class, so roofing,
  // casitas and hardscape are in scope directly or through subs. HVAC,
  // plumbing, electrical and pools are NOT covered by a general dual
  // licence and need their own classification or a licensed sub — which
  // matters because legacypros.io advertises all four. See the note in
  // PROVISIONED.md; confirm with the ROC before those lines are sold
  // through the platform.
  displayFormat: 'AZ ROC 366573',

  // The supplied wordmark is white, which is right for dark chrome and
  // unusable on cream surfaces. A black-on-white version is needed for
  // proposals, invoices and anything printed or emailed. Both files
  // supplied are raster; a vector is needed for print and favicons.
  logoLight: '/brand/legacy-wordmark-white.svg',  // supplied as raster
  logoDark:  '/brand/legacy-wordmark-black.svg',  // NEEDED
  mark:      '/brand/legacy-mark.svg',
  favicon:   '/brand/legacy-favicon.svg',
};

/* ── Palette ────────────────────────────────────────────────────────────
 * True black, not a tinted near-black. Their wordmark sits on #000000 and
 * anything warmer fights it.
 *
 * Every pairing was contrast-checked against the surface it is used on.
 * Lowest is --t3 on --s2 at 5.15:1; the white-on-black primary button is
 * 21:1. All pass WCAG AA at body size. If you add a value, check it — same
 * rule the roofing site runs on.
 */
export const PALETTE = {
  bg:     '#000000',   // page
  s1:     '#0B0D0F',   // app bar, module
  s2:     '#14171A',   // inputs, panels
  s3:     '#1C2024',   // active sub-tab
  line:   '#272C32',
  lineHi: '#3A4149',

  t1:     '#FFFFFF',   // headings, marks, primary fill
  t2:     '#BFC6CD',   // body
  t3:     '#828A93',   // muted, second half of the wordmark

  // Meaning only. Never decoration.
  ok:     '#3FAE6B',
  warn:   '#E0A21B',
  bad:    '#E0533D',

  // Light surfaces — proposals, invoices, email, print
  pg:     '#FFFFFF',
  band:   '#F2F3F4',
  txL:    '#000000',
  boL:    '#4A5057',

  accent: null,        // deliberately empty; see the header
};

/* The chamfer is the one device borrowed from the mark. Every letterform
 * has its corners cut — the L monogram, the G, the C, the R. Nothing in the
 * UI is rounded; the active tab and the primary button carry a single cut
 * corner and everything else is square. Depth in px. */
export const CUT = 10;

export const TYPE = {
  // Chakra Petch has chamfered terminals, the closest widely available face
  // to their letterform logic. Display and wordmark only — an oblique
  // industrial face is not body copy.
  display: "'Chakra Petch', system-ui, sans-serif",
  // Plain grotesque for everything a person actually reads. Carried over
  // from the RafterCore stylesheet; no reason to differentiate.
  ui:      "'Public Sans', system-ui, sans-serif",
};

/* Emits the custom properties the stylesheets consume. Inject once at boot;
 * components read var(--…) and know nothing about tenants. */
export function themeCss(p = PALETTE, cut = CUT, t = TYPE) {
  return `:root{
  --bg:${p.bg}; --s1:${p.s1}; --s2:${p.s2}; --s3:${p.s3};
  --line:${p.line}; --line-hi:${p.lineHi};
  --t1:${p.t1}; --t2:${p.t2}; --t3:${p.t3};
  --ok:${p.ok}; --warn:${p.warn}; --bad:${p.bad};
  --pg:${p.pg}; --band:${p.band}; --txL:${p.txL}; --boL:${p.boL};
  --disp:${t.display}; --ui:${t.ui}; --cut:${cut}px;
}`;
}

/* Call before rendering anything carrying a license line. Throwing is
 * deliberate — an Arizona estimate without an ROC number is a compliance
 * problem, and a blank space is the failure that ships unnoticed. */
export function assertLicensed(t = TENANT) {
  if (!t.licenseNo) {
    throw new Error(
      `${t.tradeName}: licenseNo is not set. An Arizona estimate, proposal, ` +
      `contract or advertisement must carry the ROC number ` +
      `(A.R.S. 32-1124(B), 32-1158(A)). Set TENANT.licenseNo before enabling ` +
      `customer-facing output.`
    );
  }
  return t.licenseNo;
}

export default TENANT;
