import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import transporter from "../config/nodemailer.js";

//export const userRegister = async (req, res) => {
//  try {
//    const { companyName, email, address, password, contactNumber, businessType } = req.body;
    

//    // Validate required fields
//    if (!companyName || !email || !address || !password || !contactNumber || !businessType) {
//      return res.status(400).json({ message: "All fields are required" });
//    }

//    // Check if user already exists
//    const existingUser = await userModel.findOne({ email });
//    if (existingUser) {
//      return res.status(400).json({
//        success: false,
//        message: "An account has already been created using this email",
//      });
//    }

//    // Hashed Password
//    const hashedPassword = await bcrypt.hash(password, 10);

//    // Upload Logo to Cloudinary
//    let companyProfileUrl = "";
//    if (req.file) {
//      companyProfileUrl = await uploadToCloudinary(req.file.buffer);
//    }

//    // Create New User
//    const user = new userModel({
//      companyName,
//      email,
//      address,
//      password: hashedPassword,
//      contactNumber,
//      companyProfile: companyProfileUrl,
//      businessType
//    });

//    await user.save();

//    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
//      expiresIn: "7d",
//      issuer: "FBR-IVM",
//    });

//    res.cookie("token", token, {
//      httpOnly: true,
//      secure: true,
//      sameSite: "none",
//      maxAge: 7 * 24 * 60 * 60 * 1000,
//    });

//    // Sending Welcome Email
//    const mailOptions = {
//      from: process.env.SENDER_EMAIL,
//      to: email,
//      subject: "Welcome to FBR IVM",
//      text: `Hello ${companyName},
      
//      Welcome to FBR IVM. We are excited to have you on board.
      
//      Best regards,
//      FBR IVM Team`,
//    }; 

//    await transporter.sendMail(mailOptions);

//    res.status(201).json({
//      success: true,
//      message: "User registered successfully",
//      user: {
//        id: user._id,
//        companyName: user.companyName,
//        email: user.email,
//        companyProfile: user.companyProfile,
//      },
//    });
//  } catch (error) {
//    return res.status(500).json({ success: false, message: error.message });
//  }
//};


export const userRegister = async (req, res) => {
  try {
    console.log("=== [REGISTER START] ===");

    const { companyName, email, address, password, contactNumber, businessType } = req.body;

    console.log("Incoming body:", {
      companyName,
      email,
      address,
      contactNumber,
      businessType,
      hasPassword: !!password,
      hasFile: !!req.file
    });

    if (!companyName || !email || !address || !password || !contactNumber || !businessType) {
      console.warn("Validation failed: Missing fields");
      return res.status(400).json({ message: "All fields are required" });
    }

    console.log("Checking existing user:", email);

    const existingUser = await userModel.findOne({ email });

    if (existingUser) {
      console.warn("User already exists:", email);
      return res.status(400).json({
        success: false,
        message: "An account has already been created using this email",
      });
    }

    console.log("Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Password hashed");

    let companyProfileUrl = "";

    if (req.file) {
      console.log("Uploading file to Cloudinary...");
      companyProfileUrl = await uploadToCloudinary(req.file.buffer);
      console.log("Cloudinary upload success:", companyProfileUrl);
    } else {
      console.log("No file uploaded");
    }

    console.log("Creating user...");

    const user = new userModel({
      companyName,
      email,
      address,
      password: hashedPassword,
      contactNumber,
      companyProfile: companyProfileUrl,
      businessType
    });

    await user.save();
    console.log("User saved:", user._id);

    console.log("Generating JWT...");
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
        issuer: "FBR-IVM",
      }
    );

    console.log("Setting cookie...");

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    console.log("Sending email...");

    await transporter.sendMail({
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: "Welcome to FBR IVM",
      text: `Hello ${companyName},

Welcome to FBR IVM. We are excited to have you on board.`,
    });

    console.log("Email sent");

    console.log("=== [REGISTER SUCCESS] ===");

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        companyName: user.companyName,
        email: user.email,
        companyProfile: user.companyProfile,
      },
    });

  } catch (error) {
    console.error("=== [REGISTER ERROR] ===");
    console.error("Error:", error?.message || error);
    console.error("Stack:", error?.stack);

    return res.status(500).json({
      success: false,
      message: error?.message || "Unknown error",
    });
  }
};
export const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and Password are required" });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid password" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
      issuer: "FBR-IVM",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      user: {
        id: user._id,
        companyName: user.companyName,
        email: user.email,
        companyProfile: user.companyProfile,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const userLogOut = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    res
      .status(200)
      .json({ success: true, message: "User logged out successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const isAuthenticated = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      userId: req.userId,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const sendResetPasswordOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res
      .status(400)
      .json({ success: false, message: "Email is required" });
  }

  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const hashedOtp = await bcrypt.hash(otp, 10);

    user.resetOtp = hashedOtp;
    user.resetOtpExpiryAt = Date.now() + 5 * 60 * 1000;
    await user.save();

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: "Reset Password OTP",
      text: `Your OTP for reset password is ${otp}`,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: "Password reset OTP sent successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword)
    return res.status(400).json({
      success: false,
      message: "Email, OTP and new password are required",
    });

  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (user.resetOtpExpiryAt < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    const isValidOtp = await bcrypt.compare(otp, user.resetOtp || "");
    if (!isValidOtp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOtp = "";
    user.resetOtpExpirytAt = 0;
    await user.save();
    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
