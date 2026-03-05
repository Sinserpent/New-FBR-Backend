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
        email: user.email,
        productionApiStatus: user.productionApiStatus,
        businessType: user.businessType,
        fbrApprovedScenarios: user.fbrApprovedScenarios,
        fbrSandboxPassedAt:   user.fbrSandboxPassedAt,
        sellerNTNCNIC:        user.sellerNTNCNIC,
        sellerProvince:       user.sellerProvince,
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

export const saveProductionToken = async (req, res) => {
  console.log(`[${new Date().toISOString()}] POST /production-token hit`);
  console.log("Authenticated userId:", req.userId);

  try {
    const { productionToken } = req.body;
    console.log(req.body)
    console.log("Request body received:", {
      hasToken: !!productionToken,
    });

    if (!productionToken) {
      console.warn("productionApiToken missing in request");

      return res.status(400).json({
        success: false,
        message: "productionApiToken is required",
      });
    }

    console.log("Fetching user from DB...");

    const user = await userModel.findById(req.userId);

    if (!user) {
      console.warn("User not found for ID:", req.userId);

      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("User found. Updating production API token...");

    user.productionToken = productionToken;
    user.productionApiStatus = true;

    await user.save(); // encryption happens in pre-save

    console.log("Production API token encrypted and saved successfully.");

    return res.status(200).json({
      success: true,
      message: "Production API token saved securely",
    });

  } catch (error) {
    console.error("Error saving production token:", {
      message: error.message,
      stack: error.stack,
    });

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};