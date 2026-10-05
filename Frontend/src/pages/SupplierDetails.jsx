import { useState, useMemo } from "react";
import { toast } from "sonner";
import Button from "../components/Button";
import Table from "../components/Table";
import SupplierModal from "../components/SupplierModal";
import SupplierConfirmModal from "../components/SupplierConfirmModal";
import RecordPurchaseModal from "../components/RecordPurchaseModal";
import MakePaymentModal from "../components/MakePaymentModal";

// Compute running balance from sorted transactions
function computeLedger(txns) {
  const sorted = [...txns].sort((a, b) => new Date(a.date) - new Date(b.date));
  let balance = 0;
  return sorted.map((t) => {
    balance += Number(t.debit || 0) - Number(t.credit || 0);
    return { ...t, runningBalance: balance };
  }).reverse(); // most recent first
}

const PAYMENT_STATUS_COLORS = {
  "Paid": { bg: "var(--success-light)", color: "var(--success)", border: "#bbf7d0" },
  "Partially Paid": { bg: "var(--warning-light)", color: "var(--warning)", border: "#fde68a" },
  "Unpaid": { bg: "var(--danger-light)", color: "var(--danger)", border: "#fecaca" },
};

export default function SupplierDetails({
  supplier,
  suppliers = [],
  supplierTransactions = [],
  onBack,
  onUpdateSupplier,
  onDeleteSupplier,
  onToggleSupplierStatus,
  onRecordPurchase,
  onMakePayment,
  currency = "Rs.",
}) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("ledger"); // "ledger" | "purchases" | "payments"

  // All hooks MUST run before any early return (Rules of Hooks)
  const supplierId = supplier?.id ?? "";

  const myTxns = useMemo(
    () => supplierTransactions.filter((t) => t.supplierId === supplierId),
    [supplierTransactions, supplierId]
  );

  const ledgerWithRunning = useMemo(() => computeLedger(myTxns), [myTxns]);

  const purchaseTxns = useMemo(
    () => myTxns.filter((t) => t.type === "Purchase").sort((a, b) => new Date(b.date) - new Date(a.date)),
    [myTxns]
  );

  const paymentTxns = useMemo(
    () => myTxns.filter((t) => t.type === "Payment").sort((a, b) => new Date(b.date) - new Date(a.date)),
    [myTxns]
  );

  if (!supplier) {
    return (
      <div className="empty-state-card" style={{ padding: "48px 24px", textAlign: "center" }}>
        <h3>Supplier Not Found</h3>
        <p style={{ color: "var(--text-muted)", margin: "8px 0 20px 0" }}>
          The supplier details you are looking for do not exist or were removed.
        </p>
        <Button variant="primary" onClick={onBack}>
          ← Back to Suppliers
        </Button>
      </div>
    );
  }

  const handleWhatsAppReminder = () => {
    const balance = Number(supplier.currentBalance || 0);
    const text = encodeURIComponent(
      `Assalam-o-Alaikum ${supplier.name},\nThis is a reminder from Alam Garments.\nYour current outstanding payable balance is ${currency} ${balance.toLocaleString()}.\nThank you.`
    );
    const digits = String(supplier.phone || "").replace(/\D/g, "");
    const whatsappNumber = digits.startsWith("0") ? `92${digits.slice(1)}` : digits.startsWith("92") ? digits : digits;
    if (!whatsappNumber) {
      toast.error("WhatsApp number is not available for this supplier.");
      return;
    }
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, "_blank", "noopener,noreferrer");
    toast.success("WhatsApp Reminder Opened", { description: `Reminder prepared for ${supplier.name}.` });
  };

  const isActive = supplier.status === "Active";
  const openBal = Number(supplier.openingBalance) || 0;
  const currBal = Number(supplier.currentBalance) || 0;
  const totalPurchases = Number(supplier.totalPurchases) || 0;
  const totalPaid = Number(supplier.totalPaid) || 0;

  const handleSaveEdit = (updatedData) => {
    onUpdateSupplier(supplier.id, updatedData);
    setEditModalOpen(false);
  };

  const handleConfirmDelete = (id) => {
    onDeleteSupplier(id);
    onBack();
  };

  // Ledger columns
  const ledgerColumns = [
    {
      header: "Date",
      key: "date",
      render: (row) => <span className="date-cell">{row.date}</span>,
    },
    {
      header: "Type",
      key: "type",
      render: (row) => {
        const typeColors = {
          "Opening Balance": { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
          "Purchase": { bg: "var(--danger-light)", color: "var(--danger)", border: "#fecaca" },
          "Payment": { bg: "var(--success-light)", color: "var(--success)", border: "#bbf7d0" },
        };
        const c = typeColors[row.type] || { bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1" };
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "3px 9px",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: "600",
              background: c.bg,
              color: c.color,
              border: `1px solid ${c.border}`,
              whiteSpace: "nowrap",
            }}
          >
            <span
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: c.color,
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            {row.type}
          </span>
        );
      },
    },
    {
      header: "Reference",
      key: "reference",
      render: (row) => (
        <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
          {row.reference}
        </span>
      ),
    },
    {
      header: "Description",
      key: "description",
      render: (row) => (
        <div>
          <span className="customer-name-bold" style={{ fontWeight: "500", fontSize: "13px" }}>{row.description}</span>
          {row.notes && (
            <span className="customer-meta-sub">{row.notes}</span>
          )}
        </div>
      ),
    },
    {
      header: "Debit",
      key: "debit",
      align: "right",
      render: (row) =>
        Number(row.debit) > 0 ? (
          <span className="amount-cell text-danger">
            {currency} {Number(row.debit).toLocaleString()}
          </span>
        ) : (
          <span style={{ color: "var(--text-light)", fontSize: "13px" }}>—</span>
        ),
    },
    {
      header: "Credit",
      key: "credit",
      align: "right",
      render: (row) =>
        Number(row.credit) > 0 ? (
          <span className="amount-cell text-success">
            {currency} {Number(row.credit).toLocaleString()}
          </span>
        ) : (
          <span style={{ color: "var(--text-light)", fontSize: "13px" }}>—</span>
        ),
    },
    {
      header: "Balance",
      key: "runningBalance",
      align: "right",
      render: (row) => (
        <span
          style={{
            fontWeight: "700",
            fontSize: "14px",
            color: row.runningBalance > 0 ? "var(--danger)" : "var(--success)",
          }}
        >
          {currency} {Number(row.runningBalance).toLocaleString()}
        </span>
      ),
    },
  ];

  // Purchase columns
  const purchaseColumns = [
    {
      header: "Date",
      key: "date",
      render: (row) => <span className="date-cell">{row.date}</span>,
    },
    {
      header: "Reference",
      key: "reference",
      render: (row) => (
        <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
          {row.reference}
        </span>
      ),
    },
    {
      header: "Item",
      key: "item",
      render: (row) => (
        <div>
          <span className="customer-name-bold" style={{ fontWeight: "500" }}>{row.item || row.description}</span>
          {row.quantity && (
            <span className="customer-meta-sub">
              Qty: {row.quantity} × {currency} {Number(row.purchasePrice).toLocaleString()}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Total",
      key: "totalAmount",
      align: "right",
      render: (row) => (
        <span className="font-semibold">
          {currency} {Number(row.totalAmount || row.debit).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Paid",
      key: "amountPaid",
      align: "right",
      render: (row) => (
        <span className="text-success font-medium">
          {currency} {Number(row.amountPaid || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Remaining",
      key: "remainingAmount",
      align: "right",
      render: (row) => (
        <span className={Number(row.remainingAmount) > 0 ? "text-danger font-medium" : "text-success font-medium"}>
          {currency} {Number(row.remainingAmount || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Status",
      key: "paymentStatus",
      align: "center",
      render: (row) => {
        const c = PAYMENT_STATUS_COLORS[row.paymentStatus] || PAYMENT_STATUS_COLORS["Unpaid"];
        return (
          <span
            style={{
              display: "inline-block",
              padding: "3px 10px",
              borderRadius: "999px",
              fontSize: "11px",
              fontWeight: "600",
              background: c.bg,
              color: c.color,
              border: `1px solid ${c.border}`,
              whiteSpace: "nowrap",
            }}
          >
            {row.paymentStatus}
          </span>
        );
      },
    },
  ];

  // Payment columns
  const paymentColumns = [
    {
      header: "Date",
      key: "date",
      render: (row) => <span className="date-cell">{row.date}</span>,
    },
    {
      header: "Reference",
      key: "reference",
      render: (row) => (
        <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
          {row.reference}
        </span>
      ),
    },
    {
      header: "Method",
      key: "paymentMethod",
      render: (row) => (
        <span
          style={{
            fontSize: "12px",
            background: "var(--border-light)",
            color: "var(--text-main)",
            padding: "3px 8px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-color)",
          }}
        >
          {row.paymentMethod || "—"}
        </span>
      ),
    },
    {
      header: "Description",
      key: "description",
      render: (row) => (
        <div>
          <span className="customer-name-bold" style={{ fontWeight: "500" }}>{row.description}</span>
          {row.notes && <span className="customer-meta-sub">{row.notes}</span>}
        </div>
      ),
    },
    {
      header: "Amount",
      key: "credit",
      align: "right",
      render: (row) => (
        <span className="amount-cell text-success">
          + {currency} {Number(row.credit).toLocaleString()}
        </span>
      ),
    },
  ];

  const tabCounts = {
    ledger: myTxns.length,
    purchases: purchaseTxns.length,
    payments: paymentTxns.length,
  };

  return (
    <div className="page-customer-details">
      {/* Navigation Breadcrumb */}
      <div className="customer-breadcrumb">
        <button type="button" className="btn-back" onClick={onBack}>
          ← Back to Suppliers
        </button>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{supplier.name} Details</span>
      </div>

      {/* Supplier Profile Header Card */}
      <div className="customer-profile-card">
        <div className="profile-info-row">
          <div className="profile-main-data">
            <div className="avatar-xl">
              {supplier.name ? supplier.name.charAt(0).toUpperCase() : "S"}
            </div>
            <div>
              <div className="customer-name-heading">
                <h2>{supplier.name}</h2>
                <span
                  className={`status-pill ${isActive ? "status-cleared" : "status-due"}`}
                  style={
                    !isActive
                      ? { background: "#f1f5f9", color: "#64748b", borderColor: "#cbd5e1" }
                      : {}
                  }
                >
                  {supplier.status || "Active"}
                </span>
              </div>
              <p className="profile-contact-line">
                <span className="contact-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  {supplier.phone}
                </span>
                {supplier.email && (
                  <span className="contact-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                    {supplier.email}
                  </span>
                )}
                {supplier.address && (
                  <span className="contact-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    {supplier.address}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="customer-action-buttons">
            <Button
              variant="primary"
              size="md"
              icon="+"
              onClick={() => setPurchaseModalOpen(true)}
            >
              Record Purchase
            </Button>
            <Button
              variant="success"
              size="md"
              icon="+"
              onClick={() => setPaymentModalOpen(true)}
            >
              Make Payment
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={handleWhatsAppReminder}
              title="Open WhatsApp reminder for this supplier"
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                </svg>
              }
            >
              WhatsApp Reminder
            </Button>
            <Button
              variant="outline"
              size="md"
              icon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              }
              onClick={() => setEditModalOpen(true)}
            >
              Edit
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setConfirmModalOpen(true)}
            >
              {isActive ? "Deactivate" : "Activate"} / Delete
            </Button>
          </div>
        </div>

        {/* Financial Highlights Strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            alignItems: "center",
            background: "#f8fafc",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)",
            padding: "16px 20px",
            gap: "0",
          }}
        >
          <div className="financial-cell">
            <span className="financial-label">Opening Balance</span>
            <span className="financial-val font-semibold text-dark">
              {currency} {openBal.toLocaleString()}
            </span>
          </div>
          <div className="financial-divider"></div>
          <div className="financial-cell">
            <span className="financial-label">Total Purchases</span>
            <span className="financial-val text-danger font-bold">
              {currency} {totalPurchases.toLocaleString()}
            </span>
          </div>
          <div className="financial-divider"></div>
          <div className="financial-cell">
            <span className="financial-label">Total Paid</span>
            <span className="financial-val text-success font-bold">
              {currency} {totalPaid.toLocaleString()}
            </span>
          </div>
          <div className="financial-divider" style={{ gridColumn: "unset" }}></div>
          <div className="financial-cell" style={{ gridColumn: "span 2" }}>
            <span className="financial-label">Outstanding Balance</span>
            <span
              className={`financial-val ${currBal > 0 ? "text-danger font-bold" : "text-success font-bold"}`}
            >
              {currency} {currBal.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Info & Notes */}
      <div className="dashboard-card" style={{ padding: "24px", marginBottom: "24px" }}>
        <div className="card-header-flex" style={{ marginBottom: "16px" }}>
          <div>
            <h2 className="card-heading">Supplier Profile & Information</h2>
            <p className="card-subheading">Contact details and notes</p>
          </div>
          <span className="tag-count">ID: {supplier.id}</span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          {[
            { label: "Supplier Name", value: supplier.name },
            { label: "Phone Number", value: supplier.phone, mono: true },
            { label: "Email Address", value: supplier.email || "No email registered" },
            { label: "Address", value: supplier.address || "No address provided" },
          ].map(({ label, value, mono }) => (
            <div
              key={label}
              style={{
                padding: "14px 16px",
                background: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                {label}
              </span>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "var(--text-main)",
                  fontFamily: mono ? "var(--font-mono)" : "inherit",
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
        {/* Notes */}
        <div>
          <h4 style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-main)", marginBottom: "8px" }}>
            Supplier Notes & Terms
          </h4>
          <div
            style={{
              padding: "13px 16px",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderLeft: "4px solid var(--primary)",
              borderRadius: "6px",
              color: supplier.notes ? "var(--text-main)" : "var(--text-muted)",
              fontSize: "13px",
              lineHeight: "1.6",
              fontStyle: supplier.notes ? "normal" : "italic",
            }}
          >
            {supplier.notes || "No special notes or payment terms recorded."}
          </div>
        </div>
      </div>

      {/* Ledger / Transaction History */}
      <div className="dashboard-card no-padding">
        {/* Tab Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 24px 0 24px",
            borderBottom: "1px solid var(--border-color)",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <h2 className="card-heading">Supplier Ledger</h2>
            <p className="card-subheading">Complete transaction history and running balance</p>
          </div>
          <div className="filter-pill-group" style={{ marginBottom: "0" }}>
            {[
              { key: "ledger", label: "Full Ledger" },
              { key: "purchases", label: "Purchases" },
              { key: "payments", label: "Payments" },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={`filter-pill ${activeTab === key ? "active" : ""}`}
                onClick={() => setActiveTab(key)}
              >
                {label} ({tabCounts[key]})
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "ledger" && (
          <Table
            columns={ledgerColumns}
            data={ledgerWithRunning}
            keyField="id"
            emptyMessage="No transactions recorded for this supplier yet."
          />
        )}
        {activeTab === "purchases" && (
          <Table
            columns={purchaseColumns}
            data={purchaseTxns}
            keyField="id"
            emptyMessage="No purchase records found. Click 'Record Purchase' to add one."
          />
        )}
        {activeTab === "payments" && (
          <Table
            columns={paymentColumns}
            data={paymentTxns}
            keyField="id"
            emptyMessage="No payment records found. Click 'Make Payment' to record one."
          />
        )}
      </div>

      {/* Modals */}
      <RecordPurchaseModal
        isOpen={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        onSave={(txn, meta) => {
          onRecordPurchase(txn, meta);
          setPurchaseModalOpen(false);
        }}
        suppliers={suppliers.length > 0 ? suppliers : [supplier]}
        defaultSupplierId={supplier.id}
        currency={currency}
      />

      <MakePaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSave={(txn, meta) => {
          onMakePayment(txn, meta);
          setPaymentModalOpen(false);
        }}
        suppliers={suppliers.length > 0 ? suppliers : [supplier]}
        supplierTransactions={supplierTransactions}
        defaultSupplierId={supplier.id}
        currency={currency}
      />

      <SupplierModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleSaveEdit}
        supplier={supplier}
        currency={currency}
      />

      <SupplierConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        supplier={supplier}
        onConfirmDelete={handleConfirmDelete}
        onConfirmToggleStatus={onToggleSupplierStatus}
      />
    </div>
  );
}
