import express from "express";
import asyncHandler from "#utils/asyncHandler";
import BrokerController from "#controllers/broker";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(BrokerController.get.bind(BrokerController)))
  .post(asyncHandler(BrokerController.create.bind(BrokerController)))
  .put(asyncHandler(BrokerController.update.bind(BrokerController)))
  .delete(asyncHandler(BrokerController.deleteDoc.bind(BrokerController)));

export default router;
