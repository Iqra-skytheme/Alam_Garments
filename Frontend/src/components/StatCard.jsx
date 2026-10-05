export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = "primary",
  trend,
  onClick,
}) {
  return (
    <div
      className={`stat-card stat-card-${variant} ${onClick ? "clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="stat-card-header">
        <span className="stat-card-title">{title}</span>
        <div className="stat-card-header-right">
          {onClick && (
            <span className="stat-card-click-arrow" aria-hidden="true" title="Click to view">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </span>
          )}
          {icon && <div className={`stat-card-icon-badge badge-${variant}`}>{icon}</div>}
        </div>
      </div>

      <div className="stat-card-body">
        <div className="stat-card-value">{value}</div>
        {(subtitle || trend) && (
          <div className="stat-card-footer">
            {trend && (
              <span className={`stat-card-trend trend-${trend.direction}`}>
                {trend.direction === "up" ? "▲" : "▼"} {trend.label}
              </span>
            )}
            {subtitle && <span className="stat-card-subtitle">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
