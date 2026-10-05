import emailjs from "@emailjs/browser";

/**
 * Default EmailJS Configuration
 * Users can provide environment variables:
 * VITE_EMAILJS_SERVICE_ID
 * VITE_EMAILJS_TEMPLATE_ID
 * VITE_EMAILJS_PUBLIC_KEY
 * 
 * Or configure them in localStorage under 'hisabkitab_emailjs_config'
 */
const DEFAULT_CONFIG = {
  serviceId: import.meta.env?.VITE_EMAILJS_SERVICE_ID || "",
  templateId: import.meta.env?.VITE_EMAILJS_TEMPLATE_ID || "",
  publicKey: import.meta.env?.VITE_EMAILJS_PUBLIC_KEY || "",
};

export const getEmailConfig = (fallback = {}) => {
  try {
    const saved = localStorage.getItem("hisabkitab_emailjs_config");
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        serviceId: parsed.serviceId || DEFAULT_CONFIG.serviceId,
        templateId: parsed.templateId || DEFAULT_CONFIG.templateId,
        publicKey: parsed.publicKey || fallback.publicKey || DEFAULT_CONFIG.publicKey,
      };
    }
  } catch (err) {
    console.error("Failed to parse email config", err);
  }
  return {
    serviceId: fallback.serviceId || DEFAULT_CONFIG.serviceId,
    templateId: fallback.templateId || DEFAULT_CONFIG.templateId,
    publicKey: fallback.publicKey || DEFAULT_CONFIG.publicKey,
  };
};

export const saveEmailConfig = (config) => {
  try {
    localStorage.setItem("hisabkitab_emailjs_config", JSON.stringify(config));
    return true;
  } catch (err) {
    console.error("Failed to save email config", err);
    return false;
  }
};

/**
 * Generate a professional HTML email template branded "Alam Garments"
 */
export const generateAlamGarmentsEmailHtml = ({
  recipientName,
  recipientType = "Customer", // "Customer" | "Supplier"
  transactionType, // "Udhaar", "Jama", "Purchase", "Payment"
  amount,
  date,
  description,
  updatedBalance,
  previousBalance,
  currency = "Rs.",
  billNumber = "",
  shopInfo = { name: "Alam Garments", phone: "0300-1234567", email: "alam.garments@gmail.com" },
}) => {
  const isDebit = transactionType === "Udhaar" || transactionType === "Purchase";
  const badgeColor = isDebit ? "#e11d48" : "#16a34a";
  const badgeBg = isDebit ? "#ffe4e6" : "#dcfce7";
  const formattedAmount = `${currency} ${Number(amount || 0).toLocaleString()}`;
  const formattedPreviousBalance = `${currency} ${Number(previousBalance ?? 0).toLocaleString()}`;
  const formattedBalance = `${currency} ${Number(updatedBalance || 0).toLocaleString()}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Transaction Notification - Alam Garments</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .email-card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
    .email-header { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
    .brand-name { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0 0 4px 0; color: #ffffff; }
    .brand-tagline { font-size: 13px; color: #93c5fd; margin: 0; font-weight: 500; }
    .email-body { padding: 32px 28px; }
    .greeting { font-size: 17px; font-weight: 600; color: #0f172a; margin-top: 0; margin-bottom: 8px; }
    .intro-text { font-size: 14px; color: #475569; line-height: 1.6; margin-top: 0; margin-bottom: 24px; }
    .txn-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 24px; }
    .box-row { display: flex; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid #edf2f7; font-size: 14px; }
    .box-row:last-child { border-bottom: none; }
    .label { color: #64748b; font-weight: 500; }
    .value { color: #0f172a; font-weight: 600; text-align: right; }
    .type-badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; color: ${badgeColor}; background: ${badgeBg}; }
    .amount-highlight { font-size: 18px; font-weight: 800; color: ${badgeColor}; }
    .balance-highlight { font-size: 16px; font-weight: 700; color: #0f172a; }
    .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .footer p { margin: 4px 0; }
  </style>
</head>
<body>
  <div class="email-card">
    <div class="email-header">
      <h1 class="brand-name">Alam Garments</h1>
      <p class="brand-tagline">Premium Fabrics & Ready-Made Garments | Digital HisabKitab</p>
    </div>
    <div class="email-body">
      <p class="greeting">Assalam-o-Alaikum, ${recipientName}!</p>
      <p class="intro-text">
        A new ${recipientType.toLowerCase()} transaction has been successfully recorded on your account with <strong>Alam Garments</strong>. Please review the details below:
      </p>

      <div class="txn-box">
        <div class="box-row">
          <span class="label">Transaction Type</span>
          <span class="value"><span class="type-badge">${transactionType}</span></span>
        </div>
        ${billNumber ? `
        <div class="box-row">
          <span class="label">Reference / Bill #</span>
          <span class="value">${billNumber}</span>
        </div>` : ""}
        <div class="box-row">
          <span class="label">Transaction Date</span>
          <span class="value">${date}</span>
        </div>
        <div class="box-row">
          <span class="label">Description</span>
          <span class="value">${description || "General Transaction"}</span>
        </div>
        <div class="box-row">
          <span class="label">Transaction Amount</span>
          <span class="value amount-highlight">${formattedAmount}</span>
        </div>
        <div class="box-row" style="margin-top: 6px; padding-top: 12px; border-top: 2px dashed #cbd5e1;">
          <span class="label" style="font-weight: 700; color: #1e293b;">Previous Balance</span>
          <span class="value balance-highlight">${formattedPreviousBalance}</span>
        </div>
        <div class="box-row">
          <span class="label" style="font-weight: 700; color: #1e293b;">Current Balance</span>
          <span class="value balance-highlight">${formattedBalance}</span>
        </div>
      </div>

      <p class="intro-text" style="font-size: 13px; color: #64748b; margin-bottom: 0;">
        If you have any questions or find any discrepancies regarding this entry, please contact our support desk immediately.
      </p>
    </div>

    <div class="footer">
      <p><strong>Alam Garments</strong> — Shop #14, Main Market, Gulberg III, Lahore</p>
      <p>Phone: ${shopInfo.phone || "0300-1234567"} | Email: ${shopInfo.email || "alam.garments@gmail.com"}</p>
      <p style="margin-top: 8px; font-size: 11px; color: #94a3b8;">This is an automated transaction confirmation generated by HisabKitab.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Send Transaction Email via EmailJS
 * 
 * Never throws — always returns an object:
 * { success: boolean, reason?: 'missing_email' | 'config_missing' | 'send_failed', message: string, error?: any }
 */
export const sendTransactionEmail = async ({
  toEmail,
  toName,
  recipientType = "Customer",
  transactionType,
  amount,
  date,
  description,
  updatedBalance,
  previousBalance,
  currency = "Rs.",
  billNumber = "",
  shopInfo,
}) => {
  // 1. Check if email is provided
  const cleanEmail = (toEmail || "").trim();
  if (!cleanEmail) {
    return {
      success: false,
      reason: "missing_email",
      message: `No registered email address on file for ${toName}.`,
    };
  }

  // 2. Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return {
      success: false,
      reason: "missing_email",
      message: `Invalid email address format ("${cleanEmail}") for ${toName}.`,
    };
  }

  // 3. Check EmailJS configuration
  const config = getEmailConfig(shopInfo?.emailjs || {});
  if (!config.serviceId || !config.templateId || !config.publicKey) {
    // Return config_missing so callers know credentials aren't set up yet
    return {
      success: false,
      reason: "config_missing",
      message: "Email service is not yet configured. Please set your free EmailJS credentials in Settings > Khata Rules.",
    };
  }

  // 4. Construct template parameters
  const htmlContent = generateAlamGarmentsEmailHtml({
    recipientName: toName,
    recipientType,
    transactionType,
    amount,
    date,
    description,
    updatedBalance,
    previousBalance,
    currency,
    billNumber,
    shopInfo,
  });

  const templateParams = {
    // Recipient address — included under all common EmailJS variable names so the
    // template's "To Email" field works regardless of which name was configured.
    recipient_email: cleanEmail, // use this in EmailJS "To Email": {{recipient_email}}
    to_email: cleanEmail,        // compatibility: {{to_email}}
    email: cleanEmail,           // compatibility: {{email}}
    user_email: cleanEmail,      // compatibility: {{user_email}}
    reply_to: cleanEmail,        // maps to Reply-To header
    to_name: toName,
    from_name: "Alam Garments",
    brand_name: "Alam Garments",
    recipient_type: recipientType,
    transaction_type: transactionType,
    amount: Number(amount || 0),
    formatted_amount: `${currency} ${Number(amount || 0).toLocaleString()}`,
    date: date || new Date().toISOString().split("T")[0],
    description: description || "Account entry",
    previous_balance: `${currency} ${Number(previousBalance ?? 0).toLocaleString()}`,
    current_balance: `${currency} ${Number(updatedBalance || 0).toLocaleString()}`,
    updated_balance: `${currency} ${Number(updatedBalance || 0).toLocaleString()}`,
    bill_number: billNumber || "N/A",
    shop_name: shopInfo?.name || "Alam Garments",
    shop_phone: shopInfo?.phone || "0300-1234567",
    shop_email: shopInfo?.email || "alam.garments@gmail.com",
    message_html: htmlContent,
  };

  try {
    // @emailjs/browser v4 requires publicKey wrapped in an options object.
    // Passing a bare string (v3 API) causes the misleading "recipients address
    // is corrupted" error in v4.
    const response = await emailjs.send(
      config.serviceId,
      config.templateId,
      templateParams,
      { publicKey: config.publicKey }  // ← v4 fix: must be { publicKey } object
    );

    return {
      success: true,
      message: `Notification email sent to ${cleanEmail}`,
      response,
    };
  } catch (error) {
    console.error("EmailJS sending error:", error);
    return {
      success: false,
      reason: "send_failed",
      message: `Email sending to ${cleanEmail} failed: ${error?.text || error?.message || "Network error"}`,
      error,
    };
  }
};
