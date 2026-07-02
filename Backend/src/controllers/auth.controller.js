// controllers/auth.controller.js
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
};

const generateAccessAndRefreshTokens = async (userId) => {
    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
};

// ---- REGISTER ADMIN ----
// Not public. Only an existing admin can create another admin/staff account.
// Route must be protected with verifyjwt + verifyAdmin middleware.
const registerAdmin = asyncHandler(async (req, res) => {
    const { mobileNumber, username, password } = req.body;

    if (!mobileNumber || !username || !password) {
        throw new ApiError(400, "All fields are required");
    }

    const existingUser = await User.findOne({ mobileNumber });
    if (existingUser) {
        throw new ApiError(409, "User with this mobile number already exists");
    }

    const user = await User.create({
        mobileNumber,
        username,
        password,
        role: "admin"
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while creating the admin account");
    }

    return res
        .status(201)
        .json(new ApiResponse(201, createdUser, "Admin account created successfully"));
});

// ---- LOGIN ----
const login = asyncHandler(async (req, res) => {
    const { mobileNumber, password } = req.body;

    if (!mobileNumber || !password) {
        throw new ApiError(400, "Mobile number and password are required");
    }

    const user = await User.findOne({ mobileNumber }).select("+password");

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    if (user.isBlocked) {
        throw new ApiError(403, "This account has been blocked");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "Logged in successfully"
            )
        );
});

// ---- LOGOUT ----
const logout = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { $unset: { refreshToken: 1 } },
        { new: true }
    );

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "Logged out successfully"));
});

// ---- REFRESH ACCESS TOKEN ----
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is required");
    }

    let decodedToken;
    try {
        decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
        throw new ApiError(401, "Invalid or expired refresh token");
    }

    const user = await User.findById(decodedToken._id);

    if (!user || incomingRefreshToken !== user.refreshToken) {
        throw new ApiError(401, "Invalid or expired refresh token");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(200, { accessToken, refreshToken }, "Access token refreshed")
        );
});

// ---- GET CURRENT ADMIN ----
// Protected route — relies on verifyjwt having already attached req.user.
const getCurrentAdmin = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current admin fetched successfully"));
});

export { registerAdmin, login, logout, refreshAccessToken, getCurrentAdmin };