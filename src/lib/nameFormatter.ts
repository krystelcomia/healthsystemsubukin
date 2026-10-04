/**
 * Standardized name parsing and formatting utility for Barangay Subukin Health System.
 * Enforces the required format: "Surname, First Name, Middle Name" across all forms,
 * family data, and resident options, as well as "SURNAME, First Name" for folder naming.
 */

const COMPOUND_SURNAME_PREFIXES = [
  "de la",
  "dela",
  "de los",
  "delos",
  "de jesus",
  "del rosario",
  "de castro",
  "de",
  "del",
  "san",
  "santa",
  "sto.",
  "sta."
];

function isCompoundPrefix(prefixStr: string): boolean {
  const lower = prefixStr.toLowerCase().trim();
  return COMPOUND_SURNAME_PREFIXES.some(p => lower === p || lower.startsWith(p + " "));
}

export interface ParsedName {
  last: string;
  first: string;
  middle: string;
}

export function toTitleCase(str: string): string {
  if (!str) return "";
  return str
    .split(/\s+/)
    .map(word => {
      if (!word) return "";
      if (/^(ii|iii|iv|v|vi)$/i.test(word)) return word.toUpperCase();
      if (/^(jr|sr)\.?$/i.test(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase().replace(/\.?$/, ".");
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Parses any full name into Surname (last), First Name (first), and Middle Name (middle).
 * Handles both already formatted "Surname, First Name, Middle Name" and traditional "First Middle Last".
 */
export function parseNameParts(fullName: string | null | undefined): ParsedName {
  const clean = (fullName || "").trim();
  if (!clean) return { last: "", first: "", middle: "" };

  // Case 1: Name contains comma(s) -> Already Surname-first (e.g. "Badillo, Errol" or "BADILLO, Errol")
  if (clean.includes(",")) {
    const segments = clean.split(",").map(s => s.trim()).filter(Boolean);
    if (segments.length === 0) return { last: "", first: "", middle: "" };
    if (segments.length === 1) return { last: segments[0], first: "", middle: "" };
    if (segments.length === 2) {
      const last = segments[0];
      const rest = segments[1].split(/\s+/).filter(Boolean);
      if (rest.length <= 1) {
        return { last, first: rest[0] || "", middle: "" };
      }
      const first = rest.slice(0, -1).join(" ");
      const middle = rest[rest.length - 1];
      return { last, first, middle };
    }
    // 3 or more segments: "Surname, First, Middle"
    return {
      last: segments[0],
      first: segments[1],
      middle: segments.slice(2).join(" "),
    };
  }

  // Case 2: Name without commas -> e.g. "First Middle Last" or "First Last"
  const tokens = clean.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { last: "", first: "", middle: "" };
  if (tokens.length === 1) return { last: tokens[0], first: "", middle: "" };
  if (tokens.length === 2) {
    return { last: tokens[1], first: tokens[0], middle: "" };
  }

  // Check for generational suffix at the end (e.g. "Errol Badillo Jr.")
  let suffix = "";
  let baseTokens = tokens;
  const lastToken = tokens[tokens.length - 1];
  if (/^(jr\.?|sr\.?|ii|iii|iv|v)$/i.test(lastToken)) {
    suffix = ` ${lastToken}`;
    baseTokens = tokens.slice(0, -1);
  }

  if (baseTokens.length === 2) {
    return { last: `${baseTokens[1]}${suffix}`, first: baseTokens[0], middle: "" };
  }

  // Check 3-word compound surname at end (e.g. "De Los Santos")
  if (baseTokens.length >= 4) {
    const compound3 = `${baseTokens[baseTokens.length - 3]} ${baseTokens[baseTokens.length - 2]}`.toLowerCase();
    if (isCompoundPrefix(compound3)) {
      const last = `${baseTokens.slice(-3).join(" ")}${suffix}`;
      const remaining = baseTokens.slice(0, -3);
      const first = remaining[0] || "";
      const middle = remaining.slice(1).join(" ");
      return { last, first, middle };
    }
  }

  // Check 2-word compound surname at end (e.g. "Dela Cruz", "De Guzman", "San Juan")
  const compound2 = baseTokens[baseTokens.length - 2].toLowerCase();
  if (isCompoundPrefix(compound2)) {
    const last = `${baseTokens.slice(-2).join(" ")}${suffix}`;
    const remaining = baseTokens.slice(0, -2);
    const first = remaining[0] || "";
    const middle = remaining.slice(1).join(" ");
    return { last, first, middle };
  }

  // Standard 3+ tokens: First [Middle] Last
  const last = `${baseTokens[baseTokens.length - 1]}${suffix}`;
  const first = baseTokens[0];
  const middle = baseTokens.slice(1, -1).join(" ");
  return { last, first, middle };
}

/**
 * Formats a resident's name into the required:
 * "Surname, First Name, Middle Name" (or "Surname, First Name" if no middle name).
 */
export function formatResidentName(fullName: string | null | undefined): string {
  if (!fullName) return "";
  const clean = fullName.trim();
  if (!clean) return "";

  const { last, first, middle } = parseNameParts(clean);
  if (!last && !first) return clean;
  if (!first) return last;
  if (middle) {
    return `${last}, ${first}, ${middle}`;
  }
  return `${last}, ${first}`;
}

/**
 * Formats a household head's name specifically for family folder naming and folder headings:
 * Household head's surname first in UPPERCASE, followed by comma and given name:
 * e.g., "BADILLO, Errol"
 */
export function formatHouseholdHeadName(fullName: string | null | undefined): string {
  if (!fullName) return "";
  const clean = fullName.trim();
  if (!clean) return "";

  const { last, first, middle } = parseNameParts(clean);
  if (!last && !first) return clean.toUpperCase();
  if (!first) return last.toUpperCase();

  const formattedLast = last.toUpperCase();
  const formattedFirst = toTitleCase(first);

  if (middle) {
    const formattedMiddle = middle.length <= 2 ? middle.toUpperCase().replace(/\.?$/, ".") : toTitleCase(middle);
    return `${formattedLast}, ${formattedFirst} ${formattedMiddle}`.trim();
  }
  return `${formattedLast}, ${formattedFirst}`.trim();
}
