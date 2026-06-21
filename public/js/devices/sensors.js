// Sensors Device Controller
// Handles temperature sensor, humidity sensor, and motion sensor functionality

const Sensors = {
    tempSensor: { temp: 20.0, hum: 50 },
    motionSensor: { state: "notDetected" },
    debounceTimer: null,

    // Temperature Sensor Methods
    updateTempDisplay() {
        BaseDevice.updateSliderDisplay('temp-slider', 'temp-slider-val', '°C');
        
        this.debounceTimer = BaseDevice.createDebounce(300, async () => {
            try {
                const slider = document.getElementById('temp-slider');
                await fetch("/api/sensorMeter", {
                    method: "POST",
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        temp: parseFloat(slider.value), 
                        hum: this.tempSensor.hum 
                    })
                });
                await App.getStatus();
            } catch (e) { console.error("Temp sensor error:", e); }
        });
    },

    // Humidity Sensor Methods
    updateHumDisplay() {
        BaseDevice.updateSliderDisplay('hum-slider', 'hum-slider-val', '%');
        
        this.debounceTimer = BaseDevice.createDebounce(300, async () => {
            try {
                const slider = document.getElementById('hum-slider');
                await fetch("/api/sensorMeter", {
                    method: "POST",
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        temp: this.tempSensor.temp, 
                        hum: parseInt(slider.value) 
                    })
                });
                await App.getStatus();
            } catch (e) { console.error("Hum sensor error:", e); }
        });
    },

    // Motion Sensor Methods
    async setMotion(detected) {
        try {
            await fetch("/api/motionSensor", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: detected ? "detected" : "notDetected" })
            });
            await App.getStatus();
        } catch (e) { console.error("Motion sensor error:", e); }
    },

    // Status Updates
    updateSensorStatus() {
        const temp = this.tempSensor.temp;
        const hum = this.tempSensor.hum;
        
        document.getElementById('temp-display').textContent = temp.toFixed(1);
        document.getElementById('hum-display').textContent = hum;

        const tempSlider = document.getElementById('temp-slider');
        if (document.activeElement !== tempSlider) {
            tempSlider.value = temp;
        }
        document.getElementById('temp-slider-val').textContent = temp.toFixed(1) + '°C';

        const humSlider = document.getElementById('hum-slider');
        if (document.activeElement !== humSlider) {
            humSlider.value = hum;
        }
        document.getElementById('hum-slider-val').textContent = hum + '%';
    },

    updateMotionStatus() {
        const state = this.motionSensor.state === "detected" ? "DETECTED" : "CLEAR";
        document.getElementById('motion-display').textContent = state;
    },

    // Device Toggle Methods
    toggleTempSensorDevice(enabled) {
        const card = document.getElementById('card-tempSensor');
        if (card) {
            card.classList.toggle('disabled', !enabled);
        }
    },

    toggleHumSensorDevice(enabled) {
        const card = document.getElementById('card-humSensor');
        if (card) {
            card.classList.toggle('disabled', !enabled);
        }
    },

    toggleMotionSensorDevice(enabled) {
        const card = document.getElementById('card-motionSensor');
        if (card) {
            card.classList.toggle('disabled', !enabled);
        }
    }
};