import UserService from "#services/user";
import bcrypt from "bcryptjs";
import BaseController from "#controllers/base";
import { createToken } from "#utils/jwt";
import AppError from "#utils/appError";
import httpStatus from "http-status";
import { sendResponse } from "#utils/response";
import { session } from "#middlewares/requestSession";

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

    const token = createToken(payload);

    const data = {
      token,
      refreshToken: null, // if you use refresh tokens later
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar || null,
        emailVerified: user.emailVerified ?? false,
        permissions: user.permissions || [],
      },
      expiresIn: 604800, // 7 days
    };

    sendResponse(httpStatus.OK, res, data, "Logged in successfully");
  }

  static async create(req, res, next) {
    const user = await this.Service.create(req.body);
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = createToken(payload);

    const data = {
      token,
      refreshToken: null, // if you use refresh tokens later
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar || null,
        emailVerified: user.emailVerified ?? false,
        permissions: user.permissions || [],
      },
      expiresIn: 604800, // 7 days
    };

    sendResponse(httpStatus.OK, res, data, "Account created successfully");
  }
}

export default UserController;
