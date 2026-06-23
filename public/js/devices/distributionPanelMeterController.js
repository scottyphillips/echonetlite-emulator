// Distribution Panel Meter Controller

const DistributionPanelMeterController = {
    state: {
        operationStatus: 'on',
        faultStatus: 'noFault',
        instantaneousPowerConsumption: 0,
        cumulativeElectricEnergy: 0,
        currentLimit: 100,
    },

    _debouncedUpdateLimit: BaseDevice.createDebounce(300, async () => {
        const slider = document.getElementById('dpm-limit-slider');
        await DistributionPanelMeterController.setDpmlLimit(parseInt(slider.value));
    }),

    updateDpmlLimitDisplay() {
        BaseDevice.updateSliderDisplay('dpm-limit-slider', 'dpm-limit-slider-val', '%');
    },

    updateDpmlLimit() {
        this._debouncedUpdateLimit();
    },

    async setDpmlLimit(limit) {
        try {
            const res = await fetch('/api/distributionPanelMeterController', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentLimit: limit }),
            });
            if (res.ok) await App.getStatus();
        } catch (e) { console.error('DPM limit error:', e); }
    },

    async toggleDpmlStatus() {
        await this.setDpmlOperationStatus(this.state.operationStatus !== 'on');
    },

    async setDpmlOperationStatus(on) {
        try {
            const res = await fetch('/api/distributionPanelMeterController', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ operationStatus: on ? 'on' : 'off' }),
            });
            if (res.ok) await App.getStatus();
        } catch (e) { console.error('DPM status error:', e); }
    },

    updateStatus() {
        const s = this.state;
        document.getElementById('dpm-status-display').textContent = s.operationStatus === 'on' ? 'ON' : 'OFF';
        document.getElementById('dpm-fault-display').textContent  = s.faultStatus === 'faultOccurred' ? 'FAULT' : 'NO FAULT';
        document.getElementById('dpm-power-display').textContent  = s.instantaneousPowerConsumption;
        document.getElementById('dpm-energy-display').textContent = (s.cumulativeElectricEnergy / 1000).toFixed(3);
        const slider = document.getElementById('dpm-limit-slider');
        if (document.activeElement !== slider) slider.value = s.currentLimit;
        document.getElementById('dpm-limit-slider-val').textContent = s.currentLimit + '%';
    },
};