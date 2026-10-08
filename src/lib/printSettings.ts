/**
 * Utility for managing print page settings (orientation, font, and system-generated footers)
 * Across all printable health forms in Barangay Subukin Health System.
 */

export type PrintOrientation = 'portrait' | 'landscape';

const STORAGE_KEY = 'bhw_print_orientation';

/**
 * Gets the current saved print orientation preference.
 */
export function getSavedPrintOrientation(): PrintOrientation {
  if (typeof window === 'undefined') return 'portrait';
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'landscape' ? 'landscape' : 'portrait';
}

/**
 * Saves and dynamically applies the page orientation to the document.
 */
export function setSavedPrintOrientation(orientation: PrintOrientation) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, orientation);
  applyPrintOrientation(orientation);
  window.dispatchEvent(new CustomEvent('bhw-print-orientation-changed', { detail: orientation }));
}

/**
 * Injects or updates the dynamic @page size rule so browser print engines
 * (Chrome, Edge, Safari, Firefox) immediately render in the chosen orientation.
 */
export function applyPrintOrientation(orientation: PrintOrientation) {
  if (typeof document === 'undefined') return;

  document.body.classList.remove('print-portrait', 'print-landscape');
  document.body.classList.add(`print-${orientation}`);

  let styleEl = document.getElementById('bhw-print-page-orientation-style') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'bhw-print-page-orientation-style';
    document.head.appendChild(styleEl);
  }

  styleEl.innerHTML = `
    @media print {
      @page {
        size: ${orientation} !important;
        margin-top: 0.5in;
        margin-bottom: 0.5in;
        margin-left: 0.35in;
        margin-right: 0.35in;
      }
      @page :first {
        margin-top: 0.25in;
        margin-bottom: 0.5in;
        margin-left: 0.35in;
        margin-right: 0.35in;
      }
      tr, .print-row {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      thead {
        display: table-header-group !important;
      }
      tfoot {
        display: table-footer-group !important;
      }
    }
  `;
}

export interface PrintSettingsEventDetail {
  defaultOrientation?: PrintOrientation;
  title?: string;
  onConfirm?: (orientation: PrintOrientation) => void;
  onCancel?: () => void;
  formId?: string;
}

/**
 * Open the universal Print Page Settings modal.
 */
export function openPrintPageSettings(detail?: PrintSettingsEventDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('bhw-open-print-settings', { detail }));
}

export interface ExecutePrintOptions {
  defaultOrientation?: PrintOrientation | string;
  onBeforePrint?: () => void;
  onAfterPrint?: () => void;
}

/**
 * Helper to execute window.print() ensuring orientation is active and classes are cleanly restored.
 */
export function executePrintWithOrientation(
  optionsOrOrientation?: PrintOrientation | ExecutePrintOptions,
  callbacks?: { onBeforePrint?: () => void; onAfterPrint?: () => void }
) {
  let chosen: PrintOrientation;
  let onBefore: (() => void) | undefined;
  let onAfter: (() => void) | undefined;

  if (typeof optionsOrOrientation === 'string') {
    chosen = optionsOrOrientation;
    onBefore = callbacks?.onBeforePrint;
    onAfter = callbacks?.onAfterPrint;
  } else if (typeof optionsOrOrientation === 'object' && optionsOrOrientation !== null) {
    const raw = optionsOrOrientation.defaultOrientation;
    const saved = getSavedPrintOrientation();
    chosen = (saved === 'landscape' || saved === 'portrait')
      ? saved
      : ((raw === 'landscape' || raw === 'portrait') ? raw : 'portrait');
    onBefore = optionsOrOrientation.onBeforePrint;
    onAfter = optionsOrOrientation.onAfterPrint;
  } else {
    chosen = getSavedPrintOrientation();
    onBefore = callbacks?.onBeforePrint;
    onAfter = callbacks?.onAfterPrint;
  }

  applyPrintOrientation(chosen);

  if (onBefore) {
    onBefore();
  }

  // Small timeout ensures DOM and print stylesheet are completely parsed
  setTimeout(() => {
    window.print();
    if (onAfter) {
      setTimeout(onAfter, 800);
    }
  }, 100);
}

// Automatically apply saved orientation on module initialization
if (typeof window !== 'undefined') {
  applyPrintOrientation(getSavedPrintOrientation());
}
