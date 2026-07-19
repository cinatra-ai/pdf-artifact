/**
 * Tests for the migrated PDF renderer. Node-env (no jsdom — the renderer JSX is
 * asserted structurally, matching the host's PDF-handler test convention):
 *   1. pure unit matrix for `needsPdfInlineFallback` / `isIosUserAgent`;
 *   2. source assertions pinning the ported structural guarantees (embed path
 *      kept, code-split react-pdf fallback, worker from our origin, layers off,
 *      polyfill order, never-blank floor);
 *   3. manifest contract: the package claims EXACTLY `application/pdf`, ships a
 *      well-formed v1 `ui` block, and `src/index.ts` mirrors the package.json
 *      descriptor.
 */
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

import { pdfArtifactManifest } from "../src/index";
import {
  isIosUserAgent,
  needsPdfInlineFallback,
} from "../src/renderers/pdf-inline-support";

const DETAIL_SOURCE = readFileSync("src/renderers/pdf-detail.tsx", "utf-8");
const VIEWER_SOURCE = readFileSync(
  "src/renderers/pdf-fallback-viewer.tsx",
  "utf-8",
);
const LOADER_SOURCE = readFileSync(
  "src/renderers/pdf-fallback-loader.tsx",
  "utf-8",
);
const PREVIEW_SOURCE = readFileSync("src/renderers/pdf-preview.tsx", "utf-8");
const PKG = JSON.parse(readFileSync("package.json", "utf-8")) as {
  name: string;
  license: string;
  dependencies: Record<string, string>;
  cinatra: {
    kind: string;
    apiVersion: string;
    displayName: string;
    vendor?: { key: string; name: string };
    artifact: {
      accepts: { file?: { mimeTypes: string[] } };
      objectTypes?: Array<{
        type: string;
        claim: string;
        dispositions?: {
          projection?: string;
          pinnable?: boolean;
          snapshotPolicy?: string;
          sensitivity?: string;
          mutability?: string;
        };
        schema?: {
          type?: string;
          properties?: Record<string, unknown>;
          additionalProperties?: boolean;
        };
      }>;
      ui?: {
        abiVersion: number;
        sdkAbiRange: string;
        renderers: Record<
          string,
          { entry: string; propsApiVersion: number; representations?: string[] }
        >;
      };
    };
  };
};

const UA = {
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.6422.51 Mobile/15E148 Safari/604.1",
  ipadLegacy:
    "Mozilla/5.0 (iPad; CPU OS 15_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.8 Mobile/15E148 Safari/604.1",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  windowsChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.52 Mobile Safari/537.36",
} as const;

describe("isIosUserAgent", () => {
  it("matches iPhone / iPad / iOS-Chrome user agents", () => {
    expect(isIosUserAgent(UA.iphoneSafari)).toBe(true);
    expect(isIosUserAgent(UA.iphoneChrome)).toBe(true);
    expect(isIosUserAgent(UA.ipadLegacy)).toBe(true);
  });

  it("does not match desktop user agents (incl. real Macs)", () => {
    expect(isIosUserAgent(UA.macSafari)).toBe(false);
    expect(isIosUserAgent(UA.windowsChrome)).toBe(false);
    expect(isIosUserAgent(UA.androidChrome)).toBe(false);
  });
});

describe("needsPdfInlineFallback", () => {
  it("always falls back on iOS UAs — even if pdfViewerEnabled claims true", () => {
    for (const pdfViewerEnabled of [true, false, undefined]) {
      expect(
        needsPdfInlineFallback({
          userAgent: UA.iphoneSafari,
          maxTouchPoints: 5,
          pdfViewerEnabled,
        }),
      ).toBe(true);
    }
  });

  it("falls back on iPadOS masquerading as a Mac (touch points)", () => {
    expect(
      needsPdfInlineFallback({
        userAgent: UA.macSafari,
        maxTouchPoints: 5,
        pdfViewerEnabled: true,
      }),
    ).toBe(true);
  });

  it("keeps the embed on a real Mac (no touch points)", () => {
    expect(
      needsPdfInlineFallback({
        userAgent: UA.macSafari,
        maxTouchPoints: 0,
        pdfViewerEnabled: true,
      }),
    ).toBe(false);
  });

  it("keeps the embed on desktop Chrome with an inline viewer", () => {
    expect(
      needsPdfInlineFallback({
        userAgent: UA.windowsChrome,
        maxTouchPoints: 0,
        pdfViewerEnabled: true,
      }),
    ).toBe(false);
  });

  it("ignores touch points on non-Macintosh UAs (touch-screen Windows laptop)", () => {
    expect(
      needsPdfInlineFallback({
        userAgent: UA.windowsChrome,
        maxTouchPoints: 10,
        pdfViewerEnabled: true,
      }),
    ).toBe(false);
  });

  it("falls back when the engine reports pdfViewerEnabled === false (Android Chrome)", () => {
    expect(
      needsPdfInlineFallback({
        userAgent: UA.androidChrome,
        maxTouchPoints: 5,
        pdfViewerEnabled: false,
      }),
    ).toBe(true);
  });

  it("keeps the embed when the capability signal is absent on desktop", () => {
    expect(
      needsPdfInlineFallback({
        userAgent: UA.windowsChrome,
        maxTouchPoints: 0,
        pdfViewerEnabled: undefined,
      }),
    ).toBe(false);
  });
});

describe("pdf-detail source contract", () => {
  it("keeps the lightweight <embed type=\"application/pdf\"> path", () => {
    expect(DETAIL_SOURCE).toMatch(/^"use client";/);
    expect(DETAIL_SOURCE).toMatch(/<embed/);
    expect(DETAIL_SOURCE).toMatch(/type="application\/pdf"/);
    expect(DETAIL_SOURCE).toMatch(/aria-label="PDF preview"/);
  });

  it("does NOT statically import react-pdf (the chunk must stay lazy)", () => {
    expect(DETAIL_SOURCE).not.toMatch(/from\s+"react-pdf"/);
    expect(DETAIL_SOURCE).not.toMatch(/from\s+"pdfjs-dist/);
  });

  it("routes EVERY non-embed path to a never-blank floor", () => {
    // no materialized representation, and a fired <embed> onError, both floor.
    expect(DETAIL_SOURCE).toMatch(/previewHref === null/);
    expect(DETAIL_SOURCE).toMatch(/PdfDownloadFloor/);
    expect(DETAIL_SOURCE).toMatch(/PdfInlineFallback/);
    expect(DETAIL_SOURCE).toMatch(/onError=\{\(\) => setEmbedFailed\(true\)\}/);
    expect(DETAIL_SOURCE).toMatch(/embedFailed/);
  });
});

describe("pdf-fallback-loader source contract", () => {
  it("reaches the heavy viewer only through a dynamic import (React.lazy), client-only", () => {
    expect(LOADER_SOURCE).toMatch(/^"use client";/);
    expect(LOADER_SOURCE).toMatch(
      /lazy\(\(\) => import\("\.\/pdf-fallback-viewer"\)\)/,
    );
    // ssr:false equivalent — gated behind a mount flag.
    expect(LOADER_SOURCE).toMatch(/setMounted\(true\)/);
  });

  it("isolates a lazy-import / module-eval failure to the download floor (never-blank)", () => {
    // A rejected import() or a viewer module-eval throw must degrade to the
    // floor here, not propagate past the renderer and blank the whole panel.
    expect(LOADER_SOURCE).toMatch(/getDerivedStateFromError/);
    expect(LOADER_SOURCE).toMatch(/PdfDownloadFloor/);
  });
});

describe("pdf-fallback-viewer source contract", () => {
  it("serves the pdf.js worker from our origin via import.meta.url — never a remote host", () => {
    expect(VIEWER_SOURCE).toMatch(
      /new URL\(\s*"pdfjs-dist\/build\/pdf\.worker\.min\.mjs",\s*import\.meta\.url,?\s*\)/,
    );
    expect(VIEWER_SOURCE).not.toMatch(/https?:\/\//);
  });

  it("evaluates the Promise.withResolvers polyfill before react-pdf", () => {
    const polyfillAt = VIEWER_SOURCE.indexOf(
      '"./pdf-promise-with-resolvers-polyfill"',
    );
    const reactPdfAt = VIEWER_SOURCE.indexOf('"react-pdf"');
    expect(polyfillAt).toBeGreaterThan(-1);
    expect(reactPdfAt).toBeGreaterThan(-1);
    expect(polyfillAt).toBeLessThan(reactPdfAt);
  });

  it("bounds per-page work: layers off, devicePixelRatio capped, batched pages", () => {
    expect(VIEWER_SOURCE).toMatch(/renderTextLayer=\{false\}/);
    expect(VIEWER_SOURCE).toMatch(/renderAnnotationLayer=\{false\}/);
    expect(VIEWER_SOURCE).toMatch(/MAX_DEVICE_PIXEL_RATIO/);
    expect(VIEWER_SOURCE).toMatch(/PAGE_BATCH_SIZE/);
  });

  it("offers the passed-in download link on failure (never derives the download url)", () => {
    expect(VIEWER_SOURCE).toMatch(/downloadHref/);
    expect(VIEWER_SOURCE).not.toMatch(/replace\([^)]*preview/);
  });

  it("imports no host-internal (@/...) module and no framework router", () => {
    for (const src of [DETAIL_SOURCE, VIEWER_SOURCE, LOADER_SOURCE, PREVIEW_SOURCE]) {
      expect(src).not.toMatch(/from\s+"@\//);
      expect(src).not.toMatch(/from\s+"next\//);
    }
  });
});

describe("pdf-preview source contract", () => {
  it("renders a compact, never-blank card (title fallback + optional open link)", () => {
    expect(PREVIEW_SOURCE).toMatch(/artifact\.title \?\? "PDF document"/);
    expect(PREVIEW_SOURCE).toMatch(/openHref !== null/);
  });
});

describe("manifest contract", () => {
  const artifact = PKG.cinatra.artifact;

  it("is an Apache-2.0 artifact named @cinatra-ai/pdf-artifact", () => {
    expect(PKG.name).toBe("@cinatra-ai/pdf-artifact");
    expect(PKG.license).toBe("Apache-2.0");
    expect(PKG.cinatra.kind).toBe("artifact");
    expect(PKG.cinatra.apiVersion).toBe("cinatra.ai/v1");
    expect(PKG.cinatra.displayName).toBe("PDF");
    expect(PKG.cinatra.vendor).toEqual({ key: "cinatra-ai", name: "Cinatra" });
  });

  it("claims EXACTLY application/pdf and nothing else", () => {
    expect(artifact.accepts.file?.mimeTypes).toEqual(["application/pdf"]);
  });

  it("ships a well-formed v1 ui block for the detail + preview slots", () => {
    const ui = artifact.ui;
    expect(ui).toBeDefined();
    if (!ui) return;
    expect(ui.abiVersion).toBe(1);
    // Generated caret range over the canonical SDK ABI.
    expect(ui.sdkAbiRange).toBe("^2.4.0");
    expect(Object.keys(ui.renderers).sort()).toEqual(["detail", "preview"]);
    for (const slot of ["detail", "preview"] as const) {
      const r = ui.renderers[slot];
      expect(r.entry.startsWith("./src/renderers/")).toBe(true);
      expect(r.entry.endsWith(".tsx")).toBe(true);
      expect(r.propsApiVersion).toBe(1);
      expect(r.representations).toEqual(["application/pdf"]);
    }
  });

  it("declares react-pdf + pdfjs-dist and pins pdfjs-dist to the exact version react-pdf expects", () => {
    // Version parity: react-pdf and the standalone pdfjs-dist pin must resolve to
    // ONE pdfjs instance, or the inline fallback throws "API version does not
    // match Worker version". react-pdf@10 depends on pdfjs-dist 5.4.296.
    // react-pdf is pinned EXACTLY (not a caret range): react-pdf@10.4.1 depends
    // on pdfjs-dist 5.4.296, and the standalone pin matches, so exactly one
    // pdfjs instance resolves. A caret would let a later react-pdf pull a
    // different pdfjs and reintroduce the two-instance worker mismatch.
    expect(PKG.dependencies["react-pdf"]).toBe("10.4.1");
    expect(PKG.dependencies["pdfjs-dist"]).toBe("5.4.296");
  });

  // The typed `pdfArtifactManifest` export mirrors the `accepts` + `ui`
  // renderer contract of the authoritative package.json descriptor. The
  // uploaded-PDF `objectTypes` claim is declared ONLY in package.json (the host
  // object-registry bridge reads it there — matching audio/video/image); it is
  // NOT carried on the SDK-typed const, so the agreement is over accepts + ui.
  // The package.json claim SHAPE is asserted by the objectType tests below.
  it("keeps the typed src manifest in agreement with package.json", () => {
    expect(pdfArtifactManifest.accepts).toEqual(artifact.accepts);
    expect(pdfArtifactManifest.ui).toEqual(artifact.ui);
    // The typed const does NOT re-declare objectTypes (package.json is the
    // single source for the claim); guard the outlier from creeping back.
    expect("objectTypes" in pdfArtifactManifest).toBe(false);
  });

  // Upload-typing ruling (epic cinatra#1785; owner entry 106-B). This system
  // base is REQUIRED to declare exactly one concrete objectType, or a human
  // `application/pdf` upload maps (by MIME) to this pack and then resolves to
  // NO type post-#1824 (the `${extension}:artifact` umbrella is retired). The
  // old pure-renderer model — accepts + renderers with no owned type — is dead;
  // these assertions pin the new model.
  it("declares exactly one dedicated objectType for the uploaded PDF document", () => {
    const types = artifact.objectTypes;
    expect(types).toBeDefined();
    if (!types) return;
    expect(types).toHaveLength(1);
    const doc = types[0];
    // Self-namespaced (@scope/package:local-id) so the third-party
    // schema-source rule is satisfied without a new cinatra.dependencies entry.
    expect(doc.type).toBe("@cinatra-ai/pdf-artifact:document");
    expect(doc.claim).toBe("dedicated");
  });

  it("gives the uploaded-PDF type upload-safe, immutable-record dispositions", () => {
    const doc = artifact.objectTypes?.[0];
    expect(doc?.dispositions).toEqual({
      projection: "artifact-safe",
      pinnable: true,
      snapshotPolicy: "content",
      sensitivity: "normal",
      // An uploaded PDF is a fixed file, not an editable draft and not a live
      // third-party record: `record`.
      mutability: "record",
    });
  });

  it("ships an inline JSON Schema for the persisted uploaded-object metadata", () => {
    const schema = artifact.objectTypes?.[0]?.schema;
    expect(schema).toBeDefined();
    if (!schema) return;
    expect(schema.type).toBe("object");
    // File metadata as persisted by the host upload path
    // (createUploadedArtifact -> createSemanticArtifact): title, mime, size,
    // and the resource + representation-revision storage references.
    expect(Object.keys(schema.properties ?? {}).sort()).toEqual([
      "createdByRunId",
      "mime",
      "representationRevisionId",
      "resourceId",
      "sizeBytes",
      "title",
    ]);
    // Open shape — host enrichment fields do not force a manifest bump.
    expect(schema.additionalProperties).toBe(true);
  });
});
