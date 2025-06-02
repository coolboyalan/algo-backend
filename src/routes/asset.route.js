import express from "express";
import asyncHandler from "#utils/asyncHandler";
import AssetController from "#controllers/asset";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(AssetController.get.bind(AssetController)))
  .post(asyncHandler(AssetController.create.bind(AssetController)))
  .put(asyncHandler(AssetController.update.bind(AssetController)))
  .delete(asyncHandler(AssetController.deleteDoc.bind(AssetController)));

export default router;
