/**
 * Row icon renderer (the `listRow` slot).
 *
 * Draws the icon of a PDF in the Artifacts list: the book-open-text icon of
 * the shared icon set, 17 pixels square with a 2 pixel stroke, inside the
 * cell the application provides at the start of each row. The cell's size and
 * tint stay the application's; this display only draws the icon.
 *
 * It reads nothing but its props, requests no host port and fetches nothing,
 * and returns the same icon for every object type it receives.
 */

import { BookOpenText } from "lucide-react";
import type { ReactElement } from "react";
import type { ArtifactRendererProps } from "@cinatra-ai/sdk-extensions";

export default function PdfListRowRenderer(
  _props: { artifact: Pick<ArtifactRendererProps["artifact"], "objectType"> },
): ReactElement {
  return <BookOpenText aria-hidden size={17} strokeWidth={2} data-row-glyph="book-open-text" />;
}
