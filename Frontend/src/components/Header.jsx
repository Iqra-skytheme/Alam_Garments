import { useState, useRef, useEffect } from "react";
import { getOwnerInitials } from "../utils/avatarUtils";

export default function Header({
  title,
  subtitle,
  onOpenMobileMenu,
  onQuickAddTransaction,
  shopInfo,
  onOpenProfileSettings,
  onLogout,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") setDropdownOpen(false);
    };

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [dropdownOpen]);

  const isImageAvatar =
    shopInfo?.avatar &&
    (shopInfo.avatar.startsWith("data:image") ||
      shopInfo.avatar.startsWith("http"));

  const paletteColor =
    shopInfo?.avatar && shopInfo.avatar.startsWith("#")
      ? shopInfo.avatar
      : "#2563eb";

  const ownerInitials = getOwnerInitials(shopInfo?.owner);

  const handleSettingsClick = () => {
    setDropdownOpen(false);
    if (onOpenProfileSettings) onOpenProfileSettings();
  };

  const handleLogoutClick = () => {
    setDropdownOpen(false);
    if (onLogout) onLogout();
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>

        <div className="header-titles">
          <h1 className="header-title">{title}</h1>
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
        </div>
      </div>

      <div className="header-right">
        {onQuickAddTransaction && (
          <button
            type="button"
            className="btn btn-primary btn-sm btn-quick-action"
            onClick={onQuickAddTransaction}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>New Entry</span>
          </button>
        )}

        {/* Profile Dropdown Container */}
        <div className="profile-dropdown-wrapper" ref={dropdownRef}>
          <button
            type="button"
            className={`user-profile-badge user-profile-clickable ${dropdownOpen ? "profile-active" : ""}`}
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div
              className="profile-avatar"
              style={!isImageAvatar ? { backgroundColor: paletteColor, color: "#ffffff" } : {}}
            >
              {isImageAvatar ? (
                <img
                  src={shopInfo.avatar}
                  alt={shopInfo.owner || "Owner"}
                  className="header-avatar-img"
                />
              ) : (
                <span className="header-initials">{ownerInitials}</span>
              )}
            </div>
            <div className="profile-meta">
              <span className="profile-name">{shopInfo?.owner || "Admin"}</span>
              <span className="profile-role">Shop Owner</span>
            </div>
            <svg
              className={`profile-chevron ${dropdownOpen ? "rotate-180" : ""}`}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {/* Dropdown Popover */}
          {dropdownOpen && (
            <div className="profile-dropdown-menu">
              <div className="dropdown-user-header">
                <div
                  className="dropdown-user-avatar"
                  style={!isImageAvatar ? { backgroundColor: paletteColor, color: "#ffffff" } : {}}
                >
                  {isImageAvatar ? (
                    <img src={shopInfo.avatar} alt="User" />
                  ) : (
                    <span className="header-initials">{ownerInitials}</span>
                  )}
                </div>
                <div className="dropdown-user-info">
                  <span className="dropdown-user-name">{shopInfo?.owner || "Owner"}</span>
                  <span className="dropdown-shop-name">{shopInfo?.name || "Bismillah Store"}</span>
                  <span className="dropdown-user-location">{shopInfo?.location || "Main Bazar"}</span>
                </div>
              </div>

              <div className="dropdown-divider"></div>

              <div className="dropdown-items">
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={handleSettingsClick}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                  </svg>
                  <span>Edit Settings</span>
                </button>

                <button
                  type="button"
                  className="dropdown-item dropdown-item-danger"
                  onClick={handleLogoutClick}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
