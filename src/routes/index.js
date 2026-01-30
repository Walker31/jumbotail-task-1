import { Router } from "express";
import apiRoutes from "./api/index.js";
import healthRoutes from "./health.js";

const router = Router();

router.get("/", (req, res) =>
  res.json({ message: "Hello from API" })
);

router.use("/api/v1", apiRoutes);

router.use("/health", healthRoutes);

export default router;
