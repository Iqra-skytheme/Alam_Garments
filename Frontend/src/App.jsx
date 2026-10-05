import { useState, useEffect } from "react";
import { Toaster, toast } from "sonner";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerDetails from "./pages/CustomerDetails";
import Suppliers from "./pages/Suppliers";
import SupplierDetails from "./pages/SupplierDetails";
import Transactions from "./pages/Transactions";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import Modal from "./components/Modal";
import { COUNTRY_CODES } from "./constants/countryCodes";
import Button from "./components/Button";
import { getActiveSession, clearSession } from "./services/authService";
import { api } from "./services/api";
import { generateUniqueReceiptNumber, isReceiptNumberUnique } from "./utils/receiptUtils";
import { exportTransactionReceiptPDF } from "./services/exportService";
import { sendTransactionEmail } from "./services/emailService";

const DEFAULT_SHOP_INFO = {
  name: "Alam Garments",
  owner: "Muhammad Ali",
  countryCode: "+92",
  phone: "0300-1234567",
  email: "",
  currency: "Rs.",
  category: "Garments & Clothing",
  avatar: "",
  bio: "",
  location: "",
  taxNumber: "",
  reminderDays: "15",
  creditLimit: 50000,
  whatsappReceipts: true,
  smsReminders: true,
  autoBackup: true,
};

const today = () => new Date().toISOString().split("T")[0];

export default function App() {
  const session = getActiveSession();
  const [isAuthenticated, setIsAuthenticated] = useState(!!session?.token);
  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const saved = localStorage.getItem("hisabkitab_currentPage");
      return saved && saved !== "login" ? saved : "dashboard";
    } catch { return "dashboard"; }
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState(() => localStorage.getItem("hisabkitab_selectedCustomerId") || null);
  const [selectedSupplierId, setSelectedSupplierId] = useState(() => localStorage.getItem("hisabkitab_selectedSupplierId") || null);
  const [shopInfo, setShopInfo] = useState({ ...DEFAULT_SHOP_INFO, ...(session?.shopInfo || {}) });
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierTransactions, setSupplierTransactions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(!!session?.token);

  const [txnModalOpen, setTxnModalOpen] = useState(false);
  const [txnForm, setTxnForm] = useState({
    customerId: "", type: "Udhaar", amount: "", description: "", paymentMethod: "Khata Credit", billNumber: "", date: today(),
  });
  const [custModalOpen, setCustModalOpen] = useState(false);
  const [custForm, setCustForm] = useState({ name: "", countryCode: "+92", phone: "", email: "", address: "", openingBalance: "" });
  const [activeTxnFilter, setActiveTxnFilter] = useState("all");
  const [activeCustFilter, setActiveCustFilter] = useState("all");

  const loadBootstrap = async () => {
    setIsLoadingData(true);
    try {
      const data = await api.bootstrap();
      setCustomers(data.customers || []);
      setSuppliers(data.suppliers || []);
      setTransactions(data.transactions || []);
      setSupplierTransactions(data.supplierTransactions || []);
      if (data.shopInfo) setShopInfo((prev) => ({ ...prev, ...data.shopInfo }));
    } catch (error) {
      if (error.status === 401) {
        clearSession();
        setIsAuthenticated(false);
        setCurrentPage("login");
        toast.error("Session expired", { description: "Please log in again." });
      } else {
        toast.error("Backend connection failed", { description: error.message || "Make sure MongoDB and the backend are running." });
      }
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) loadBootstrap();
  }, [isAuthenticated]);

  const handleUpdateShopInfo = async (updatedInfo) => {
    try {
      const result = await api.updateSettings(updatedInfo);
      setShopInfo((prev) => ({ ...prev, ...result }));
      toast.success("Profile & Store Settings Saved!", { description: "Store settings were saved to MongoDB." });
    } catch (error) {
      toast.error("Could not save settings", { description: error.message });
    }
  };

  const handleAddSupplier = async (newSupplierData) => {
    try {
      const supplier = await api.createSupplier(newSupplierData);
      setSuppliers((prev) => [supplier, ...prev]);
      const data = await api.bootstrap();
      setSuppliers(data.suppliers || []);
      setSupplierTransactions(data.supplierTransactions || []);
      toast.success(`Supplier Added: ${supplier.name}`, { description: `Account created with ${shopInfo.currency} ${(Number(supplier.openingBalance) || 0).toLocaleString()} initial balance.` });
    } catch (error) { toast.error("Could not add supplier", { description: error.message }); }
  };

  const handleUpdateSupplier = async (supplierId, updatedData) => {
    try {
      const supplier = await api.updateSupplier(supplierId, updatedData);
      setSuppliers((prev) => prev.map((s) => s.id === supplierId ? supplier : s));
      const data = await api.bootstrap();
      setSuppliers(data.suppliers || []);
      setSupplierTransactions(data.supplierTransactions || []);
      toast.success("Supplier Updated", { description: `${supplier.name} records saved successfully.` });
    } catch (error) { toast.error("Could not update supplier", { description: error.message }); }
  };

  const handleDeleteSupplier = async (supplierId) => {
    const target = suppliers.find((s) => s.id === supplierId);
    try {
      await api.deleteSupplier(supplierId);
      setSuppliers((prev) => prev.filter((s) => s.id !== supplierId));
      setSupplierTransactions((prev) => prev.filter((t) => t.supplierId !== supplierId));
      if (selectedSupplierId === supplierId) { setSelectedSupplierId(null); localStorage.removeItem("hisabkitab_selectedSupplierId"); }
      toast.info("Supplier Deleted", { description: `Supplier "${target?.name || supplierId}" has been removed.` });
    } catch (error) { toast.error("Could not delete supplier", { description: error.message }); }
  };

  const handleToggleSupplierStatus = async (supplierId) => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) return;
    const status = supplier.status === "Active" ? "Inactive" : "Active";
    try {
      const updated = await api.updateSupplierStatus(supplierId, status);
      setSuppliers((prev) => prev.map((s) => s.id === supplierId ? updated : s));
      toast.success("Supplier Status Updated", { description: `${updated.name} is now marked as ${status}.` });
    } catch (error) { toast.error("Could not update supplier status", { description: error.message }); }
  };

  const handleRecordPurchase = async (purchaseTxn, meta) => {
    try {
      const result = await api.createPurchase(meta.supplierId, {
        date: purchaseTxn.date,
        item: purchaseTxn.item,
        quantity: purchaseTxn.quantity,
        purchasePrice: purchaseTxn.purchasePrice,
        amountPaid: purchaseTxn.amountPaid,
        reference: purchaseTxn.reference,
        notes: purchaseTxn.notes,
      });
      setSupplierTransactions((prev) => [result.transaction, ...prev]);
      setSuppliers((prev) => prev.map((s) => s.id === meta.supplierId ? result.supplier : s));
      const supplier = result.supplier;
      toast.success(`Purchase Recorded: ${shopInfo.currency} ${Number(meta.totalAmount).toLocaleString()}`, { description: `For ${supplier.name}. Remaining: ${shopInfo.currency} ${Number(result.supplier.currentBalance).toLocaleString()}` });
      if (supplier.email) {
        sendTransactionEmail({ toEmail: supplier.email, toName: supplier.name, recipientType: "Supplier", transactionType: "Purchase", amount: meta.totalAmount, date: purchaseTxn.date, description: purchaseTxn.description || purchaseTxn.item, updatedBalance: result.updatedBalance, previousBalance: result.previousBalance, currency: shopInfo.currency, billNumber: purchaseTxn.reference, shopInfo }).then((res) => {
          if (res.success) toast.success(`Notification email sent to ${supplier.name} (${supplier.email})`);
          else if (res.reason === "config_missing") toast.info("Transaction saved. Email notification pending EmailJS setup in Settings.");
        });
      }
    } catch (error) { toast.error("Could not record purchase", { description: error.message }); }
  };

  const handleMakePayment = async (paymentTxn, meta) => {
    try {
      const result = await api.createSupplierPayment(meta.supplierId, {
        date: paymentTxn.date,
        amount: meta.amountPaid,
        paymentMethod: paymentTxn.paymentMethod,
        reference: paymentTxn.reference,
        notes: paymentTxn.notes,
      });
      setSupplierTransactions((prev) => [result.transaction, ...prev]);
      setSuppliers((prev) => prev.map((s) => s.id === meta.supplierId ? result.supplier : s));
      const supplier = result.supplier;
      toast.success(`Payment Recorded: ${shopInfo.currency} ${Number(meta.amountPaid).toLocaleString()}`, { description: `Payment sent to ${supplier.name} successfully. Remaining: ${shopInfo.currency} ${Number(result.updatedBalance).toLocaleString()}` });
      if (supplier.email) {
        sendTransactionEmail({ toEmail: supplier.email, toName: supplier.name, recipientType: "Supplier", transactionType: "Payment", amount: meta.amountPaid, date: paymentTxn.date, description: paymentTxn.description, updatedBalance: result.updatedBalance, previousBalance: result.previousBalance, currency: shopInfo.currency, billNumber: paymentTxn.reference, shopInfo }).then((res) => {
          if (res.success) toast.success(`Notification email sent to ${supplier.name} (${supplier.email})`);
        });
      }
    } catch (error) { toast.error("Could not record payment", { description: error.message }); }
  };

  const handleNavigate = (page, targetOrFilter = null) => {
    setCurrentPage(page);
    if (page === "transactions") setActiveTxnFilter(typeof targetOrFilter === "object" ? (targetOrFilter?.typeFilter || "all") : (["all", "Udhaar", "Jama"].includes(targetOrFilter) ? targetOrFilter : "all"));
    if (page === "customers") setActiveCustFilter(typeof targetOrFilter === "object" ? (targetOrFilter?.statusFilter || "all") : (["all", "pending", "cleared"].includes(targetOrFilter) ? targetOrFilter : "all"));
    try {
      localStorage.setItem("hisabkitab_currentPage", page);
      if (page === "customer-details") {
        const id = typeof targetOrFilter === "string" ? targetOrFilter : targetOrFilter?.id;
        setSelectedCustomerId(id || null); if (id) localStorage.setItem("hisabkitab_selectedCustomerId", id);
      } else { setSelectedCustomerId(null); localStorage.removeItem("hisabkitab_selectedCustomerId"); }
      if (page === "supplier-details") {
        const id = typeof targetOrFilter === "string" ? targetOrFilter : targetOrFilter?.id;
        setSelectedSupplierId(id || null); if (id) localStorage.setItem("hisabkitab_selectedSupplierId", id);
      } else { setSelectedSupplierId(null); localStorage.removeItem("hisabkitab_selectedSupplierId"); }
    } catch {}
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenAddTransaction = (type = "Udhaar", customerId = null) => {
    const defaultCust = customerId || customers[0]?.id || "";
    setTxnForm({ customerId: defaultCust, type, amount: "", description: "", paymentMethod: type === "Udhaar" ? "Khata Credit" : "Cash", billNumber: generateUniqueReceiptNumber(transactions, type), date: today() });
    setTxnModalOpen(true);
  };

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!txnForm.customerId) return toast.error("Please select a customer for this entry.");
    if (!txnForm.amount || Number(txnForm.amount) <= 0) return toast.error("Please enter a valid amount greater than 0.");
    const candidate = (txnForm.billNumber || "").trim() || generateUniqueReceiptNumber(transactions, txnForm.type);
    if (!isReceiptNumberUnique(candidate, transactions)) return toast.error("Duplicate Receipt Number", { description: "Please generate a new receipt number." });
    const customer = customers.find((c) => c.id === txnForm.customerId);
    if (!customer) return toast.error("Customer not found.");
    try {
      const result = await api.createCustomerTransaction(customer.id, { type: txnForm.type, amount: Number(txnForm.amount), date: txnForm.date || today(), description: txnForm.description || (txnForm.type === "Udhaar" ? "General goods" : "Account payment"), paymentMethod: txnForm.paymentMethod, billNumber: candidate });
      const tx = result.transaction;
      setTransactions((prev) => [tx, ...prev]);
      setCustomers((prev) => prev.map((c) => c.id === customer.id ? result.customer : c));
      setTxnModalOpen(false);
      toast.success(`${txnForm.type === "Udhaar" ? "Udhaar Recorded" : "Jama Payment"}: ${shopInfo.currency} ${Number(tx.amount).toLocaleString()}`, { description: `Recorded for ${customer.name}.`, action: { label: "Print Receipt", onClick: () => exportTransactionReceiptPDF(tx, result.customer, shopInfo) } });
      if (customer.email) {
        sendTransactionEmail({ toEmail: customer.email, toName: customer.name, recipientType: "Customer", transactionType: tx.type, amount: tx.amount, date: tx.date, description: tx.description, updatedBalance: result.updatedBalance, previousBalance: result.previousBalance, currency: shopInfo.currency, billNumber: tx.billNumber, shopInfo }).then((res) => {
          if (res.success) toast.success(`Notification email sent to ${customer.name} (${customer.email})`);
          else if (res.reason === "config_missing") toast.info("Transaction saved. Email notification pending EmailJS setup in Settings.");
        });
      }
    } catch (error) { toast.error("Could not save transaction", { description: error.message }); }
  };

  const handleOpenAddCustomer = () => {
    setCustForm({ name: "", countryCode: shopInfo?.countryCode || "+92", phone: "", email: "", address: "", openingBalance: "" });
    setCustModalOpen(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    const cleanName = custForm.name.trim();
    if (!cleanName) return toast.error("Customer name is required.");
    if (!/^[a-zA-Z\s]+$/.test(cleanName)) return toast.error("Invalid Customer Name", { description: "Customer name must only contain alphabetic letters and spaces." });
    if (!custForm.phone.trim()) return toast.error("Phone number is required.");
    const cleanEmail = custForm.email.trim();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return toast.error("Invalid Email Format");
    const fullPhone = `${custForm.countryCode || "+92"} ${custForm.phone.trim()}`;
    try {
      const customer = await api.createCustomer({ name: cleanName, phone: fullPhone, email: cleanEmail, address: custForm.address.trim(), openingBalance: Number(custForm.openingBalance || 0) });
      setCustomers((prev) => [customer, ...prev]);
      const txns = await api.customerTransactions(customer.id);
      if (txns.length) setTransactions((prev) => [...txns.filter((t) => !prev.some((x) => x.id === t.id)), ...prev]);
      setCustModalOpen(false);
      toast.success(`Customer Added: ${customer.name}`, { description: `Khata account created with ${shopInfo.currency} ${(Number(customer.balance) || 0).toLocaleString()} initial balance.` });
    } catch (error) { toast.error("Could not add customer", { description: error.message }); }
  };

  const handleLogin = (loginData) => {
    setIsAuthenticated(true);
    if (loginData?.shopInfo) setShopInfo((prev) => ({ ...prev, ...loginData.shopInfo }));
    const savedPage = localStorage.getItem("hisabkitab_currentPage");
    const targetPage = savedPage && savedPage !== "login" ? savedPage : "dashboard";
    localStorage.setItem("hisabkitab_currentPage", targetPage);
    setCurrentPage(targetPage);
    toast.success("Welcome Back to HisabKitab!", { description: `Signed in as ${loginData?.user?.name || shopInfo.owner}.` });
  };

  const handleLogout = () => {
    clearSession();
    localStorage.removeItem("hisabkitab_currentPage");
    localStorage.removeItem("hisabkitab_selectedCustomerId");
    localStorage.removeItem("hisabkitab_selectedSupplierId");
    setIsAuthenticated(false);
    setCurrentPage("login");
    setCustomers([]); setSuppliers([]); setTransactions([]); setSupplierTransactions([]);
    toast.info("Logged Out", { description: "You have signed out of your khata account." });
  };

  if (isAuthenticated && isLoadingData) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f8fafc", color: "#0f172a", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>Loading HisabKitab</div>
          <div style={{ fontSize: "13px", color: "#64748b" }}>Connecting to MongoDB-backed services...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || currentPage === "login") {
    return (
      <>
        <Toaster position="top-right" richColors closeButton />
        <Login onLogin={handleLogin} shopInfo={shopInfo} />
      </>
    );
  }

  // Titles for Header
  const pageTitles = {
    dashboard: {
      title: "Khata Dashboard",
    },
    customers: {
      title: "Customers Directory",
    },
    "customer-details": {
      title: "Customer Khata Ledger",
    },
    suppliers: {
      title: "Suppliers Directory",
    },
    "supplier-details": {
      title: "Supplier Details & Info",
    },
    transactions: {
      title: "Transaction Ledger",
    },
    reports: {
      title: "Financial Analytics & Reports",
    },
    settings: {
      title: "Profile & Store Settings",
    },
  };

  const currentHeaderInfo = pageTitles[currentPage] || pageTitles.dashboard;
  const activeCustomer = customers.find((c) => c.id === selectedCustomerId);
  const activeSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <DashboardLayout
        currentPage={currentPage}
        setCurrentPage={handleNavigate}
        shopInfo={shopInfo}
        onLogout={handleLogout}
        title={currentHeaderInfo.title}
        subtitle={currentHeaderInfo.subtitle}
        onQuickAddTransaction={() => handleOpenAddTransaction("Udhaar")}
      >
        {currentPage === "dashboard" && (
          <Dashboard
            customers={customers}
            transactions={transactions}
            suppliers={suppliers}
            supplierTransactions={supplierTransactions}
            onNavigate={handleNavigate}
            onOpenAddTransaction={handleOpenAddTransaction}
            onOpenAddCustomer={handleOpenAddCustomer}
            currency={shopInfo.currency}
          />
        )}

        {currentPage === "customers" && (
          <Customers
            customers={customers}
            onSelectCustomer={(id) => handleNavigate("customer-details", id)}
            onOpenAddCustomer={handleOpenAddCustomer}
            onOpenAddTransaction={handleOpenAddTransaction}
            currency={shopInfo.currency}
            initialStatusFilter={activeCustFilter}
          />
        )}

        {currentPage === "customer-details" && (
          <CustomerDetails
            customer={activeCustomer}
            transactions={transactions}
            onBack={() => handleNavigate("customers")}
            onOpenAddTransaction={handleOpenAddTransaction}
            currency={shopInfo.currency}
            shopInfo={shopInfo}
          />
        )}

        {currentPage === "suppliers" && (
          <Suppliers
            suppliers={suppliers}
            onSelectSupplier={(id) => handleNavigate("supplier-details", id)}
            onAddSupplier={handleAddSupplier}
            onUpdateSupplier={handleUpdateSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            onToggleSupplierStatus={handleToggleSupplierStatus}
            currency={shopInfo.currency}
          />
        )}

        {currentPage === "supplier-details" && (
          <SupplierDetails
            supplier={activeSupplier}
            suppliers={suppliers}
            supplierTransactions={supplierTransactions}
            onBack={() => handleNavigate("suppliers")}
            onUpdateSupplier={handleUpdateSupplier}
            onDeleteSupplier={handleDeleteSupplier}
            onToggleSupplierStatus={handleToggleSupplierStatus}
            onRecordPurchase={handleRecordPurchase}
            onMakePayment={handleMakePayment}
            currency={shopInfo.currency}
          />
        )}

        {currentPage === "transactions" && (
          <Transactions
            transactions={transactions}
            customers={customers}
            suppliers={suppliers}
            supplierTransactions={supplierTransactions}
            shopInfo={shopInfo}
            onSelectCustomer={(id) => handleNavigate("customer-details", id)}
            onSelectSupplier={(id) => handleNavigate("supplier-details", id)}
            onOpenAddTransaction={handleOpenAddTransaction}
            currency={shopInfo.currency}
            initialTypeFilter={activeTxnFilter}
          />
        )}

        {currentPage === "reports" && (
          <Reports
            customers={customers}
            transactions={transactions}
            suppliers={suppliers}
            supplierTransactions={supplierTransactions}
            currency={shopInfo.currency}
            shopInfo={shopInfo}
            onSelectCustomer={(id) => handleNavigate("customer-details", id)}
            onSelectSupplier={(id) => handleNavigate("supplier-details", id)}
          />
        )}

        {currentPage === "settings" && (
          <Settings
            shopInfo={shopInfo}
            onUpdateShopInfo={handleUpdateShopInfo}
          />
        )}
      </DashboardLayout>

      {/* Add Transaction Modal */}
      <Modal
        isOpen={txnModalOpen}
        onClose={() => setTxnModalOpen(false)}
        title={
          txnForm.type === "Udhaar"
            ? "Record Udhaar (Credit Given)"
            : "Record Jama (Payment Received)"
        }
      >
        <form onSubmit={handleSaveTransaction} className="modal-form">
          <div className="form-group">
            <label className="form-label">Transaction Type</label>
            <div className="type-toggle-group">
              <button
                type="button"
                className={`type-toggle-btn type-udhaar ${
                  txnForm.type === "Udhaar" ? "active" : ""
                }`}
                onClick={() =>
                  setTxnForm((prev) => ({
                    ...prev,
                    type: "Udhaar",
                    paymentMethod: "Khata Credit",
                    billNumber: generateUniqueReceiptNumber(transactions, "Udhaar"),
                  }))
                }
              >
                Udhaar (Debit)
              </button>
              <button
                type="button"
                className={`type-toggle-btn type-jama ${
                  txnForm.type === "Jama" ? "active" : ""
                }`}
                onClick={() =>
                  setTxnForm((prev) => ({
                    ...prev,
                    type: "Jama",
                    paymentMethod: "Cash",
                    billNumber: generateUniqueReceiptNumber(transactions, "Jama"),
                  }))
                }
              >
                Jama (Credit)
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="txn-cust">
              Select Customer *
            </label>
            <select
              id="txn-cust"
              className="form-input"
              value={txnForm.customerId}
              onChange={(e) =>
                setTxnForm((prev) => ({ ...prev, customerId: e.target.value }))
              }
              required
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Balance: {shopInfo.currency} {c.balance})
                </option>
              ))}
            </select>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="txn-amount">
                Amount ({shopInfo.currency}) *
              </label>
              <input
                id="txn-amount"
                type="number"
                min="1"
                step="any"
                className="form-input"
                placeholder="e.g. 2500"
                value={txnForm.amount}
                onChange={(e) =>
                  setTxnForm((prev) => ({ ...prev, amount: e.target.value }))
                }
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="txn-date">
                Date
              </label>
              <input
                id="txn-date"
                type="date"
                className="form-input"
                value={txnForm.date}
                onChange={(e) =>
                  setTxnForm((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="txn-method">
                Payment Channel
              </label>
              <select
                id="txn-method"
                className="form-input"
                value={txnForm.paymentMethod}
                onChange={(e) =>
                  setTxnForm((prev) => ({
                    ...prev,
                    paymentMethod: e.target.value,
                  }))
                }
              >
                <option value="Cash">Cash at Counter</option>
                <option value="EasyPaisa">EasyPaisa</option>
                <option value="JazzCash">JazzCash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Khata Credit">Khata Credit</option>
              </select>
            </div>

            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label className="form-label" htmlFor="txn-bill" style={{ margin: 0 }}>
                  Bill / Receipt No.
                </label>
                <button
                  type="button"
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--primary)",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    padding: "0 2px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  onClick={() => {
                    const freshSlip = generateUniqueReceiptNumber(transactions, txnForm.type);
                    setTxnForm((prev) => ({ ...prev, billNumber: freshSlip }));
                  }}
                  title="Regenerate a guaranteed unique receipt number"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="23 4 23 10 17 10"></polyline>
                    <polyline points="1 20 1 14 7 14"></polyline>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                  Generate Unique
                </button>
              </div>
              <input
                id="txn-bill"
                type="text"
                className="form-input"
                placeholder="e.g. REC-2042"
                value={txnForm.billNumber}
                onChange={(e) =>
                  setTxnForm((prev) => ({ ...prev, billNumber: e.target.value }))
                }
                style={
                  txnForm.billNumber && !isReceiptNumberUnique(txnForm.billNumber, transactions)
                    ? { borderColor: "#ef4444", background: "#fef2f2" }
                    : {}
                }
              />
              {txnForm.billNumber && !isReceiptNumberUnique(txnForm.billNumber, transactions) ? (
                <div style={{ fontSize: "11px", color: "#dc2626", marginTop: "4px", fontWeight: "600" }}>
                  ⚠ Receipt #{txnForm.billNumber} is already used! Each receipt must be strictly unique.
                </div>
              ) : txnForm.billNumber ? (
                <div style={{ fontSize: "11px", color: "#16a34a", marginTop: "4px" }}>
                  ✓ Guaranteed unique receipt number
                </div>
              ) : null}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="txn-desc">
              Description / Item Notes
            </label>
            <input
              id="txn-desc"
              type="text"
              className="form-input"
              placeholder="e.g. 5kg Sugar, 2L Cooking Oil"
              value={txnForm.description}
              onChange={(e) =>
                setTxnForm((prev) => ({ ...prev, description: e.target.value }))
              }
            />
          </div>

          <div className="modal-actions-right">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTxnModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={txnForm.type === "Udhaar" ? "danger" : "success"}
            >
              Save {txnForm.type} Entry
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Customer Modal */}
      <Modal
        isOpen={custModalOpen}
        onClose={() => setCustModalOpen(false)}
        title="Add New Customer Khata"
      >
        <form onSubmit={handleSaveCustomer} className="modal-form">
          <div className="form-group">
            <label className="form-label" htmlFor="cust-name">
              Full Customer Name (Letters Only) *
            </label>
            <input
              id="cust-name"
              type="text"
              className="form-input"
              placeholder="e.g. Tariq Mehmood"
              value={custForm.name}
              onChange={(e) => {
                const rawVal = e.target.value;
                const alphabetsOnly = rawVal.replace(/[^a-zA-Z\s]/g, "");
                setCustForm((prev) => ({ ...prev, name: alphabetsOnly }));
                if (rawVal !== alphabetsOnly) {
                  toast.warning("Numbers Not Allowed", {
                    description: "Customer name can only contain alphabetic letters and spaces.",
                  });
                }
              }}
              required
            />
            <span className="field-hint">Numbers and digits are not permitted.</span>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label className="form-label" htmlFor="cust-phone">
                Country Code & Phone Number *
              </label>
              <div className="phone-input-group">
                <select
                  className="country-code-select"
                  value={custForm.countryCode || "+92"}
                  onChange={(e) =>
                    setCustForm((prev) => ({ ...prev, countryCode: e.target.value }))
                  }
                  aria-label="Country Code"
                >
                  {COUNTRY_CODES.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.code} ({item.country})
                    </option>
                  ))}
                </select>
                <input
                  id="cust-phone"
                  type="tel"
                  className="form-input phone-number-input"
                  placeholder="300-1234567"
                  value={custForm.phone}
                  onChange={(e) =>
                    setCustForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="cust-opening">
                Opening Balance ({shopInfo.currency})
              </label>
              <input
                id="cust-opening"
                type="number"
                min="0"
                step="any"
                className="form-input"
                placeholder="0 if new account"
                value={custForm.openingBalance}
                onChange={(e) =>
                  setCustForm((prev) => ({
                    ...prev,
                    openingBalance: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="cust-email">
              Email Address (For Automatic Transaction Slips)
            </label>
            <input
              id="cust-email"
              type="email"
              className="form-input"
              placeholder="e.g. customer@gmail.com (Optional)"
              value={custForm.email || ""}
              onChange={(e) =>
                setCustForm((prev) => ({ ...prev, email: e.target.value }))
              }
            />
            <span className="field-hint">Automatic transaction notifications branded Alam Garments will be sent to this email.</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="cust-address">
              Shop / Home Address (Optional)
            </label>
            <input
              id="cust-address"
              type="text"
              className="form-input"
              placeholder="e.g. Street 4, Sector G-8, Islamabad"
              value={custForm.address}
              onChange={(e) =>
                setCustForm((prev) => ({ ...prev, address: e.target.value }))
              }
            />
          </div>

          <div className="modal-actions-right">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCustModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Customer Account
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}