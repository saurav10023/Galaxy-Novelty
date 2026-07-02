// utils/productModelMap.js
import { Mobile } from "../models/mobile.model.js";
import { Headphone } from "../models/headphone.model.js";
import { PowerBank } from "../models/powerBank.model.js";
import { Charger } from "../models/charger.model.js";


export const categoryModelMap = {
    mobile: Mobile,
    charger: Charger,
    powerbank: PowerBank,
    headphone: Headphone
};

export const getModelByCategory = (category) => {
    return categoryModelMap[category] || null;
};