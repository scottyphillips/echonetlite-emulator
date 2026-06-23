// Door Device Controller

const Door = {
    state: { state: 'closed', lockState: 'unlocked' },

    async setDoor(doorState) {
        try {
            const res = await fetch('/api/door', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: doorState, lockState: this.state.lockState }),
            });
            if (res.ok) await App.getStatus();
        } catch (e) { console.error('Door error:', e); }
    },

    async setDoorLock(lockState) {
        try {
            const res = await fetch('/api/door', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: this.state.state, lockState }),
            });
            if (res.ok) await App.getStatus();
        } catch (e) { console.error('Door lock error:', e); }
    },

    updateStatus() {
        const doorState = this.state.state.charAt(0).toUpperCase() + this.state.state.slice(1);
        document.getElementById('door-state-display').textContent = doorState;
        document.getElementById('door-lock-display').textContent  =
            this.state.lockState === 'locked' ? 'LOCKED' : 'UNLOCKED';
    },
};