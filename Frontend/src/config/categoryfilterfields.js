// src/config/categoryFilterFields.js
//
// Frontend mirror of backend `utils/filterConfig.js`, with enum options
// copied verbatim from `pages/admin/productFieldConfig.js` (the source of
// truth for what values a product can actually have). Keep these two files
// in sync -- if you add an enum value on the admin create/edit form, add it
// here too, or customers won't be able to filter by it.
//
// field.type:
//   "select"    -> dropdown/radio, fixed enum, `options` below
//   "dynamic"   -> dropdown, but options come from GET /products/filters/:category
//                  at request time (no fixed enum on the schema, e.g. free-text
//                  fields like `company`/`color` -- options reflect real inventory)
//   "checkbox"  -> boolean filter (?key=true)
//   "range"     -> paired min/max number inputs, sent as ?minKey= & ?maxKey=

export const CATEGORIES = [
  { key: "mobile", label: "Mobiles" },
  { key: "headphone", label: "Headphones" },
  { key: "charger", label: "Chargers" },
  { key: "powerbank", label: "Power Banks" },
];

const CHARGING_TYPE_OPTIONS = [
  "Standard Charging", "Fast Charging", "Super Fast Charging",
  "Super VOOC", "VOOC", "Warp Charge", "Dash Charge", "SuperCharge",
  "Flash Charge", "Turbo Power", "Power Delivery (PD)", "Quick Charge (QC)",
];

export const categoryFilterFields = {
  mobile: [
    { key: "company", label: "Brand", type: "dynamic" },
    { key: "ram", label: "RAM", type: "select", options: ["2GB", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB"] },
    { key: "rom", label: "Storage", type: "select", options: ["64GB", "128GB", "256GB", "512GB", "1TB"] },
    { key: "network", label: "Network", type: "select", options: ["4G", "5G"] },
    { key: "battery", label: "Battery capacity (mAh)", type: "range", minKey: "minBattery", maxKey: "maxBattery" },
    { key: "color", label: "Color", type: "dynamic" },
  ],
  headphone: [
    { key: "type", label: "Type", type: "select", options: ["tws", "neckband", "wired", "over-ear"] },
    { key: "noiseCancellation", label: "Noise cancellation", type: "checkbox" },
    { key: "color", label: "Color", type: "dynamic" },
  ],
  charger: [
    { key: "portType", label: "Port type", type: "select", options: ["Type-C", "Micro-USB", "Lightning", "Multi-port"] },
    { key: "chargingType", label: "Charging type", type: "select", options: CHARGING_TYPE_OPTIONS },
    { key: "fastChargingSupport", label: "Fast charging support", type: "checkbox" },
  ],
  powerbank: [
    { key: "capacity", label: "Capacity (mAh)", type: "range", minKey: "minCapacity", maxKey: "maxCapacity" },
    { key: "chargingType", label: "Charging type", type: "select", options: CHARGING_TYPE_OPTIONS },
    { key: "wirelessCharging", label: "Wireless charging", type: "checkbox" },
    { key: "passThroughCharging", label: "Pass-through charging", type: "checkbox" },
  ],
};

export const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];