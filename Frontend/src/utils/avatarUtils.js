/**
 * Computes monogram initials for owner or customer names
 * e.g., "Muhammad Ali" -> "MA", "Iqra Jutt" -> "IJ", "Alam" -> "AL"
 */
export function getOwnerInitials(name) {
  if (!name || typeof name !== "string") return "M";
  const clean = name.trim();
  if (!clean) return "M";
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].length >= 2 ? words[0].slice(0, 2).toUpperCase() : words[0].toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export const PRESET_PALETTES = [
  { id: "av-blue", bg: "#2563eb", label: "Ocean Blue" },
  { id: "av-slate", bg: "#0f172a", label: "Midnight Slate" },
  { id: "av-emerald", bg: "#16a34a", label: "Emerald Green" },
  { id: "av-amber", bg: "#d97706", label: "Amber Gold" },
  { id: "av-indigo", bg: "#4f46e5", label: "Indigo Trader" },
  { id: "av-purple", bg: "#7c3aed", label: "Royal Purple" },
  { id: "av-rose", bg: "#e11d48", label: "Rose Crimson" },
  { id: "av-teal", bg: "#0d9488", label: "Teal Cyan" },
];
