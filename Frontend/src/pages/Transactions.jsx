import { useState, useMemo } from "react";
import { toast } from "sonner";
import Table from "../components/Table";
import Button from "../components/Button";
import { exportTransactionReceiptPDF } from "../services/exportService";

// ─── helpers ─────────────────────────────────────────────────────────────────

// Supplier transaction types that increase payable (debit)
const SUPPLIER_DEBIT_TYPES = new Set(["Purchase", "Opening Balance", "Adjustment"]);
// Types that decrease payable (credit)
const SUPPLIER_CREDIT_TYPES = new Set(["Payment", "Purchase Return"]);

function getSupplierTxnAmount(row) {
  // debit means we owe more → show as positive payable increase (red)
  // credit means we paid → show as payable decrease (green)
  return SUPPLIER_DEBIT_TYPES.has(row.type)
    ? Number(row.debit || 0)
    : Number(row.credit || 0);
}

function isSupplierDebit(type) {
  return SUPPLIER_DEBIT_TYPES.has(type);
}

// Normalize a supplier transaction into a shape the UI can handle uniformly
function normalizeSupplierTxn(txn) {
  return {
    ...txn,
    _source: "supplier",
    // ensure these fields exist so search / display don't crash
    supplierName: txn.supplierName || "",
    reference: txn.reference || "",
    description: txn.description || "",
    paymentMethod: txn.paymentMethod || null,
  };
}

// ─── supplier-specific badge style ───────────────────────────────────────────
const SUPPLIER_TYPE_STYLE = {
  Purchase:         { bg: "var(--danger-light)",  color: "var(--danger)",  border: "#fecaca" },
  "Opening Balance":{ bg: "#eff6ff",              color: "#1d4ed8",        border: "#bfdbfe" },
  Payment:          { bg: "var(--success-light)", color: "var(--success)", border: "#bbf7d0" },
  "Purchase Return":{ bg: "var(--warning-light)", color: "var(--warning)", border: "#fde68a" },
  Adjustment:       { bg: "#f5f3ff",              color: "#7c3aed",        border: "#ddd6fe" },
};

// ─── component ────────────────────────────────────────────────────────────────

export default function Transactions({
  transactions = [],
  customers = [],
  supplierTransactions = [],
  shopInfo = {},
  onSelectCustomer,
  onSelectSupplier,
  onOpenAddTransaction,
  currency = "Rs.",
  initialTypeFilter = "all",
}) {
  // ── state ──
  const [searchQuery, setSearchQuery]   = useState("");
  const [sourceFilter, setSourceFilter] = useState("customers"); // "customers" | "suppliers"
  const [typeFilter, setTypeFilter]     = useState(() => initialTypeFilter || "all"); // customer: 'all'|'Udhaar'|'Jama'
  const [methodFilter, setMethodFilter] = useState("all");

  // ── normalised supplier txns ──
  const normSupplierTxns = useMemo(
    () => supplierTransactions.map(normalizeSupplierTxn),
    [supplierTransactions]
  );

  // ── filtered customer transactions ──
  const filteredCustomerTxns = useMemo(() => {
    if (sourceFilter === "suppliers") return [];
    return transactions.filter((txn) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (txn.customerName || "").toLowerCase().includes(q) ||
        (txn.description  || "").toLowerCase().includes(q) ||
        (txn.billNumber   || "").toLowerCase().includes(q);

      const matchesType =
        typeFilter === "all" || typeFilter === "Udhaar" || typeFilter === "Jama"
          ? typeFilter === "all" || txn.type === typeFilter
          : true; // if a supplier sub-type is selected, no customer txns pass

      const matchesMethod =
        methodFilter === "all" ? true : txn.paymentMethod === methodFilter;

      return matchesSearch && matchesType && matchesMethod;
    });
  }, [transactions, searchQuery, sourceFilter, typeFilter, methodFilter]);

  // ── filtered supplier transactions ──
  const filteredSupplierTxns = useMemo(() => {
    if (sourceFilter === "customers") return [];
    return normSupplierTxns.filter((txn) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (txn.supplierName || "").toLowerCase().includes(q) ||
        (txn.reference    || "").toLowerCase().includes(q) ||
        (txn.description  || "").toLowerCase().includes(q);

      // If a customer-specific type filter is active (Udhaar/Jama), hide supplier txns
      const matchesType =
        typeFilter === "all" ? true
        : typeFilter === "Udhaar" || typeFilter === "Jama" ? false
        : txn.type === typeFilter;

      const matchesMethod =
        methodFilter === "all" ? true : txn.paymentMethod === methodFilter;

      return matchesSearch && matchesType && matchesMethod;
    });
  }, [normSupplierTxns, searchQuery, sourceFilter, typeFilter, methodFilter]);

  // ── summary numbers ──
  const totalUdhaar = filteredCustomerTxns
    .filter((t) => t.type === "Udhaar")
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const totalJama = filteredCustomerTxns
    .filter((t) => t.type === "Jama")
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  const totalPurchases = filteredSupplierTxns
    .filter((t) => isSupplierDebit(t.type))
    .reduce((s, t) => s + Number(t.debit || 0), 0);

  const totalSupplierPaid = filteredSupplierTxns
    .filter((t) => SUPPLIER_CREDIT_TYPES.has(t.type))
    .reduce((s, t) => s + Number(t.credit || 0), 0);

  const shownCount = filteredCustomerTxns.length + filteredSupplierTxns.length;

  // ── customer table columns (UNCHANGED) ──
  const customerColumns = [
    {
      header: "Slip #",
      key: "billNumber",
      width: "110px",
      render: (row) => (
        <span className="font-mono text-muted">{row.billNumber || "—"}</span>
      ),
    },
    {
      header: "Customer",
      key: "customerName",
      render: (row) => (
        <button
          type="button"
          className="customer-link-btn"
          onClick={() => onSelectCustomer && onSelectCustomer(row.customerId)}
        >
          <span className="customer-avatar-mini">
            {row.customerName ? row.customerName.charAt(0) : "C"}
          </span>
          <span className="customer-name-bold">{row.customerName}</span>
        </button>
      ),
    },
    {
      header: "Type",
      key: "type",
      render: (row) => (
        <span className={`badge-pill badge-${row.type.toLowerCase()}`}>
          <span className="badge-dot"></span>
          {row.type}
        </span>
      ),
    },
    {
      header: "Date",
      key: "date",
      render: (row) => <span className="date-cell">{row.date}</span>,
    },
    {
      header: "Description",
      key: "description",
      render: (row) => (
        <span className="txn-desc-cell">{row.description || "N/A"}</span>
      ),
    },
    {
      header: "Payment Method",
      key: "paymentMethod",
      render: (row) => (
        <span className="payment-method-tag">{row.paymentMethod || "Cash"}</span>
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
      header: "Receipt",
      key: "receiptAction",
      align: "center",
      width: "90px",
      render: (row) => {
        const targetCust =
          customers.find((c) => c.id === row.customerId) || { name: row.customerName };
        return (
          <button
            type="button"
            className="btn-print-receipt"
            title="Download unique receipt slip PDF"
            onClick={(e) => {
              e.stopPropagation();
              exportTransactionReceiptPDF(row, targetCust, shopInfo);
              toast.success(`Receipt PDF Downloaded: ${row.billNumber || "Slip"}`, {
                description: `Unique receipt slip downloaded automatically for ${row.customerName}.`,
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
              fontSize: "12px",
              fontWeight: "600",
              color: "#334155",
              cursor: "pointer",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Print
          </button>
        );
      },
    },
  ];

  // ── supplier table columns ──
  const supplierColumns = [
    {
      header: "Reference #",
      key: "reference",
      width: "130px",
      render: (row) => (
        <span className="font-mono text-muted">{row.reference || "—"}</span>
      ),
    },
    {
      header: "Supplier",
      key: "supplierName",
      render: (row) => (
        <button
          type="button"
          className="customer-link-btn"
          onClick={() => onSelectSupplier && onSelectSupplier(row.supplierId)}
        >
          <span className="customer-avatar-mini">
            {row.supplierName ? row.supplierName.charAt(0).toUpperCase() : "S"}
          </span>
          <span className="customer-name-bold">{row.supplierName}</span>
        </button>
      ),
    },
    {
      header: "Type",
      key: "type",
      render: (row) => {
        const c = SUPPLIER_TYPE_STYLE[row.type] || {
          bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1",
        };
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
                flexShrink: 0,
                display: "inline-block",
              }}
            />
            {row.type}
          </span>
        );
      },
    },
    {
      header: "Date",
      key: "date",
      render: (row) => <span className="date-cell">{row.date}</span>,
    },
    {
      header: "Description",
      key: "description",
      render: (row) => (
        <span className="txn-desc-cell">{row.description || "N/A"}</span>
      ),
    },
    {
      header: "Method",
      key: "paymentMethod",
      render: (row) => (
        <span className="payment-method-tag">{row.paymentMethod || "—"}</span>
      ),
    },
    {
      header: "Amount",
      key: "_amount",
      align: "right",
      render: (row) => {
        const isDebit = isSupplierDebit(row.type);
        const amt = getSupplierTxnAmount(row);
        return (
          <span className={`amount-cell ${isDebit ? "text-danger" : "text-success"}`}>
            {isDebit ? "+" : "−"} {currency} {amt.toLocaleString()}
          </span>
        );
      },
    },
    {
      header: "Status",
      key: "paymentStatus",
      align: "center",
      render: (row) => {
        if (!row.paymentStatus) {
          return (
            <span className="payment-method-tag">
              {row.type === "Payment" || row.type === "Purchase Return" ? "Completed" : "—"}
            </span>
          );
        }
        const statusColors = {
          Paid:            { bg: "var(--success-light)", color: "var(--success)", border: "#bbf7d0" },
          "Partially Paid":{ bg: "var(--warning-light)", color: "var(--warning)", border: "#fde68a" },
          Unpaid:          { bg: "var(--danger-light)",  color: "var(--danger)",  border: "#fecaca" },
        };
        const c = statusColors[row.paymentStatus] || { bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1" };
        return (
          <span
            style={{
              display: "inline-block",
              padding: "2px 9px",
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

  // ─── decide which table(s) to show ──────────────────────────────────────────
  const showCustomers = sourceFilter !== "suppliers";
  const showSuppliers = sourceFilter !== "customers";

  const hasActiveFilter = searchQuery || typeFilter !== "all" || methodFilter !== "all";

  return (
    <div className="page-transactions">

      {/* ── Source Tab Bar ─────────────────────────────────────────────────────── */}
      <div className="dashboard-tab-bar">
        <button
          type="button"
          className={`dashboard-tab-btn ${sourceFilter === "customers" ? "active" : ""}`}
          onClick={() => { setSourceFilter("customers"); setTypeFilter("all"); }}
        >
          <span className="dashboard-tab-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </span>
          <span>Customers</span>
        </button>
        <button
          type="button"
          className={`dashboard-tab-btn ${sourceFilter === "suppliers" ? "active" : ""}`}
          onClick={() => { setSourceFilter("suppliers"); setTypeFilter("all"); }}
        >
          <span className="dashboard-tab-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </span>
          <span>Suppliers</span>
        </button>
      </div>

      {/* ── Summary Strip ──────────────────────────────────────────────────── */}
      <div className="transactions-summary-strip">
        <div className="summary-pill">
          <span className="summary-pill-label">Total Shown</span>
          <span className="summary-pill-val">{shownCount} entries</span>
        </div>

        {/* Customer summaries */}
        {showCustomers && (
          <>
            <div className="summary-pill">
              <span className="summary-pill-label">Udhaar</span>
              <span className="summary-pill-val text-danger">
                {currency} {totalUdhaar.toLocaleString()}
              </span>
            </div>
            <div className="summary-pill">
              <span className="summary-pill-label">Jama</span>
              <span className="summary-pill-val text-success">
                {currency} {totalJama.toLocaleString()}
              </span>
            </div>
          </>
        )}

        {/* Supplier summaries */}
        {showSuppliers && (
          <>
            <div className="summary-pill">
              <span className="summary-pill-label">Purchases</span>
              <span className="summary-pill-val text-danger">
                {currency} {totalPurchases.toLocaleString()}
              </span>
            </div>
            <div className="summary-pill">
              <span className="summary-pill-label">Paid to Suppliers</span>
              <span className="summary-pill-val text-success">
                {currency} {totalSupplierPaid.toLocaleString()}
              </span>
            </div>
          </>
        )}

        {/* Net difference (customer view only) */}
        {showCustomers && !showSuppliers && (
          <div className="summary-pill">
            <span className="summary-pill-label">Net Difference</span>
            <span className="summary-pill-val font-semibold">
              {currency} {(totalUdhaar - totalJama).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="section-toolbar">
        {/* Search */}
        <div className="toolbar-search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder={
              sourceFilter === "suppliers"
                ? "Search by supplier, reference #, or description..."
                : sourceFilter === "customers"
                ? "Search by customer, invoice #, or items..."
                : "Search customers, suppliers, references..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        <div className="toolbar-actions">
          {/* Source toggle removed — now handled by top tab bar */}

          {/* Customer type sub-filter — visible only when not supplier-only */}
          {sourceFilter !== "suppliers" && (
            <div className="filter-pill-group">
              <button
                type="button"
                className={`filter-pill ${typeFilter === "all" ? "active" : ""}`}
                onClick={() => setTypeFilter("all")}
              >
                All Types
              </button>
              <button
                type="button"
                className={`filter-pill ${typeFilter === "Udhaar" ? "active" : ""}`}
                onClick={() => setTypeFilter("Udhaar")}
              >
                Udhaar
              </button>
              <button
                type="button"
                className={`filter-pill ${typeFilter === "Jama" ? "active" : ""}`}
                onClick={() => setTypeFilter("Jama")}
              >
                Jama
              </button>
            </div>
          )}

          {/* Supplier type sub-filter — visible only when not customer-only */}
          {sourceFilter === "suppliers" && (
            <div className="filter-pill-group">
              <button
                type="button"
                className={`filter-pill ${typeFilter === "all" ? "active" : ""}`}
                onClick={() => setTypeFilter("all")}
              >
                All Types
              </button>
              <button
                type="button"
                className={`filter-pill ${typeFilter === "Purchase" ? "active" : ""}`}
                onClick={() => setTypeFilter("Purchase")}
              >
                Purchase
              </button>
              <button
                type="button"
                className={`filter-pill ${typeFilter === "Payment" ? "active" : ""}`}
                onClick={() => setTypeFilter("Payment")}
              >
                Payment
              </button>
              <button
                type="button"
                className={`filter-pill ${typeFilter === "Purchase Return" ? "active" : ""}`}
                onClick={() => setTypeFilter("Purchase Return")}
              >
                Returns
              </button>
            </div>
          )}

          {/* Method filter */}
          <select
            className="filter-select"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
          >
            <option value="all">All Methods</option>
            <option value="Cash">Cash</option>
            <option value="EasyPaisa">EasyPaisa</option>
            <option value="JazzCash">JazzCash</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Khata Credit">Khata Credit</option>
            <option value="Cheque">Cheque</option>
          </select>

          <Button
            variant="primary"
            size="md"
            icon="+"
            onClick={() => onOpenAddTransaction("Udhaar")}
          >
            Add Transaction
          </Button>
        </div>
      </div>

      {/* ── Customer Transactions Table ─────────────────────────────────────── */}
      {showCustomers && (
        <div
          className="dashboard-card no-padding"
          style={{ marginBottom: showSuppliers ? "24px" : "0" }}
        >
          {/* Section label when both are showing */}
          {showSuppliers && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 20px 12px 20px",
                borderBottom: "1px solid var(--border-color)",
                gap: "10px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                </svg>
                Customer Transactions
              </span>
              <span
                style={{
                  fontSize: "11px",
                  background: "var(--border-light)",
                  color: "var(--text-muted)",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  border: "1px solid var(--border-color)",
                }}
              >
                {filteredCustomerTxns.length}
              </span>
            </div>
          )}
          <Table
            columns={customerColumns}
            data={filteredCustomerTxns}
            keyField="id"
            emptyMessage={
              hasActiveFilter
                ? "No customer transactions match your filter."
                : "No customer transactions recorded yet."
            }
          />
        </div>
      )}

      {/* ── Supplier Transactions Table ─────────────────────────────────────── */}
      {showSuppliers && (
        <div className="dashboard-card no-padding">
          {/* Section label when both are showing */}
          {showCustomers && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 20px 12px 20px",
                borderBottom: "1px solid var(--border-color)",
                gap: "10px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
                Supplier Transactions
              </span>
              <span
                style={{
                  fontSize: "11px",
                  background: "var(--border-light)",
                  color: "var(--text-muted)",
                  padding: "2px 8px",
                  borderRadius: "999px",
                  border: "1px solid var(--border-color)",
                }}
              >
                {filteredSupplierTxns.length}
              </span>
            </div>
          )}
          <Table
            columns={supplierColumns}
            data={filteredSupplierTxns}
            keyField="id"
            onRowClick={(row) => onSelectSupplier && onSelectSupplier(row.supplierId)}
            emptyMessage={
              hasActiveFilter
                ? "No supplier transactions match your filter."
                : "No supplier transactions recorded yet."
            }
          />
        </div>
      )}
    </div>
  );
}
