"use client";

/**
 * PDF detail renderer (the `detail` slot).
 *
 * TWO READINGS, AND THE DRAWING GIVES NO THIRD (the review drawing §XI.2,
 * §XI.4; wave 3 of the review plan, cinatra#3091):
 *
 *   THE EMBEDDED VIEWER. `<embed type="application/pdf">` over the authorized
 *   preview address, so "the browser's bundled viewer fills the panel and does
 *   its own scrolling" and "the display adds no page counter, no Previous and
 *   no Next". Range requests on that address make it stream-friendly, and no
 *   heavy client code is shipped to read a document.
 *
 *   THE DOWNLOAD FLOOR. "Where there is no preview to show, so the panel is
 *   never blank": no previewable address on any road, or an embed the engine
 *   refused to load.
 *
 * WHAT IS NOT HERE ANY MORE, AND WHY. This renderer used to carry a third
 * reading — a code-split canvas viewer mounted whenever a client engine
 * reported it could not inline an embed element. The drawing closes that road
 * in one sentence: "no renderer of ours paints a document's pages." A proof
 * round measured the third reading winning on the artifact page (canvas 2,
 * embed 0), so it is removed rather than narrowed: the engine-capability
 * detection, the lazy loader, the canvas viewer and the page-rendering
 * dependencies are all gone, and `tests/embedded-viewer-only.test.ts` is the
 * gate that keeps them gone.
 *
 * THE ADDRESS COMES FROM THE BYTE ROAD. An embedding element's load is a
 * subresource request and inside a third-party application it carries no
 * cookie, so a viewer pointed at the host's session route draws a blank plate
 * there. At props version 2 the snapshot carries the byte reference the reader
 * may actually fetch on the surface they are on, and this renderer paints from
 * it; a snapshot built at the older version has no reference, falls back to the
 * session href, and still draws. Every reading says which road it came in on.
 *
 * The renderer requests no host ports: it reads only the authorized props
 * snapshot, builds no address of its own, and fetches nothing itself.
 */

import { useState } from "react";
import type { ReactElement } from "react";

import { resolveByteRoad } from "./byte-road";
import { PdfDownloadFloor } from "./pdf-download-floor";
import type { ArtifactRendererProps } from "./renderer-props";

export default function PdfDetailRenderer(props: ArtifactRendererProps): ReactElement {
  const bytes = resolveByteRoad(props);
  const previewHref = bytes.preview;
  const downloadHref = bytes.download;

  // A best-effort signal for engines that DO fire `<embed>` onError on a
  // failed/malformed PDF (support is inconsistent — where the browser does not
  // fire it, its own in-embed error UI stands in, still not a blank panel).
  const [embedFailed, setEmbedFailed] = useState(false);

  // No previewable address on any road — go straight to the never-blank floor.
  if (previewHref === null) {
    return <PdfDownloadFloor downloadHref={downloadHref} road={bytes.road} />;
  }

  if (embedFailed) {
    return <PdfDownloadFloor downloadHref={downloadHref} road={bytes.road} />;
  }

  return (
    <article
      className="soft-panel rounded-card overflow-hidden p-0"
      data-byte-road={bytes.road}
    >
      <embed
        src={previewHref}
        type="application/pdf"
        // 75vh so the embed fills most of the viewport without forcing the page
        // to scroll; the embed's own viewer handles PDF scrolling.
        className="h-[75vh] w-full"
        aria-label="PDF preview"
        onError={() => setEmbedFailed(true)}
      />
    </article>
  );
}
