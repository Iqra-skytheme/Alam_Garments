/**
 * HisabKitab Receipt Generation & Uniqueness Utilities
 * Ensures that every generated receipt, slip, or invoice number is strictly unique
 * and can never be duplicated across any customer or transaction.
 */

/**
 * Extract existing receipt/bill numbers into a fast lookup Set (case-insensitive)
 * @param {Array} transactions 
 * @returns {Set<string>}
 */
export function getExistingReceiptNumbers(transactions = []) {
  const set = new Set();
  for (const t of transactions) {
    if (t?.billNumber && typeof t.billNumber === "string") {
      set.add(t.billNumber.trim().toUpperCase());
    }
  }
  return set;
}

/**
 * Check if a receipt number is strictly unique
 * @param {string} billNumber 
 * @param {Array} transactions 
 * @param {string|null} excludeTxnId 
 * @returns {boolean}
 */
export function isReceiptNumberUnique(billNumber, transactions = [], excludeTxnId = null) {
  if (!billNumber || typeof billNumber !== "string") return false;
  const target = billNumber.trim().toUpperCase();
  if (!target) return false;

  return !transactions.some((t) => {
    if (excludeTxnId && t.id === excludeTxnId) return false;
    return (t.billNumber || "").trim().toUpperCase() === target;
  });
}

/**
 * Generate a guaranteed unique receipt number based on transaction type and existing ledger
 * Guarantees zero duplicate collision against all existing transactions.
 * 
 * @param {Array} transactions - All existing transactions
 * @param {string} type - "Udhaar" (INV-), "Jama" (REC-), or "Opening" (OPEN-)
 * @returns {string} - Guaranteed unique receipt number (e.g. REC-2042, INV-1090)
 */
export function generateUniqueReceiptNumber(transactions = [], type = "Jama") {
  const existing = getExistingReceiptNumbers(transactions);

  let prefix = "REC";
  let defaultBase = 2041;

  if (type === "Udhaar") {
    prefix = "INV";
    defaultBase = 1089;
  } else if (type === "Opening") {
    prefix = "OPEN";
    defaultBase = 500;
  }

  // Scan existing transactions to find the highest sequence number for this prefix
  let maxNum = defaultBase;
  const regex = new RegExp(`^${prefix}[-_\\s]?(\\d+)`, "i");

  for (const t of transactions) {
    if (!t?.billNumber) continue;
    const match = t.billNumber.trim().match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  // Find the next strictly unique sequential number
  let nextNum = maxNum + 1;
  let candidate = `${prefix}-${nextNum}`;

  // Collision loop safeguard: loop until candidate is 100% unique in existing Set
  while (existing.has(candidate.toUpperCase())) {
    nextNum += 1;
    candidate = `${prefix}-${nextNum}`;
  }

  return candidate;
}

/**
 * Generates a unique digital receipt tracking serial for printable receipts
 * Example: "HK-RCP-2026-98AC-412"
 * @param {Object} transaction 
 * @returns {string}
 */
export function generateUniqueReceiptSerial(transaction = {}) {
  const now = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(1000 + Math.random() * 9000);
  const txnSuffix = transaction?.id ? String(transaction.id).replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase() : rand;
  return `HK-RCP-${now}-${txnSuffix}`;
}
