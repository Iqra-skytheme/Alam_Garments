import { useState, useMemo } from "react";
import { toast } from "sonner";
import Modal from "./Modal";
import Button from "./Button";

function PurchaseForm({ suppliers, defaultSupplierId, onClose, onSave, currency }) {
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    supplierId: defaultSupplierId || (suppliers[0]?.id ?? ""),
    date: today,
    item: "",
    quantity: "",
    purchasePrice: "",
    amountPaid: "0",
    paymentStatus: "Unpaid",
    notes: "",
  });

  const [errors, setErrors] = useState({});

  // Derived calculations
  const qty = parseFloat(form.quantity) || 0;
  const price = parseFloat(form.purchasePrice) || 0;
  const totalAmount = qty * price;
  const paid = parseFloat(form.amountPaid) || 0;
  const remaining = Math.max(0, totalAmount - paid);

  // Derive payment status automatically based on amounts
  const derivedStatus = useMemo(() => {
    if (totalAmount <= 0) return "Unpaid";
    if (paid <= 0) return "Unpaid";
    if (paid >= totalAmount) return "Paid";
    return "Partially Paid";
  }, [totalAmount, paid]);

  const handleChange = (field, value) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      return updated;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.supplierId) errs.supplierId = "Please select a supplier.";
    if (!form.item.trim()) errs.item = "Item / product name is required.";
    if (!form.quantity || parseFloat(form.quantity) <= 0) errs.quantity = "Quantity must be greater than 0.";
    if (!form.purchasePrice || parseFloat(form.purchasePrice) <= 0) errs.purchasePrice = "Purchase price must be greater than 0.";
    if (paid > totalAmount) errs.amountPaid = `Amount paid cannot exceed total amount (${currency} ${totalAmount.toLocaleString()}).`;

    setErrors(errs);
    const firstErr = Object.values(errs)[0];
    if (firstErr) {
      toast.error(firstErr);
      return false;
    }
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const supplier = suppliers.find((s) => s.id === form.supplierId);
    const refNum = `PO-${form.supplierId.toUpperCase()}-${Date.now().toString().slice(-5)}`;

    const purchaseTxn = {
      id: `st-${Date.now()}`,
      supplierId: form.supplierId,
      supplierName: supplier?.name || "Unknown Supplier",
      type: "Purchase",
      date: form.date,
      reference: refNum,
      description: form.item.trim(),
      debit: totalAmount,
      credit: paid > 0 ? paid : 0,
      paymentMethod: null,
      item: form.item.trim(),
      quantity: qty,
      purchasePrice: price,
      totalAmount,
      amountPaid: paid,
      remainingAmount: remaining,
      paymentStatus: derivedStatus,
      notes: form.notes.trim(),
    };

    onSave(purchaseTxn, {
      supplierId: form.supplierId,
      totalAmount,
      amountPaid: paid,
      remaining,
    });
  };

  const activeSuppliers = suppliers.filter((s) => s.status === "Active");

  return (
    <form onSubmit={handleSubmit} className="modal-form" noValidate>
      {/* Supplier Select */}
      <div className="form-group">
        <label className="form-label" htmlFor="rp-supplier">
          Supplier *
        </label>
        <select
          id="rp-supplier"
          className="form-input"
          value={form.supplierId}
          onChange={(e) => handleChange("supplierId", e.target.value)}
          style={errors.supplierId ? { borderColor: "var(--danger)" } : {}}
        >
          <option value="">-- Select Supplier --</option>
          {activeSuppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} (Balance: {currency} {(Number(s.currentBalance) || 0).toLocaleString()})
            </option>
          ))}
        </select>
        {errors.supplierId && (
          <span style={{ color: "var(--danger)", fontSize: "12px", marginTop: "4px", display: "block" }}>
            {errors.supplierId}
          </span>
        )}
      </div>

      {/* Date & Item */}
      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label" htmlFor="rp-date">
            Purchase Date
          </label>
          <input
            id="rp-date"
            type="date"
            className="form-input"
            value={form.date}
            onChange={(e) => handleChange("date", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="rp-item">
            Product / Item *
          </label>
          <input
            id="rp-item"
            type="text"
            className="form-input"
            placeholder="e.g. Premium Lawn Fabric"
            value={form.item}
            onChange={(e) => handleChange("item", e.target.value)}
            style={errors.item ? { borderColor: "var(--danger)" } : {}}
          />
          {errors.item && (
            <span style={{ color: "var(--danger)", fontSize: "12px", marginTop: "4px", display: "block" }}>
              {errors.item}
            </span>
          )}
        </div>
      </div>

      {/* Quantity & Price */}
      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label" htmlFor="rp-qty">
            Quantity *
          </label>
          <input
            id="rp-qty"
            type="number"
            min="0.01"
            step="any"
            className="form-input"
            placeholder="e.g. 50"
            value={form.quantity}
            onChange={(e) => handleChange("quantity", e.target.value)}
            style={errors.quantity ? { borderColor: "var(--danger)" } : {}}
          />
          {errors.quantity && (
            <span style={{ color: "var(--danger)", fontSize: "12px", marginTop: "4px", display: "block" }}>
              {errors.quantity}
            </span>
          )}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="rp-price">
            Purchase Price ({currency}) *
          </label>
          <input
            id="rp-price"
            type="number"
            min="0.01"
            step="any"
            className="form-input"
            placeholder="e.g. 500"
            value={form.purchasePrice}
            onChange={(e) => handleChange("purchasePrice", e.target.value)}
            style={errors.purchasePrice ? { borderColor: "var(--danger)" } : {}}
          />
          {errors.purchasePrice && (
            <span style={{ color: "var(--danger)", fontSize: "12px", marginTop: "4px", display: "block" }}>
              {errors.purchasePrice}
            </span>
          )}
        </div>
      </div>

      {/* Auto-calculated totals strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "12px",
          background: "#f8fafc",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          padding: "14px 16px",
          marginBottom: "14px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "500" }}>Total Amount</div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-main)" }}>
            {currency} {totalAmount.toLocaleString()}
          </div>
          <div style={{ fontSize: "10px", color: "var(--text-light)" }}>Qty × Price</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "500" }}>Amount Paid</div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--success)" }}>
            {currency} {paid.toLocaleString()}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "500" }}>Remaining</div>
          <div style={{ fontSize: "16px", fontWeight: "700", color: remaining > 0 ? "var(--danger)" : "var(--success)" }}>
            {currency} {remaining.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Amount Paid & Payment Status */}
      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label" htmlFor="rp-paid">
            Amount Paid ({currency})
          </label>
          <input
            id="rp-paid"
            type="number"
            min="0"
            step="any"
            className="form-input"
            placeholder="0"
            value={form.amountPaid}
            onChange={(e) => handleChange("amountPaid", e.target.value)}
            style={errors.amountPaid ? { borderColor: "var(--danger)" } : {}}
          />
          {errors.amountPaid && (
            <span style={{ color: "var(--danger)", fontSize: "12px", marginTop: "4px", display: "block" }}>
              {errors.amountPaid}
            </span>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Payment Status (Auto)</label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: "38px",
              padding: "0 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              background: "var(--border-light)",
              fontWeight: "600",
              fontSize: "13px",
              color:
                derivedStatus === "Paid"
                  ? "var(--success)"
                  : derivedStatus === "Partially Paid"
                  ? "var(--warning)"
                  : "var(--danger)",
            }}
          >
            {derivedStatus}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="form-group">
        <label className="form-label" htmlFor="rp-notes">
          Notes
        </label>
        <input
          id="rp-notes"
          type="text"
          className="form-input"
          placeholder="Additional notes about this purchase order..."
          value={form.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
        />
      </div>

      <div className="modal-actions-right">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          Record Purchase
        </Button>
      </div>
    </form>
  );
}

export default function RecordPurchaseModal({
  isOpen,
  onClose,
  onSave,
  suppliers = [],
  defaultSupplierId = null,
  currency = "Rs.",
}) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record New Purchase"
      maxWidth="600px"
    >
      <PurchaseForm
        key={isOpen ? "rp-open" : "rp-closed"}
        suppliers={suppliers}
        defaultSupplierId={defaultSupplierId}
        onClose={onClose}
        onSave={onSave}
        currency={currency}
      />
    </Modal>
  );
}
