import UserService from "#services/user";
import bcrypt from "bcryptjs";
import BaseController from "#controllers/base";
import { createToken } from "#utils/jwt";
import AppError from "#utils/appError";
import httpStatus from "http-status";
import { sendResponse } from "#utils/response";

class UserController extends BaseController {
  static Service = UserService;

  static async login(req, res, next) {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError({
        message: "Email and password are required.",
        httpStatus: httpStatus.UNAUTHORIZED,
      });
    }

    const user = await this.Service.getDoc({ email });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError({
        message: "Incorrect Password",
        httpStatus: httpStatus.UNAUTHORIZED,
      });
    }

    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    console.log(user.toJSON());

    const token = createToken(payload);

    sendResponse(httpStatus.OK, res, {
      status: true,
      message: "Login successful",
      token,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  }
}

export default UserController;
