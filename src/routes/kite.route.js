import express from "express";
import asyncHandler from "#utils/asyncHandler";
import KiteController from "#controllers/kite";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// router.use(authentication);

router
  .route("/login/:userId")
  .get(asyncHandler(KiteController.login.bind(KiteController)));

router
  .route("/:id?")
  .get(asyncHandler(KiteController.get.bind(KiteController)))
  .post(asyncHandler(KiteController.create.bind(KiteController)))
  .put(asyncHandler(KiteController.update.bind(KiteController)))
  .delete(asyncHandler(KiteController.deleteDoc.bind(KiteController)));

export default router;
