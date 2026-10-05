import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function DashboardLayout({
  children,
  currentPage,
  setCurrentPage,
  shopInfo,
  onLogout,
  title,
  subtitle,
  onQuickAddTransaction,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="layout-root">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onLogout={onLogout}
        shopInfo={shopInfo}
      />

      <div className="layout-main-wrapper">
        <Header
          title={title}
          subtitle={subtitle}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onQuickAddTransaction={onQuickAddTransaction}
          shopInfo={shopInfo}
          onLogout={onLogout}
          currentPage={currentPage}
          onOpenProfileSettings={() => setCurrentPage("settings")}
        />

        <main className="layout-content-area">{children}</main>
      </div>
    </div>
  );
}
