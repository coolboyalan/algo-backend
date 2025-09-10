import express from "express";
import asyncHandler from "#utils/asyncHandler";
import OptionTradeLogController from "#controllers/optionTradeLog";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(OptionTradeLogController.get.bind(OptionTradeLogController)))
  .post(asyncHandler(OptionTradeLogController.create.bind(OptionTradeLogController)))
  .put(asyncHandler(OptionTradeLogController.update.bind(OptionTradeLogController)))
  .delete(asyncHandler(OptionTradeLogController.deleteDoc.bind(OptionTradeLogController)));

export default router;
