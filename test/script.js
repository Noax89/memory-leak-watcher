import { MemoryLeakWatcher } from "../package/index.js";
import ObjectTracker from '../package/LeakObjectTracker.js';

const monitor = new MemoryLeakWatcher({
  interval: 1000,
  threshold: 10,
  timeout: 10000
});

const tracker = new ObjectTracker();
tracker.track({})
tracker.check();


// Listen for memory leak events
monitor.start("Leak Detected", ({ diff, current, previous }) => {
  console.log("Leak detected!", { diff, current, previous });
});

//stop after 10 seconds
monitor.stopTimer()

// allocate memory to test
// const memoryHog = [];
// setInterval(() => {
//   for (let i = 0; i < 100000; i++) {
//     memoryHog.push(i);
//   }
// }, 2000);
