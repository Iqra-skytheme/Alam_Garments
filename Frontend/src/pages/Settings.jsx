import { useState } from "react";
import { toast } from "sonner";
import Button from "../components/Button";
import { updateOwnerPassword } from "../services/authService";
import { getOwnerInitials, PRESET_PALETTES } from "../utils/avatarUtils";
import { getEmailConfig, saveEmailConfig, sendTransactionEmail } from "../services/emailService";

export default function Settings({
  shopInfo,
  onUpdateShopInfo,
}) {
  const [formData, setFormData] = useState({
    name: shopInfo?.name || "",
    owner: shopInfo?.owner || "",
    avatar: shopInfo?.avatar || PRESET_PALETTES[0].bg,
    bio: shopInfo?.bio || "",
    location: shopInfo?.location || "",
    countryCode: shopInfo?.countryCode || "+92",
    phone: shopInfo?.phone || "",
    email: shopInfo?.email || "",
    category: shopInfo?.category || "General Store & Kiryana",
    currency: shopInfo?.currency || "Rs.",
    taxNumber: shopInfo?.taxNumber || "",
    reminderDays: shopInfo?.reminderDays || "15",
    creditLimit: shopInfo?.creditLimit || 50000,
    whatsappReceipts: shopInfo?.whatsappReceipts ?? true,
    smsReminders: shopInfo?.smsReminders ?? true,
    autoBackup: shopInfo?.autoBackup ?? true,
    securityPin: shopInfo?.securityPin || "1234",
  });

  const [activeTab, setActiveTab] = useState("profile"); // 'profile' | 'store' | 'notifications' | 'security'
  const [selectedAvatarPreset, setSelectedAvatarPreset] = useState("");

  // EmailJS Configuration State
  const [emailConfig, setEmailConfig] = useState(() => getEmailConfig(shopInfo?.emailjs || {}));
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");

  // Security Credentials Update State
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [pinSuccessMsg, setPinSuccessMsg] = useState("");
  const [pinErrorMsg, setPinErrorMsg] = useState("");

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const isImageAvatar =
    formData.avatar &&
    (formData.avatar.startsWith("data:image") ||
      formData.avatar.startsWith("http"));

  const activePaletteColor =
    formData.avatar && formData.avatar.startsWith("#")
      ? formData.avatar
      : PRESET_PALETTES[0].bg;

  const currentInitials = getOwnerInitials(formData.owner);

  // Strictly enforce alphabets and spaces only for owner name & auto-apply initial palette
  const handleOwnerChange = (e) => {
    const rawVal = e.target.value;
    const alphabetsOnly = rawVal.replace(/[^a-zA-Z\s]/g, "");
    
    setFormData((prev) => {
      const isImg = prev.avatar && (prev.avatar.startsWith("data:image") || prev.avatar.startsWith("http"));
      const fallbackColor = prev.avatar && prev.avatar.startsWith("#") ? prev.avatar : PRESET_PALETTES[0].bg;
      return {
        ...prev,
        owner: alphabetsOnly,
        // If owner didn't add any photo, automatically set initial palette color on its own:
        avatar: isImg ? prev.avatar : fallbackColor,
      };
    });

    if (rawVal !== alphabetsOnly) {
      toast.warning("Numbers Not Allowed", {
        description: "Owner name can only contain alphabetic letters and spaces.",
      });
    }
  };

  // Handle local image file upload
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File Too Large", {
          description: "Please choose an image smaller than 2MB.",
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const resultUrl = uploadEvent.target?.result;
        if (typeof resultUrl === "string") {
          handleChange("avatar", resultUrl);
          setSelectedAvatarPreset("");
          toast.success("Profile photo uploaded!", {
            description: "Click Save Settings to apply your new avatar.",
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectPreset = (preset) => {
    setSelectedAvatarPreset(preset.id);
    handleChange("avatar", preset.bg); // stores background color as custom styled avatar
    toast.info("Initial Palette Selected", {
      description: `Selected ${preset.label} palette with initials "${currentInitials}". Click Save Settings to apply.`,
    });
  };

  const handleRemovePhoto = () => {
    const defaultColor = activePaletteColor || PRESET_PALETTES[0].bg;
    handleChange("avatar", defaultColor);
    setSelectedAvatarPreset(PRESET_PALETTES[0].id);
    toast.info("Profile photo cleared", {
      description: `Defaulting to initial name palette with initials "${currentInitials}".`,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanOwner = formData.owner.trim();
    if (!cleanOwner || !formData.name.trim()) {
      toast.error("Missing Required Fields", {
        description: "Owner Name and Shop Name are required.",
      });
      return;
    }

    if (!/^[a-zA-Z\s]+$/.test(cleanOwner)) {
      toast.error("Invalid Owner Name", {
        description: "Owner name can only contain alphabetic letters and spaces (no numbers allowed).",
      });
      return;
    }

    // If owner didn't add any photo, save with their initial palette color
    const finalAvatar = isImageAvatar ? formData.avatar : activePaletteColor;

    onUpdateShopInfo({
      ...formData,
      owner: cleanOwner,
      avatar: finalAvatar,
    });
  };

  const handleReset = () => {
    if (confirm("Reset all unsaved changes back to current profile values?")) {
      setFormData({
        name: shopInfo?.name || "",
        owner: shopInfo?.owner || "",
        avatar: shopInfo?.avatar || "",
        bio: shopInfo?.bio || "",
        location: shopInfo?.location || "",
        countryCode: shopInfo?.countryCode || "+92",
        phone: shopInfo?.phone || "",
        email: shopInfo?.email || "",
        category: shopInfo?.category || "General Store & Kiryana",
        currency: shopInfo?.currency || "Rs.",
        taxNumber: shopInfo?.taxNumber || "",
        reminderDays: shopInfo?.reminderDays || "15",
        creditLimit: shopInfo?.creditLimit || 50000,
        whatsappReceipts: shopInfo?.whatsappReceipts ?? true,
        smsReminders: shopInfo?.smsReminders ?? true,
        autoBackup: shopInfo?.autoBackup ?? true,
        securityPin: shopInfo?.securityPin || "1234",
      });
      setSelectedAvatarPreset("");
      toast.warning("Settings Reverted", {
        description: "Restored previous profile values.",
      });
    }
  };

  return (
    <div className="page-settings">
      <div className="settings-layout-grid">
        {/* Left Column: Form Settings Tabs */}
        <div className="settings-main-card">
          {/* Navigation Tabs */}
          <div className="settings-tab-nav">
            <button
              type="button"
              className={`settings-tab-btn ${activeTab === "profile" ? "active" : ""}`}
              onClick={() => setActiveTab("profile")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Profile & Identity</span>
            </button>
            <button
              type="button"
              className={`settings-tab-btn ${activeTab === "store" ? "active" : ""}`}
              onClick={() => setActiveTab("store")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              <span>Shop & Business</span>
            </button>
            <button
              type="button"
              className={`settings-tab-btn ${activeTab === "notifications" ? "active" : ""}`}
              onClick={() => setActiveTab("notifications")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <span>Khata Rules & Alerts</span>
            </button>
            <button
              type="button"
              className={`settings-tab-btn ${activeTab === "security" ? "active" : ""}`}
              onClick={() => setActiveTab("security")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <span>Security & PIN</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="settings-form">
            {/* TAB 1: Profile & Identity */}
            {activeTab === "profile" && (
              <div className="settings-section-content">
                {/* Profile Picture / Avatar Editor */}
                <div className="settings-avatar-editor">
                  <div
                    className="avatar-preview-box"
                    style={{ backgroundColor: activePaletteColor }}
                  >
                    {isImageAvatar ? (
                      <img
                        src={formData.avatar}
                        alt="Profile Preview"
                        className="avatar-preview-img"
                      />
                    ) : (
                      <div
                        className="avatar-preview-fallback"
                        style={{ backgroundColor: activePaletteColor }}
                      >
                        {currentInitials}
                      </div>
                    )}
                  </div>

                  <div className="avatar-upload-controls">
                    <h4 className="avatar-ctrl-title">Profile Picture</h4>

                    <div className="avatar-btn-row">
                      <label className="btn btn-outline btn-sm avatar-upload-label">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <span>Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          style={{ display: "none" }}
                        />
                      </label>

                      {isImageAvatar && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemovePhoto}
                        >
                          Remove Photo
                        </Button>
                      )}
                    </div>

                    {/* Preset Initial Palettes */}
                    <div className="preset-avatars-list">
                      <span className="preset-label">Or choose initial palette:</span>
                      <div className="preset-chips">
                        {PRESET_PALETTES.map((preset) => {
                          const isSelected = activePaletteColor === preset.bg && !isImageAvatar;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              className={`preset-chip preset-color-chip ${isSelected ? "active" : ""}`}
                              style={{ backgroundColor: preset.bg, color: "#ffffff" }}
                              onClick={() => handleSelectPreset(preset)}
                              title={`${preset.label} (${currentInitials})`}
                            >
                              <span>{currentInitials}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-divider"></div>

                {/* Personal Information */}
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="setting-owner">
                      Owner Full Name (Letters Only) *
                    </label>
                    <input
                      id="setting-owner"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Muhammad Ali"
                      value={formData.owner}
                      onChange={handleOwnerChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="setting-phone">
                      Phone Number
                    </label>
                    <input
                      id="setting-phone"
                      type="tel"
                      className="form-input"
                      placeholder="e.g. 0300-1234567"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="setting-email">
                    Email Address
                  </label>
                  <input
                    id="setting-email"
                    type="email"
                    className="form-input"
                    placeholder="e.g. store.owner@gmail.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                </div>

                {/* Bio */}
                <div className="form-group">
                  <label className="form-label" htmlFor="setting-bio">
                    Bio
                  </label>
                  <textarea
                    id="setting-bio"
                    className="form-input form-textarea"
                    rows="3"
                    maxLength={180}
                    placeholder="Write a brief description or store introduction..."
                    value={formData.bio}
                    onChange={(e) => handleChange("bio", e.target.value)}
                  ></textarea>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                    <span className="char-count" style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "500" }}>
                      {formData.bio.length} / 180 characters
                    </span>
                  </div>
                </div>

                {/* Location */}
                <div className="form-group">
                  <label className="form-label" htmlFor="setting-location">
                    Location *
                  </label>
                  <div className="input-with-icon">
                    <span className="input-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                    </span>
                    <input
                      id="setting-location"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Shop #14, Main Market, Gulberg, Lahore"
                      value={formData.location}
                      onChange={(e) => handleChange("location", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Shop & Business */}
            {activeTab === "store" && (
              <div className="settings-section-content">
                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="setting-name">
                      Shop / Business Name *
                    </label>
                    <input
                      id="setting-name"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Bismillah General Store"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="setting-category">
                      Business Category
                    </label>
                    <select
                      id="setting-category"
                      className="form-input"
                      value={formData.category}
                      onChange={(e) => handleChange("category", e.target.value)}
                    >
                      <option value="General Store & Kiryana">General Store & Kiryana</option>
                      <option value="Medical Store & Pharmacy">Medical Store & Pharmacy</option>
                      <option value="Mobile & Electronics">Mobile & Electronics</option>
                      <option value="Meat, Fish & Poultry">Meat, Fish & Poultry</option>
                      <option value="Wholesale Grain & Pulses">Wholesale Grain & Pulses</option>
                      <option value="Garments & Clothing">Garments & Clothing</option>
                      <option value="Hardware & Sanitary">Hardware & Sanitary</option>
                      <option value="Restaurant & Cafe">Restaurant & Cafe</option>
                      <option value="General Trading">General Trading & Retail</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="setting-currency">
                      Primary Currency
                    </label>
                    <select
                      id="setting-currency"
                      className="form-input"
                      value={formData.currency}
                      onChange={(e) => handleChange("currency", e.target.value)}
                    >
                      <option value="Rs.">Rs. (Pakistani / Indian Rupee)</option>
                      <option value="$">$ (US Dollar - USD)</option>
                      <option value="€">€ (Euro - EUR)</option>
                      <option value="AED">AED (UAE Dirham)</option>
                      <option value="SAR">SAR (Saudi Riyal)</option>
                      <option value="£">£ (British Pound - GBP)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="setting-tax">
                      Tax / NTN Registration (Optional)
                    </label>
                    <input
                      id="setting-tax"
                      type="text"
                      className="form-input"
                      placeholder="e.g. NTN-8492019-PK"
                      value={formData.taxNumber}
                      onChange={(e) => handleChange("taxNumber", e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="setting-reminders">
                      Credit Payment Due Cycle
                    </label>
                    <select
                      id="setting-reminders"
                      className="form-input"
                      value={formData.reminderDays}
                      onChange={(e) => handleChange("reminderDays", e.target.value)}
                    >
                      <option value="7">Every 7 Days (Weekly)</option>
                      <option value="15">Every 15 Days (Fortnightly)</option>
                      <option value="30">Every 30 Days (Monthly)</option>
                      <option value="45">Every 45 Days</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="setting-limit">
                      Default Customer Credit Ceiling ({formData.currency})
                    </label>
                    <input
                      id="setting-limit"
                      type="number"
                      className="form-input"
                      min="1000"
                      step="1000"
                      value={formData.creditLimit}
                      onChange={(e) => handleChange("creditLimit", Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Khata Rules & Notifications */}
            {activeTab === "notifications" && (
              <div className="settings-section-content">
                <div className="toggle-list">
                  <div className="toggle-row">
                    <div className="toggle-info">
                      <h4 className="toggle-title">WhatsApp Instant Receipts</h4>
                      <p className="toggle-desc">
                        Provide quick 1-click WhatsApp transaction confirmation slips to customers.
                      </p>
                    </div>
                    <label className="switch-toggle">
                      <input
                        type="checkbox"
                        checked={formData.whatsappReceipts}
                        onChange={(e) =>
                          handleChange("whatsappReceipts", e.target.checked)
                        }
                      />
                      <span className="switch-slider"></span>
                    </label>
                  </div>

                  <div className="toggle-row">
                    <div className="toggle-info">
                      <h4 className="toggle-title">SMS Overdue Reminders</h4>
                      <p className="toggle-desc">
                        Enable alert prompts when customer balances exceed the payment cycle limit.
                      </p>
                    </div>
                    <label className="switch-toggle">
                      <input
                        type="checkbox"
                        checked={formData.smsReminders}
                        onChange={(e) =>
                          handleChange("smsReminders", e.target.checked)
                        }
                      />
                      <span className="switch-slider"></span>
                    </label>
                  </div>

                  <div className="toggle-row">
                    <div className="toggle-info">
                      <h4 className="toggle-title">Automatic Cloud Sync & Backup</h4>
                      <p className="toggle-desc">
                        Keep your store ledger synced with cloud storage for emergency recovery.
                      </p>
                    </div>
                    <label className="switch-toggle">
                      <input
                        type="checkbox"
                        checked={formData.autoBackup}
                        onChange={(e) =>
                          handleChange("autoBackup", e.target.checked)
                        }
                      />
                      <span className="switch-slider"></span>
                    </label>
                  </div>
                </div>

                {/* Email Notification Configuration (Alam Garments) */}
                <div style={{ marginTop: "32px", borderTop: "1px solid var(--border-color)", paddingTop: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                    <div>
                      <h4 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-main)", margin: "0 0 4px 0" }}>
                        Automatic Transaction Email Notifications (EmailJS)
                      </h4>
                      <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
                        Emails are branded <strong>Alam Garments</strong> and sent to customer/supplier registered email addresses on every transaction.
                      </p>
                    </div>
                    <span style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "600",
                      background: emailConfig.serviceId && emailConfig.templateId && emailConfig.publicKey ? "#dcfce7" : "#fef3c7",
                      color: emailConfig.serviceId && emailConfig.templateId && emailConfig.publicKey ? "#16a34a" : "#d97706",
                    }}>
                      {emailConfig.serviceId && emailConfig.templateId && emailConfig.publicKey ? "Configured & Active" : "Setup Required (Free)"}
                    </span>
                  </div>

                  <div style={{
                    background: "var(--bg-main, #f8fafc)",
                    border: "1px solid var(--border-color, #e2e8f0)",
                    borderRadius: "10px",
                    padding: "18px",
                    marginBottom: "16px"
                  }}>
                    <div className="form-row-2">
                      <div className="form-group">
                        <label className="form-label" htmlFor="emailjs-service-id">
                          EmailJS Service ID
                        </label>
                        <input
                          id="emailjs-service-id"
                          type="text"
                          className="form-input"
                          placeholder="e.g. service_xxxxxxx"
                          value={emailConfig.serviceId}
                          onChange={(e) => setEmailConfig(prev => ({ ...prev, serviceId: e.target.value.trim() }))}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="emailjs-template-id">
                          EmailJS Template ID
                        </label>
                        <input
                          id="emailjs-template-id"
                          type="text"
                          className="form-input"
                          placeholder="e.g. template_xxxxxxx"
                          value={emailConfig.templateId}
                          onChange={(e) => setEmailConfig(prev => ({ ...prev, templateId: e.target.value.trim() }))}
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label className="form-label" htmlFor="emailjs-public-key">
                        EmailJS Public Key (User ID)
                      </label>
                      <input
                        id="emailjs-public-key"
                        type="text"
                        className="form-input"
                        placeholder="e.g. xxxxxxxxxxxxxxxxx"
                        value={emailConfig.publicKey}
                        onChange={(e) => setEmailConfig(prev => ({ ...prev, publicKey: e.target.value.trim() }))}
                      />
                    </div>

                    <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => {
                          saveEmailConfig(emailConfig);
                          onUpdateShopInfo({ ...(shopInfo || {}), emailjs: emailConfig });
                          toast.success("Email Settings Saved!", {
                            description: "EmailJS credentials saved to application storage and MongoDB.",
                          });
                        }}
                      >
                        Save Email Settings
                      </Button>

                      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginLeft: "auto" }}>
                        <input
                          type="email"
                          className="form-input"
                          placeholder="Send test to: name@gmail.com"
                          style={{ width: "240px", padding: "7px 12px", fontSize: "13px" }}
                          value={testEmailAddress}
                          onChange={(e) => setTestEmailAddress(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isTestingEmail}
                          onClick={async () => {
                            if (!testEmailAddress.trim()) {
                              toast.error("Please enter an email address to send a test notification.");
                              return;
                            }
                            setIsTestingEmail(true);
                            saveEmailConfig(emailConfig);
                            const res = await sendTransactionEmail({
                              toEmail: testEmailAddress,
                              toName: "Valued Partner",
                              recipientType: "Customer",
                              transactionType: "Udhaar",
                              amount: 4500,
                              date: new Date().toISOString().split("T")[0],
                              description: "Test Notification: Cotton Fabrics Suit",
                              previousBalance: 8000,
                              updatedBalance: 12500,
                              currency: formData.currency || "Rs.",
                              billNumber: "TEST-001",
                              shopInfo: {
                                name: formData.name || "Alam Garments",
                                phone: formData.phone || "0300-1234567",
                                email: formData.email || "alam.garments@gmail.com",
                                emailjs: emailConfig,
                              },
                            });
                            setIsTestingEmail(false);
                            if (res.success) {
                              toast.success("Test Email Sent Successfully!", {
                                description: `Sent to ${testEmailAddress} with Alam Garments branding.`,
                              });
                            } else {
                              toast.error("Test Email Failed", {
                                description: res.message,
                              });
                            }
                          }}
                        >
                          {isTestingEmail ? "Sending..." : "Send Test Email"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "8px 0 0 0" }}>
                    💡 <strong>Tip:</strong> EmailJS provides a 100% free tier (200 emails/month). Create a free account at <a href="https://www.emailjs.com" target="_blank" rel="noreferrer" style={{ color: "var(--primary-color)", textDecoration: "underline" }}>emailjs.com</a> and enter your keys above, or set them via <code>.env</code> file.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: Security & PIN */}
            {activeTab === "security" && (
              <div className="settings-section-content">

                {pinSuccessMsg && (
                  <div className="alert alert-success" style={{
                    padding: "10px 14px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    color: "#15803d",
                    borderRadius: "8px",
                    fontSize: "13px",
                    marginBottom: "16px"
                  }}>
                    {pinSuccessMsg}
                  </div>
                )}

                {pinErrorMsg && (
                  <div className="alert alert-danger" style={{
                    padding: "10px 14px",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#b91c1c",
                    borderRadius: "8px",
                    fontSize: "13px",
                    marginBottom: "16px"
                  }}>
                    {pinErrorMsg}
                  </div>
                )}

                <div style={{ maxWidth: "420px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h4 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-main)", margin: 0 }}>
                    Rotate Owner Security PIN / Password
                  </h4>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="current-pin">
                      Current Security PIN
                    </label>
                    <input
                      id="current-pin"
                      type="password"
                      maxLength={16}
                      className="form-input"
                      placeholder="Enter current PIN"
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="new-pin">
                      New Security PIN (min 4 characters)
                    </label>
                    <input
                      id="new-pin"
                      type="password"
                      maxLength={16}
                      className="form-input"
                      placeholder="e.g. 5678"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="confirm-pin">
                      Confirm New PIN
                    </label>
                    <input
                      id="confirm-pin"
                      type="password"
                      maxLength={16}
                      className="form-input"
                      placeholder="Confirm new PIN"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value)}
                    />
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    disabled={isUpdatingPin || !currentPin || !newPin || !confirmPin}
                    onClick={async () => {
                      setPinErrorMsg("");
                      setPinSuccessMsg("");
                      if (!currentPin) {
                        setPinErrorMsg("Please enter your current PIN.");
                        return;
                      }
                      if (!newPin || newPin.length < 4) {
                        setPinErrorMsg("New PIN must be at least 4 digits.");
                        return;
                      }
                      if (newPin !== confirmPin) {
                        setPinErrorMsg("New PIN and Confirm PIN do not match.");
                        return;
                      }

                      setIsUpdatingPin(true);
                      try {
                        const res = await updateOwnerPassword(currentPin, newPin);
                        if (!res.success) {
                          setPinErrorMsg(res.message);
                          toast.error("PIN Update Failed", { description: res.message });
                        } else {
                          setPinSuccessMsg(res.message);
                          toast.success("Security PIN Updated!", {
                            description: "New cryptographic salt generated and password re-hashed successfully.",
                          });
                          setCurrentPin("");
                          setNewPin("");
                          setConfirmPin("");
                          onUpdateShopInfo({
                            ...formData,
                            securityPin: newPin,
                          });
                        }
                      } catch {
                        setPinErrorMsg("An unexpected error occurred.");
                      } finally {
                        setIsUpdatingPin(false);
                      }
                    }}
                  >
                    {isUpdatingPin ? "Hashing & Rotating Salt..." : "Update PIN & Rotate Salt"}
                  </Button>
                </div>
              </div>
            )}

            {/* Actions Bar */}
            <div className="settings-form-actions">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={handleReset}
              >
                Reset Changes
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                    <polyline points="7 3 7 8 15 8"></polyline>
                  </svg>
                }
              >
                Save Settings
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
