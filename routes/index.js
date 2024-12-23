import express from "express";
import hospital from "./hospital.js";
const router = express.Router();

router.use("/hospital", hospital);

export default router;
