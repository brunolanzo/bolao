/**
 * Formats a full name as "First Last" (first word + last word),
 * with Title Case applied to each part.
 *
 * Examples:
 *   "bruno silva santos"  → "Bruno Santos"
 *   "ANA MARIA COSTA"     → "Ana Costa"
 *   "joão"                → "João"
 */
export function formatName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";

  const titleCase = (word: string) =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

  if (parts.length === 1) return titleCase(parts[0]);

  const first = titleCase(parts[0]);
  const last = titleCase(parts[parts.length - 1]);
  return `${first} ${last}`;
}
