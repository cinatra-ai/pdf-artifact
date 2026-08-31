import type { ReactElement } from "react";

import type { ByteRoadName } from "./byte-road";
import { DownloadLink } from "./download-link";

/**
 * The shared never-blank floor for the PDF renderer: a host-styled card with a
 * short explanation and the download affordance. Every failure/edge path — no
 * materialized representation, an `<embed>` load error, a react-pdf chunk/eval
 * failure, or an inline-viewer load error — degrades to THIS card rather than a
 * blank panel. The download link itself degrades to a plain note when there is
 * no downloadable content, so the card renders in every state.
 *
 * `road` names the byte road the offered address is on, so the floor says which
 * road it reached the end of rather than leaving the surface to guess.
 */
export function PdfDownloadFloor({
  downloadHref,
  road,
  message = "This PDF can’t be previewed here.",
}: {
  readonly downloadHref: string | null;
  readonly road?: ByteRoadName;
  readonly message?: string;
}): ReactElement {
  return (
    <article
      className="soft-panel rounded-card flex flex-col items-center gap-3 p-6 text-center"
      data-byte-road={road}
    >
      <p className="text-muted-foreground text-sm">{message}</p>
      <DownloadLink downloadHref={downloadHref} />
    </article>
  );
}
