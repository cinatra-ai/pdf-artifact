// THE BYTE ROAD A DISPLAY PAINTS FROM (props version 2).
//
// `urls` are the host's SESSION byte routes, and a subresource load from inside
// a third-party application carries no cookie — so a display painting from them
// draws a blank plate there. At props version 2 the snapshot carries a byte
// REFERENCE that names the road it is on: on the island a sealed, short-lived
// address bound to exactly this artifact and this revision, and on a first-party
// surface the session route named as such. That reference is the address the
// display paints from.
//
// A DISPLAY IS HANDED AN ADDRESS AND NEVER BUILDS ONE. It composes no host
// route, and it fetches nothing on its own: the address goes straight onto a
// passive element, which is what makes the same display draw on every surface.
//
// A snapshot built at the older props version carries no reference at all — not
// an empty one — so the resolver falls back to the session hrefs and the display
// still paints. That fallback IS the version window: a host that has not moved
// keeps drawing exactly as it did, and the never-blank floor is unchanged.
//
// PURE, TOTAL, NEVER THROWS. A malformed or partial snapshot resolves to the
// floor rather than propagating past the renderer.

/** The fields of the authorized snapshot this leaf reads. The full props
 *  snapshot is structurally assignable to it. */
export interface ByteRoadSnapshot {
  readonly propsApiVersion?: number;
  readonly urls?: {
    readonly preview?: string | null;
    readonly download?: string | null;
  } | null;
  readonly actions?: { readonly download?: string | null } | null;
  readonly bytes?: {
    readonly road?: string;
    readonly preview?: string | null;
    readonly download?: string | null;
  } | null;
}

/** Which road the resolved addresses are on. `none` says the snapshot carries
 *  no address at all, and the display draws its typed floor. */
export type ByteRoadName = "island" | "session" | "none";

export interface ResolvedByteRoad {
  readonly road: ByteRoadName;
  readonly preview: string | null;
  readonly download: string | null;
}

const NO_ROAD: ResolvedByteRoad = { road: "none", preview: null, download: null };

function href(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

/**
 * Resolve the addresses this display may paint from, and the road they are on.
 *
 * The byte reference wins outright where the snapshot carries one — its
 * addresses are never mixed with the session hrefs, because mixing them is
 * exactly the bug this road exists to end: one cookie-gated URL on an island
 * surface is a blank plate.
 */
export function resolveByteRoad(
  props: ByteRoadSnapshot | null | undefined,
): ResolvedByteRoad {
  if (props === null || props === undefined || typeof props !== "object") {
    return NO_ROAD;
  }

  const reference = props.bytes;
  if (reference !== null && reference !== undefined && typeof reference === "object") {
    const preview = href(reference.preview);
    const download = href(reference.download);
    if (preview === null && download === null) return NO_ROAD;
    return {
      road: reference.road === "island" ? "island" : "session",
      preview,
      download,
    };
  }

  const preview = href(props.urls?.preview);
  const download = href(props.actions?.download) ?? href(props.urls?.download);
  if (preview === null && download === null) return NO_ROAD;
  return { road: "session", preview, download };
}
