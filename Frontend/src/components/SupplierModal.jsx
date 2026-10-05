import { useState } from "react";
import { toast } from "sonner";
import Modal from "./Modal";
import Button from "./Button";

function SupplierForm({
  supplier,
  isEdit,
  onClose,
  onSave,
  currency,
}) {
  const [formData, setFormData] = useState({
    name: supplier?.name || "",
    phone: supplier?.phone || "",
    email: supplier?.email || "",
    address: supplier?.address || "",
    openingBalance:
      supplier?.openingBalance !== undefined
        ? String(supplier.openingBalance)
        : "0",
    notes: supplier?.notes || "",
    status: supplier?.status || "Active",
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    // 1. Supplier name required
    if (!formData.name.trim()) {
      newErrors.name = "Supplier name is required.";
    }

    // 2. Phone required
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required.";
    }

    // 3. Valid email format (if provided)
    const emailVal = formData.email.trim();
    if (emailVal) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailVal)) {
        newErrors.email = "Please enter a valid email format (e.g. name@domain.com).";
      }
    }

    // 4. Opening balance must be a valid number
    const openBalVal = formData.openingBalance.trim();
    if (openBalVal === "" || isNaN(Number(openBalVal)) || Number(openBalVal) < 0) {
      newErrors.openingBalance = "Opening balance must be a valid number (0 or greater).";
    }

    setErrors(newErrors);

    const firstError = Object.values(newErrors)[0];
    if (firstError) {
      toast.error(firstError);
      return false;
    }

    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const cleanData = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      address: formData.address.trim(),
      openingBalance: Number(formData.openingBalance) || 0,
      notes: formData.notes.trim(),
      status: formData.status || "Active",
    };

    onSave(cleanData);
  };

  return (
    <form onSubmit={handleSubmit} className="modal-form" noValidate>
      {/* Supplier Name */}
      <div className="form-group">
        <label className="form-label" htmlFor="supplier-name">
          Supplier Name *
        </label>
        <input
          id="supplier-name"
          type="text"
          className="form-input"
          placeholder="e.g. Kohinoor Textile Mills"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          style={errors.name ? { borderColor: "var(--danger)" } : {}}
          required
        />
        {errors.name && (
          <span
            style={{
              color: "var(--danger)",
              fontSize: "12px",
              marginTop: "4px",
              display: "block",
              fontWeight: "500",
            }}
          >
            {errors.name}
          </span>
        )}
      </div>

      {/* Phone & Email Row */}
      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label" htmlFor="supplier-phone">
            Phone Number *
          </label>
          <input
            id="supplier-phone"
            type="text"
            className="form-input"
            placeholder="e.g. 0300-1234567"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            style={errors.phone ? { borderColor: "var(--danger)" } : {}}
            required
          />
          {errors.phone && (
            <span
              style={{
                color: "var(--danger)",
                fontSize: "12px",
                marginTop: "4px",
                display: "block",
                fontWeight: "500",
              }}
            >
              {errors.phone}
            </span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="supplier-email">
            Email Address
          </label>
          <input
            id="supplier-email"
            type="email"
            className="form-input"
            placeholder="e.g. sales@textiles.com"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            style={errors.email ? { borderColor: "var(--danger)" } : {}}
          />
          {errors.email && (
            <span
              style={{
                color: "var(--danger)",
                fontSize: "12px",
                marginTop: "4px",
                display: "block",
                fontWeight: "500",
              }}
            >
              {errors.email}
            </span>
          )}
        </div>
      </div>

      {/* Address */}
      <div className="form-group">
        <label className="form-label" htmlFor="supplier-address">
          Address / Market Location
        </label>
        <input
          id="supplier-address"
          type="text"
          className="form-input"
          placeholder="e.g. Shop #12, Wholesale Cloth Market, Faisalabad"
          value={formData.address}
          onChange={(e) => handleChange("address", e.target.value)}
        />
      </div>

      {/* Opening Balance & Status Row */}
      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label" htmlFor="supplier-opening">
            Opening Balance ({currency})
          </label>
          <input
            id="supplier-opening"
            type="number"
            min="0"
            step="any"
            className="form-input"
            placeholder="0"
            value={formData.openingBalance}
            onChange={(e) => handleChange("openingBalance", e.target.value)}
            style={errors.openingBalance ? { borderColor: "var(--danger)" } : {}}
          />
          {errors.openingBalance && (
            <span
              style={{
                color: "var(--danger)",
                fontSize: "12px",
                marginTop: "4px",
                display: "block",
                fontWeight: "500",
              }}
            >
              {errors.openingBalance}
            </span>
          )}
        </div>

        {isEdit ? (
          <div className="form-group">
            <label className="form-label" htmlFor="supplier-status">
              Account Status
            </label>
            <select
              id="supplier-status"
              className="form-input"
              value={formData.status}
              onChange={(e) => handleChange("status", e.target.value)}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label" htmlFor="supplier-status-info">
              Initial Status
            </label>
            <input
              id="supplier-status-info"
              type="text"
              className="form-input"
              value="Active"
              disabled
              style={{ background: "var(--border-light)", color: "var(--text-muted)" }}
            />
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="form-group">
        <label className="form-label" htmlFor="supplier-notes">
          Notes / Terms
        </label>
        <textarea
          id="supplier-notes"
          className="form-input"
          rows="3"
          placeholder="Payment terms, credit cycle, fabric specialty, contact person, etc."
          value={formData.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          style={{ resize: "vertical", minHeight: "70px" }}
        />
      </div>

      {/* Modal Actions */}
      <div className="modal-actions-right">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {isEdit ? "Update Supplier" : "Save Supplier"}
        </Button>
      </div>
    </form>
  );
}

export default function SupplierModal({
  isOpen,
  onClose,
  onSave,
  supplier = null,
  currency = "Rs.",
}) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={supplier ? `Edit Supplier: ${supplier?.name}` : "Add New Supplier"}
    >
      <SupplierForm
        key={supplier?.id || "new-supplier-form"}
        supplier={supplier}
        isEdit={Boolean(supplier)}
        onClose={onClose}
        onSave={onSave}
        currency={currency}
      />
    </Modal>
  );
}
