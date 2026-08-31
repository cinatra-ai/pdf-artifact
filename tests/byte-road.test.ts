// @vitest-environment node
import { describe, expect, it } from "vitest";

import { resolveByteRoad } from "../src/renderers/byte-road";

const ISLAND_PREVIEW = "/api/lifecycle-views/artifact-bytes?bc=sealed-preview";
const ISLAND_DOWNLOAD = "/api/lifecycle-views/artifact-bytes?bc=sealed-download";
const SESSION_PREVIEW = "/api/artifacts/art_1/versions/rev_1/preview";
const SESSION_DOWNLOAD = "/api/artifacts/art_1/versions/rev_1/download";

describe("resolveByteRoad — the island road at props version 2", () => {
  it("paints from the byte reference, not from the session preview href", () => {
    expect(
      resolveByteRoad({
        propsApiVersion: 2,
        urls: { preview: SESSION_PREVIEW, download: SESSION_DOWNLOAD },
        actions: { download: SESSION_DOWNLOAD },
        bytes: {
          road: "island",
          preview: ISLAND_PREVIEW,
          download: ISLAND_DOWNLOAD,
        },
      }),
    ).toEqual({
      road: "island",
      preview: ISLAND_PREVIEW,
      download: ISLAND_DOWNLOAD,
    });
  });

  it("never mixes a session href into an island reference", () => {
    const resolved = resolveByteRoad({
      propsApiVersion: 2,
      urls: { preview: SESSION_PREVIEW, download: SESSION_DOWNLOAD },
      actions: { download: SESSION_DOWNLOAD },
      bytes: { road: "island", preview: ISLAND_PREVIEW, download: null },
    });
    expect(resolved.road).toBe("island");
    expect(resolved.download).toBeNull();
    expect(resolved.preview).not.toBe(SESSION_PREVIEW);
  });

  it("names the session road when the host built the reference on a cookie surface", () => {
    expect(
      resolveByteRoad({
        propsApiVersion: 2,
        urls: { preview: SESSION_PREVIEW, download: SESSION_DOWNLOAD },
        bytes: {
          road: "session",
          preview: SESSION_PREVIEW,
          download: SESSION_DOWNLOAD,
        },
      }),
    ).toEqual({
      road: "session",
      preview: SESSION_PREVIEW,
      download: SESSION_DOWNLOAD,
    });
  });

  it("treats an unknown road name as the session road, never as the island", () => {
    expect(
      resolveByteRoad({
        propsApiVersion: 2,
        bytes: { road: "made-up", preview: SESSION_PREVIEW, download: null },
      }).road,
    ).toBe("session");
  });
});

describe("resolveByteRoad — the older props version floors, never blanks", () => {
  it("falls back to the session hrefs when the snapshot carries no reference", () => {
    expect(
      resolveByteRoad({
        propsApiVersion: 1,
        urls: { preview: SESSION_PREVIEW, download: SESSION_DOWNLOAD },
        actions: { download: SESSION_DOWNLOAD },
      }),
    ).toEqual({
      road: "session",
      preview: SESSION_PREVIEW,
      download: SESSION_DOWNLOAD,
    });
  });

  it("prefers the sanctioned action handle over the raw download href", () => {
    expect(
      resolveByteRoad({
        propsApiVersion: 1,
        urls: { preview: null, download: "/raw" },
        actions: { download: "/sanctioned" },
      }).download,
    ).toBe("/sanctioned");
  });

  it("resolves no road at all when the snapshot carries no address", () => {
    expect(
      resolveByteRoad({ propsApiVersion: 1, urls: { preview: null, download: null } }),
    ).toEqual({ road: "none", preview: null, download: null });
  });

  it("resolves no road when the reference itself carries no address", () => {
    expect(
      resolveByteRoad({
        propsApiVersion: 2,
        urls: { preview: SESSION_PREVIEW, download: SESSION_DOWNLOAD },
        bytes: { road: "island", preview: null, download: null },
      }),
    ).toEqual({ road: "none", preview: null, download: null });
  });

  it("treats a blank string as no address", () => {
    expect(
      resolveByteRoad({ propsApiVersion: 2, bytes: { road: "island", preview: "  ", download: "" } }),
    ).toEqual({ road: "none", preview: null, download: null });
  });

  it("never throws on a battery of hostile inputs", () => {
    const hostile: unknown[] = [
      null,
      undefined,
      0,
      "",
      "nope",
      [],
      {},
      { urls: null },
      { urls: {} },
      { bytes: null },
      { bytes: {} },
      { bytes: { preview: 42 } },
      { urls: { preview: 42 } },
      { actions: null },
    ];
    for (const input of hostile) {
      expect(() =>
        resolveByteRoad(input as Parameters<typeof resolveByteRoad>[0]),
      ).not.toThrow();
    }
  });
});
