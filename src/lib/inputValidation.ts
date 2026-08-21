/**
 * Input validation helpers to restrict user input to numbers-only or letters-only.
 */

// Helper to check for navigation / control keys
const isControlKey = (e: React.KeyboardEvent): boolean => {
  return (
    e.ctrlKey ||
    e.metaKey ||
    e.altKey ||
    [
      "Backspace",
      "Tab",
      "Enter",
      "Escape",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Delete",
      "Home",
      "End",
    ].includes(e.key)
  );
};

/**
 * KeyDown handler: Only allows digits 0-9 and control keys.
 */
export const allowOnlyNumbers = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  if (isControlKey(e)) return;
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
};

/**
 * KeyDown handler: Only allows digits 0-9, decimal point '.', and control keys.
 */
export const allowNumbersAndDecimal = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  if (isControlKey(e)) return;
  const target = e.currentTarget;
  if (e.key === "." && !target.value.includes(".")) {
    return;
  }
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
};

/**
 * KeyDown handler: Only allows digits 0-9, slash '/', and control keys (e.g. for BP "120/80").
 */
export const allowNumbersAndSlash = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  if (isControlKey(e)) return;
  if (e.key === "/") return;
  if (!/^[0-9]$/.test(e.key)) {
    e.preventDefault();
  }
};

/**
 * KeyDown handler: Only allows letters (English + Filipino ñ/Ñ), spaces, hyphens, periods, commas, apostrophes.
 * Disallows numbers and special symbols.
 */
export const allowOnlyLetters = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  if (isControlKey(e)) return;
  // Allow letters (including latin accents/ñ), spaces, hyphens, apostrophes, and periods for names/honorifics
  if (!/^[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s\-\.,']$/.test(e.key)) {
    e.preventDefault();
  }
};

/**
 * Sanitizers for onChange or paste events
 */
export const sanitizeNumbers = (val: string): string => {
  return val.replace(/[^0-9]/g, "");
};

export const sanitizeNumbersAndDecimal = (val: string): string => {
  // Allow only digits and at most one decimal point
  let sanitized = val.replace(/[^0-9.]/g, "");
  const parts = sanitized.split(".");
  if (parts.length > 2) {
    sanitized = parts[0] + "." + parts.slice(1).join("");
  }
  return sanitized;
};

export const sanitizeNumbersAndSlash = (val: string): string => {
  return val.replace(/[^0-9/]/g, "");
};

export const sanitizeLetters = (val: string): string => {
  return val.replace(/[^a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s\-\.,']/g, "");
};

export const sanitizeLettersStrict = (val: string): string => {
  return val.replace(/[^a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s\-']/g, "");
};

export const sanitizeDateString = (val: string): string => {
  return val.replace(/[^0-9-]/g, "");
};

export const sanitizeBpString = (val: string): string => {
  return val.replace(/[^0-9/\s]/g, "");
};

