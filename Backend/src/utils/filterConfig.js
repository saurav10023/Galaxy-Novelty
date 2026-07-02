// utils/filterConfig.js

// Each entry maps a query param name -> how to build the mongo filter from it
const filterConfig = {
    mobile: {
        company: (val) => ({ company: val }),
        ram: (val) => ({ ram: val }),
        rom: (val) => ({ rom: val }),
        network: (val) => ({ network: val }),
        minBattery: (val) => ({ batteryCapacity: { $gte: Number(val) } }),
        maxBattery: (val) => ({ batteryCapacity: { $lte: Number(val) } }),
        color: (val) => ({ color: val })
    },

    headphone: {
        type: (val) => ({ type: val }),
        noiseCancellation: (val) => ({ noiseCancellation: val === "true" }),
        color: (val) => ({ color: val })
    },

    charger: {
        portType: (val) => ({ portType: val }),
        chargingType: (val) => ({ chargingType: val }),
        fastChargingSupport: (val) => ({ fastChargingSupport: val === "true" })
    },

    powerbank: {
        minCapacity: (val) => ({ capacity: { $gte: Number(val) } }),
        maxCapacity: (val) => ({ capacity: { $lte: Number(val) } }),
        chargingType: (val) => ({ chargingType: val }),
        wirelessCharging: (val) => ({ wirelessCharging: val === "true" }),
        passThroughCharging: (val) => ({ passThroughCharging: val === "true" })
    }
};

export { filterConfig };