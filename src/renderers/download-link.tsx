import type { ReactElement } from "react";

/**
 * The download affordance shared by the detail floor and the inline-viewer
 * error state. Replaces the host's Button + framework Link + icon-library glyph
 * with a plain, host-styled anchor and an inline SVG so the renderer pulls in no
 * host-internal UI package and no framework router. Same-origin href only — the
 * host builds `downloadHref` as an authorized, access-checked URL.
 *
 * When there is no download href (no materialized representation at all), the
 * affordance degrades to a plain unavailability note rather than a dead link —
 * the panel is still never blank.
 */
export function DownloadLink({
  downloadHref,
}: {
  readonly downloadHref: string | null;
}): ReactElement {
  if (downloadHref === null) {
    return (
      <p className="text-muted-foreground text-sm">
        This document has no downloadable content.
      </p>
    );
  }
  return (
    <a href={downloadHref} download className="btn-outline inline-flex items-center gap-2">
      <svg
        data-icon="inline-start"
        aria-hidden="true"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Download PDF
    </a>
  );
}
