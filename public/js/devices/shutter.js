// Shutter Device Controller

const Shutter = {
    state: { state: 'closed', position: 0, move: 'stopped' },

    async setShutter(move) {
        try {
            const res = await fetch('/api/shutter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ move }),
            });
            if (res.ok) await App.getStatus();
        } catch (e) { console.error('Shutter error:', e); }
    },

    updateStatus() {
        const state = this.state.state.charAt(0).toUpperCase() + this.state.state.slice(1);
        document.getElementById('shutter-state-display').textContent = state;
        document.getElementById('shutter-pos-display').textContent   = this.state.position;
        document.getElementById('shutter-progress').style.width      = this.state.position + '%';
    },
};