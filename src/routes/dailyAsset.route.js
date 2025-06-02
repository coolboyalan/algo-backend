import express from "express";
import asyncHandler from "#utils/asyncHandler";
import DailyAssetController from "#controllers/dailyAsset";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(DailyAssetController.get.bind(DailyAssetController)))
  .post(asyncHandler(DailyAssetController.create.bind(DailyAssetController)))
  .put(asyncHandler(DailyAssetController.update.bind(DailyAssetController)))
  .delete(asyncHandler(DailyAssetController.deleteDoc.bind(DailyAssetController)));

export default router;
