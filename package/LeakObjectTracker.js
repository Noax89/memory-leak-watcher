

class ObjectTracker{
  
    constructor(){
      this.tracked = new Map()
    }

    /* Get a near accurate consumed (object) memory while reads
    ========================================================= 
    This reads faster and preventing slow scanning while reading
    larget amount of objects */

    approximateSizeOf(object, maxDepth = 3){

      const objSeen = new Set();
      const stack = [{value: object, depth: 0}];
      let bytes = 0;


      const SIZE_HANDLERS = {
      "boolean": () => 4,
      "number": () => 8,
      "string": (value) => value.length * 2,
      };

      while(stack.length){
        const { value, depth } = stack.pop(); //remove the last object from array && return
        
        const type = typeof value;


        // This handles a fast type (instead of if/esle statement)
        if(SIZE_HANDLERS[type]){
          bytes += SIZE_HANDLERS[type](value);
          continue;
        }

        if(type === "object" && value !== null && !objSeen.has(value)){

          objSeen.add(value);

          if(depth < maxDepth){
            for(const key in value){
              stack.push({ value: value[key], depth: depth + 1});
            }
          }
        }

      }

      return bytes / 1024 / 1024;
      
    }


     track(obj, label){
      const error = new Error()
      const stack = error.stack;

      this.tracked.set(label, {
      ref: new WeakRef(obj),
      createdAt: Date.now(),
      creationStack: stack,
      });
     }

 

    check() {
    for (const [label, entry] of this.tracked.entries()) {
    const obj = entry.ref.deref();

    const report = {
      label,
      isAlive: !!obj,  // returns true = still in memory
      createdAt: entry.createdAt,
      creationStack: entry.creationStack,
      estimatedSize: obj ? this.approximateSizeOf(obj) : 0
    };

    if (!obj) this.tracked.delete(label);
    console.log(report);
  }
}

    // Return full metadata for MemoryLeakWatcher
    getTrackedObjects(){
      const results = [];

      for (const [label, entry] of this.tracked.entries()){
        const obj = entry.ref.deref();

        results.push({
          label,
          isAlive: !!obj,  // returns true = still in memory
          createdAt: entry.createdAt,
          creationStack: entry.creationStack,
          estimatedSize: obj ? this.approximateSizeOf(obj) : 0
        });
      }

      return results
    }
}

export default ObjectTracker