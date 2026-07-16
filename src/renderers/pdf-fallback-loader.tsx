"use client";

/**
 * Client-only, code-split, failure-isolated loader for the react-pdf inline
 * fallback.
 *
 * The heavy react-pdf + pdfjs chunk is reached ONLY through a dynamic `import()`
 * (React.lazy), so the `<embed>` path never downloads it — the extension-side
 * equivalent of the host handler's `next/dynamic(() => import(...), { ssr:
 * false })` "heavy components dynamically imported" guardrail.
 *
 * The `ssr: false` half is reproduced by gating the lazy component behind a
 * mount flag: react-pdf touches `window` and starts a Web Worker, so it must
 * never evaluate during server rendering. Until the component mounts on the
 * client, a lightweight skeleton stands in — never a blank panel.
 *
 * Failure isolation (never-blank): a rejected dynamic `import()` (chunk load
 * failure) or a throw during the viewer's module evaluation would otherwise
 * propagate past this renderer to the host's route-segment error boundary,
 * blanking the whole panel. A LOCAL error boundary catches those and degrades to
 * the download floor, keeping the failure contained to this PDF panel.
 */

import { Component, Suspense, lazy, useEffect, useState } from "react";
import type { ErrorInfo, ReactElement, ReactNode } from "react";

import { PdfDownloadFloor } from "./pdf-download-floor";

const PdfFallbackViewer = lazy(() => import("./pdf-fallback-viewer"));

function Skeleton(): ReactElement {
  return (
    <article className="soft-panel rounded-card p-6">
      <p className="text-muted-foreground text-sm">Loading PDF preview…</p>
    </article>
  );
}

class LazyViewerBoundary extends Component<
  { readonly downloadHref: string | null; readonly children: ReactNode },
  { readonly failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo): void {
    // Sanitized: the specific error is not surfaced to the user (a chunk-load or
    // module-eval failure is not actionable here); the floor is.
    void error;
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <PdfDownloadFloor
          downloadHref={this.props.downloadHref}
          message="This PDF can’t be previewed inline on this device."
        />
      );
    }
    return this.props.children;
  }
}

export function PdfInlineFallback({
  previewHref,
  downloadHref,
}: {
  readonly previewHref: string;
  readonly downloadHref: string | null;
}): ReactElement {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Skeleton />;
  }

  return (
    <LazyViewerBoundary downloadHref={downloadHref}>
      <Suspense fallback={<Skeleton />}>
        <PdfFallbackViewer previewHref={previewHref} downloadHref={downloadHref} />
      </Suspense>
    </LazyViewerBoundary>
  );
}
