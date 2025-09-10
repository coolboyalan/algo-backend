import express from "express";
import asyncHandler from "#utils/asyncHandler";
import OptionBufferController from "#controllers/optionBuffer";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

// router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(OptionBufferController.get.bind(OptionBufferController)))
  .post(asyncHandler(OptionBufferController.create.bind(OptionBufferController)))
  .put(asyncHandler(OptionBufferController.update.bind(OptionBufferController)))
  .delete(asyncHandler(OptionBufferController.deleteDoc.bind(OptionBufferController)));

export default router;
