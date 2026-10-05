import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { generateUniqueReceiptSerial } from "../utils/receiptUtils";

// Download HTML directly as an authentic PDF file (guaranteed visible and non-blank)
export async function downloadHtmlAsPdf(filename, htmlContent) {
  // Create an active iframe positioned off the screen surface but active for browser rendering
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "0";
  iframe.style.left = "0";
  iframe.style.width = "794px"; // 794px corresponds to A4 portrait at standard 96 DPI
  iframe.style.height = "1123px";
  iframe.style.zIndex = "-9999";
  iframe.style.opacity = "0.01";
  iframe.style.pointerEvents = "none";
  iframe.style.border = "none";
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Allow browser layout engine to fully parse fonts, styles, and dimensions
    await new Promise((resolve) => setTimeout(resolve, 300));

    const renderTarget = doc.body;
    const canvas = await html2canvas(renderTarget, {
      scale: 2, // 2x high-DPI crisp resolution for crystal clear text
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 794,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageWidth = 210; // A4 width mm
    const pageHeight = 297; // A4 height mm
    const margin = 6; // 6mm margin
    const contentWidth = pageWidth - (margin * 2);
    const contentHeight = (canvas.height * contentWidth) / canvas.width;
    const usableHeight = pageHeight - (margin * 2);

    let heightLeft = contentHeight;
    let page = 0;

    while (heightLeft > 0) {
      if (page > 0) {
        pdf.addPage();
      }
      const positionY = margin - (page * usableHeight);
      pdf.addImage(imgData, "PNG", margin, positionY, contentWidth, contentHeight);
      heightLeft -= usableHeight;
      page++;
    }

    const cleanName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
    pdf.save(cleanName);
  } catch (err) {
    console.error("Direct PDF download fallback to print dialog", err);
    printHtmlDocument(filename, htmlContent);
  } finally {
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1500);
  }
}

// Trigger formatted Excel spreadsheet download (.xls)
function triggerExcelDownload(htmlTableContent, filename) {
  const excelDoc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
<!--[if gte mso 9]>
<xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>Sheet1</x:Name>
    <x:WorksheetOptions>
     <x:DisplayGridlines/>
    </x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  table { border-collapse: collapse; font-family: Segoe UI, Calibri, Arial, sans-serif; font-size: 11pt; }
  th { background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #94a3b8; padding: 8px 12px; }
  td { border: 1px solid #cbd5e1; padding: 7px 10px; font-size: 10.5pt; }
  .title-cell { font-size: 16pt; font-weight: bold; color: #0f172a; border: none; }
  .meta-cell { font-size: 10pt; color: #475569; border: none; }
  .section-cell { background-color: #f1f5f9; font-weight: bold; font-size: 12pt; color: #1e293b; border: 1px solid #cbd5e1; }
  .text-danger { color: #dc2626; font-weight: bold; }
  .text-success { color: #16a34a; font-weight: bold; }
  .text-right { text-align: right; }
  .badge-active { background-color: #fef2f2; color: #b91c1c; font-weight: bold; text-align: center; }
  .badge-clear { background-color: #f0fdf4; color: #15803d; font-weight: bold; text-align: center; }
  .kpi-title { font-weight: bold; background-color: #f8fafc; }
</style>
</head>
<body>
${htmlTableContent}
</body>
</html>`;

  const blob = new Blob(["\uFEFF" + excelDoc], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const cleanName = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  a.setAttribute("download", cleanName);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Print HTML via an isolated iframe (as print fallback)
function printHtmlDocument(title, htmlContent) {
  // Create hidden iframe
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.title = title;
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    try {
      iframe.contentWindow.print();
    } catch {
      // Fallback for popups if iframe print is restricted
      const printWin = window.open("", "_blank");
      if (printWin) {
        printWin.document.write(htmlContent);
        printWin.document.close();
        printWin.focus();
        printWin.print();
      }
    }
    // Clean up iframe after printing
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 2000);
  }, 400);
}

// -------------------------------------------------------------
// EXCEL / CSV EXPORTS
// -------------------------------------------------------------

/**
 * Export overall financial ledger to a beautifully formatted Excel spreadsheet (.xls)
 */
export function exportOverallExcel(customers = [], transactions = [], shopInfo = {}, period = "All Time") {
  const currency = shopInfo?.currency || "Rs.";
  const storeName = shopInfo?.name || "Bismillah Store";
  const owner = shopInfo?.owner || "Shop Owner";
  const phone = shopInfo?.phone || "+92 300 1234567";
  const address = shopInfo?.address || "Main Market, Pakistan";
  const dateStr = new Date().toLocaleDateString("en-PK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totalUdhaar = transactions
    .filter((t) => t.type === "Udhaar")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalJama = transactions
    .filter((t) => t.type === "Jama")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const netReceivable = totalUdhaar - totalJama;
  const recoveryRate = totalUdhaar > 0 ? Math.round((totalJama / totalUdhaar) * 100) : 100;

  const html = `
    <table>
      <tr>
        <td colspan="7" class="title-cell">${storeName} - Financial Ledger & Recovery Report</td>
      </tr>
      <tr>
        <td colspan="7" class="meta-cell">Proprietor: <strong>${owner}</strong> • Phone: ${phone} • ${address}</td>
      </tr>
      <tr>
        <td colspan="7" class="meta-cell">Report Period: <strong>${period}</strong> • Generated On: <strong>${dateStr}</strong></td>
      </tr>
      <tr><td colspan="7" style="border:none;height:12px;"></td></tr>

      <!-- KPI Executive Summary -->
      <tr>
        <td colspan="7" class="section-cell">EXECUTIVE FINANCIAL SUMMARY</td>
      </tr>
      <tr>
        <th colspan="4" style="background-color:#0f172a;">Metric / KPI</th>
        <th colspan="3" style="background-color:#0f172a;text-align:right;">Amount / Value</th>
      </tr>
      <tr>
        <td colspan="4" class="kpi-title">Total Registered Accounts</td>
        <td colspan="3" class="text-right">${customers.length} Customers</td>
      </tr>
      <tr>
        <td colspan="4" class="kpi-title">Total Credit Extended (Udhaar)</td>
        <td colspan="3" class="text-right text-danger">${currency} ${totalUdhaar.toLocaleString()}</td>
      </tr>
      <tr>
        <td colspan="4" class="kpi-title">Total Cash Collected (Jama)</td>
        <td colspan="3" class="text-right text-success">${currency} ${totalJama.toLocaleString()}</td>
      </tr>
      <tr>
        <td colspan="4" class="kpi-title">Net Outstanding Receivable</td>
        <td colspan="3" class="text-right" style="font-weight:bold;color:#1e3a8a;">${currency} ${Math.max(0, netReceivable).toLocaleString()}</td>
      </tr>
      <tr>
        <td colspan="4" class="kpi-title">Overall Recovery Rate</td>
        <td colspan="3" class="text-right" style="font-weight:bold;color:#15803d;">${recoveryRate}%</td>
      </tr>
      <tr><td colspan="7" style="border:none;height:16px;"></td></tr>

      <!-- Customer Khata Balances -->
      <tr>
        <td colspan="7" class="section-cell">CUSTOMER KHATA BALANCES</td>
      </tr>
      <tr>
        <th style="background-color:#1e40af;">Customer Name</th>
        <th style="background-color:#1e40af;">Phone</th>
        <th style="background-color:#1e40af;">Address</th>
        <th style="background-color:#1e40af;text-align:right;">Total Udhaar</th>
        <th style="background-color:#1e40af;text-align:right;">Total Jama</th>
        <th style="background-color:#1e40af;text-align:right;">Net Balance</th>
        <th style="background-color:#1e40af;text-align:center;">Status</th>
      </tr>
      ${customers.map((c, i) => {
        const bal = c.balance || 0;
        const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
        return `
        <tr style="background-color:${bg};">
          <td><strong>${c.name}</strong></td>
          <td>${c.phone}</td>
          <td>${c.address || "Local Customer"}</td>
          <td class="text-right text-danger">${currency} ${(c.totalUdhaar || 0).toLocaleString()}</td>
          <td class="text-right text-success">${currency} ${(c.totalJama || 0).toLocaleString()}</td>
          <td class="text-right" style="font-weight:bold;color:${bal > 0 ? "#dc2626" : "#16a34a"};">${currency} ${bal.toLocaleString()}</td>
          <td class="${bal > 0 ? "badge-active" : "badge-clear"}">${bal > 0 ? "Pending Balance" : "Cleared"}</td>
        </tr>`;
      }).join("")}
      <tr><td colspan="7" style="border:none;height:16px;"></td></tr>

      <!-- Complete Transactions Ledger -->
      <tr>
        <td colspan="7" class="section-cell">TRANSACTION LEDGER ENTRIES</td>
      </tr>
      <tr>
        <th style="background-color:#0f172a;">Date</th>
        <th style="background-color:#0f172a;">Slip #</th>
        <th style="background-color:#0f172a;">Customer</th>
        <th style="background-color:#0f172a;">Type</th>
        <th style="background-color:#0f172a;">Description / Items</th>
        <th style="background-color:#0f172a;">Payment Method</th>
        <th style="background-color:#0f172a;text-align:right;">Amount</th>
      </tr>
      ${transactions.map((t, i) => {
        const isUdhaar = t.type === "Udhaar";
        const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
        return `
        <tr style="background-color:${bg};">
          <td>${t.date}</td>
          <td style="font-family:monospace;font-weight:bold;">${t.billNumber || "-"}</td>
          <td><strong>${t.customerName}</strong></td>
          <td style="font-weight:bold;color:${isUdhaar ? "#dc2626" : "#16a34a"};">${t.type}</td>
          <td>${t.description || "N/A"}</td>
          <td>${t.paymentMethod || "Cash"}</td>
          <td class="text-right" style="font-weight:bold;color:${isUdhaar ? "#dc2626" : "#16a34a"};">
            ${isUdhaar ? "-" : "+"} ${currency} ${Number(t.amount || 0).toLocaleString()}
          </td>
        </tr>`;
      }).join("")}
    </table>
  `;

  const cleanStoreName = storeName.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `${cleanStoreName}_Financial_Report_${new Date().toISOString().split("T")[0]}.xls`;
  triggerExcelDownload(html, filename);
}

/**
 * Export an individual customer's khata statement to formatted Excel (.xls)
 */
export function exportCustomerExcel(customer, transactions = [], shopInfo = {}) {
  if (!customer) return;

  const currency = shopInfo?.currency || "Rs.";
  const storeName = shopInfo?.name || "Bismillah Store";
  const owner = shopInfo?.owner || "Shop Owner";
  const phone = shopInfo?.phone || "+92 300 1234567";
  const address = shopInfo?.address || "Main Market, Pakistan";
  const dateStr = new Date().toLocaleDateString("en-PK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const customerTxns = transactions
    .filter((t) => t.customerId === customer.id)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  let runningBalance = 0;
  const statementRows = customerTxns.map((t) => {
    const delta = t.type === "Udhaar" ? Number(t.amount) : -Number(t.amount);
    runningBalance += delta;
    return {
      ...t,
      balanceAfter: runningBalance,
    };
  });

  const totalUdhaar = customerTxns
    .filter((t) => t.type === "Udhaar")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalJama = customerTxns
    .filter((t) => t.type === "Jama")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const netBalance = totalUdhaar - totalJama;

  const html = `
    <table>
      <tr>
        <td colspan="7" class="title-cell">${storeName} - Customer Khata Statement</td>
      </tr>
      <tr>
        <td colspan="7" class="meta-cell">Proprietor: <strong>${owner}</strong> • Tel: ${phone} • ${address}</td>
      </tr>
      <tr>
        <td colspan="7" class="meta-cell">Statement Date: <strong>${dateStr}</strong></td>
      </tr>
      <tr><td colspan="7" style="border:none;height:12px;"></td></tr>

      <!-- Customer Profile Banner -->
      <tr>
        <td colspan="7" class="section-cell">CUSTOMER PROFILE</td>
      </tr>
      <tr>
        <th colspan="2" style="background-color:#1e40af;">Customer Name</th>
        <th colspan="2" style="background-color:#1e40af;">Phone</th>
        <th colspan="2" style="background-color:#1e40af;">Address</th>
        <th style="background-color:#1e40af;text-align:center;">Account Status</th>
      </tr>
      <tr>
        <td colspan="2"><strong>${customer.name}</strong></td>
        <td colspan="2">${customer.phone}</td>
        <td colspan="2">${customer.address || "Local Customer"}</td>
        <td class="${netBalance > 0 ? "badge-active" : "badge-clear"}">${netBalance > 0 ? "Pending Balance" : "Cleared"}</td>
      </tr>
      <tr><td colspan="7" style="border:none;height:12px;"></td></tr>

      <!-- Account Summary -->
      <tr>
        <td colspan="7" class="section-cell">ACCOUNT TOTALS SUMMARY</td>
      </tr>
      <tr>
        <th colspan="3" style="background-color:#0f172a;">Financial Metric</th>
        <th colspan="4" style="background-color:#0f172a;text-align:right;">Amount (${currency})</th>
      </tr>
      <tr>
        <td colspan="3" class="kpi-title">Total Credit (Udhaar Taken)</td>
        <td colspan="4" class="text-right text-danger">${currency} ${totalUdhaar.toLocaleString()}</td>
      </tr>
      <tr>
        <td colspan="3" class="kpi-title">Total Payments (Jama Paid)</td>
        <td colspan="4" class="text-right text-success">${currency} ${totalJama.toLocaleString()}</td>
      </tr>
      <tr style="background-color:#eff6ff;">
        <td colspan="3" class="kpi-title" style="font-size:12pt;font-weight:bold;color:#1e3a8a;">Net Outstanding Balance Due</td>
        <td colspan="4" class="text-right" style="font-size:12pt;font-weight:bold;color:${netBalance > 0 ? "#dc2626" : "#16a34a"};">${currency} ${netBalance.toLocaleString()}</td>
      </tr>
      <tr><td colspan="7" style="border:none;height:16px;"></td></tr>

      <!-- Detailed Statement of Account -->
      <tr>
        <td colspan="7" class="section-cell">CHRONOLOGICAL STATEMENT OF ACCOUNT</td>
      </tr>
      <tr>
        <th style="background-color:#1e3a8a;">Date</th>
        <th style="background-color:#1e3a8a;">Slip #</th>
        <th style="background-color:#1e3a8a;">Description / Particulars</th>
        <th style="background-color:#1e3a8a;">Channel</th>
        <th style="background-color:#1e3a8a;text-align:right;">Debit (Udhaar)</th>
        <th style="background-color:#1e3a8a;text-align:right;">Credit (Jama)</th>
        <th style="background-color:#1e3a8a;text-align:right;">Running Balance</th>
      </tr>
      ${statementRows.map((r, i) => {
        const isUdhaar = r.type === "Udhaar";
        const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
        return `
        <tr style="background-color:${bg};">
          <td>${r.date}</td>
          <td style="font-family:monospace;font-weight:bold;">${r.billNumber || "-"}</td>
          <td><strong>${r.description || (isUdhaar ? "Goods purchase" : "Account credit payment")}</strong></td>
          <td>${r.paymentMethod || "Cash"}</td>
          <td class="text-right text-danger">${isUdhaar ? `${currency} ${Number(r.amount).toLocaleString()}` : "-"}</td>
          <td class="text-right text-success">${!isUdhaar ? `${currency} ${Number(r.amount).toLocaleString()}` : "-"}</td>
          <td class="text-right" style="font-weight:bold;color:#0f172a;">${currency} ${r.balanceAfter.toLocaleString()}</td>
        </tr>`;
      }).join("")}
    </table>
  `;

  const cleanCustomerName = customer.name.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `Khata_Statement_${cleanCustomerName}_${new Date().toISOString().split("T")[0]}.xls`;
  triggerExcelDownload(html, filename);
}

// -------------------------------------------------------------
// PDF EXPORTS (Via High-Resolution Clean Print Document)
// -------------------------------------------------------------

/**
 * Generate and trigger print/save PDF for overall financial report
 */
export function exportOverallPDF(customers = [], transactions = [], shopInfo = {}, period = "All Time") {
  const currency = shopInfo?.currency || "Rs.";
  const storeName = shopInfo?.name || "Bismillah Store";
  const owner = shopInfo?.owner || "Shop Owner";
  const phone = shopInfo?.phone || "+92 300 1234567";
  const address = shopInfo?.address || "Main Bazaar, Pakistan";
  const dateStr = new Date().toLocaleDateString("en-PK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totalUdhaar = transactions
    .filter((t) => t.type === "Udhaar")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalJama = transactions
    .filter((t) => t.type === "Jama")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const netReceivable = totalUdhaar - totalJama;
  const recoveryRate = totalUdhaar > 0 ? Math.round((totalJama / totalUdhaar) * 100) : 100;
  const pendingCustomers = customers.filter((c) => (c.balance || 0) > 0);

  const recentTxns = [...transactions].slice(0, 15);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${storeName} - Financial Ledger Report</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 14mm 14mm 14mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      font-size: 11pt;
      line-height: 1.4;
      padding: 10px;
    }
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .store-brand h1 {
      font-size: 20pt;
      color: #0f172a;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .store-brand p {
      font-size: 9pt;
      color: #64748b;
      margin-top: 2px;
    }
    .report-meta {
      text-align: right;
    }
    .report-badge {
      display: inline-block;
      background: #eff6ff;
      color: #1d4ed8;
      font-weight: 700;
      font-size: 9pt;
      padding: 3px 8px;
      border-radius: 4px;
      margin-bottom: 4px;
    }
    .report-meta p {
      font-size: 9pt;
      color: #64748b;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 12px;
      background: #f8fafc;
    }
    .kpi-label {
      font-size: 8pt;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.04em;
    }
    .kpi-val {
      font-size: 14pt;
      font-weight: 700;
      margin-top: 4px;
    }
    .text-danger { color: #dc2626; }
    .text-success { color: #16a34a; }
    .text-primary { color: #2563eb; }
    .text-warning { color: #d97706; }

    .section-title {
      font-size: 11pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border-left: 3px solid #2563eb;
      padding-left: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-bottom: 20px;
    }
    th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
    }
    td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      color: #334155;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    .text-right { text-align: right; }
    .footer-stamp-area {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px dashed #cbd5e1;
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      color: #64748b;
    }
    .sign-box {
      width: 180px;
      border-top: 1px solid #94a3b8;
      text-align: center;
      padding-top: 4px;
      margin-top: 35px;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="store-brand">
      <h1>${storeName}</h1>
      <p>Proprietor: <strong>${owner}</strong> • ${phone}</p>
      <p>${address}</p>
    </div>
    <div class="report-meta">
      <span class="report-badge">FINANCIAL REPORT</span>
      <p><strong>Period:</strong> ${period}</p>
      <p><strong>Date:</strong> ${dateStr}</p>
      <p><strong>Total Accounts:</strong> ${customers.length}</p>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Recovery Rate</div>
      <div class="kpi-val text-success">${recoveryRate}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Credit (Udhaar)</div>
      <div class="kpi-val text-danger">${currency} ${totalUdhaar.toLocaleString()}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Cash (Jama)</div>
      <div class="kpi-val text-primary">${currency} ${totalJama.toLocaleString()}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Net Receivable</div>
      <div class="kpi-val text-warning">${currency} ${Math.max(0, netReceivable).toLocaleString()}</div>
    </div>
  </div>

  <div class="section-title">Pending Khata Recovery Accounts (${pendingCustomers.length})</div>
  <table>
    <thead>
      <tr>
        <th>Customer Name</th>
        <th>Phone Number</th>
        <th>Address</th>
        <th class="text-right">Total Udhaar</th>
        <th class="text-right">Total Jama</th>
        <th class="text-right">Balance Due</th>
      </tr>
    </thead>
    <tbody>
      ${pendingCustomers.length === 0 ? '<tr><td colspan="6" style="text-align:center;">All accounts are cleared!</td></tr>' : ''}
      ${pendingCustomers.map((c) => `
        <tr>
          <td><strong>${c.name}</strong></td>
          <td>${c.phone}</td>
          <td>${c.address || "Local"}</td>
          <td class="text-right text-danger">${currency} ${(c.totalUdhaar || 0).toLocaleString()}</td>
          <td class="text-right text-success">${currency} ${(c.totalJama || 0).toLocaleString()}</td>
          <td class="text-right font-semibold text-danger"><strong>${currency} ${(c.balance || 0).toLocaleString()}</strong></td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="section-title">Recent Transactions Ledger Summary</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Slip #</th>
        <th>Customer</th>
        <th>Type</th>
        <th>Description</th>
        <th>Payment Method</th>
        <th class="text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${recentTxns.map((t) => `
        <tr>
          <td>${t.date}</td>
          <td>${t.billNumber || "-"}</td>
          <td><strong>${t.customerName}</strong></td>
          <td><span style="font-weight:600; color: ${t.type === "Udhaar" ? "#dc2626" : "#16a34a"}">${t.type}</span></td>
          <td>${t.description || "N/A"}</td>
          <td>${t.paymentMethod || "Cash"}</td>
          <td class="text-right" style="color: ${t.type === "Udhaar" ? "#dc2626" : "#16a34a"}">
            <strong>${t.type === "Udhaar" ? "-" : "+"} ${currency} ${Number(t.amount).toLocaleString()}</strong>
          </td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="footer-stamp-area">
    <div>
      <p>Generated digitally by HisabKitab Cloud Ledger.</p>
      <p>Official Record of Accounts for ${storeName}.</p>
    </div>
    <div>
      <div class="sign-box">Authorized Store Signature</div>
    </div>
  </div>
</body>
</html>`;

  const cleanStoreName = storeName.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `${cleanStoreName}_Financial_Report_${new Date().toISOString().split("T")[0]}.pdf`;
  downloadHtmlAsPdf(filename, html);
}

/**
 * Generate and trigger print/save PDF for an individual customer's khata statement
 */
export function exportCustomerPDF(customer, transactions = [], shopInfo = {}) {
  if (!customer) return;

  const currency = shopInfo?.currency || "Rs.";
  const storeName = shopInfo?.name || "Bismillah Store";
  const owner = shopInfo?.owner || "Shop Owner";
  const phone = shopInfo?.phone || "+92 300 1234567";
  const address = shopInfo?.address || "Main Bazaar, Pakistan";
  const dateStr = new Date().toLocaleDateString("en-PK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Filter transactions for this customer and sort chronologically
  const customerTxns = transactions
    .filter((t) => t.customerId === customer.id)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  let runningBalance = 0;
  const statementRows = customerTxns.map((t) => {
    const delta = t.type === "Udhaar" ? Number(t.amount) : -Number(t.amount);
    runningBalance += delta;
    return {
      ...t,
      balanceAfter: runningBalance,
    };
  });

  const totalUdhaar = customerTxns
    .filter((t) => t.type === "Udhaar")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalJama = customerTxns
    .filter((t) => t.type === "Jama")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const netBalance = totalUdhaar - totalJama;
  const uniqueStatementSerial = `HK-STMT-${customer.id ? customer.id.toUpperCase() : "CUST"}-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${customer.name} - Khata Statement (${storeName})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 14mm 14mm 14mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      font-size: 11pt;
      line-height: 1.4;
      padding: 10px;
    }
    .statement-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .store-brand h1 {
      font-size: 19pt;
      color: #0f172a;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .store-brand p {
      font-size: 9pt;
      color: #64748b;
      margin-top: 2px;
    }
    .statement-meta {
      text-align: right;
    }
    .statement-tag {
      display: inline-block;
      background: #eff6ff;
      color: #1d4ed8;
      font-weight: 700;
      font-size: 9pt;
      padding: 3px 8px;
      border-radius: 4px;
      margin-bottom: 4px;
    }
    .customer-profile-strip {
      display: flex;
      justify-content: space-between;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 16px;
    }
    .customer-info h2 {
      font-size: 13pt;
      color: #0f172a;
      font-weight: 700;
    }
    .customer-info p {
      font-size: 9pt;
      color: #64748b;
      margin-top: 2px;
    }
    .balance-box {
      text-align: right;
    }
    .balance-label {
      font-size: 8pt;
      text-transform: uppercase;
      font-weight: 600;
      color: #64748b;
    }
    .balance-amount {
      font-size: 16pt;
      font-weight: 800;
    }
    .text-danger { color: #dc2626; }
    .text-success { color: #16a34a; }

    .summary-strip {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }
    .summary-item {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
      background: #ffffff;
    }
    .summary-item-label {
      font-size: 8pt;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
    }
    .summary-item-val {
      font-size: 13pt;
      font-weight: 700;
      margin-top: 2px;
    }

    .section-title {
      font-size: 10pt;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      border-left: 3px solid #2563eb;
      padding-left: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-bottom: 20px;
    }
    th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 700;
      text-align: left;
      padding: 7px 8px;
      border: 1px solid #cbd5e1;
    }
    td {
      padding: 7px 8px;
      border: 1px solid #e2e8f0;
      color: #334155;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    .text-right { text-align: right; }
    .sign-container {
      margin-top: 35px;
      padding-top: 15px;
      border-top: 1px dashed #cbd5e1;
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      color: #64748b;
    }
    .sign-line {
      width: 160px;
      border-top: 1px solid #94a3b8;
      text-align: center;
      padding-top: 4px;
      margin-top: 35px;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="statement-header">
    <div class="store-brand">
      <h1>${storeName}</h1>
      <p>Proprietor: <strong>${owner}</strong> • ${phone}</p>
      <p>${address}</p>
    </div>
    <div class="statement-meta">
      <span class="statement-tag">CUSTOMER KHATA STATEMENT</span>
      <p><strong>Receipt Serial:</strong> <span style="font-family:monospace;font-weight:700;">${uniqueStatementSerial}</span></p>
      <p><strong>Statement Date:</strong> ${dateStr}</p>
      <p><strong>Entries Recorded:</strong> ${customerTxns.length}</p>
    </div>
  </div>

  <div class="customer-profile-strip">
    <div class="customer-info">
      <h2>${customer.name}</h2>
      <p><strong>Phone:</strong> ${customer.phone}</p>
      <p><strong>Address:</strong> ${customer.address || "Local Customer"}</p>
    </div>
    <div class="balance-box">
      <div class="balance-label">${netBalance > 0 ? "Outstanding Balance Owed" : "Account Status"}</div>
      <div class="balance-amount ${netBalance > 0 ? "text-danger" : "text-success"}">
        ${currency} ${netBalance.toLocaleString()}
      </div>
    </div>
  </div>

  <div class="summary-strip">
    <div class="summary-item">
      <div class="summary-item-label">Total Credit (Udhaar)</div>
      <div class="summary-item-val text-danger">${currency} ${totalUdhaar.toLocaleString()}</div>
    </div>
    <div class="summary-item">
      <div class="summary-item-label">Total Payments (Jama)</div>
      <div class="summary-item-val text-success">${currency} ${totalJama.toLocaleString()}</div>
    </div>
    <div class="summary-item">
      <div class="summary-item-label">Net Balance</div>
      <div class="summary-item-val ${netBalance > 0 ? "text-danger" : "text-success"}">
        ${currency} ${netBalance.toLocaleString()}
      </div>
    </div>
  </div>

  <div class="section-title">Chronological Statement of Account</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Slip #</th>
        <th>Description / Goods</th>
        <th>Method</th>
        <th class="text-right">Debit (Udhaar)</th>
        <th class="text-right">Credit (Jama)</th>
        <th class="text-right">Account Balance</th>
      </tr>
    </thead>
    <tbody>
      ${statementRows.length === 0 ? '<tr><td colspan="7" style="text-align:center;">No transactions recorded yet.</td></tr>' : ''}
      ${statementRows.map((r) => {
        const isUdhaar = r.type === "Udhaar";
        return `
          <tr>
            <td>${r.date}</td>
            <td>${r.billNumber || "-"}</td>
            <td><strong>${r.description || (isUdhaar ? "Goods purchase" : "Account payment")}</strong></td>
            <td>${r.paymentMethod || "Cash"}</td>
            <td class="text-right text-danger">${isUdhaar ? `${currency} ${Number(r.amount).toLocaleString()}` : "-"}</td>
            <td class="text-right text-success">${!isUdhaar ? `${currency} ${Number(r.amount).toLocaleString()}` : "-"}</td>
            <td class="text-right font-semibold"><strong>${currency} ${r.balanceAfter.toLocaleString()}</strong></td>
          </tr>
        `;
      }).join("")}
    </tbody>
  </table>

  <div class="sign-container">
    <div>
      <div class="sign-line">Customer Signature</div>
    </div>
    <div style="text-align: right;">
      <div class="sign-line" style="margin-left: auto;">Authorized Store Stamp</div>
    </div>
  </div>
</body>
</html>`;

  const cleanCustomerName = customer.name.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `${cleanCustomerName}_Khata_Statement_${new Date().toISOString().split("T")[0]}.pdf`;
  downloadHtmlAsPdf(filename, html);
}

/**
 * Print/Export an individual, official person transaction receipt slip
 * Each receipt contains a guaranteed unique receipt number and digital verification serial.
 */
export function exportTransactionReceiptPDF(transaction = {}, customer = {}, shopInfo = {}) {
  const currency = shopInfo?.currency || "Rs.";
  const storeName = shopInfo?.name || "Bismillah Store";
  const owner = shopInfo?.owner || "Shop Owner";
  const phone = shopInfo?.phone || "+92 300 1234567";
  const address = shopInfo?.address || "Main Bazaar, Gujranwala, Punjab, Pakistan";
  const customerName = transaction.customerName || customer.name || "Customer";
  const customerPhone = customer.phone || "On File";
  const customerAddress = customer.address || "";
  const isUdhaar = transaction.type === "Udhaar";

  const dateStr = transaction.date || new Date().toISOString().split("T")[0];
  const timeStr = new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
  const uniqueSerial = generateUniqueReceiptSerial(transaction);
  const billNo = transaction.billNumber || "REC-N/A";
  const amountFormatted = `${currency} ${Number(transaction.amount || 0).toLocaleString()}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt - ${billNo} - ${customerName}</title>
  <style>
    @page {
      size: A5 portrait;
      margin: 12mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 16px;
      font-size: 10pt;
      line-height: 1.4;
    }
    .receipt-container {
      max-width: 480px;
      margin: 0 auto;
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      padding: 24px;
      background: #ffffff;
      position: relative;
    }
    .receipt-header {
      text-align: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .store-name {
      font-size: 18pt;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px 0;
      letter-spacing: -0.02em;
    }
    .store-sub {
      font-size: 9pt;
      color: #475569;
      margin: 2px 0;
    }
    .receipt-badge-strip {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding: 8px 12px;
      background: ${isUdhaar ? "#fef2f2" : "#f0fdf4"};
      border: 1px solid ${isUdhaar ? "#fecaca" : "#bbf7d0"};
      border-radius: 8px;
    }
    .receipt-type-tag {
      font-size: 11pt;
      font-weight: 800;
      color: ${isUdhaar ? "#b91c1c" : "#15803d"};
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .receipt-number {
      font-family: "Courier New", monospace, monospace;
      font-size: 13pt;
      font-weight: 800;
      color: #0f172a;
    }
    .unique-pill {
      font-size: 7.5pt;
      background: #e2e8f0;
      padding: 2px 6px;
      border-radius: 4px;
      color: #334155;
      font-weight: 600;
      display: inline-block;
      margin-top: 2px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 9.5pt;
    }
    .info-table td {
      padding: 6px 4px;
      vertical-align: top;
    }
    .info-label {
      color: #64748b;
      font-weight: 600;
      width: 120px;
    }
    .info-value {
      color: #0f172a;
      font-weight: 500;
    }
    .amount-highlight-box {
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      text-align: center;
      margin: 18px 0;
    }
    .amount-label {
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      font-weight: 700;
    }
    .amount-value {
      font-size: 24pt;
      font-weight: 900;
      color: ${isUdhaar ? "#dc2626" : "#16a34a"};
      margin-top: 4px;
      letter-spacing: -0.02em;
    }
    .meta-footer {
      border-top: 1px dashed #cbd5e1;
      padding-top: 14px;
      margin-top: 16px;
      font-size: 8pt;
      color: #64748b;
      text-align: center;
    }
    .serial-tag {
      font-family: monospace;
      font-size: 8.5pt;
      font-weight: 700;
      color: #1e293b;
      background: #f1f5f9;
      padding: 3px 8px;
      border-radius: 4px;
      display: inline-block;
      margin: 6px 0;
    }
    .signatures-row {
      display: flex;
      justify-content: space-between;
      margin-top: 36px;
      padding-top: 8px;
    }
    .sig-col {
      width: 150px;
      text-align: center;
      border-top: 1px solid #94a3b8;
      font-size: 8.5pt;
      font-weight: 600;
      color: #475569;
      padding-top: 4px;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="receipt-header">
      <h1 class="store-name">${storeName}</h1>
      <p class="store-sub">Proprietor: <strong>${owner}</strong> • Tel: ${phone}</p>
      <p class="store-sub">${address}</p>
    </div>

    <div class="receipt-badge-strip">
      <div>
        <div class="receipt-type-tag">${isUdhaar ? "Udhaar (Credit Slip)" : "Jama (Payment Receipt)"}</div>
        <span class="unique-pill">AUTHENTICATED • UNIQUE SLIP</span>
      </div>
      <div style="text-align: right;">
        <div class="receipt-number">${billNo}</div>
        <div style="font-size: 8pt; color: #64748b;">${dateStr} ${timeStr}</div>
      </div>
    </div>

    <table class="info-table">
      <tr>
        <td class="info-label">Customer Name:</td>
        <td class="info-value"><strong>${customerName}</strong></td>
      </tr>
      <tr>
        <td class="info-label">Contact / Phone:</td>
        <td class="info-value">${customerPhone}</td>
      </tr>
      ${customerAddress ? `
      <tr>
        <td class="info-label">Address:</td>
        <td class="info-value">${customerAddress}</td>
      </tr>
      ` : ""}
      <tr>
        <td class="info-label">Payment Channel:</td>
        <td class="info-value"><strong>${transaction.paymentMethod || "Cash"}</strong></td>
      </tr>
      <tr>
        <td class="info-label">Particulars / Notes:</td>
        <td class="info-value">${transaction.description || (isUdhaar ? "General goods purchase" : "Account credit payment")}</td>
      </tr>
    </table>

    <div class="amount-highlight-box">
      <div class="amount-label">${isUdhaar ? "Net Amount Debited" : "Net Amount Received"}</div>
      <div class="amount-value">${amountFormatted}</div>
      <div style="font-size: 8.5pt; color: #475569; margin-top: 4px;">
        ${isUdhaar ? "Added to customer khata ledger." : "Deducted from customer khata balance."}
      </div>
    </div>

    <div class="signatures-row">
      <div class="sig-col">Customer Signature</div>
      <div class="sig-col">Authorized Cashier / Stamp</div>
    </div>

    <div class="meta-footer">
      <div>Unique Digital Audit Serial:</div>
      <div class="serial-tag">${uniqueSerial}</div>
      <div>Official computer-generated receipt from HisabKitab khata system.</div>
    </div>
  </div>
</body>
</html>`;

  const cleanNo = billNo.replace(/[^a-zA-Z0-9]/g, "_");
  const cleanCustomerName = customerName.replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `Receipt_${cleanNo}_${cleanCustomerName}.pdf`;
  downloadHtmlAsPdf(filename, html);
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIER STATEMENT EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a running-balance ledger from supplier transactions (oldest first).
 * Returns an array of rows with { ...txn, runningBalance }
 */
function buildSupplierLedger(txns) {
  const sorted = [...txns].sort((a, b) => new Date(a.date) - new Date(b.date));
  let balance = 0;
  return sorted.map((t) => {
    const debit  = Number(t.debit  || 0);
    const credit = Number(t.credit || 0);
    balance += debit - credit;
    return { ...t, runningBalance: balance };
  });
}

/**
 * Export a Supplier Statement as a formatted PDF.
 */
export function exportSupplierStatementPDF(supplier, txns = [], shopInfo = {}, fromDate = null, toDate = null) {
  if (!supplier) return;

  const currency  = shopInfo?.currency || "Rs.";
  const storeName = shopInfo?.name || "Bismillah Store";
  const owner     = shopInfo?.owner || "Shop Owner";
  const phone     = shopInfo?.phone || "+92 300 1234567";
  const address   = shopInfo?.address || "Main Bazaar, Pakistan";
  const dateStr   = new Date().toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" });

  // Apply date filter
  let filtered = txns.filter((t) => t.supplierId === supplier.id);
  if (fromDate) filtered = filtered.filter((t) => t.date >= fromDate);
  if (toDate)   filtered = filtered.filter((t) => t.date <= toDate);

  const ledger = buildSupplierLedger(filtered);

  const openBal      = filtered.filter((t) => t.type === "Opening Balance").reduce((s, t) => s + Number(t.debit || 0), 0);
  const totalPurch   = filtered.filter((t) => t.type === "Purchase").reduce((s, t) => s + Number(t.debit || 0), 0);
  const totalPayments= filtered.filter((t) => t.type === "Payment").reduce((s, t) => s + Number(t.credit || 0), 0);
  const totalReturns = filtered.filter((t) => t.type === "Purchase Return").reduce((s, t) => s + Number(t.credit || 0), 0);
  const closingBal   = openBal + totalPurch - totalPayments - totalReturns;

  const periodLabel = fromDate && toDate ? `${fromDate} to ${toDate}` : fromDate ? `From ${fromDate}` : toDate ? `Until ${toDate}` : "All Time";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${supplier.name} - Supplier Statement (${storeName})</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; background: #fff; font-size: 11pt; line-height: 1.4; padding: 10px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #7c3aed; padding-bottom: 14px; margin-bottom: 16px; }
    .brand h1 { font-size: 19pt; color: #0f172a; font-weight: 800; }
    .brand p { font-size: 9pt; color: #64748b; margin-top: 2px; }
    .meta { text-align: right; }
    .badge { display: inline-block; background: #f5f3ff; color: #7c3aed; font-weight: 700; font-size: 9pt; padding: 3px 8px; border-radius: 4px; margin-bottom: 4px; }
    .meta p { font-size: 9pt; color: #64748b; }
    .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 18px; }
    .kpi-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 9px 12px; background: #f8fafc; }
    .kpi-label { font-size: 7.5pt; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.04em; }
    .kpi-val { font-size: 12pt; font-weight: 700; margin-top: 4px; }
    .text-danger { color: #dc2626; } .text-success { color: #16a34a; } .text-primary { color: #2563eb; } .text-warning { color: #d97706; } .text-purple { color: #7c3aed; }
    .section-title { font-size: 10.5pt; font-weight: 700; color: #0f172a; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.03em; border-left: 3px solid #7c3aed; padding-left: 8px; }
    .profile-box { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 18px; }
    .profile-cell { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; }
    .profile-cell .lbl { font-size: 8pt; color: #64748b; display: block; }
    .profile-cell .val { font-size: 10pt; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 20px; }
    th { background: #f1f5f9; color: #475569; font-weight: 700; text-align: left; padding: 6px 8px; border: 1px solid #cbd5e1; }
    td { padding: 5px 8px; border: 1px solid #e2e8f0; color: #334155; }
    tr:nth-child(even) { background: #f8fafc; }
    .text-right { text-align: right; }
    .footer { margin-top: 28px; padding-top: 14px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; font-size: 9pt; color: #64748b; }
    .sign-box { width: 180px; border-top: 1px solid #94a3b8; text-align: center; padding-top: 4px; margin-top: 32px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <h1>${storeName}</h1>
      <p>Proprietor: <strong>${owner}</strong> • ${phone}</p>
      <p>${address}</p>
    </div>
    <div class="meta">
      <span class="badge">SUPPLIER STATEMENT</span>
      <p><strong>Supplier:</strong> ${supplier.name}</p>
      <p><strong>Period:</strong> ${periodLabel}</p>
      <p><strong>Generated:</strong> ${dateStr}</p>
    </div>
  </div>

  <div class="section-title">Supplier Profile</div>
  <div class="profile-box" style="margin-bottom:16px;">
    <div class="profile-cell"><span class="lbl">Supplier Name</span><span class="val">${supplier.name}</span></div>
    <div class="profile-cell"><span class="lbl">Phone Number</span><span class="val">${supplier.phone || "—"}</span></div>
    <div class="profile-cell"><span class="lbl">Email Address</span><span class="val">${supplier.email || "—"}</span></div>
    <div class="profile-cell"><span class="lbl">Address</span><span class="val">${supplier.address || "—"}</span></div>
    <div class="profile-cell"><span class="lbl">Account Status</span><span class="val" style="color:${supplier.status === "Active" ? "#16a34a" : "#64748b"}">${supplier.status || "Active"}</span></div>
    <div class="profile-cell"><span class="lbl">Account ID</span><span class="val">${supplier.id}</span></div>
  </div>

  <div class="section-title">Financial Summary</div>
  <div class="kpi-grid" style="margin-bottom:18px;">
    <div class="kpi-card"><div class="kpi-label">Opening Balance</div><div class="kpi-val text-primary">${currency} ${openBal.toLocaleString()}</div></div>
    <div class="kpi-card"><div class="kpi-label">Total Purchases</div><div class="kpi-val text-danger">${currency} ${totalPurch.toLocaleString()}</div></div>
    <div class="kpi-card"><div class="kpi-label">Total Payments</div><div class="kpi-val text-success">${currency} ${totalPayments.toLocaleString()}</div></div>
    <div class="kpi-card"><div class="kpi-label">Purchase Returns</div><div class="kpi-val text-warning">${currency} ${totalReturns.toLocaleString()}</div></div>
    <div class="kpi-card"><div class="kpi-label">Outstanding Payable</div><div class="kpi-val ${closingBal > 0 ? "text-danger" : "text-success"}">${currency} ${closingBal.toLocaleString()}</div></div>
  </div>

  <div class="section-title">Statement of Account (${ledger.length} entries)</div>
  <table>
    <thead>
      <tr>
        <th>Date</th><th>Reference</th><th>Type</th><th>Description</th>
        <th class="text-right">Debit</th><th class="text-right">Credit</th><th class="text-right">Running Balance</th>
      </tr>
    </thead>
    <tbody>
      ${ledger.length === 0 ? '<tr><td colspan="7" style="text-align:center;">No transactions found for selected period.</td></tr>' : ""}
      ${ledger.map((r) => {
        const debit  = Number(r.debit  || 0);
        const credit = Number(r.credit || 0);
        const bal    = r.runningBalance;
        return `<tr>
          <td>${r.date}</td>
          <td style="font-family:monospace;font-size:8pt;">${r.reference || "—"}</td>
          <td style="font-weight:600;color:${debit > 0 ? "#dc2626" : "#16a34a"}">${r.type}</td>
          <td>${r.description || "—"}</td>
          <td class="text-right text-danger">${debit > 0 ? `${currency} ${debit.toLocaleString()}` : "—"}</td>
          <td class="text-right text-success">${credit > 0 ? `${currency} ${credit.toLocaleString()}` : "—"}</td>
          <td class="text-right" style="font-weight:700;color:${bal > 0 ? "#dc2626" : "#16a34a"}">${currency} ${bal.toLocaleString()}</td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>

  <div class="footer">
    <div>
      <p>Generated digitally by HisabKitab Cloud Ledger.</p>
      <p>Supplier Statement for ${storeName} • ${dateStr}</p>
    </div>
    <div><div class="sign-box">Authorized Signature</div></div>
  </div>
</body>
</html>`;

  const cleanName = supplier.name.replace(/[^a-zA-Z0-9]/g, "_");
  downloadHtmlAsPdf(`Supplier_Statement_${cleanName}_${new Date().toISOString().split("T")[0]}.pdf`, html);
}

/**
 * Export a Supplier Statement as a formatted Excel (.xls).
 */
export function exportSupplierStatementExcel(supplier, txns = [], shopInfo = {}, fromDate = null, toDate = null) {
  if (!supplier) return;

  const currency  = shopInfo?.currency || "Rs.";
  const storeName = shopInfo?.name || "Bismillah Store";
  const dateStr   = new Date().toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" });
  const periodLabel = fromDate && toDate ? `${fromDate} to ${toDate}` : "All Time";

  let filtered = txns.filter((t) => t.supplierId === supplier.id);
  if (fromDate) filtered = filtered.filter((t) => t.date >= fromDate);
  if (toDate)   filtered = filtered.filter((t) => t.date <= toDate);

  const ledger = buildSupplierLedger(filtered);

  const openBal       = filtered.filter((t) => t.type === "Opening Balance").reduce((s, t) => s + Number(t.debit || 0), 0);
  const totalPurch    = filtered.filter((t) => t.type === "Purchase").reduce((s, t) => s + Number(t.debit || 0), 0);
  const totalPayments = filtered.filter((t) => t.type === "Payment").reduce((s, t) => s + Number(t.credit || 0), 0);
  const totalReturns  = filtered.filter((t) => t.type === "Purchase Return").reduce((s, t) => s + Number(t.credit || 0), 0);
  const closingBal    = openBal + totalPurch - totalPayments - totalReturns;

  const html = `
    <table>
      <tr><td colspan="7" class="title-cell">${storeName} - Supplier Khata Statement</td></tr>
      <tr><td colspan="7" class="meta-cell">Supplier: <strong>${supplier.name}</strong> • Phone: ${supplier.phone || "—"} • ${supplier.email || ""}</td></tr>
      <tr><td colspan="7" class="meta-cell">Period: <strong>${periodLabel}</strong> • Generated: <strong>${dateStr}</strong></td></tr>
      <tr><td colspan="7" style="border:none;height:12px;"></td></tr>

      <tr><td colspan="7" class="section-cell">FINANCIAL SUMMARY</td></tr>
      <tr>
        <td colspan="3" class="kpi-title">Opening Balance</td>
        <td colspan="4" class="text-right">${currency} ${openBal.toLocaleString()}</td>
      </tr>
      <tr>
        <td colspan="3" class="kpi-title">Total Purchases</td>
        <td colspan="4" class="text-right text-danger">${currency} ${totalPurch.toLocaleString()}</td>
      </tr>
      <tr>
        <td colspan="3" class="kpi-title">Total Payments Made</td>
        <td colspan="4" class="text-right text-success">${currency} ${totalPayments.toLocaleString()}</td>
      </tr>
      <tr>
        <td colspan="3" class="kpi-title">Total Purchase Returns</td>
        <td colspan="4" class="text-right">${currency} ${totalReturns.toLocaleString()}</td>
      </tr>
      <tr style="background-color:#eff6ff;">
        <td colspan="3" class="kpi-title" style="font-size:12pt;font-weight:bold;color:#1e3a8a;">Outstanding Payable (Closing Balance)</td>
        <td colspan="4" class="text-right" style="font-size:12pt;font-weight:bold;color:${closingBal > 0 ? "#dc2626" : "#16a34a"};">${currency} ${closingBal.toLocaleString()}</td>
      </tr>
      <tr><td colspan="7" style="border:none;height:16px;"></td></tr>

      <tr><td colspan="7" class="section-cell">CHRONOLOGICAL STATEMENT OF ACCOUNT</td></tr>
      <tr>
        <th style="background-color:#581c87;">Date</th>
        <th style="background-color:#581c87;">Reference</th>
        <th style="background-color:#581c87;">Type</th>
        <th style="background-color:#581c87;">Description</th>
        <th style="background-color:#581c87;text-align:right;">Debit</th>
        <th style="background-color:#581c87;text-align:right;">Credit</th>
        <th style="background-color:#581c87;text-align:right;">Running Balance</th>
      </tr>
      ${ledger.map((r, i) => {
        const debit  = Number(r.debit  || 0);
        const credit = Number(r.credit || 0);
        const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
        return `<tr style="background-color:${bg};">
          <td>${r.date}</td>
          <td style="font-family:monospace;">${r.reference || "—"}</td>
          <td style="font-weight:bold;">${r.type}</td>
          <td>${r.description || "—"}</td>
          <td class="text-right text-danger">${debit > 0 ? `${currency} ${debit.toLocaleString()}` : "—"}</td>
          <td class="text-right text-success">${credit > 0 ? `${currency} ${credit.toLocaleString()}` : "—"}</td>
          <td class="text-right" style="font-weight:bold;color:${r.runningBalance > 0 ? "#dc2626" : "#16a34a"};">${currency} ${r.runningBalance.toLocaleString()}</td>
        </tr>`;
      }).join("")}
    </table>`;

  const cleanName = supplier.name.replace(/[^a-zA-Z0-9]/g, "_");
  triggerExcelDownload(html, `Supplier_Statement_${cleanName}_${new Date().toISOString().split("T")[0]}.xls`);
}
