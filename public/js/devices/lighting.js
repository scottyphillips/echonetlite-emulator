// Lighting Device Controller

const Lighting = {
    ceilingLight: { state: 'on' },
    floorLight:   { state: 'on', color: 'white' },

    async toggleCeilingLight() {
        await this.setCeilingLight(this.ceilingLight.state !== 'on');
    },

    async setCeilingLight(on) {
        try {
            const res = await fetch('/api/cellingLight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: on ? 'on' : 'off' }),
            });
            if (res.ok) await App.getStatus();
        } catch (e) { console.error('Ceiling light error:', e); }
    },

    updateCeilingLightStatus() {
        const state = this.ceilingLight.state.toUpperCase();
        document.getElementById('cl-state-display').textContent = state;
        document.getElementById('cl-on-btn').classList.toggle('active', state === 'ON');
        document.getElementById('cl-off-btn').classList.toggle('active', state === 'OFF');
    },

    async setFloorColor(color) {
        try {
            const res = await fetch('/api/floorLight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: this.floorLight.state, color }),
            });
            if (res.ok) await App.getStatus();
        } catch (e) { console.error('Floor light error:', e); }
    },

    async cycleFloorLight() {
        const colors = ['white', 'neutralWhite', 'lamp'];
        const next   = colors[(colors.indexOf(this.floorLight.color) + 1) % colors.length];
        await this.setFloorColor(next);
    },

    updateFloorLightStatus() {
        const state = this.floorLight.state.toUpperCase();
        const color = this.floorLight.color.replace(/([A-Z])/g, ' $1').trim();
        document.getElementById('fl-state-display').textContent = state;
        document.getElementById('fl-color-display').textContent = color;
        BaseDevice.updateModeButtons('fl-colors', 'color', this.floorLight.color);
    },
};