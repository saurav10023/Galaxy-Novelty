import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema({
    mobileNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        match: [/^[0-9]{10}$/, "Please use a valid mobile number"]
    },
    username: {        // <-- standardized field
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    avatar: {
        type: String,
        default: "https://cdn-icons-png.flaticon.com/512/149/149071.png"
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: 6,
        select: false
    },
    role: {
        type: String,
        enum: ["customer", "admin"],
        default: "customer"
    },
    addresses: [
    {
    name: String,
    phone: String,
    fullAddress: String,
    isDefault: {
        type: Boolean,
        default: false
    }
    }
    ],
    isBlocked: {
        type: Boolean,
        default: false
    },

    refreshToken: {
        type: String
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
});

// Check password
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password);
}

// Generate JWT access token
userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            mobileNumber: this.mobileNumber,
            username: this.username,  // <-- fixed
            role: this.role
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );
}

// Generate JWT refresh token
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            role: this.role
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
}

export const User = mongoose.model("User", userSchema);