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
