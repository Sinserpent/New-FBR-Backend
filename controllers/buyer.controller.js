import Buyer from "../models/buyer.model.js";

export const createBuyer = async (req, res) => {
  try {
    const userId = req.userId;
    const { customerName, cnicOrNtn, companyAddress, fbrBuyerRegistrationType } = req.body;

    if (!customerName || !cnicOrNtn || !companyAddress || !fbrBuyerRegistrationType) {
      return res.status(400).json({
        message: "customerName, cnicOrNtn, companyAddress and fbrBuyerRegistrationType are required",
      });
    }

    if (!["Registered", "Unregistered"].includes(fbrBuyerRegistrationType)) {
      return res.status(400).json({
        message: "fbrBuyerRegistrationType must be Registered or Unregistered",
      });
    }

    const buyer = await Buyer.create({
      userId,
      customerName: customerName.trim(),
      cnicOrNtn: cnicOrNtn.trim(),
      companyAddress: companyAddress.trim(),
      fbrBuyerRegistrationType,
    });

    return res.status(201).json({
      success: true,
      message: "Buyer created successfully",
      data: buyer,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Buyer with this CNIC/NTN already exists",
        error: error.message,
      });
    }
    return res.status(500).json({
      message: "Failed to create buyer",
      error: error.message,
    });
  }
};

export const getBuyers = async (req, res) => {
  try {
    const userId = req.userId;
    const buyers = await Buyer.find({ userId }).sort({ customerName: 1 });
    return res.status(200).json({
      success: true,
      data: buyers,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch buyers",
      error: error.message,
    });
  }
};

export const getBuyerById = async (req, res) => {
  try {
    const userId = req.userId;
    const buyer = await Buyer.findOne({ _id: req.params.id, userId });

    if (!buyer) {
      return res.status(404).json({ message: "Buyer not found" });
    }

    return res.status(200).json({
      success: true,
      data: buyer,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch buyer",
      error: error.message,
    });
  }
};

export const updateBuyer = async (req, res) => {
  try {
    const userId = req.userId;
    const updateFields = {};

    if (req.body.customerName !== undefined) {
      updateFields.customerName = String(req.body.customerName).trim();
    }
    if (req.body.cnicOrNtn !== undefined) {
      updateFields.cnicOrNtn = String(req.body.cnicOrNtn).trim();
    }
    if (req.body.companyAddress !== undefined) {
      updateFields.companyAddress = String(req.body.companyAddress).trim();
    }
    if (req.body.fbrBuyerRegistrationType !== undefined) {
      if (!["Registered", "Unregistered"].includes(req.body.fbrBuyerRegistrationType)) {
        return res.status(400).json({
          message: "fbrBuyerRegistrationType must be Registered or Unregistered",
        });
      }
      updateFields.fbrBuyerRegistrationType = req.body.fbrBuyerRegistrationType;
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: "At least one field must be provided" });
    }

    const buyer = await Buyer.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!buyer) {
      return res.status(404).json({ message: "Buyer not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Buyer updated successfully",
      data: buyer,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Buyer with this CNIC/NTN already exists",
        error: error.message,
      });
    }
    return res.status(500).json({
      message: "Failed to update buyer",
      error: error.message,
    });
  }
};

export const deleteBuyer = async (req, res) => {
  try {
    const userId = req.userId;
    const deleted = await Buyer.findOneAndDelete({
      _id: req.params.id,
      userId,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Buyer not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Buyer deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete buyer",
      error: error.message,
    });
  }
};
