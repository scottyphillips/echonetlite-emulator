// Air Conditioner Device Controller

const AirConditioner = {
    state: { state: 'off', temp: 20 },

    _debouncedSendTemp: BaseDevice.createDebounce(300, async () => {
        try {
            const slider = document.getElementById('ac-temp-slider');
            await fetch('/api/airConditioner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: AirConditioner.state.state, temp: parseInt(slider.value) }),
            });
        } catch (e) { console.error('AC temp error:', e); }
    }),

    async setMode(mode) {
        try {
            const res = await fetch('/api/airConditioner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: mode, temp: this.state.temp }),
            });
            if (res.ok) await App.getStatus();
        } catch (e) { console.error('AC mode error:', e); }
    },

    updateTempDisplay() {
        BaseDevice.updateSliderDisplay('ac-temp-slider', 'ac-temp-slider-val', '°C');
        this._debouncedSendTemp();
    },

    updateStatus() {
        const state = this.state.state;
        document.getElementById('ac-mode-display').textContent = state.toUpperCase();
        document.getElementById('ac-temp-display').textContent = this.state.temp;
        BaseDevice.updateModeButtons('ac-modes', 'mode', state);
        const slider = document.getElementById('ac-temp-slider');
        if (document.activeElement !== slider) slider.value = this.state.temp;
        document.getElementById('ac-temp-slider-val').textContent = this.state.temp + '°C';
    },
};