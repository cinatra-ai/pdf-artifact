import type { SemanticArtifactManifest } from "@cinatra-ai/sdk-extensions";

// `@cinatra-ai/pdf-artifact` is a SYSTEM base: it claims exactly the concrete
// media type `application/pdf` (no classifier, no matcher — the MIME is the
// claim) and ships the renderer that draws a PDF row. The renderer has the two
// readings the ratified drawing gives a pdf and no third (the review drawing
// §XI.2, §XI.4): the browser's own bundled viewer via `<embed>`, and a
// download-link floor where there is no preview to show, so a malformed or
// unrenderable document is never a blank panel. It paints no pages itself —
// "no renderer of ours paints a document's pages".
//
// The `ui` block is the versioned artifact-renderer contract (abiVersion 1): a
// per-slot map over the closed v1 slot enum (`detail`, `preview`). A v1 renderer
// requests NO host ports — it renders only from the host-supplied authorized
// props snapshot — so each entry carries just { entry, propsApiVersion,
// representations }. `sdkAbiRange` is generated from the canonical SDK ABI and
// pins the compatible host range.
//
// Object-type declaration (epic cinatra#1785, upload-typing ruling, entry
// 106-B): this REQUIRED system base owns exactly one concrete object type,
// `@cinatra-ai/pdf-artifact:document` (the uploaded-PDF document a human
// `application/pdf` upload is persisted under; without it the mime-map resolves
// to nothing post-#1824). That claim is declared AUTHORITATIVELY — and ONLY —
// in `package.json#cinatra.artifact.objectTypes`, which the host object-registry
// bridge reads; it is intentionally NOT carried on this SDK-typed const, which
// mirrors just the `accepts` + `ui` renderer contract (matching the audio /
// video / image system bases). The manifest test asserts the package.json claim
// shape and the src↔package.json agreement of `accepts` + `ui`.
export const pdfArtifactManifest: SemanticArtifactManifest = {
  accepts: {
    file: {
      mimeTypes: ["application/pdf"],
    },
  },
  ui: {
    abiVersion: 1,
    sdkAbiRange: "^2.5.0",
    renderers: {
      detail: {
        entry: "./src/renderers/pdf-detail.tsx",
        propsApiVersion: 2,
        representations: ["application/pdf"],
      },
      preview: {
        entry: "./src/renderers/pdf-preview.tsx",
        propsApiVersion: 2,
        representations: ["application/pdf"],
      },
    },
  },
};
