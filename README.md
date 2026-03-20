# memory-leak-watcher

A lightweight, zero-dependency Node.js package that detects and reports potential memory leaks in real-time.

---

## Features

- Heap sampling with configurable interval and growth threshold
- Consecutive-leak counter with configurable auto-stop
- Optional timeout-based auto-stop
- Object lifecycle tracking via `WeakRef`
- Estimated object size via own-property traversal
- Express middleware for per-request tracking and reporting
- Structured events (`leak`, `stable`, `stopped`) — integrate with any logger or APM
- Fully documented exports; helper functions are independently unit-testable

---

## Installation

```bash
npm install memory-leak-watcher
```

---

## Quick start

```js
import MemoryLeakWatcher from 'memory-leak-watcher';

const watcher = new MemoryLeakWatcher({
  interval:       5_000,  // sample every 5 s
  threshold:      10,     // warn if heap grows > 10 % in one interval
  maxConsecutive: 3,      // auto-stop after 3 consecutive leak events
  timeout:        60_000, // also auto-stop after 60 s (optional)
});

watcher
  .on('leak',    report => console.error('Leak detected', report))
  .on('stable',  info   => console.log('Heap stable',    info))
  .on('stopped', info   => console.log('Watcher stopped', info))
  .start();

// Stop manually at any time
// watcher.stop();
```

---

## MemoryLeakWatcher

### Constructor options

| Option           | Type     | Default | Description                                            |
|------------------|----------|---------|--------------------------------------------------------|
| `interval`       | `number` | `5000`  | Milliseconds between heap samples.                     |
| `threshold`      | `number` | `10`    | % growth in one interval that constitutes a leak.      |
| `maxConsecutive` | `number` | `3`     | Consecutive leak events before auto-stop.              |
| `timeout`        | `number` | `null`  | Auto-stop after this many ms. `null` = disabled.       |

### Methods

| Method         | Returns           | Description                                                      |
|----------------|-------------------|------------------------------------------------------------------|
| `start()`      | `this`            | Begin polling. Throws if already running.                        |
| `stop()`       | `this`            | Stop polling immediately.                                        |
| `memoryMB`     | `number` (getter) | Current heap usage in MB. Available any time.                    |
| `isRunning`    | `boolean` (getter)| Whether the watcher is currently active.                         |

### Events

#### `'leak'`
Emitted when heap growth exceeds `threshold`.

```js
watcher.on('leak', ({ diff, current, previous, consecutiveLeaks, stack }) => {
  // diff             — growth % (e.g. 23.47)
  // current          — current heap MB
  // previous         — previous heap MB
  // consecutiveLeaks — how many in a row so far
  // stack            — Error stack for rough call-site tracing
});
```

#### `'stable'`
Emitted when a sample is within the threshold. Also resets the consecutive-leak counter.

```js
watcher.on('stable', ({ current }) => { /* current heap MB */ });
```

#### `'stopped'`
Emitted whenever the watcher stops, regardless of cause.

```js
watcher.on('stopped', ({ reason }) => {
  // reason: 'manual' | 'consecutive-leaks' | 'timeout'
});
```

---

## ObjectTracker

Tracks specific objects you suspect may be leaking. Uses `WeakRef` so the GC can still collect them — if an object shows `isAlive: true` long after it should be gone, it's being held somewhere it shouldn't be.

```js
import { ObjectTracker } from 'memory-leak-watcher';

const tracker = new ObjectTracker();

function handleRequest(req) {
  tracker.track(req.body, `req.body:${Date.now()}`);
  // ... process request
}

// Later — inspect what's still in memory
const report = tracker.report();

for (const entry of report) {
  console.log(entry.label, entry.isAlive, entry.estimatedSize + ' MB');
}
```

### Methods

| Method               | Returns                    | Description                                               |
|----------------------|----------------------------|-----------------------------------------------------------|
| `track(obj, label)`  | `this`                     | Register an object. Throws on invalid args.               |
| `untrack(label)`     | `this`                     | Remove a label manually (e.g. after confirmed cleanup).   |
| `report()`           | `TrackedObjectReport[]`    | Snapshot of all entries; prunes GC'd refs as a side-effect. |
| `size`               | `number` (getter)          | Number of currently-registered entries.                   |

### `TrackedObjectReport`

```ts
{
  label:         string   // label passed to track()
  isAlive:       boolean  // true = still in memory
  createdAt:     number   // Unix timestamp (ms)
  stack:         string   // call site of track()
  estimatedSize: number   // approximate MB (0 if GC'd)
}
```

> **Note on size estimates**: `estimatedSize` is a fast heuristic based on own-property traversal up to `maxDepth = 3`. It is *not* v8's precise retained size. Treat it as a ballpark, not a measurement.

---

## Express middleware

```js
import express               from 'express';
import { createLeakMiddleware, ObjectTracker } from 'memory-leak-watcher';

const app     = express();
const tracker = new ObjectTracker();

app.use(express.json());
app.use(createLeakMiddleware(tracker, {
  logMemoryPerRequest: true,   // log heap on every request
  trackRequestBody:    true,   // track req.body through ObjectTracker
  trackRequest:        false,  // track the full req object (heavier)
}));

// Intentional leak — for testing
const leakyCache = [];
app.post('/leak', (req, res) => {
  leakyCache.push(req.body);
  res.json({ status: 'stored' });
});

app.listen(3000);
```

### Middleware options

| Option                 | Type      | Default | Description                              |
|------------------------|-----------|---------|------------------------------------------|
| `logMemoryPerRequest`  | `boolean` | `false` | Log heap MB on every incoming request.   |
| `trackRequestBody`     | `boolean` | `false` | Track `req.body` via ObjectTracker.      |
| `trackRequest`         | `boolean` | `false` | Track the `req` object via ObjectTracker.|

### Sample output

```
[LeakMiddleware] POST /leak — heap: 9.14 MB

[LeakMiddleware] ⚠ Memory leak detected
  Label        : req.body:1748380102900-x7k2q
  Alive for    : 3s 412ms
  Est. size    : 0.000008 MB
  Created at   : 2025-11-20T20:28:22.900Z
  Likely causes:
    • Object held by a global variable or module-level cache
    • Captured inside a long-living closure
    • Stored in req.app.locals, a Map, or a Set that is never cleared
  Creation stack:
    Error: ObjectTracker.track() call site
        at ObjectTracker.track (.../ObjectTracker.js:28:16)
        at leakMiddleware (.../LeakMiddleware.js:44:15)
        ...
```

---

## Standalone watcher + tracker together

```js
import { MemoryLeakWatcher, ObjectTracker } from 'memory-leak-watcher';

const tracker = new ObjectTracker();
const watcher = new MemoryLeakWatcher({ interval: 3_000, threshold: 5 });

watcher.on('leak', report => {
  console.error('Heap grew', report.diff + '%');
  // Dump tracked objects alongside the heap event
  const snapshot = tracker.report();
  console.table(snapshot.map(e => ({
    label:     e.label,
    alive:     e.isAlive,
    sizeMB:    e.estimatedSize.toFixed(6),
    age:       Date.now() - e.createdAt + 'ms',
  })));
});

watcher.start();

// Track something suspicious
const bigCache = { data: new Array(100_000).fill('x') };
tracker.track(bigCache, 'bigCache');
```

---

## Utility exports

These helpers are exported so you can unit-test your own reporting pipeline:

```js
import { formatLeakReport, formatDuration } from 'memory-leak-watcher';

formatDuration(3_412);         // → '3s 412ms'
formatDuration(7_265_000);     // → '2h 1m 5s'
```

---

## Common causes of leaks this package helps you spot

| Pattern                          | What to look for                                           |
|----------------------------------|------------------------------------------------------------|
| Module-level arrays/maps/sets    | Items pushed but never removed — heap grows every request  |
| Event listener accumulation      | `emitter.on()` inside a loop without `removeListener`      |
| Closure over large objects       | A callback retaining a request/response long after finish  |
| `req.app.locals` / `app.set()`   | Data stored at app scope, never pruned                     |
| Cache without eviction           | LRU-less in-memory stores growing without bound            |

---

## License

MIT