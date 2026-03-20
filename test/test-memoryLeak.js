import MemoryLeakWatcher from "../package/MemoryLeakWatcher.js";

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