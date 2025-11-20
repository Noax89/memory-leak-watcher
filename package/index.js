import EventEmitter from 'events';

class MemoryLeakWatcher extends EventEmitter{
  constructor({interval, threshold, timeout} = {}){
    super();
    this.interval = interval;
    this.threshold = threshold;
    this.timeout = timeout;
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

  stopTimer(){
  setTimeout(() => {
  this.stop();
  }, this.timeout);
  }

  check(){
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    const current = parseFloat(used.toFixed(2));

    // skip difference (diff) check on first run
    if (this.previousMemory === null) {
    this.previousMemory = current;
    console.log(`Initial memory: ${current} MB`);
    return;
  }

    const diff =((current - this.previousMemory)/this.previousMemory) * 100;

    if(diff > this.threshold){
      const error = new Error("New Memory Leak Trace");
      const stack = error.stack;

      const report = { 
        diff, 
        current, 
        previous: this.previousMemory, 
        stack,
      }

      const message = `Memory usage increased by ${diff.toFixed(2)}% \n
      (prev: ${this.previousMemory}MB → curr: ${current}MB) 
      - possible memory leak detected!`;
      console.warn(message, report); 

      this.emit("Leak Detected", report)
      
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

export {MemoryLeakWatcher}