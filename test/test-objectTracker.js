import {ObjectTracker} from "../src/ObjectTracker.js";

const tracker = new ObjectTracker();

// Simulate a request body
function handleRequest(body) {
  tracker.track(body, `req.body:${Date.now()}`);
  console.log('Tracked. Size now:', tracker.size);
}

// Hold a strong reference — this object will show isAlive: true
const persistedBody = { user: 'alice', action: 'login', data: 'x'.repeat(500) };
handleRequest(persistedBody);

// This one has no external reference — GC may collect it
// (but in practice V8 won't GC it this quickly without pressure)
handleRequest({ user: 'bob', action: 'logout' });

// Inspect what's still alive
const report = tracker.report();

for (const entry of report) {
  console.log(
    entry.label,
    '| alive:', entry.isAlive,
    '| size:', entry.estimatedSize.toFixed(6), 'MB'
  );
}