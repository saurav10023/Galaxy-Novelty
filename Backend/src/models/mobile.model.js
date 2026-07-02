// models/mobile.model.js
import { Schema } from "mongoose";
import { Product } from "./Product.model.js";

const mobileSchema = new Schema({
    company: {
        type: String,
        required: true,
        trim: true,
        index: true 
    },
    ram: {
        type: String, 
        enum:["2GB" , "3GB", "4GB" , "6GB" ,"8GB" , "12GB" , "16GB" ],
        required: true,
        index: true
    },
    rom: {
        type: String, 
        enum:["64GB" , "128GB", "256GB" , "512GB" ,"1TB"  ],
        required: true,
        index: true
    },
    network: {
        type: String,
        enum: ["4G", "5G"],
        required: true,
        index: true
    },
    processor: {
        type: String,
        trim: true
    },
    batteryCapacity: {
        type: Number,
        index: true
    },
    displaySize: {
        type: String 
    },
    camera: {
        rear: String,
        front: String
    },
    color: {
        type: String,
        trim: true
    }
});

export const Mobile = Product.discriminator("mobile", mobileSchema);