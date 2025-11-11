import EventEmmitter from 'events';

class MemoryLeakWatcher extends EventEmmitter{
  constructor({interval = 5000, threshold = 10} = {}){
    super();
    this.interval = interval;
    this.threshold = threshold;
    this.previousMemory = 0;
    this.timer = null;
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
    const current = process.memoryUsage().heapUsed;
    const diff =((current -this.previousMemory)/this.previousMemory) * 100;

    if(diff > this.threshold){
      const message = `Memory useage increased by ${diff.toFixed(2)}% - possible memory leak detected!`;
      console.warn(message)
      this.emit("Leak Detected", { diff, current, previous: this.previousMemory})
    }

    this.previousMemory = current;
  }
}

const memoryLeakMiddleware =(options ={})=>{
  const monitor = new MemoryLeakWatcher(options);
  monitor.start();

  return(req, res, next)=>{
    // Log long memory per request
    const used = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    console.log(`Memory used: ${used}MB`);
    next();
  }
}

export default memoryLeakMiddleware;
export {MemoryLeakWatcher}