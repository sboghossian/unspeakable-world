/**
 * Unit coverage for the HiPS tile URL builder.
 *
 * `tileUrl()` is the only piece of HEALPix coordinate math we ship today
 * (the actual tile mesh is built by three.js). The HiPS file-layout spec
 * is: `{base}/Norder{N}/Dir{D}/Npix{P}.{ext}` where `D = floor(P/10000)*10000`.
 * If the directory rollover is wrong the CDS CDN silently 404s — easy
 * to break, easy to regress, exactly the kind of thing a unit test
 * earns its keep on.
 */

import { describe, expect, it } from "vitest";

import { SURVEYS, tileUrl } from "../../src/viewer/hips/surveys";

describe("tileUrl", () => {
  it("builds a tile URL for an in-first-dir pixel (happy path)", () => {
    const dss2 = SURVEYS.dss2!;
    expect(tileUrl(dss2, 3, 42)).toBe(
      "https://alasky.cds.unistra.fr/DSS/DSSColor/Norder3/Dir0/Npix42.jpg",
    );
  });

  it("rolls the Dir bucket every 10_000 pixels (edge case)", () => {
    const dss2 = SURVEYS.dss2!;
    // Npix 10_000 is the first pixel in Dir10000.
    expect(tileUrl(dss2, 5, 10_000)).toBe(
      "https://alasky.cds.unistra.fr/DSS/DSSColor/Norder5/Dir10000/Npix10000.jpg",
    );
    // Npix 123_456 falls in Dir120000.
    expect(tileUrl(dss2, 7, 123_456)).toBe(
      "https://alasky.cds.unistra.fr/DSS/DSSColor/Norder7/Dir120000/Npix123456.jpg",
    );
  });
});
