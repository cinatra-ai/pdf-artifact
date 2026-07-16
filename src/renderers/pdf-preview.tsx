/**
 * PDF preview renderer (the `preview` slot).
 *
 * The neutral inline-preview capability consumed by in-core reuse sites: a
 * compact, always-safe card identifying the document — a PDF badge, the row
 * title, the media type, and an open/download affordance. It renders from the
 * authorized props snapshot only (no host ports, no heavy viewer chunk), so it
 * is cheap to place inline anywhere a PDF row is summarized.
 *
 * Never-blank floor: title falls back to a generic label, and the open
 * affordance is dropped (not rendered as a dead link) when neither a preview nor
 * a download URL is available — the card still renders.
 */

import type { ReactElement } from "react";

import type { ArtifactRendererProps } from "./renderer-props";

export default function PdfPreviewRenderer({
  artifact,
  urls,
}: ArtifactRendererProps): ReactElement {
  const title = artifact.title ?? "PDF document";
  const openHref = urls.preview ?? urls.download;

  return (
    <article className="soft-panel rounded-card flex items-center gap-3 p-4">
      <span
        aria-hidden="true"
        className="bg-muted text-muted-foreground rounded-card inline-flex shrink-0 items-center justify-center px-2 py-1 text-xs font-semibold"
      >
        PDF
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={title}>
          {title}
        </p>
        <p className="text-muted-foreground text-xs">application/pdf</p>
      </div>
      {openHref !== null ? (
        <a
          href={openHref}
          className="btn-outline shrink-0"
          aria-label={`Open ${title}`}
        >
          Open
        </a>
      ) : null}
    </article>
  );
}
