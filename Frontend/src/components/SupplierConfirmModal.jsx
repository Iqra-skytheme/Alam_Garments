import Modal from "./Modal";
import Button from "./Button";

export default function SupplierConfirmModal({
  isOpen,
  onClose,
  supplier,
  onConfirmDelete,
  onConfirmToggleStatus,
}) {
  if (!supplier) return null;

  const isActive = supplier.status === "Active";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete or Deactivate Supplier"
      maxWidth="480px"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "14px",
            padding: "16px",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "8px",
          }}
        >
          <div style={{ color: "#d97706", flexShrink: 0, marginTop: "2px" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <div>
            <h4 style={{ margin: "0 0 4px 0", fontSize: "15px", fontWeight: "600", color: "#92400e" }}>
              Manage {supplier.name}
            </h4>
            <p style={{ margin: 0, fontSize: "13px", color: "#78350f", lineHeight: "1.4" }}>
              Are you sure you want to deactivate or delete this supplier from your directory?
            </p>
          </div>
        </div>

        <div style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.5" }}>
          <p style={{ margin: "0 0 8px 0" }}>
            <strong>• Deactivate:</strong> Sets supplier status to <em>{isActive ? "Inactive" : "Active"}</em>. Preserves all balance and profile records safely.
          </p>
          <p style={{ margin: 0 }}>
            <strong>• Delete Permanently:</strong> Completely removes this supplier from your directory.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "10px",
            marginTop: "12px",
            flexWrap: "wrap",
          }}
        >
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              onConfirmToggleStatus(supplier.id);
              onClose();
            }}
          >
            {isActive ? "Deactivate Supplier" : "Activate Supplier"}
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              onConfirmDelete(supplier.id);
              onClose();
            }}
          >
            Delete Permanently
          </Button>
        </div>
      </div>
    </Modal>
  );
}
