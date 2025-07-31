import express from "express";
import authenticateToken from "../middleware/auth.js";
import { hackrx } from "../controllers/hackrxController.js"; // If you exported it with `export const hackrx = ...`

const router = express.Router();

router.post("/hackrx/run", authenticateToken, hackrx);

export default router;
