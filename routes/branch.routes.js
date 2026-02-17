import { Router } from "express"
import {
  createBranch,
  editBranch,
  deleteBranch
} from "../controllers/branch.controller.js"
import userAuth from "../middleware/userAuth.js"
import { getBranches } from "../controllers/branch.controller.js"

const router = Router()

router.post("/create", userAuth, createBranch)
router.get("/get",userAuth, getBranches)
router.patch("/edit/:id", userAuth,editBranch)
router.delete("delete/:id", deleteBranch)

export default router
