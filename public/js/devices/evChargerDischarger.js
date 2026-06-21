// EV Charger Discharger Device Controller
// Handles electric vehicle charger/discharger functionality

const EvChargerDischarger = {
    state: { 
        operationStatus: "off",
        installationLocation: "Outdoor",
        faultStatus: "noFault",
        vehicleConnectionAndChargeableStatus: "chargeableAndDischargeable",
        operationModeSetting: "charge",
        systemInterconnectionType: "gridConnectionReverseFlowAcceptable",
        chargingMethod: "maxChargingPower",
        dischargingMethod: "loadFollowing",
        actualOperationMode: "standby",
        maintenanceStatus: "normal",
        instantaneousPowerConsumption: 0,
        cumulativeElectricEnergyConsumption: 0
    },

    async setEvChargerState(on) {
        try {
            await fetch("/api/evChargerDischarger", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: on ? "on" : "off" })
            });
            await App.getStatus();
        } catch (e) { console.error("EV Charger error:", e); }
    },

    async setEvChargerMode(mode) {
        try {
            await fetch("/api/evChargerDischarger", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ operationMode: mode })
            });
            await App.getStatus();
        } catch (e) { console.error("EV Charger mode error:", e); }
    },

    async setEvChargerMethod(method) {
        try {
            await fetch("/api/evChargerDischarger", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chargingMethod: method })
            });
            await App.getStatus();
        } catch (e) { console.error("EV Charger method error:", e); }
    },

    updateStatus() {
        const state = this.state;
        
        // Operation status
        document.getElementById('evc-status-display').textContent = state.operationStatus === "on" ? "ON" : "OFF";
        
        // Fault status
        document.getElementById('evc-fault-display').textContent = state.faultStatus === "noFault" ? "OK" : "FAULT";
        
        // Vehicle connection and chargeable status
        const vehicleMap = {
            "notConnected": "Not Connected",
            "connected": "Connected",
            "chargeable": "Chargeable",
            "dischargeable": "Dischargeable",
            "chargeableAndDischargeable": "Charge & Discharge"
        };
        document.getElementById('evc-vehicle-display').textContent = vehicleMap[state.vehicleConnectionAndChargeableStatus] || "--";
        
        // Actual operation mode
        const actualModeMap = {
            "charge": "CHARGE",
            "discharge": "DISCHARGE",
            "standby": "STANDBY",
            "idle": "IDLE",
            "preparation": "PREP",
            "other": "OTHER"
        };
        document.getElementById('evc-actualMode-display').textContent = actualModeMap[state.actualOperationMode] || "--";
        
        // Power consumption
        document.getElementById('evc-power-display').textContent = state.instantaneousPowerConsumption;
        
        // Energy consumption (convert from 0.001kWh to kWh)
        document.getElementById('evc-energy-display').textContent = (state.cumulativeElectricEnergyConsumption / 1000).toFixed(3);

        // Update mode buttons
        BaseDevice.updateModeButtons('evc-modes', 'mode', state.operationModeSetting);

        // Update charging method buttons
        BaseDevice.updateModeButtons('evc-charging-methods', 'method', state.chargingMethod);
    },

    toggleDevice(enabled) {
        const card = document.getElementById('card-evChargerDischarger');
        if (card) {
            card.classList.toggle('disabled', !enabled);
        }
    }
};