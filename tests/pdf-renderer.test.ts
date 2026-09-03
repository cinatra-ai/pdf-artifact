/**
 * Tests for the migrated PDF renderer. Node-env (no jsdom — the renderer JSX is
 * asserted structurally, matching the host's PDF-handler test convention):
 *   1. the byte-road resolution the display paints from;
 *   2. source assertions pinning the ported structural guarantees (embed path
 *      kept, never-blank floor);
 *   3. manifest contract: the package claims EXACTLY `application/pdf`, ships a
 *      well-formed v1 `ui` block, and `src/index.ts` mirrors the package.json
 *      descriptor.
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

import { pdfArtifactManifest } from "../src/index";
import {
  ARTIFACT_RENDERER_PROPS_API_VERSION,
  ARTIFACT_RENDERER_PROPS_BYTE_REFERENCE_VERSION,
} from "../src/renderers/renderer-props";
import { resolveByteRoad } from "../src/renderers/byte-road";

const DETAIL_SOURCE = readFileSync("src/renderers/pdf-detail.tsx", "utf-8");
const PREVIEW_SOURCE = readFileSync("src/renderers/pdf-preview.tsx", "utf-8");
const PKG = JSON.parse(readFileSync("package.json", "utf-8")) as {
  name: string;
  license: string;
  dependencies?: Record<string, string>;
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

const PKG_EXPORTS = (
  JSON.parse(readFileSync("package.json", "utf-8")) as {
    exports: Record<string, unknown>;
  }
).exports;




describe("the pdf display reads its bytes through the byte reference", () => {
  const ISLAND = "/api/lifecycle-views/artifact-bytes?bc=sealed-preview";
  const SESSION = "/api/artifacts/art_1/versions/rev_1/preview";

  it("declares the byte-road props version on every slot, mirror and manifest agreeing", () => {
    expect(ARTIFACT_RENDERER_PROPS_API_VERSION).toBe(2);
    expect(ARTIFACT_RENDERER_PROPS_BYTE_REFERENCE_VERSION).toBe(2);
    for (const slot of ["detail", "preview"] as const) {
      expect(pdfArtifactManifest.ui.renderers[slot]?.propsApiVersion).toBe(2);
      expect(PKG.cinatra.artifact.ui?.renderers[slot].propsApiVersion).toBe(2);
    }
  });

  it("resolves the island address, never the cookie-gated session route", () => {
    expect(
      resolveByteRoad({
        propsApiVersion: 2,
        urls: { preview: SESSION, download: "/session-dl" },
        actions: { download: "/session-dl" },
        bytes: { road: "island", preview: ISLAND, download: "/island-dl" },
      }),
    ).toEqual({ road: "island", preview: ISLAND, download: "/island-dl" });
  });

  it("falls back to the session href on an older snapshot, and floors on neither", () => {
    expect(
      resolveByteRoad({ propsApiVersion: 1, urls: { preview: SESSION, download: null } }),
    ).toMatchObject({ road: "session", preview: SESSION });
    expect(
      resolveByteRoad({ propsApiVersion: 1, urls: { preview: null, download: null } }),
    ).toMatchObject({ road: "none" });
  });

  it("takes BOTH slots' addresses off the byte road and neither off urls directly", () => {
    // The shell is unchanged; only where it reads its address moved. Reading
    // `urls` in either renderer would put a cookie-gated route on the island.
    for (const src of [DETAIL_SOURCE, PREVIEW_SOURCE]) {
      expect(src).toMatch(/resolveByteRoad/);
      expect(src).not.toMatch(/urls\.preview/);
      expect(src).not.toMatch(/urls\.download/);
    }
  });

  it("keeps the shared previewer itself — no fork, no second viewer", () => {
    // The embed path and the download floor are the SAME shell reading a
    // different address. There is no third reading to fork (§XI.2: "no renderer
    // of ours paints a document's pages") — `embedded-viewer-only.test.ts` is
    // the gate on that; this one pins that the ONE shell is not duplicated.
    expect(DETAIL_SOURCE).toMatch(/PdfDownloadFloor/);
    expect(DETAIL_SOURCE).toMatch(/<embed/);

    // AND THE SHELL IS THE ONLY ONE. The assertions above are satisfied by a
    // fork that merely sits BESIDE the shared previewer, so on their own they
    // are not an anti-fork gate. This pins that there is no second viewer to be
    // chosen: one embed element in the whole renderer directory, and no
    // renderer module beyond the set.
    const rendererModules = readdirSync("src/renderers").sort();
    expect(rendererModules).toEqual(
      [
        "byte-road.ts",
        "download-link.tsx",
        "pdf-detail.tsx",
        "pdf-download-floor.tsx",
        "pdf-preview.tsx",
        "renderer-props.ts",
      ].sort(),
    );

    const rendererSources = rendererModules.map((f) =>
      readFileSync(`src/renderers/${f}`, "utf-8"),
    );
    const occurrences = (re: RegExp) =>
      rendererSources.reduce((n, src) => n + (src.match(re)?.length ?? 0), 0);

    // Exactly one embed ELEMENT in the whole directory — the shared shell's.
    // Anchored to the line start so the many prose mentions of the embed
    // element in the header comments are not counted as elements.
    expect(occurrences(/^\s*<embed[\s/>]/gm)).toBe(1);
  });

  it("resolves every declared renderer entry through the package exports map", () => {
    const ui = PKG.cinatra.artifact.ui;
    expect(ui).toBeDefined();
    if (!ui) return;
    for (const slot of ["detail", "preview"] as const) {
      const subpath = ui.renderers[slot].entry.replace(/\.tsx?$/, "");
      expect(Object.keys(PKG_EXPORTS)).toContain(subpath);
    }
  });
});

describe("pdf-detail source contract", () => {
  it("keeps the lightweight <embed type=\"application/pdf\"> path", () => {
    expect(DETAIL_SOURCE).toMatch(/^"use client";/);
    expect(DETAIL_SOURCE).toMatch(/<embed/);
    expect(DETAIL_SOURCE).toMatch(/type="application\/pdf"/);
    expect(DETAIL_SOURCE).toMatch(/aria-label="PDF preview"/);
  });

  it("imports no page-rendering library at all — there is no lazy chunk either", () => {
    expect(DETAIL_SOURCE).not.toMatch(/from\s+"react-pdf"/);
    expect(DETAIL_SOURCE).not.toMatch(/from\s+"pdfjs-dist/);
  });

  it("routes EVERY non-embed path to a never-blank floor", () => {
    // no materialized representation, and a fired <embed> onError, both floor.
    expect(DETAIL_SOURCE).toMatch(/previewHref === null/);
    expect(DETAIL_SOURCE).toMatch(/PdfDownloadFloor/);
    expect(DETAIL_SOURCE).toMatch(/onError=\{\(\) => setEmbedFailed\(true\)\}/);
    expect(DETAIL_SOURCE).toMatch(/embedFailed/);
  });
});



describe("pdf-detail / pdf-preview import hygiene", () => {
  it("imports no host-internal module and no framework router", () => {
    for (const src of [DETAIL_SOURCE, PREVIEW_SOURCE]) {
      expect(src).not.toMatch(/from\s+"@\//);
      expect(src).not.toMatch(/from\s+"next\//);
    }
  });
});

describe("pdf-preview source contract", () => {
  it("renders a compact, never-blank card (title fallback + optional open link)", () => {
    expect(PREVIEW_SOURCE).toMatch(/artifact\?\.title \?\? "PDF document"/);
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
    expect(ui.sdkAbiRange).toBe("^2.5.0");
    expect(Object.keys(ui.renderers).sort()).toEqual(["detail", "preview"]);
    for (const slot of ["detail", "preview"] as const) {
      const r = ui.renderers[slot];
      expect(r.entry.startsWith("./src/renderers/")).toBe(true);
      expect(r.entry.endsWith(".tsx")).toBe(true);
      expect(r.propsApiVersion).toBe(ARTIFACT_RENDERER_PROPS_API_VERSION);
      expect(r.propsApiVersion).toBe(2);
      expect(r.representations).toEqual(["application/pdf"]);
    }
  });

  it("declares no page-rendering dependency", () => {
    // The canvas viewer that needed them is gone (§XI.2: "no renderer of ours
    // paints a document's pages"), so the heavy pdf libraries are not shipped
    // and their two-instance worker-version hazard cannot return.
    expect(PKG.dependencies).toBeUndefined();
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
