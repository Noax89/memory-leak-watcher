import EventEmitter from 'events';

class MemoryLeakWatcher extends EventEmitter{
  constructor({interval, threshold, logPerRequest = false} = {}){
    super();
    this.interval = interval;
    this.logPerRequest = logPerRequest;
    this.threshold = threshold;
    this.previousMemory = 0;
    this.timer = null;
    this.consecutiveLeaks = 0;
  }

  start(){
    this.previousMemory = process.memoryUsage().heapUsed;
    this.timer = setInterval(()=> this.check(),this.interval);
    console.log(`MemoryLeakWatcher started -checking every ${this.interval/100}s.`);
  }

  stop(){
    if(this.timer) clearInterval(this.timer);
    console.log("MemoryLeakWatcher stopped.")
  }

  check(){
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    const current = parseFloat(used.toFixed(2));
    current
    // skip difference (diff) check on first run
    if (this.previousMemory === null) {
    this.previousMemory = current;
    console.log(`Initial memory: ${current} MB`);
    return;
  }

    const diff =((current - this.previousMemory)/this.previousMemory) * 100;

    if(diff > this.threshold){
      const message = `Memory usage increased by ${diff.toFixed(2)}% \n(prev: ${this.previousMemory}MB → curr: ${current}MB) 
      - possible memory leak detected!`;
      console.warn(message); 

      this.emit("Leak Detected", { diff, current, previous: this.previousMemory})
      
      // this is optional: Take a heap snapshot or count this as a warning strike
      this.consecutiveLeaks = (this.consecutiveLeaks || 0) + 1;

    }
     // stop immediately if multiple consecutive leaks is been detected

      if(this.consecutiveLeaks >= 3){
        console.log(`Detected multiple leaks in a row. Stopping monitor...`);
        this.stop();
      }
      else{
        // Reset strike count if stable
        this.consecutiveLeaks = 0; 
        console.log(`Memory stable: ${current} MB`)
      }

    this.previousMemory = current;

  }

  
   getMemoryUsage(){
      return (process.memoryUsage().heapUsed / 1024 / 1024 ).toFixed(2) + "MB";
    }
}


// Middleware function && 
// Automatically detects if used in Express or standalone.

const memoryLeakMiddleware =(options ={})=>{
  const monitor = new MemoryLeakWatcher(options);
  monitor.start();

  const middleware = (req, res, next)=>{

    if(monitor.logPerRequest){
    console.log(`Memory usage: ${monitor.getMemoryUsage()}`)
    next();
    }
  
  // Auto-detect Express usage
  const isExpressEnvironment = typeof options === "obeject" && process.main?.children?.some((module)=>
  module.id.includes("express"))


  // if !express switch to stand-alone mode

  if(!isExpressEnvironment){
     console.log("Running in standalone mode (non-Express).");
  } else {
    console.log("Detected Express environment — running as middleware.");
  }

  // return middleware (works for both mode)
  return middleware;

  }
}


// OBJECT TRACKER
/* A class based object that Wraps known objects (arrays, requests, etc.), 
Keeps WeakRefs then report which ones never got garbage-collected */

class objectTracker{
    constructor(){
      this.refs = new Set();
    }

    /*Track objects, push garbaged objects to weakRefs
     and cleanup the object if nothing else is refrencing it.*/

    track(obj, label = "unknown"){
      this.refs.add({ r: new WeakRef(obj), label})
    }

    //check then report which ones never got garbage-collected

    check(){
      for(const entry of this.refs){
        if(entry.r.deref()){
        console.log(`Object [${entry.label}] still alive`);
        }
      }
    }
}


export default memoryLeakMiddleware;
export {MemoryLeakWatcher, objectTracker}