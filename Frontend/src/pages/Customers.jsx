import { useState, useMemo, useEffect } from "react";
import Table from "../components/Table";
import Button from "../components/Button";

export default function Customers({
  customers = [],
  onSelectCustomer,
  onOpenAddCustomer,
  onOpenAddTransaction,
  currency = "Rs.",
  initialStatusFilter = "all",
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);

  useEffect(() => {
    if (initialStatusFilter) {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery) ||
        (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (customer.address &&
          customer.address.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "pending"
          ? (customer.balance || 0) > 0
          : (customer.balance || 0) === 0;

      return matchesSearch && matchesStatus;
    });
  }, [customers, searchQuery, statusFilter]);

  const columns = [
    {
      header: "Customer",
      key: "name",
      render: (customer) => (
        <div className="table-customer-cell">
          <div className="avatar-circle">{customer.name.charAt(0)}</div>
          <div>
            <span className="customer-name-bold">{customer.name}</span>
            <span className="customer-meta-sub">
              {customer.email ? `${customer.email} • ` : ""}{customer.address}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Phone Number",
      key: "phone",
      render: (customer) => (
        <span className="customer-phone-badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle", marginRight: "4px" }}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
          {customer.phone}
        </span>
      ),
    },
    {
      header: "Total Udhaar",
      key: "totalUdhaar",
      render: (customer) => (
        <span className="text-danger font-medium">
          {currency} {(customer.totalUdhaar || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Total Jama",
      key: "totalJama",
      render: (customer) => (
        <span className="text-success font-medium">
          {currency} {(customer.totalJama || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Current Balance",
      key: "balance",
      align: "right",
      render: (customer) => {
        const bal = customer.balance || 0;
        return (
          <span
            className={`balance-badge ${
              bal > 0 ? "balance-due" : "balance-cleared"
            }`}
          >
            {bal > 0
              ? `Owes ${currency} ${bal.toLocaleString()}`
              : `Cleared (0)`}
          </span>
        );
      },
    },
    {
      header: "Actions",
      key: "actions",
      align: "center",
      render: (customer) => (
        <div
          className="table-action-btns"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectCustomer(customer.id)}
          >
            Khata
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onOpenAddTransaction("Udhaar", customer.id)}
          >
            + Entry
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-customers">
      <div className="section-toolbar">
        <div className="toolbar-search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search customers by name or phone..."
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
          <div className="filter-pill-group">
            <button
              type="button"
              className={`filter-pill ${statusFilter === "all" ? "active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              All ({customers.length})
            </button>
            <button
              type="button"
              className={`filter-pill ${statusFilter === "pending" ? "active" : ""}`}
              onClick={() => setStatusFilter("pending")}
            >
              Pending (
              {customers.filter((c) => (c.balance || 0) > 0).length}
              )
            </button>
            <button
              type="button"
              className={`filter-pill ${statusFilter === "cleared" ? "active" : ""}`}
              onClick={() => setStatusFilter("cleared")}
            >
              Cleared (
              {customers.filter((c) => (c.balance || 0) === 0).length}
              )
            </button>
          </div>

          <Button
            variant="primary"
            size="md"
            icon="+"
            onClick={onOpenAddCustomer}
          >
            Add Customer
          </Button>
        </div>
      </div>

      <div className="dashboard-card no-padding">
        <Table
          columns={columns}
          data={filteredCustomers}
          keyField="id"
          onRowClick={(row) => onSelectCustomer(row.id)}
          emptyMessage={
            searchQuery
              ? `No customers matching "${searchQuery}"`
              : "No customers added yet. Click Add Customer to get started!"
          }
        />
      </div>
    </div>
  );
}
