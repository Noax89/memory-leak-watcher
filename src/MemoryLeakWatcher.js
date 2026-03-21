import { EventEmitter } from 'events';

/**
 * MemoryLeakWatcher
 *
 * Polls heap usage on a fixed interval and emits structured events
 * when consecutive growth exceeds a configurable threshold.
 *
 * Events
 * ------
 *  'leak'    — { diff, current, previous, consecutiveLeaks, stack }
 *  'stable'  — { current }
 *  'stopped' — { reason: 'manual' | 'consecutive-leaks' | 'timeout' }
 */

const DEFAULTS = {
  interval:          5_000,   // ms between samples
  threshold:         10,      // % growth that counts as a leak
  maxConsecutive:    3,        // auto-stop after N back-to-back leaks
  timeout:           null,     // ms — auto-stop after this duration (null = disabled)
};

export class MemoryLeakWatcher extends EventEmitter {
  #interval;
  #threshold;
  #maxConsecutive;
  #timeout;

  #pollTimer      = null;
  #timeoutTimer   = null;
  #previousMB     = null;   // null → first run not yet taken
  #consecutiveLeaks = 0;
  #running        = false;

  constructor(options = {}) {
    super();
    const cfg = { ...DEFAULTS, ...options };

    this.#interval        = cfg.interval;
    this.#threshold       = cfg.threshold;
    this.#maxConsecutive  = cfg.maxConsecutive;
    this.#timeout         = cfg.timeout;
  }

  // ─── Public API ────────────────────────────────────────────────

  get isRunning() {
    return this.#running;
  }

  /** Start polling. Throws if already running. */
  start() {
    if (this.#running) throw new Error('MemoryLeakWatcher is already running.');

    this.#running         = true;
    this.#previousMB      = null;
    this.#consecutiveLeaks = 0;

    this.#pollTimer = setInterval(() => this.#check(), this.#interval);

    if (this.#timeout !== null) {
      this.#timeoutTimer = setTimeout(
        () => this.#stop('timeout'),
        this.#timeout,
      );
    }

    console.log(
      `[MemoryLeakWatcher] started — sampling every ${this.#interval / 1_000}s` +
      (this.#timeout ? `, auto-stop in ${this.#timeout / 1_000}s` : ''),
    );

    return this;   // allow chaining: new MemoryLeakWatcher().start()
  }

  /** Stop polling manually. */
  stop() {
    return this.#stop('manual');
  }

  /** Current heap usage in MB (can be called at any time). */
  get memoryMB() {
    return parseFloat((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2));
  }

  // ─── Private ───────────────────────────────────────────────────

  #stop(reason) {
    if (!this.#running) return;

    clearInterval(this.#pollTimer);
    clearTimeout(this.#timeoutTimer);

    this.#pollTimer    = null;
    this.#timeoutTimer = null;
    this.#running      = false;

    console.log(`[MemoryLeakWatcher] stopped (reason: ${reason})`);
    this.emit('stopped', { reason });

    return this;
  }

  #check() {
    const current = this.memoryMB;

    // First sample — establish baseline, no comparison yet.
    if (this.#previousMB === null) {
      this.#previousMB = current;
      console.log(`[MemoryLeakWatcher] baseline: ${current} MB`);
      return;
    }

    const diff = ((current - this.#previousMB) / this.#previousMB) * 100;

    if (diff > this.#threshold) {
      this.#consecutiveLeaks++;

      const report = {
        diff:             parseFloat(diff.toFixed(2)),
        current,
        previous:         this.#previousMB,
        consecutiveLeaks: this.#consecutiveLeaks,
        stack:            new Error('MemoryLeakWatcher trace').stack,
      };

      console.warn(
        `[MemoryLeakWatcher] ⚠ leak #${this.#consecutiveLeaks} — ` +
        `+${report.diff}% (${this.#previousMB} MB → ${current} MB)`,
      );

      this.emit('leak', report);

      if (this.#consecutiveLeaks >= this.#maxConsecutive) {
        console.warn(
          `[MemoryLeakWatcher] ${this.#consecutiveLeaks} consecutive leaks — stopping.`,
        );
        this.#stop('consecutive-leaks');
        return;   // skip previousMB update — watcher is done
      }
    } else {
      if (this.#consecutiveLeaks > 0) {
        console.log(`[MemoryLeakWatcher] stable after ${this.#consecutiveLeaks} leak(s) — resetting counter.`);
      } else {
        console.log(`[MemoryLeakWatcher] stable: ${current} MB`);
      }

      this.#consecutiveLeaks = 0;
      this.emit('stable', { current });
    }

    this.#previousMB = current;
  }
}

export default MemoryLeakWatcher;