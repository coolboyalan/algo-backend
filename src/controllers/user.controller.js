import UserService from "#services/user";
import bcrypt from "bcryptjs";
import BaseController from "#controllers/base";
import { createToken } from "#utils/jwt";

class UserController extends BaseController {
  static Service = UserService;

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).send("Email and password are required.");
      }

      const user = await this.Service.getDoc({ email });

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).send("Invalid email or password.");
      }

      const payload = {
        userId: user.id,
        email: user.email,
        name: user.name,
      };

      const token = createToken(payload);

      return res.status(200).json({
        status: true,
        message: "Login successful",
        token,
        name: user.name,
        email: user.email,
      });
    } catch (err) {
      next(err);
    }
  }
}

export default UserController;
