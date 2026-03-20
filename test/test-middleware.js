import express from 'express';
import createLeakMiddleware from '../package/Leakmiddleware.js';
import ObjectTracker  from '../package/ObjectTracker.js';

const app = express();
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