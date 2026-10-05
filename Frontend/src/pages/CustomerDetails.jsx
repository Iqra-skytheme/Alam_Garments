import { toast } from "sonner";
import Table from "../components/Table";
import Button from "../components/Button";
import { exportCustomerPDF, exportCustomerExcel, exportTransactionReceiptPDF } from "../services/exportService";

function computeCustomerStatement(txns) {
  const sorted = [...txns].sort((a, b) => new Date(a.date) - new Date(b.date));
  let balance = 0;
  const list = [];
  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const delta = item.type === "Udhaar" ? Number(item.amount) : -Number(item.amount);
    balance += delta;
    list.push({
      ...item,
      runningBalance: balance,
    });
  }
  return list.reverse();
}

export default function CustomerDetails({
  customer,
  transactions = [],
  onBack,
  onOpenAddTransaction,
  currency = "Rs.",
  shopInfo = {},
}) {
  if (!customer) {
    return (
      <div className="empty-state-card">
        <h3>Customer Not Found</h3>
        <p>The customer details you are looking for do not exist or were removed.</p>
        <Button variant="primary" onClick={onBack}>
          ← Back to Customers
        </Button>
      </div>
    );
  }

  // Filter transactions for this customer
  const customerTxns = transactions.filter(
    (t) => t.customerId === customer.id
  );

  const txnsWithRunning = computeCustomerStatement(customerTxns);

  const totalUdhaar = customerTxns
    .filter((t) => t.type === "Udhaar")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalJama = customerTxns
    .filter((t) => t.type === "Jama")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const netBalance = totalUdhaar - totalJama;

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Assalam-o-Alaikum ${customer.name},\nThis is a friendly reminder from ${shopInfo?.name || "Alam Garments"}.\nYour pending khata balance is ${currency} ${netBalance.toLocaleString()}.\nPlease clear at your earliest convenience. Shukriya!`
    );
    const digits = String(customer.phone || "").replace(/\D/g, "");
    const whatsappNumber = digits.startsWith("0") ? `92${digits.slice(1)}` : digits.startsWith("92") ? digits : digits;
    if (!whatsappNumber) {
      toast.error("WhatsApp number is not available for this customer.");
      return;
    }
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, "_blank", "noopener,noreferrer");
    toast.success("WhatsApp Reminder Opened", {
      description: `Friendly payment reminder generated for ${customer.name} (${currency} ${netBalance.toLocaleString()})`,
    });
  };

  const columns = [
    {
      header: "Date",
      key: "date",
      render: (row) => <span className="date-cell">{row.date}</span>,
    },
    {
      header: "Type",
      key: "type",
      render: (row) => (
        <span className={`badge-pill badge-${row.type.toLowerCase()}`}>
          <span className="badge-dot"></span>
          {row.type === "Udhaar" ? "Udhaar (Debit)" : "Jama (Credit)"}
        </span>
      ),
    },
    {
      header: "Description / Items",
      key: "description",
      render: (row) => (
        <div>
          <span className="txn-desc-title">{row.description}</span>
          <span className="customer-meta-sub">
            {row.billNumber} • {row.paymentMethod}
          </span>
        </div>
      ),
    },
    {
      header: "Amount",
      key: "amount",
      align: "right",
      render: (row) => (
        <span
          className={`amount-cell ${
            row.type === "Udhaar" ? "text-danger" : "text-success"
          }`}
        >
          {row.type === "Udhaar" ? "-" : "+"} {currency}{" "}
          {Number(row.amount).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Account Balance",
      key: "runningBalance",
      align: "right",
      render: (row) => (
        <span className="font-semibold text-dark">
          {currency} {row.runningBalance.toLocaleString()}
        </span>
      ),
    },
    {
      header: "Receipt",
      key: "receiptAction",
      align: "center",
      width: "85px",
      render: (row) => (
        <button
          type="button"
          className="btn-print-receipt"
          title="Download unique transaction receipt slip PDF"
          onClick={() => {
            exportTransactionReceiptPDF(row, customer, shopInfo);
            toast.success(`Receipt PDF Downloaded: ${row.billNumber || "Slip"}`, {
              description: `Unique slip downloaded automatically for ${customer.name}.`,
            });
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 8px",
            background: "#f8fafc",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            fontSize: "11px",
            fontWeight: "600",
            color: "#475569",
            cursor: "pointer",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
          Slip
        </button>
      ),
    },
  ];

  return (
    <div className="page-customer-details">
      {/* Navigation Breadcrumb */}
      <div className="customer-breadcrumb">
        <button type="button" className="btn-back" onClick={onBack}>
          ← Back to Customers
        </button>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{customer.name} Khata</span>
      </div>

      {/* Customer Header Card */}
      <div className="customer-profile-card">
        <div className="profile-info-row">
          <div className="profile-main-data">
            <div className="avatar-xl">{customer.name.charAt(0)}</div>
            <div>
              <div className="customer-name-heading">
                <h2>{customer.name}</h2>
                <span
                  className={`status-pill ${
                    netBalance > 0 ? "status-due" : "status-cleared"
                  }`}
                >
                  {netBalance > 0 ? "Pending Balance" : "Account Cleared"}
                </span>
              </div>
              <p className="profile-contact-line">
                <span className="contact-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  {customer.phone}
                </span>
                {customer.email && (
                  <span className="contact-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                    </svg>
                    {customer.email}
                  </span>
                )}
                {customer.address && (
                  <span className="contact-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    {customer.address}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="customer-action-buttons">
            <Button
              variant="danger"
              size="md"
              icon="+"
              onClick={() => onOpenAddTransaction("Udhaar", customer.id)}
            >
              Give Udhaar
            </Button>
            <Button
              variant="success"
              size="md"
              icon="+"
              onClick={() => onOpenAddTransaction("Jama", customer.id)}
            >
              Receive Jama
            </Button>
            <Button
              variant="outline"
              size="md"
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              }
              onClick={() => {
                exportCustomerPDF(customer, transactions, shopInfo);
                toast.success(`PDF Statement: ${customer.name}`, {
                  description: "Customer statement PDF downloaded automatically.",
                });
              }}
              title="Download customer statement as PDF"
            >
              PDF Statement
            </Button>
            <Button
              variant="outline"
              size="md"
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 20V10"></path>
                  <path d="M12 20V4"></path>
                  <path d="M6 20v-6"></path>
                </svg>
              }
              onClick={() => {
                exportCustomerExcel(customer, transactions, shopInfo);
                toast.success(`Excel Statement: ${customer.name}`, {
                  description: "Customer statement downloaded as formatted Excel (.xls).",
                });
              }}
              title="Download customer statement as formatted Excel spreadsheet (.xls)"
            >
              Excel (.xls)
            </Button>
            <Button
              variant="outline"
              size="md"
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              }
              onClick={handleShareWhatsApp}
            >
              WhatsApp Reminder
            </Button>
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="customer-financial-strip">
          <div className="financial-cell">
            <span className="financial-label">Total Udhaar Taken</span>
            <span className="financial-val text-danger">
              {currency} {totalUdhaar.toLocaleString()}
            </span>
          </div>
          <div className="financial-divider"></div>
          <div className="financial-cell">
            <span className="financial-label">Total Jama Paid</span>
            <span className="financial-val text-success">
              {currency} {totalJama.toLocaleString()}
            </span>
          </div>
          <div className="financial-divider"></div>
          <div className="financial-cell">
            <span className="financial-label">Net Balance Owed</span>
            <span
              className={`financial-val ${
                netBalance > 0 ? "text-danger font-bold" : "text-success"
              }`}
            >
              {currency} {netBalance.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Ledger History */}
      <div className="dashboard-card no-padding">
        <div className="card-header-flex p-card-header">
          <div>
            <h2 className="card-heading">Khata Ledger Statement</h2>
            <p className="card-subheading">
              Complete chronological audit trail for this customer
            </p>
          </div>
          <span className="tag-count">{customerTxns.length} Entries</span>
        </div>

        <Table
          columns={columns}
          data={txnsWithRunning}
          keyField="id"
          emptyMessage="No ledger transactions found for this customer."
        />
      </div>
    </div>
  );
}
