import express from "express";
import upload from "../middleware/multer.js";
import {
  userRegister,
  userLogin,
  userLogOut,
  isAuthenticated,
  sendResetPasswordOtp,
  resetPassword,
} from "../controllers/authController.js";
import userAuth from "../middleware/userAuth.js";

const authRouter = express.Router();

// Register Route
authRouter.post("/register", upload.single("companyProfile"), userRegister);

// Login Route
authRouter.post("/login", userLogin);

// Logout Route
authRouter.post("/logout", userLogOut);

// authenticated Route
authRouter.get("/status", userAuth, isAuthenticated);

// SendResetOtp Route
authRouter.post("/sendResetPasswordOtp", sendResetPasswordOtp);

// ResetPassword Route
authRouter.post("/resetPassword", resetPassword);

export default authRouter;
