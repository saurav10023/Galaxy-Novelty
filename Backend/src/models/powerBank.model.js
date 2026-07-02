// models/powerbank.model.js
import { Schema } from "mongoose";
import { Product } from "./product.model.js";

const powerBankSchema = new Schema({
    capacity: {
        type: Number, // store as mAh, e.g. 10000 (append "mAh" in frontend)
        required: true,
        index: true
    },
    outputPorts: {
        type: Number,
        default: 1
    },
    inputPortType: {
        type: String,
        enum: ["Type-C", "Micro-USB", "Lightning", "Multi-port"],
        required: true,
        index: true
    },
    outputPortType: {
        type: [String], // array since many powerbanks have multiple output types (e.g. Type-C + USB-A)
        enum: ["Type-C", "USB-A", "Lightning", "Micro-USB"],
        required: true
    },
    chargingType: {
        type: String,
        enum: [
            "Standard Charging",
            "Fast Charging",
            "Super Fast Charging",
            "Super VOOC",
            "VOOC",
            "Warp Charge",
            "Dash Charge",
            "SuperCharge",
            "Flash Charge",
            "Turbo Power",
            "Power Delivery (PD)",
            "Quick Charge (QC)"
        ],
        default: "Standard Charging",
        index: true
    },
    wattageOutput: {
        type: Number, // e.g. 22.5 (append "W" in frontend), better for sort/filter than string
        index: true
    },
    fastChargingSupport: {
        type: Boolean,
        default: false,
        index: true
    },
    wirelessCharging: {
        type: Boolean,
        default: false,
        index: true
    },
    displayType: {
        // increasingly common in modern powerbanks
        type: String,
        enum: ["None", "LED Indicator", "Digital Display"],
        default: "LED Indicator"
    },
    color: {
        type: String,
        trim: true
    }
});

export const PowerBank = Product.discriminator("powerbank", powerBankSchema);