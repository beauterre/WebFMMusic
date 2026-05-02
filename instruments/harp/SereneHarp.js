console.log("Instrument Loaded: SereneHarp v2026-05-02 17:30");

class SereneHarp extends Instrument {
    constructor(audioContext) {
        super(audioContext);
        console.log("SereneHarp has audioContext: " + audioContext);
        this.name = "SereneHarp v2026-05-02 17:30";
        this.audioContext = audioContext;
        this.beatmin = 0.5;
        this.beatmax = 1.5;
        
        // Added for stop() capacity in the master testbed
        this.activeNotes = new Map();
    }

    setBeatMin(nr) { this.beatmin = nr; }
    setBeatMax(nr) { this.beatmax = nr; }
    getBeat() { return Math.random() * (this.beatmax - this.beatmin) + this.beatmin; }

    /**
     * @param {number} note - MIDI note
     * @param {number} vol - Volume
     * @param {number} decay - Decay in ms
     * @param {number|null} startTime - Absolute time in seconds (for Offline Rendering)
     */
    play(note, vol, decay = 8000, startTime = null) {
        // 1. HANDLE TIME
        const now = startTime !== null ? startTime : this.audioContext.currentTime;
        
        vol *= 0.4;
        const durSeconds = decay / 1000;

        // Master volume
        const masterVolume = this.audioContext.createGain();
        masterVolume.gain.setValueAtTime(vol, now);
        
        // --- CHANGE: Connect to this.channel instead of destination for Effects/Reverb ---
        masterVolume.connect(this.channel);

        // Feedback delay setup
        const delayNode = this.audioContext.createDelay();
        const feedbackGain = this.audioContext.createGain();
        
        feedbackGain.gain.setValueAtTime(0.76, now); 
        delayNode.delayTime.setValueAtTime(0.01122525, now); 
        
        delayNode.connect(feedbackGain);
        feedbackGain.connect(delayNode);
        delayNode.connect(masterVolume);

        // --- CHANGE: Microtonal-aware frequency call ---
        // Kept your "floaty" random offset logic
        const baseFreq = Instrument.midiToFrequency(note, this.scaleMap, this.basePitch);
        const freq = baseFreq - 2 + 4 * Math.random();

        const harmonics = [
            { ratio: 1, amplitude: 1 } // Fundamental
        ];

        const noteOscillators = [];

        harmonics.forEach(harmonic => {
            for (let i = 0; i < 2; i++) {
                const osc = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                const beatOffset = i === 0 ? this.getBeat() : -this.getBeat();
                osc.frequency.setValueAtTime(freq * harmonic.ratio + beatOffset * 2, now);
                osc.type = "sine";

                // Amplitude envelope
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(vol * harmonic.amplitude, now + 0.015); 
                gainNode.gain.linearRampToValueAtTime(0.3 * vol * harmonic.amplitude, now + 0.3); 
                gainNode.gain.linearRampToValueAtTime(0.1 * vol * harmonic.amplitude, now + 0.4); 
                gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durSeconds); 

                osc.connect(gainNode);
                gainNode.connect(delayNode); 
                osc.start(now);
                osc.stop(now + durSeconds);

                noteOscillators.push({ osc, gainNode });
            }
        });

        // Store in map for stop() capacity
        const finalStopTime = now + durSeconds;
        this.activeNotes.set(note, {
            oscillators: noteOscillators,
            masterGain: masterVolume,
            stopTime: finalStopTime
        });

        // Cleanup
        setTimeout(() => {
            if (this.activeNotes.get(note)?.stopTime === finalStopTime) {
                noteOscillators.forEach(({ osc, gainNode }) => {
                    osc.disconnect();
                    gainNode.disconnect();
                });
                delayNode.disconnect();
                feedbackGain.disconnect();
                masterVolume.disconnect();
                this.activeNotes.delete(note);
            }
        }, (durSeconds * 1000) + 100);
    }

    stop(note) {
        if (!this.activeNotes.has(note)) return;

        const now = this.audioContext.currentTime;
        const { oscillators, masterGain } = this.activeNotes.get(note);

        // Use the modern "catch and fade" logic
        masterGain.gain.cancelScheduledValues(now);
        if (masterGain.gain.cancelAndHoldAtTime) {
            masterGain.gain.cancelAndHoldAtTime(now);
        } else {
            masterGain.gain.setValueAtTime(masterGain.gain.value, now);
        }
        masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

        oscillators.forEach(({ osc }) => {
            try { osc.stop(now + 0.2); } catch(e) {}
        });

        this.activeNotes.delete(note);
    }
}

window["TAG"].instruments.push(SereneHarp);
console.log("Instrument Loaded: " + window["TAG"].instruments[window["TAG"].instruments.length - 1].name);
