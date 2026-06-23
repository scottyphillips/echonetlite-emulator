// Solar Power Generation Device Controller

const SolarPowerGeneration = {
    state: {
        operationStatus: 'off',
        faultStatus: 'noFault',
        instantaneousElectricPowerGeneration: 0,
        cumulativeElectricEnergyOfGeneration: 0,
        cumulativeElectricEnergySold: 0,
        ratedElectricPowerOfgeneration: 5000,
        systemInterconnectionType: 'gridConnectionReverseFlowAcceptable',
        outputPowerRestraintStatus: 'notRestraining',
    },

    async setSolarOperationStatus(on) {
        try {
            const res = await fetch('/api/solarPowerGeneration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ operationStatus: on ? 'on' : 'off' }),
            });
            if (res.ok) await App.getStatus();
        } catch (e) { console.error('Solar Power error:', e); }
    },

    updateStatus() {
        const s = this.state;
        if (!s) return;

        const sysTypeMap = {
            gridConnectionReverseFlowAcceptable:    'Grid (Reverse OK)',
            independentOperation:                   'Independent',
            gridConnectionReverseFlowNotAcceptable: 'Grid (No Reverse)',
        };
        const restraintMap = {
            ongoingRestraintControl:      'Restraint (Control)',
            ongoingRestraintExceptControl:'Restraint (Other)',
            ongoingRestraintUnknown:      'Restraint (Unknown)',
            notRestraining:               'Not Restraining',
            unknown:                      'Unknown',
        };

        document.getElementById('solar-status-display').textContent    = s.operationStatus === 'on' ? 'ON' : 'OFF';
        document.getElementById('solar-fault-display').textContent     = s.faultStatus === 'noFault' ? 'OK' : 'FAULT';
        document.getElementById('solar-systype-display').textContent   = sysTypeMap[s.systemInterconnectionType] || '--';
        document.getElementById('solar-restraint-display').textContent = restraintMap[s.outputPowerRestraintStatus] || '--';
        document.getElementById('solar-power-display').textContent     = s.instantaneousElectricPowerGeneration;
        document.getElementById('solar-energy-gen-display').textContent= (s.cumulativeElectricEnergyOfGeneration / 1000).toFixed(3);
        document.getElementById('solar-energy-sold-display').textContent=(s.cumulativeElectricEnergySold / 1000).toFixed(3);
        document.getElementById('solar-rated-power-display').textContent= s.ratedElectricPowerOfgeneration;
    },
};