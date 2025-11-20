

// Middleware function && 
// Automatically detects if used in Express or standalone.

export function MemoryLeakMiddleware (tracker, options={}){
  
  const { logMemoryPerRequest = true, trackRequestBody = true, trackRequest = false } = options;

  return function(req, res, next){

    // Auto Detect Express environment
    const isExpress = req && res && typeof next === "function";

    if (isExpress) {
      console.log("Detected Express — running as middleware");
    } else {
      console.log("Running in standalone mode");
    }


    // TRACK OBJECTS
    if(trackRequestBody && req.body){
      tracker.track(req.body, `requestBody-${Date.now()}`)
    }
    if(trackRequest){
      tracker.track(req.body, `requestObject-${Date.now()}`)
    }

    // Log memory per request
    if(logMemoryPerRequest && typeof process.memoryUsage === "function"){
      const processMemomory = process.memoryUsage();
      console.log("[LeakWatcher] Memory usage:", (processMemomory.heapUsed / 1024 / 1024).toFixed(2), "MB");
    }

    // Analyse after response ends
    res.on("finish", ()=>{
      const memoryLeakReport = tracker.getTrackedObjects().filter(o => o.isAlive);
      
      memoryLeakReport.forEach(leak => {

        if(!leak.isAlive){
          console.log(`[LeakGuard] ${leak.label} — no memory issues detected.`);
        }

        else{
          console.log(`
          [LeakGuard] ⚠️ Memory Leak Detected!
          Label: ${leak.label}
          Alive for: ${new Date().getSeconds()} seconds.
          Leaked Size: ${leak.estimatedSize ?? "unknown"} MB
          Reason: Object still strongly referenced after request cycle.

          Potential Causes:
          - Referenced by a global variable
          - Stored in a long-living map or cache
          - Captured inside a closure
          - Being stored in req.app.locals or similar

          Created At: ${new Date(leak.createdAt).toISOString()}

          Creation Stack:
          ${leak.creationStack}
          `);
        };

      });
    })

    next();
  }
}
