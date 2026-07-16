/**
 * Inline-PDF capability detection for the PDF renderer.
 *
 * Pure and dependency-free so it is usable from both the initial render and the
 * post-mount client check: the renderer calls `needsPdfInlineFallback` after
 * mount with the full signal set (touch points + `navigator.pdfViewerEnabled`)
 * to decide whether the browser can render `<embed type="application/pdf">`
 * inline, and corrects the default hint in either direction.
 *
 * Decision order (deliberate):
 *   1. iOS WebKit first, unconditionally. Every iOS browser is WebKit and none
 *      of them reliably render `<embed type="application/pdf">` inline (a single
 *      non-scrollable page or a download prompt instead). `pdfViewerEnabled` is
 *      NOT trusted here because it reflects top-level PDF navigation support,
 *      which iOS Safari has — the embed path is what is broken.
 *   2. `pdfViewerEnabled === false` next — the standardized capability signal.
 *      This also catches non-iOS engines that download instead of rendering
 *      inline (e.g. Android Chrome).
 *   3. Everything else keeps the lightweight `<embed>` path, including older
 *      desktop browsers where the property is undefined.
 */

export type PdfInlineSupportInput = {
  readonly userAgent: string;
  /** `navigator.maxTouchPoints` — 0 when unknown. */
  readonly maxTouchPoints: number;
  /** `navigator.pdfViewerEnabled`; undefined when the browser lacks it. */
  readonly pdfViewerEnabled?: boolean;
};

/**
 * Classic iOS UA detection (UA string only). iPadOS 13+ masquerades as macOS
 * and is NOT caught here; the client check below adds the touch-points signal
 * for that case.
 */
export function isIosUserAgent(userAgent: string): boolean {
  return /\b(?:iPad|iPhone|iPod)\b/.test(userAgent);
}

/**
 * iPadOS 13+ reports a desktop "Macintosh" UA but, unlike any real Mac, exposes
 * a multi-touch screen.
 */
function isIpadOsMasqueradingAsMac(input: PdfInlineSupportInput): boolean {
  return input.userAgent.includes("Macintosh") && input.maxTouchPoints > 1;
}

export function needsPdfInlineFallback(input: PdfInlineSupportInput): boolean {
  if (isIosUserAgent(input.userAgent) || isIpadOsMasqueradingAsMac(input)) {
    return true;
  }
  if (input.pdfViewerEnabled === false) {
    return true;
  }
  return false;
}
