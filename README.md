# PDF

The system viewer for PDF documents in the Cinatra library. Any artifact whose bytes are `application/pdf` renders inline through this extension: the browser's built-in PDF viewer handles paging and scrolling on desktop, and an inline fallback keeps documents readable on devices where the embedded viewer does not work. When a PDF cannot be shown inline the viewer always falls back to a download link rather than a blank panel, so a malformed or unrenderable file never leaves an empty page. It is a system base — installed and active for every workspace with no credentials or configuration, and it claims exactly one media type, `application/pdf`.

## Works with

- Cinatra library — any stored or attached artifact with the `application/pdf` media type

## Capabilities

- Preview a PDF inline using the browser's native viewer, with streaming range requests for large files
- Fall back to an inline page renderer on devices where the embedded viewer cannot display a PDF
- Degrade to a download link whenever a document cannot be previewed, so the panel is never blank
- Download the original document at full fidelity from any preview state
