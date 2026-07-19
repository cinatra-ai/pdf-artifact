import type { SemanticArtifactManifest } from "@cinatra-ai/sdk-extensions";

// `@cinatra-ai/pdf-artifact` is a SYSTEM base: it claims exactly the concrete
// media type `application/pdf` (no classifier, no matcher — the MIME is the
// claim) and ships the renderer that draws a PDF row. The renderer migrates the
// host's existing PDF handler UX unchanged: the browser's native viewer via
// `<embed>`, an inline page-renderer fallback for engines that cannot embed a
// PDF, and a download-link floor so a malformed or unrenderable document is
// never a blank panel.
//
// The `ui` block is the versioned artifact-renderer contract (abiVersion 1): a
// per-slot map over the closed v1 slot enum (`detail`, `preview`). A v1 renderer
// requests NO host ports — it renders only from the host-supplied authorized
// props snapshot — so each entry carries just { entry, propsApiVersion,
// representations }. `sdkAbiRange` is generated from the canonical SDK ABI and
// pins the compatible host range.
export const pdfArtifactManifest: SemanticArtifactManifest = {
  accepts: {
    file: {
      mimeTypes: ["application/pdf"],
    },
  },
  // Entry 106-B (epic cinatra#1785, upload-typing ruling): the type this pack
  // owns is DECLARED explicitly, never derived. A human upload maps by MIME to
  // the REQUIRED system-base pack, which persists it under ITS DECLARED TYPE;
  // this base must therefore register a concrete objectType or the mime-map
  // resolves to nothing (post-#1824 the umbrella `${extension}:artifact` is
  // gone). `document` is the uploaded-PDF document this pack owns:
  // dedicated-claimed and self-registered. The `accepts.file` MIME claim above
  // classifies accepted `application/pdf` uploads INTO this type; it does not
  // create it. An uploaded PDF is an immutable `record` (create-only, no in-app
  // content edits), content-addressed (snapshotPolicy `content`), pinnable.
  //
  // The inline JSON Schema describes the stored uploaded-object metadata as it
  // is persisted by the host upload path (createUploadedArtifact →
  // createSemanticArtifact): the display title, the detected/declared MIME, the
  // blob size in bytes, and the resource + representation-revision references
  // that point at the stored bytes. `additionalProperties: true` leaves room
  // for host-side enrichment fields without a manifest bump.
  objectTypes: [
    {
      type: "@cinatra-ai/pdf-artifact:document",
      claim: "dedicated",
      dispositions: {
        projection: "artifact-safe",
        pinnable: true,
        snapshotPolicy: "content",
        sensitivity: "normal",
        mutability: "record",
      },
      schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          mime: { type: "string" },
          sizeBytes: { type: "integer" },
          resourceId: { type: "string" },
          representationRevisionId: { type: "string" },
          createdByRunId: { type: "string" },
        },
        additionalProperties: true,
      },
    },
  ],
  ui: {
    abiVersion: 1,
    sdkAbiRange: "^2.4.0",
    renderers: {
      detail: {
        entry: "./src/renderers/pdf-detail.tsx",
        propsApiVersion: 1,
        representations: ["application/pdf"],
      },
      preview: {
        entry: "./src/renderers/pdf-preview.tsx",
        propsApiVersion: 1,
        representations: ["application/pdf"],
      },
    },
  },
};
