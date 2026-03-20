/**
 * ObjectTracker
 *
 * Tracks arbitrary JS objects via WeakRef so the GC can still collect them.
 * Use `track(obj, label)` to register an object, then `report()` to see
 * which ones are still alive and how large they appear to be.
 */

export class ObjectTracker {
  /** @type {Map<string, { ref: WeakRef<object>, createdAt: number, stack: string }>} */
  #tracked = new Map();

  // ─── Public API ──────────────────────────────────────────────────────────────

  /**
   * Begin tracking an object.
   *
   * @param {object} obj   — The object to watch.
   * @param {string} label — A unique human-readable identifier.
   */
  track(obj, label) {
    if (typeof obj !== 'object' || obj === null) {
      throw new TypeError(`ObjectTracker.track(): 'obj' must be a non-null object.`);
    }
    if (!label || typeof label !== 'string') {
      throw new TypeError(`ObjectTracker.track(): 'label' must be a non-empty string.`);
    }

    this.#tracked.set(label, {
      ref:       new WeakRef(obj),
      createdAt: Date.now(),
      stack:     new Error('ObjectTracker.track() call site').stack,
    });

    return this;   // allow chaining
  }

  /**
   * Remove a tracked entry manually (e.g. after legitimate cleanup).
   * @param {string} label
   */
  untrack(label) {
    this.#tracked.delete(label);
    return this;
  }

  /**
   * Return a snapshot of all tracked entries.
   * Dead refs are pruned from the internal map as a side-effect.
   *
   * @returns {TrackedObjectReport[]}
   */
  report() {
    const results = [];

    for (const [label, entry] of this.#tracked) {
      const obj     = entry.ref.deref();
      const isAlive = obj !== undefined;

      results.push({
        label,
        isAlive,
        createdAt:     entry.createdAt,
        stack:         entry.stack,
        estimatedSize: isAlive ? this.#approximateSizeMB(obj) : 0,
      });

      if (!isAlive) this.#tracked.delete(label);
    }

    return results;
  }

  /** Number of currently-registered entries (includes potentially GC'd refs). */
  get size() {
    return this.#tracked.size;
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  /**
   * Walk own enumerable properties up to `maxDepth` and return a rough byte
   * estimate converted to MB.
   *
   * Intentionally approximate — this is a heuristic, not v8's internal size.
   *
   * @param {object} root
   * @param {number} [maxDepth=3]
   * @returns {number} size in MB
   */
  #approximateSizeMB(root, maxDepth = 3) {
    const seen  = new Set();
    const queue = [{ value: root, depth: 0 }];
    let bytes   = 0;

    while (queue.length) {
      const { value, depth } = queue.pop();

      switch (typeof value) {
        case 'boolean':  bytes += 4;                break;
        case 'number':   bytes += 8;                break;
        case 'bigint':   bytes += 8;                break;
        case 'string':   bytes += value.length * 2; break;
        case 'object': {
          if (value === null || seen.has(value)) break;

          seen.add(value);

          if (depth < maxDepth) {
            // Only own enumerable props — skip prototype chain
            for (const key of Object.keys(value)) {
              queue.push({ value: value[key], depth: depth + 1 });
            }
          }
          break;
        }
        // functions, symbols, undefined: omit — not meaningfully heap-sizeable here
      }
    }

    return bytes / 1024 / 1024;
  }
}

/**
 * @typedef {object} TrackedObjectReport
 * @property {string}  label
 * @property {boolean} isAlive
 * @property {number}  createdAt       — Unix ms timestamp
 * @property {string}  stack           — creation call site
 * @property {number}  estimatedSize   — approximate size in MB (0 if GC'd)
 */

export default ObjectTracker;