class EffectManager {
    constructor(audioContext) {
        this.audioContext = audioContext;
        // Track active settings for each instrument
        // Map<Instrument, { reverb: 'hall'|null, filter: 'lowpass'|null, filterFreq: 1000 }>
        this.instrumentSettings = new Map();
    }

    /**
     * The "Baking" function. Every time a setting changes, 
     * we clear the channel and rebuild the routing.
     */
    updateChain(instrument) {
        const settings = this.instrumentSettings.get(instrument) || { reverb: null, filter: null, filterFreq: 1000 };
        
        // 1. Clear everything
        instrument.channel.disconnect();
        
        // Keep track of the current "end of the line"
        let currentSource = instrument.channel;
        const nodesToCleanup = [];

        // 2. Apply Filter (if active)
        if (settings.filter) {
            const lpf = this.audioContext.createBiquadFilter();
            lpf.type = settings.filter; // 'lowpass', 'highpass', 'bandpass', etc.
            lpf.frequency.value = settings.filterFreq;
            lpf.Q.value = 1;

            currentSource.connect(lpf);
            currentSource = lpf;
            nodesToCleanup.push(lpf);
        }

        // 3. Apply Reverb (if active)
        if (settings.reverb) {
            const reverb = this._createReverbNode(settings.reverb);
            // Reverb is usually a parallel send, but for simplicity here 
            // we treat it as a series effect.
            currentSource.connect(reverb.input);
            currentSource = reverb.output;
            nodesToCleanup.push(...reverb.nodes);
        }

        // 4. Final Connection to Speakers
        currentSource.connect(this.audioContext.destination);
        
        // Also maintain a dry path if reverb is active to prevent it sounding "too washed out"
        if (settings.reverb) {
            instrument.channel.connect(this.audioContext.destination);
        }
    }

    // Internal helper to build the Schroeder Reverb
    _createReverbNode(type) {
        const ctx = this.audioContext;
        const settings = {
            'hall':      { delay: [0.029, 0.037, 0.041, 0.043], feedback: 0.7, gain: 0.4, filter: 2000 },
            'cathedral': { delay: [0.05, 0.07, 0.09, 0.11], feedback: 0.85, gain: 0.5, filter: 1500 },
            'cosmic':    { delay: [0.1, 0.15, 0.2, 0.25], feedback: 0.92, gain: 0.6, filter: 4000 },
            'room':      { delay: [0.01, 0.012, 0.015, 0.018], feedback: 0.4, gain: 0.3, filter: 3000 },
            'cold':      { delay: [0.02, 0.04, 0.06, 0.08], feedback: 0.6, gain: 0.4, filter: 6000 }
        };
        const s = settings[type] || settings['hall'];

        const input = ctx.createGain();
        const output = ctx.createGain();
        const nodes = [];

        const combFilters = s.delay.map(time => {
            const delay = ctx.createDelay();
            delay.delayTime.value = time;
            const feedback = ctx.createGain();
            feedback.gain.value = s.feedback;
            delay.connect(feedback);
            feedback.connect(delay);
            return delay;
        });

        const allPass = ctx.createBiquadFilter();
        allPass.type = "allpass";
        allPass.frequency.value = 1000;

        const roomFilter = ctx.createBiquadFilter();
        roomFilter.type = "lowpass";
        roomFilter.frequency.value = s.filter;

        input.connect(allPass);
        combFilters.forEach(comb => {
            input.connect(comb);
            comb.connect(allPass);
        });

        allPass.connect(roomFilter);
        roomFilter.connect(output);
        output.gain.value = s.gain;

        return { 
            input: input, 
            output: output, 
            nodes: [...combFilters, allPass, roomFilter, output] 
        };
    }

    // PUBLIC API for the Testbed
    setReverb(instrument, type) {
        if (!this.instrumentSettings.has(instrument)) {
            this.instrumentSettings.set(instrument, { reverb: null, filter: null, filterFreq: 1000 });
        }
        const settings = this.instrumentSettings.get(instrument);
        settings.reverb = type; // set to null to remove
        this.updateChain(instrument);
    }

    setFilter(instrument, type, freq) {
        if (!this.instrumentSettings.has(instrument)) {
            this.instrumentSettings.set(instrument, { reverb: null, filter: null, filterFreq: 1000 });
        }
        const settings = this.instrumentSettings.get(instrument);
        settings.filter = type; // set to null to remove
        settings.filterFreq = freq;
        this.updateChain(instrument);
    }

    clearAll(instrument) {
        this.instrumentSettings.delete(instrument);
        this.updateChain(instrument);
    }
}
