/**
 * Tiny dev-only logger so the rest of the codebase doesn't need to call
 * `console.*` directly (CLAUDE.md hard constraint).
 *
 * In production builds (import.meta.env.PROD), warn/info/debug become no-ops.
 * Errors are always surfaced — they signal genuine failures the user might
 * want to report.
 *
 * Usage:
 *   import { log } from "../lib/logger";
 *   log.warn("[satellites]", "TLE refresh failed", err);
 *
 * The leading "[scope]" tag is convention, not enforced.
 */

const isProd = typeof import.meta !== "undefined" && import.meta.env?.PROD;

type LogFn = (...args: unknown[]) => void;

const noop: LogFn = () => {
  /* no-op */
};

export const log: {
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
} = {
  // eslint-disable-next-line no-console
  debug: isProd ? noop : (...args) => console.debug(...args),
  // eslint-disable-next-line no-console
  info: isProd ? noop : (...args) => console.info(...args),
  // eslint-disable-next-line no-console
  warn: isProd ? noop : (...args) => console.warn(...args),
  // eslint-disable-next-line no-console
  error: (...args) => console.error(...args),
};

/**
 * `logger` — preferred name for new code (aliases `log`). Existing
 * `import { log } from "../lib/logger"` callsites keep working; new
 * callers should reach for `logger` so the convention drifts toward
 * the more conventional spelling over time.
 */
export const logger = log;
