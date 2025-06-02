import express from "express";
import asyncHandler from "#utils/asyncHandler";
import DashboardController from "#controllers/dashboard";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(DashboardController.get.bind(DashboardController)));

export default router;
