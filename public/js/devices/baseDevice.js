// Base device module - provides common functionality for all devices
const BaseDevice = {
    // Debounce helper
    createDebounce(delay, callback) {
        let timer = null;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => callback.apply(this, args), delay);
        };
    },

    // Update slider display value
    updateSliderDisplay(sliderId, sliderValId, suffix = '') {
        const slider = document.getElementById(sliderId);
        const sliderVal = document.getElementById(sliderValId);
        if (slider && sliderVal) {
            sliderVal.textContent = slider.value + suffix;
        }
    },

    // Update active state for mode buttons
    updateModeButtons(containerId, activeClass, activeValue) {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset[activeClass] === activeValue);
        });
    },

    // Show message alert
    showMessage(message, type) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message-alert ${type}`;
        msgDiv.textContent = message;
        document.body.appendChild(msgDiv);
        
        setTimeout(() => {
            msgDiv.remove();
        }, 3000);
    }
};