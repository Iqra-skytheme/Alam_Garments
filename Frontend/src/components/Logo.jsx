export default function Logo({
  variant = "full", // "icon" | "full" | "horizontal"
  theme = "dark",   // "dark" | "light"
  size = "md",      // "xs" | "sm" | "md" | "lg" | "xl" | number
  showTagline = true,
  tagline = "Garments Khata & Ledger",
  className = "",
  onClick,
}) {
  // Dimensions map for icon
  const sizeMap = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 52,
    xl: 64,
  };

  const iconPx = typeof size === "number" ? size : sizeMap[size] || 40;

  // Colors based on theme
  const isLight = theme === "light";
  const titleColor = isLight ? "#0f172a" : "#ffffff";
  const accentColor = isLight ? "#2563eb" : "#38bdf8";
  const taglineColor = isLight ? "#64748b" : "#94a3b8";

  // Reusable inline vector emblem icon
  const EmblemSvg = (
    <svg
      width={iconPx}
      height={iconPx}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="hisabkitab-emblem-svg"
      style={{ display: "block", flexShrink: 0 }}
      aria-label="Alam Garments Logo"
    >
      <defs>
        <linearGradient id={`hk-bg-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="45%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#090d16" />
        </linearGradient>

        <linearGradient id={`hk-border-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#2563eb" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
        </linearGradient>

        <linearGradient id={`hk-blue-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="35%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>

        <linearGradient id={`hk-green-${size}`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="30%" stopColor="#10b981" />
          <stop offset="80%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#a7f3d0" />
        </linearGradient>

        <linearGradient id={`hk-gold-${size}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="30%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        <filter id={`hk-sh-${size}`} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000000" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Rounded Squircle Base */}
      <rect x="20" y="20" width="472" height="472" rx="108" ry="108" fill={`url(#hk-bg-${size})`} filter={`url(#hk-sh-${size})`} />
      <rect x="20" y="20" width="472" height="472" rx="108" ry="108" fill="none" stroke={`url(#hk-border-${size})`} strokeWidth="6" />

      {/* Internal Glows */}
      <circle cx="160" cy="150" r="160" fill="#2563eb" opacity="0.25" />
      <circle cx="360" cy="330" r="150" fill="#10b981" opacity="0.2" />

      {/* Book & Financial Surge */}
      <g transform="translate(0, -6)">
        {/* Book Depth Spine */}
        <path
          d="M256 122 C210 112 144 126 98 138 C86 142 78 153 78 166 L78 356 C78 372 92 384 108 381 C152 372 216 360 256 376 C296 360 360 372 404 381 C420 384 434 372 434 356 L434 166 C434 153 426 142 414 138 C368 126 302 112 256 122 Z"
          fill="#0b1120"
          opacity="0.8"
        />

        {/* Left Leaf (Hisab Ledger) */}
        <path
          d="M252 134 C212 124 154 136 112 148 C100 152 92 163 92 176 L92 352 C92 366 104 378 118 375 C158 366 214 355 252 368 Z"
          fill={`url(#hk-blue-${size})`}
        />

        {/* Accounting Lines */}
        <rect x="126" y="194" width="94" height="16" rx="8" fill="#ffffff" />
        <rect x="126" y="230" width="76" height="15" rx="7.5" fill="#bae6fd" />
        <rect x="126" y="266" width="86" height="15" rx="7.5" fill="#bae6fd" />
        <rect x="126" y="302" width="60" height="15" rx="7.5" fill="#7dd3fc" />

        {/* Currency Dot */}
        <circle cx="134" cy="342" r="8" fill="#38bdf8" />
        <rect x="154" y="337" width="50" height="11" rx="5.5" fill="#bae6fd" />

        {/* Right Leaf Depth */}
        <path
          d="M260 134 C300 124 358 136 400 148 C412 152 420 163 420 176 L420 352 C420 366 408 378 394 375 C354 366 298 355 260 368 Z"
          fill="#064e3b"
          opacity="0.45"
        />

        {/* Spine */}
        <path d="M256 126 L256 380" stroke="#090d16" strokeWidth="12" strokeLinecap="round" />
        <path d="M256 130 L256 376" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" opacity="0.8" />

        {/* Bookmark Ribbon */}
        <path d="M242 128 L270 128 L270 228 L256 212 L242 228 Z" fill={`url(#hk-gold-${size})`} />

        {/* Financial Upward Surge Checkmark */}
        <path
          d="M228 296 C218 284 219 266 232 254 C244 243 262 245 273 257 L298 286 L376 182 C386 168 406 166 418 176 C431 187 433 207 421 221 L320 354 C313 363 302 368 290 367 C279 366 269 359 263 349 L228 296 Z"
          fill={`url(#hk-green-${size})`}
        />

        {/* Surge Apex Flare */}
        <circle cx="414" cy="184" r="14" fill="#a7f3d0" opacity="0.6" />
        <circle cx="414" cy="184" r="7.5" fill="#ffffff" />
      </g>
    </svg>
  );

  if (variant === "icon") {
    return (
      <div
        className={`hisabkitab-logo-root hisabkitab-logo-icon-only ${className}`}
        onClick={onClick}
        style={{ cursor: onClick ? "pointer" : "default", display: "inline-flex" }}
      >
        {EmblemSvg}
      </div>
    );
  }

  // Full brand lockup with typography
  return (
    <div
      className={`hisabkitab-logo-root hisabkitab-logo-full ${className}`}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: iconPx > 40 ? "14px" : "11px",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
      }}
    >
      <div className="hisabkitab-logo-icon-wrap" style={{ flexShrink: 0 }}>
        {EmblemSvg}
      </div>

      <div
        className="hisabkitab-logo-text"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          lineHeight: 1.15,
        }}
      >
        <span
          className="hisabkitab-brand-name"
          style={{
            fontSize: iconPx >= 52 ? "22px" : iconPx >= 40 ? "18px" : "16px",
            fontWeight: 800,
            letterSpacing: "-0.025em",
            color: titleColor,
          }}
        >
          Alam <span style={{ color: accentColor }}>Garments</span>
        </span>

        {showTagline && (
          <span
            className="hisabkitab-brand-tagline"
            style={{
              fontSize: iconPx >= 52 ? "10px" : "9.5px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: taglineColor,
              marginTop: "2px",
            }}
          >
            {tagline}
          </span>
        )}
      </div>
    </div>
  );
}
