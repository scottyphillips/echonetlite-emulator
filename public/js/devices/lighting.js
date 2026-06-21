// Lighting Device Controller
// Handles ceiling light and floor light functionality

const Lighting = {
    ceilingLight: { state: "on" },
    floorLight: { state: "on", color: "white" },

    // Ceiling Light Methods
    async toggleCeilingLight() {
        const newState = this.ceilingLight.state === "on" ? "off" : "on";
        await this.setCeilingLight(newState === "on");
    },

    async setCeilingLight(on) {
        try {
            await fetch("/api/cellingLight", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: on ? "on" : "off" })
            });
            await App.getStatus();
        } catch (e) { console.error("Ceiling light error:", e); }
    },

    updateCeilingLightStatus() {
        const state = this.ceilingLight.state.toUpperCase();
        document.getElementById('cl-state-display').textContent = state;
        document.getElementById('cl-on-btn').classList.toggle('active', state === 'ON');
        document.getElementById('cl-off-btn').classList.toggle('active', state === 'OFF');
    },

    toggleCeilingLightDevice(enabled) {
        const card = document.getElementById('card-ceilingLight');
        if (card) {
            card.classList.toggle('disabled', !enabled);
        }
    },

    // Floor Light Methods
    async setFloorColor(color) {
        try {
            await fetch("/api/floorLight", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: this.floorLight.state, color })
            });
            await App.getStatus();
        } catch (e) { console.error("Floor light error:", e); }
    },

    async cycleFloorLight() {
        const colors = ["white", "neutralWhite", "lamp"];
        const currentIndex = colors.indexOf(this.floorLight.color);
        const nextColor = colors[(currentIndex + 1) % colors.length];
        await this.setFloorColor(nextColor);
    },

    updateFloorLightStatus() {
        const state = this.floorLight.state.toUpperCase();
        const color = this.floorLight.color.replace(/([A-Z])/g, ' $1').trim();
        document.getElementById('fl-state-display').textContent = state;
        document.getElementById('fl-color-display').textContent = color;

        BaseDevice.updateModeButtons('fl-colors', 'color', this.floorLight.color);
    },

    toggleFloorLightDevice(enabled) {
        const card = document.getElementById('card-floorLight');
        if (card) {
            card.classList.toggle('disabled', !enabled);
        }
    }
};