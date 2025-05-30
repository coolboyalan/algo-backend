import express from "express";
import asyncHandler from "#utils/asyncHandler";
import DailyLevelController from "#controllers/dailyLevel";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(DailyLevelController.get.bind(DailyLevelController)))
  .post(asyncHandler(DailyLevelController.create.bind(DailyLevelController)))
  .put(asyncHandler(DailyLevelController.update.bind(DailyLevelController)))
  .delete(asyncHandler(DailyLevelController.deleteDoc.bind(DailyLevelController)));

export default router;
