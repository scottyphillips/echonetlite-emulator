// ============================================================
// ECHONET Lite Controller - Main Application
// ============================================================

// ============================================================
// State Management
// ============================================================

const App = {
    // Device EOJ mapping for the device manager modal
    deviceEojMap: [
        { key: 'ceilingLight', eoj: '029101', name: 'Ceiling Light' },
        { key: 'tempSensor', eoj: '001101', name: 'Temperature Sensor' },
        { key: 'humSensor', eoj: '001201', name: 'Humidity Sensor' },
        { key: 'motionSensor', eoj: '000701', name: 'Motion Sensor' },
        { key: 'floorLight', eoj: '029001', name: 'Floor Light' },
        { key: 'shutter', eoj: '026301', name: 'Shutter' },
        // Entrance Door is linked to Switch (0x05FD01) - both share the same toggle in controller.ts
        { key: 'door', eoj: '026f01', name: 'Entrance Door', linkedEojs: ['05fd01'] },
        { key: 'bath', eoj: '026b01', name: 'Bath Water Heater' },
        { key: 'airConditioner', eoj: '013001', name: 'Air Conditioner' },
        { key: 'distributionPanelMeterController', eoj: '05ff01', name: 'Distribution Panel Meter Controller' },
        { key: 'evChargerDischarger', eoj: '027e01', name: 'EV Charger Discharger' }
    ],

    // Japanese names for device display in modal
    eojNameMap: [
        {eoj:"029101",name:"単機能照明"},
        {eoj:"001101",name:"温度センサ"},
        {eoj:"001201",name:"湿度センサ"},
        {eoj:"000701",name:"人体検知センサ"},
        {eoj:"029001",name:"一般照明"},
        {eoj:"026301",name:"電動雨戸・シャッター"},
        {eoj:"026f01",name:"電気錠"},
        {eoj:"05fd01",name:"スイッチ"},
        {eoj:"026b01",name:"電気温水器"},
        {eoj:"013001",name:"家庭用エアコン"},
        {eoj:"05ff01",name:"配電盤メータ"},
        {eoj:"027e01",name:"EV充電器・放電器"}
    ],

    // Current status state
    currentStatus: {
        airConditioner: { state: "off", temp: 20 },
        ceilingLight: { state: "on" },
        floorLight: { state: "on", color: "white" },
        sensorMeter: { temp: 20.0, hum: 50 },
        motionSensor: { state: "notDetected" },
        shutter: { state: "closed", position: 0, move: "stopped" },
        door: { state: "closed", lockState: "unlocked" },
        bathWaterHeater: { state: "empty", auto: "off", temp: 40, waterLevel: 0, timerRunning: false },
        distributionPanelMeterController: { operationStatus: "on", faultStatus: "noFault", instantaneousPowerConsumption: 0, cumulativeElectricEnergy: 0, currentLimit: 100 },
        evChargerDischarger: { 
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
        }
    },

    // Temporary device states for modal editing
    tempDeviceStates: {},

    // Card visibility state (separate from device enabled state) - controlled by Manage Devices menu
    cardVisibility: {},

    // ============================================================
    // API Functions
    // ============================================================

    async sendInstanceListNotification() {
        try {
            await fetch("/api/commands/instanceListNotification", { method: "POST" });
        } catch (e) {
            console.error("Failed to send instance list notification:", e);
        }
    },

    // Card Toggle - Enables/disables device on server via API
    async toggleDevice(deviceKey, eojCode, enabled) {
        // Update card visual state
        const card = document.getElementById('card-' + deviceKey);
        if (card) {
            card.classList.toggle('disabled', !enabled);
        }
        
        // Send the change to the server via API
        await this.saveDeviceSettings();
    },

    // Save device settings - sends enabled state of all devices to server
    async saveDeviceSettings() {
        const echoObjects = [];
        
        // Track which EOJs have been processed to avoid duplicates
        const processedEojs = new Set();
        
        // Collect current state from all device cards
        for (const device of this.deviceEojMap) {
            const card = document.getElementById('card-' + device.key);
            const toggle = card?.querySelector('.card-toggle input');
            const enabled = toggle ? toggle.checked : true;
            
            // Add the primary EOJ
            echoObjects.push({
                eoj: device.eoj,
                enabled: enabled
            });
            processedEojs.add(device.eoj.toLowerCase());
            
            // Add any linked EOJs with the same enabled state (e.g., Door + Switch)
            if (device.linkedEojs) {
                for (const linkedEoj of device.linkedEojs) {
                    if (!processedEojs.has(linkedEoj.toLowerCase())) {
                        echoObjects.push({
                            eoj: linkedEoj,
                            enabled: enabled
                        });
                        processedEojs.add(linkedEoj.toLowerCase());
                    }
                }
            }
        }

        try {
            const res = await fetch("/api/commands/changedevices", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(echoObjects)
            });
            
            if (res.ok) {
                BaseDevice.showMessage('Devices updated successfully', 'success');
            } else {
                BaseDevice.showMessage('Failed to update devices', 'error');
            }
        } catch (e) {
            console.error("Save device settings error:", e);
            BaseDevice.showMessage('Error saving device settings', 'error');
        }
    },

    // ============================================================
    // Device Manager Modal Functions (controls card visibility only)
    // ============================================================

    openDeviceManager() {
        const container = document.getElementById('deviceListContainer');
        container.innerHTML = '';
        
        // Build device list showing current card visibility state
        for (const device of this.deviceEojMap) {
            const japaneseName = this.eojNameMap.find(_ => _.eoj === device.eoj)?.name ?? device.name;
            const isVisible = this.cardVisibility[device.key] !== false; // default to visible
            
            const item = document.createElement('div');
            item.className = 'device-list-item';
            item.innerHTML = `
                <div class="device-list-info">
                    <div>
                        <div class="device-list-name">${japaneseName} (${device.name})</div>
                        <div class="device-list-eoj">${device.eoj}</div>
                    </div>
                </div>
                <label class="card-toggle">
                    <input type="checkbox" id="modal-toggle-${device.eoj}" ${isVisible ? 'checked' : ''} onchange="handleModalToggleChange('${device.eoj}', this.checked)">
                    <span class="toggle-slider"></span>
                </label>
            `;
            container.appendChild(item);
        }

        document.getElementById('deviceManagerModal').classList.add('active');
    },

    closeDeviceManager() {
        document.getElementById('deviceManagerModal').classList.remove('active');
    },

    // Handle modal toggle change - updates card visibility immediately
    handleModalToggleChange(eoj, checked) {
        // Find the device key for this EOJ
        const device = App.deviceEojMap.find(d => d.eoj === eoj);
        if (device) {
            App.toggleCardVisibility(device.key, checked);
        }
    },

    // Show/hide a single card
    toggleCardVisibility(deviceKey, visible) {
        const card = document.getElementById('card-' + deviceKey);
        if (card) {
            card.style.display = visible ? 'block' : 'none';
            // Track visibility state
            App.cardVisibility[deviceKey] = visible;
        }
    },

    // ============================================================
    // Status Update Functions
    // ============================================================

    updateAllStatuses() {
        // Update all device statuses from their respective controllers
        AirConditioner.updateStatus();
        Lighting.updateCeilingLightStatus();
        Lighting.updateFloorLightStatus();
        Sensors.updateSensorStatus();
        Sensors.updateMotionStatus();
        Shutter.updateStatus();
        Door.updateStatus();
        BathWaterHeater.updateStatus();
        DistributionPanelMeterController.updateStatus();
        EvChargerDischarger.updateStatus();
    },

    // ============================================================
    // Main Status Polling
    // ============================================================

    async getStatus() {
        try {
            const res = await fetch("/api/status");
            if (!res.ok) return;
            
            const status = await res.json();
            
            // Map API response to our state object
            if (status.airConditioner) {
                this.currentStatus.airConditioner = status.airConditioner;
                AirConditioner.state = status.airConditioner;
            }
            if (status.ceilingLight !== undefined || status.light) {
                this.currentStatus.ceilingLight = status.ceilingLight || status.light;
                Lighting.ceilingLight = status.ceilingLight || status.light;
            }
            if (status.floorLight) {
                this.currentStatus.floorLight = status.floorLight;
                Lighting.floorLight = status.floorLight;
            }
            if (status.sensorMeter) {
                this.currentStatus.sensorMeter = status.sensorMeter;
                Sensors.tempSensor = status.sensorMeter;
            }
            if (status.motionSensor) {
                this.currentStatus.motionSensor = status.motionSensor;
                Sensors.motionSensor = status.motionSensor;
            }
            if (status.shutter) {
                this.currentStatus.shutter = status.shutter;
                Shutter.state = status.shutter;
            }
            if (status.door) {
                this.currentStatus.door = status.door;
                Door.state = status.door;
            }
            if (status.bathWaterHeater || status.bath) {
                this.currentStatus.bathWaterHeater = status.bathWaterHeater || status.bath;
                BathWaterHeater.state = status.bathWaterHeater || status.bath;
            }
            if (status.distributionPanelMeterController) {
                this.currentStatus.distributionPanelMeterController = status.distributionPanelMeterController;
                DistributionPanelMeterController.state = status.distributionPanelMeterController;
            }
            if (status.evChargerDischarger) {
                this.currentStatus.evChargerDischarger = status.evChargerDischarger;
                EvChargerDischarger.state = status.evChargerDischarger;
            }

            // Update connection indicator
            document.getElementById('connectionDot').style.backgroundColor = 'var(--accent-green)';
            document.getElementById('connectionStatus').textContent = 'Connected';

            // Sync card toggle states with server's enabled property
            if (status.echoObjects) {
                for (const echoObj of status.echoObjects) {
                    const enabled = echoObj.enabled;
                    const eoj = echoObj.eoj;
                    
                    // Find the corresponding card and toggle
                    const device = this.deviceEojMap.find(d => d.eoj === eoj);
                    if (device) {
                        const card = document.getElementById('card-' + device.key);
                        const toggle = card?.querySelector('.card-toggle input');
                        
                        if (toggle && toggle.checked !== enabled) {
                            toggle.checked = enabled;
                            card?.classList.toggle('disabled', !enabled);
                        }
                    }
                }
            }

            // Update all UI statuses
            this.updateAllStatuses();

        } catch (e) {
            // Connection error
            document.getElementById('connectionDot').style.backgroundColor = 'var(--accent-red)';
            document.getElementById('connectionStatus').textContent = 'Disconnected';
        }
    },

    // ============================================================
    // Initialize
    // ============================================================

    init() {
        // Initialize card visibility state (all visible by default)
        for (const device of this.deviceEojMap) {
            this.cardVisibility[device.key] = true;
        }
        
        // Initial status load
        this.getStatus();
        
        // Start polling
        setInterval(() => this.getStatus(), 1000);
    }
};

// Expose functions to global scope for inline onclick handlers
window.sendInstanceListNotification = () => App.sendInstanceListNotification();
window.toggleDevice = (deviceKey, eojCode, enabled) => App.toggleDevice(deviceKey, eojCode, enabled);
window.saveDeviceSettings = () => App.saveDeviceSettings();
window.openDeviceManager = () => App.openDeviceManager();
window.closeDeviceManager = () => App.closeDeviceManager();
window.handleModalToggleChange = (eoj, checked) => App.handleModalToggleChange(eoj, checked);

// Device-specific function aliases for inline onclick handlers
window.setACMode = (mode) => AirConditioner.setMode(mode);
window.updateACTempDisplay = () => AirConditioner.updateTempDisplay();

window.toggleCeilingLight = () => Lighting.toggleCeilingLight();
window.setCeilingLight = (on) => Lighting.setCeilingLight(on);
window.setFloorColor = (color) => Lighting.setFloorColor(color);
window.cycleFloorLight = () => Lighting.cycleFloorLight();

window.updateTempDisplay = () => Sensors.updateTempDisplay();
window.updateHumDisplay = () => Sensors.updateHumDisplay();
window.setMotion = (detected) => Sensors.setMotion(detected);

window.setShutter = (move) => Shutter.setShutter(move);

window.setDoor = (state) => Door.setDoor(state);
window.setDoorLock = (lockState) => Door.setDoorLock(lockState);

window.updateBathTempDisplay = () => BathWaterHeater.updateTempDisplay();
window.setBathAuto = (on) => BathWaterHeater.setBathAuto(on);

window.updateDpmlLimitDisplay = () => DistributionPanelMeterController.updateDpmlLimitDisplay();
window.setDpmlLimit = (limit) => DistributionPanelMeterController.setDpmlLimit(limit);
window.toggleDpmlStatus = () => DistributionPanelMeterController.toggleDpmlStatus();
window.setDpmlOperationStatus = (on) => DistributionPanelMeterController.setDpmlOperationStatus(on);
window.updateDpmlLimit = () => DistributionPanelMeterController.updateDpmlLimit();

window.setEvChargerMode = (mode) => EvChargerDischarger.setEvChargerMode(mode);
window.setEvChargerMethod = (method) => EvChargerDischarger.setEvChargerMethod(method);

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});