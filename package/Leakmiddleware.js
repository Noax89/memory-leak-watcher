/**
 * createLeakMiddleware
 *
 * Returns an Express-compatible middleware that optionally:
 *   - logs heap usage per request
 *   - tracks req.body and/or the req object via an ObjectTracker
 *   - reports still-alive tracked objects once the response finishes
 *
 * Usage
 * -----
 *   import { createLeakMiddleware } from './LeakMiddleware.js';
 *   import ObjectTracker            from './ObjectTracker.js';
 *
 *   const tracker = new ObjectTracker();
 *   app.use(createLeakMiddleware(tracker, { logMemoryPerRequest: true }));
 *
 * @param {import('./ObjectTracker.js').ObjectTracker} tracker
 * @param {MiddlewareOptions} [options]
 * @returns {import('express').RequestHandler}
 */

export function createLeakMiddleware(tracker, options = {}) {
  if (!tracker || typeof tracker.track !== 'function') {
    throw new TypeError(
      'createLeakMiddleware(): first argument must be an ObjectTracker instance.',
    );
  }

  const {
    logMemoryPerRequest = false,
    trackRequestBody    = false,
    trackRequest        = false,
  } = options;

  return function leakMiddleware(req, res, next) {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // --- optional per-request memory log ---
    if (logMemoryPerRequest) {
      const mb = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
      console.log(`[LeakMiddleware] ${req.method} ${req.path} — heap: ${mb} MB`);
    }

    // --- optional object tracking ---
    if (trackRequest) {
      tracker.track(req, `req:${requestId}`);
    }

    if (trackRequestBody && req.body != null) {
      tracker.track(req.body, `req.body:${requestId}`);
    }

    // --- post-response analysis ---
    res.on('finish', () => {
      const snapshot = tracker.report();
      const leaks    = snapshot.filter(entry => entry.isAlive);

      if (leaks.length === 0) return;

      for (const leak of leaks) {
        const aliveMs = Date.now() - leak.createdAt;

        console.warn(formatLeakReport(leak, aliveMs));
      }
    });

    next();
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Format a human-readable leak report string.
 * Kept separate so it can be unit-tested independently.
 *
 * @param {import('./ObjectTracker.js').TrackedObjectReport} leak
 * @param {number} aliveMs
 * @returns {string}
 */
export function formatLeakReport(leak, aliveMs) {
  return `
[LeakMiddleware] ⚠ Memory leak detected
  Label        : ${leak.label}
  Alive for    : ${formatDuration(aliveMs)}
  Est. size    : ${leak.estimatedSize.toFixed(6)} MB
  Created at   : ${new Date(leak.createdAt).toISOString()}
  Likely causes:
    • Object held by a global variable or module-level cache
    • Captured inside a long-living closure
    • Stored in req.app.locals, a Map, or a Set that is never cleared
  Creation stack:
${indentStack(leak.stack)}`.trimStart();
}

/**
 * Convert milliseconds into a readable "Xh Xm Xs Xms" string.
 * @param {number} ms
 * @returns {string}
 */
export function formatDuration(ms) {
  if (ms < 1_000) return `${ms}ms`;

  const hours   = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1_000);
  const millis  = ms % 1_000;

  return [
    hours   && `${hours}h`,
    minutes && `${minutes}m`,
    seconds && `${seconds}s`,
    millis  && `${millis}ms`,
  ].filter(Boolean).join(' ');
}

/**
 * Indent every line of a stack trace by two spaces for readability.
 * @param {string} stack
 * @returns {string}
 */
function indentStack(stack) {
  return stack
    .split('\n')
    .map(line => `    ${line}`)
    .join('\n');
}

/**
 * @typedef {object} MiddlewareOptions
 * @property {boolean} [logMemoryPerRequest=false] — Log heap usage on each request.
 * @property {boolean} [trackRequestBody=false]    — Track req.body via ObjectTracker.
 * @property {boolean} [trackRequest=false]        — Track the req object via ObjectTracker.
 */

export default createLeakMiddleware;