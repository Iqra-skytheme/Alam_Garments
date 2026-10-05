import { useState } from "react";
import StatCard from "../components/StatCard";
import Table from "../components/Table";
import Button from "../components/Button";

// ── Tab icons ──────────────────────────────────────────────────────────────────
const TabIcons = {
  customers: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  suppliers: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
};

export default function Dashboard({
  customers = [],
  transactions = [],
  suppliers = [],
  supplierTransactions = [],
  onNavigate,
  onOpenAddTransaction,
  onOpenAddCustomer,
  currency = "Rs.",
}) {
  const [activeTab, setActiveTab] = useState("customers");

  // ── Customer Statistics ────────────────────────────────────────────────────
  const totalUdhaar = transactions
    .filter((t) => t.type === "Udhaar")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalJama = transactions
    .filter((t) => t.type === "Jama")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const netBalance = totalUdhaar - totalJama;

  // Recent 5 customer transactions
  const recentTransactions = [...transactions].slice(0, 5);

  // Top customers by balance
  const topDebtors = [...customers]
    .filter((c) => (c.balance || 0) > 0)
    .sort((a, b) => (b.balance || 0) - (a.balance || 0))
    .slice(0, 4);

  // ── Supplier Statistics ────────────────────────────────────────────────────
  const totalSuppliers = suppliers.length;

  const totalPurchases = suppliers.reduce(
    (sum, s) => sum + (Number(s.totalPurchases) || 0),
    0
  );

  const totalPaidToSuppliers = suppliers.reduce(
    (sum, s) => sum + (Number(s.totalPaid) || 0),
    0
  );

  const totalOutstandingPayables = suppliers.reduce(
    (sum, s) => sum + (Number(s.currentBalance) || 0),
    0
  );

  // Recent 5 supplier transactions (newest first)
  const recentSupplierTxns = [...supplierTransactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  // Suppliers with outstanding balance (biggest first)
  const outstandingSuppliers = [...suppliers]
    .filter((s) => (Number(s.currentBalance) || 0) > 0)
    .sort((a, b) => (Number(b.currentBalance) || 0) - (Number(a.currentBalance) || 0))
    .slice(0, 4);

  // ── Combined totals for overview tab ──────────────────────────────────────
  const totalNetReceivable = Math.max(0, netBalance);
  const totalNetPayable = totalOutstandingPayables;

  // ── Customer table columns ─────────────────────────────────────────────────
  const custColumns = [
    {
      header: "Customer",
      key: "customerName",
      render: (row) => (
        <div className="table-customer-cell">
          <div className="avatar-circle">
            {row.customerName ? row.customerName.charAt(0) : "C"}
          </div>
          <div>
            <span className="customer-name-bold">{row.customerName}</span>
            <span className="customer-meta-sub">{row.billNumber}</span>
          </div>
        </div>
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
      header: "Method",
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
  ];

  // ── Supplier activity table columns ───────────────────────────────────────
  const supplierTxnTypeStyle = {
    "Opening Balance": { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
    "Purchase": { bg: "var(--danger-light)", color: "var(--danger)", border: "#fecaca" },
    "Payment": { bg: "var(--success-light)", color: "var(--success)", border: "#bbf7d0" },
    "Purchase Return": { bg: "var(--warning-light)", color: "var(--warning)", border: "#fde68a" },
  };

  const supplierColumns = [
    {
      header: "Supplier",
      key: "supplierName",
      render: (row) => (
        <div className="table-customer-cell">
          <div className="avatar-circle">
            {row.supplierName ? row.supplierName.charAt(0).toUpperCase() : "S"}
          </div>
          <div>
            <span className="customer-name-bold">{row.supplierName}</span>
            <span className="customer-meta-sub">{row.reference}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Type",
      key: "type",
      render: (row) => {
        const c = supplierTxnTypeStyle[row.type] || { bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1" };
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
      header: "Reference",
      key: "reference",
      render: (row) => (
        <span
          style={{
            fontSize: "12px",
            fontFamily: "var(--font-mono)",
            color: "var(--text-muted)",
          }}
        >
          {row.reference}
        </span>
      ),
    },
    {
      header: "Amount",
      key: "amount",
      align: "right",
      render: (row) => {
        const isPurchase = row.type === "Purchase" || row.type === "Opening Balance";
        const amt = isPurchase ? Number(row.debit || 0) : Number(row.credit || 0);
        return (
          <span
            className={`amount-cell ${isPurchase ? "text-danger" : "text-success"}`}
          >
            {isPurchase ? "+" : "−"} {currency} {amt.toLocaleString()}
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
              {row.type === "Payment" ? "Completed" : "—"}
            </span>
          );
        }
        const statusColors = {
          "Paid": { bg: "var(--success-light)", color: "var(--success)", border: "#bbf7d0" },
          "Partially Paid": { bg: "var(--warning-light)", color: "var(--warning)", border: "#fde68a" },
          "Unpaid": { bg: "var(--danger-light)", color: "var(--danger)", border: "#fecaca" },
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

  // ── Tab content renderers ──────────────────────────────────────────────────

  const renderDashboardTab = () => (
    <>
      {/* Combined Overview Stats */}
      <section className="dashboard-stats-grid">
        <StatCard
          title="Total Customers"
          value={customers.length}
          icon={TabIcons.customers}
          variant="primary"
          trend={{ direction: "up", label: "Active accounts" }}
          onClick={() => onNavigate("customers", { statusFilter: "all" })}
        />
        <StatCard
          title="Net Receivable"
          value={`${currency} ${totalNetReceivable.toLocaleString()}`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
              <polyline points="17 18 23 18 23 12" />
            </svg>
          }
          variant="success"
          trend={{ direction: "up", label: "Customer credit" }}
          onClick={() => onNavigate("customers", { statusFilter: "pending" })}
        />
        <StatCard
          title="Total Suppliers"
          value={totalSuppliers}
          icon={TabIcons.suppliers}
          variant="warning"
          trend={{ direction: "up", label: "Active vendors" }}
          onClick={() => onNavigate("suppliers")}
        />
        <StatCard
          title="Outstanding Payables"
          value={`${currency} ${totalNetPayable.toLocaleString()}`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          }
          variant="danger"
          trend={{ direction: totalNetPayable > 0 ? "up" : "down", label: totalNetPayable > 0 ? "Due to suppliers" : "Cleared" }}
          onClick={() => onNavigate("suppliers")}
        />
      </section>

      {/* Quick Actions */}
      <section className="dashboard-quick-actions">
        <div className="quick-actions-info">
          <h3>Quick Operations</h3>
        </div>
        <div className="quick-actions-btns">
          <Button
            variant="danger"
            size="md"
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            }
            onClick={() => onOpenAddTransaction("Udhaar")}
          >
            Give Udhaar
          </Button>
          <Button
            variant="success"
            size="md"
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            }
            onClick={() => onOpenAddTransaction("Jama")}
          >
            Receive Jama
          </Button>
          <Button
            variant="outline"
            size="md"
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            }
            onClick={onOpenAddCustomer}
          >
            New Customer
          </Button>
          <Button
            variant="outline"
            size="md"
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            }
            onClick={() => onNavigate("suppliers")}
          >
            View Suppliers
          </Button>
        </div>
      </section>

      {/* Two columns: Customer + Supplier recent activity */}
      <div className="dashboard-content-split">
        {/* Recent Customer Transactions */}
        <div className="dashboard-card transactions-card">
          <div className="card-header-flex">
            <div>
              <h2 className="card-heading">Recent Customer Transactions</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("transactions", { typeFilter: "all" })}
            >
              View All →
            </Button>
          </div>
          <div className="dashboard-table-scroll-wrap">
            <Table
              columns={custColumns}
              data={recentTransactions}
              keyField="id"
              emptyMessage="No transactions recorded yet."
            />
          </div>
        </div>

        {/* Outstanding Payables Side */}
        <div className="dashboard-card top-debtors-card">
          <div className="card-header-flex">
            <h2 className="card-heading">Pending Recovery</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("customers", { statusFilter: "pending" })}
            >
              All →
            </Button>
          </div>
          {topDebtors.length === 0 ? (
            <div className="empty-debtors">
              <div className="empty-check-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <p>All accounts are cleared!</p>
            </div>
          ) : (
            <div className="debtors-list">
              {topDebtors.map((customer) => (
                <div
                  key={customer.id}
                  className="debtor-item"
                  onClick={() => onNavigate("customer-details", customer.id)}
                >
                  <div className="debtor-left">
                    <div className="avatar-circle">{customer.name.charAt(0)}</div>
                    <div>
                      <h4 className="debtor-name">{customer.name}</h4>
                      <p className="debtor-phone">{customer.phone}</p>
                    </div>
                  </div>
                  <div className="debtor-right">
                    <span className="debtor-amount">
                      {currency} {(customer.balance || 0).toLocaleString()}
                    </span>
                    <span className="debtor-action-hint">View Ledger →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  const renderCustomersTab = () => (
    <>
      {/* Customer Stat Cards */}
      <section className="dashboard-stats-grid">
        <StatCard
          title="Total Customers"
          value={customers.length}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
          variant="primary"
          trend={{ direction: "up", label: "+4 new" }}
          onClick={() => onNavigate("customers", { statusFilter: "all" })}
        />
        <StatCard
          title="Total Udhaar (Given)"
          value={`${currency} ${totalUdhaar.toLocaleString()}`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
              <polyline points="17 18 23 18 23 12" />
            </svg>
          }
          variant="danger"
          trend={{ direction: "up", label: "Credit" }}
          onClick={() => onNavigate("transactions", { typeFilter: "Udhaar" })}
        />
        <StatCard
          title="Total Jama (Received)"
          value={`${currency} ${totalJama.toLocaleString()}`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          }
          variant="success"
          trend={{ direction: "up", label: "Collected" }}
          onClick={() => onNavigate("transactions", { typeFilter: "Jama" })}
        />
        <StatCard
          title="Net Receivable"
          value={`${currency} ${Math.max(0, netBalance).toLocaleString()}`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          }
          variant="warning"
          trend={{ direction: "up", label: "Recovery" }}
          onClick={() => onNavigate("customers", { statusFilter: "pending" })}
        />
      </section>

      {/* Customer Quick Actions */}
      <section className="dashboard-quick-actions">
        <div className="quick-actions-info">
          <h3>Customer Operations</h3>
        </div>
        <div className="quick-actions-btns">
          <Button
            variant="danger"
            size="md"
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            }
            onClick={() => onOpenAddTransaction("Udhaar")}
          >
            Give Udhaar
          </Button>
          <Button
            variant="success"
            size="md"
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            }
            onClick={() => onOpenAddTransaction("Jama")}
          >
            Receive Jama
          </Button>
          <Button
            variant="outline"
            size="md"
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            }
            onClick={onOpenAddCustomer}
          >
            New Customer
          </Button>
          <Button
            variant="ghost"
            size="md"
            onClick={() => onNavigate("customers", { statusFilter: "all" })}
          >
            All Customers →
          </Button>
        </div>
      </section>

      {/* Grid: Recent Transactions & Pending Recovery */}
      <div className="dashboard-content-split">
        <div className="dashboard-card transactions-card">
          <div className="card-header-flex">
            <div>
              <h2 className="card-heading">Recent Transactions</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("transactions", { typeFilter: "all" })}
            >
              View All →
            </Button>
          </div>
          <div className="dashboard-table-scroll-wrap">
            <Table
              columns={custColumns}
              data={recentTransactions}
              keyField="id"
              emptyMessage="No transactions recorded yet."
            />
          </div>
        </div>

        <div className="dashboard-card top-debtors-card">
          <div className="card-header-flex">
            <div>
              <h2 className="card-heading">Pending Recovery</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("customers", { statusFilter: "pending" })}
            >
              All →
            </Button>
          </div>

          {topDebtors.length === 0 ? (
            <div className="empty-debtors">
              <div className="empty-check-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <p>All accounts are cleared!</p>
            </div>
          ) : (
            <div className="debtors-list">
              {topDebtors.map((customer) => (
                <div
                  key={customer.id}
                  className="debtor-item"
                  onClick={() => onNavigate("customer-details", customer.id)}
                >
                  <div className="debtor-left">
                    <div className="avatar-circle">
                      {customer.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="debtor-name">{customer.name}</h4>
                      <p className="debtor-phone">{customer.phone}</p>
                    </div>
                  </div>
                  <div className="debtor-right">
                    <span className="debtor-amount">
                      {currency} {(customer.balance || 0).toLocaleString()}
                    </span>
                    <span className="debtor-action-hint">View Ledger →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  const renderSuppliersTab = () => (
    <>
      {/* Supplier Stat Cards */}
      <section className="dashboard-stats-grid">
        <StatCard
          title="Total Suppliers"
          value={totalSuppliers}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          }
          variant="primary"
          trend={{ direction: "up", label: "Active vendors" }}
          onClick={() => onNavigate("suppliers")}
        />
        <StatCard
          title="Total Purchases"
          value={`${currency} ${totalPurchases.toLocaleString()}`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          }
          variant="danger"
          trend={{ direction: "up", label: "All purchases" }}
          onClick={() => onNavigate("suppliers")}
        />
        <StatCard
          title="Total Paid to Suppliers"
          value={`${currency} ${totalPaidToSuppliers.toLocaleString()}`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          }
          variant="success"
          trend={{ direction: "up", label: "Payments made" }}
          onClick={() => onNavigate("suppliers")}
        />
        <StatCard
          title="Outstanding Payables"
          value={`${currency} ${totalOutstandingPayables.toLocaleString()}`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
          }
          variant="warning"
          trend={{
            direction: totalOutstandingPayables > 0 ? "up" : "down",
            label: totalOutstandingPayables > 0 ? "Due" : "Cleared",
          }}
          onClick={() => onNavigate("suppliers")}
        />
      </section>

      {/* Supplier Quick Actions */}
      <section className="dashboard-quick-actions">
        <div className="quick-actions-info">
          <h3>Supplier Operations</h3>
        </div>
        <div className="quick-actions-btns">
          <Button
            variant="primary"
            size="md"
            icon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            }
            onClick={() => onNavigate("suppliers")}
          >
            Add Supplier
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={() => onNavigate("suppliers")}
          >
            All Suppliers →
          </Button>
        </div>
      </section>

      {/* Grid: Supplier Activity & Outstanding Payables */}
      <div className="dashboard-content-split">
        <div className="dashboard-card transactions-card">
          <div className="card-header-flex">
            <div>
              <h2 className="card-heading">Supplier Activity</h2>
              <p className="card-subheading" style={{ marginTop: "2px", fontSize: "12px", color: "var(--text-muted)" }}>
                Recent purchases & payments
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("suppliers")}
            >
              View All →
            </Button>
          </div>
          <div className="dashboard-table-scroll-wrap">
            <Table
              columns={supplierColumns}
              data={recentSupplierTxns}
              keyField="id"
              onRowClick={(row) => onNavigate("supplier-details", row.supplierId)}
              emptyMessage="No supplier transactions recorded yet."
            />
          </div>
        </div>

        <div className="dashboard-card top-debtors-card">
          <div className="card-header-flex">
            <div>
              <h2 className="card-heading">Outstanding Payables</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("suppliers")}
            >
              All →
            </Button>
          </div>

          {outstandingSuppliers.length === 0 ? (
            <div className="empty-debtors">
              <div className="empty-check-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <p>All supplier accounts are cleared!</p>
            </div>
          ) : (
            <div className="debtors-list">
              {outstandingSuppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="debtor-item"
                  onClick={() => onNavigate("supplier-details", supplier.id)}
                >
                  <div className="debtor-left">
                    <div className="avatar-circle">
                      {supplier.name ? supplier.name.charAt(0).toUpperCase() : "S"}
                    </div>
                    <div>
                      <h4 className="debtor-name">{supplier.name}</h4>
                      <p className="debtor-phone">{supplier.phone}</p>
                    </div>
                  </div>
                  <div className="debtor-right">
                    <span className="debtor-amount" style={{ color: "var(--danger)" }}>
                      {currency} {(Number(supplier.currentBalance) || 0).toLocaleString()}
                    </span>
                    <span className="debtor-action-hint">View Supplier →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="page-dashboard">
      {/* ── Tab Bar ─────────────────────────────────────────────────────────── */}
      <div className="dashboard-tab-bar">
        {[
          { id: "customers", label: "Customers" },
          { id: "suppliers", label: "Suppliers" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`dashboard-tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="dashboard-tab-icon">{TabIcons[tab.id]}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────────── */}
      <div className="dashboard-tab-content">
        {activeTab === "customers" && renderCustomersTab()}
        {activeTab === "suppliers" && renderSuppliersTab()}
      </div>
    </div>
  );
}
