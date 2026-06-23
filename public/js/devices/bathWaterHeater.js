// Bath Water Heater Device Controller

const BathWaterHeater = {
    state: { state: 'empty', auto: 'off', temp: 40, waterLevel: 0, timerRunning: false },

    _debouncedSendTemp: BaseDevice.createDebounce(300, async () => {
        try {
            await fetch('/api/bathWaterHeater', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    auto: BathWaterHeater.state.auto,
                    temp: parseInt(document.getElementById('bath-temp-slider').value),
                }),
            });
        } catch (e) { console.error('Bath temp error:', e); }
    }),

    updateTempDisplay() {
        BaseDevice.updateSliderDisplay('bath-temp-slider', 'bath-temp-slider-val', '°C');
        this._debouncedSendTemp();
    },

    async setBathAuto(on) {
        try {
            const res = await fetch('/api/bathWaterHeater', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ auto: on ? 'on' : 'off', temp: this.state.temp }),
            });
            if (res.ok) await App.getStatus();
        } catch (e) { console.error('Bath auto error:', e); }
    },

    updateStatus() {
        const state = this.state.state.charAt(0).toUpperCase() + this.state.state.slice(1);
        document.getElementById('bath-state-display').textContent = state;
        document.getElementById('bath-temp-display').textContent  = this.state.temp;

        const waterLevel  = this.state.waterLevel || 0;
        const progressBar = document.getElementById('bath-progress');
        progressBar.style.width = waterLevel + '%';

        if (this.state.timerRunning) {
            progressBar.style.background  = 'linear-gradient(90deg, #3b82f6, #06b6d4)';
            progressBar.style.animation   = 'pulse 1s infinite';
        } else if (waterLevel >= 100) {
            progressBar.style.background  = 'linear-gradient(90deg, #10b981, #059669)';
            progressBar.style.animation   = 'none';
        } else if (waterLevel > 0 && this.state.auto === 'off') {
            progressBar.style.background  = 'linear-gradient(90deg, #f59e0b, #d97706)';
            progressBar.style.animation   = 'none';
        } else {
            progressBar.style.background  = 'linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))';
            progressBar.style.animation   = 'none';
        }

        document.getElementById('bath-auto-on').classList.toggle('active',  this.state.auto === 'on');
        document.getElementById('bath-auto-off').classList.toggle('active', this.state.auto === 'off');

        const slider = document.getElementById('bath-temp-slider');
        if (document.activeElement !== slider) slider.value = this.state.temp;
        document.getElementById('bath-temp-slider-val').textContent = this.state.temp + '°C';
    },
};