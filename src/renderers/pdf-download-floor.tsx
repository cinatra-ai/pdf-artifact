import type { ReactElement } from "react";

import { DownloadLink } from "./download-link";

/**
 * The shared never-blank floor for the PDF renderer: a host-styled card with a
 * short explanation and the download affordance. Every failure/edge path — no
 * materialized representation, an `<embed>` load error, a react-pdf chunk/eval
 * failure, or an inline-viewer load error — degrades to THIS card rather than a
 * blank panel. The download link itself degrades to a plain note when there is
 * no downloadable content, so the card renders in every state.
 */
export function PdfDownloadFloor({
  downloadHref,
  message = "This PDF can’t be previewed here.",
}: {
  readonly downloadHref: string | null;
  readonly message?: string;
}): ReactElement {
  return (
    <article className="soft-panel rounded-card flex flex-col items-center gap-3 p-6 text-center">
      <p className="text-muted-foreground text-sm">{message}</p>
      <DownloadLink downloadHref={downloadHref} />
    </article>
  );
}
