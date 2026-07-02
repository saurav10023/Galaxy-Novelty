// routes/auth.routes.js
import { Router } from "express";
import {
    registerAdmin,
    login,
    logout,
    refreshAccessToken,
    getCurrentAdmin,
    
} from "../controllers/auth.controller.js";
import { verifyjwt } from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/authAdmin.middleware.js";
import { loginLimiter } from "../middlewares/rateLimiting.middleware.js";

const router = Router();

router.route("/login").post(loginLimiter, login);
router.route("/refresh-token").post(refreshAccessToken);

// protected routes
router.route("/logout").post(verifyjwt, logout);
router.route("/register").post(verifyjwt, verifyAdmin, registerAdmin);

router.route("/current-admin").get(verifyjwt,getCurrentAdmin);

export default router;