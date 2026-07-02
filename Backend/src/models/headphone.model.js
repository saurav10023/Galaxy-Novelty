// models/headphone.model.js
import { Schema } from "mongoose";
import { Product } from "./Product.model.js";

const headphoneSchema = new Schema({
    type: {
        type: String,
        enum: ["tws", "neckband", "wired", "over-ear"],
        required: true,
        index: true
    },
    bluetoothVersion: {
        type: String 
    },
    batteryLife: {
        type: String 
    },
    noiseCancellation: {
        type: Boolean,
        default: false,
        index: true
    },
    waterResistance: {
        type: String // "IPX5"
    },
    color: {
        type: String,
        trim: true
    }
});

export const Headphone = Product.discriminator("headphone", headphoneSchema);