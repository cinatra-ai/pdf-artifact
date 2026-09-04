/**
 * THE PDF DISPLAY IS THE EMBEDDED VIEWER AND ITS DOWNLOAD FLOOR — AND NOTHING
 * ELSE (wave 3 of the review plan, cinatra#3091).
 *
 * THE RATIFIED DRAWING, VERBATIM (the review drawing §XI.2): "Over pdf the
 * shell is the embedded PDF viewer the pdf extension already mounts, and both of
 * its readings are that extension's own: the embedded viewer, where the
 * browser's bundled viewer fills the panel and does its own scrolling, so the
 * display adds no page counter, no Previous and no Next; and that extension's
 * download floor, where there is no preview to show, so the panel is never
 * blank." And, closing it: "no renderer of ours paints a document's pages."
 *
 * §XI.4 says the same for a deck: "The same two readings hold as anywhere else:
 * the embedded viewer, and the download floor beneath it where there is no
 * preview to show."
 *
 * TWO READINGS. NOT THREE. This package shipped a third — a canvas viewer
 * mounted whenever a client engine reported it could not inline an embed
 * element. That reading paints the document's pages with a renderer of ours,
 * which is the one thing the sentence above forbids, and a proof round measured
 * it doing exactly that on the artifact page: canvas 2, embed 0, iframe 0.
 *
 * These assertions are the gate that keeps the third reading off the road. They
 * are source-level on purpose: this package's own convention (see
 * pdf-renderer.test.ts) is to pin the renderer's structure from its source in a
 * node environment, and a canvas viewer that is never imported can never be
 * mounted.
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const RENDERER_DIR = "src/renderers";
const DETAIL_SOURCE = readFileSync(`${RENDERER_DIR}/pdf-detail.tsx`, "utf-8");
const rendererModules = (): string[] => readdirSync(RENDERER_DIR).sort();
const rendererSources = (): string[] =>
  rendererModules().map((f) => readFileSync(`${RENDERER_DIR}/${f}`, "utf-8"));
const PKG = JSON.parse(readFileSync("package.json", "utf-8")) as {
  dependencies?: Record<string, string>;
};

describe("no renderer of ours paints a document's pages", () => {
  it("ships no page-painting viewer module at all", () => {
    const modules = rendererModules();
    expect(modules).not.toContain("pdf-fallback-viewer.tsx");
    expect(modules).not.toContain("pdf-fallback-loader.tsx");
    expect(modules).not.toContain("pdf-promise-with-resolvers-polyfill.ts");
  });

  it("imports no page-rendering library anywhere in the renderer directory", () => {
    for (const src of rendererSources()) {
      expect(src).not.toMatch(/from\s+"react-pdf"/);
      expect(src).not.toMatch(/from\s+"pdfjs-dist/);
      expect(src).not.toMatch(/import\("\.\/pdf-fallback-viewer"\)/);
    }
  });

  it("declares no page-rendering dependency, so none can be pulled back in", () => {
    const deps = PKG.dependencies ?? {};
    expect(Object.keys(deps)).not.toContain("react-pdf");
    expect(Object.keys(deps)).not.toContain("pdfjs-dist");
  });

  it("draws no canvas element of its own", () => {
    for (const src of rendererSources()) {
      expect(src).not.toMatch(/<canvas[\s/>]/);
    }
  });
});

describe("the detail display has exactly the drawing's two readings", () => {
  it("mounts the browser's own embedded viewer over the preview address", () => {
    expect(DETAIL_SOURCE).toMatch(/<embed/);
    expect(DETAIL_SOURCE).toMatch(/type="application\/pdf"/);
    expect(DETAIL_SOURCE).toMatch(/data-byte-road=\{bytes\.road\}/);
  });

  it("floors where there is no preview to show, and where the embed refused", () => {
    expect(DETAIL_SOURCE).toMatch(/previewHref === null/);
    expect(DETAIL_SOURCE).toMatch(/embedFailed/);
    expect(DETAIL_SOURCE).toMatch(/PdfDownloadFloor/);
  });

  it("branches on nothing else — no engine-capability third road", () => {
    expect(DETAIL_SOURCE).not.toMatch(/PdfInlineFallback/);
    expect(DETAIL_SOURCE).not.toMatch(/needsPdfInlineFallback/);
    expect(DETAIL_SOURCE).not.toMatch(/useFallback/);
    expect(DETAIL_SOURCE).not.toMatch(/pdfViewerEnabled/);
    expect(DETAIL_SOURCE).not.toMatch(/useSyncExternalStore/);
  });
});

describe("the floor reads the drawing's own words", () => {
  const FLOOR_SOURCE = readFileSync(`${RENDERER_DIR}/pdf-download-floor.tsx`, "utf-8");
  const LINK_SOURCE = readFileSync(`${RENDERER_DIR}/download-link.tsx`, "utf-8");

  // "No preview to show — the floor that is never blank": the drawing writes the
  // sentence out, and it writes it in full words.
  it("says what the drawing says where there is no preview to show", () => {
    expect(FLOOR_SOURCE).toContain("This PDF cannot be previewed here.");
  });

  it("offers the download the drawing draws beneath it", () => {
    expect(LINK_SOURCE).toContain("Download PDF");
  });
});
