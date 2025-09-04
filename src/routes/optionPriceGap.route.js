import express from "express";
import asyncHandler from "#utils/asyncHandler";
import OptionPriceGapController from "#controllers/optionPriceGap";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(OptionPriceGapController.get.bind(OptionPriceGapController)))
  .post(asyncHandler(OptionPriceGapController.create.bind(OptionPriceGapController)))
  .put(asyncHandler(OptionPriceGapController.update.bind(OptionPriceGapController)))
  .delete(asyncHandler(OptionPriceGapController.deleteDoc.bind(OptionPriceGapController)));

export default router;
