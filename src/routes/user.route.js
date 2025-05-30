import express from "express";
import asyncHandler from "#utils/asyncHandler";
import UserController from "#controllers/user";
import { authentication } from "#middlewares/authentication";

const router = express.Router();

router
  .route("/")
  .post(asyncHandler(UserController.create.bind(UserController)));

router
  .route("/login")
  .post(asyncHandler(UserController.login.bind(UserController)));

router.use(authentication);

router
  .route("/:id?")
  .get(asyncHandler(UserController.get.bind(UserController)))
  .put(asyncHandler(UserController.update.bind(UserController)))
  .delete(asyncHandler(UserController.deleteDoc.bind(UserController)));

export default router;
