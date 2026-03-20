/**
 * memory-leak-watcher
 * Public API surface.
 */

export { MemoryLeakWatcher } from './src/MemoryLeakWatcher.js';
export { ObjectTracker }     from './src/ObjectTracker.js';
export {
  createLeakMiddleware,
  formatLeakReport,
  formatDuration,
}                            from './src/Leakmiddleware.js';

// Default export for the most common use-case
export { MemoryLeakWatcher as default } from './src/MemoryLeakWatcher.js';