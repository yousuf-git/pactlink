import { formatMoney } from "@/lib/utils";
import type { LineItem } from "@/lib/types";

// Printable-quote view → the browser's print dialog (Save as PDF). Works
// offline with zero deps; when USE_API=true the backend's puppeteer route
// produces the real file instead. Opens a clean, branded, print-styled
// document in a new window and triggers print.
export interface PrintableQuote {
  title: string;
  businessName: string;
  clientName?: string;
  currency: string;
  lineItems: LineItem[];
  subtotal: number;
  taxTotal: number;
  total: number;
  depositAmount: number;
  balanceAmount: number;
  amountPaid?: number;
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

export function openQuotePrintView(q: PrintableQuote): void {
  const m = (v: number) => formatMoney(v, q.currency);
  const rows = q.lineItems
    .filter((li) => li.selected !== false)
    .map(
      (li) => `<tr>
        <td>
          <div class="lab">${esc(li.label)}</div>
          ${li.description ? `<div class="desc">${esc(li.description)}</div>` : ""}
        </td>
        <td class="num">${li.qty}</td>
        <td class="num">${m(li.unitPrice)}</td>
        <td class="num">${m(li.qty * li.unitPrice)}</td>
      </tr>`
    )
    .join("");

  const paidRow =
    q.amountPaid && q.amountPaid > 0
      ? `<tr><td>Paid to date</td><td class="num">−${m(q.amountPaid)}</td></tr>
         <tr class="grand"><td>Remaining</td><td class="num">${m(Math.max(0, q.total - q.amountPaid))}</td></tr>`
      : "";

  const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>${esc(q.title)} — ${esc(q.businessName)}</title>
<style>
  @page { margin: 22mm; }
  * { box-sizing: border-box; }
  body { font-family: ui-sans-serif, "Inter", system-ui, sans-serif; color: #16181c; margin: 0; padding: 40px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .wm { font-family: "Bricolage Grotesque", ui-sans-serif, sans-serif; font-weight: 700; letter-spacing: -0.03em; font-size: 22px; }
  .wm .dot { color: #c99a4b; }
  .meta { font-family: ui-monospace, "JetBrains Mono", monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #9a968e; }
  h1 { font-family: "Bricolage Grotesque", ui-sans-serif, sans-serif; font-weight: 700; letter-spacing: -0.02em; font-size: 30px; margin: 28px 0 4px; }
  .hr { height: 1px; background: #d9d5cc; margin: 22px 0; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-family: ui-monospace, monospace; font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: #9a968e; padding: 0 0 10px; border-bottom: 1px solid #d9d5cc; }
  th.num, td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td { padding: 12px 0; border-bottom: 1px solid #ece9e2; vertical-align: top; }
  .lab { font-weight: 600; font-size: 14px; }
  .desc { color: #565a61; font-size: 12px; margin-top: 2px; }
  .totals { width: 320px; margin-left: auto; margin-top: 18px; }
  .totals table td { border: 0; padding: 6px 0; font-size: 13px; color: #565a61; }
  .totals td.num { color: #16181c; }
  .totals tr.grand td { border-top: 1px solid #d9d5cc; padding-top: 12px; font-weight: 700; font-size: 16px; color: #16181c; }
  .deposit { margin-top: 8px; border: 1px solid #c99a4b; background: rgba(201,154,65,0.08); padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
  .deposit .k { font-family: ui-monospace, monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #7a5d29; }
  .deposit .v { font-weight: 700; font-size: 18px; font-variant-numeric: tabular-nums; }
  .foot { margin-top: 40px; font-family: ui-monospace, monospace; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #9a968e; }
</style></head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <span class="wm">${esc(q.businessName)}<span class="dot">.</span></span>
    <span class="meta">Quote${q.clientName ? " · " + esc(q.clientName) : ""}</span>
  </div>
  <h1>${esc(q.title)}</h1>
  <div class="hr"></div>
  <table>
    <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <table>
      <tr><td>Subtotal</td><td class="num">${m(q.subtotal)}</td></tr>
      <tr><td>Tax</td><td class="num">${m(q.taxTotal)}</td></tr>
      <tr class="grand"><td>Total</td><td class="num">${m(q.total)}</td></tr>
      ${paidRow}
    </table>
    <div class="deposit"><span class="k">Deposit due</span><span class="v">${m(q.depositAmount)}</span></div>
  </div>
  <p class="foot">draft → sent → viewed → approved → deposit_paid → paid_in_full</p>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 150); };</script>
</body></html>`;

  const w = window.open("", "_blank", "noopener,width=900,height=1100");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
