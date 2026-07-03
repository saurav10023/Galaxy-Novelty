import express from "express";

const router = express.Router();

router.post("/fill", (req, res) => {
  console.log("AI FILL HIT");
  res.json({ success: true });
});
router.post("/", (req, res) => {
  console.log("AI FILL HIT");
  res.json({ success: true });
});

export default router;