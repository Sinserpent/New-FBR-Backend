import express from "express";
import { getUserData, updateUserProfile, updateProfileImage } from "../controllers/userController.js";
import { saveProductionToken } from "../controllers/userController.js";
import userAuth from "../middleware/userAuth.js";
import upload from "../middleware/multer.js";

const userRouter = express.Router();

userRouter.get("/getUserData", userAuth, getUserData);
userRouter.put("/updateProfile", userAuth , updateUserProfile)
userRouter.post("/updateProductionToken", userAuth, saveProductionToken);
userRouter.post("/updateProfileImage", userAuth ,  upload.single("companyProfile"), updateProfileImage )

export default userRouter;
