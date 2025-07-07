import express from "express";
import asyncHandler from "#utils/asyncHandler";
import AdminController from "#controllers/admin";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router.use(authentication);

router
  .route("/broker-key/:id?")
  .get(asyncHandler(AdminController.getBrokerKey.bind(AdminController)))
  .put(asyncHandler(AdminController.updateBrokerKey.bind(AdminController)));

router
  .route("/user/:id?")
  .get(asyncHandler(AdminController.getUsers.bind(AdminController)))
  .put(asyncHandler(AdminController.updateUser.bind(AdminController)));

router
  .route("/:id?")
  .get(asyncHandler(AdminController.get.bind(AdminController)))
  .post(asyncHandler(AdminController.create.bind(AdminController)))
  .put(asyncHandler(AdminController.update.bind(AdminController)))
  .delete(asyncHandler(AdminController.deleteDoc.bind(AdminController)));

export default router;
