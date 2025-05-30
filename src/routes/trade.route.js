import express from "express";
import asyncHandler from "#utils/asyncHandler";
import TradeController from "#controllers/trade";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(TradeController.get.bind(TradeController)))
  .post(asyncHandler(TradeController.create.bind(TradeController)))
  .put(asyncHandler(TradeController.update.bind(TradeController)))
  .delete(asyncHandler(TradeController.deleteDoc.bind(TradeController)));

export default router;
