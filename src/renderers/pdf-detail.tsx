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
 * Never-blank floor: when there is no materialized representation to preview
 * (`urls.preview === null`), the renderer skips straight to the download-link
 * floor — the same terminal state the inline viewer degrades to on any load
 * error — so a malformed or unrenderable document is never a blank panel.
 *
 * A v1 renderer requests no host ports: it reads only the authorized props
 * snapshot (`urls.preview` / `urls.download`), never a host closure.
 */

import { useState, useSyncExternalStore } from "react";
import type { ReactElement } from "react";

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

export default function PdfDetailRenderer({
  urls,
}: ArtifactRendererProps): ReactElement {
  const previewHref = urls.preview;
  const downloadHref = urls.download;

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

  // No materialized representation — go straight to the never-blank floor.
  if (previewHref === null) {
    return <PdfDownloadFloor downloadHref={downloadHref} />;
  }

  if (embedFailed) {
    return <PdfDownloadFloor downloadHref={downloadHref} />;
  }

  if (useFallback) {
    return (
      <PdfInlineFallback previewHref={previewHref} downloadHref={downloadHref} />
    );
  }

  return (
    <article className="soft-panel rounded-card overflow-hidden p-0">
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
