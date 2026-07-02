// models/charger.model.js
import { Schema } from "mongoose";
import { Product } from "./Product.model.js";

const chargerSchema = new Schema({
    wattage: {
        type: String,
        required: true,
        index: true
    },
    portType: {
        type: String,
        enum: ["Type-C", "Micro-USB", "Lightning", "Multi-port"],
        required: true,
        index: true
    },
    chargingType: {
        type: String,
        enum: [
            "Standard Charging",
            "Fast Charging",
            "Super Fast Charging",     // Samsung
            "Super VOOC",               // Oppo
            "VOOC",                     // Oppo (older)
            "Warp Charge",              // OnePlus
            "Dash Charge",              // OnePlus (older)
            "SuperCharge",              // Huawei
            "Flash Charge",             // Realme
            "Turbo Power",              // Xiaomi
            "Power Delivery (PD)",      // universal standard
            "Quick Charge (QC)"         // Qualcomm universal standard
        ],
        default: "Standard Charging",
        index: true
    },
    fastChargingSupport: {
        type: Boolean,
        default: false,
        index: true
    },
    numberOfPorts: {
        type: Number,
        default: 1
    }
});

export const Charger = Product.discriminator("charger", chargerSchema);