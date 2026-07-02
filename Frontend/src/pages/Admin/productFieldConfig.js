// pages/admin/productFieldConfig.js
//
// Mirrors models/mobile.model.js, headphone.model.js, charger.model.js,
// powerBank.model.js exactly. If you add/rename a field on the backend,
// update it here too — this is what renders the create/edit form inputs.
//
// field.type:
//   "text"       -> plain text input
//   "number"     -> number input
//   "select"     -> dropdown, needs options: []
//   "boolean"    -> checkbox
//   "multiselect"-> checkbox group, produces an array (sent as repeated
//                   FormData entries with the same key)

export const CATEGORIES = [
  { key: "mobile", label: "Mobile" },
  { key: "headphone", label: "Headphone" },
  { key: "charger", label: "Charger" },
  { key: "powerbank", label: "Power Bank" },
];

export const categoryFieldConfig = {
  mobile: [
    { key: "company", label: "Company", type: "text", required: true },
    {
      key: "ram", label: "RAM", type: "select", required: true,
      options: ["2GB", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB"],
    },
    {
      key: "rom", label: "ROM", type: "select", required: true,
      options: ["64GB", "128GB", "256GB", "512GB", "1TB"],
    },
    {
      key: "network", label: "Network", type: "select", required: true,
      options: ["4G", "5G"],
    },
    { key: "processor", label: "Processor", type: "text" },
    { key: "batteryCapacity", label: "Battery Capacity (mAh)", type: "number" },
    { key: "displaySize", label: "Display Size", type: "text" },
    { key: "color", label: "Color", type: "text" },
    // NOTE: camera.rear / camera.front intentionally omitted — backend
    // doesn't parse nested "camera" from multipart form data yet.
  ],

  headphone: [
    {
      key: "type", label: "Type", type: "select", required: true,
      options: ["tws", "neckband", "wired", "over-ear"],
    },
    { key: "bluetoothVersion", label: "Bluetooth Version", type: "text" },
    { key: "batteryLife", label: "Battery Life", type: "text" },
    { key: "noiseCancellation", label: "Noise Cancellation", type: "boolean" },
    { key: "waterResistance", label: "Water Resistance (e.g. IPX5)", type: "text" },
    { key: "color", label: "Color", type: "text" },
  ],

  charger: [
    { key: "wattage", label: "Wattage", type: "text", required: true },
    {
      key: "portType", label: "Port Type", type: "select", required: true,
      options: ["Type-C", "Micro-USB", "Lightning", "Multi-port"],
    },
    {
      key: "chargingType", label: "Charging Type", type: "select",
      options: [
        "Standard Charging", "Fast Charging", "Super Fast Charging",
        "Super VOOC", "VOOC", "Warp Charge", "Dash Charge", "SuperCharge",
        "Flash Charge", "Turbo Power", "Power Delivery (PD)", "Quick Charge (QC)",
      ],
      default: "Standard Charging",
    },
    { key: "fastChargingSupport", label: "Fast Charging Support", type: "boolean" },
    { key: "numberOfPorts", label: "Number of Ports", type: "number" },
  ],

  powerbank: [
    { key: "capacity", label: "Capacity (mAh)", type: "number", required: true },
    { key: "outputPorts", label: "Output Ports", type: "number" },
    {
      key: "inputPortType", label: "Input Port Type", type: "select", required: true,
      options: ["Type-C", "Micro-USB", "Lightning", "Multi-port"],
    },
    {
      key: "outputPortType", label: "Output Port Type(s)", type: "multiselect", required: true,
      options: ["Type-C", "USB-A", "Lightning", "Micro-USB"],
    },
    {
      key: "chargingType", label: "Charging Type", type: "select",
      options: [
        "Standard Charging", "Fast Charging", "Super Fast Charging",
        "Super VOOC", "VOOC", "Warp Charge", "Dash Charge", "SuperCharge",
        "Flash Charge", "Turbo Power", "Power Delivery (PD)", "Quick Charge (QC)",
      ],
      default: "Standard Charging",
    },
    { key: "wattageOutput", label: "Wattage Output (W)", type: "number" },
    { key: "fastChargingSupport", label: "Fast Charging Support", type: "boolean" },
    { key: "wirelessCharging", label: "Wireless Charging", type: "boolean" },
    {
      key: "displayType", label: "Display Type", type: "select",
      options: ["None", "LED Indicator", "Digital Display"],
      default: "LED Indicator",
    },
    { key: "color", label: "Color", type: "text" },
  ],
};