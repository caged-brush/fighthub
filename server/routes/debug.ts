// routes/debug.ts
import express, { Request, Response } from "express";

const router = express.Router();

router.post("/", (req: Request, res: Response) => {
  console.log("========== MOBILE DEBUG LOG ==========");
  console.dir(req.body, { depth: null });
  console.log("======================================");

  res.json({ ok: true });
});

export default router;
