"use client";

/**
 * PDF detail renderer (the `detail` slot).
 *
 * Migrates the host's PDF handler UX unchanged:
 *
 *   Default path: `<embed type="application/pdf">` so the browser's bundled PDF
 *   viewer handles rendering + scrolling. Range requests on the preview URL make
 *   this stream-friendly (browsers issue `Range: bytes=0-1` first, then
 *   incremental ranges as the user scrolls). No heavy client JS.
 *
 *   Inline fallback: engines that do not render `<embed>` PDFs inline (iOS
 *   WebKit; engines reporting `navigator.pdfViewerEnabled === false`) mount the
 *   code-split react-pdf viewer instead. `needsPdfInlineFallback` runs after
 *   mount with the full client signal set (iPadOS-as-Mac touch points +
 *   `navigator.pdfViewerEnabled`); the server render defaults to the `<embed>`
 *   path, and the first client pass corrects it in either direction through the
 *   hydration-safe `useSyncExternalStore` handoff (no setState-in-effect).
 *
 * THE ADDRESS COMES FROM THE BYTE ROAD. An embedding element's load is a
 * subresource request and inside a third-party application it carries no
 * cookie, so a viewer pointed at the host's session route draws a blank plate
 * there. At props version 2 the snapshot carries the byte reference the reader
 * may actually fetch on the surface they are on, and this renderer paints from
 * it; a snapshot built at the older version has no reference, falls back to the
 * session href, and still draws. THE PREVIEWER ITSELF IS UNCHANGED — the embed
 * path, the code-split inline fallback and the download floor are the same
 * shell, reading a different address.
 *
 * Never-blank floor: when no road carries a previewable address, the renderer
 * skips straight to the download-link floor — the same terminal state the
 * inline viewer degrades to on any load error — so a malformed or unrenderable
 * document is never a blank panel.
 *
 * The renderer requests no host ports: it reads only the authorized props
 * snapshot, builds no address of its own, and fetches nothing itself.
 */

import { useState, useSyncExternalStore } from "react";
import type { ReactElement } from "react";

import { resolveByteRoad } from "./byte-road";
import { PdfDownloadFloor } from "./pdf-download-floor";
import { PdfInlineFallback } from "./pdf-fallback-loader";
import { needsPdfInlineFallback } from "./pdf-inline-support";
import type { ArtifactRendererProps } from "./renderer-props";

// The capability signals cannot change within a session — subscribe is a no-op;
// `useSyncExternalStore` is only here so the server-snapshot → client-snapshot
// handoff happens through React's hydration-safe path.
const subscribeNever = (): (() => void) => () => {};

function detectFallbackOnClient(): boolean {
  return needsPdfInlineFallback({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    pdfViewerEnabled:
      typeof navigator.pdfViewerEnabled === "boolean"
        ? navigator.pdfViewerEnabled
        : undefined,
  });
}

export default function PdfDetailRenderer(props: ArtifactRendererProps): ReactElement {
  const bytes = resolveByteRoad(props);
  const previewHref = bytes.preview;
  const downloadHref = bytes.download;

  // Server render + hydration default to the lightweight `<embed>` path; the
  // first client pass swaps to the full-signal detection. Both snapshots are
  // stable primitives, so this can never loop.
  const useFallback = useSyncExternalStore(
    subscribeNever,
    detectFallbackOnClient,
    () => false,
  );

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

  if (useFallback) {
    return (
      <PdfInlineFallback
        previewHref={previewHref}
        downloadHref={downloadHref}
        road={bytes.road}
      />
    );
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
