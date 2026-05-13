/**
 * 🔲 qr — thin wrapper around `qrcode-generator` that returns an inline
 * SVG string.
 *
 * Why this library:
 *   `qrcode-generator` is MIT-licensed, ~7 KB minified, zero runtime
 *   deps, ships its own .d.ts. Rolling our own QR encoder for a single
 *   call site would have cost more LoC than the entire library footprint.
 *
 * The wrapper picks the smallest QR version that fits the input
 * (typeNumber=0 → auto), uses byte mode, and error-correction level L
 * (recovery of ~7%) — printed certificates are read at close range so
 * the lighter ECC keeps the modules large and the scan reliable.
 *
 * Lazy-loaded: `qrcode-generator` is only pulled into the bundle when a
 * caller actually asks for a QR code (certificate panel, tutor share
 * panel). Everything else gets to skip the 7 KB.
 */

export type QrOptions = {
  /** Module pixel size in the generated SVG. Default 4. */
  cellSize?: number;
  /** Quiet-zone margin in modules. Default 2. */
  margin?: number;
};

/**
 * Encode `data` as a QR code SVG. Returns a complete `<svg …>` string
 * the caller can dangerously-set on a div. Throws only if the data
 * exceeds the largest QR version (~4 KB binary, far above any URL we
 * encode here).
 */
export async function makeQrSvg(
  data: string,
  opts: QrOptions = {},
): Promise<string> {
  const { default: qrcode } = await import("qrcode-generator");
  const qr = qrcode(0, "L");
  qr.addData(data);
  qr.make();
  return qr.createSvgTag({
    cellSize: opts.cellSize ?? 4,
    margin: opts.margin ?? 2,
    scalable: true,
  });
}
