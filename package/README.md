
# memory-leak-watcher

A lightweight Node.js package to detect and warn about potential memory leaks in real-time.

----------------------------------

## Installation

```bash
npm install memory-leak-watcher


## Express Middleware Usage

```js
import express from "express";
import memoryLeakMiddleware from "memory-leak-watcher";

const app = express();
app.use(memoryLeakMiddleware({ interval: 5000, threshold: 10, logPerRequest: true }));

## Output example (as a middleware)
```yaml
Detected Express environment — running as middleware.
MemoryLeakMonitor started — checking every 10s
Memory used: 24.31 MB
Memory used: 26.44 MB
Memory usage increased by 22.33% — possible memory leak detected!


## Stand-alone usage

```js
import {MemoryLeakWatcher} from "memory-leak-watcher";

const monitor = new MemoryLeakWatcher({ interval: 1000, threshold: 10 });
monitor.start();

## Output example (as a Stand-alone)
```yaml
Running in standalone mode (non-Express).
MemoryLeakMonitor started — checking every 10s
Memory usage increased by 15.83% — possible memory leak detected!

