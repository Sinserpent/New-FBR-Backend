import userModel from "../models/userModel.js";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";

export const getUserData = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await userModel.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    return res.status(200).json({
      success: true,
      message: "User Data Fetched Successfully",
      userData: {
        companyName: user.companyName,
        companyProfile: user.companyProfile,
        address: user.address,
        contactNumber: user.contactNumber,
        email: user.email
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.userId;

    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating data",
    });
  }
};



export const updateProfileImage = async (req, res, next) => {
  try {
    const userId = req.userId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image provided",
      });
    }

    const companyProfile = await uploadToCloudinary(req.file);

    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { $set: { companyProfile } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      companyProfile,
    });
  } catch (err) {
    next(err);
  }
};
