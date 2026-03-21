import MemoryLeakWatcher from '../src/MemoryLeakWatcher.js';
import ObjectTracker from "../src/ObjectTracker.js"

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