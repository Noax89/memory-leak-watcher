
import ObjectTracker from '../package/LeakObjectTracker.js';

const tracker = new ObjectTracker();

const userCahche = {};

tracker.track(userCahche, "userCachedObjects")
tracker.check();
