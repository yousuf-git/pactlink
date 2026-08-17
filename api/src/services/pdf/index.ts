import { putObject } from '../../config/s3.js';
import { logger } from '../../config/logger.js';

/**
 * PDF generation service (F-02).
 *
 * Renders a branded HTML quote → PDF via Puppeteer (lazy-launched). If Chromium
 * is unavailable (CI / minimal containers) we fall back to storing the rendered
 * HTML as a `.html` "document" and log a warning — the flow never crashes.
 * Stores the artifact via the s3 config (or local) and returns a URL.
 */

interface BrandLike {
  businessName?: string;
  logoUrl?: string | null;
  primaryColor?: string;
}

interface LineItemLike {
  label: string;
  description?: string | null;
  qty: number;
  unitPrice: number;
  taxRate: number;
  type?: string;
  selected?: boolean;
}

export interface RenderQuoteInput {
  quoteId: unknown;
  title: string;
  currency: string;
  lineItems: LineItemLike[];
  subtotal: number;
  taxTotal: number;
  total: number;
  depositAmount: number;
  balanceAmount: number;
  brand?: BrandLike;
  clientName?: string;
}

function fmtMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );
}

/**
 * Build the branded HTML document for a quote, reusing the owner brand.
 */
export function renderQuoteHtml(input: RenderQuoteInput): string {
  const brand = input.brand ?? {};
  const color = brand.primaryColor ?? '#1B4965';
  const rows = input.lineItems
    .filter((li) => li.selected !== false)
    .map((li) => {
      const lineTotal = li.qty * li.unitPrice;
      return `<tr>
        <td>${esc(li.label)}${li.description ? `<br><small>${esc(li.description)}</small>` : ''}</td>
        <td style="text-align:right">${li.qty}</td>
        <td style="text-align:right;font-family:monospace">${fmtMoney(li.unitPrice, input.currency)}</td>
        <td style="text-align:right">${li.taxRate}%</td>
        <td style="text-align:right;font-family:monospace">${fmtMoney(lineTotal, input.currency)}</td>
      </tr>`;
    })
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Inter,Arial,sans-serif;color:#0F2330;margin:0;padding:32px;background:#fff}
    .header{background:${color};color:#fff;padding:24px;border-radius:12px;margin-bottom:24px}
    .header img{max-height:48px}
    h1{font-family:Georgia,'Times New Roman',serif;margin:0 0 4px}
    table{width:100%;border-collapse:collapse;margin:16px 0}
    th,td{padding:8px;border-bottom:1px solid #D7E0E8;text-align:left;font-size:14px}
    th{color:#5A6B78;font-size:12px;text-transform:uppercase}
    .totals{margin-top:16px;width:280px;margin-left:auto}
    .totals div{display:flex;justify-content:space-between;padding:4px 0}
    .totals .grand{font-weight:700;border-top:2px solid ${color};margin-top:8px;padding-top:8px}
    .deposit{color:#2E9E6B;font-weight:700}
  </style></head><body>
    <div class="header">
      ${brand.logoUrl ? `<img src="${esc(brand.logoUrl)}" alt="logo"><br>` : ''}
      <strong>${esc(brand.businessName ?? 'PactLink')}</strong>
    </div>
    <h1>${esc(input.title)}</h1>
    ${input.clientName ? `<p style="color:#5A6B78">Prepared for ${esc(input.clientName)}</p>` : ''}
    <table>
      <thead><tr><th>Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Tax</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div><span>Subtotal</span><span style="font-family:monospace">${fmtMoney(input.subtotal, input.currency)}</span></div>
      <div><span>Tax</span><span style="font-family:monospace">${fmtMoney(input.taxTotal, input.currency)}</span></div>
      <div class="grand"><span>Total</span><span style="font-family:monospace">${fmtMoney(input.total, input.currency)}</span></div>
      <div class="deposit"><span>Deposit due</span><span style="font-family:monospace">${fmtMoney(input.depositAmount, input.currency)}</span></div>
      <div><span>Balance</span><span style="font-family:monospace">${fmtMoney(input.balanceAmount, input.currency)}</span></div>
    </div>
  </body></html>`;
}

// Lazily-loaded Puppeteer browser, reused across renders.
let browserPromise: Promise<unknown> | null = null;
let puppeteerUnavailable = false;

async function getBrowser(): Promise<unknown | null> {
  if (puppeteerUnavailable) return null;
  if (browserPromise) return browserPromise;
  browserPromise = (async () => {
    const mod = (await import('puppeteer' as string).catch(() => null)) as
      | { default: { launch: (opts: unknown) => Promise<unknown> } }
      | null;
    if (!mod) {
      puppeteerUnavailable = true;
      logger.warn('puppeteer not installed — PDF generation will fall back to HTML output');
      return null;
    }
    try {
      return await mod.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    } catch (err) {
      puppeteerUnavailable = true;
      logger.warn('Failed to launch Chromium — PDF generation will fall back to HTML output', {
        err: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  })();
  return browserPromise;
}

export interface GenerateQuotePdfResult {
  url: string;
  key: string;
  contentType: string;
  fallback: boolean;
}

/**
 * Render the quote to PDF (or HTML fallback) and store it. Returns the URL.
 */
export async function generateQuotePdf(input: RenderQuoteInput): Promise<GenerateQuotePdfResult> {
  const html = renderQuoteHtml(input);
  const qid = String(input.quoteId);
  const browser = await getBrowser();

  if (browser) {
    try {
      // @ts-expect-error loosely-typed dynamic browser
      const page = await browser.newPage();
      try {
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdf = (await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '24px', bottom: '24px', left: '24px', right: '24px' },
        })) as Uint8Array;
        const stored = await putObject(`quotes/${qid}.pdf`, Buffer.from(pdf), 'application/pdf');
        return { url: stored.url, key: stored.key, contentType: 'application/pdf', fallback: false };
      } finally {
        await page.close();
      }
    } catch (err) {
      logger.warn('Puppeteer render failed — falling back to HTML output', {
        err: err instanceof Error ? err.message : String(err),
        quoteId: qid,
      });
    }
  }

  // Fallback: store HTML so the flow degrades gracefully (still a retrievable doc).
  const stored = await putObject(`quotes/${qid}.html`, Buffer.from(html, 'utf-8'), 'text/html');
  return { url: stored.url, key: stored.key, contentType: 'text/html', fallback: true };
}

/** Test/shutdown helper. */
export async function closePdfBrowser(): Promise<void> {
  if (!browserPromise) return;
  try {
    const b = await browserPromise;
    // @ts-expect-error loosely-typed dynamic browser
    if (b && typeof b.close === 'function') await b.close();
  } catch {
    /* noop */
  }
  browserPromise = null;
}
