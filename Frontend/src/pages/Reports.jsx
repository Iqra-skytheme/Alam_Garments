import { useState, useMemo } from "react";
import { toast } from "sonner";
import StatCard from "../components/StatCard";
import Button from "../components/Button";
import Table from "../components/Table";
import Modal from "../components/Modal";
import {
  exportOverallExcel,
  exportCustomerExcel,
  exportOverallPDF,
  exportCustomerPDF,
  exportSupplierStatementPDF,
  exportSupplierStatementExcel,
} from "../services/exportService";

// ─── helpers ──────────────────────────────────────────────────────────────────

function buildLedger(txns) {
  const sorted = [...txns].sort((a, b) => new Date(a.date) - new Date(b.date));
  let balance = 0;
  return sorted.map((t) => {
    const debit  = Number(t.debit  || 0);
    const credit = Number(t.credit || 0);
    balance += debit - credit;
    return { ...t, runningBalance: balance };
  });
}

const SUPPLIER_TXN_TYPE_COLORS = {
  "Opening Balance": { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  "Purchase":        { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
  "Payment":         { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  "Purchase Return": { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  "Adjustment":      { bg: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe" },
};

function TypeBadge({ type }) {
  const c = SUPPLIER_TXN_TYPE_COLORS[type] || { bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      padding: "2px 8px", borderRadius: "999px", fontSize: "11px",
      fontWeight: "600", background: c.bg, color: c.color,
      border: `1px solid ${c.border}`, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.color, flexShrink: 0, display: "inline-block" }} />
      {type}
    </span>
  );
}

// ─── Supplier Statement Modal (inline, reusing modal infrastructure) ──────────

function SupplierStatementModal({ isOpen, onClose, supplier, supplierTransactions = [], currency = "Rs.", onExportPDF, onExportExcel }) {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);

  const myTxns = useMemo(() =>
    supplierTransactions.filter((t) => t.supplierId === supplier?.id),
    [supplierTransactions, supplier?.id]
  );

  const filtered = useMemo(() => {
    return myTxns.filter((t) => {
      if (fromDate && t.date < fromDate) return false;
      if (toDate   && t.date > toDate)   return false;
      return true;
    });
  }, [myTxns, fromDate, toDate]);

  const ledger = useMemo(() => buildLedger(filtered), [filtered]);

  const openBal       = filtered.filter((t) => t.type === "Opening Balance").reduce((s, t) => s + Number(t.debit || 0), 0);
  const totalPurch    = filtered.filter((t) => t.type === "Purchase").reduce((s, t) => s + Number(t.debit || 0), 0);
  const totalPayments = filtered.filter((t) => t.type === "Payment").reduce((s, t) => s + Number(t.credit || 0), 0);
  const totalReturns  = filtered.filter((t) => t.type === "Purchase Return").reduce((s, t) => s + Number(t.credit || 0), 0);
  const closingBal    = openBal + totalPurch - totalPayments - totalReturns;

  const ledgerColumns = [
    {
      header: "Date",
      key: "date",
      render: (r) => <span className="date-cell">{r.date}</span>,
    },
    {
      header: "Reference",
      key: "reference",
      render: (r) => <span className="font-mono text-muted" style={{ fontSize: "12px" }}>{r.reference || "—"}</span>,
    },
    {
      header: "Type",
      key: "type",
      render: (r) => <TypeBadge type={r.type} />,
    },
    {
      header: "Description",
      key: "description",
      render: (r) => <span className="txn-desc-cell">{r.description || "—"}</span>,
    },
    {
      header: "Debit",
      key: "debit",
      align: "right",
      render: (r) =>
        Number(r.debit) > 0 ? (
          <span className="amount-cell text-danger">{currency} {Number(r.debit).toLocaleString()}</span>
        ) : <span style={{ color: "var(--text-light)", fontSize: "13px" }}>—</span>,
    },
    {
      header: "Credit",
      key: "credit",
      align: "right",
      render: (r) =>
        Number(r.credit) > 0 ? (
          <span className="amount-cell text-success">{currency} {Number(r.credit).toLocaleString()}</span>
        ) : <span style={{ color: "var(--text-light)", fontSize: "13px" }}>—</span>,
    },
    {
      header: "Balance",
      key: "runningBalance",
      align: "right",
      render: (r) => (
        <span style={{ fontWeight: 700, fontSize: "14px", color: r.runningBalance > 0 ? "var(--danger)" : "var(--success)" }}>
          {currency} {Number(r.runningBalance).toLocaleString()}
        </span>
      ),
    },
  ];

  if (!isOpen || !supplier) return null;

  const summaryItems = [
    { label: "Opening Balance", val: openBal,       cls: "" },
    { label: "Total Purchases", val: totalPurch,    cls: "text-danger" },
    { label: "Total Payments",  val: totalPayments, cls: "text-success" },
    { label: "Purchase Returns",val: totalReturns,  cls: "text-warning" },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Supplier Statement — ${supplier.name}`} maxWidth="860px">
      {/* Supplier profile strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", marginBottom: "18px" }}>
        {[
          { label: "Supplier", value: supplier.name },
          { label: "Phone",   value: supplier.phone || "—" },
          { label: "Email",   value: supplier.email || "—" },
          { label: "Status",  value: supplier.status || "Active" },
        ].map(({ label, value }) => (
          <div key={label} style={{ padding: "10px 14px", background: "#f8fafc", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "3px" }}>{label}</div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Date filters */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>Period:</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>From</label>
          <input
            type="date"
            className="form-input"
            style={{ padding: "6px 10px", fontSize: "13px", width: "150px" }}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>To</label>
          <input
            type="date"
            className="form-input"
            style={{ padding: "6px 10px", fontSize: "13px", width: "150px" }}
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>({filtered.length} entries)</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          <Button variant="outline" size="sm" onClick={() => onExportPDF(supplier, fromDate, toDate)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span>PDF</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => onExportExcel(supplier, fromDate, toDate)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path>
            </svg>
            <span>Excel</span>
          </Button>
        </div>
      </div>

      {/* Financial summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px", marginBottom: "20px" }}>
        {summaryItems.map(({ label, val, cls }) => (
          <div key={label} style={{ padding: "12px 14px", background: "#f8fafc", border: "1px solid var(--border-color)", borderRadius: "8px", textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "5px" }}>{label}</div>
            <div className={`font-semibold ${cls}`} style={{ fontSize: "15px", fontWeight: 700 }}>
              {currency} {val.toLocaleString()}
            </div>
          </div>
        ))}
        {/* Closing balance stands out */}
        <div style={{
          padding: "12px 14px",
          background: closingBal > 0 ? "#fef2f2" : "#f0fdf4",
          border: `1px solid ${closingBal > 0 ? "#fecaca" : "#bbf7d0"}`,
          borderRadius: "8px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "5px" }}>Outstanding Payable</div>
          <div style={{ fontSize: "15px", fontWeight: 700, color: closingBal > 0 ? "var(--danger)" : "var(--success)" }}>
            {currency} {closingBal.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Transaction ledger table */}
      <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
        <Table
          columns={ledgerColumns}
          data={ledger}
          keyField="id"
          emptyMessage="No transactions found for the selected period."
        />
      </div>
    </Modal>
  );
}

// ─── MAIN Reports Component ────────────────────────────────────────────────────

export default function Reports({
  customers = [],
  transactions = [],
  suppliers = [],
  supplierTransactions = [],
  currency = "Rs.",
  shopInfo = {},
  onSelectCustomer,
  onSelectSupplier,
}) {
  // ── Report view selector ──
  const [reportView, setReportView] = useState("customers"); // "customers" | "suppliers"

  // ── Customer state ──
  const [selectedPeriod,     setSelectedPeriod]     = useState("6months");
  const [selectedCustomerId, setSelectedCustomerId] = useState("all");
  const [customerSearch,     setCustomerSearch]     = useState("");

  // ── Supplier state ──
  const [supplierSearch,         setSupplierSearch]         = useState("");
  const [statementSupplier,      setStatementSupplier]      = useState(null);
  const [statementModalOpen,     setStatementModalOpen]     = useState(false);

  const showCustomerReports = reportView === "customers";
  const showSupplierReports = reportView === "suppliers";

  // ─── Customer computations (UNCHANGED) ─────────────────────────────────────
  const totalUdhaar = transactions
    .filter((t) => t.type === "Udhaar")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalJama = transactions
    .filter((t) => t.type === "Jama")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const recoveryRate  = totalUdhaar > 0 ? Math.round((totalJama / totalUdhaar) * 100) : 100;

  const monthlyReportData = useMemo(() => {
    const buckets = {};
    transactions.forEach((t) => {
      const d = new Date(t.date);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!buckets[key]) buckets[key] = { month: d.toLocaleString("en-US", { month: "short" }), udhaar: 0, jama: 0, key };
      if (t.type === "Udhaar") buckets[key].udhaar += Number(t.amount || 0);
      if (t.type === "Jama") buckets[key].jama += Number(t.amount || 0);
    });
    return Object.values(buckets).sort((a,b) => a.key.localeCompare(b.key)).slice(-6).map((item) => ({ ...item, collectionRate: item.udhaar > 0 ? Math.min(100, Math.round(item.jama / item.udhaar * 100)) : 100 }));
  }, [transactions]);

  const categoryBreakdown = useMemo(() => {
    const buckets = {};
    transactions.forEach((t) => {
      const label = (t.description || "General").trim() || "General";
      buckets[label] = (buckets[label] || 0) + Number(t.amount || 0);
    });
    const total = Object.values(buckets).reduce((a,b) => a+b, 0) || 1;
    return Object.entries(buckets).sort((a,b) => b[1]-a[1]).slice(0,6).map(([category,amount]) => ({ category, amount, percentage: Math.round(amount / total * 100) }));
  }, [transactions]);

  const maxMonthlyVal = Math.max(
    ...monthlyReportData.map((d) => Math.max(d.udhaar, d.jama)),
    100000
  );

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = customerSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.address && c.address.toLowerCase().includes(q))
      );
    });
  }, [customers, customerSearch]);

  // ─── Supplier computations ──────────────────────────────────────────────────
  const totalSupplierPurchases = suppliers.reduce((s, sup) => s + (Number(sup.totalPurchases) || 0), 0);
  const totalSupplierPaid      = suppliers.reduce((s, sup) => s + (Number(sup.totalPaid)      || 0), 0);
  const totalOutstanding       = suppliers.reduce((s, sup) => s + (Number(sup.currentBalance)  || 0), 0);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = supplierSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.toLowerCase().includes(q))
      );
    });
  }, [suppliers, supplierSearch]);

  // ─── Customer export (UNCHANGED) ────────────────────────────────────────────
  const handleExport = (type, targetCustomer = null) => {
    if (targetCustomer) {
      if (type === "PDF") {
        exportCustomerPDF(targetCustomer, transactions, shopInfo);
        toast.success(`PDF Statement: ${targetCustomer.name}`, { description: "Customer statement PDF downloaded automatically." });
      } else {
        exportCustomerExcel(targetCustomer, transactions, shopInfo);
        toast.success(`Excel Statement: ${targetCustomer.name}`, { description: "Customer statement downloaded as formatted Excel (.xls)." });
      }
      return;
    }
    if (selectedCustomerId === "all") {
      if (type === "PDF") {
        exportOverallPDF(customers, transactions, shopInfo, selectedPeriod, monthlyReportData);
        toast.success("Business PDF Report Downloaded", { description: "Full financial report PDF downloaded automatically." });
      } else {
        exportOverallExcel(customers, transactions, shopInfo, selectedPeriod);
        toast.success("Business Excel Report Downloaded", { description: "Comprehensive financial ledger exported as formatted Excel (.xls)." });
      }
    } else {
      const cust = customers.find((c) => c.id === selectedCustomerId);
      if (!cust) return;
      if (type === "PDF") {
        exportCustomerPDF(cust, transactions, shopInfo);
        toast.success(`PDF Statement: ${cust.name}`, { description: "Customer statement PDF downloaded automatically." });
      } else {
        exportCustomerExcel(cust, transactions, shopInfo);
        toast.success(`Excel Statement: ${cust.name}`, { description: "Customer statement downloaded as formatted Excel (.xls)." });
      }
    }
  };

  // ─── Supplier export ─────────────────────────────────────────────────────────
  const handleSupplierExportPDF = (supplier, fromDate, toDate) => {
    exportSupplierStatementPDF(supplier, supplierTransactions, shopInfo, fromDate, toDate);
    toast.success(`Supplier PDF: ${supplier.name}`, { description: "Supplier statement PDF downloaded." });
  };

  const handleSupplierExportExcel = (supplier, fromDate, toDate) => {
    exportSupplierStatementExcel(supplier, supplierTransactions, shopInfo, fromDate, toDate);
    toast.success(`Supplier Excel: ${supplier.name}`, { description: "Supplier statement Excel downloaded." });
  };

  // ─── Table column definitions ─────────────────────────────────────────────

  // Customer columns (UNCHANGED)
  const customerColumns = [
    {
      header: "Customer",
      key: "name",
      render: (c) => (
        <div className="table-customer-cell">
          <div className="avatar-circle">{c.name.charAt(0)}</div>
          <div>
            <span className="customer-name-bold">{c.name}</span>
            <span className="customer-meta-sub">{c.address || "Local Customer"}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Phone Number",
      key: "phone",
      render: (c) => (
        <span className="customer-phone-badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
          {c.phone}
        </span>
      ),
    },
    {
      header: "Total Udhaar",
      key: "totalUdhaar",
      align: "right",
      render: (c) => <span className="text-danger font-medium">{currency} {(c.totalUdhaar || 0).toLocaleString()}</span>,
    },
    {
      header: "Total Jama",
      key: "totalJama",
      align: "right",
      render: (c) => <span className="text-success font-medium">{currency} {(c.totalJama || 0).toLocaleString()}</span>,
    },
    {
      header: "Balance Owed",
      key: "balance",
      align: "right",
      render: (c) => {
        const bal = c.balance || 0;
        return (
          <span className={`balance-badge ${bal > 0 ? "balance-due" : "balance-cleared"}`}>
            {bal > 0 ? `Owes ${currency} ${bal.toLocaleString()}` : "Cleared"}
          </span>
        );
      },
    },
    {
      header: "Export Actions",
      key: "actions",
      align: "center",
      render: (c) => (
        <div className="table-action-btns" onClick={(e) => e.stopPropagation()}>
          <Button variant="outline" size="sm" onClick={() => handleExport("PDF", c)} title={`Export ${c.name} Statement as PDF`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            <span>PDF</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("Excel", c)} title={`Export ${c.name} Statement as Excel`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path>
            </svg>
            <span>Excel</span>
          </Button>
          {onSelectCustomer && (
            <Button variant="ghost" size="sm" onClick={() => onSelectCustomer(c.id)} title="View full khata ledger">
              Khata →
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Supplier columns
  const supplierColumns = [
    {
      header: "Supplier",
      key: "name",
      render: (s) => (
        <div className="table-customer-cell">
          <div className="avatar-circle">{s.name ? s.name.charAt(0).toUpperCase() : "S"}</div>
          <div>
            <span className="customer-name-bold">{s.name}</span>
            <span className="customer-meta-sub">{s.address || "Wholesale Supplier"}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Phone Number",
      key: "phone",
      render: (s) => (
        <span className="customer-phone-badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
          {s.phone}
        </span>
      ),
    },
    {
      header: "Total Purchases",
      key: "totalPurchases",
      align: "right",
      render: (s) => <span className="text-danger font-medium">{currency} {(Number(s.totalPurchases) || 0).toLocaleString()}</span>,
    },
    {
      header: "Total Paid",
      key: "totalPaid",
      align: "right",
      render: (s) => <span className="text-success font-medium">{currency} {(Number(s.totalPaid) || 0).toLocaleString()}</span>,
    },
    {
      header: "Outstanding",
      key: "currentBalance",
      align: "right",
      render: (s) => {
        const bal = Number(s.currentBalance) || 0;
        return (
          <span className={`balance-badge ${bal > 0 ? "balance-due" : "balance-cleared"}`}>
            {bal > 0 ? `Payable: ${currency} ${bal.toLocaleString()}` : "Cleared"}
          </span>
        );
      },
    },
    {
      header: "Status",
      key: "status",
      align: "center",
      render: (s) => {
        const isActive = s.status === "Active";
        return (
          <span className={`badge-pill ${isActive ? "badge-jama" : "badge-inactive"}`}>
            <span className="badge-dot"></span>
            {s.status || "Active"}
          </span>
        );
      },
    },
    {
      header: "Actions",
      key: "actions",
      align: "center",
      render: (s) => (
        <div className="table-action-btns" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            title="View Supplier Statement"
            onClick={() => {
              setStatementSupplier(s);
              setStatementModalOpen(true);
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span>Statement</span>
          </Button>
          {onSelectSupplier && (
            <>
              <Button variant="ghost" size="sm" onClick={() => onSelectSupplier(s.id)} title="View Ledger">
                Ledger →
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onSelectSupplier(s.id)} title="View Supplier">
                View →
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  // ─── JSX ─────────────────────────────────────────────────────────────────────

  return (
    <div className="page-reports">

      {/* ── Source Selector Tab Bar ───────────────────────────────────────────── */}
      <div className="dashboard-tab-bar" style={{ marginBottom: "20px" }}>
        {[
          {
            id: "customers",
            label: "Customers",
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            ),
          },
          {
            id: "suppliers",
            label: "Suppliers",
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            ),
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`dashboard-tab-btn ${reportView === tab.id ? "active" : ""}`}
            onClick={() => setReportView(tab.id)}
          >
            <span className="dashboard-tab-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>


      {/* ── Top Export Bar (Customer) ─────────────────────────────────────────── */}
      {showCustomerReports && (
        <div className="reports-top-bar" style={{ justifyContent: "flex-end" }}>
          <div className="reports-export-group">
            <select
              className="filter-select customer-export-select"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              title="Choose target report"
            >
              <option value="all">📊 All Customers (Full Business)</option>
              <optgroup label="Individual Customer Statements">
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    👤 {c.name} ({(c.balance || 0) > 0 ? `Due: ${currency} ${(c.balance || 0).toLocaleString()}` : "Cleared"})
                  </option>
                ))}
              </optgroup>
            </select>
            <select className="filter-select" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="year">Current Financial Year</option>
              <option value="all">All Time History</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => handleExport("PDF")} title="Generate and save statement as PDF">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <span>Export PDF</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport("Excel")} title="Download formatted spreadsheet">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path>
              </svg>
              <span>Export CSV / Excel</span>
            </Button>
          </div>
        </div>
      )}

      {/* ── Customer KPI Cards ────────────────────────────────────────────────── */}
      {showCustomerReports && <section className="dashboard-stats-grid">
        <StatCard
          title="Overall Recovery Rate"
          value={`${recoveryRate}%`}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>}
          variant="success"
          trend={{ direction: "up", label: "+4% vs last month" }}
        />
        <StatCard
          title="Total Credit Extended"
          value={`${currency} ${totalUdhaar.toLocaleString()}`}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>}
          variant="danger"
          trend={{ direction: "up", label: "Credit" }}
        />
        <StatCard
          title="Total Cash Collected"
          value={`${currency} ${totalJama.toLocaleString()}`}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>}
          variant="primary"
          trend={{ direction: "up", label: "Collected" }}
        />
        <StatCard
          title="Active Khata Customers"
          value={customers.filter((c) => (c.balance || 0) > 0).length}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>}
          variant="warning"
          trend={{ direction: "up", label: "Pending Due" }}
        />
      </section>}

      {/* ── Customer Khata Statements ─────────────────────────────────────────── */}
      {showCustomerReports && <div className="dashboard-card customer-export-directory-card" style={{ marginBottom: "24px" }}>
        <div className="card-header-flex">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h3 className="card-heading">Customer Khata Statements (Export Separately)</h3>
            <span className="badge-pill badge-primary">{customers.length} Accounts</span>
          </div>
          <div className="toolbar-search-box" style={{ maxWidth: "280px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search customer name or phone..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              style={{ padding: "6px 10px 6px 32px", fontSize: "13px" }}
            />
            {customerSearch && (
              <button type="button" className="clear-search-btn" onClick={() => setCustomerSearch("")} aria-label="Clear search">✕</button>
            )}
          </div>
        </div>
        <div className="dashboard-table-scroll-wrap" style={{ marginTop: "12px" }}>
          <Table
            columns={customerColumns}
            data={filteredCustomers}
            keyField="id"
            emptyMessage="No matching customer accounts found."
          />
        </div>
      </div>}

      {/* ── Monthly Chart ─────────────────────────────────────────────────────── */}
      {showCustomerReports && <div className="dashboard-card reports-chart-card">
        <div className="card-header-flex">
          <div><h3 className="card-heading">Monthly Udhaar vs. Jama Comparison</h3></div>
          <div className="chart-legend">
            <span className="legend-item"><span className="legend-color legend-udhaar"></span> Udhaar (Credit)</span>
            <span className="legend-item"><span className="legend-color legend-jama"></span> Jama (Payment)</span>
          </div>
        </div>
        <div className="bar-chart-container">
          <div className="bar-chart-bars">
            {monthlyReportData.map((item, index) => {
              const udhaarHeight = Math.round((item.udhaar / maxMonthlyVal) * 100);
              const jamaHeight   = Math.round((item.jama   / maxMonthlyVal) * 100);
              return (
                <div key={index} className="chart-bar-group">
                  <div className="bars-pair">
                    <div className="bar-fill bar-udhaar" style={{ height: `${udhaarHeight}%` }} title={`Udhaar: ${currency} ${item.udhaar.toLocaleString()}`}>
                      <span className="bar-tooltip">{currency} {(item.udhaar / 1000).toFixed(0)}k</span>
                    </div>
                    <div className="bar-fill bar-jama" style={{ height: `${jamaHeight}%` }} title={`Jama: ${currency} ${item.jama.toLocaleString()}`}>
                      <span className="bar-tooltip">{currency} {(item.jama / 1000).toFixed(0)}k</span>
                    </div>
                  </div>
                  <span className="chart-bar-label">{item.month}</span>
                  <span className="chart-bar-rate">{item.collectionRate}% rec.</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>}

      {/* ── Analytics Split ───────────────────────────────────────────────────── */}
      {showCustomerReports && <div className="reports-analytics-split">
        <div className="dashboard-card category-breakdown-card">
          <h3 className="card-heading">Top Udhaar Categories</h3>
          <div className="category-progress-list" style={{ marginTop: "14px" }}>
            {categoryBreakdown.map((cat, idx) => (
              <div key={idx} className="category-progress-item">
                <div className="category-item-header">
                  <span className="category-name">{cat.category}</span>
                  <span className="category-amount">{currency} {cat.amount.toLocaleString()} ({cat.percentage}%)</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${cat.percentage}%`, backgroundColor: idx === 0 ? "#2563eb" : idx === 1 ? "#16a34a" : idx === 2 ? "#d97706" : "#7c3aed" }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card recovery-velocity-card">
          <h3 className="card-heading">Recovery Velocity</h3>
          <div className="report-summary-table-wrap" style={{ marginTop: "14px" }}>
            <table className="compact-table">
              <thead>
                <tr><th>Month</th><th>Udhaar</th><th>Jama</th><th style={{ textAlign: "right" }}>Rec. %</th></tr>
              </thead>
              <tbody>
                {monthlyReportData.slice(-4).map((row, idx) => (
                  <tr key={idx}>
                    <td className="font-semibold">{row.month}</td>
                    <td className="text-danger font-medium">{currency} {(row.udhaar / 1000).toFixed(0)}k</td>
                    <td className="text-success font-medium">{currency} {(row.jama / 1000).toFixed(0)}k</td>
                    <td style={{ textAlign: "right" }}>
                      <span className={`badge-pill ${row.collectionRate >= 80 ? "badge-jama" : "badge-udhaar"}`}>
                        <span className="badge-dot"></span>{row.collectionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>}

      {/* ══════════════════════════════════════════════════════════════════════
          SUPPLIER SECTION
      ══════════════════════════════════════════════════════════════════════ */}

      {/* Supplier Section Divider — hidden: sections are now on separate tabs */}

      {/* Supplier KPI Cards */}
      {showSupplierReports && <section className="dashboard-stats-grid" style={{ marginBottom: "24px" }}>
        <StatCard
          title="Total Suppliers"
          value={suppliers.length}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>}
          variant="primary"
          trend={{ direction: "up", label: `${suppliers.filter((s) => s.status === "Active").length} Active` }}
        />
        <StatCard
          title="Total Purchases"
          value={`${currency} ${totalSupplierPurchases.toLocaleString()}`}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>}
          variant="danger"
          trend={{ direction: "up", label: "All purchases" }}
        />
        <StatCard
          title="Total Paid to Suppliers"
          value={`${currency} ${totalSupplierPaid.toLocaleString()}`}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>}
          variant="success"
          trend={{ direction: "up", label: "Payments made" }}
        />
        <StatCard
          title="Outstanding Payables"
          value={`${currency} ${totalOutstanding.toLocaleString()}`}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>}
          variant="warning"
          trend={{ direction: totalOutstanding > 0 ? "up" : "down", label: totalOutstanding > 0 ? "Due" : "All cleared" }}
        />
      </section>}

      {/* Supplier Khata Statements Directory */}
      {showSupplierReports && <div className="dashboard-card customer-export-directory-card" style={{ marginBottom: "24px" }}>
        <div className="card-header-flex">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h3 className="card-heading">Supplier Khata Statements</h3>
            <span className="badge-pill badge-primary">{suppliers.length} Suppliers</span>
          </div>
          <div className="toolbar-search-box" style={{ maxWidth: "280px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search supplier name or phone..."
              value={supplierSearch}
              onChange={(e) => setSupplierSearch(e.target.value)}
              style={{ padding: "6px 10px 6px 32px", fontSize: "13px" }}
            />
            {supplierSearch && (
              <button type="button" className="clear-search-btn" onClick={() => setSupplierSearch("")} aria-label="Clear supplier search">✕</button>
            )}
          </div>
        </div>
        <div className="dashboard-table-scroll-wrap" style={{ marginTop: "12px" }}>
          <Table
            columns={supplierColumns}
            data={filteredSuppliers}
            keyField="id"
            emptyMessage="No matching supplier accounts found."
          />
        </div>
      </div>}

      {/* Supplier Statement Modal */}
      <SupplierStatementModal
        isOpen={statementModalOpen}
        onClose={() => { setStatementModalOpen(false); setStatementSupplier(null); }}
        supplier={statementSupplier}
        supplierTransactions={supplierTransactions}
        shopInfo={shopInfo}
        currency={currency}
        onExportPDF={handleSupplierExportPDF}
        onExportExcel={handleSupplierExportExcel}
      />
    </div>
  );
}
