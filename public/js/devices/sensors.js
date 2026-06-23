// Sensors Device Controller

const Sensors = {
    tempSensor:   { temp: 20.0, hum: 50 },
    motionSensor: { state: 'notDetected' },

    _debouncedSendTemp: BaseDevice.createDebounce(300, async () => {
        try {
            const slider = document.getElementById('temp-slider');
            await fetch('/api/sensorMeter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ temp: parseFloat(slider.value), hum: Sensors.tempSensor.hum }),
            });
        } catch (e) { console.error('Temp sensor error:', e); }
    }),

    _debouncedSendHum: BaseDevice.createDebounce(300, async () => {
        try {
            const slider = document.getElementById('hum-slider');
            await fetch('/api/sensorMeter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ temp: Sensors.tempSensor.temp, hum: parseInt(slider.value) }),
            });
        } catch (e) { console.error('Hum sensor error:', e); }
    }),

    updateTempDisplay() {
        BaseDevice.updateSliderDisplay('temp-slider', 'temp-slider-val', '°C');
        this._debouncedSendTemp();
    },

    updateHumDisplay() {
        BaseDevice.updateSliderDisplay('hum-slider', 'hum-slider-val', '%');
        this._debouncedSendHum();
    },

    async setMotion(detected) {
        try {
            const res = await fetch('/api/motionSensor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: detected ? 'detected' : 'notDetected' }),
            });
            if (res.ok) await App.getStatus();
        } catch (e) { console.error('Motion sensor error:', e); }
    },

    updateSensorStatus() {
        const temp = this.tempSensor.temp;
        const hum  = this.tempSensor.hum;
        document.getElementById('temp-display').textContent = temp.toFixed(1);
        document.getElementById('hum-display').textContent  = hum;
        const tempSlider = document.getElementById('temp-slider');
        if (document.activeElement !== tempSlider) tempSlider.value = temp;
        document.getElementById('temp-slider-val').textContent = temp.toFixed(1) + '°C';
        const humSlider = document.getElementById('hum-slider');
        if (document.activeElement !== humSlider) humSlider.value = hum;
        document.getElementById('hum-slider-val').textContent = hum + '%';
    },

    updateMotionStatus() {
        document.getElementById('motion-display').textContent =
            this.motionSensor.state === 'detected' ? 'DETECTED' : 'CLEAR';
    },
};