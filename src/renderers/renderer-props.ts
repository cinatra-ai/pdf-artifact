// The versioned, normalized, SERIALIZABLE props snapshot a Cinatra
// extension-shipped artifact renderer receives from the host.
//
// A renderer requests NO host ports — it renders ONLY from this host-supplied
// authorized snapshot. Every field is plain JSON data: row metadata, the
// resolved representation, host-authorized addresses, and sanctioned action
// handles as navigational hrefs (never closures / host context). The host
// access-checks each address BEFORE building this snapshot; the renderer just
// references them.
//
// This is a HOST-NEUTRAL STRUCTURAL MIRROR of the host's own props contract,
// declared locally so the renderer stays standalone-typecheckable and -testable
// (the concrete host type lives in the host application and is not a published
// package). It mirrors the fields this extension consumes; a host that hands a
// superset object still assigns to this structural type.
//
// VERSION 2 SINCE THE BYTE ROAD. The snapshot gained the byte REFERENCE below,
// which is what lets this display paint inside a third-party application at all.
// A display still declaring version 1 is admitted at version 1 and handed a
// version-1 snapshot — the host's version window, not a flag day — it simply is
// not handed the island road.

/** The props-contract version this mirror describes, and the version the
 *  renderers declare in the manifest. */
export const ARTIFACT_RENDERER_PROPS_API_VERSION = 2;

/** The version at which the snapshot began carrying the byte reference. A
 *  separate name from the ceiling above, so a later ceiling bump for an
 *  unrelated field cannot silently retire the reference. */
export const ARTIFACT_RENDERER_PROPS_BYTE_REFERENCE_VERSION = 2;

export type ArtifactOwnerLevel = "user" | "team" | "organization" | "workspace";
export type ArtifactVisibility = "private" | "team" | "organization" | "public";
export type EffectiveIdentityKind = "extension" | "no-primary";

/** Which road an address is on. The two are not interchangeable: an island
 *  address is a sealed, short-lived, single-artifact capability, and a session
 *  address is the cookie-gated route. */
export type ArtifactByteRoad = "session" | "island";

/**
 * THE BYTE REFERENCE — the address the reader may actually fetch on the surface
 * they are on. It is an ADDRESS and never a payload: no field of the snapshot
 * ever carries the work's bytes, in any encoding, on any road.
 *
 * ABSENT at props version 1, deliberately: a display that declared version 1
 * agreed to a snapshot without this field.
 */
export interface ArtifactByteReference {
  road: ArtifactByteRoad;
  preview: string | null;
  download: string | null;
}

export interface ArtifactRendererProps {
  /** The props-contract version this snapshot conforms to. A renderer declares
   * the `propsApiVersion` it expects; the host refuses to mount a renderer whose
   * expected version this snapshot does not satisfy. */
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
    ownerLevel: ArtifactOwnerLevel;
    visibility: ArtifactVisibility;
    sourceUrl: string | null;
  };
  /** The resolved representation to serve (null when the artifact has no
   * materialized representation). */
  representation: {
    revisionId: string;
    mime: string;
  } | null;
  /** Host-authorized SESSION addresses. Already access-checked by the host —
   * reference only. They carry no cookie inside a third-party application, which
   * is why the byte reference below exists. */
  urls: {
    preview: string | null;
    download: string | null;
  };
  /** The resolved effective identity, flattened to plain data: the type's
   * defining extension, or `no-primary` with a null extension. */
  identity: {
    kind: EffectiveIdentityKind;
    extension: string | null;
  };
  /** Sanctioned action handles — SERIALIZABLE navigational hrefs only. */
  actions: {
    download: string | null;
    openInSource: string | null;
  };
  /** The byte reference (props version 2). Absent on a version-1 snapshot. */
  bytes?: ArtifactByteReference;
}
