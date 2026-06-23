// Power Distribution Board Metering (Panasonic Smart Cosmo IP)

const PowerDistributionBoardMetering = {
    state: {
        operationStatus: 'on',
        faultStatus: 'noFault',
        currentLimit: 80,
        simplexPowerChannels: [],
    },

    _debouncedUpdateLimit: BaseDevice.createDebounce(300, async () => {
        const slider = document.getElementById('pdbm-limit-slider');
        await PowerDistributionBoardMetering.setPdbmLimit(parseInt(slider.value));
    }),

    updatePdbmLimitDisplay() {
        BaseDevice.updateSliderDisplay('pdbm-limit-slider', 'pdbm-limit-slider-val', '%');
    },

    updatePdbmLimit() {
        this._debouncedUpdateLimit();
    },

    async setPdbmLimit(limit) {
        try {
            const res = await fetch('/api/powerDistributionBoardMetering', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentLimit: limit }),
            });
            if (res.ok) await App.getStatus();
        } catch (e) { console.error('PDBM limit error:', e); }
    },

    async togglePdbmStatus() {
        await this.setPdbmOperationStatus(this.state.operationStatus !== 'on');
    },

    async setPdbmOperationStatus(on) {
        try {
            const res = await fetch('/api/powerDistributionBoardMetering', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ operationStatus: on ? 'on' : 'off' }),
            });
            if (res.ok) await App.getStatus();
        } catch (e) { console.error('PDBM status error:', e); }
    },

    updateStatus() {
        const s = this.state;
        document.getElementById('pdbm-status-display').textContent = s.operationStatus === 'on' ? 'ON' : 'OFF';
        document.getElementById('pdbm-fault-display').textContent  = s.faultStatus === 'faultOccurred' ? 'FAULT' : 'NO FAULT';

        const slider = document.getElementById('pdbm-limit-slider');
        if (document.activeElement !== slider) slider.value = s.currentLimit;
        document.getElementById('pdbm-limit-slider-val').textContent = s.currentLimit + '%';

        const channels = s.simplexPowerChannels || [];
        if (channels.length > 0) this.renderChannelGrid(channels);
    },

    renderChannelGrid(channels) {
        let container = document.getElementById('pdbm-channels-container');
        if (!container) {
            container = document.createElement('div');
            container.id        = 'pdbm-channels-container';
            container.className = 'channel-grid';
            document.querySelector('#card-powerDistributionBoardMetering .card-body')?.appendChild(container);
        }
        if (!container) return;

        const activeChannels = channels.filter(ch => ch.power > 0);
        const totalPower     = channels.reduce((sum, ch) => sum + ch.power, 0);

        let summaryDiv = document.getElementById('pdbm-channel-summary');
        if (!summaryDiv) {
            summaryDiv = document.createElement('div');
            summaryDiv.id = 'pdbm-channel-summary';
            container.parentNode.insertBefore(summaryDiv, container.nextSibling);
        }
        summaryDiv.innerHTML =
            `<span id="pdbm-total-power">Total: ${totalPower}W</span>` +
            `<span id="pdbm-active-channels">Active: ${activeChannels.length}/${channels.length} channels</span>`;

        container.innerHTML = channels.slice(0, 29).map(ch => {
            const power    = ch?.powerW || 0;
            const isActive = power > 0;
            return `<div class="channel-cell ${isActive ? 'active' : ''}"
                        title="CH${ch.channel}: ${power}W | I_R=${((ch.currentRPhaseA||0)/10).toFixed(2)}A | I_T=${((ch.currentTPhaseA||0)/10).toFixed(2)}A | E=${ch.cumulativeEnergyKwh||0}kWh">
                <div class="channel-number">CH${ch.channel}</div>
                <div class="channel-power">${power}W</div>
            </div>`;
        }).join('');
    },
};