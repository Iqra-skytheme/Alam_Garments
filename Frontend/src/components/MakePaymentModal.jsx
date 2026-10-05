import { useState } from "react";
import { toast } from "sonner";
import Modal from "./Modal";
import Button from "./Button";

function PaymentForm({ suppliers, defaultSupplierId, onClose, onSave, currency }) {
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    supplierId: defaultSupplierId || (suppliers[0]?.id ?? ""),
    date: today,
    amount: "",
    paymentMethod: "Cash",
    reference: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});

  const selectedSupplier = suppliers.find((s) => s.id === form.supplierId);
  const outstandingBalance = Number(selectedSupplier?.currentBalance) || 0;
  const paymentAmt = parseFloat(form.amount) || 0;
  const remainingAfter = outstandingBalance - paymentAmt;

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.supplierId) errs.supplierId = "Please select a supplier.";
    if (!form.amount || paymentAmt <= 0) errs.amount = "Payment amount must be greater than zero.";
    if (paymentAmt > outstandingBalance && outstandingBalance > 0) {
      errs.amount = `Payment (${currency} ${paymentAmt.toLocaleString()}) cannot exceed outstanding balance (${currency} ${outstandingBalance.toLocaleString()}).`;
    }
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
    const refNum = form.reference.trim() || `PMT-${form.supplierId.toUpperCase()}-${Date.now().toString().slice(-5)}`;

    const paymentTxn = {
      id: `st-${Date.now()}`,
      supplierId: form.supplierId,
      supplierName: supplier?.name || "Unknown Supplier",
      type: "Payment",
      date: form.date,
      reference: refNum,
      description: `Payment via ${form.paymentMethod}`,
      debit: 0,
      credit: paymentAmt,
      paymentMethod: form.paymentMethod,
      item: null,
      quantity: null,
      purchasePrice: null,
      totalAmount: null,
      amountPaid: paymentAmt,
      remainingAmount: null,
      paymentStatus: null,
      notes: form.notes.trim(),
    };

    onSave(paymentTxn, {
      supplierId: form.supplierId,
      amountPaid: paymentAmt,
    });
  };

  const activeSuppliers = suppliers.filter((s) => s.status === "Active");

  return (
    <form onSubmit={handleSubmit} className="modal-form" noValidate>
      {/* Supplier Select */}
      <div className="form-group">
        <label className="form-label" htmlFor="mp-supplier">
          Supplier *
        </label>
        <select
          id="mp-supplier"
          className="form-input"
          value={form.supplierId}
          onChange={(e) => handleChange("supplierId", e.target.value)}
          style={errors.supplierId ? { borderColor: "var(--danger)" } : {}}
        >
          <option value="">-- Select Supplier --</option>
          {activeSuppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {errors.supplierId && (
          <span style={{ color: "var(--danger)", fontSize: "12px", marginTop: "4px", display: "block" }}>
            {errors.supplierId}
          </span>
        )}
      </div>

      {/* Balance preview strip */}
      {form.supplierId && (
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
            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "500" }}>Outstanding Balance</div>
            <div style={{ fontSize: "16px", fontWeight: "700", color: outstandingBalance > 0 ? "var(--danger)" : "var(--success)" }}>
              {currency} {outstandingBalance.toLocaleString()}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "500" }}>Payment Amount</div>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--primary)" }}>
              {currency} {paymentAmt > 0 ? paymentAmt.toLocaleString() : "0"}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "500" }}>Remaining After</div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: remainingAfter > 0 ? "var(--warning)" : "var(--success)",
              }}
            >
              {currency} {Math.max(0, remainingAfter).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Date & Amount */}
      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label" htmlFor="mp-date">
            Payment Date
          </label>
          <input
            id="mp-date"
            type="date"
            className="form-input"
            value={form.date}
            onChange={(e) => handleChange("date", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="mp-amount">
            Amount ({currency}) *
          </label>
          <input
            id="mp-amount"
            type="number"
            min="0.01"
            step="any"
            className="form-input"
            placeholder="e.g. 10000"
            value={form.amount}
            onChange={(e) => handleChange("amount", e.target.value)}
            style={errors.amount ? { borderColor: "var(--danger)" } : {}}
          />
          {errors.amount && (
            <span style={{ color: "var(--danger)", fontSize: "12px", marginTop: "4px", display: "block" }}>
              {errors.amount}
            </span>
          )}
        </div>
      </div>

      {/* Payment Method & Reference */}
      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label" htmlFor="mp-method">
            Payment Method
          </label>
          <select
            id="mp-method"
            className="form-input"
            value={form.paymentMethod}
            onChange={(e) => handleChange("paymentMethod", e.target.value)}
          >
            <option value="Cash">Cash</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="EasyPaisa">EasyPaisa</option>
            <option value="JazzCash">JazzCash</option>
            <option value="Cheque">Cheque</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="mp-ref">
            Reference Number
          </label>
          <input
            id="mp-ref"
            type="text"
            className="form-input"
            placeholder="e.g. PMT-12345 (auto if empty)"
            value={form.reference}
            onChange={(e) => handleChange("reference", e.target.value)}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="form-group">
        <label className="form-label" htmlFor="mp-notes">
          Notes
        </label>
        <input
          id="mp-notes"
          type="text"
          className="form-input"
          placeholder="e.g. Against PO-S1-101, advance payment..."
          value={form.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
        />
      </div>

      <div className="modal-actions-right">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="success">
          Record Payment
        </Button>
      </div>
    </form>
  );
}

export default function MakePaymentModal({
  isOpen,
  onClose,
  onSave,
  suppliers = [],
  supplierTransactions = [],
  defaultSupplierId = null,
  currency = "Rs.",
}) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Make Supplier Payment"
      maxWidth="560px"
    >
      <PaymentForm
        key={isOpen ? "mp-open" : "mp-closed"}
        suppliers={suppliers}
        defaultSupplierId={defaultSupplierId}
        supplierTransactions={supplierTransactions}
        onClose={onClose}
        onSave={onSave}
        currency={currency}
      />
    </Modal>
  );
}
