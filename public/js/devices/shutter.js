// Shutter Device Controller
// Handles rain sliding door shutter functionality

const Shutter = {
    state: { state: "closed", position: 0, move: "stopped" },

    async setShutter(move) {
        try {
            await fetch("/api/shutter", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ move })
            });
            await App.getStatus();
        } catch (e) { console.error("Shutter error:", e); }
    },

    updateStatus() {
        const state = this.state.state.charAt(0).toUpperCase() + this.state.state.slice(1);
        const pos = this.state.position;
        
        document.getElementById('shutter-state-display').textContent = state;
        document.getElementById('shutter-pos-display').textContent = pos;
        document.getElementById('shutter-progress').style.width = pos + '%';
    },

    toggleDevice(enabled) {
        const card = document.getElementById('card-shutter');
        if (card) {
            card.classList.toggle('disabled', !enabled);
        }
    }
};