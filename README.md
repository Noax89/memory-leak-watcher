
# memory-leak-watcher

A lightweight Node.js package to detect and warn about potential memory leaks in real-time.


## FEATURES
✔ Live memory sampling
✔ Leak detection threshold
✔ Garbage-collection awareness
✔ Object tracking
✔ Creation stack tracing
✔ Strong reference detection
✔ Middleware integration
✔ Structured diagnostic report


## ADVANTAGES

---->> coming soon...

## CAUSES

---->> coming soon...


## FIXES

---->> coming soon...

## USAGE

 Devs can now use it in express.js app (for now).

----------------------------------
----------------------------------

## Installation

```bash
npm install memory-leak-watcher

```

-----------------------------------------

## Express Middleware Usage

```js
import express from "express";
import MemoryLeakMiddleware, {ObjectTracker} from "memory-leak-watcher";

const tracker = new ObjectTracker();
const app = express();

app.use(express.json());

// Attach middleware
app.use(MemoryLeakMiddleware(tracker, {
  logMemoryPerRequest: true,
  trackRequestBody: true,
  trackRequest: false
}));


// Example routes
const leakyArray = [];

app.post("/leak", (req, res) => {

  // applied intentionally for leak testing
  leakyArray.push(req.body);
  res.json({ status: "leak added" });
});


app.get("/api", (req, res)=>{
  res.json({message:"Leak Guard Api running on loacalhost 5000"})
  console.log("Leak Guard Api running on loacalhost 5000")
})

app.listen(5000, () => console.log("Server running on port 5000"));

```

--------------------------------------------------

## Output example (Express usage)

```yaml
Server running on port 5000
Detected Express — running as middleware
[LeakWatcher] Memory usage: 8.87 MB

          [LeakGuard] ⚠️ Memory Leak Detected!
          Label: requestBody-1763670502900
          Alive for: 22 seconds.
          Leaked Size: 0.00000762939453125 MB
          Reason: Object still strongly referenced after request cycle.

          Potential Causes:
          - Referenced by a global variable
          - Captured inside a closure
          - Being stored in req.app.locals or similar

          Created At: 2025-11-20T20:28:22.900Z

          Creation Stack: Error at -> file: ///C:/Users/PC/../LeakTrackerMiddleWare.js:24:15 ...

```
-----------------------------------------------------------------

## Stand-alone usage (both MemoryLeakWatcher && ObjectTracker)

---->> coming soon...

----------------------------------------------------------

## Stand-alone usage (ObjectTracker only)

---->> coming soon...

----------------------------------------------------------

## Output example (as a Stand-alone)

 ---->> coming soon...
