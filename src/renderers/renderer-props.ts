/**
 * The versioned, normalized, SERIALIZABLE props snapshot an extension-shipped
 * artifact renderer receives from the host (props-contract version 1).
 *
 * This is a LOCAL structural declaration of the host's authorized snapshot. The
 * host type lives host-internal (it is not exported from the SDK), and a v1
 * renderer requests NO host ports — it renders ONLY from this plain-JSON
 * snapshot — so a renderer legitimately declares the shape it consumes. The host
 * passes the full snapshot as `<Renderer {...props} />`; a renderer that reads a
 * subset stays structurally compatible.
 *
 * Every field is plain JSON: row metadata, the resolved representation, host-
 * authorized URLs (already access-checked before the snapshot is built), and
 * sanctioned action handles as navigational hrefs — never closures / host
 * context.
 */
export interface ArtifactRendererProps {
  /** The props-contract version this snapshot conforms to. */
  propsApiVersion: number;
  /** Row metadata (a projection of the authorized artifact summary). */
  artifact: {
    id: string;
    title: string | null;
    objectType: string;
    mime: string;
    size: number;
    createdAt: string;
    updatedAt: string;
    ownerLevel: string;
    visibility: string;
    sourceUrl: string | null;
  };
  /** The resolved representation to serve (null when none is materialized). */
  representation: {
    revisionId: string;
    mime: string;
  } | null;
  /** Host-authorized URLs — the renderer just references them. */
  urls: {
    preview: string | null;
    download: string | null;
  };
  /** The resolved effective identity, flattened to plain data. */
  identity: {
    kind: string;
    extension: string | null;
    basis: string | null;
    selectable: boolean;
  };
  /** Sanctioned action handles — serializable navigational hrefs only. */
  actions: {
    download: string | null;
    openInSource: string | null;
  };
}
