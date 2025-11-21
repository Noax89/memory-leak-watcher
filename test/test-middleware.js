import express from "express";
import ObjectTracker from "../package/LeakObjectTracker.js";
import  MemoryLeakMiddleware  from "../package/LeakTrackerMiddleWare.js";

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

app.post("/ok", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/api", (req, res)=>{
  res.json({message:"Leak Guard Api running on loacalhost 5000"})
  console.log("Leak Guard Api running on loacalhost 5000")
})

app.listen(5000, () => console.log("Server running on port 5000"));