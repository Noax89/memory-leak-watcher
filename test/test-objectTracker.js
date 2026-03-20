import ObjectTracker from "../package/ObjectTracker.js";

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