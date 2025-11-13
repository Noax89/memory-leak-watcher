import { MemoryLeakWatcher, objectTracker } from 'memory-leak-watcher';

const monitor = new MemoryLeakWatcher({ interval: 1000, threshold: 10, logPerRequest: true });

// start monitoring
monitor.start();


const track = new objectTracker();
const userCache = {};
track.track(userCache, "userCachedObject")



// Listen for memory leak events
// watcher.start("Leak Detected", ({ diff, current, previous }) => {
//   console.log("Leak detected!", { diff, current, previous });
// });

//stop after 10 seconds
// setTimeout(() => {
//   watcher.stop();
// }, 10000);

// allocate memory to test
// const memoryHog = [];
// setInterval(() => {
//   for (let i = 0; i < 100000; i++) {
//     memoryHog.push(i);
//   }
// }, 2000);
