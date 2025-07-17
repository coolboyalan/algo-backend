import express from "express";
import asyncHandler from "#utils/asyncHandler";
import BrokerKeyController from "#controllers/brokerKey";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router.use(authentication);

router
  .route("/stop/:id?")
  .put(asyncHandler(BrokerKeyController.stop.bind(BrokerKeyController)));

router
  .route("/:id?")
  .get(asyncHandler(BrokerKeyController.get.bind(BrokerKeyController)))
  .post(asyncHandler(BrokerKeyController.create.bind(BrokerKeyController)))
  .put(asyncHandler(BrokerKeyController.update.bind(BrokerKeyController)))
  .delete(
    asyncHandler(BrokerKeyController.deleteDoc.bind(BrokerKeyController)),
  );

export default router;
