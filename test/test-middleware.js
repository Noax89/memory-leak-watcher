import express from 'express';
import createLeakMiddleware from '../src/Leakmiddleware.js';
import {ObjectTracker}  from '../src/ObjectTracker.js';

const app = express();
const tracker = new ObjectTracker();

app.use(express.json());
app.use(createLeakMiddleware(tracker, {
  logMemoryPerRequest: true,   // log heap on every request
  trackRequestBody:    true,   // track req.body through ObjectTracker
  trackRequest:        false,  // track the full req object (heavier)
}));

// Intentional leak — every POST body gets pushed here and never removed
const leakyCache = [];

app.post('/leak', (req, res) => {
  leakyCache.push(req.body);           // strong reference → will show isAlive: true
  res.json({ status: 'stored', total: leakyCache.length });
});

app.get('/safe', (req, res) => {
  res.json({ message: 'no body tracked here' });
});

app.listen(3000, () => {
  console.log('Server on http://localhost:3000');
  console.log('Try:  curl -X POST http://localhost:3000/leak -H "Content-Type: application/json" -d \'{"user":"alice"}\'');
});