import {
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
  Texture,
  TextureLoader,
} from "three";
import type { Survey } from "./surveys";
import { tileUrl } from "./surveys";

/**
 * HiPS tile loader with a tiny LRU cache.
 *
 * Day 2 toy: simple Map-as-LRU, no atlas, one Texture per tile.
 * The production renderer will batch into a 4K atlas — see Aladin Lite's
 * `renderable/hips/buffer.rs` for the proper approach.
 */

const MAX_CACHE = 256;

type Entry = { tex: Texture; lastUsed: number };

const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<Texture>>();
const loader = new TextureLoader();
loader.setCrossOrigin("anonymous");

let now = 0;

export function loadTile(
  survey: Survey,
  order: number,
  ipix: number,
): Promise<Texture> {
  const key = `${survey.id}|${order}|${ipix}`;
  const hit = cache.get(key);
  if (hit) {
    hit.lastUsed = ++now;
    return Promise.resolve(hit.tex);
  }
  const pending = inflight.get(key);
  if (pending) return pending;

  const url = tileUrl(survey, order, ipix);
  const promise = new Promise<Texture>((resolve, reject) => {
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = SRGBColorSpace;
        tex.minFilter = LinearMipmapLinearFilter;
        tex.magFilter = LinearFilter;
        tex.anisotropy = 4;
        tex.generateMipmaps = true;
        cache.set(key, { tex, lastUsed: ++now });
        evictIfNeeded();
        inflight.delete(key);
        resolve(tex);
      },
      undefined,
      (err) => {
        inflight.delete(key);
        reject(
          err instanceof ErrorEvent ? new Error(err.message) : (err as Error),
        );
      },
    );
  });
  inflight.set(key, promise);
  return promise;
}

function evictIfNeeded(): void {
  if (cache.size <= MAX_CACHE) return;
  const sorted = [...cache.entries()].sort(
    (a, b) => a[1].lastUsed - b[1].lastUsed,
  );
  const toEvict = sorted.slice(0, cache.size - MAX_CACHE);
  for (const [key, entry] of toEvict) {
    entry.tex.dispose();
    cache.delete(key);
  }
}

export function tileCacheStats(): { size: number; max: number } {
  return { size: cache.size, max: MAX_CACHE };
}
