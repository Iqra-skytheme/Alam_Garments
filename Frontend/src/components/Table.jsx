export default function Table({
  columns = [],
  data = [],
  keyField = "id",
  onRowClick,
  emptyMessage = "No records found",
  className = "",
}) {
  return (
    <div
      className={`table-container ${className}`}
      style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", width: "100%" }}
    >
      <table className="custom-table" style={{ width: "100%", whiteSpace: "nowrap" }}>
        <thead>
          <tr>
            {columns.map((col, index) => (
              <th
                key={col.key || index}
                style={{
                  textAlign: col.align || "left",
                  width: col.width || "auto",
                  whiteSpace: "nowrap",
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="table-empty-cell"
              >
                <div className="table-empty-state">
                  <div className="table-empty-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </div>
                  <p>{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={row[keyField] || rowIndex}
                onClick={() => onRowClick && onRowClick(row)}
                className={onRowClick ? "table-row-clickable" : ""}
              >
                {columns.map((col, colIndex) => (
                  <td
                    key={col.key || colIndex}
                    style={{ textAlign: col.align || "left", whiteSpace: "nowrap" }}
                  >
                    {col.render
                      ? col.render(row, rowIndex)
                      : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
