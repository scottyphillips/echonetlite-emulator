// Door Device Controller
// Handles entrance door and electric lock functionality

const Door = {
    state: { state: "closed", lockState: "unlocked" },

    async setDoor(doorState) {
        try {
            await fetch("/api/door", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    state: doorState, 
                    lockState: this.state.lockState 
                })
            });
            await App.getStatus();
        } catch (e) { console.error("Door error:", e); }
    },

    async setDoorLock(lockState) {
        try {
            await fetch("/api/door", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    state: this.state.state, 
                    lockState 
                })
            });
            await App.getStatus();
        } catch (e) { console.error("Door lock error:", e); }
    },

    updateStatus() {
        const doorState = this.state.state.charAt(0).toUpperCase() + this.state.state.slice(1);
        const lockState = this.state.lockState === "locked" ? "LOCKED" : "UNLOCKED";
        
        document.getElementById('door-state-display').textContent = doorState;
        document.getElementById('door-lock-display').textContent = lockState;
    },

    toggleDevice(enabled) {
        const card = document.getElementById('card-door');
        if (card) {
            card.classList.toggle('disabled', !enabled);
        }
    }
};