// EV Charger Discharger Device Controller

const EvChargerDischarger = {
    state: {
        operationStatus: 'off',
        faultStatus: 'noFault',
        vehicleConnectionAndChargeableStatus: 'chargeableAndDischargeable',
        operationModeSetting: 'charge',
        chargingMethod: 'maxChargingPower',
        actualOperationMode: 'standby',
        instantaneousPowerConsumption: 0,
        cumulativeElectricEnergyConsumption: 0,
    },

    async setEvChargerMode(mode) {
        try {
            const res = await fetch('/api/evChargerDischarger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ operationMode: mode }),
            });
            if (res.ok) await App.getStatus();
        } catch (e) { console.error('EV Charger mode error:', e); }
    },

    async setEvChargerMethod(method) {
        try {
            const res = await fetch('/api/evChargerDischarger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chargingMethod: method }),
            });
            if (res.ok) await App.getStatus();
        } catch (e) { console.error('EV Charger method error:', e); }
    },

    updateStatus() {
        const s = this.state;
        document.getElementById('evc-status-display').textContent = s.operationStatus === 'on' ? 'ON' : 'OFF';
        document.getElementById('evc-fault-display').textContent  = s.faultStatus === 'noFault' ? 'OK' : 'FAULT';

        const vehicleMap = {
            notConnected:               'Not Connected',
            connected:                  'Connected',
            chargeable:                 'Chargeable',
            dischargeable:              'Dischargeable',
            chargeableAndDischargeable: 'Charge & Discharge',
        };
        document.getElementById('evc-vehicle-display').textContent = vehicleMap[s.vehicleConnectionAndChargeableStatus] || '--';

        const actualModeMap = {
            charge:      'CHARGE',
            discharge:   'DISCHARGE',
            standby:     'STANDBY',
            idle:        'IDLE',
            preparation: 'PREP',
            other:       'OTHER',
        };
        document.getElementById('evc-actualMode-display').textContent = actualModeMap[s.actualOperationMode] || '--';

        document.getElementById('evc-power-display').textContent  = s.instantaneousPowerConsumption;
        document.getElementById('evc-energy-display').textContent = (s.cumulativeElectricEnergyConsumption / 1000).toFixed(3);

        BaseDevice.updateModeButtons('evc-modes',            'mode',   s.operationModeSetting);
        BaseDevice.updateModeButtons('evc-charging-methods', 'method', s.chargingMethod);
    },
};