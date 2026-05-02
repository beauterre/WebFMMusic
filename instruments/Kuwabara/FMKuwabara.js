console.log("Instrument Loaded: FMKuwabara v2026-05-02 15:45");

class KuwabaraFM extends Instrument {
    constructor(audioContext) {
        super(audioContext);
        this.name = "KuwabaraFM v2026-05-02 15:45";
        this.audioContext = audioContext;
        this.activeNotes = new Map();

        // Main Output Filter to remove harsh digital aliasing
        this.mainFilter = this.audioContext.createBiquadFilter();
        this.mainFilter.type = "lowpass";
        this.mainFilter.frequency.setValueAtTime(4000, this.audioContext.currentTime);
        
        // --- CHANGE: Connect to this.channel instead of destination ---
        // This enables the EffectManager (Reverb) to process the sound
        this.mainFilter.connect(this.channel);
    }

    /**
     * @param {number} note - MIDI note
     * @param {number} vol - Volume (0-1)
     * @param {number} duration - Duration in ms
     * @param {number|null} startTime - Absolute time in seconds (for Offline Rendering)
     */
    play(note, vol, duration = 1500, startTime = null) {
        // 1. HANDLE TIME: Offline Rendering support
        const now = startTime !== null ? startTime : this.audioContext.currentTime;
        
        // 2. MICROTONALITY: Use the superclass calculator
        const freq = Instrument.midiToFrequency(note, this.scaleMap, this.basePitch);
        const durSeconds = duration / 1000;

        // --- FM ARCHITECTURE ---
        const carrier = this.audioContext.createOscillator();
        carrier.type = "sine";
        carrier.frequency.setValueAtTime(freq, now);

        const modulator = this.audioContext.createOscillator();
        modulator.type = "sine";
        
        const modulationRatio = 3.5;
        modulator.frequency.setValueAtTime(freq * modulationRatio, now);

        const modGain = this.audioContext.createGain();
        const carrierGain = this.audioContext.createGain();

        // --- ROUTING ---
        modulator.connect(modGain);
        modGain.connect(carrier.frequency);
        carrier.connect(carrierGain);
        carrierGain.connect(this.mainFilter);

        // --- ENVELOPES ---
        const attack = 0.005; 
        const decay = 0.15;    
        const release = 0.2;

        // 1. Modulator Envelope (The "Pluck")
        const maxModulation = freq * 2; 
        modGain.gain.setValueAtTime(0, now);
        modGain.gain.linearRampToValueAtTime(maxModulation, now + attack);
        modGain.gain.exponentialRampToValueAtTime(freq * 0.1, now + decay);

        // 2. Amplitude Envelope
        carrierGain.gain.setValueAtTime(0, now);
        carrierGain.gain.linearRampToValueAtTime(vol * 0.5, now + attack);
        
        // Decay to sustained level
        carrierGain.gain.exponentialRampToValueAtTime(vol * 0.2, now + decay);
        
        // Hold until duration
        carrierGain.gain.setValueAtTime(vol * 0.2, now + durSeconds);
        
        // Final Release
        carrierGain.gain.exponentialRampToValueAtTime(0.001, now + durSeconds + release);

        // --- SCHEDULING ---
        carrier.start(now);
        modulator.start(now);
        
        const finalStopTime = now + durSeconds + release;
        carrier.stop(finalStopTime);
        modulator.stop(finalStopTime);

        this.activeNotes.set(note, {
            carrier: carrier,
            modulator: modulator,
            gain: carrierGain,
            stopTime: finalStopTime
        });

        setTimeout(() => {
            if (this.activeNotes.get(note)?.stopTime === finalStopTime) {
                this.activeNotes.delete(note);
            }
        }, (durSeconds + release) * 1000 + 100);
    }

    stop(note) {
        if (!this.activeNotes.has(note)) return;

        const now = this.audioContext.currentTime;
        const { carrier, modulator, gain } = this.activeNotes.get(note);

        gain.gain.cancelScheduledValues(now);
        
        // Fix for "jump" in volume during stop
        if (gain.gain.cancelAndHoldAtTime) {
            gain.gain.cancelAndHoldAtTime(now);
        } else {
            gain.gain.setValueAtTime(gain.gain.value, now);
        }
        
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

        carrier.stop(now + 0.1);
        modulator.stop(now + 0.1);
        this.activeNotes.delete(note);
    }
}

window["TAG"].instruments.push(KuwabaraFM);
console.log("Instrument Loaded: " + window["TAG"].instruments[window["TAG"].instruments.length-1].name);
