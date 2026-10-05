import { useState, useMemo } from "react";
import Table from "../components/Table";
import Button from "../components/Button";
import SupplierModal from "../components/SupplierModal";
import SupplierConfirmModal from "../components/SupplierConfirmModal";

export default function Suppliers({
  suppliers = [],
  onSelectSupplier,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onToggleSupplierStatus,
  currency = "Rs.",
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // Confirm Modal State
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedSupplierForAction, setSelectedSupplierForAction] = useState(null);

  // Filtered & Searched Suppliers
  const filteredSuppliers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return suppliers.filter((supplier) => {
      // 5. Add Search: Search by name, phone, email
      const matchesName = supplier.name?.toLowerCase().includes(query) || false;
      const matchesPhone = supplier.phone?.toLowerCase().includes(query) || false;
      const matchesEmail = supplier.email?.toLowerCase().includes(query) || false;

      const matchesSearch = !query || matchesName || matchesPhone || matchesEmail;

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
          ? supplier.status === "Active"
          : supplier.status === "Inactive";

      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchQuery, statusFilter]);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (supplier, e) => {
    if (e) e.stopPropagation();
    setEditingSupplier(supplier);
    setModalOpen(true);
  };

  const handleOpenConfirm = (supplier, e) => {
    if (e) e.stopPropagation();
    setSelectedSupplierForAction(supplier);
    setConfirmModalOpen(true);
  };

  const handleSaveModal = (formData) => {
    if (editingSupplier) {
      onUpdateSupplier(editingSupplier.id, formData);
    } else {
      onAddSupplier(formData);
    }
    setModalOpen(false);
    setEditingSupplier(null);
  };

  // Columns for Table (Requirement 2):
  // - Supplier Name
  // - Phone
  // - Email
  // - Opening Balance
  // - Current Balance
  // - Status
  // - Actions
  const columns = [
    {
      header: "Supplier Name",
      key: "name",
      render: (supplier) => (
        <div className="table-customer-cell">
          <div className="avatar-circle">
            {supplier.name ? supplier.name.charAt(0).toUpperCase() : "S"}
          </div>
          <div>
            <span className="customer-name-bold">{supplier.name}</span>
            <span className="customer-meta-sub">
              {supplier.address || "Wholesale Merchant"}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: "Phone",
      key: "phone",
      render: (supplier) => (
        <span className="customer-phone-badge">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              display: "inline-block",
              verticalAlign: "middle",
              marginRight: "4px",
            }}
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
          {supplier.phone}
        </span>
      ),
    },
    {
      header: "Email",
      key: "email",
      render: (supplier) => (
        <span
          className="text-muted font-medium"
          style={{ fontSize: "13px", letterSpacing: "0.2px" }}
        >
          {supplier.email || "—"}
        </span>
      ),
    },
    {
      header: "Opening Balance",
      key: "openingBalance",
      render: (supplier) => (
        <span className="font-medium text-dark">
          {currency} {(Number(supplier.openingBalance) || 0).toLocaleString()}
        </span>
      ),
    },
    {
      header: "Current Balance",
      key: "currentBalance",
      align: "right",
      render: (supplier) => {
        const bal = Number(supplier.currentBalance) || 0;
        return (
          <span
            className={`balance-badge ${
              bal > 0 ? "balance-due" : "balance-cleared"
            }`}
          >
            {bal > 0
              ? `Payable: ${currency} ${bal.toLocaleString()}`
              : `Cleared (0)`}
          </span>
        );
      },
    },
    {
      header: "Status",
      key: "status",
      align: "center",
      render: (supplier) => {
        const isActive = supplier.status === "Active";
        return (
          <span
            className={`badge-pill ${
              isActive ? "badge-jama" : "badge-inactive"
            }`}
          >
            <span className="badge-dot"></span>
            {supplier.status || "Active"}
          </span>
        );
      },
    },
    {
      header: "Actions",
      key: "actions",
      align: "center",
      render: (supplier) => (
        <div
          className="table-action-btns"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectSupplier(supplier.id)}
            title="View Supplier Details"
          >
            Details
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => handleOpenEdit(supplier, e)}
            title="Edit Supplier"
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={(e) => handleOpenConfirm(supplier, e)}
            title="Delete or Deactivate Supplier"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const totalCount = suppliers.length;
  const activeCount = suppliers.filter((s) => s.status === "Active").length;
  const inactiveCount = suppliers.filter((s) => s.status === "Inactive").length;

  return (
    <div className="page-customers">
      {/* Search and Toolbar */}
      <div className="section-toolbar">
        <div className="toolbar-search-box">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            id="supplier-search-input"
            type="text"
            placeholder="Search suppliers by name, phone, or email..."
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
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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
              All ({totalCount})
            </button>
            <button
              type="button"
              className={`filter-pill ${statusFilter === "active" ? "active" : ""}`}
              onClick={() => setStatusFilter("active")}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              className={`filter-pill ${statusFilter === "inactive" ? "active" : ""}`}
              onClick={() => setStatusFilter("inactive")}
            >
              Inactive ({inactiveCount})
            </button>
          </div>

          <Button
            variant="primary"
            size="md"
            icon="+"
            onClick={handleOpenAdd}
          >
            Add Supplier
          </Button>
        </div>
      </div>

      {/* Supplier List Table */}
      <div className="dashboard-card no-padding">
        <Table
          columns={columns}
          data={filteredSuppliers}
          keyField="id"
          onRowClick={(row) => onSelectSupplier(row.id)}
          emptyMessage={
            searchQuery
              ? `No suppliers matching "${searchQuery}"`
              : "No suppliers registered yet. Click Add Supplier to get started!"
          }
        />
      </div>

      {/* Add / Edit Supplier Modal */}
      <SupplierModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingSupplier(null);
        }}
        onSave={handleSaveModal}
        supplier={editingSupplier}
        currency={currency}
      />

      {/* Delete / Deactivate Confirmation Modal */}
      <SupplierConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => {
          setConfirmModalOpen(false);
          setSelectedSupplierForAction(null);
        }}
        supplier={selectedSupplierForAction}
        onConfirmDelete={onDeleteSupplier}
        onConfirmToggleStatus={onToggleSupplierStatus}
      />
    </div>
  );
}
